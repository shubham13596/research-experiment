/**
 * Model registry. Mirrors config/models.json in the study repo.
 *
 * Every field here is pinned deliberately and logged with each trial, so a
 * community submission is a reproducible cell rather than an anecdote.
 */

export type ModelId =
  | "claude-sonnet-4-6"
  | "claude-sonnet-5"
  | "claude-opus-4-8"
  | "claude-opus-5"
  | "claude-fable-5"
  | "claude-haiku-4-5";

/**
 * Production revision-page stock. Real 1990s shooting scripts were revised on
 * coloured paper — white draft, then blue, pink, yellow, green, goldenrod, and
 * salmon when a script went around again. One stock per model, used
 * consistently across the whole site so a colour always means the same model.
 */
export type Stock =
  | "blue"
  | "pink"
  | "goldenrod"
  | "green"
  | "yellow"
  | "salmon"
  | "white";

export interface ModelSpec {
  id: ModelId;
  /** Shown to visitors. */
  label: string;
  /** One line on what this model does in the study. */
  billing: string;
  stock: Stock;
  /** USD per million tokens. */
  priceIn: number;
  priceOut: number;
  /**
   * Output cap. The study used 1024 for non-thinking cells and 16384 when
   * thinking was on. Sonnet 5 runs adaptive thinking whenever the `thinking`
   * param is omitted, and max_tokens caps thinking + text together — so it
   * needs the larger ceiling or answers truncate mid-sentence.
   */
  maxTokens: number;
  /** True when omitting `thinking` still produces reasoning tokens. */
  thinksByDefault: boolean;
  /** Draws from the premium daily budget (the Opus-tier spend cap). */
  premium: boolean;
  /** Selectable in the wizard. */
  enabled: boolean;
}

export const MODELS: Record<ModelId, ModelSpec> = {
  "claude-sonnet-4-6": {
    id: "claude-sonnet-4-6",
    label: "Sonnet 4.6",
    billing: "Wrong 36 times out of 36 on the anchor case. The reliable one.",
    stock: "blue",
    priceIn: 3,
    priceOut: 15,
    maxTokens: 1024,
    thinksByDefault: false,
    premium: false,
    enabled: true,
  },
  "claude-sonnet-5": {
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    billing: "Invents its own wrong answer, with a fake episode title attached.",
    stock: "pink",
    priceIn: 3,
    priceOut: 15,
    maxTokens: 16384,
    thinksByDefault: true,
    premium: false,
    enabled: true,
  },
  "claude-opus-4-8": {
    id: "claude-opus-4-8",
    label: "Opus 4.8",
    billing: "Corrects you when you are right. Runs on a smaller daily budget.",
    stock: "goldenrod",
    priceIn: 5,
    priceOut: 25,
    maxTokens: 1024,
    thinksByDefault: false,
    premium: true,
    enabled: true,
  },
  "claude-opus-5": {
    id: "claude-opus-5",
    label: "Opus 5",
    billing:
      "Mostly cured — wrong 2 in 30 where Opus 4.8 was wrong 19 in 30. When it fails, the whole invented scene comes back.",
    stock: "salmon",
    priceIn: 5,
    priceOut: 25,
    // Thinking is on by default on Opus 5 and max_tokens caps thinking + text
    // together, so it needs the same headroom as Sonnet 5.
    maxTokens: 16384,
    thinksByDefault: true,
    premium: true,
    enabled: true,
  },
  "claude-fable-5": {
    id: "claude-fable-5",
    label: "Fable 5",
    billing: "Has never missed the anchor: 0 for 100. Double the price, so runs are scarce.",
    stock: "white",
    priceIn: 10,
    priceOut: 50,
    // Thinking is always on and cannot be disabled; same headroom rule.
    maxTokens: 16384,
    thinksByDefault: true,
    premium: true,
    enabled: true,
  },
  "claude-haiku-4-5": {
    id: "claude-haiku-4-5",
    label: "Haiku 4.5",
    billing: "Usually just says it doesn't know. The control.",
    stock: "green",
    priceIn: 1,
    priceOut: 5,
    maxTokens: 1024,
    thinksByDefault: false,
    premium: false,
    enabled: true,
  },
};

export const MODEL_ORDER: ModelId[] = [
  "claude-sonnet-4-6",
  "claude-sonnet-5",
  "claude-opus-4-8",
  "claude-opus-5",
  "claude-fable-5",
  "claude-haiku-4-5",
];

export const DEFAULT_MODEL: ModelId = "claude-sonnet-4-6";

/** Model used for the topical gate. Cheapest thing that can read a sentence. */
export const GATE_MODEL: ModelId = "claude-haiku-4-5";

/** Trials per submission. The study's own floor for "one run is noise". */
export const TRIALS_PER_SUBMISSION = 5;

/** How many trials to run at once. Keeps latency tolerable without bursting. */
export const TRIAL_CONCURRENCY = 3;

export function isModelId(v: unknown): v is ModelId {
  return typeof v === "string" && v in MODELS;
}

/**
 * Models the study measured but the site doesn't offer live. Only Opus 4.7 is
 * left here — superseded by Opus 4.8 and Opus 5.
 *
 * Fable 5 keeps white pages on purpose — in a production script, white is the
 * original draft, the one that needed no revision. It answered the anchor
 * correctly every time.
 */
export type ReferenceModelId = "claude-opus-4-7";
export type AnyModelId = ModelId | ReferenceModelId;

const REFERENCE_MODELS: Record<ReferenceModelId, { label: string; stock: Stock }> = {
  "claude-opus-4-7": { label: "Opus 4.7", stock: "yellow" },
};

export function modelDisplay(id: AnyModelId): { label: string; stock: Stock } {
  if (id in MODELS) {
    const spec = MODELS[id as ModelId];
    return { label: spec.label, stock: spec.stock };
  }
  return REFERENCE_MODELS[id as ReferenceModelId];
}

export function costUsd(model: ModelId, inTokens: number, outTokens: number): number {
  const m = MODELS[model];
  return (inTokens / 1e6) * m.priceIn + (outTokens / 1e6) * m.priceOut;
}

/**
 * The exact request parameters we send, recorded alongside every trial.
 *
 * Deliberately absent, and why:
 *  - temperature/top_p/top_k — the study never sent them; Sonnet 5 and Opus 4.8
 *    reject non-default sampling params outright.
 *  - system — bare API. The claude.ai consumer prompt suppresses these failures
 *    and is a separate condition, not this one.
 *  - tools — none, matching the study's parametric runs.
 *  - thinking — omitted, so each model runs its own default. Recorded below.
 */
export function paramsFor(model: ModelId) {
  const m = MODELS[model];
  return {
    model: m.id,
    max_tokens: m.maxTokens,
    temperature: null as null,
    system: null as null,
    tools: [] as string[],
    thinking: m.thinksByDefault ? "adaptive (model default)" : "off (model default)",
    surface: "raw-api" as const,
  };
}
