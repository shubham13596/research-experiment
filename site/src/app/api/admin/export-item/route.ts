import { NextResponse } from "next/server";
import { getCase, getCaseDetail } from "@/lib/db";
import { isAdmin } from "@/lib/guards";
import { MODELS } from "@/lib/models";
import { countsAsFailure } from "@/lib/taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Turns a confirmed community case into a skeleton for the study's items/
 * directory, so a crowd-found case becomes a runnable item in the existing
 * harness without being retyped.
 *
 * The interesting part is that community data fills in the field a researcher
 * would otherwise have to guess: `lure_entity`. When visitors record what the
 * model said instead, the most common wrong answer *is* the attractor.
 *
 * Fields the crowd cannot supply are emitted as "TODO:" strings rather than
 * plausible-looking filler. A half-written item that looks finished is worse
 * than one that says what is missing.
 */
export async function GET(req: Request) {
  if (!isAdmin(req.headers)) {
    return NextResponse.json({ message: "Not authorised." }, { status: 401 });
  }

  const url = new URL(req.url);
  const caseKey = url.searchParams.get("case");
  if (!caseKey) return NextResponse.json({ message: "Missing case." }, { status: 400 });

  const proposedId = url.searchParams.get("id") || "COM-000";
  const { summary, submissions } = await getCaseDetail(caseKey);
  if (!summary) return NextResponse.json({ message: "No such case." }, { status: 404 });

  const curated = await getCase(caseKey);

  // Tally what the models actually said instead of the right answer.
  const wrongCounts = new Map<string, number>();
  const coldPrompts = new Set<string>();
  const premisePrompts = new Set<string>();
  const perModel = new Map<string, { graded: number; failures: number }>();

  for (const sub of submissions) {
    if (sub.mode === "quiz") coldPrompts.add(`In ${sub.work}, ${sub.question}`);
    else if (sub.messy_text) premisePrompts.add(sub.messy_text);

    const stats = perModel.get(sub.model_id) ?? { graded: 0, failures: 0 };
    for (const trial of sub.trials) {
      const v = trial.verdict;
      if (!v) continue;
      stats.graded += 1;
      if (countsAsFailure(v.verdict)) {
        stats.failures += 1;
        const named = v.wrong_answer_given?.trim();
        if (named) wrongCounts.set(named, (wrongCounts.get(named) ?? 0) + 1);
      }
    }
    perModel.set(sub.model_id, stats);
  }

  const ranked = Array.from(wrongCounts.entries()).sort((a, b) => b[1] - a[1]);
  const lureEntity = ranked[0]?.[0] ?? "TODO: no wrong answer was recorded by name";
  const distractors = ranked.slice(1, 4).map(([name]) => name);

  const groundTruth = curated?.ground_truth || summary.claimed_truth;
  const citations = curated?.citations ?? [];

  const lureStrength =
    summary.failure_rate >= 0.6 ? "high" : summary.failure_rate >= 0.3 ? "medium" : "low";

  const modelSummary = Array.from(perModel.entries())
    .map(([id, s]) => `${MODELS[id as keyof typeof MODELS]?.label ?? id} ${s.failures}/${s.graded}`)
    .join(", ");

  const item = {
    id: proposedId,
    type: "conflict",
    pair_id: `${proposedId}C`,
    schema_tier: "TODO: assign tier (see item_template_and_protocol.md)",
    domain: "TODO: assign domain",
    source_work: summary.work,
    event: `TODO: one-line description of the event. Visitors asked: ${summary.question}`,
    target_entity: groundTruth,
    lure_entity: lureEntity,
    lure_mechanism: "TODO: archetype_capture | quote_capture | compression | other",
    lure_rationale:
      "TODO: why this lure is strong. Check whether the lure is intra-source (does the work itself code the wrong character for this action?) and whether the wrong version is the meme-dominant one.",
    lure_strength: lureStrength,
    distractor_entities: distractors,
    ground_truth_evidence:
      citations.length >= 2
        ? `VERIFIED via community submission, adjudicated ${new Date().toISOString().slice(0, 10)}. Sources: ${citations.join(" | ")}`
        : "TODO: verify against two independent sources before running. Community submission is a lead, not evidence.",
    meme_asymmetry_note:
      "TODO: does the wrong version circulate more widely than the true one?",
    decomposed_facts: [
      {
        q_id: "d1",
        question: `In ${summary.work}, ${summary.question}`,
        answer: groundTruth,
      },
      { q_id: "d2", question: "TODO: add the scene-adjacent fact the lure comes from", answer: "TODO" },
    ],
    cold_prompts: coldPrompts.size > 0 ? Array.from(coldPrompts) : [`In ${summary.work}, ${summary.question}`],
    correct_premise_prompt:
      Array.from(premisePrompts)[0] ??
      `TODO: write a correct-premise prompt naming ${groundTruth}`,
    lure_premise_prompt: `TODO: same as correct_premise_prompt but naming ${lureEntity}`,
    grading_keywords_target: [groundTruth],
    grading_keywords_lure: ranked.slice(0, 3).map(([name]) => name),
    verification_status: curated?.status === "confirmed" ? "verified" : "unverified",
    notes: [
      `Community-sourced via itsnotalie. ${summary.visitors} independent visitor(s), ${summary.failures}/${summary.graded} graded wrong (${Math.round(summary.failure_rate * 100)}%).`,
      modelSummary ? `Per model: ${modelSummary}.` : "",
      "Grades are visitor self-reports and were used only to prioritise this case for read-adjudication, never as evidence.",
      `case_key: ${caseKey}`,
    ]
      .filter(Boolean)
      .join(" "),
  };

  return new NextResponse(`${JSON.stringify(item, null, 2)}\n`, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${proposedId}.json"`,
      "cache-control": "no-store",
    },
  });
}
