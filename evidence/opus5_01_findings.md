# Findings — Opus 5 replication of the decisive Opus 4.8 tests (run-id: opus5_01)

**Date:** 2026-07-25 (exploratory, post-freeze). Model: `claude-opus-5` (released after study freeze;
Opus 4.8 was flagship at freeze). Item: SEIN-001 only. 148 calls, 0 API errors.
**Design:** exact replication of the three decisive Opus 4.8 measurements — phrasing01's anchor cells
(verbatim/bare, verbatim/claudeai, cleaned/claudeai × low/high effort × n=15), repro01's clean direct
lookup (n=5 × 2 efforts), and search01's optional-web_search cells (bare/claudeai × low/high × n=12).
Same stimuli byte-for-byte, same claude.ai system prompt file, same adaptive-thinking effort config.
**Grading:** same first-named keyword heuristic as the source runs, then a full read-adjudication of
all 13 GEORGE-labeled rows plus a regex sweep and 5-row spot-check of the 106 Jerry-labeled rows.

## Headline: the attractor survives, the capture rate collapses

Opus 5 fires the identical failure package as Opus 4.8 — "it's **George, not Jerry**," an invented
police-officer girlfriend, the quote inverted to fit the rewritten scene ("Jerry coaches him:
'It's not a lie if you believe it'"), and the same guilty-pleasure rationalization — but roughly
**6–9× less often** on the strong-trigger cells:

| Cell (SEIN-001) | Opus 4.8 | **Opus 5** |
|---|---|---|
| verbatim / bare | 19/30 (63%) | **2/30 (7%)** |
| verbatim / claude.ai | 14/30 (47%) | **3/30 (10%)** |
| cleaned / claude.ai | 5/30 (17%) | **3/30 (10%)** |

All 8 phrasing-block GEORGE rows are read-confirmed wrongful corrections of a correct user (no
grader artifacts). Effort still does not gate the residual: errors split ~evenly across low/high
(low 4, high 4). The phrasing gradient largely flattens — Opus 5's floor (~7–10%) sits where the
scaffold+cleanup ceiling used to be for 4.8.

## The clean-prompt ceiling CRACKED (new — worse than 4.8 on this cell)

Clean direct lookup ("In Seinfeld's 'The Beard', which character takes the polygraph?"):
**9/10 correct, 1 confident error at low effort** (Opus 4.8: 40/40; every model tested previously:
ceiling). The error is a fully-formed false scene: "it's **George Costanza** who takes the polygraph
… dating a police officer named Sheila (Melissa) … Jerry, a *Melrose Place* expert, tries to coach
him ('It's not a lie... if you believe it'), but George cracks." n=10 is small — but the claim
"clean prompts measure 0% on this item" is now model-relative, and the bug report's §5 boundary
condition ("clean direct lookups: essentially ceiling") does NOT carry to Opus 5 unqualified.

## Search-seeking: Opus 5 has the FABLE profile, not the Opus 4.8 profile

| Cell | Opus 4.8 searched | Fable 5 searched | **Opus 5 searched** |
|---|---|---|---|
| bare / low | 8% | 0% | **8% (1/12)** |
| bare / high | 17% | 100% | **100% (12/12)** |
| claude.ai / low | 0% | 0% | **0% (0/12)** |
| claude.ai / high | 0% | 8% | **17% (2/12)** |

Effort now gates verification (8%→100% bare), exactly like Fable 5 and unlike Opus 4.8 (8%→17%).
And the **danger cell is empty**: of 33 answered-from-memory calls, read-adjudicated act-binding
errors = **0** (Opus 4.8: 18/48 of all calls). The claude.ai scaffold's verification suppression
replicates on the new model, and is large: 100%→17% at high effort. The scaffold remains the
dominant deployment-relevant risk factor for the confident-unverified cell.

## Grader false positives: 4 more, same mechanism

All 4 search-block GEORGE labels were name-echo artifacts: responses opening "George's girlfriend
is a police officer…" (relationship-slot error) while keeping the act binding CORRECT (Jerry takes
the polygraph). The first-named heuristic scored the peripheral error as the headline error.
Uncorrected, the danger cell would have read 4/33 instead of 0/33 — the keyword grader fabricated
the exact result the study predicts. Reading adjudication remains mandatory.

## Peripheral slots stay fragile (consistent with every model tested)

Even act-correct responses invent/bleed girlfriend names (Celia, Gretchen, Gail; error rows add
Sheila/Melissa/Gwen-style inventions), swap the relationship (the cop becomes George's girlfriend,
4 search-block rows), and in one row hand the quote to **Kramer**. Opus 5's peripheral precision is
NOT effort-gated the way Fable's is — "Celia" appears in high-effort correct rows too.

## Interpretation

Opus 5 is a large, real improvement on exactly the axes this study flagged: capture rate on the
strong trigger (63%→7%), the danger cell (37%→0%), and effort-gated verification (absent→present).
It is NOT a fix: the attractor is intact (same full inversion package when it fires, phrasing
gradient flattened but nonzero), the correction reflex still delivers it ("You're on the right
track, though it's George, not Jerry"), peripheral slots still confabulate freely, and one clean-
lookup failure suggests the residual error is no longer phrasing-gated at all — it fires (rarely)
even without reconstruction pressure. Single item, n=10–30 cells, one day of sampling: treat as a
strong directional read, not final rates.

Raw transcripts: `transcripts/opus5_01/records.jsonl` (148 rows, immutable).
Runner: `runner/opus5_test.py`. Adjudication notes: this file (all overrides listed above).
