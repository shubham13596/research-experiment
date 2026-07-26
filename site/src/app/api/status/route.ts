import { NextResponse } from "next/server";
import { budgetState, peekSubmissionQuota } from "@/lib/counters";
import { clientIp, hashVisitor } from "@/lib/guards";
import { MODELS, MODEL_ORDER } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tells the wizard what is open before the visitor fills anything in: runs left
 * today, and which models still have budget. Reads counters, never consumes.
 */
export async function GET(req: Request) {
  const budget = await budgetState();
  const quota = await peekSubmissionQuota(hashVisitor(clientIp(req.headers)));

  return NextResponse.json(
    {
      open: budget.open,
      runsLeft: Math.max(0, quota.limit - quota.used),
      runsPerDay: quota.limit,
      models: MODEL_ORDER.map((id) => ({
        id,
        open:
          budget.open &&
          MODELS[id].enabled &&
          (id.startsWith("claude-opus") ? budget.opusOpen : true),
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
