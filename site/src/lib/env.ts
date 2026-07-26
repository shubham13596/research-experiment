/**
 * Environment access. Everything optional degrades to a local-dev fallback so
 * the app runs with nothing but ANTHROPIC_API_KEY set.
 *
 * Storage and counters each pick the first backend that is configured:
 *   storage   Postgres (DATABASE_URL) → Supabase → in-memory
 *   counters  Redis (REDIS_URL / Upstash) → Postgres → in-memory
 *
 * Heroku sets DATABASE_URL and REDIS_URL for its own add-ons, so a Heroku
 * deployment needs no storage configuration beyond attaching them.
 */

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",

  dailyBudgetUsd: num("DAILY_BUDGET_USD", 15),
  opusDailyBudgetUsd: num("OPUS_DAILY_BUDGET_USD", 5),
  killSwitch: process.env.KILL_SWITCH === "1",
  dailySubmissionsPerVisitor: num("DAILY_SUBMISSIONS_PER_VISITOR", 3),

  /** Heroku Postgres, or any standard Postgres connection string. */
  databaseUrl: process.env.DATABASE_URL ?? "",

  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  /** Upstash REST, for serverless hosts. */
  upstashUrl: process.env.UPSTASH_REDIS_REST_URL ?? "",
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",

  turnstileSecret: process.env.TURNSTILE_SECRET_KEY ?? "",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",

  adminToken: process.env.ADMIN_TOKEN ?? "",
  ipHashSalt: process.env.IP_HASH_SALT ?? "dev-salt-do-not-use-in-production",

  /**
   * Public origin, used to build absolute URLs for share cards and copied
   * links. Heroku doesn't expose this automatically, so set it explicitly.
   */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
} as const;

export const hasPostgres = Boolean(env.databaseUrl);
export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseKey);
export const hasUpstash = Boolean(env.upstashUrl && env.upstashToken);
export const hasTurnstile = Boolean(env.turnstileSecret);

export type StorageBackend = "postgres" | "supabase" | "memory";
export type CounterBackend = "upstash" | "postgres" | "memory";

export const storageBackend: StorageBackend = hasPostgres
  ? "postgres"
  : hasSupabase
    ? "supabase"
    : "memory";

/**
 * No Redis path for Postgres deployments: spend and quota are derived from the
 * rows we already store, which removes an add-on and survives restarts.
 */
export const counterBackend: CounterBackend = hasUpstash
  ? "upstash"
  : hasPostgres
    ? "postgres"
    : "memory";

let warned = false;
export function warnOnce(): void {
  if (warned) return;
  warned = true;

  if (!env.anthropicKey) {
    console.warn("[its-not-a-lie] ANTHROPIC_API_KEY is not set — submissions will fail.");
  }
  console.log(`[its-not-a-lie] storage=${storageBackend} counters=${counterBackend}`);

  if (storageBackend === "memory") {
    console.warn("[its-not-a-lie] Storing submissions in memory — everything is lost on restart.");
  }
  if (counterBackend === "memory") {
    console.warn(
      "[its-not-a-lie] Rate limits and spend caps are in memory — they reset on restart and are per-instance.",
    );
  }
  if (counterBackend === "postgres") {
    console.log(
      "[its-not-a-lie] Spend and quota are derived from stored rows, so they survive restarts.",
    );
  }
  if (!hasTurnstile) {
    console.warn("[its-not-a-lie] No Turnstile secret — bot check is disabled.");
  }
  if (!env.adminToken) {
    console.warn("[its-not-a-lie] No ADMIN_TOKEN — /admin is closed.");
  }
}
