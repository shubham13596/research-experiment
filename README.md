# Schema-Lure Recall in Frontier LLMs

Preregistered study of schema-driven false memory in LLM parametric recall — whether
models retrieve "who did what" by schema plausibility (the answer *representative* of
the event type) rather than by true entity–event binding, from sitcom trivia to
real-world role inversion. See `study_design_preregistration.md` (design, hypotheses)
and `item_template_and_protocol.md` (item schema, prompts, ethics protocol).

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
