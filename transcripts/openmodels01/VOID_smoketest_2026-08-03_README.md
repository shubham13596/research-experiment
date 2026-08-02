# VOID — 9 smoke-test records, 2026-08-03, NOT study data

These 9 `S7_logprob` records (llama-3.1-8b) came from the first live smoke test of
`runner/openmodels_phase0.py`. They are VOID as measurements: the CoreWeave endpoint returns
only the terminal `<|eot_id|>` token in `logprobs.content`, and the original parser took
`content[0]` as the answer position — so every record reports `P(jerry)=0.000, P(george)=0.000`
regardless of what the model actually answered. The `response_text` in them is genuine
(CoreWeave answered "George." to the clean SEIN-001 probe); only the logprob probe is invalid.

Moved out of `records.jsonl` rather than deleted (transcripts are append-only and immutable) and
rather than left in place (the runner is resume-keyed, so leaving them would permanently skip
those 9 cells and they would never be re-measured with the fixed parser).

Fixes this exposed, both now in the runner:
1. `parse_name_logprobs` skips special/whitespace tokens to find the true answer position, and
   returns an explicit `NO_LOGPROBS_RETURNED` / `ONLY_SPECIAL_TOKENS` status instead of a zeroed
   distribution. A silent 0.000 reads as "no George pull" — the exact wrong conclusion, and one
   that would have corrupted P6.
2. `probe_logprob_endpoint` empirically verifies an endpoint returns usable per-token logprobs
   before S7 runs there. `supported_parameters` advertising "logprobs" is NOT sufficient:
   of 5 llama-3.1-8b endpoints, DeepInfra/Groq/Cloudflare return an EMPTY array, CoreWeave
   returns only the eot token, and Novita alone returns real per-token logprobs.

Incidental observation worth keeping (see openmodels_interp_program.md): at temperature 0 on the
same prompt, CoreWeave-bf16 and Novita-fp8 answered "George." while DeepInfra-fp8 answered
"Jerry." Same weights, same prompt, different serving stack, different answer — direct evidence
that the provider/quantization pinning decision was necessary rather than precautionary.
