import { NextResponse } from "next/server";
import { exportResearchData } from "@/lib/db";
import { isAdmin } from "@/lib/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * JSONL dump of every submission, trial and grade. Carries no visitor
 * identifiers — no IP hashes, no fingerprints — so it can be published the way
 * the study's own transcripts are.
 */
export async function GET(req: Request) {
  if (!isAdmin(req.headers)) {
    return NextResponse.json({ message: "Not authorised." }, { status: 401 });
  }
  const body = await exportResearchData();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "content-disposition": `attachment; filename="itsnotalie-submissions-${stamp}.jsonl"`,
      "cache-control": "no-store",
    },
  });
}
