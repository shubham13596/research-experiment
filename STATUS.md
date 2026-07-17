# Project Status / Session Handoff

**Last updated:** 2026-07-17. Purpose: let any future session (or a compacted thread, or a fresh
chat) resume with zero context loss. All durable state is in this repo — this file is the map.

## One-line state
Preregistered schema-lure study is FROZEN and public. First data collected. The motivating finding
has been reproduced, localized, and is reshaping the study from a *recall* study into a *calibration*
study. Pilot not yet run in its revised form.

## The finding so far (this is the story)
The observation that motivated the study — Opus 4.8 misattributing Seinfeld "The Beard"'s polygraph
to George instead of Jerry — has been pinned down:
- **Clean lab prompts DON'T reproduce it.** Bare API, my constructed cold prompt: 0/40 George (`repro01`).
- **The observer's real, naturalistic phrasing DOES**, massively: 70% George on bare API (`phrasing01`).
  The phrasing asks the model to *reconstruct a scene / explain motivation* rather than *look up a fact*;
  reconstruction is where schema-driven retrieval (George = the archetypal liar) overrides truth AND
  overrides the user's explicitly-stated correct premise (wrongful contradiction).
- **The claude.ai system prompt is PROTECTIVE, not causative** (70% -> 43%); its accuracy/epistemics
  instructions suppress the error. (This corrected an earlier wrong interim claim of mine.)
- **More thinking does NOT rescue the strong trigger** (verbatim/bare ~flat 73%->67% low->high effort);
  reasoning only helps when the pull is already weak. Consistent with H3 + inverse-scaling literature.
- **Fable 5 is fully robust** (0/30 on the worst cell) — a same-family negative control; Opus-4.8-specific.
- **Metacognition reframe (open):** on chat, Sonnet/Haiku got it right by web-searching; Opus 4.8 did
  NOT search and was confidently wrong. Hypothesis: Opus is miscalibrated — a fluent reconstruction reads
  to it as knowledge, so it doesn't seek verification, doesn't hedge, and overrides correct users. This
  is the Brian Hood shape. The danger is metacognitive, not just factual.

## Experiments run (raw transcripts immutable under transcripts/<run-id>/records.jsonl)
- `repro01`  — SEIN-001, Opus 4.8, 4 effort levels, clean prompt, bare API. 40/40 correct. (evidence/repro01_findings.md)
- `surface01` — SEIN-001 clean prompt x {bare, minimal, claude.ai, +priming} x {Opus 4.8, Fable 5}. 200 calls.
  Only claude.ai-prompt cell produced any error (1/20); Fable 0. Scaffolding barely moves clean prompts.
- `phrasing01` — observer's verbatim phrasing x {bare, claude.ai} x {verbatim, cleaned} x {Opus 4.8, Fable 5}
  x {low,high effort}. 120 calls. THE key run. (evidence/phrasing01_findings.md)
- `crossmodel01` — verbatim phrasing on Sonnet 4.6 + Haiku 4.5, thinking none/low/high, bare+claude.ai,
  NO tools (pure parametric). 144 calls. **Was RUNNING at handoff (task b4mrre2bz).** To read results:
  re-grade transcripts/crossmodel01/records.jsonl with the first-named-character heuristic (see any
  findings script); also check the `hedged` field (confidence proxy) and whether Sonnet/Haiku fail on
  parametric memory (if they do, web search was masking a family-wide failure).

## Frozen / integrity
- Freeze commit `4d80d0712efe4b4629a11fd463af46a5f57c3732`, pushed to
  https://github.com/shubham13596/research-experiment (main). Predictions + item set preceded all data.
- Everything after the freeze (repro01/surface01/phrasing01/crossmodel01, the surface/phrasing scripts,
  system-prompt files, this STATUS) is EXPLORATORY post-freeze work, logged as such in the prereg changelog.

## Item set (frozen pilot: 8 conflict + 8 control, all in items/, ground-truth verified)
Tier 1: SEIN-001, SEIN-002, FRI-003, SIMP-004, TV-008.  Tier 2: SPORT-102, HIST-103, HIST-104.
Rejected candidates + audit trail: items/candidates/. Verification logs: evidence/.

## Open decisions / next steps (in priority order)
1. **REVISE THE ITEM PROTOCOL (pre-data design change):** the clean cold prompts systematically
   UNDER-elicit the phenomenon. Add naturalistic, reconstruction-inviting, premise-carrying phrasings to
   every item; make the correct-premise / wrongful-contradiction condition primary. Disentangle the
   "naturalistic reconstruction" vs "confused-user-invites-correction" confound (verbatim 43% vs cleaned 20%).
2. **Build the tool-availability / search-seeking experiment** (proposed, high value): give models a
   `web_search` tool as AVAILABLE (don't force), observe who chooses to call it. If Opus answers from
   memory while Sonnet/Haiku search, that's direct evidence of the calibration gap. Turns this into a
   calibration study — likely the strongest contribution.
3. Run the (revised) pilot across the model ladder to test GENERALITY beyond this one item.
4. Housekeeping: put real author name in the prereg (still "[your name]"); file the Anthropic bug report.

## Model config (config/models.json, all IDs verified 2026-07-17)
fable-5=claude-fable-5, opus-4.8=claude-opus-4-8, opus-4.7=claude-opus-4-7, sonnet-4.6=claude-sonnet-4-6,
sonnet-5=claude-sonnet-5, haiku-4.5=claude-haiku-4-5-20251001, openai=gpt-5.6-sol, gemini=gemini-2.5-pro/3.5-flash/3.1-flash-lite.
Thinking: Opus/Sonnet/Fable use `effort` (adaptive, no manual budget_tokens); Haiku uses budget_tokens.
API key in .env (gitignored). Runner auto-loads it. No tools => no web search (clean parametric).

## How to resume
Read this file + `study_design_preregistration.md` (design/hypotheses/changelog) +
`evidence/*_findings.md` (results). The scripts in `runner/` are self-documenting. Then pick up at
"Open decisions" above.
