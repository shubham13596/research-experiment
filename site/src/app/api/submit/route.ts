import { NextResponse } from "next/server";
import { runGate, runTrials } from "@/lib/anthropic";
import { budgetState, consumeSubmissionQuota } from "@/lib/counters";
import { insertSubmission, insertTrial, updateSubmissionStatus } from "@/lib/db";
import { clientIp, hashVisitor, verifyTurnstile } from "@/lib/guards";
import { MODELS, paramsFor, TRIAL_CONCURRENCY, TRIALS_PER_SUBMISSION } from "@/lib/models";
import { buildPrompt } from "@/lib/prompts";
import { caseKeyFor, parseSubmission, ValidationError } from "@/lib/validate";
import type { SubmitEvent } from "@/lib/types";

export const runtime = "nodejs";
/** Five trials at concurrency three, on a model that may be thinking. */
export const maxDuration = 300;

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

export async function POST(req: Request) {
  // ── Parse and validate ────────────────────────────────────────────────────
  let parsed;
  try {
    parsed = parseSubmission(await req.json());
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { code: "invalid", message: err.message, field: err.field },
        { status: 400 },
      );
    }
    return fail("invalid", "Could not read that submission.", 400);
  }

  const { input, model, turnstileToken, fingerprint } = parsed;
  const spec = MODELS[model];
  if (!spec.enabled) {
    return fail("model_closed", `${spec.label} is not available right now.`, 400);
  }

  // ── Bot check ─────────────────────────────────────────────────────────────
  const ip = clientIp(req.headers);
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return fail("bot_check", "That bot check didn't pass. Reload the page and try again.", 403);
  }

  // ── Capacity ──────────────────────────────────────────────────────────────
  const budget = await budgetState();
  if (!budget.open) {
    return fail(
      "at_capacity",
      budget.killSwitch
        ? "Submissions are paused. The gallery is still open."
        : "We've hit today's budget. The gallery is still open — new runs open again after midnight UTC.",
      503,
    );
  }
  const isOpus = model.startsWith("claude-opus");
  if (isOpus && !budget.opusOpen) {
    return fail(
      "model_at_capacity",
      `${spec.label} has used its budget for today. Sonnet is still running.`,
      503,
    );
  }

  // ── Visitor quota ─────────────────────────────────────────────────────────
  const ipHash = hashVisitor(ip);
  const fpHash = fingerprint ? hashVisitor(fingerprint) : "";
  const quota = await consumeSubmissionQuota(ipHash, fpHash);
  if (!quota.allowed) {
    return fail(
      "rate_limited",
      `That's ${quota.limit} runs today, which is the limit. It resets at midnight UTC.`,
      429,
    );
  }

  // ── Topical gate ──────────────────────────────────────────────────────────
  const prompt = buildPrompt(input);
  const gate = await runGate(prompt);
  if (!gate.allowed) {
    await insertSubmission({
      ip_hash: ipHash,
      fp_hash: fpHash,
      mode: input.mode,
      work: input.work,
      question: input.question,
      claimed_truth: input.claimedTruth,
      messy_text: input.mode === "correction" ? input.messyText : null,
      model_id: model,
      params: paramsFor(model),
      n_trials: 0,
      status: "gate_rejected",
      case_key: caseKeyFor(input.work, input.question),
    }).catch(() => {});
    return fail(
      "off_topic",
      `This box is for facts about fiction — ${gate.reason} Try something like "In Breaking Bad, who…".`,
      400,
    );
  }

  // ── Record and run ────────────────────────────────────────────────────────
  const submission = await insertSubmission({
    ip_hash: ipHash,
    fp_hash: fpHash,
    mode: input.mode,
    work: input.work,
    question: input.question,
    claimed_truth: input.claimedTruth,
    messy_text: input.mode === "correction" ? input.messyText : null,
    model_id: model,
    params: paramsFor(model),
    n_trials: TRIALS_PER_SUBMISSION,
    status: "running",
    case_key: caseKeyFor(input.work, input.question),
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: SubmitEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send({
        type: "meta",
        submissionId: submission.id,
        caseKey: submission.case_key,
        nTrials: TRIALS_PER_SUBMISSION,
        model,
        prompt,
      });

      /**
       * Heroku's router closes a connection after 55 seconds with no bytes, and
       * a thinking model can easily take longer than that between takes. An SSE
       * comment keeps the connection alive; the client ignores any chunk with no
       * `data:` line, so this is invisible to it.
       */
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          closed = true;
        }
      }, 15_000);

      let completed = 0;
      try {
        await runTrials(
          model,
          prompt,
          TRIALS_PER_SUBMISSION,
          TRIAL_CONCURRENCY,
          async (idx, result, error) => {
            if (!result) {
              send({
                type: "take_failed",
                trialIdx: idx,
                message: error ?? "The model didn't answer.",
              });
              return;
            }
            const trial = await insertTrial({
              submission_id: submission.id,
              trial_idx: idx,
              request_id: result.requestId,
              response_text: result.text,
              stop_reason: result.stopReason,
              input_tokens: result.inputTokens,
              output_tokens: result.outputTokens,
              latency_ms: result.latencyMs,
            });
            completed += 1;
            send({
              type: "take",
              trialId: trial.id,
              trialIdx: idx,
              text: result.text,
              latencyMs: result.latencyMs,
              stopReason: result.stopReason,
            });
          },
        );
        await updateSubmissionStatus(submission.id, completed > 0 ? "done" : "failed");
        send({ type: "done", completed });
      } catch (err) {
        console.error("[its-not-a-lie] Submission run failed:", err);
        await updateSubmissionStatus(submission.id, "failed");
        send({
          type: "error",
          code: "run_failed",
          message: "The run stopped partway through. Anything above is still yours to grade.",
        });
      } finally {
        clearInterval(heartbeat);
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
