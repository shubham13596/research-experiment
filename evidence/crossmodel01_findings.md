# Findings — Cross-Model Parametric Test (run-id: crossmodel01)

**Date:** 2026-07-17 (exploratory, post-freeze). Item: SEIN-001, observer's verbatim phrasing.
**NO TOOLS => no web search => pure parametric memory.** Sonnet 4.6 + Haiku 4.5, thinking none/low/high,
bare + claude.ai scaffolding, n=12 per cell. 144 calls, 0 API errors.

## George-error rate (the capability/calibration ladder)
Combined with phrasing01/surface01 on the SAME verbatim stimulus:

| Model | bare API | claude.ai prompt | Notes |
|---|---|---|---|
| Haiku 4.5 | 0% George (all thinking) | 0% George | never confabulates George; lots of non-commitment |
| Sonnet 4.6 | 0% George (all thinking) | 0–25% (none:3/12, low:1/12, high:0/12) | claude.ai mildly CAUSATIVE for Sonnet; thinking helps |
| **Opus 4.8** | **~70% George** | ~43% George | the outlier; scaffolding PROTECTIVE here |
| Fable 5 | — | 0% George | robust |

So on parametric memory, **Sonnet and Haiku do NOT reproduce the failure** — they don't confabulate George.
(This partly answers the observer's web-confound worry: with web off, they still don't fail *toward George*;
instead they abstain or answer the theme without committing to a character.)

## The real finding is calibration, and it is behavioral, not verbal
The "OTHER" bucket (named neither Jerry nor George) is large for Sonnet/Haiku and is mostly GENUINE
ABSTENTION or theme-only answers, e.g. Sonnet: "I'm not confident enough in the specific details of that
particular Melrose Place reference … I wouldn't want to guess." That is uncertainty that GATES the output.

Opus 4.8, given the same under-determined question, does the opposite. Some George errors are confident
corrections of the user ("You might be mixing up a couple of references … it's George"). Critically, others
VOICE caution and confabulate anyway: "I don't have a specific memory of a 'Melrose Palace' reference, so I
want to be careful not to make something up here" — then names George. **Opus's expressed caution is
decorative; it does not restrain the answer. Sonnet's/Haiku's uncertainty is actionable; it produces abstention.**

That is the sharper, more accurate claim than "Opus is overconfident": the smaller models *know when to not
answer*; Opus verbalizes the same epistemic care but still fills the gap with the schema-typical entity.

## Measurement caveat (important, honest)
The automated `hedged` regex is NOT trustworthy for the confidence claim: it conflates user-directed
uncertainty ("you might be thinking of…") with self-directed doubt ("I might be wrong"), and cannot detect
whether uncertainty GATES the output (decorative vs actionable hedging). It flagged 86% of Opus George
errors as "hedged," which is an artifact. Proper confidence coding requires human/LLM adjudication on two
axes: (a) self- vs user-directed uncertainty, (b) does the expressed uncertainty change the committed
answer. TODO before any confidence claim goes in a write-up.

## Raw hedge-marker rates (reported for transparency ONLY, not interpreted)
Haiku bare 67% / claude.ai 64%; Sonnet bare 31% / claude.ai 50%. Uninterpretable until adjudicated per above.

## Implication for the study
Strengthens the reframe toward a CALIBRATION study. The clean next experiment is tool-availability /
search-seeking: give each model an AVAILABLE (not forced) web_search tool and measure who chooses to verify.
Prediction from this run: Opus 4.8 verifies least (fills gaps confidently); Haiku/Sonnet verify or abstain more.

Raw transcripts: transcripts/crossmodel01/records.jsonl (144 rows, immutable).
