# Tier 3a Item Spec — Real-Person Role Inversion, SAFER END (deceased/historical)

**Date:** 2026-07-18. **Decision (user):** start real-person Hood-shape items at the safer end —
deceased figures, resolved cases, public-record ground truth — before any living-person items.

## True north (restated)
The study exists to show that schema-lure retrieval failures on people are the same mechanism as
stereotyping, and to tell users how to prompt so it doesn't bite them. gen01 showed the effect is real
on fiction but did NOT fire on our real-person items — because those items sat outside the danger zone
(true bindings too famous). This spec targets the zone deliberately.

## The failure recipe (empirical, from repro01/phrasing01/gen01/search01)
The error fires when ALL hold:
1. **Reconstruction phrasing** — premise-carrying, "why/how did X…", casual register (not direct lookup).
2. **Strong role archetype** pulling toward the WRONG person (villain-looking, famous-name-absorbs-credit,
   "obvious" suspect).
3. **Partial model knowledge** — the danger zone. Famous true binding → model resists (SIMP-004, HIST-103/104).
   No knowledge → model hedges (TV-008). The failure needs enough knowledge for a FLUENT reconstruction,
   not enough to pin the binding.
4. **No verification** — answering from parametric memory (all our runs are tools-off; search01 shows
   Opus doesn't reach for the tool anyway).

## Item requirements (each candidate must satisfy ALL)
- **R1. Deceased:** every named individual deceased (both true actor and lure actor). Prefer events
  pre-1990. Resolved cases only (verdict/official finding/settled historical record — no live disputes).
- **R2. Public-record ground truth:** verifiable against primary/authoritative sources (court records,
  official inquiry reports, Nobel/academy archives, contemporaneous journalism of record). Same
  verification bar as SEIN-001 (transcript-level: quote the primary source in the evidence log).
- **R3. Role inversion or credit inversion with a schema lure:** two real people whose roles invert the
  archetype — e.g., the investigator/whistleblower who reads like a perpetrator; the famous name that
  absorbs an obscure person's deed (Matthew effect); the "obvious culprit" who was actually exonerated
  while the unlikely figure was guilty. The LURE actor must fit the archetype BETTER than the true actor.
- **R4. Mid-obscurity (danger-zone placement):** covered enough to be in training data (multiple books /
  major-paper coverage), NOT so famous the binding is textbook-pinned. Heuristic: a curious layperson has
  heard of the EVENT but could not name who did what.
- **R5. NOT debunk-exposed (hard rule, per v0.2.2 rejections):** if a "common misconception / actually it
  was X" genre exists for the binding (Mandela-effect listicles, viral corrections — e.g., Rosalind
  Franklin, Lise Meitner, Bell Burnell, Edison-vs-everyone), REJECT. Debunk exposure trains the model on
  the correction and kills the lure. This disqualifies most famous credit disputes; the good items are the
  ones nobody has bothered to debunk.
- **R6. Co-occurrence asymmetry:** the lure actor should plausibly co-occur with the event more than the
  true actor in web text (note evidence: e.g., the lure fronts the Wikipedia lede/headlines).
- **R7. Full phrasing set:** cold_prompts (lookup), correct_premise_prompt and lure_premise_prompt in the
  naturalistic reconstruction register (casual, premise-embedded, why/how question), foil entity for the
  control condition (implausible wrong person), grading keywords for target/lure/known distractors.
- **R8. Paired control:** same event/source, schema-CONGRUENT binding of comparable obscurity (archetype
  answer IS correct), with its own foil.

## Post-curation danger-zone screen (declared here for honesty)
After verification, run a cheap cold + premise probe per item and keep items with INTERMEDIATE cold
accuracy (not ceiling, not all-hedge). This screening selects items for elicitation power and will be
DISCLOSED: per-item elicitation rates on screened items are descriptive; the confirmatory contrasts remain
(a) conflict vs control, (b) lure-premise vs foil-premise, (c) correct-premise wrongful-contradiction vs
control, which are valid within the screened set.

## Ethics gate (applies even at the safer end)
No items whose lure premise would smear a person whose descendants/estate are actively litigating or where
the "lure" claim overlaps a live controversy. The lure must be OUR construction for measurement, not an
amplification of an existing smear campaign. Report aggregate rates; findings reports should not be
quotable as "AI says [person] did [bad thing]" without the surrounding correction.

## Domains to hunt (research directions)
- **A. Scientific/inventive credit (Matthew-effect, non-debunked):** obscure actual discoverer vs famous
  credited figure — deliberately AVOIDING the famous debunked cases (R5). Assistants/juniors who ran the
  decisive experiment; co-authors erased by fame gradients; priority disputes settled quietly in archives.
- **B. Historical scandal/legal role inversion (all parties deceased):** investigator vs perpetrator in
  pre-1990 corruption/fraud cases (Teapot Dome-era and similar); the acquitted "obvious suspect" vs the
  convicted unlikely one; prosecutor/defendant confusions in famous-trial ecosystems.
- **C. Disaster/military/exploration attribution:** who warned vs who ignored the warning; who ordered vs
  who opposed the order; rescuer vs the one who failed to act (e.g., sea disasters with two captains);
  expedition credit (who actually reached/found X).
