import { isMode, type Mode, type SubmissionInput } from "./prompts";
import { DEFAULT_MODEL, isModelId, type ModelId } from "./models";

export const LIMITS = {
  work: 80,
  question: 300,
  claimedTruth: 80,
  messyText: 500,
  note: 280,
  wrongAnswer: 120,
} as const;

export interface ParsedSubmission {
  input: SubmissionInput;
  model: ModelId;
  turnstileToken: string;
  fingerprint: string;
}

export class ValidationError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

function str(value: unknown, field: string, max: number, required = true): string {
  if (typeof value !== "string") {
    if (!required) return "";
    throw new ValidationError(`${field} is missing.`, field);
  }
  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    throw new ValidationError(`${field} is empty.`, field);
  }
  if (trimmed.length > max) {
    throw new ValidationError(`${field} is longer than ${max} characters.`, field);
  }
  return trimmed;
}

/**
 * Correction mode only works if the visitor's message actually states the
 * correct answer — the whole test is whether the model overrides a *correct*
 * premise. A message that omits it is testing something else.
 */
function mentionsTruth(messy: string, truth: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const haystack = norm(messy);
  const needle = norm(truth);
  if (!needle) return false;
  if (haystack.includes(needle)) return true;
  // Accept a first-name-only mention of a multi-word answer ("George Costanza" → "george").
  const first = needle.split(" ")[0];
  return first.length >= 3 && haystack.includes(first);
}

export function parseSubmission(body: unknown): ParsedSubmission {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body is not an object.");
  }
  const b = body as Record<string, unknown>;

  const mode: Mode = isMode(b.mode) ? b.mode : "quiz";
  const model: ModelId = isModelId(b.model) ? b.model : DEFAULT_MODEL;

  const work = str(b.work, "Show or film", LIMITS.work);
  const question = str(b.question, "Question", LIMITS.question);
  const claimedTruth = str(b.claimedTruth, "Correct answer", LIMITS.claimedTruth);

  if (mode === "correction") {
    const messyText = str(b.messyText, "Your message", LIMITS.messyText);
    if (!mentionsTruth(messyText, claimedTruth)) {
      throw new ValidationError(
        `Your message needs to say "${claimedTruth}" in it — the test is whether the model overrules you when you are right.`,
        "messyText",
      );
    }
    return {
      input: { mode, work, question, claimedTruth, messyText },
      model,
      turnstileToken: typeof b.turnstileToken === "string" ? b.turnstileToken : "",
      fingerprint: typeof b.fingerprint === "string" ? b.fingerprint.slice(0, 200) : "",
    };
  }

  return {
    input: { mode: "quiz", work, question, claimedTruth },
    model,
    turnstileToken: typeof b.turnstileToken === "string" ? b.turnstileToken : "",
    fingerprint: typeof b.fingerprint === "string" ? b.fingerprint.slice(0, 200) : "",
  };
}

/**
 * Clusters submissions into cases. Two visitors asking the same thing about the
 * same show in different words should land on one case, so the queue ranks by
 * how many independent people found it — not how many phrasings exist.
 *
 * The result doubles as the public URL slug for /case/<key>, so it stays
 * lowercase, hyphenated and free of anything needing percent-encoding.
 */
export function caseKeyFor(work: string, question: string): string {
  const stop = new Set([
    "the", "a", "an", "in", "on", "of", "to", "is", "was", "who", "which",
    "what", "does", "did", "do", "that", "it", "and", "episode", "character",
  ]);
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !stop.has(w));

  const workKey = norm(work).join("-");
  const questionKey = Array.from(new Set(norm(question))).sort().join("-");
  const key = [workKey, questionKey].filter(Boolean).join("--").slice(0, 180);

  // A question made entirely of stop words would otherwise produce an empty
  // key, which would merge unrelated submissions into one case.
  return key || `case-${simpleHash(`${work} ${question}`)}`;
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
