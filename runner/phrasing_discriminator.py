"""Phrasing discriminator (run-id: phrasing02).

Isolates the phrasing confound behind the whole "effect is fiction-narrow" story. Every prior
robustness result used CLEAN prompts, but phrasing01 showed the observer's MESSY phrasing took
SEIN-001 from 0% -> 70%. Here we hold the CORRECT premise fixed and vary ONLY phrasing register,
so the sole fire signature is wrongful contradiction of the critical entity binding (not sycophancy).

Conditions (per item, from items/candidates/phrasing02_variants.json):
  B_recon_clean : grammatical reconstruction framing ("was it that...?"), no typos, no wrong detail.
  C_recon_messy : Melrose-register — typos + ONE planted peripheral wrong detail + tentative framing.
  (A clean-direct = existing correct_premise data from gen01/screen0x; REUSED, not re-run here.)

Opus 4.8, high effort, NO TOOLS (pure parametric), n=8. Premise conditions are NOT keyword-graded
(gen01 proved that unreliable, 4x) — response_text is recorded verbatim for reading adjudication.
Append-only + resumable via the per-call `key`, mirroring screen_dangerzone.py.
"""
import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from run_experiment import load_dotenv  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = 8
EFFORT = "high"
MODEL = "claude-opus-4-8"
RUN_ID = "phrasing02"
VARIANTS = os.path.join(ROOT, "items", "candidates", "phrasing02_variants.json")
# (condition-key-in-file, condition-label-in-record)
CONDITIONS = [("B_prompt", "B_recon_clean"), ("C_prompt", "C_recon_messy")]


def main():
    load_dotenv()
    import anthropic
    client = anthropic.Anthropic()

    spec = json.load(open(VARIANTS, encoding="utf-8"))
    items = spec["items"]
    print(f"loaded {len(items)} items: {[it['id'] for it in items]}")

    out_dir = os.path.join(ROOT, "transcripts", RUN_ID)
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "records.jsonl")

    done = set()
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            try:
                done.add(json.loads(line)["key"])
            except Exception:
                pass
    print(f"resuming: {len(done)} calls already recorded")

    out = open(path, "a", encoding="utf-8")
    made = 0
    for item in items:
        iid = item["id"]
        for pkey, clabel in CONDITIONS:
            prompt = item[pkey]
            for i in range(N):
                key = f"{iid}|{clabel}|{i}"
                if key in done:
                    continue
                try:
                    r = client.messages.create(
                        model=MODEL, max_tokens=16384,
                        messages=[{"role": "user", "content": prompt}],
                        thinking={"type": "adaptive"}, output_config={"effort": EFFORT})
                    text = "".join(b.text for b in r.content
                                   if getattr(b, "type", "") == "text")
                    err = None
                except Exception as e:  # noqa: BLE001
                    text, err = None, f"{type(e).__name__}: {e}"
                out.write(json.dumps({
                    "key": key, "item": iid, "group": item.get("group"),
                    "condition": clabel, "sample": i,
                    "critical_binding": item.get("critical_binding"),
                    "planted_error_C": item.get("planted_error_C") if clabel == "C_recon_messy" else None,
                    "model": MODEL, "effort": EFFORT,
                    "error": err, "prompt": prompt, "response_text": text,
                    "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat()},
                    ensure_ascii=False) + "\n")
                out.flush()
                made += 1
                print(f"{key}" + (" ERR: " + err if err else " (recorded)"))
    out.close()
    print(f"\ndone. {made} new calls this pass. total target = "
          f"{len(items) * len(CONDITIONS) * N}. Premise conditions recorded for reading adjudication.")


if __name__ == "__main__":
    main()
