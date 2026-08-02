# openmodels01 — S1 knowledge gate findings

**Run:** `openmodels01`, cell `S1_knowledge`. 14 open/non-Anthropic models × 5 questions × n=3 =
**210 calls, 210 usable, 0 unrecovered errors.** Executed 2026-08-03 via OpenRouter, endpoints
pinned per model, no tools, no system prompt. Registered PRE-DATA in prereg v0.2.11 (commit
`4ebdce2`); this document is the post-data read.

**Grading: READ ADJUDICATION of all 210 responses by the lead.** No keyword grading was used for
any verdict here. (`keyword_hint_UNTRUSTED` is recorded in the transcript as a pre-sort hint only
and was not consulted for these tallies — the hint is wrong on TV-008 by construction, since the
show name "Frasier" echoes the lure entity.)

Questions (all verbatim from frozen items):
- **d1** — "In the Seinfeld episode 'The Beard', which character dates a police officer?" → Jerry
- **d2** — "In Seinfeld, which character says 'It's not a lie if you believe it'?" → George
- **d3** — "In the Seinfeld episode 'The Beard', which character takes a polygraph test?" → Jerry
- **d4** — "…what TV show is the polygraph test about?" → Melrose Place
- **TV** — TV-008 d3, "In 'Flour Child', which character actually delivers the baby in the taxi?" → Martin Crane

## Results (read-adjudicated, n=3 per cell)

| model | bucket | d1 Jerry | d2 George | d3 Jerry | d4 Melrose | TV Martin | gate |
|---|---|---|---|---|---|---|---|
| kimi-k3 | A | 3/3 | 3/3 | **3/3** | 3/3 | 0/3 (abstains) | **STRONG PASS** |
| deepseek-v4-pro | B | 3/3 | 3/3 | 2/3 | 3/3 | 0/3 | **PASS** |
| glm-4.6 | A | 3/3 | 3/3 | 2/3 | 3/3 | 0/3 | **PASS** |
| llama-3.3-70b | C | 1/3 | 3/3 | **3/3** | 3/3 | 0/3 (hedges) | **CORE PASS** ★ |
| kimi-k2-thinking | A | 0/3 | 3/3 | **3/3** | 3/3 | 0/3 | **CORE PASS** |
| glm-5.2 | A | 2/3 | 3/3 | 1/3 | 3/3 | 0/3 | fail |
| qwen3-235b | C | 0/3 | 3/3 | 1/3 | 3/3 | 0/3 | fail |
| deepseek-v3 | B | 0/3 | 3/3 | 2/3 | 1/3 | 0/3 | fail |
| kimi-k2-0905 | A | 0/3 | 3/3 | 1/3 | 3/3 | 0/3 | fail |
| gemma-3-27b | D | 0/3 | 3/3 | 1/3 | 1/3 | 0/3 | fail |
| deepseek-r1 | B | 1/3 | 3/3 | 1/3 | 0/3 | 0/3 | fail |
| minimax-m2 | A | 1/3 | 3/3 | 1/3 | 0/3 | 0/3 | fail |
| qwen3-32b | D | 0/3 | 3/3 | 1/3 | 0/3 | 0/3 | fail |
| llama-3.1-8b | D | 0/3 | 2/3 | **0/3** | 0/3 | 0/3 | **HARD FAIL** |
| **column total** | | 14/42 | **41/42** | 22/42 | 26/42 | **0/42** | |

## The headline: the meme is universal, the scene is not

**d2 is answered correctly by 14/14 models (41/42 responses). d3 by 22/42, and only 3 models get
it 3/3.** Every model on the roster knows that "It's not a lie if you believe it" is George's
line. Most of them do not know that Jerry is the one strapped to the polygraph.

That is precisely the asymmetry SEIN-001's `meme_asymmetry_note` predicted from web structure: the
quote circulates heavily as a George meme (merch, quote sites, clips) while the polygraph scene
circulates far less. The open-model corpus has absorbed the meme and not the scene.

**This substantially deflates P3 (the lineage discriminator) before the fingerprint cells even
run.** A George-shaped error on the polygraph question is now demonstrably the *expected* output
of a model that has the meme and lacks the scene — which is nearly all of them, across all four
lineage buckets. Bucket A (suspected Claude-flavored) shows no d2/d3 advantage over buckets B–D.
Any future lineage claim must rest entirely on the *idiosyncratic* fingerprint flags (f2/f4/f5),
never on George rates. The pre-data caveat logged in v0.2.11 was correct and is now empirically
grounded rather than merely cautionary.

## Prediction scorecard

- **P1 — PARTIALLY FALSIFIED.** Predicted the frontier MoEs would pass d1–d4 ≥2/3. Only 3 of 9
  frontier MoEs did (kimi-k3, deepseek-v4-pro, glm-4.6). deepseek-v3, deepseek-r1, glm-5.2,
  minimax-m2, qwen3-235b and kimi-k2-0905 all fail. Frontier scale does NOT imply this binding.
- **P1 sub-prediction on llama-3.3-70b — FALSIFIED, and in the most useful direction.** I
  predicted it would be partial "with d3 the miss." It scored **d3 3/3** — the polygraph binding
  is its *strongest* answer — and missed d1 instead (2/3 Elaine). See below; this changes the
  Phase 1 target.
- **P1 sub-prediction on llama-3.1-8b — CONFIRMED.** Hard fail: it attributes the dating, the
  quote, and the polygraph to **Newman**, and answers d4 with a lie-detector test for "a man
  suspected of being a serial killer."
- **P5 — SPLIT.** Abstention is common on TV-008 (kimi-k3 3/3, both Llamas) but essentially
  absent on SEIN-001, where models confabulate confidently instead. The logit instrument is still
  motivated, but for a different reason than predicted: not abstention masking the pull, but
  confident wrong answers masking *which* wrong attractor is dominant.
- P2/P3/P4/P6 — not evaluable from S1; they need S2–S7.

## Phase 1 target: llama-3.3-70b ★

This is the run's most actionable result. The interp program needs a model that **knows the fact
AND can be dissected**, and those two properties were in tension:

- **kimi-k3** is the best on the task (15/15 on SEIN-001, plus clean calibrated abstention on
  TV-008 — "I'd rather not invent who actually catches/delivers the baby," and it even offers
  Anne Fine's *Flour Babies* as a likely confusion). But it is a ~1T MoE. Not dissectible.
- **deepseek-v4-pro / glm-4.6** pass but are likewise very large MoEs.
- **llama-3.3-70b** answers d3 3/3, d2 3/3, d4 3/3 — terse, correct, no confabulated scaffolding —
  and is simultaneously: genuinely open-weight, dense (not MoE), servable at bf16, runs on a
  single H100 node, TransformerLens-compatible, and exposes logprobs through OpenRouter.

**Decision gate G1 is satisfied on the knowledge side.** llama-3.3-70b is the Phase 1 interp
target, with kimi-k3 as the behavioral ceiling reference. Confirmation still requires an S3 fire
(or a measurable S7 pull) on llama-3.3-70b — that is the next run, not a settled result.

Note the fallback also narrowed usefully: llama-3.1-8b's hard fail means the cheap 24GB-GPU path
with Llama Scope SAEs is **closed** for this item. Phase 1 needs the 70B-class rig.

## TV-008 d3 is UNUSABLE as a standalone probe — stimulus defect, disclosed

**0/42 responses correct, across every model.** But this is substantially a defect in the probe,
not a clean model result, and it must not be reported as the latter:

1. **The question omits the show.** "In 'Flour Child', which character actually delivers the baby
   in the taxi?" never says *Frasier*. Inside the original item d1/d2 establish the show; pulled
   out as a standalone gate probe it is under-specified. kimi-k3's "is it a novel, film, TV
   episode, or play?" is a *reasonable* response to the prompt as written, not a knowledge failure.
2. **It elicited spectacular cross-work confabulation.** Models relocated the scene to at least
   nine different works, each with a confidently named character: *M\*A\*S\*H* (deepseek-v4-pro,
   3/3 — same wrong show three times, three different characters: Hawkeye, Radar, Winchester),
   *Cheers* (Sam Malone), *Friends* (Phoebe), *Two and a Half Men* (Evelyn Harper), *The League*
   (Ruxin), *Fresh Prince of Bel-Air* (Carlton), *Malcolm in the Middle* (Francis), *The Proud
   Family* (Penny Proud), *Seinfeld*. Plus at least four **fabricated novels with fabricated
   authors** — "Flour Child by Susan Foley / Susan Wicks / Susan Olding" (qwen3-235b), "by Nancy
   Werking / Anne Booth / Jeanette O. Hain" (qwen3-32b) — and an invented taxi driver, "Mr.
   Henderson," asserted 3/3 by gemma-3-27b.

**Action:** the S6b fingerprint cell is UNAFFECTED — it uses TV-008 `cold_prompts[0]`, which does
name Frasier. For any future gate use, TV-008 d3 must be re-specified to name the show. Until
then no TV-008 conclusion should be drawn from S1.

## A candidate failure mode not in the six-mode taxonomy

The TV-008 results, and several SEIN-001 misses, show something the reread01 taxonomy does not
cleanly cover: **cross-work relocation**. The model does not merely swap an entity *within* the
correct work (archetype capture) or compress to a famous binding — it moves the entire scene into
a *different* work and populates it with that work's cast, confidently and with invented
supporting detail. deepseek-v4-pro naming *M\*A\*S\*H* three times with three different characters
is the sharpest instance: the wrong container is stable while the entity inside it is not.

Whether this is a genuinely distinct mode or an extreme of compression-to-famous-binding is not
settled here, and TV-008's under-specification is a confound for exactly these responses. Flagged
for the S6 cells, where the prompts are properly specified.

## Secondary observations (from reading, worth carrying forward)

- **Within-model retrieval inconsistency, on-thesis for RQ5.** kimi-k2-thinking answers "Elaine"
  3/3 on d1, yet inside its *d3* answers writes "Jerry is dating a police officer, Sgt. Cathy
  Tiemey" while correctly naming Jerry as the polygraph subject. The same binding is retrieved
  correctly in one context and wrongly in another, minutes apart, same model, same settings. This
  is a binding-under-interference signature visible without any premise manipulation.
- **The coach slot drifts, again.** kimi-k3 d3 sample 2: "despite **Kramer's** advice on beating
  it." This is the same peripheral-slot fragility recorded on Fable-5-Max in the write-up
  screenshots (image 05). It recurs in an unrelated model family.
- **Quote-follows-role inside a correct answer.** glm-4.6 d2 sample 0 names George as the speaker
  but then narrates *Jerry* giving the advice to George, who repeats it — right answer, inverted
  scene.
- **Peripheral confabulation is near-universal.** The police officer is variously Sgt. Cathy
  Tiemey / Tierny / Tierney / Tanner / Tinsley, Officer Barry, Officer David, Officer Karen,
  Officer Tony, Officer Bookman, Lieutenant Bookman, Lippman, Vincent, David Lutz, Nina, Melanie,
  Robert, Tony-played-by-Dan-Cortese, and (deepseek-r1) "Rebecca De Mornay, played by actress
  Megan Gallagher." Fifteen-plus invented identities for one unnamed character, across models
  that mostly got the *binding* right.
- **Confident alternative plots, not bare name errors.** glm-5.2 twice asserts George takes the
  test "as part of a job application" where "the hiring manager has a strict policy against hiring
  *Melrose Place* fans." glm-4.6 invents a polygraph about whether George liked *Schindler's List*.
  deepseek-r1 answers d4 with *The Today Show* and *The Maury Povich Show*, and once asserts the
  polygraph is "NOT actually about a TV show."

## Harness issues encountered (all fixed; see program doc for detail)

1. **Two concurrent processes.** An earlier `TaskStop` killed the shell wrapper but left its
   Python child alive; when credits were added it resumed, running pre-fix code, interleaved into
   the same transcript. Detected via interleaved timestamps, killed. Transcript verified
   uncorrupted; 3 duplicate keys are retries (analysis takes the last success).
2. **Provider error returned as response content.** GMICloud/glm-5.2 answered HTTP 200 with
   `"request param validation error, Value error, enable_thinking and thinking type must be same"`
   in the message body — recorded as if the model said it. Now detected, excluded, re-attempted.
3. **Silent empty records.** kimi-k2-0905 spent all 1024 tokens on an unreturned reasoning trace
   (`finish_reason: length`, `content: None`) — which would have read as an abstention. Traces are
   now requested from every model and the budget escalates once on empty-but-truncated.
4. **Error records blocked their own retry** (resume now keys on successes only).
5. **Zero-credit account** — 15 kimi-k3 calls 402'd before credits were added; all recovered on
   retry. A preflight balance check now refuses to start an underfunded run.

## Cost

Reported spend for the S1 gate: well under the $1.15 estimate for the cell (dominated by reasoning
models' long traces — glm-5.2 emitted 12,760 characters of reasoning for a single one-line answer).
Total `openmodels01` spend to date including the smoke tests: ~$0.30.
