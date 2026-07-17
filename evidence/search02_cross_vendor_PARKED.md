# PARKED — Cross-vendor search-seeking (`search02`)

**Status:** deliberately deferred, 2026-07-18. Not abandoned — a later-time extension.

## What it would be
Extend the `search01` search-seeking probe (does a model, given an *optional* `web_search`
tool, choose to verify vs. answer from unreliable memory?) beyond Anthropic to **OpenAI
(gpt-5.6-sol) and Google (Gemini 2.5 Pro / 3.5 Flash)**. Tests whether the calibration gap
observed in Opus 4.8 (answers from memory, rarely verifies, often wrong) is Anthropic-specific
or a general frontier-model property.

## Why parked
This is a curiosity offshoot from the metacognition reframe, not the study's stated goal. The
original and primary objective is to measure **whether the schema-lure / wrongful-contradiction
effect generalizes across our prepared item set** (SEIN-001, SEIN-002, FRI-003, SIMP-004, TV-008,
SPORT-102, HIST-103, HIST-104) — not to broaden the tool-seeking side-probe to more vendors.
Returning to the core first.

## What it needs when we come back (so we don't re-derive it)
1. **New script `runner/search02.py`** — cannot reuse `runner/search_seeking.py`: that detects
   verification via Anthropic's `stop_reason=="tool_use"`. Cross-vendor detection differs:
   - OpenAI: pass `tools=[{type:"function",...}]`, `tool_choice:"auto"`; detect
     `choice.finish_reason=="tool_calls"` / `message.tool_calls`.
   - Gemini: pass `types.Tool(function_declarations=[...])`; detect `functionCall` parts.
   - `runner/providers.py` OpenAIProvider/GoogleProvider **do not pass tools today** — small build.
2. **Drop the claude.ai system-prompt scaffold** for non-Claude models (it's a Claude product
   prompt; feeding it to GPT/Gemini is a confound). Use vendor-neutral: bare + generic
   "You are a helpful assistant." Same verbatim stimulus, same optional `web_search` stub.
3. **Interpretation caveat to carry:** a lower search rate is not automatically "worse calibrated"
   — house tool-eagerness differs. The vendor-invariant metric is **search rate × correctness-
   when-not-searching**; the failure cell is *didn't-search AND wrong*, not low search rate alone.

## Anthropic result to compare against (from `search01`, once complete)
Opus 4.8: ~6% search, ~40% George when answering from memory → dangerous cell ~38%.
Fable 5: ~0% search but correct → non-search is warranted. (Full breakdown: evidence/search01_findings.md)
