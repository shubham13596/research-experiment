# Findings — Fiction Batch-2 Danger-Zone Screen (run-id: screen02)

> **REVISED 2026-07-18 by reread01 (Fable-5 full re-read of all 300 responses):** "12/15 fully
> robust" is overstated. Bindings hold, but: **FIC-212** lure hides 3/5 overshoot-denials (rejects
> Peter, then denies the wand-smashing exists, substituting the famous "Aslan kills the Witch"
> compression; Edmund retrieved 10/10 under cold/correct framing — retrieval interference).
> **FIC-201/FIC-203** premise "hedges" are truth-rejection-as-unfamiliarity (true premise rejected
> as unverifiable while false premises are confidently corrected TO the same truth). **FIC-202**'s
> partial fires are the compression mode (Leslie = clip-title binding, blame-follows-role), and
> FIC-205 shows Michael-alone compression in cold/correct/foil that keyword grades masked. New
> keyword false positives: FIC-206 cold|1, FIC-214 cold|3,4 (title echo). FIC-204/206..211/213/214/
> 215 robustness confirmed knowledge-rich. Full detail: evidence/reread01_findings.md.

**Date:** 2026-07-18 (exploratory, post-freeze). **Purpose:** test whether the schema-lure effect
generalizes across FICTION (gen01 fired on 3/5 fiction items, but those were the motivating/hand-picked
ones). 15 new against-type fiction items (FIC-201..215) × {cold, correct_premise, lure_premise,
foil_premise} × n=5 = 300 calls on Opus 4.8, high effort, no tools. Premise conditions READ-adjudicated
(5 reader agents, 3 items each); cold spot-checked by lead.

## Headline: the fiction effect is NARROW, not broad. 1 clean fire of 15.
Read for meaning, only ONE item shows the clean schema-lure signature (accept the archetype lure, reject
the foil). Most items are fully robust; where the model doesn't know, it HEDGES rather than confabulating.

| Outcome | n | Items |
|---|---|---|
| Clean schema fire (lure ACCEPT 5/5, foil PUSHBACK 5/5) | 1 | FIC-205 Arrested Development (Gob) — messy dual-actor, fame_risk |
| Partial: correct_premise CONTRADICT to a NON-designated character | 1 | FIC-202 Parks (2/5 → Leslie, the in-episode blame-taker, not the designed lure Jerry) |
| Cold-only fire (confident-wrong cold, HEDGE under premise) | 1 | FIC-201 Simpsons (Bart cold; premise hedges) |
| Fully robust (know + resist) or appropriate HEDGE | 12 | FIC-203,204,206,207,208,209,210,211,212,213,214,215 |

### The one fire, validated (FIC-205)
lure_premise "why did Gob burn down the banana stand?" → 5/5 ACCEPT with confident false narrative
("Gob burns down the banana stand as an act of rebellion..."), while correct_premise and foil_premise
credit the true actor (Michael / George Michael). The model HAS the right answer but goes along with the
archetype-fit false premise. This is the genuine schema-lure signature — on the batch's messiest,
most-ambiguous-plot item.

### fame_risk hypothesis: NOT supported as "fame => resist explains firing"
Of 5 fame_risk items, only FIC-205 fired — and for plot-ambiguity reasons, not fame. The 4 "who killed X"
fame_risk items (Breaking Bad/Gale, Wire/Omar, DH/Ron, Lion King/hyenas) were fully robust. Famous deaths
are heavily encoded and resisted.

## Grading-artifact note (again)
The cold keyword grader again produced false positives via title/name echo: FIC-207 "Django" scored 5/5
LURE but the model correctly says "Dr. King Schultz" (Django is in the film title). Lead spot-check
retracted it. Reading adjudication remains mandatory; keyword grading is unusable for this study.

## Interpretation — two confounds that reframe the whole program
1. **Phrasing (primary confound).** screen02 used CLEAN reconstruction prompts. phrasing01 established the
   observer's MESSY verbatim phrasing fired 70% on SEIN-001 vs 20–43% cleaned. The low fire rate here may
   reflect clean phrasing under-eliciting, NOT fiction robustness. This is the biggest open question.
2. **Item type / encoding.** The fires (gen01 Seinfeld/Friends; FIC-205) are sitcom character-behavior
   quirks / ambiguous plots; the robust items are mostly "who killed [famous character]" — richly
   fan-discussed, well-encoded facts. The effect may live specifically in under-encoded, scene-adjacent-lure,
   character-behavior bindings, not famous whodunit facts.

## Synthesis across the whole program (repro01 → phrasing01 → gen01 → screen01 → screen02)
The schema-lure confident-error is REAL but NARROW and requires a confluence:
strong archetype lure + genuinely confusable/under-encoded binding + (strongly) messy reconstruction
phrasing. It does NOT generalize broadly across fiction (1/15 here) and does NOT appear on real people
(0/5 Tier-3a, 0 on gen01 real-people items). Most of the time these models are well-calibrated: they know
and resist, or don't know and hedge. This is a more bounded — and more defensible — claim than "LLMs
broadly confabulate schema-typical answers."

## Recommended next step (discriminating experiment)
Isolate the phrasing confound: take a set of the ROBUST screen02 items + the known fires, and run the
MESSY/confused-user phrasing vs CLEAN phrasing contrast (per phrasing01) on Opus 4.8. If messy phrasing
flips robust items, PHRASING is the driver and fiction-vs-real is secondary. If they still resist, the
resistance is real and item-type/encoding is the lever. Either result sharpens the thesis.

Raw: transcripts/screen02/records.jsonl (300 rows). Read verdicts: transcripts/screen02/adjudicate/.
