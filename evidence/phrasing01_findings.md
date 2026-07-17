# Findings — Real-Phrasing Test (run-id: phrasing01)

**Date:** 2026-07-17 (exploratory, post-freeze). Item: SEIN-001. n=15 per model×phrasing×scaffolding×effort.
**Stimulus:** the observer's verbatim phrasing ("The Melrose palace reference in Seinfeld. Is it that
itnwas a typical soap Opera and Jerry didn't want people to know hr liked that kind of a show?"),
a typo-cleaned variant, bare API vs the real published claude.ai system prompt.
**Grading:** first-named-character heuristic; all GEORGE rows spot-verified as genuine misattributions
(model leads with George and/or contradicts the user's stated Jerry premise), not negation artifacts.

## Cell results (n=30 each)
| Model | Phrasing | Scaffolding | George rate |
|---|---|---|---|
| Opus 4.8 | verbatim | bare API | **21/30 (70%)** |
| Opus 4.8 | verbatim | claude.ai prompt | 13/30 (43%) |
| Opus 4.8 | cleaned | claude.ai prompt | 6/30 (20%) |
| Fable 5 | verbatim | claude.ai prompt | 0/30 (0%) |

Baseline for contrast (surface01, clean lab prompt): Opus 4.8 bare = 0/40 (0%).

## Contrasts
- **Phrasing is the dominant driver.** Clean lab prompt 0% → observer's verbatim phrasing 70% (both bare API). The effect was engineered *out* by tidy prompt construction.
- **Scaffolding is PROTECTIVE, not causative.** Holding phrasing=verbatim: bare 70% → claude.ai prompt 43% (−27pp). The claude.ai prompt's accuracy/epistemics instructions suppress the error. (This corrects an earlier interim claim that scaffolding was the trigger.)
- **Verbatim wording > cleaned.** Holding scaffolding=claude.ai: verbatim 43% vs cleaned 20% (+23pp). The typos/"Melrose palace"/confused framing add a large push — plausibly by reading as a confused user the model is licensed to "correct," confounded with the reconstruction effect.
- **Fable 5 is fully robust.** 0/30 on the strongest phrasing+scaffolding cell. Same-family negative control: this is an Opus-4.8-specific behavior the newest model does not share.

## Effort (H3-relevant)
| Cell | low | high |
|---|---|---|
| verbatim / bare | 11/15 (73%) | 10/15 (67%) |
| verbatim / claude.ai | 6/15 (40%) | 7/15 (47%) |
| cleaned / claude.ai | 5/15 (33%) | 1/15 (7%) |

More test-time reasoning does NOT rescue the strong trigger (verbatim/bare ≈ flat, 73%→67%; verbatim/claude.ai if anything slightly worse). It only helps when the trigger is already mild (cleaned/claude.ai 33%→7%). Consistent with the prereg's H3 and the cited inverse-scaling work: reasoning fixes schema-lure only when the pull is weak.

## Mechanism reading
Direct lookup questions ("which character takes the polygraph?") retrieve correctly. Reconstruction-inviting questions ("was it that Jerry didn't want people to know he liked it?") require rebuilding the scene, and the model rebuilds around the representative character (George the liar), overriding both ground truth and the user's explicitly-stated correct premise (wrongful contradiction). This is the study's core mechanism, elicited as a phrasing manipulation.

## Design implications (feed into a pre-data protocol revision)
1. The clean cold prompts systematically UNDER-elicit the phenomenon; the instrument needs naturalistic, reconstruction-inviting, premise-carrying phrasings.
2. The correct-premise / wrongful-contradiction condition should be primary, not secondary.
3. Scaffolding (system prompt) becomes a first-class IV (protective direction), not a confound to eliminate.
4. Confound to disentangle in item design: "naturalistic reconstruction framing" vs "confused-user-invites-correction" (the verbatim vs cleaned gap).
5. Effort/thinking should be crossed with phrasing strength (H3 interacts with trigger strength).

Raw transcripts: `transcripts/phrasing01/records.jsonl` (120 rows, immutable).
