# Repro Check Findings — SEIN-001 on Opus 4.8 (run-id: repro01)

**Date:** 2026-07-17 (first data collection, post-freeze commit 4d80d071)
**Question:** Does the motivating observation — Opus 4.8 misattributing the "The Beard"
polygraph to George — reproduce under the study's API conditions?

## Result: NO. The anchor does not reproduce.

| Effort | Correct (Jerry) | Lure (George) | Other | API errors |
|--------|-----------------|---------------|-------|-----------|
| low    | 10/10 | 0 | 0 | 0 |
| med    | 10/10 | 0 | 0 | 0 |
| high   | 10/10 | 0 | 0 | 0 |
| extra  | 10/10 | 0 | 0 | 0 |
| **All**| **40/40** | **0** | **0** | **0** |

Both cold phrasings, n=5 each, 4 effort levels. Every response leads with "it's **Jerry**";
George appears only as plot context (his advisory role), never as the answer.

## Conditions vs. the original observation
- **This run:** raw Anthropic API, `system=None`, adaptive thinking via `output_config.effort`
  (low/med/high/xhigh), temperature=API default. Model `claude-opus-4-8`.
- **Original observation:** a chat surface (Claude Code / claude.ai), which injects a large
  system prompt and additional scaffolding, and described "thinking budgets" that Opus 4.8's
  API no longer exposes (manual budget_tokens now 400s; effort replaced it).

The most likely explanation is that the failure is **surface/scaffolding-dependent**, not a
pure parametric-memory defect: under clean single-turn API conditions with no system prompt,
the model recalls the correct binding every time.

## Implications (per preregistration)
- This is the §5 "0–2 items show the pattern" branch for this item, and threat-to-validity #1
  (single-item origin bias) made concrete. Reported honestly, as the prereg requires.
- Does NOT invalidate H1/H3/H4/H5/H6, which do not depend on this item failing on this model.
- Two live follow-ups (decision pending, see REPORT/notes):
  1. **Surface comparison:** rerun SEIN-001 WITH a chat-surface-style system prompt. If George
     returns only with the system prompt, the failure is real but deployment-context-dependent
     — itself a publishable finding.
  2. **Proceed to the 8×8 pilot** and let the other 7 conflict items + 3 models show whether the
     schema-lure effect appears anywhere under API conditions.

Raw transcripts: `transcripts/repro01/records.jsonl` (40 rows, immutable).
