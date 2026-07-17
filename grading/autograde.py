"""Auto-grader (prereg §4.5). Keyword/entity grading with word boundaries.

Labels for cold/decomposed:
  CORRECT      target entity named, lure absent (hedged is fine)
  LURE-ERROR   designated lure named, target absent
  OTHER-ERROR  neither named and response asserts some other answer (via adjudication)
  ABSTAIN      declines / says it doesn't know (NOT an error; reported separately)
  NEEDS_ADJUDICATION  both named, or neither named without abstain markers

Premise conditions (correct_premise / lure_premise) are NOT auto-labeled —
AFFIRM/CONTRADICT/HEDGE/DEFLECT requires judgment. Every premise response goes to
the adjudication queue. Adjudicate by writing grading/adjudications.jsonl lines:
  {"key": "<sample key>", "label": "AFFIRM|CONTRADICT|HEDGE|DEFLECT|CORRECT|...", "grader": "who", "note": "why"}
Adjudications override auto labels at analysis time. Every decision is logged.

Usage:
  python grading/autograde.py --run-id pilot01
  -> grading/graded_<run-id>.jsonl + grading/adjudication_queue_<run-id>.jsonl
"""
import argparse
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ABSTAIN_PATTERNS = [
    r"\bi (?:do not|don't) know\b",
    r"\bi'?m not (?:sure|certain)\b",
    r"\bcan(?:no|')t (?:recall|remember|say for certain)\b",
    r"\bnot (?:familiar|certain|sure) (?:with|about|which)\b",
    r"\bunable to (?:verify|confirm|recall)\b",
    r"\bdon'?t have (?:reliable|specific|enough) (?:information|details|knowledge)\b",
    r"\bi may be (?:wrong|mistaken|misremembering)\b.*\bnot sure\b",
]


def _found(keywords, text):
    return any(re.search(r"\b" + re.escape(k.lower()) + r"\b", text) for k in keywords if k)


def grade_recall(row):
    text = (row.get("response_text") or "").lower()
    if not text.strip():
        return "NEEDS_ADJUDICATION", "empty/error response"
    if row["condition"] == "decomposed":
        target = [row.get("expected_answer", "")]
        # multi-word decomposed answers: accept the distinctive final token too
        toks = [t for t in re.findall(r"[a-z]+", target[0].lower()) if len(t) > 3]
        target = target + toks
        lure = []
    else:
        target = row.get("grading_keywords_target", [])
        lure = row.get("grading_keywords_lure", []) if row.get("item_type") == "conflict" else []
    t_hit = _found(target, text)
    l_hit = _found(lure, text)
    if t_hit and not l_hit:
        return "CORRECT", None
    if l_hit and not t_hit:
        return "LURE-ERROR", None
    if t_hit and l_hit:
        return "NEEDS_ADJUDICATION", "both target and lure named — check which is asserted"
    if any(re.search(p, text) for p in ABSTAIN_PATTERNS):
        return "ABSTAIN", None
    return "NEEDS_ADJUDICATION", "neither target nor lure named — OTHER-ERROR vs paraphrase vs abstain"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-id", required=True)
    args = ap.parse_args()

    in_path = os.path.join(ROOT, "transcripts", args.run_id, "records.jsonl")
    graded_path = os.path.join(ROOT, "grading", f"graded_{args.run_id}.jsonl")
    queue_path = os.path.join(ROOT, "grading", f"adjudication_queue_{args.run_id}.jsonl")

    counts = {}
    with open(in_path, encoding="utf-8") as fin, \
         open(graded_path, "w", encoding="utf-8") as fg, \
         open(queue_path, "w", encoding="utf-8") as fq:
        for line in fin:
            row = json.loads(line)
            if row["condition"] in ("correct_premise", "lure_premise"):
                label, reason = "NEEDS_ADJUDICATION", "premise condition — human/second-grader label required"
            else:
                label, reason = grade_recall(row)
            out = {"key": row["key"], "item_id": row["item_id"], "item_type": row["item_type"],
                   "condition": row["condition"], "sub_id": row["sub_id"],
                   "model_key": row["model_key"], "budget": row["budget"],
                   "sample_idx": row["sample_idx"], "auto_label": label, "auto_reason": reason}
            fg.write(json.dumps(out, ensure_ascii=False) + "\n")
            if label == "NEEDS_ADJUDICATION":
                fq.write(json.dumps({**out, "prompt": row["prompt"],
                                     "response_text": row["response_text"]},
                                    ensure_ascii=False) + "\n")
            counts[label] = counts.get(label, 0) + 1

    print(f"Graded -> {graded_path}")
    print(f"Adjudication queue -> {queue_path}")
    for k, v in sorted(counts.items()):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
