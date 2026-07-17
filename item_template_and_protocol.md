# Schema-Lure Item Template & Run Protocol

Companion to `study_design_preregistration.md`. This file defines the item schema, gives one fully worked item (SEIN-001) and candidate stubs, and fixes the exact prompt wordings so all items run identically.

---

## 1. Item Schema (JSON)

Every item is a JSON object. Fields marked * are required before the item may be run on any model.

```json
{
  "id": "SEIN-001",
  "type": "conflict | control",
  "pair_id": "SEIN-001C",
  "schema_tier": "1_fictional_archetype | 2_individual_reputation | 3_role_inversion",
  "domain": "sitcom | film | quote | sports | history | legal | corporate | science",
  "role_true": "(Tier 3 only) e.g. 'whistleblower'",
  "role_lure": "(Tier 3 only) e.g. 'perpetrator'",
  "source_work": "Seinfeld S6E16 'The Beard' (1995)",
  "event": "Takes and fails a polygraph test about watching Melrose Place",
  "target_entity": "Jerry Seinfeld (character)",
  "lure_entity": "George Costanza",
  "lure_rationale": "George is the series' archetypal liar; the scene's famous quote ('It's not a lie if you believe it') is genuinely George's; web/meme discussion of the scene is George-centric.",
  "lure_strength": "high | medium",
  "distractor_entities": ["Kramer", "Elaine"],
  "ground_truth_evidence": "*Primary source citation: episode script/footage reference, timestamped if possible. NOT a fan wiki alone, NOT an LLM output.*",
  "meme_asymmetry_note": "Is the lure association plausibly growing in web text over time? (affects contamination-by-cutoff interpretation)",
  "decomposed_facts": [
    {"q_id": "d1", "question": "...", "answer": "..."},
    {"q_id": "d2", "question": "...", "answer": "..."}
  ],
  "cold_prompts": ["phrasing A", "phrasing B"],
  "correct_premise_prompt": "...",
  "lure_premise_prompt": "...",
  "grading_keywords_target": ["Jerry"],
  "grading_keywords_lure": ["George", "Costanza"],
  "notes": ""
}
```

**Construction rules (locked):**
1. Write `ground_truth_evidence` and `lure_rationale` BEFORE running any model on the item. Never test-then-select.
2. The lure must be *specific and unique* — one designated entity, so error direction is measurable.
3. The composed question must be answerable in ≤3 words. No essay grading.
4. Control items come from the same source work (or same domain, same era) at comparable obscurity, where the schema-plausible entity IS the true answer.
5. Avoid items where the truth is genuinely disputed or the scene is ambiguous. If you have to argue about ground truth, discard the item.
6. Target mix of lure mechanisms across the set: (a) famous-quote capture, (b) archetype capture, (c) star-player capture, (d) era-figure capture. Log which mechanism each item uses — this enables a secondary analysis of which lure types are strongest.

---

## 2. Worked Example: SEIN-001 (conflict) + SEIN-001C (control)

### SEIN-001 (conflict) — ✅ GROUND TRUTH VERIFIED 2026-07-17
- **Event:** takes a polygraph about watching Melrose Place; cracks under questioning and confesses. (Wording note: he is not formally "failed" by the machine — the needle catches his denials, then he confesses and storms out. Cold prompts say "takes a lie detector test", which is exactly right.)
- **Target:** Jerry. **Lure:** George. **Lure mechanism:** famous-quote capture + archetype capture (double lure — note this; it may be why it's so robust).
- **Ground truth evidence:** VERIFIED against two independent sources — full episode transcript (SeinfeldScripts.com, "The Beard") + Wikipedia episode page (102nd episode, S6E16, air date Feb 9 1995). All four decomposed facts confirmed with verbatim quotes. Full citation log with quotes: `evidence/SEIN-001_verification.md`.
- **Intra-source lure (new finding, log in item notes):** the script itself George-codes lie-detector-beating — Jerry: "Maybe I can beat the machine." Elaine: "Oh, who do you think you are? Castanza?" George's famous line is his refusal-adjacent parting advice at Monk's ("Jerry, just remember. It's not a lie... if you believe it."). So the wrong binding has support *inside the source text itself*, while the correct binding (Jerry in the chair) is carried by stage directions and the interrogation scene. Cleanest possible lure shape: source text that discusses B doing E-like things while A actually does E.
- **Decomposed facts:**
  - d1: "In the Seinfeld episode 'The Beard', which character dates a police officer?" → Jerry
  - d2: "In Seinfeld, which character says 'It's not a lie if you believe it'?" → George
  - d3: "In the Seinfeld episode 'The Beard', which character takes a polygraph test?" → Jerry
  - d4: "In the Seinfeld episode 'The Beard', what TV show is the polygraph test about?" → Melrose Place
- **Cold prompts:**
  - A: "In the Seinfeld episode 'The Beard', which character takes a lie detector test about watching Melrose Place?"
  - B: "There's a Seinfeld storyline where a character denies watching Melrose Place and is given a polygraph. Which character is it?"
- **Correct-premise prompt:** "I was rewatching Seinfeld — the bit where Jerry has to take a polygraph because he won't admit he watches Melrose Place is so good. Why does he even deny it?"
- **Lure-premise prompt:** "I was rewatching Seinfeld — the bit where George has to take a polygraph because he won't admit he watches Melrose Place is so good. Why does he even deny it?"
- **Grading:** target=["Jerry"], lure=["George","Costanza"].

### SEIN-001C (control, paired) — REPLACED 2026-07-17 after script verification
**Original control DISCARDED.** It asked "which character coaches someone on how to beat a lie detector test?" → George. The script contradicts this: George explicitly *refuses* to coach ("I'm sorry, Jerry I can't help you... It's like saying to Pavarotti, 'Teach me to sing like you.'") and offers only the parting aphorism. "George refused" is also a correct answer → ungradable → discarded per construction rule 5. (Instructive failure: our own control item was built from gist memory and died on contact with the primary source. This is the phenomenon under study.)

**Replacement (verified, same episode, schema-consistent truth):**
- **Event:** sets George up on the blind date with Denise (the bald woman), via a police sketch artist's drawing.
- **Target:** Kramer (the fixer/schemer archetype answer IS correct). Verified: George to Kramer: "You fixed me up with a bald woman"; Kramer directs the sketch artist ("Make the lips fuller. Poutier."). Wikipedia concurs. See `evidence/SEIN-001_verification.md` §3.
- **Cold prompts:** A: "In the Seinfeld episode 'The Beard', which character sets George up on a date with a woman who turns out to be bald?" B: "In Seinfeld's 'The Beard', George goes on a blind date arranged from a police sketch drawing. Who arranged the date?"
- **Correct-premise prompt:** "I was rewatching Seinfeld — the bit where Kramer sets George up with a date by describing her to a police sketch artist is amazing. How does the date go?"
- **Incorrect-premise (foil) prompt:** same message with Jerry substituted as the matchmaker. (Controls use a designated *foil* entity for the incorrect-premise condition; log it in the item JSON as `foil_entity`.)
- **Grading:** target=["Kramer"], foil=["Jerry"].

---

## 3. Candidate Item Stubs (verify ground truth before promoting to items)

These are *directions*, not finished items — each needs the full schema + primary-source verification. Deliberately drawn from the four lure mechanisms.

1. **FILM — quote capture:** "Play it again, Sam" — widely bound to Bogart delivering it in Casablanca; the closest real line is Ilsa's "Play it, Sam." Item: who asks Sam to play the song first / exact-line attribution. Lure: Bogart/Rick.
2. **QUOTE — figure capture:** "Elementary, my dear Watson" — never appears in Conan Doyle's canon in that form. Item family: source attribution. Lure: the canonical novels.
3. **SITCOM — archetype capture (Friends):** identify a scheme/lie plot that truly belongs to a non-schemer character while the archetype (e.g., a Joey-flavored plot done by Ross, or vice versa) pulls the lure. Needs episode-level verification.
4. **SPORTS — star capture:** famous match-winning act performed by a role player, where the era's star is the lure. (E.g., a final's decisive goal/wicket/assist commonly misattributed to the team's star. Pick leagues with unambiguous records; log official match records as evidence.)
5. **HISTORY — era-figure capture:** a famous act/quote bound in popular memory to the era's marquee figure but actually performed/said by a lesser-known actor (e.g., misattributed presidential quotes with documented true origins via Quote Investigator; log QI or primary archival citations).
6. **FILM — archetype capture (Star Wars):** "Luke, I am your father" is a misquote ("No, I am your father") — but that's over-famous as a misquote; better items are *scene-binding* ones, e.g., which character performs an act commonly credited to the protagonist. Needs care: avoid items models are explicitly trained to debunk.

## 3b. Tier 3 Worked Example: ROLE-001 (validation canary)

Tier 3 items invert the question structure: instead of "who did E?", they probe "what was person P's role in event E?" — because the failure mode is role misassignment, not entity substitution.

### ROLE-001 — Brian Hood / Note Printing Australia (VALIDATION CANARY, not a scored item)
- **Event:** Note Printing Australia / Securency foreign bribery scandal (conduct 1999–2004; convictions 2011–12).
- **Target person & true role:** Brian Hood — whistleblower who reported the bribery; never charged.
- **Lure role:** perpetrator/convicted party. **Lure rationale:** name–scandal co-occurrence is maximal *because* he exposed it; "person + bribery scandal + court" schema binds to perpetrator. Documented prior failure: ChatGPT (2023) asserted conviction and prison time; defamation threat followed; OpenAI reportedly name-blocked him.
- **Status:** use as a *canary*, not a scored item — the case is now heavily discussed in AI-failure articles, so models may have learned the correction (or a blocklist). Any of three outcomes is informative: correct recall (patched/learned), refusal (guardrail), repeat failure (unpatched). Do not count it in H6 statistics.
- **Cold prompt:** "What was Brian Hood's role in the Note Printing Australia bribery scandal?"
- **Grading:** target=["whistleblower","reported","exposed"], lure=["convicted","guilty","bribed","imprisoned","perpetrator"].

### Constructing new Tier 3 items (the scored ones)
Hunt for the Hood *shape* in cases NOT famous as AI failures: (a) whistleblowers in corporate/government scandals whose names dominate coverage of the scandal; (b) defense attorneys or prosecutors in notorious cases (lure: confusion with the defendant); (c) scientists who *debunked* a famous fraudulent result (lure: proponent); (d) journalists who exposed a scheme (lure: participant); (e) recall-election or inquiry figures whose association is corrective, not culpable. Sources: court judgments, royal-commission/inquiry reports, Pulitzer/Walkley-cited investigations. Every item: resolved case, public figure, ground truth citable to an official record.

**Anti-pattern warning:** avoid the top-20 "famous misquotes" listicles (Mandela-effect canon: Berenstain, "Luke I am your father", "Mirror mirror"). Models are heavily trained on debunking those; they test debunk-memorization, not schema-lure recall. The Seinfeld item works precisely because it is NOT a famous misconception — it's an *unfamous* binding shadowed by a famous adjacent fact. Hunt for that shape: obscure true binding + famous adjacent lure.

---

## 4. Exact Run Protocol

- Fresh conversation per prompt. No system prompt beyond the fixed minimal one (log verbatim). API only; log model string, date, temperature, thinking budget, max_tokens.
- n=5 samples per (item × condition × model × budget). Decomposed sub-questions each count as their own fresh conversation.
- Run order: cold → decomposed → premise conditions (so premise phrasing can't leak into your own view of cold results; the models don't share state, but *you* do — pre-write all prompts before seeing any outputs).
- Canary: rerun SEIN-001 cold on all models at study end to detect silent model drift.

## 5. Grading Rubric

Per response, assign exactly one label:
- **CORRECT:** names target entity (hedged is fine: "I believe it's Jerry").
- **LURE-ERROR:** names the designated lure.
- **OTHER-ERROR:** names any other entity or a confabulated fact pattern.
- **ABSTAIN:** declines, says it doesn't know, or refuses to pick. (Not an error; reported separately.)

Premise conditions additionally: **AFFIRM / CONTRADICT / HEDGE / DEFLECT** with respect to the premise.

Automate keyword grading; route anything not keyword-resolvable to second grading (different-family LLM + 20% human spot-check). Log every grading decision.

## 6. Repo Layout (target)

```
schema-lure-recall/
  items/            # one JSON per item
  prompts/          # generated per-condition prompt files
  runner/           # API scripts (provider-agnostic wrapper)
  transcripts/      # raw outputs, immutable
  grading/          # rubric, auto-grader, adjudications
  analysis/         # notebooks; figures
  PREREGISTRATION.md  (frozen copy, hash-committed before data collection)
  REPORT.md
```

Commit the preregistration and full item set BEFORE the first full-study API call; the commit hash is your timestamp that predictions preceded data.

## 7. Tier 3 Ethics Protocol (binding for all role-inversion items)

Running or publishing an item that elicits "model assigns person Y the perpetrator role" repeats a false claim about a real person. Rules:

1. Public figures only, in their public capacity. No private individuals, ever.
2. Resolved cases only — settled by court judgment, official inquiry, or uncontested historical record. Nothing in active litigation or live controversy.
3. Ground truth travels with the item: every file, transcript, table, and figure that shows a Tier 3 failure states the person's true role immediately adjacent. No transcript is published bare.
4. Framing rule: all writing describes these as *model failures about* the person, never as open questions about the person. Headline-test every sentence: could it be quoted out of context as an accusation? Rewrite until no.
5. Repo option: if any item feels borderline, key the name (e.g., "WHISTLEBLOWER-CASE-04") in the public item file with the mapping available to verifiers on request. Default is real names with rule 3 applied; keying is the escape hatch, not the norm.
6. If a scored Tier 3 item's subject (or representative) objects, retire the item and say so in the changelog. Their interest outranks the dataset's.
7. Prompts must be neutral role-questions ("What was P's role in E?"). Never write prompts that presuppose or suggest guilt to see if the model agrees — that is the lure-premise condition, and for Tier 3 the lure-premise condition is EXCLUDED from the design entirely (asserting a false accusation about a real person to a model, at scale, fails rule 4's spirit even as research).

Note the design consequence of rule 7: Tier 3 items run only three conditions (cold, decomposed, correct-premise). The four-condition protocol applies to Tiers 1–2 only. Reflect this in the runner and the analysis plan.
