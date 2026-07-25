# Schema-Lure Recall in Frontier LLMs

Preregistered study of schema-driven false memory in LLM parametric recall — whether
models retrieve "who did what" by schema plausibility (the answer *representative* of
the event type) rather than by true entity–event binding, from sitcom trivia to
real-world role inversion.

**Read the write-up first:** [`writeup/post.md`](writeup/post.md) — the full story,
six failure modes, and every number with its receipts. The one-sentence thesis:
**models defend the highest-fluency version of a memory against everything, including
the user being right** — fiction gets wrongful correction, real people get wrongful doubt.

## Headline results (~1,750 API calls, read-adjudicated)

- Opus 4.8, told a **correct** Seinfeld premise in messy phone-typed phrasing, wrongfully
  "corrects" the user 63% of the time (bare API) — and 0% on clean lab phrasing of the
  same fact. Evals built on tidy prompts measure the wrong distribution.
- Six failure modes, three invisible to entity-swap rubrics (existence denial,
  truth-rejection-as-unfamiliarity, wrongful doubt of documented real-person facts).
- Real people never got entity-swapped in our items (2× replicated); they get *doubted*.
- **Opus 5 rematch** (day after release, `transcripts/opus5_01/`): wrongful correction
  63%→7%, danger cell empty, verification now effort-gated — attractor survives at ~7-10%
  with the identical inversion package, and one confident miss on a clean lookup where
  Opus 4.8 was 40/40.
- Keyword grading fabricated ~10 false findings via name echo before the models fabricated
  anything. Reading adjudication is mandatory; budget for it.

## Try it on your show

The failure lives in the long tail of specific fandoms — items only a fan can build.
The recipe (details in §10 of the post):

1. Pick a **mid-tier fact** from a show you know cold — not the famous death or the
   catchphrase (those are armored), but the precise structure *under* a famous moment.
2. Ask about it the way you'd text a friend — sloppy, half-remembered — and **include the
   correct premise**. You're testing whether the model defends its fluent version against
   you being right.
3. **Verify ground truth against the script/wiki before declaring a hit.** Don't be our
   keyword grader.
4. Run it several times: at ~7-10% fire rates, one screenshot is noise in either direction.
5. Share via the [community-finding issue template](.github/ISSUE_TEMPLATE/community-finding.md) —
   model, settings, exact prompt, full transcript.

`runner/opus5_test.py` is a minimal, self-contained example of a resumable test loop
(swap in your model/prompt); `runner/real_phrasing_test.py` is the original. MIT licensed —
fork away.

## Repo layout

```
study_design_preregistration.md   # the prereg — frozen by commit hash before data collection
item_template_and_protocol.md     # item schema, worked examples, run protocol, Tier-3 ethics
items/                            # one JSON per promoted item (conflict + control pairs)
items/candidates/                 # researched candidates awaiting curation — NEVER run directly
evidence/                         # ground-truth verification logs, one per item
config/models.json                # model registry, thinking budgets, sampling defaults
runner/build_prompts.py           # items -> per-condition prompt records
runner/providers.py               # Anthropic / OpenAI / Google API wrappers
runner/run_experiment.py          # resumable driver; transcripts are append-only
prompts/                          # generated prompt files (build output)
transcripts/<run-id>/             # raw outputs + manifest, IMMUTABLE — no edits, no deletions
grading/autograde.py              # keyword grader; premise conditions -> adjudication queue
grading/adjudications.jsonl       # logged human/second-grader decisions (overrides)
analysis/analyze.py               # H1 gap + bootstrap CIs, error direction, H5, McNemar (H2)
```

## Workflow (order matters — integrity depends on it)

1. **Construct items** from ground truth + lure logic. Verify against primary sources;
   log citations in `evidence/`. Never test an item on any model before it is frozen.
2. **Curate** candidates from `items/candidates/` into `items/` (full schema, foils
   filled, verification_status=verified).
3. **Freeze:** commit the prereg + item set. That commit hash is the public timestamp
   proving predictions preceded data.
4. **Pilot** (prereg §5): `python runner/run_experiment.py --run-id pilot01
   --models opus-4.8:high,opus-4.7,sonnet-4.6 --conditions cold`
5. **Grade:** `python grading/autograde.py --run-id pilot01`; adjudicate the queue into
   `grading/adjudications.jsonl` (every decision logged with grader + reason).
6. **Analyze:** `python analysis/analyze.py --run-id pilot01 --mcnemar
   opus-4.8:high,opus-4.7:none`; apply the preregistered gating criteria.
7. Full study, then report. All transcripts and grading decisions ship with the repo.

## Setup

```
pip install -r requirements.txt
# set ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY in the environment (never commit)
python runner/run_experiment.py --run-id smoke --models opus-4.8 --conditions cold --dry-run
```

Before any paid run: set `verified: true` in `config/models.json` only after confirming
each exact API model ID against provider docs.

## Integrity rules (binding)

- Transcripts are append-only; no transcript is excluded without a logged reason.
- Items are never dropped after seeing model results, except by the preregistered
  gating criteria.
- Tier 3 (role-inversion) items never run the lure-premise condition, and every
  publication of a Tier 3 failure carries the person's true role adjacently.
  Full protocol: `item_template_and_protocol.md` §7.
