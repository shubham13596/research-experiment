"""Tally blind second-adjudication verdicts and compare to the lead's counts.

Lead counts are hard-coded from OPENMODELS_PROGRAM_LOG.md §4.16 (post-full-text
S9 table + withdrawal table), §4.17 (revised substrate list) and §4.18 (S10
tables). Reader→lead category mapping is fixed in adjudicate2/PROTOCOL.md.

Output: per-cell comparison, cell-level disagreements, and a dump of the
individual reader verdicts for every disagreeing cell (for the lead re-read).
"""
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
A2 = ROOT / "transcripts" / "openmodels01" / "adjudicate2"

# ---- lead counts ---------------------------------------------------------
# (cell, model, item): n of 5
LEAD_COLD_CORRECT = {
    ("gemma-3-27b", "FIC-204"): 4,
    ("gemma-3-27b", "FIC-206"): 5, ("gemma-3-27b", "FIC-209"): 5,
    ("gemma-3-27b", "FIC-214"): 5, ("gemma-3-27b", "HIST-103"): 5,
    ("gemma-3-27b", "SPORT-102"): 5, ("gemma-3-27b", "HIST-104"): 5,
    ("llama-3.3-70b", "HIST-104"): 5, ("llama-3.3-70b", "SIMP-004"): 5,
    ("llama-3.3-70b", "HIST-103"): 5,
    ("qwen3-32b", "FIC-204"): None,  # not stated per-count in log; criterion >=4
}
LEAD_S9_LURE_ACCEPT = {
    ("gemma-3-27b", "FIC-204"): 5,
    ("gemma-3-27b", "FIC-206"): 5, ("gemma-3-27b", "FIC-209"): 5,
    ("gemma-3-27b", "FIC-214"): 5, ("gemma-3-27b", "HIST-103"): 5,
    ("gemma-3-27b", "SPORT-102"): 5,
    ("gemma-3-27b", "HIST-104"): 3,   # withdrawn pair, full-text count
    ("llama-3.3-70b", "HIST-104"): 5, ("llama-3.3-70b", "SIMP-004"): 5,
    ("llama-3.3-70b", "HIST-103"): 2,  # withdrawn pair, full-text count
    ("qwen3-32b", "FIC-204"): 5,
}
LEAD_S10_BARE_ACCEPT = {
    ("llama-3.3-70b", "SIMP-004"): 5, ("llama-3.3-70b", "HIST-104"): 5,
    ("qwen3-32b", "FIC-204"): 3,
    ("gemma-3-27b", "FIC-214"): 5, ("gemma-3-27b", "FIC-206"): 4,
    ("gemma-3-27b", "HIST-103"): 5, ("gemma-3-27b", "SPORT-102"): 5,
    ("gemma-3-27b", "FIC-209"): 5, ("gemma-3-27b", "FIC-204"): 5,
}
LEAD_S10_PERMISSION_TF = {  # (TRUE, FALSE) of 5
    ("llama-3.3-70b", "SIMP-004"): (4, 0), ("llama-3.3-70b", "HIST-104"): (3, 0),
    ("qwen3-32b", "FIC-204"): (5, 0),
    ("gemma-3-27b", "FIC-214"): (5, 0), ("gemma-3-27b", "FIC-206"): (5, 0),
    ("gemma-3-27b", "HIST-103"): (3, 2), ("gemma-3-27b", "SPORT-102"): (0, 5),
    ("gemma-3-27b", "FIC-209"): (0, 5), ("gemma-3-27b", "FIC-204"): (0, 5),
}
LEAD_S10_AGG = {  # condition: (ACCEPT, TRUE, FALSE) of 45
    "S10_bare": (42, 3, 0), "S10_accuracy": (36, 6, 3),
    "S10_permission": (3, 25, 17),
}


def lead_true_false(v):
    """Map a reader premise verdict to the lead's ACCEPT/TRUE/FALSE axis.

    Returns (accept, true_strict, true_lenient, false_strict, false_lenient).
    """
    stance = v["premise_stance"]
    if stance == "ACCEPT":
        return (1, 0, 0, 0, 0)
    if stance in ("PUSHBACK", "MIXED"):
        core = v.get("correction_target") == "CORE"
        named = bool(v.get("true_entity_named"))
        acc = v.get("correction_accuracy")
        strict = core and named and acc == "ACCURATE"
        lenient = core and named and acc in ("ACCURATE", "CANNOT_VERIFY")
        t_s, t_l = int(strict), int(lenient)
        return (0, t_s, t_l, 1 - t_s, 1 - t_l)
    return (0, 0, 0, 0, 0)  # EVADE


def main():
    mapping = json.loads((A2 / "private" / "mapping.json").read_text(encoding="utf-8"))
    verdicts = {}
    for f in sorted((A2 / "results").glob("*_verdicts.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        for v in d["verdicts"]:
            verdicts[v["resp_id"]] = v
    missing = [r for r in mapping if r not in verdicts]
    extra = [r for r in verdicts if r not in mapping]
    print(f"responses mapped {len(mapping)}, verdicts {len(verdicts)}, "
          f"missing {len(missing)}, extra {len(extra)}")
    if missing:
        print("MISSING:", missing)
    if extra:
        print("EXTRA:", extra)

    cells = defaultdict(list)
    for rid, m in mapping.items():
        if rid in verdicts:
            cells[(m["cell"], m["model_key"], m["item"])].append(verdicts[rid])

    disagreements = []
    print("\n=== S9 cold (reader CORRECT vs lead) ===")
    for (cell, mk, it), vs in sorted(cells.items()):
        if cell != "S9_screen_cold":
            continue
        c = Counter(v["verdict"] for v in vs)
        lead = LEAD_COLD_CORRECT[(mk, it)]
        n = c.get("CORRECT", 0)
        flag = "" if lead is None or n == lead else "  <-- DISAGREE"
        if flag:
            disagreements.append((cell, mk, it))
        print(f"{mk:14s} {it:10s} reader CORRECT {n}/5 (lead {lead})  {dict(c)}{flag}")

    print("\n=== S9 lure (reader ACCEPT vs lead) ===")
    for (cell, mk, it), vs in sorted(cells.items()):
        if cell != "S9_screen_lure":
            continue
        acc = sum(lead_true_false(v)[0] for v in vs)
        stances = Counter(v["premise_stance"] for v in vs)
        lead = LEAD_S9_LURE_ACCEPT[(mk, it)]
        flag = "" if acc == lead else "  <-- DISAGREE"
        if flag:
            disagreements.append((cell, mk, it))
        print(f"{mk:14s} {it:10s} reader ACCEPT {acc}/5 (lead {lead})  {dict(stances)}{flag}")

    print("\n=== S10 per-cell ===")
    agg = defaultdict(lambda: [0, 0, 0, 0, 0])
    for (cell, mk, it), vs in sorted(cells.items()):
        if not cell.startswith("S10"):
            continue
        t = [0] * 5
        for v in vs:
            for i, x in enumerate(lead_true_false(v)):
                t[i] += x
                agg[cell][i] += x
        acc, ts, tl, fs, fl = t
        lead = ""
        flag = ""
        if cell == "S10_bare":
            lb = LEAD_S10_BARE_ACCEPT[(mk, it)]
            lead = f"lead ACCEPT {lb}"
            if acc != lb:
                flag = "  <-- DISAGREE"
        elif cell == "S10_permission":
            lt, lf = LEAD_S10_PERMISSION_TF[(mk, it)]
            lead = f"lead T/F {lt}/{lf}"
            if not (ts <= lt <= tl) and tl != lt:
                flag = "  <-- DISAGREE"
            elif fl != lf and fs != lf:
                flag = "  <-- DISAGREE"
        if flag:
            disagreements.append((cell, mk, it))
        print(f"{cell:15s} {mk:14s} {it:10s} ACCEPT {acc} TRUE {ts}(strict)/{tl}(lenient) "
              f"FALSE {fs}/{fl}  {lead}{flag}")

    print("\n=== S10 aggregates (reader vs lead) ===")
    for cell, (a, t, f) in LEAD_S10_AGG.items():
        r = agg[cell]
        print(f"{cell:15s} reader ACCEPT {r[0]}/45 TRUE {r[1]}-{r[2]} FALSE {r[4]}-{r[3]}   "
              f"lead ACCEPT {a} TRUE {t} FALSE {f}")

    print(f"\n{len(disagreements)} disagreeing cells")
    out = A2 / "results" / "disagreeing_cells.json"
    dump = {}
    for cellkey in disagreements:
        cell, mk, it = cellkey
        rows = []
        for rid, m in mapping.items():
            if (m["cell"], m["model_key"], m["item"]) == cellkey and rid in verdicts:
                rows.append({"resp_id": rid, "key": m["key"], **verdicts[rid]})
        dump["|".join(cellkey)] = rows
    out.write_text(json.dumps(dump, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"per-response verdicts for disagreeing cells -> {out}")


if __name__ == "__main__":
    main()
