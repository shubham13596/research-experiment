# Project Status / Session Handoff

**Last updated:** 2026-07-18. Purpose: let any future session (or a compacted thread, or a fresh
chat) resume with zero context loss. All durable state is in this repo — this file is the map.

## One-line state
Preregistered schema-lure study is FROZEN and public. Anchor localized (phrasing01) AND generality
tested across the full 8-item set (gen01). Headline: the effect is REAL but RARE and FICTION-CONFINED;
it does NOT reproduce on real people in this set. Reframing toward a mechanism + boundary study, not a
"one model is broken" story. Controls (foil premise) not yet run.

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
- **METHOD FINDING:** automated first-named/keyword grading is UNFIT for premise scoring (wrong in BOTH
  directions). Use reading adjudication (reader agents + human spot-check). See gen01_findings.md.
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
- `search02` — cross-vendor (GPT/Gemini) search-seeking: PARKED by user decision, not abandoned. Pick-up
  notes: evidence/search02_cross_vendor_PARKED.md.

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
1. **Run the FOIL-PREMISE CONTROLS (cheap, high value, next up):** gen01's lure_premise used the SCHEMA lure.
   To prove the fiction acceptances (Opus 4.8/4.7 on SEIN-001/002, FRI-003) are schema-specific and not generic
   sycophancy, run the 8 control items' foil premise (an IMPLAUSIBLE wrong person). If models accept the schema
   lure but reject the implausible foil, the effect is schema-driven. Same runner shape as gen01.
2. **Source OBSCURE-real-person items to test Hood-type harm properly.** gen01 shows the effect needs a strong
   lure AND a not-well-known true binding; SIMP-004 (Homer/gambling) drew 0 failures because the true binding is
   famous, and the real-people items resisted because the true actors are recallable. A real Hood test needs
   items where the TRUE real-person binding is genuinely obscure (whistleblower-vs-perpetrator shape). Design task.
3. **Grading infra:** bake reading-adjudication (reader agents + human spot-check, per gen01) into the pipeline;
   automated entity-matching is unfit for premise scoring. Fix TV-008 grading (track Niles as distractor; strip
   show-title "Frasier").
4. Housekeeping: put real author name in the prereg (still "[your name]"); file the Anthropic bug report;
   log gen01/search01 in the prereg changelog as post-freeze exploratory.
5. Deferred: cross-vendor search02 (evidence/search02_cross_vendor_PARKED.md).

## Model config (config/models.json, all IDs verified 2026-07-17)
fable-5=claude-fable-5, opus-4.8=claude-opus-4-8, opus-4.7=claude-opus-4-7, sonnet-4.6=claude-sonnet-4-6,
sonnet-5=claude-sonnet-5, haiku-4.5=claude-haiku-4-5-20251001, openai=gpt-5.6-sol, gemini=gemini-2.5-pro/3.5-flash/3.1-flash-lite.
Thinking: Opus/Sonnet/Fable use `effort` (adaptive, no manual budget_tokens); Haiku uses budget_tokens.
API key in .env (gitignored). Runner auto-loads it. No tools => no web search (clean parametric).

## How to resume
Read this file + `study_design_preregistration.md` (design/hypotheses/changelog) +
`evidence/*_findings.md` (results). The scripts in `runner/` are self-documenting. Then pick up at
"Open decisions" above.
