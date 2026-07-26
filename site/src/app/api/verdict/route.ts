import { NextResponse } from "next/server";
import { insertVerdict, trialExists } from "@/lib/db";
import { isVerdict, verdictSpec } from "@/lib/taxonomy";
import { LIMITS } from "@/lib/validate";

export const runtime = "nodejs";

/**
 * Records the visitor's grade for one trial. Re-tapping a different button
 * replaces the previous answer rather than stacking, so a mis-tap is fixable.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Could not read that." }, { status: 400 });
  }

  const trialId = typeof body.trialId === "string" ? body.trialId : "";
  const submissionId = typeof body.submissionId === "string" ? body.submissionId : "";
  const verdict = body.verdict;

  if (!trialId || !submissionId) {
    return NextResponse.json({ message: "Missing trial." }, { status: 400 });
  }
  if (!isVerdict(verdict)) {
    return NextResponse.json({ message: "Unknown verdict." }, { status: 400 });
  }
  if (!(await trialExists(trialId))) {
    return NextResponse.json({ message: "That trial no longer exists." }, { status: 404 });
  }

  const spec = verdictSpec(verdict);
  const wrongAnswer =
    spec.asksWhat && typeof body.wrongAnswerGiven === "string"
      ? body.wrongAnswerGiven.trim().slice(0, LIMITS.wrongAnswer) || null
      : null;
  const note =
    typeof body.note === "string" ? body.note.trim().slice(0, LIMITS.note) || null : null;

  try {
    await insertVerdict({
      trial_id: trialId,
      submission_id: submissionId,
      verdict,
      wrong_answer_given: wrongAnswer,
      note,
    });
  } catch (err) {
    console.error("[its-not-a-lie] insertVerdict failed:", err);
    return NextResponse.json({ message: "Could not save that grade." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
