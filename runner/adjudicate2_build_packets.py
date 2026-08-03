"""Build blind second-adjudication packets for the S9 substrate + S10 cells.

Scope (prereg'd priority set + the two withdrawn pairs, which are the lead's
documented error locus):
  S9 (cells S9_screen_cold / S9_screen_lure), pairs:
    gemma-3-27b   x {FIC-204, FIC-206, FIC-209, FIC-214, HIST-103, SPORT-102, HIST-104*}
    llama-3.3-70b x {HIST-104, SIMP-004, HIST-103*}
    qwen3-32b     x {FIC-204}
    (* = withdrawn substrate, included to double-check the withdrawal)
  S10 (cells S10_bare / S10_accuracy / S10_permission): all 135 records.

Output:
  transcripts/openmodels01/adjudicate2/packets/<ITEM>.json   (blind: no cell
      names, no model names, no lead verdicts; system_prompt + prompt + full
      response_text only, shuffled with a fixed seed)
  transcripts/openmodels01/adjudicate2/private/mapping.json  (resp_id -> full
      record identity; NEVER shown to readers)

Dedupe rule: per key, last success wins (success = error is None and non-empty
response_text) — same rule the runner's resume logic uses.
"""
import json
import random
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TDIR = ROOT / "transcripts" / "openmodels01"
OUT = TDIR / "adjudicate2"

S9_PAIRS = {
    ("gemma-3-27b", "FIC-204"), ("gemma-3-27b", "FIC-206"),
    ("gemma-3-27b", "FIC-209"), ("gemma-3-27b", "FIC-214"),
    ("gemma-3-27b", "HIST-103"), ("gemma-3-27b", "SPORT-102"),
    ("gemma-3-27b", "HIST-104"),                       # withdrawn pair
    ("llama-3.3-70b", "HIST-104"), ("llama-3.3-70b", "SIMP-004"),
    ("llama-3.3-70b", "HIST-103"),                     # withdrawn pair
    ("qwen3-32b", "FIC-204"),
}
S9_CELLS = {"S9_screen_cold", "S9_screen_lure"}
S10_CELLS = {"S10_bare", "S10_accuracy", "S10_permission"}

SHARDS = [
    "records.gemma-3-27b.jsonl", "records.llama-3.3-70b.jsonl",
    "records.qwen3-32b.jsonl", "records.s10-gemma.jsonl",
    "records.s10-llama.jsonl", "records.s10-qwen.jsonl",
]

ITEM_FILES = {
    "SPORT-102": ROOT / "items" / "SPORT-102.json",
    "HIST-103": ROOT / "items" / "HIST-103.json",
    "HIST-104": ROOT / "items" / "HIST-104.json",
    "SIMP-004": ROOT / "items" / "SIMP-004.json",
    "FIC-204": ROOT / "items" / "candidates" / "fiction_batch2_built" / "FIC-204.json",
    "FIC-206": ROOT / "items" / "candidates" / "fiction_batch2_built" / "FIC-206.json",
    "FIC-209": ROOT / "items" / "candidates" / "fiction_batch2_built" / "FIC-209.json",
    "FIC-214": ROOT / "items" / "candidates" / "fiction_batch2_built" / "FIC-214.json",
}
# Fields safe to show readers: ground truth only, no susceptibility priors.
DOSSIER_FIELDS = ["id", "source_work", "event", "target_entity", "lure_entity",
                  "foil_entity", "ground_truth_evidence", "decomposed_facts"]


def load_records():
    best = {}
    order = {}
    n = 0
    for shard in SHARDS:
        for line in (TDIR / shard).read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)  # abort on unparseable, per standing rule
            n += 1
            ok = r.get("error") is None and (r.get("response_text") or "").strip()
            if not ok:
                continue
            best[r["key"]] = r
            order[r["key"]] = n
    return best


def in_scope(r):
    cell = r.get("cell", "")
    if cell in S10_CELLS:
        return True
    if cell in S9_CELLS and (r["model_key"], r["item"]) in S9_PAIRS:
        return True
    return False


def main():
    records = [r for r in load_records().values() if in_scope(r)]
    # sanity: every (cell, model, item) cell must have exactly 5 samples
    cells = defaultdict(list)
    for r in records:
        cells[(r["cell"], r["model_key"], r["item"])].append(r)
    bad = {k: len(v) for k, v in cells.items() if len(v) != 5}
    assert not bad, f"cells without exactly 5 usable samples: {bad}"
    n_s9 = sum(1 for r in records if r["cell"] in S9_CELLS)
    n_s10 = sum(1 for r in records if r["cell"] in S10_CELLS)
    assert n_s9 == 110, n_s9
    assert n_s10 == 135, n_s10

    by_item = defaultdict(list)
    for r in records:
        by_item[r["item"]].append(r)

    (OUT / "packets").mkdir(parents=True, exist_ok=True)
    (OUT / "private").mkdir(parents=True, exist_ok=True)
    rng = random.Random(20260803)
    mapping = {}

    for item, recs in sorted(by_item.items()):
        models = sorted({r["model_key"] for r in recs})
        alias = {m: f"Model-{chr(65 + i)}" for i, m in enumerate(models)}
        recs = sorted(recs, key=lambda r: r["key"])
        rng.shuffle(recs)
        dossier = json.loads(ITEM_FILES[item].read_text(encoding="utf-8"))
        dossier = {k: dossier[k] for k in DOSSIER_FIELDS if k in dossier}
        entries = []
        for i, r in enumerate(recs, 1):
            rid = f"{item}-R{i:02d}"
            kind = "cold_question" if r["cell"] == "S9_screen_cold" else "user_premise"
            entries.append({
                "resp_id": rid,
                "model": alias[r["model_key"]],
                "kind": kind,
                "system_prompt": r.get("system_prompt") or "",
                "prompt": r["prompt"],
                "response_text": r["response_text"],
            })
            mapping[rid] = {
                "key": r["key"], "cell": r["cell"], "model_key": r["model_key"],
                "item": r["item"], "sample": r["sample"],
                "served_provider": r.get("served_provider"),
            }
        packet = {"item_ground_truth": dossier, "n_responses": len(entries),
                  "responses": entries}
        p = OUT / "packets" / f"{item}.json"
        p.write_text(json.dumps(packet, indent=2, ensure_ascii=False),
                     encoding="utf-8")
        print(f"{item}: {len(entries)} responses -> {p.name}")

    (OUT / "private" / "mapping.json").write_text(
        json.dumps(mapping, indent=2), encoding="utf-8")
    print(f"total {len(mapping)} responses; mapping written (private)")


if __name__ == "__main__":
    main()
