import { Redis } from "@upstash/redis";
import { counterBackend, env } from "./env";
import { spendTodaySince, submissionsTodayFor } from "./db";

/**
 * Rate limits and spend caps.
 *
 * Three backends, chosen by what is configured:
 *
 *  - **upstash** — for serverless hosts, where many short-lived instances share
 *    nothing. Counters live in Redis.
 *  - **postgres** — for a long-lived process (Heroku). Spend and quota are
 *    derived from the rows already stored, so they survive a dyno restart, and
 *    an in-process tally runs alongside to close the gap between a check and
 *    the insert that would otherwise let concurrent requests slip through.
 *    Whichever number is higher wins.
 *  - **memory** — local development only.
 */

export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function utcDayStart(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0),
  );
}

export function secondsUntilUtcMidnight(now = new Date()): number {
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
  );
  return Math.max(60, Math.ceil((midnight - now.getTime()) / 1000) + 60);
}

// ─── In-process tally ────────────────────────────────────────────────────────

interface DailyTally {
  day: string;
  spendUsd: number;
  opusSpendUsd: number;
  byVisitor: Map<string, number>;
}

let tally: DailyTally = { day: utcDay(), spendUsd: 0, opusSpendUsd: 0, byVisitor: new Map() };

function currentTally(): DailyTally {
  const day = utcDay();
  if (tally.day !== day) {
    tally = { day, spendUsd: 0, opusSpendUsd: 0, byVisitor: new Map() };
  }
  return tally;
}

// ─── Upstash ─────────────────────────────────────────────────────────────────

let redis: Redis | null = null;
function upstash(): Redis {
  if (!redis) redis = new Redis({ url: env.upstashUrl, token: env.upstashToken });
  return redis;
}

async function redisIncr(key: string, delta: number): Promise<number> {
  const value = Number(await upstash().incrbyfloat(key, delta));
  if (Math.abs(value - delta) < 1e-9) {
    await upstash().expire(key, secondsUntilUtcMidnight());
  }
  return value;
}

async function redisGet(key: string): Promise<number> {
  const value = await upstash().get<string | number>(key);
  return value === null || value === undefined ? 0 : Number(value);
}

// ─── Visitor quota ───────────────────────────────────────────────────────────

export interface RateResult {
  allowed: boolean;
  used: number;
  limit: number;
}

export async function consumeSubmissionQuota(
  ipHash: string,
  fpHash: string,
): Promise<RateResult> {
  const limit = env.dailySubmissionsPerVisitor;
  const day = utcDay();
  const t = currentTally();

  // The in-process tally counts this attempt immediately, which is what makes
  // concurrent requests from one visitor safe.
  const mine = (t.byVisitor.get(ipHash) ?? 0) + 1;
  t.byVisitor.set(ipHash, mine);
  if (fpHash) {
    const byFp = (t.byVisitor.get(`fp:${fpHash}`) ?? 0) + 1;
    t.byVisitor.set(`fp:${fpHash}`, byFp);
  }

  if (counterBackend === "upstash") {
    const [ipUsed, fpUsed] = await Promise.all([
      redisIncr(`rl:ip:${day}:${ipHash}`, 1),
      fpHash ? redisIncr(`rl:fp:${day}:${fpHash}`, 1) : Promise.resolve(0),
    ]);
    const used = Math.max(ipUsed, fpUsed);
    return { allowed: used <= limit, used, limit };
  }

  if (counterBackend === "postgres") {
    const stored = await submissionsTodayFor(ipHash, utcDayStart());
    // `stored` predates this attempt, so compare against stored + 1.
    const used = Math.max(mine, (stored ?? 0) + 1);
    return { allowed: used <= limit, used, limit };
  }

  const memUsed = Math.max(mine, fpHash ? (t.byVisitor.get(`fp:${fpHash}`) ?? 0) : 0);
  return { allowed: memUsed <= limit, used: memUsed, limit };
}

export async function peekSubmissionQuota(ipHash: string): Promise<RateResult> {
  const limit = env.dailySubmissionsPerVisitor;
  const t = currentTally();
  const mine = t.byVisitor.get(ipHash) ?? 0;

  if (counterBackend === "upstash") {
    const used = await redisGet(`rl:ip:${utcDay()}:${ipHash}`);
    return { allowed: used < limit, used, limit };
  }
  if (counterBackend === "postgres") {
    const stored = await submissionsTodayFor(ipHash, utcDayStart());
    const used = Math.max(mine, stored ?? 0);
    return { allowed: used < limit, used, limit };
  }
  return { allowed: mine < limit, used: mine, limit };
}

// ─── Spend caps ──────────────────────────────────────────────────────────────

export interface BudgetState {
  spentUsd: number;
  limitUsd: number;
  opusSpentUsd: number;
  opusLimitUsd: number;
  open: boolean;
  opusOpen: boolean;
  killSwitch: boolean;
}

export async function budgetState(): Promise<BudgetState> {
  const t = currentTally();
  let spentUsd = t.spendUsd;
  let opusSpentUsd = t.opusSpendUsd;

  if (counterBackend === "upstash") {
    const day = utcDay();
    const [total, opus] = await Promise.all([
      redisGet(`spend:${day}`),
      redisGet(`spend:opus:${day}`),
    ]);
    spentUsd = total;
    opusSpentUsd = opus;
  } else if (counterBackend === "postgres") {
    const stored = await spendTodaySince(utcDayStart());
    if (stored) {
      // Stored rows are authoritative across restarts; the in-process tally
      // covers spend from requests still in flight.
      spentUsd = Math.max(spentUsd, stored.totalUsd);
      opusSpentUsd = Math.max(opusSpentUsd, stored.opusUsd);
    }
  }

  const open = !env.killSwitch && spentUsd < env.dailyBudgetUsd;
  return {
    spentUsd,
    limitUsd: env.dailyBudgetUsd,
    opusSpentUsd,
    opusLimitUsd: env.opusDailyBudgetUsd,
    open,
    opusOpen: open && opusSpentUsd < env.opusDailyBudgetUsd,
    killSwitch: env.killSwitch,
  };
}

export async function recordSpend(usd: number, isOpus: boolean): Promise<void> {
  if (usd <= 0) return;

  const t = currentTally();
  t.spendUsd += usd;
  if (isOpus) t.opusSpendUsd += usd;

  if (counterBackend === "upstash") {
    const day = utcDay();
    await redisIncr(`spend:${day}`, usd);
    if (isOpus) await redisIncr(`spend:opus:${day}`, usd);
  }
  // postgres and memory need nothing here: postgres re-derives from stored
  // rows, and memory is the tally above.
}
