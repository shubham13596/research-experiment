# Project Status / Session Handoff

**Last updated:** 2026-07-18. Purpose: let any future session (or a compacted thread, or a fresh
chat) resume with zero context loss. All durable state is in this repo — this file is the map.

## One-line state
Preregistered schema-lure study is FROZEN and public. Effect localized (phrasing01), generality-tested
(gen01), then stress-tested on purpose-built real-person items (screen01) and a broad fiction set
(screen02). CURRENT HEADLINE: the schema-lure confident-error is REAL but NARROW — it needs a confluence
(strong archetype lure + genuinely confusable/under-encoded binding + messy reconstruction phrasing). It
does NOT generalize across fiction (1 clean fire / 15 in screen02) and does NOT appear on real people
(0/5 screen01, 0 on gen01 real-people). Most of the time the models are WELL-CALIBRATED (know+resist, or
hedge when unsure). The one big unresolved confound: PHRASING (our only strong trigger was the observer's
MESSY verbatim prompt, 70%; every batch since used CLEAN prompts). Next experiment isolates that.

## The finding so far (this is the story)
The observation that motivated the study — Opus 4.8 misattributing Seinfeld "The Beard"'s polygraph
to George instead of Jerry — has been pinned down AND generalized:
- **Clean lab prompts DON'T reproduce it.** Bare API, constructed cold prompt: 0/40 George (`repro01`).
  In gen01, 7/8 items are answered 5/5 correct cold by all models (only TV-008 fails cold, to *Niles*).
- **The observer's real, naturalistic phrasing DOES**, massively: 70% George on bare API (`phrasing01`).
  Reconstruction-inviting phrasing (explain motivation / rebuild a scene) is where schema-driven retrieval
  (George = archetypal liar) overrides truth and overrides the user's correct premise (wrongful contradiction).
- **The claude.ai system prompt is PROTECTIVE, not causative** (70% -> 43%); accuracy/epistemics instructions
  suppress the error. (Corrected an earlier wrong interim claim.)
- **More thinking does NOT rescue the strong trigger** (verbatim/bare ~flat 73%->67%); reasoning helps only
  when the pull is already weak. Consistent with H3 + inverse-scaling literature.
- **GENERALITY (gen01, the big update):** across 8 items × {opus-4.8, opus-4.7, fable-5} × premise conditions,
  read-adjudicated:
  - The effect is **real but rare and fiction-confined**: ALL 18 premise failures fall on 3 sitcom items
    (SEIN-001, SEIN-002, FRI-003). SIMP-004 and the real-people items (SPORT-102/HIST-103/HIST-104) = ZERO.
  - **The Brian Hood analog does NOT reproduce on real people here:** all models corrected false
    Warren/Roosevelt/Pirlo premises 15/15. (An earlier "~100% acceptance" was a keyword-grading artifact.)
  - **Fable 5 clean 0/80.** **Opus 4.8 vs 4.7 fail DIFFERENTLY:** 4.8 overrides truth (6/40 wrongful
    contradiction); 4.7 accepts falsehood (6/40 lure acceptance, incl. 5/5 on SEIN-001). So H2 ("4.8 regressed")
    is NOT supported as stated — not worse, differently miscalibrated. "Opus-4.8-specific / Fable robust" from
    phrasing01 was a single-item artifact; corrected.
- **REAL-PEOPLE STRESS TEST (screen01):** 5 purpose-built deceased-person role-inversion items (Geiger-Müller,
  Lexow, Whiskey Ring, Birkenhead, Empress of Ireland), verified at primary-source bar, screened on Opus 4.8.
  ALL 5 ROBUST — symmetric pushback on lure AND foil (real premise-checking, not sycophancy). 2nd replication
  of real-person robustness. An interim "GOV-202 cold confabulates the investigator" claim was RETRACTED — it
  was a keyword artifact (eponym echo "The Lexow Committee…"); the model actually names police grafters. (screen01_findings.md)
- **BROAD FICTION TEST (screen02):** 15 new against-type fiction items (FIC-201..215: sitcom/drama/film/lit),
  screened on Opus 4.8, read-adjudicated. Only 1 CLEAN fire (FIC-205 Arrested Development / Gob — the messiest,
  most-ambiguous-plot item). 12/15 fully robust or appropriately hedge; all "who killed X" famous-death items
  and 4/5 fame-risk items RESIST. This DEFLATES "fiction is broadly miscalibrated" — the gen01 fires
  (Seinfeld/Friends) were not representative. (screen02_findings.md)
- **METHOD FINDING (proven 4×):** automated first-named/keyword grading is UNFIT and FABRICATES false positives
  via eponym/device/show/title name-echo (TV-008 "Frasier", GOV-202 "Lexow", SCI-201 "Geiger", FIC-207 "Django").
  Reading adjudication (reader agents + lead spot-check of every surprise) is MANDATORY.
- **Metacognition / search-seeking (search01, done):** given an OPTIONAL web_search tool, Opus 4.8 verifies
  least (0–17%) and is wrong ~40% when it answers from memory; Sonnet/Haiku ~always search; Fable effort-gated;
  the claude.ai scaffold suppresses verification for all. Calibration gap confirmed behaviorally.

## Experiments run (raw transcripts immutable under transcripts/<run-id>/records.jsonl)
- `repro01`  — SEIN-001, Opus 4.8, 4 effort levels, clean prompt, bare API. 40/40 correct. (evidence/repro01_findings.md)
- `surface01` — SEIN-001 clean prompt x {bare, minimal, claude.ai, +priming} x {Opus 4.8, Fable 5}. 200 calls.
  Only claude.ai-prompt cell produced any error (1/20); Fable 0. Scaffolding barely moves clean prompts.
- `phrasing01` — observer's verbatim phrasing x {bare, claude.ai} x {verbatim, cleaned} x {Opus 4.8, Fable 5}
  x {low,high effort}. 120 calls. THE key run. (evidence/phrasing01_findings.md)
- `crossmodel01` — verbatim phrasing on Sonnet 4.6 + Haiku 4.5, thinking none/low/high, bare+claude.ai,
  NO tools (pure parametric). 144 calls. Sonnet 86% / Haiku 53% Jerry; rest is ABSTENTION, not George; only
  Fable reliably KNOWS the fact. (evidence/crossmodel01_findings.md)
- `search01` — optional web_search tool (auto), verbatim SEIN-001, {opus-4.8, fable-5, sonnet-4.6, haiku-4.5}
  × {bare, claude.ai} × {low, high} × n=12. 192 calls. Search-seeking tracks reliability inversely to need;
  Opus verifies least, answers-from-memory-wrong ~37% of calls. (evidence/search01_findings.md)
- `gen01` — **THE generality run.** All 8 conflict items × {opus-4.8, opus-4.7, fable-5} × {cold,
  correct_premise, lure_premise} × n=5, high effort, no tools. 360 calls, 0 errors. Premise conditions
  READ-ADJUDICATED (keyword grades discarded). Results table + conclusions: evidence/gen01_findings.md;
  per-response reader verdicts + quotes: transcripts/gen01/adjudicate/ (results/ALL_verdicts_readbased.json).
- `screen01` — danger-zone screen of 5 Tier-3a real-person items on Opus 4.8, {cold,correct,lure,foil}×5 =
  100 calls. ALL ROBUST (drop for elicitation; retained as real-person negative control). Read verdicts:
  transcripts/screen01/adjudicate/. (evidence/screen01_findings.md)
- `screen02` — danger-zone screen of 15 fiction items (FIC-201..215) on Opus 4.8, same 4 conditions ×5 =
  300 calls. 1 clean fire (FIC-205). Read verdicts: transcripts/screen02/adjudicate/. (evidence/screen02_findings.md)
- `search02` — cross-vendor (GPT/Gemini) search-seeking: PARKED by user decision, not abandoned. Pick-up
  notes: evidence/search02_cross_vendor_PARKED.md.

## New item inventories (post-gen01, candidates/ — NOT promoted to items/)
- Tier-3a real-person role-inversion (deceased/resolved/public-record), 5 VERIFIED + built:
  items/candidates/tier3a_built/ (SCI-201, GOV-202, GOV-203, MAR-204, MAR-205). Spec:
  items/candidates/tier3a_safe_realperson_spec.md. Verification logs: evidence/{SCI,GOV,MAR}-*_verification.md.
  Dossiers incl. rejects: items/candidates/tier3a_domain{A,B,C}_*.md.
- Fiction batch 2, 15 built: items/candidates/fiction_batch2_built/ (FIC-201..215; fame_risk flag on
  FIC-205/209/210/214/215). Spec: fiction_batch2_spec.md. Dossiers (18 candidates incl. 3 dropped +
  rejects): items/candidates/fiction_batch2_{sitcom_animation,drama_film,literature_film}.md.
- All new items carry a 4th premise condition `foil_premise` + `foil_entity` (schema-vs-sycophancy control).

## Frozen / integrity
- Freeze commit `4d80d0712efe4b4629a11fd463af46a5f57c3732`, pushed to
  https://github.com/shubham13596/research-experiment (main). Predictions + item set preceded all data.
- Everything after the freeze (repro01/surface01/phrasing01/crossmodel01/search01/gen01, all runner scripts,
  system-prompt files, this STATUS) is EXPLORATORY post-freeze work. NOTE: prereg changelog not yet updated with
  search01/gen01 — do that (next-steps #4).

## Item set (frozen pilot: 8 conflict + 8 control, all in items/, ground-truth verified)
Tier 1: SEIN-001, SEIN-002, FRI-003, SIMP-004, TV-008.  Tier 2: SPORT-102, HIST-103, HIST-104.
Rejected candidates + audit trail: items/candidates/. Verification logs: evidence/.

## Open decisions / next steps (in priority order)
1. **PHRASING DISCRIMINATOR (recommended next, proposed to user, awaiting go):** isolate the biggest confound.
   Take ~6 items that RESISTED under clean phrasing (e.g. FIC-206 GoT/Sansa, FIC-209 BB/Gale, FIC-211 Hobbit)
   + the known fires (FIC-205, SEIN-001/002, FRI-003), and run MESSY/confused-user phrasing vs CLEAN phrasing
   head-to-head on Opus 4.8, read-adjudicated (~150-200 calls). If messy flips the robust items → PHRASING is
   the driver (reframe to "confused-user phrasing induces schema confabulation"); if they still resist →
   robustness is real and item-encoding is the lever. Draft the messy variants naturalistically (like the real
   Melrose prompt) and SHOW USER before running — messy phrasing is the item-construction danger zone.
2. **Whole-program synthesis / write-up option:** enough evidence now exists for an honest bounded paper —
   mechanism + boundary (fiction-narrow, real-robust) + calibration (hedge-when-unsure) + methodology
   (keyword grading fabricates; reading required). Consider whether to write vs keep probing.
3. **If pursuing more elicitation:** the effect concentrates in sitcom/ensemble character-behavior quirks with
   scene-adjacent archetype lures (NOT famous "who killed X" facts, which are richly encoded and resist). Source
   more of THAT shape if broadening the fire set.
4. **Grading infra:** reading-adjudication is the standing method; automated entity-matching is banned for
   premise scoring. (screen runner grades only cold by keyword, and even that needs spot-check.)
5. Housekeeping: real author name in prereg (still "[your name]"); Anthropic bug report; log
   search01/gen01/screen01/screen02 in the prereg changelog as post-freeze exploratory.
6. Deferred: foil-premise controls on the original 8 items; cross-vendor search02; obscure-real-person items
   (all lower priority now that real-people robustness is replicated twice).

## Model config (config/models.json, all IDs verified 2026-07-17)
fable-5=claude-fable-5, opus-4.8=claude-opus-4-8, opus-4.7=claude-opus-4-7, sonnet-4.6=claude-sonnet-4-6,
sonnet-5=claude-sonnet-5, haiku-4.5=claude-haiku-4-5-20251001, openai=gpt-5.6-sol, gemini=gemini-2.5-pro/3.5-flash/3.1-flash-lite.
Thinking: Opus/Sonnet/Fable use `effort` (adaptive, no manual budget_tokens); Haiku uses budget_tokens.
API key in .env (gitignored). Runner auto-loads it. No tools => no web search (clean parametric).

## How to resume
Read this file + `study_design_preregistration.md` (design/hypotheses/changelog) +
`evidence/*_findings.md` (results). The scripts in `runner/` are self-documenting. Then pick up at
"Open decisions" above.
