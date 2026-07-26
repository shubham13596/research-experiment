import { Pool } from "pg";
import { env } from "./env";

/**
 * Postgres driver, for Heroku Postgres (or any plain DATABASE_URL).
 *
 * Heroku terminates TLS with its own certificate authority, so verification has
 * to be relaxed for hobby and standard tiers — this is Heroku's documented
 * requirement, not a shortcut. A provider with a verifiable chain can set
 * PGSSL_STRICT=1.
 */

let pool: Pool | null = null;

export function pg(): Pool {
  if (!pool) {
    const strict = process.env.PGSSL_STRICT === "1";
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseUrl.includes("localhost")
        ? false
        : { rejectUnauthorized: strict },
      max: 5,
      idleTimeoutMillis: 30_000,
    });
    pool.on("error", (err) => {
      console.error("[its-not-a-lie] Postgres pool error:", err.message);
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pg().query(sql, params);
  return result.rows as T[];
}

/**
 * Creates the schema if it isn't there yet, so a fresh Heroku Postgres add-on
 * works without a manual migration step. Runs once per process.
 */
let ensured: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!ensured) {
    ensured = query(SCHEMA)
      .then(() => {
        console.log("[its-not-a-lie] Postgres schema ready.");
      })
      .catch((err) => {
        ensured = null;
        throw err;
      })
      .then(() => undefined);
  }
  return ensured;
}

/** Kept in step with db/schema.sql. Every statement is idempotent. */
const SCHEMA = `
create table if not exists submissions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  ip_hash text not null,
  fp_hash text not null default '',
  mode text not null,
  work text not null,
  question text not null,
  claimed_truth text not null,
  messy_text text,
  model_id text not null,
  params jsonb not null default '{}'::jsonb,
  n_trials int not null default 0,
  status text not null,
  case_key text not null
);
create index if not exists submissions_case_key_idx on submissions (case_key);
create index if not exists submissions_created_at_idx on submissions (created_at desc);
create index if not exists submissions_status_idx on submissions (status);
create index if not exists submissions_ip_day_idx on submissions (ip_hash, created_at desc);

create table if not exists trials (
  id uuid primary key,
  submission_id uuid not null references submissions (id) on delete cascade,
  trial_idx int not null,
  request_id text,
  response_text text not null default '',
  stop_reason text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  latency_ms int not null default 0,
  created_at timestamptz not null default now(),
  unique (submission_id, trial_idx)
);
create index if not exists trials_submission_idx on trials (submission_id);
create index if not exists trials_created_at_idx on trials (created_at desc);

create table if not exists verdicts (
  id uuid primary key,
  trial_id uuid not null unique references trials (id) on delete cascade,
  submission_id uuid not null references submissions (id) on delete cascade,
  verdict text not null,
  wrong_answer_given text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists verdicts_submission_idx on verdicts (submission_id);

create table if not exists cases (
  id uuid primary key,
  case_key text not null unique,
  title text not null default '',
  work text not null default '',
  question text not null default '',
  ground_truth text not null default '',
  citations text[] not null default '{}',
  status text not null default 'candidate',
  failure_modes text[] not null default '{}',
  repo_item_id text,
  notes text,
  updated_at timestamptz not null default now()
);
create index if not exists cases_status_idx on cases (status);
`;
