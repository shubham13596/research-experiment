import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, storageBackend } from "./env";
import { ensureSchema, query } from "./pg";
import { countsAsFailure } from "./taxonomy";
import { stripMarkdown } from "./text";
import { costUsd, MODELS, type ModelId } from "./models";
import type {
  CaseRow,
  CaseStatus,
  CaseSummary,
  Submission,
  SubmissionStatus,
  Trial,
  VerdictRow,
} from "./types";

/**
 * Storage. Three interchangeable drivers, chosen by what is configured:
 * Postgres (Heroku or any DATABASE_URL), Supabase, or in-process memory.
 *
 * Aggregation happens in TypeScript rather than SQL so the drivers cannot drift
 * apart between environments. At launch volumes this is cheap; if submissions
 * reach six figures, move summarise() into a materialised view and keep the
 * same shape.
 */

const RAW_LIMIT = 4000;

interface RawData {
  submissions: Submission[];
  trials: Trial[];
  verdicts: VerdictRow[];
  cases: CaseRow[];
}

interface SpendToday {
  totalUsd: number;
  opusUsd: number;
  submissions: number;
}

interface Driver {
  insertSubmission(row: Submission): Promise<void>;
  updateSubmissionStatus(id: string, status: SubmissionStatus): Promise<void>;
  insertTrial(row: Trial): Promise<void>;
  upsertVerdict(row: VerdictRow): Promise<void>;
  trialExists(id: string): Promise<boolean>;
  upsertCase(row: CaseRow): Promise<void>;
  getCase(caseKey: string): Promise<CaseRow | null>;
  loadRaw(): Promise<RawData>;
  /** Null when the driver cannot answer — the caller then relies on counters. */
  spendToday(since: Date): Promise<SpendToday | null>;
  submissionsToday(ipHash: string, since: Date): Promise<number | null>;
}

// ─── Postgres ────────────────────────────────────────────────────────────────

const postgresDriver: Driver = {
  async insertSubmission(row) {
    await ensureSchema();
    await query(
      `insert into submissions
         (id, created_at, ip_hash, fp_hash, mode, work, question, claimed_truth,
          messy_text, model_id, params, n_trials, status, case_key)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        row.id, row.created_at, row.ip_hash, row.fp_hash, row.mode, row.work,
        row.question, row.claimed_truth, row.messy_text, row.model_id,
        JSON.stringify(row.params), row.n_trials, row.status, row.case_key,
      ],
    );
  },

  async updateSubmissionStatus(id, status) {
    await query(`update submissions set status = $2 where id = $1`, [id, status]);
  },

  async insertTrial(row) {
    await query(
      `insert into trials
         (id, submission_id, trial_idx, request_id, response_text, stop_reason,
          input_tokens, output_tokens, latency_ms)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        row.id, row.submission_id, row.trial_idx, row.request_id,
        row.response_text, row.stop_reason, row.input_tokens, row.output_tokens,
        row.latency_ms,
      ],
    );
  },

  async upsertVerdict(row) {
    await query(
      `insert into verdicts
         (id, trial_id, submission_id, verdict, wrong_answer_given, note, created_at)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (trial_id) do update set
         verdict = excluded.verdict,
         wrong_answer_given = excluded.wrong_answer_given,
         note = excluded.note,
         created_at = excluded.created_at`,
      [
        row.id, row.trial_id, row.submission_id, row.verdict,
        row.wrong_answer_given, row.note, row.created_at,
      ],
    );
  },

  async trialExists(id) {
    const rows = await query<{ id: string }>(`select id from trials where id = $1`, [id]);
    return rows.length > 0;
  },

  async upsertCase(row) {
    await query(
      `insert into cases
         (id, case_key, title, work, question, ground_truth, citations, status,
          failure_modes, repo_item_id, notes, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       on conflict (case_key) do update set
         title = excluded.title, work = excluded.work, question = excluded.question,
         ground_truth = excluded.ground_truth, citations = excluded.citations,
         status = excluded.status, failure_modes = excluded.failure_modes,
         repo_item_id = excluded.repo_item_id, notes = excluded.notes,
         updated_at = excluded.updated_at`,
      [
        row.id, row.case_key, row.title, row.work, row.question, row.ground_truth,
        row.citations, row.status, row.failure_modes, row.repo_item_id, row.notes,
        row.updated_at,
      ],
    );
  },

  async getCase(caseKey) {
    await ensureSchema();
    const rows = await query<CaseRow>(`select * from cases where case_key = $1`, [caseKey]);
    return rows[0] ?? null;
  },

  async loadRaw() {
    await ensureSchema();
    const [submissions, trials, verdicts, cases] = await Promise.all([
      query<Submission>(
        `select * from submissions where status = 'done'
         order by created_at desc limit $1`,
        [RAW_LIMIT],
      ),
      query<Trial>(
        `select t.* from trials t
           join submissions s on s.id = t.submission_id
          where s.status = 'done' limit $1`,
        [RAW_LIMIT * 5],
      ),
      query<VerdictRow>(`select * from verdicts limit $1`, [RAW_LIMIT * 5]),
      query<CaseRow>(`select * from cases limit 1000`),
    ]);
    return { submissions, trials, verdicts, cases };
  },

  async spendToday(since) {
    await ensureSchema();
    const [usage, counted] = await Promise.all([
      query<{ model_id: string; inp: string; outp: string }>(
        `select s.model_id,
                coalesce(sum(t.input_tokens), 0)  as inp,
                coalesce(sum(t.output_tokens), 0) as outp
           from trials t
           join submissions s on s.id = t.submission_id
          where t.created_at >= $1
          group by s.model_id`,
        [since.toISOString()],
      ),
      query<{ n: string }>(`select count(*) as n from submissions where created_at >= $1`, [
        since.toISOString(),
      ]),
    ]);

    let totalUsd = 0;
    let opusUsd = 0;
    for (const row of usage) {
      if (!(row.model_id in MODELS)) continue;
      const spend = costUsd(row.model_id as ModelId, Number(row.inp), Number(row.outp));
      totalUsd += spend;
      if (row.model_id.startsWith("claude-opus")) opusUsd += spend;
    }

    // Gate calls are not stored as trials, so add their known cost per attempt.
    const submissions = Number(counted[0]?.n ?? 0);
    totalUsd += submissions * GATE_COST_USD;

    return { totalUsd, opusUsd, submissions };
  },

  async submissionsToday(ipHash, since) {
    await ensureSchema();
    const rows = await query<{ n: string }>(
      `select count(*) as n from submissions where ip_hash = $1 and created_at >= $2`,
      [ipHash, since.toISOString()],
    );
    return Number(rows[0]?.n ?? 0);
  },
};

/** One Haiku gate call per submission. Small, but it shouldn't vanish. */
export const GATE_COST_USD = 0.0006;

// ─── Supabase ────────────────────────────────────────────────────────────────

let sb: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (!sb) {
    sb = createClient(env.supabaseUrl, env.supabaseKey, { auth: { persistSession: false } });
  }
  return sb;
}

const supabaseDriver: Driver = {
  async insertSubmission(row) {
    const { error } = await supabase().from("submissions").insert(row);
    if (error) throw new Error(`insertSubmission: ${error.message}`);
  },
  async updateSubmissionStatus(id, status) {
    const { error } = await supabase().from("submissions").update({ status }).eq("id", id);
    if (error) console.error(`[its-not-a-lie] updateSubmissionStatus: ${error.message}`);
  },
  async insertTrial(row) {
    const { error } = await supabase().from("trials").insert(row);
    if (error) throw new Error(`insertTrial: ${error.message}`);
  },
  async upsertVerdict(row) {
    const { error } = await supabase()
      .from("verdicts")
      .upsert(row, { onConflict: "trial_id" });
    if (error) throw new Error(`insertVerdict: ${error.message}`);
  },
  async trialExists(id) {
    const { data } = await supabase().from("trials").select("id").eq("id", id).maybeSingle();
    return Boolean(data);
  },
  async upsertCase(row) {
    const { error } = await supabase().from("cases").upsert(row, { onConflict: "case_key" });
    if (error) throw new Error(`upsertCase: ${error.message}`);
  },
  async getCase(caseKey) {
    const { data } = await supabase()
      .from("cases")
      .select("*")
      .eq("case_key", caseKey)
      .maybeSingle();
    return (data as CaseRow | null) ?? null;
  },
  async loadRaw() {
    const client = supabase();
    const [subs, trials, verdicts, cases] = await Promise.all([
      client
        .from("submissions")
        .select("*")
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(RAW_LIMIT),
      client.from("trials").select("*").limit(RAW_LIMIT * 5),
      client.from("verdicts").select("*").limit(RAW_LIMIT * 5),
      client.from("cases").select("*").limit(1000),
    ]);
    return {
      submissions: (subs.data as Submission[]) ?? [],
      trials: (trials.data as Trial[]) ?? [],
      verdicts: (verdicts.data as VerdictRow[]) ?? [],
      cases: (cases.data as CaseRow[]) ?? [],
    };
  },
  // Supabase deployments run on serverless hosts, where Upstash carries the
  // counters. No need to derive them from rows.
  async spendToday() {
    return null;
  },
  async submissionsToday() {
    return null;
  },
};

// ─── Memory ──────────────────────────────────────────────────────────────────

const mem: RawData = { submissions: [], trials: [], verdicts: [], cases: [] };

const memoryDriver: Driver = {
  async insertSubmission(row) {
    mem.submissions.unshift(row);
  },
  async updateSubmissionStatus(id, status) {
    const found = mem.submissions.find((s) => s.id === id);
    if (found) found.status = status;
  },
  async insertTrial(row) {
    mem.trials.push(row);
  },
  async upsertVerdict(row) {
    mem.verdicts = mem.verdicts.filter((v) => v.trial_id !== row.trial_id);
    mem.verdicts.push(row);
  },
  async trialExists(id) {
    return mem.trials.some((t) => t.id === id);
  },
  async upsertCase(row) {
    mem.cases = mem.cases.filter((c) => c.case_key !== row.case_key);
    mem.cases.push(row);
  },
  async getCase(caseKey) {
    return mem.cases.find((c) => c.case_key === caseKey) ?? null;
  },
  async loadRaw() {
    return {
      submissions: mem.submissions.slice(0, RAW_LIMIT),
      trials: mem.trials,
      verdicts: mem.verdicts,
      cases: mem.cases,
    };
  },
  async spendToday() {
    return null;
  },
  async submissionsToday() {
    return null;
  },
};

const driver: Driver =
  storageBackend === "postgres"
    ? postgresDriver
    : storageBackend === "supabase"
      ? supabaseDriver
      : memoryDriver;

// ─── Public writes ───────────────────────────────────────────────────────────

export async function insertSubmission(
  row: Omit<Submission, "id" | "created_at">,
): Promise<Submission> {
  const submission: Submission = {
    ...row,
    id: randomUUID(),
    created_at: new Date().toISOString(),
  };
  await driver.insertSubmission(submission);
  return submission;
}

export async function updateSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): Promise<void> {
  await driver.updateSubmissionStatus(id, status);
}

export async function insertTrial(row: Omit<Trial, "id">): Promise<Trial> {
  const trial: Trial = { ...row, id: randomUUID() };
  await driver.insertTrial(trial);
  return trial;
}

export async function insertVerdict(
  row: Omit<VerdictRow, "id" | "created_at">,
): Promise<VerdictRow> {
  const verdict: VerdictRow = {
    ...row,
    id: randomUUID(),
    created_at: new Date().toISOString(),
  };
  await driver.upsertVerdict(verdict);
  return verdict;
}

export async function trialExists(trialId: string): Promise<boolean> {
  try {
    return await driver.trialExists(trialId);
  } catch {
    return false;
  }
}

export async function upsertCase(
  input: Partial<CaseRow> & { case_key: string },
): Promise<CaseRow> {
  const existing = await getCase(input.case_key);
  const merged: CaseRow = {
    id: existing?.id ?? randomUUID(),
    case_key: input.case_key,
    title: input.title ?? existing?.title ?? "",
    work: input.work ?? existing?.work ?? "",
    question: input.question ?? existing?.question ?? "",
    ground_truth: input.ground_truth ?? existing?.ground_truth ?? "",
    citations: input.citations ?? existing?.citations ?? [],
    status: input.status ?? existing?.status ?? "candidate",
    failure_modes: input.failure_modes ?? existing?.failure_modes ?? [],
    repo_item_id: input.repo_item_id ?? existing?.repo_item_id ?? null,
    notes: input.notes ?? existing?.notes ?? null,
    updated_at: new Date().toISOString(),
  };
  await driver.upsertCase(merged);
  return merged;
}

export async function getCase(caseKey: string): Promise<CaseRow | null> {
  try {
    return await driver.getCase(caseKey);
  } catch {
    return null;
  }
}

// ─── Spend and quota, derived from stored rows ───────────────────────────────

/**
 * Used when no Redis is configured but a database is. Deriving spend from the
 * rows we already store means the daily cap survives a restart, which matters
 * on Heroku where dynos cycle daily.
 */
export async function spendTodaySince(
  since: Date,
): Promise<{ totalUsd: number; opusUsd: number } | null> {
  try {
    const result = await driver.spendToday(since);
    return result ? { totalUsd: result.totalUsd, opusUsd: result.opusUsd } : null;
  } catch (err) {
    console.error("[its-not-a-lie] spendToday failed:", err);
    return null;
  }
}

export async function submissionsTodayFor(
  ipHash: string,
  since: Date,
): Promise<number | null> {
  try {
    return await driver.submissionsToday(ipHash, since);
  } catch (err) {
    console.error("[its-not-a-lie] submissionsToday failed:", err);
    return null;
  }
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

function summarise(raw: RawData): CaseSummary[] {
  const trialById = new Map(raw.trials.map((t) => [t.id, t]));
  const caseByKey = new Map(raw.cases.map((c) => [c.case_key, c]));
  const verdictsBySubmission = new Map<string, VerdictRow[]>();
  for (const v of raw.verdicts) {
    const list = verdictsBySubmission.get(v.submission_id) ?? [];
    list.push(v);
    verdictsBySubmission.set(v.submission_id, list);
  }

  const groups = new Map<string, Submission[]>();
  for (const s of raw.submissions) {
    if (s.status !== "done") continue;
    const list = groups.get(s.case_key) ?? [];
    list.push(s);
    groups.set(s.case_key, list);
  }

  const summaries: CaseSummary[] = [];

  for (const [caseKey, subs] of groups) {
    const visitors = new Set(subs.map((s) => s.ip_hash)).size;
    const perModel = new Map<ModelId, { graded: number; failures: number }>();
    let graded = 0;
    let failures = 0;
    let bestQuote: string | null = null;
    let bestQuoteModel: ModelId | null = null;
    let bestScore = -1;

    for (const sub of subs) {
      const stats = perModel.get(sub.model_id) ?? { graded: 0, failures: 0 };
      for (const v of verdictsBySubmission.get(sub.id) ?? []) {
        graded += 1;
        stats.graded += 1;
        if (countsAsFailure(v.verdict)) {
          failures += 1;
          stats.failures += 1;

          const trial = trialById.get(v.trial_id);
          const text = trial?.response_text ? stripMarkdown(trial.response_text) : "";
          if (text) {
            const score = (v.verdict === "wrong_fact" ? 1000 : 0) + Math.min(text.length, 400);
            if (score > bestScore) {
              bestScore = score;
              bestQuote = text.length > 260 ? `${text.slice(0, 260).trimEnd()}…` : text;
              bestQuoteModel = sub.model_id;
            }
          }
        }
      }
      perModel.set(sub.model_id, stats);
    }

    const newest = subs.reduce((a, b) => (a.created_at > b.created_at ? a : b));
    const curated = caseByKey.get(caseKey);

    summaries.push({
      case_key: caseKey,
      work: curated?.work || newest.work,
      question: curated?.question || newest.question,
      claimed_truth: newest.claimed_truth,
      status: curated?.status ?? "candidate",
      visitors,
      graded,
      failures,
      failure_rate: graded > 0 ? failures / graded : 0,
      per_model: Array.from(perModel.entries()).map(([model_id, s]) => ({ model_id, ...s })),
      best_quote: bestQuote,
      best_quote_model: bestQuoteModel,
      ground_truth: curated?.ground_truth || null,
      citations: curated?.citations ?? [],
      last_seen: newest.created_at,
    });
  }

  return summaries;
}

export async function getGallery(): Promise<CaseSummary[]> {
  let raw: RawData;
  try {
    raw = await driver.loadRaw();
  } catch (err) {
    console.error("[its-not-a-lie] loadRaw failed:", err);
    return [];
  }

  const rank: Record<CaseStatus, number> = {
    confirmed: 0,
    candidate: 1,
    refuted: 2,
    hidden: 3,
  };
  return summarise(raw)
    .filter((s) => s.status !== "hidden" && s.graded > 0)
    .sort(
      (a, b) =>
        rank[a.status] - rank[b.status] ||
        b.visitors - a.visitors ||
        b.failures - a.failures ||
        b.last_seen.localeCompare(a.last_seen),
    );
}

export const PROMOTION_THRESHOLD = { visitors: 2, failureRate: 0.4 } as const;

export async function getAdminQueue(): Promise<
  Array<CaseSummary & { ready: boolean; priority: number }>
> {
  const raw = await driver.loadRaw();
  return summarise(raw)
    .map((s) => ({
      ...s,
      ready:
        s.visitors >= PROMOTION_THRESHOLD.visitors &&
        s.failure_rate >= PROMOTION_THRESHOLD.failureRate,
      priority: s.visitors * s.failure_rate,
    }))
    .sort(
      (a, b) =>
        Number(b.ready) - Number(a.ready) ||
        b.priority - a.priority ||
        b.last_seen.localeCompare(a.last_seen),
    );
}

export async function getCaseDetail(caseKey: string): Promise<{
  summary: CaseSummary | null;
  submissions: Array<Submission & { trials: Array<Trial & { verdict: VerdictRow | null }> }>;
}> {
  const raw = await driver.loadRaw();
  const summary = summarise(raw).find((s) => s.case_key === caseKey) ?? null;
  const verdictByTrial = new Map(raw.verdicts.map((v) => [v.trial_id, v]));

  const submissions = raw.submissions
    .filter((s) => s.case_key === caseKey)
    .map((s) => ({
      ...s,
      trials: raw.trials
        .filter((t) => t.submission_id === s.id)
        .sort((a, b) => a.trial_idx - b.trial_idx)
        .map((t) => ({ ...t, verdict: verdictByTrial.get(t.id) ?? null })),
    }));

  return { summary, submissions };
}

export async function exportResearchData(): Promise<string> {
  const raw = await driver.loadRaw();
  const lines = raw.submissions.map((s) => {
    const trials = raw.trials
      .filter((t) => t.submission_id === s.id)
      .sort((a, b) => a.trial_idx - b.trial_idx)
      .map((t) => {
        const v = raw.verdicts.find((x) => x.trial_id === t.id);
        return {
          trial_idx: t.trial_idx,
          request_id: t.request_id,
          response_text: t.response_text,
          stop_reason: t.stop_reason,
          input_tokens: t.input_tokens,
          output_tokens: t.output_tokens,
          latency_ms: t.latency_ms,
          verdict: v?.verdict ?? null,
          wrong_answer_given: v?.wrong_answer_given ?? null,
          note: v?.note ?? null,
        };
      });
    return JSON.stringify({
      submission_id: s.id,
      created_at: s.created_at,
      case_key: s.case_key,
      mode: s.mode,
      work: s.work,
      question: s.question,
      claimed_truth: s.claimed_truth,
      messy_text: s.messy_text,
      model_id: s.model_id,
      params: s.params,
      n_trials: s.n_trials,
      status: s.status,
      trials,
    });
  });
  return lines.join("\n");
}
