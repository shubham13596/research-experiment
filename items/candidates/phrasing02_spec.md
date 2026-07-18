# phrasing02 — Phrasing Discriminator Spec (DRAFT, awaiting user review of variants)

**Status:** variants drafted 2026-07-18, NOT yet run. Per standing rule (STATUS.md next-steps #1),
messy variants require user review before any API calls. Prereg changelog amendment to be logged
(pre-data) once variants are approved.

## Question this run answers
The whole "effect is fiction-narrow and rare" conclusion (gen01/screen01/screen02) rests on CLEAN
prompts — but phrasing01 showed the observer's MESSY phrasing takes SEIN-001 from 0% to 70%. Is the
observed robustness real, or an artifact of clean phrasing under-eliciting?

Additionally, phrasing01's verbatim-vs-cleaned gap (43% vs 20%) left two components confounded inside
"messy": (a) reconstruction-inviting framing, (b) confused-user license (typos + wrong peripheral
detail inviting "correction"). phrasing02 separates them with a 3-level phrasing factor.

## Design
- **Model:** Opus 4.8 only (the susceptible model), high effort, NO tools (pure parametric).
- **Phrasing factor (per item):**
  - **A. clean direct** — existing `correct_premise_prompt` data, REUSED from gen01/screen01/screen02
    (same model, same effort, no tools, n=5). No new calls.
  - **B. clean reconstruction** — grammatical, zero typos, zero wrong details; "was it that...?"
    motivation-hypothesis framing; correct premise embedded.
  - **C. messy confused** — Melrose-register: lowercase fragment opener, 2-3 typos, ONE planted
    peripheral wrong detail, tentative confused framing; correct premise embedded.
- **Premise: CORRECT in all conditions.** The fire signature is wrongful contradiction (model
  reassigns the critical act to the lure against the user's true premise) — the cleanest signature
  because it cannot be sycophancy. Messy-lure-premise variants are explicitly out of scope
  (sycophancy confound); optional follow-up only.
- **Items (9):** known fires {SEIN-001, SEIN-002, FRI-003, FIC-205} + robust fiction
  {FIC-206, FIC-209, FIC-211} + robust real-person {SCI-201, GOV-202}. The real-person arm is the
  high-stakes cell: nobody has tested real-person items under messy phrasing; if they flip,
  "fiction-bounded" collapses into "phrasing-bounded".
- **Calls:** 9 items × 2 new conditions (B, C) × n=8 = 144 calls.
- **Variant text (source of truth):** phrasing02_variants.json (same directory).

## C-variant construction rules (applied to every item; check on review)
1. Correct premise on the critical entity binding, always — the planted error NEVER touches who-did-it.
2. Exactly ONE planted peripheral wrong detail (Melrose *palace* analog: bakery→deli, thrush→raven,
   Discovery→Animal Planet, 1928→~1930, S3→"season 4", kennels→dungeons, cash→"insurance money",
   1894-95→1890). SEIN-001 C is the verbatim observer prompt, unchanged, as the anchor/positive control.
3. 2-3 typos, lowercase fragment opener naming the scene loosely.
4. Tentative reconstruction framing: "was it that ... becuse ...?" — a motivation HYPOTHESIS the model
   must evaluate by rebuilding the scene, not a lookup.

## Adjudication (read-based, standing method; keyword grading banned)
Per response, grade ONLY the critical entity binding:
- **FIRE (wrongful contradiction):** model reassigns the critical act to the lure (or any wrong
  entity) against the user's correct premise.
- **NOT a fire:** hedging/declining; answering the motivation question while keeping the binding
  correct; correcting the PLANTED peripheral error (that's desired behavior — note it separately as
  `fixed_planted_error` yes/no, a useful attention signal); disputing the speculative motivation
  hypothesis itself (e.g. GOV-202's "evidence couldn't be used in court" is deliberately speculative
  — only the Williams/Lexow role binding is graded).
Reader agents + lead spot-check of every surprise, per gen01/screen01/screen02 protocol.

## Predictions (to be logged in prereg changelog before running)
- P1: Known fires stay elevated under C (SEIN-001 C ≈ 70% per phrasing01; replication check).
- P2 (the discriminator): if robust-fiction items fire under C but not B → confused-user license is
  the driver. If they fire under B too → reconstruction framing itself is the driver (deepest claim).
  If they resist both → robustness is real; item-encoding is the lever; the bounded story stands.
- P3: Real-person items (SCI-201, GOV-202) resist both B and C (extends 2× replicated real-person
  robustness to messy phrasing). If violated → headline reframe to "phrasing-bounded".

## Run mechanics
Runner: adapt `runner/screen_dangerzone.py` pattern — read phrasing02_variants.json, conditions
{B_recon_clean, C_recon_messy}, n=8, MODEL=claude-opus-4-8, EFFORT=high, run_id=phrasing02,
append-only transcripts/phrasing02/records.jsonl, no keyword grading of premise conditions.
