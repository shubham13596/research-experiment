"""Expand item JSONs into per-condition prompt records.

Conditions per prereg §4.3:
  cold            - each of the item's cold_prompts phrasings (fresh conversation each)
  decomposed      - each decomposed_facts sub-question (fresh conversation each)
  correct_premise - user asserts the true binding
  lure_premise    - user asserts the lure (conflict) / foil (control) binding.
                    EXCLUDED for Tier 3 items (ethics protocol, item doc §7 rule 7)
                    and for any prompt still marked TODO.

Usage:
  python runner/build_prompts.py                 # writes prompts/prompts.jsonl
  python runner/build_prompts.py --items "items/*.json"
"""
import argparse
import glob
import json
import os
import sys

CONDITIONS = ["cold", "decomposed", "correct_premise", "lure_premise"]


def load_items(items_glob):
    items = []
    for path in sorted(glob.glob(items_glob)):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and "items" in data:
            # candidate-batch files are not run; only promoted per-item files are
            continue
        items.append(data)
    return items


def records_for_item(item):
    recs = []
    base = {
        "item_id": item["id"],
        "item_type": item["type"],
        "pair_id": item.get("pair_id"),
        "schema_tier": item["schema_tier"],
        "grading_keywords_target": item.get("grading_keywords_target", []),
        "grading_keywords_lure": item.get("grading_keywords_lure", []),
    }
    for i, p in enumerate(item.get("cold_prompts", [])):
        recs.append({**base, "condition": "cold", "sub_id": f"phrasing_{chr(65+i)}",
                     "prompt": p})
    for d in item.get("decomposed_facts", []):
        recs.append({**base, "condition": "decomposed", "sub_id": d["q_id"],
                     "prompt": d["question"], "expected_answer": d["answer"]})
    if item.get("correct_premise_prompt"):
        recs.append({**base, "condition": "correct_premise", "sub_id": "main",
                     "prompt": item["correct_premise_prompt"]})
    lure_p = item.get("lure_premise_prompt")
    tier3 = str(item.get("schema_tier", "")).startswith("3")
    if lure_p and not tier3 and not lure_p.startswith("TODO"):
        recs.append({**base, "condition": "lure_premise", "sub_id": "main",
                     "prompt": lure_p})
    return recs


def build(items_glob):
    items = load_items(items_glob)
    if not items:
        sys.exit(f"No items matched {items_glob}")
    recs = []
    for item in items:
        recs.extend(records_for_item(item))
    return items, recs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--items", default="items/*.json")
    ap.add_argument("--out", default="prompts/prompts.jsonl")
    args = ap.parse_args()
    items, recs = build(args.items)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        for r in recs:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    n_items = len(items)
    print(f"{n_items} items -> {len(recs)} prompt records -> {args.out}")


if __name__ == "__main__":
    main()
