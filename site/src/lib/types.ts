import type { ModelId } from "./models";
import type { Mode } from "./prompts";
import type { Verdict } from "./taxonomy";

export type SubmissionStatus =
  | "running"
  | "done"
  | "failed"
  | "capacity_rejected"
  | "gate_rejected";

export interface Submission {
  id: string;
  created_at: string;
  ip_hash: string;
  fp_hash: string;
  mode: Mode;
  work: string;
  question: string;
  claimed_truth: string;
  messy_text: string | null;
  model_id: ModelId;
  params: Record<string, unknown>;
  n_trials: number;
  status: SubmissionStatus;
  /** Normalised work+question key, used to cluster submissions into cases. */
  case_key: string;
}

export interface Trial {
  id: string;
  submission_id: string;
  trial_idx: number;
  request_id: string | null;
  response_text: string;
  stop_reason: string | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
}

export interface VerdictRow {
  id: string;
  trial_id: string;
  submission_id: string;
  verdict: Verdict;
  wrong_answer_given: string | null;
  note: string | null;
  created_at: string;
}

export type CaseStatus = "candidate" | "confirmed" | "refuted" | "hidden";

export interface CaseRow {
  id: string;
  case_key: string;
  title: string;
  work: string;
  question: string;
  ground_truth: string;
  citations: string[];
  status: CaseStatus;
  failure_modes: string[];
  repo_item_id: string | null;
  notes: string | null;
  updated_at: string;
}

/** One row of the public gallery / admin queue. */
export interface CaseSummary {
  case_key: string;
  work: string;
  question: string;
  claimed_truth: string;
  status: CaseStatus;
  /** Distinct visitors who have submitted this case. */
  visitors: number;
  graded: number;
  failures: number;
  failure_rate: number;
  per_model: Array<{ model_id: ModelId; graded: number; failures: number }>;
  /** Most quotable wrong response, for the card. */
  best_quote: string | null;
  best_quote_model: ModelId | null;
  ground_truth: string | null;
  citations: string[];
  last_seen: string;
}

/** Server-sent events emitted by POST /api/submit. */
export type SubmitEvent =
  | { type: "meta"; submissionId: string; nTrials: number; model: ModelId; prompt: string }
  | {
      type: "take";
      trialId: string;
      trialIdx: number;
      text: string;
      latencyMs: number;
      stopReason: string | null;
    }
  | { type: "take_failed"; trialIdx: number; message: string }
  | { type: "done"; completed: number }
  | { type: "error"; code: string; message: string };
