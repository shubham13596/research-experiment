import { NextResponse } from "next/server";
import { getAdminQueue, getCaseDetail, upsertCase } from "@/lib/db";
import { isAdmin } from "@/lib/guards";
import type { CaseStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: CaseStatus[] = ["candidate", "confirmed", "refuted", "hidden"];

export async function GET(req: Request) {
  if (!isAdmin(req.headers)) {
    return NextResponse.json({ message: "Not authorised." }, { status: 401 });
  }
  const caseKey = new URL(req.url).searchParams.get("case");
  if (caseKey) {
    return NextResponse.json(await getCaseDetail(caseKey), {
      headers: { "cache-control": "no-store" },
    });
  }
  return NextResponse.json(
    { queue: await getAdminQueue() },
    { headers: { "cache-control": "no-store" } },
  );
}

/**
 * Sets a case's status after read-adjudication.
 *
 * "confirmed" requires two citations, matching the study's own ground-truth
 * standard. The check lives here rather than in the UI so it holds however the
 * endpoint is called.
 */
export async function POST(req: Request) {
  if (!isAdmin(req.headers)) {
    return NextResponse.json({ message: "Not authorised." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Could not read that." }, { status: 400 });
  }

  const caseKey = typeof body.caseKey === "string" ? body.caseKey : "";
  if (!caseKey) return NextResponse.json({ message: "Missing case." }, { status: 400 });

  const status = STATUSES.includes(body.status as CaseStatus)
    ? (body.status as CaseStatus)
    : undefined;

  const citations = Array.isArray(body.citations)
    ? body.citations.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    : undefined;

  if (status === "confirmed" && (!citations || citations.length < 2)) {
    return NextResponse.json(
      {
        message:
          "Confirming needs two independent citations — the same bar the study's own items use.",
      },
      { status: 400 },
    );
  }

  const row = await upsertCase({
    case_key: caseKey,
    status,
    citations,
    ground_truth: typeof body.groundTruth === "string" ? body.groundTruth.trim() : undefined,
    title: typeof body.title === "string" ? body.title.trim() : undefined,
    work: typeof body.work === "string" ? body.work.trim() : undefined,
    question: typeof body.question === "string" ? body.question.trim() : undefined,
    notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
    repo_item_id: typeof body.repoItemId === "string" ? body.repoItemId.trim() : undefined,
    failure_modes: Array.isArray(body.failureModes)
      ? body.failureModes.filter((m): m is string => typeof m === "string")
      : undefined,
  });

  return NextResponse.json({ ok: true, case: row });
}
