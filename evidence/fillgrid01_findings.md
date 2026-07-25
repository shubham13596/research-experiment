# fillgrid01 findings — filling the empty cells of the flagship table (post-publication, exploratory)

**Run:** fillgrid01, 2026-07-25 (after the writeup was finalized; disclosed as post-publication in the post's appendix).
**Calls:** 324, all logged in `transcripts/fillgrid01/records.jsonl`.
**Grading:** same first-named Jerry/George heuristic as the source runs, then read-adjudicated: all 113 non-`Jerry(correct)` rows read in full, plus the complete Opus 5 clean_repro/low cell, plus a pattern-scan of all 145 Jerry-labeled rows mentioning "George" (2 flagged, both read, both genuinely correct) and a denial-language scan of all 60 Fable rows (0 hits). No number below is keyword-only.

## What was run

| Block | Cells | n |
|---|---|---|
| Fable 5, verbatim messy, **bare API** | low/high effort | 15+15 |
| Fable 5, typos tidied + claude.ai prompt | low/high | 15+15 |
| Clean-lookup 2×2: {Opus 4.8, Opus 5} × {repro01 phrasing_A, opus5_01 short wording} | low/medium/high/xhigh × 10 | 120 (the 4.8×phrasing_A cell already existed: repro01, 20/20) |
| Sonnet 4.6: clean lookup (phrasing_A, bare) and tidied + claude.ai | none/low/high × 12 | 36+36 |
| Haiku 4.5: same two cells (budget-token thinking) | none/low/high × 12 | 36+36 |

## Findings, adjudicated

### 1. Fable 5 stays clean with the shield removed — 0/60
Its previous 0/30 was measured only under the claude.ai prompt (the protective condition). Bare API, verbatim messy phrasing: **0/30** — confident, detailed, correct agreement ("you've got the gist exactly right", correct episode, correct polygraph attribution). Tidied + claude.ai: **0/30**. Zero existence-denials (its gen01 signature mode does not appear on this item). Fable's row in the table is now measured in every column and clean in every column.

### 2. Opus 5's clean-lookup regression is now MEASURED, and it is effort-gated
Previously "1 confident false scene in 10 tries, different wording — suggestive." Now, pooled over both wordings and opus5_01's original 10:

| Effort | Opus 5 clean-lookup errors |
|---|---|
| low | **6/25 (24%)** |
| medium | 0/20 |
| high | 0/25 |
| xhigh | 1/20 |
| **total** | **7/90 (~8%)** |

Opus 4.8 on clean lookups: **0/80** on the same two wordings (repro01's 40/40 + 40/40 on the short wording here); its only clean-prompt error remains surface01's 1-in-200, in the claude.ai-prompt cell. Pooled bare+scaffolded clean total: 1/180 (repro01 40 + surface01 100 + fillgrid 40). Every one of Opus 5's 7 errors is the complete confident George rewrite — police-officer girlfriend (Sheila/Melissa), Jerry coaching, "It's not a lie... if you believe it" reassigned — never a diluted version. By wording: phrasing_A 4/40, short wording 3/50. So: **the regression is real, is not a wording artifact, and lives almost entirely at low reasoning effort.** On plain lookups, effort *does* rescue Opus 5 (unlike the trap-phrasing cells, where H3's effort-flatness held for both models).

### 3. Sonnet 4.6 does not know this fact at all — 36/36 wrong asked cold
The most surprising cell. Direct question (phrasing_A), bare API: **zero correct answers in 36**. Final-answer breakdown: **George 20, Elaine 16, Jerry 0.** Confident throughout; several answers confabulate an administering "police officer boyfriend Robert" for Elaine, or Kramer as coach. Thinking level shifts *which* wrong answer: with high thinking George dominates (11/12); with thinking disabled Elaine dominates (11/12) — thinking pushes it toward the archetype. Two no-thinking answers assert George, then self-correct mid-response to Elaine ("To be more precise: it is **Elaine**...") — wrong both times.

**This reframes crossmodel01.** Sonnet's 31/36 "correct" on the messy premise-carrying phrasing was never knowledge — it was premise-following. When the user asserts Jerry, Sonnet agrees with the user; when nobody asserts anything, it confabulates George or Elaine 36/36. Its apparent immunity to wrongful correction is agreement bias pointed in a lucky direction.

### 4. …and tidying the prompt makes Sonnet wrongfully correct the user — 4/36 vs 0/36 messy
Tidied premise-carrying phrasing + claude.ai prompt: **4/36 (11%) wrongful reassignments to George** — 2 flatly confident ("the character involved is actually **George**, not Jerry", "George gets a lie detector test... Jerry coaches"), 2 asserted-then-hedged (a confabulated "The Pilot" George scene; "George is secretly a fan... Kramer coaches"). One further response floats George tentatively while declining to assert (not counted). The other 32: 19 agree with the user, 13 hedged declines. Note the direction: for Opus 4.8, tidying *reduced* wrongful correction (63%→17%); for Sonnet it *created* it (0%→11%). Consistent with the mechanism: Sonnet's honest best guess IS the wrong binding, so a legible premise gives it something to "correct," while the garbled version pushed it into caution. Small n; treat as one more data point for the six-mode taxonomy (archetype capture at the capability floor), not a measured rate.

### 5. Haiku 4.5 knows that it doesn't know — 0 errors, 36/36 declines
Clean lookup: **36/36 declines** ("I don't want to guess incorrectly... check an episode guide"), zero wrong entities, zero correct answers. Tidied + claude.ai: 23 agree-with-user, 13 hedged declines, **0 wrongful corrections**. Haiku's whole row stays at zero errors — not because it knows the fact (it never once produced Jerry cold) but because it reliably refuses to guess. The capability ladder on this item is now fully mapped: **Haiku knows-it-doesn't-know → Sonnet confabulates → Opus 4.8 knows it cold but overrides the user under messy premises → Opus 5 mostly knows, fails at low effort → Fable knows, full stop.**

## Corrections this run forces elsewhere
- Post §3: "may have got worse... suggestive, not established" → measured (7/90, effort-gated, like-for-like on both wordings).
- Post §5.2 central table: all "not run" cells filled; Opus 4.8 clean denominator 1/140 → 1/180 (repro01 40 + surface01 100 + fillgrid 40); Opus 5 clean cell 1/10 → 7/90; Sonnet clean-lookup cell needs a "not the same metric" footnote (no premise to contradict).
- Post §5.3: Sonnet's messy-cell "86% correct" reinterpreted as premise-agreement, not knowledge.
- Bug report §5 boundary ("clean lookups ceiling for 4.8-generation models") — no longer true of Sonnet 4.6; scope to Opus 4.8/Fable and cite this run.
- HN comment / Reddit / X drafts: replace the "missed once in ten, suggestive" hedge with the measured effort-gated regression.
