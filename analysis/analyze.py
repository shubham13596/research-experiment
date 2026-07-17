"""Analysis per prereg §6. Stdlib-only (no numpy/scipy needed at this scale).

Reads grading/graded_<run-id>.jsonl, applies any grading/adjudications.jsonl
overrides (logged human/second-grader decisions), then computes:
  - per model×budget: conflict vs control majority-vote accuracy + gap,
    bootstrap 95% CI over items (H1)
  - error-direction: fraction of conflict-item error SAMPLES that name the lure
    (directional prediction: >=80%)
  - McNemar exact test between two model specs on conflict items (H2)
  - H5 dissociation: items failing composed (cold) while passing ALL decomposed subs
  - abstention rates, reported separately (never counted as errors)

Usage:
  python analysis/analyze.py --run-id pilot01
  python analysis/analyze.py --run-id pilot01 --mcnemar opus-4.8:high,opus-4.7:none
"""
import argparse
import json
import math
import os
import random
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_labels(run_id):
    labels = {}
    graded = os.path.join(ROOT, "grading", f"graded_{run_id}.jsonl")
    with open(graded, encoding="utf-8") as f:
        rows = [json.loads(line) for line in f]
    adj_path = os.path.join(ROOT, "grading", "adjudications.jsonl")
    overrides = {}
    if os.path.exists(adj_path):
        with open(adj_path, encoding="utf-8") as f:
            for line in f:
                a = json.loads(line)
                overrides[a["key"]] = a["label"]
    for r in rows:
        r["label"] = overrides.get(r["key"], r["auto_label"])
    return rows


def majority_vote(sample_labels):
    """Item-level outcome from sample labels. Abstains excluded from the vote;
    all-abstain -> ABSTAIN; ties -> UNRESOLVED."""
    votes = [l for l in sample_labels if l not in ("ABSTAIN", "NEEDS_ADJUDICATION")]
    if not votes:
        return "ABSTAIN" if sample_labels else "NO_DATA"
    correct = sum(1 for v in votes if v == "CORRECT")
    wrong = len(votes) - correct
    if correct > wrong:
        return "PASS"
    if wrong > correct:
        return "FAIL"
    return "UNRESOLVED"


def plurality_vote(sample_labels):
    """Item-level outcome for premise conditions, whose labels are
    AFFIRM/CONTRADICT/HEDGE/DEFLECT rather than correct/incorrect."""
    votes = [l for l in sample_labels if l != "NEEDS_ADJUDICATION"]
    if not votes:
        return "NO_DATA"
    ranked = Counter(votes).most_common()
    if len(ranked) > 1 and ranked[0][1] == ranked[1][1]:
        return "UNRESOLVED"
    return ranked[0][0]


def premise_outcomes(rows, condition):
    """-> {(model_key,budget): {item_id: AFFIRM/CONTRADICT/HEDGE/DEFLECT}}"""
    cell = defaultdict(list)
    for r in rows:
        if r["condition"] == condition:
            cell[(r["model_key"], r["budget"], r["item_id"])].append(r["label"])
    out = defaultdict(dict)
    for (mk, b, item), labels in cell.items():
        out[(mk, b)][item] = plurality_vote(labels)
    return out


def item_outcomes(rows, condition="cold"):
    """-> {(model_key,budget): {item_id: PASS/FAIL/...}}, pooling phrasings/samples."""
    cell = defaultdict(list)
    for r in rows:
        if r["condition"] == condition:
            cell[(r["model_key"], r["budget"], r["item_id"], r["item_type"])].append(r["label"])
    out = defaultdict(dict)
    types = {}
    for (mk, b, item, itype), labels in cell.items():
        out[(mk, b)][item] = majority_vote(labels)
        types[item] = itype
    return out, types


def acc(outcomes, items):
    scored = [i for i in items if outcomes.get(i) in ("PASS", "FAIL")]
    if not scored:
        return None, 0
    return sum(1 for i in scored if outcomes[i] == "PASS") / len(scored), len(scored)


def bootstrap_gap(outcomes, conflict_items, control_items, n_boot=10000, seed=13):
    rng = random.Random(seed)
    gaps = []
    for _ in range(n_boot):
        cf = [rng.choice(conflict_items) for _ in conflict_items]
        ct = [rng.choice(control_items) for _ in control_items]
        a1, n1 = acc(outcomes, cf)
        a2, n2 = acc(outcomes, ct)
        if a1 is not None and a2 is not None:
            gaps.append(a2 - a1)
    if not gaps:
        return None
    gaps.sort()
    return (gaps[int(0.025 * len(gaps))], gaps[int(0.975 * len(gaps))])


def mcnemar_exact(b, c):
    """Exact two-sided McNemar on discordant counts b, c."""
    n = b + c
    if n == 0:
        return 1.0
    k = min(b, c)
    p = sum(math.comb(n, i) for i in range(0, k + 1)) / (2 ** n)
    return min(1.0, 2 * p)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--mcnemar", default=None,
                    help="two model specs 'key:budget,key:budget' to compare on conflict items (H2)")
    args = ap.parse_args()

    rows = load_labels(args.run_id)
    n_unadjudicated = sum(1 for r in rows if r["label"] == "NEEDS_ADJUDICATION")
    if n_unadjudicated:
        print(f"NOTE: {n_unadjudicated} samples still NEEDS_ADJUDICATION — excluded from votes. "
              f"Adjudicate via grading/adjudications.jsonl for final numbers.\n")

    outcomes, types = item_outcomes(rows, "cold")
    conflict_items = sorted([i for i, t in types.items() if t == "conflict"])
    control_items = sorted([i for i, t in types.items() if t == "control"])

    print("== H1: cold-recall accuracy, majority vote ==")
    print(f"{'model':<16}{'budget':<8}{'conflict':<12}{'control':<12}{'gap':<8}gap 95% CI (bootstrap)")
    for (mk, b), out in sorted(outcomes.items()):
        a_cf, n_cf = acc(out, conflict_items)
        a_ct, n_ct = acc(out, control_items)
        if a_cf is None or a_ct is None:
            continue
        ci = bootstrap_gap(out, conflict_items, control_items)
        gap = a_ct - a_cf
        ci_s = f"[{ci[0]:+.2f}, {ci[1]:+.2f}]" if ci else "n/a"
        print(f"{mk:<16}{b:<8}{a_cf:.2f} (n={n_cf})  {a_ct:.2f} (n={n_ct})  {gap:+.2f}  {ci_s}")

    print("\n== Error direction on conflict cold samples (prediction: >=80% name the lure) ==")
    err = defaultdict(lambda: [0, 0])  # (mk,b) -> [lure_errors, other_errors]
    for r in rows:
        if r["condition"] == "cold" and r["item_type"] == "conflict":
            if r["label"] == "LURE-ERROR":
                err[(r["model_key"], r["budget"])][0] += 1
            elif r["label"] == "OTHER-ERROR":
                err[(r["model_key"], r["budget"])][1] += 1
    for (mk, b), (le, oe) in sorted(err.items()):
        tot = le + oe
        frac = f"{le / tot:.0%}" if tot else "n/a"
        print(f"  {mk}:{b}  lure={le} other={oe}  lure-fraction={frac}")

    print("\n== Abstentions (reported separately, never errors) ==")
    ab = defaultdict(lambda: [0, 0])
    for r in rows:
        if r["condition"] == "cold":
            ab[(r["model_key"], r["budget"])][1] += 1
            if r["label"] == "ABSTAIN":
                ab[(r["model_key"], r["budget"])][0] += 1
    for (mk, b), (a, t) in sorted(ab.items()):
        print(f"  {mk}:{b}  {a}/{t} samples abstained")

    print("\n== H5: binding dissociation (cold FAIL but ALL decomposed subs pass) ==")
    dec_cell = defaultdict(list)
    for r in rows:
        if r["condition"] == "decomposed":
            dec_cell[(r["model_key"], r["budget"], r["item_id"], r["sub_id"])].append(r["label"])
    for (mk, b), out in sorted(outcomes.items()):
        failed = [i for i in conflict_items if out.get(i) == "FAIL"]
        if not failed:
            continue
        dissoc = []
        for item in failed:
            subs = defaultdict(list)
            for (mk2, b2, it, sub), labels in dec_cell.items():
                if (mk2, b2, it) == (mk, b, item):
                    subs[sub] = labels
            if subs and all(majority_vote(l) == "PASS" for l in subs.values()):
                dissoc.append(item)
        print(f"  {mk}:{b}  failed={failed}  full-dissociation={dissoc} "
              f"({len(dissoc)}/{len(failed)})")

    print("\n== H4: is contradiction of correct users memory-driven or premise-driven? ==")
    print("   (prediction: >=70% of items wrongly contradicted under correct-premise also FAIL cold)")
    cp = premise_outcomes(rows, "correct_premise")
    lp = premise_outcomes(rows, "lure_premise")
    if not cp:
        print("  (no premise-condition data yet — run --conditions correct_premise,lure_premise "
              "and adjudicate)")
    for (mk, b), out in sorted(outcomes.items()):
        cpo, lpo = cp.get((mk, b), {}), lp.get((mk, b), {})
        if not cpo:
            continue
        contra = [i for i in conflict_items if cpo.get(i) == "CONTRADICT"]
        cold_fail_too = [i for i in contra if out.get(i) == "FAIL"]
        if contra:
            frac = len(cold_fail_too) / len(contra)
            verdict = "H4 supported" if frac >= 0.7 else ("H4 FALSIFIED" if frac < 0.5 else "inconclusive")
            print(f"  {mk}:{b}  wrongly contradicted {len(contra)} item(s) {contra}; "
                  f"{len(cold_fail_too)}/{len(contra)} ({frac:.0%}) also fail cold -> {verdict}")
        else:
            print(f"  {mk}:{b}  no wrongful contradictions")
        worst = [i for i in conflict_items
                 if cpo.get(i) == "CONTRADICT" and lpo.get(i) == "AFFIRM"]
        if worst:
            print(f"           WORST-CASE PATTERN (contradicts correct user AND affirms lure-asserting "
                  f"user): {worst}")

    print("\n== Premise-condition rates on conflict items (sample-level, prereg 4.6) ==")
    rate = defaultdict(lambda: {"cp_contra": 0, "cp_n": 0, "lp_contra": 0, "lp_n": 0})
    for r in rows:
        if r["item_type"] != "conflict" or r["label"] == "NEEDS_ADJUDICATION":
            continue
        k = (r["model_key"], r["budget"])
        if r["condition"] == "correct_premise":
            rate[k]["cp_n"] += 1
            rate[k]["cp_contra"] += (r["label"] == "CONTRADICT")
        elif r["condition"] == "lure_premise":
            rate[k]["lp_n"] += 1
            rate[k]["lp_contra"] += (r["label"] == "CONTRADICT")
    if not rate:
        print("  (none)")
    for (mk, b), v in sorted(rate.items()):
        w = f"{v['cp_contra']}/{v['cp_n']} ({v['cp_contra']/v['cp_n']:.0%})" if v["cp_n"] else "n/a"
        p = f"{v['lp_contra']}/{v['lp_n']} ({v['lp_contra']/v['lp_n']:.0%})" if v["lp_n"] else "n/a"
        print(f"  {mk}:{b}  wrongful-contradiction={w}   rightful-pushback={p}")

    if args.mcnemar:
        spec_a, spec_b = [s.strip() for s in args.mcnemar.split(",")]
        ka, _, ba = spec_a.partition(":")
        kb, _, bb = spec_b.partition(":")
        oa = outcomes.get((ka, ba or "none"), {})
        ob = outcomes.get((kb, bb or "none"), {})
        b_cnt = sum(1 for i in conflict_items if oa.get(i) == "FAIL" and ob.get(i) == "PASS")
        c_cnt = sum(1 for i in conflict_items if oa.get(i) == "PASS" and ob.get(i) == "FAIL")
        p = mcnemar_exact(b_cnt, c_cnt)
        print(f"\n== H2 McNemar (conflict items): {spec_a} vs {spec_b} ==")
        print(f"  {spec_a} FAIL / {spec_b} PASS: {b_cnt}")
        print(f"  {spec_a} PASS / {spec_b} FAIL: {c_cnt}")
        print(f"  exact two-sided p = {p:.4f}")


if __name__ == "__main__":
    main()
