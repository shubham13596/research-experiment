import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import { GATE_PROMPT, GATE_SCHEMA } from "./prompts";
import { costUsd, GATE_MODEL, MODELS, type ModelId } from "./models";
import { recordSpend } from "./counters";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: env.anthropicKey, maxRetries: 1 });
  }
  return client;
}

function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

// ─── Topical gate ────────────────────────────────────────────────────────────

export interface GateResult {
  allowed: boolean;
  reason: string;
}

/**
 * One Haiku call before any expensive model runs, so this is a fandom-fact
 * instrument rather than a free chatbot.
 *
 * An explicit "no" blocks the submission. An infrastructure failure lets it
 * through — the visitor's 3-per-day quota, the token cap and the daily budget
 * still bound the damage, and a Haiku outage shouldn't close the site.
 */
export async function runGate(text: string): Promise<GateResult> {
  try {
    const params = {
      model: GATE_MODEL,
      max_tokens: 256,
      messages: [{ role: "user" as const, content: GATE_PROMPT(text) }],
      output_config: { format: { type: "json_schema", schema: GATE_SCHEMA } },
    };
    // output_config typings trail the API across SDK minors; the wire shape above
    // is what the endpoint expects.
    const message = await anthropic().messages.create(
      params as unknown as Anthropic.MessageCreateParamsNonStreaming,
    );

    void recordSpend(
      costUsd(GATE_MODEL, message.usage.input_tokens, message.usage.output_tokens),
      false,
    ).catch(() => {});

    const raw = textOf(message.content);
    const parsed = JSON.parse(raw) as { allowed?: unknown; reason?: unknown };
    if (typeof parsed.allowed !== "boolean") throw new Error("gate returned no verdict");
    return {
      allowed: parsed.allowed,
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? parsed.reason.trim()
          : "Not a question about a fictional work.",
    };
  } catch (err) {
    console.error("[its-not-a-lie] Gate call failed, allowing submission:", err);
    return { allowed: true, reason: "gate unavailable" };
  }
}

// ─── Trials ──────────────────────────────────────────────────────────────────

export interface TrialResult {
  text: string;
  requestId: string | null;
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd: number;
}

/**
 * One trial. Parameters come from the model registry and are logged verbatim
 * with the row, so any result here can be reproduced by the study's harness.
 *
 * Non-streaming on purpose: the TypeScript SDK scales its request timeout up
 * for large max_tokens on non-streaming calls, and `.withResponse()` hands back
 * the response headers so we can keep the API request-id as an audit trail.
 */
export async function runTrial(model: ModelId, prompt: string): Promise<TrialResult> {
  const spec = MODELS[model];
  const started = Date.now();

  const { data: message, response } = await anthropic()
    .messages.create({
      model: spec.id,
      max_tokens: spec.maxTokens,
      messages: [{ role: "user", content: prompt }],
      // No temperature, no system prompt, no tools, no thinking config.
      // See paramsFor() in models.ts for why each omission matters.
    })
    .withResponse();

  const latencyMs = Date.now() - started;
  const cost = costUsd(model, message.usage.input_tokens, message.usage.output_tokens);
  await recordSpend(cost, model.startsWith("claude-opus"));

  return {
    text: textOf(message.content),
    requestId: response.headers.get("request-id"),
    stopReason: message.stop_reason,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    latencyMs,
    costUsd: cost,
  };
}

/**
 * Runs trials with bounded concurrency, invoking `onResult` the moment each one
 * lands so the page fills in progressively instead of waiting for all five.
 */
export async function runTrials(
  model: ModelId,
  prompt: string,
  count: number,
  concurrency: number,
  onResult: (idx: number, result: TrialResult | null, error?: string) => Promise<void>,
): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, count) }, async () => {
    for (;;) {
      const idx = next;
      next += 1;
      if (idx >= count) return;
      try {
        const result = await runTrial(model, prompt);
        await onResult(idx, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[its-not-a-lie] Trial ${idx} failed:`, message);
        await onResult(idx, null, message);
      }
    }
  });
  await Promise.all(workers);
}
