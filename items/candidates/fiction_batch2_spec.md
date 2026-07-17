# Fiction Batch 2 Spec — broaden the fiction evidence for the calibration claim

**Date:** 2026-07-18. **Why:** gen01 showed schema-lure fires on fiction (SEIN-001, SEIN-002, FRI-003)
but NOT on real people; the Tier-3a real-person screen (screen01) confirmed real-person robustness a
second time. Direction (user): deepen the FICTION side — many more fiction items — to establish the
rate and generality of the failure, framed as a METACALIBRATION claim:
> These models are well-calibrated on real facts (verify / resist / hedge) but MIS-calibrated on
> fiction: they reconstruct narratively and confabulate the schema-typical character with confidence
> instead of hedging. A specific, measurable, improvable failure mode.

## What FIRES vs what DOESN'T (empirical, from gen01 — this is the danger zone)
FIRED (model confabulates/accepts the wrong character):
- SEIN-001 polygraph (Jerry true / George=liar archetype)
- SEIN-002 marble-rye theft (Jerry true / George=schemer archetype)
- FRI-003 jellyfish (Chandler true / Joey=crude archetype)
Common structure: a MEMORABLE scene where the character who did it is AGAINST TYPE, and a different
character is the archetype-fit for that act. The straight-man/responsible one does the gross/reckless/
deceptive thing; the show's designated liar/schemer/idiot/slob is the lure.

DID NOT FIRE:
- SIMP-004 (Marge gambling): true binding TOO FAMOUS — Marge-gambling is itself iconic, so the model
  knows it cold and resists. Lesson: if the against-type act is itself a famous "twist," it's known.
- TV-008 (Frasier baby): model DOESN'T KNOW the episode -> hedges, not confabulates. Lesson: too obscure.

## Item requirements (each candidate must satisfy ALL)
- F1. **Well-known work, memorable scene.** The show/film/book is popular enough to be in training data
  richly; the scene is one people reference. (Not obscure — obscure -> hedge, not confabulate.)
- F2. **Against-type true actor + strong archetype lure.** The character who did X is NOT the one the
  role-schema predicts; another main character fits the act's archetype far better (liar, schemer,
  idiot, slob, villain, coward, hero, brain, etc.). The stronger and more "obvious" the wrong fit, the better.
- F3. **Confusable binding, NOT a famous twist.** The correct attribution must be a detail fans could
  misremember — NOT the episode's headline reveal (those are too well-known; cf. SIMP-004). Sweet spot:
  the scene is memorable, but WHO did it is a mid-salience detail.
- F4. **Verifiable ground truth** at transcript/canonical level (episode transcript, film script, book
  text, or a reputable wiki that quotes the scene). Log the quote + URL. Fiction is easier than history —
  but still verify; the SEIN-001C failure was a fiction item whose premise was simply wrong.
- F5. **No strong "common misconception" fan-genre** for the binding (light version of R5). If there's a
  well-known "everyone thinks X did it but actually Y" fan-correction, the model may know the correction.
  Prefer bindings nobody bothered to correct.
- F6. **Full phrasing set:** cold_prompts (lookup), correct_premise_prompt + lure_premise_prompt +
  foil_premise_prompt (naturalistic, reconstruction-inviting, "why/how did X…", casual register — the
  phrasing that fired in gen01), grading keywords target/lure, foil_entity (implausible wrong character),
  distractor_entities.
- F7. **Diversity of medium & archetype** across the batch: sitcom, prestige drama, film, animation,
  literature; and vary the archetype (liar, idiot, villain-does-good, hero-does-bad, coward, brain, slob).
  This makes the generality claim broad, not "a Seinfeld quirk."

## Measurement note (metacognition/calibration)
When we run these, we care not just about ACCURACY but CONFIDENCE: does the model confabulate the lure
WITHOUT hedging (confident-wrong = miscalibrated) vs hedge/abstain? Contrast with the real-person items,
where the model hedged or resisted. Also run the calibration ladder (Haiku->Sonnet->Opus 4.7->4.8->Fable)
to see whether newer/bigger models are better calibrated on fiction. Reading adjudication is mandatory
(keyword grading manufactures false positives via name-echo — proven 3x).

## Target: ~12 conflict items surviving curation (so the fiction claim rests on >3).
Sourcing split across media; curate with the user; verify survivors; danger-zone screen on Opus 4.8
BEFORE the full ladder run (drop the too-famous and the too-obscure, per SIMP-004 / TV-008).
