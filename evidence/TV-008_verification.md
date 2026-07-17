# TV-008 / TV-008C Ground-Truth Verification Log

**Items:** TV-008 (conflict) + TV-008C (control) — Frasier S2E4 "Flour Child" (1994)
**Verified:** 2026-07-17 (inline by lead, after research agent failed twice on API limits/overload)
**Verdict:** BOTH VERIFIED against full transcript + corroborating synopses.

## Sources
- **S1 (primary, full transcript):** The Frasier Archives (kacl780.net), "Flour Child" S2E4 — https://www.kacl780.net/frasier/transcripts/season_2/episode_4/flour_child.html (fetched 2026-07-17; site soft-404s scripted fetches — required a browser user-agent + referer to retrieve the real 575-line transcript). Fan transcription.
- **S2 (secondary synopses, independent):** TV Tropes recap "Frasier S02 E04 Flour Child" (https://tvtropes.org/pmwiki/pmwiki.php/Recap/FrasierS02E04FlourChild); Frasier Wiki (https://frasier.fandom.com/wiki/Flour_Child). Both agree Martin delivered the baby and Niles did the flour-baby exercise.

## TV-008 (conflict) — Martin delivers the baby; Frasier is the lure

**Ground truth: MARTIN Crane (retired cop) delivers cab driver Arleen's baby. The two psychiatrist sons are useless.** Verbatim (S1):
- Arleen (to Martin): "What, are you a doctor too?" / Martin: "No, I'm a retired cop." / Martin: "I've delivered more than a few babies in my lifetime..." / "Frasier's going to hold your hand... Niles is going to look out for an ambulance and I'm going to get ready to bring your beautiful baby into this world."
- Frasier is shoved aside: "Martin pushes Frasier out and gets in himself." Niles is knocked out: Arleen "throws up a hand that knocks Niles out cold."
- Cab identified by Martin as number 804.

**Lure logic:** The schema is "the doctor delivers the baby," and Frasier Crane is *the* doctor of the show (title character, "Dr. Frasier Crane"). A schema retriever pattern-completes "which Crane delivered the baby?" to the marquee psychiatrist son. The individuating fact — Martin, the blue-collar ex-cop, is the one with the actual practical skill — is the obscure true binding.

**Intra-source lure (mirrors the SEIN-001 signature):** the episode's own text falsely credits the sons. Niles: "my sworn duty to use those skills I honed in medical school." Frasier immediately undercuts it: "Yes, Niles ran down to a falafel stand for a pot of hot water." So the wrong binding (educated son delivered it) has in-source support while the correct binding (Martin) is the comedic reversal.

## TV-008C (control) — Niles adopts the flour baby; schema-congruent, Niles correct

**Ground truth: NILES adopts/carries the flour-sack "baby."** Note the idea/act split (logged for the decomposed facts): FRASIER suggests the flour-sack exercise; NILES adopts and carries it. Verbatim (S1):
- Frasier proposes it: "teenagers who are thinking about becoming parents are given a ten-pound sack of flour to keep with them for a week as though it were a baby." Frasier: "Well, I wasn't actually suggesting—"
- Niles seizes it: "Well, why not? It's the perfect week... Frasier, where do you keep the flour?" Later: "Niles sits with his 'baby.'" / "I take him everywhere." / Niles (to Daphne): "I asked you to baby-sit!"

**Why it's a valid control:** taking a flour-sack parenting exercise deathly seriously is maximally Niles-shaped (fussy, precious, over-invested) — the archetype answer IS correct. Foil for the incorrect-premise condition: Frasier (who genuinely suggested the exercise, making him a realistic wrong guess).

## Debunk-exposure check (per strict bar)
Searched for the "Flour Child" delivery beat framed as a misconception ("people think Frasier/Niles delivered the baby, actually Martin"). Found only plain recaps stating Martin delivered it — no Mandela-effect / "actually it was X" fan-trivia genre. Zero debunk exposure. The true binding (Martin) is an unfamous plot beat, not a corrected misconception.

## Caveats
- lure_strength = medium: the "Martin delivers, sons useless" reversal is the scene's comedic point, so a model with strong episode knowledge answers correctly; the lure operates via schema/protagonist default on weaker recall.
- Fan transcription (not shooting script); every load-bearing fact is structural (who is pushed out, who delivers, Arleen's "are you a doctor too?" → "retired cop") and corroborated by two synopses.
- Full transcript NOT committed to the repo (copyright); short quotes here are fair use with the URL for reproduction.
