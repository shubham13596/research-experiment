"""Focused test: does the OBSERVER'S ACTUAL PHRASING reproduce the George error?

Motivation: our lab-clean cold prompts got 0/40 (bare) and 1/20 (claude.ai prompt) George
errors on Opus 4.8 — far below the observer's ~100% chat rate. The observer then supplied the
verbatim phrasing they actually used. It is conversational, contains typos, and ALREADY ASSERTS
the correct answer (Jerry) as a premise while asking about motivation — so a George response here
is the model contradicting a correct user, the study's key concern (H4 / wrongful contradiction).

This tests that authentic stimulus directly. EXPLORATORY, post-freeze.

Grading (assertion-level, not the polygraph question):
  Jerry(correct) : affirms/keeps Jerry as the Melrose watcher
  GEORGE(error)  : attributes the Melrose-watching / polygraph to George (contradicts the user)
  (first-named-character heuristic; George-labeled rows are eyeballed for negations afterwards)
"""
import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from run_experiment import load_dotenv  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = 15
EFFORTS = ["low", "high"]

# The observer's EXACT phrasing, verbatim (typos preserved: 'palace', 'itnwas', 'hr liked').
PROMPT_VERBATIM = ("The Melrose palace reference in Seinfeld.  Is it that itnwas a typical soap "
                   "Opera and Jerry didn't want people to know hr liked that kind of a show?")
# Typo-corrected, same structure — isolates whether the noise/typos matter vs the phrasing shape.
PROMPT_CLEANED = ("The Melrose Place reference in Seinfeld. Is it that it was a typical soap "
                  "opera and Jerry didn't want people to know he liked that kind of a show?")

with open(os.path.join(ROOT, "config", "system_prompts", "claude_ai_fable5.txt"),
          encoding="utf-8") as _f:
    SYS_CLAUDE_AI = _f.read().strip().replace("{{currentDateTime}}", "Friday, July 17, 2026")

PROMPTS = {"verbatim": PROMPT_VERBATIM, "cleaned": PROMPT_CLEANED}
SYS = {"bare": None, "claudeai": SYS_CLAUDE_AI}

# Test matrix. Opus 4.8 is primary; Fable 5 is the same-family negative control (observer reports
# Fable answers correctly from memory).
CELLS = [
    ("claude-opus-4-8", "verbatim", "bare"),
    ("claude-opus-4-8", "verbatim", "claudeai"),
    ("claude-opus-4-8", "cleaned", "claudeai"),
    ("claude-fable-5", "verbatim", "claudeai"),
]


def grade(text):
    t = (text or "").lower()
    if not t.strip():
        return "EMPTY"
    ji, gi = t.find("jerry"), t.find("george")
    if ji == -1 and gi == -1:
        return "OTHER"
    if gi == -1:
        return "Jerry(correct)"
    if ji == -1:
        return "GEORGE(error)"
    return "Jerry(correct)" if ji < gi else "GEORGE(error)"


def main():
    load_dotenv()
    import anthropic
    client = anthropic.Anthropic()
    out_dir = os.path.join(ROOT, "transcripts", "phrasing01")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "records.jsonl")
    done = set()
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            try:
                done.add(json.loads(line)["key"])
            except Exception:
                pass
    out = open(path, "a", encoding="utf-8")
    from collections import Counter
    tally = {}
    for model, pk, sk in CELLS:
        for eff in EFFORTS:
            for i in range(N):
                key = f"{model}|{pk}|{sk}|{eff}|{i}"
                if key in done:
                    continue
                kwargs = {"model": model, "max_tokens": 16384,
                          "thinking": {"type": "adaptive"},
                          "output_config": {"effort": eff},
                          "messages": [{"role": "user", "content": PROMPTS[pk]}]}
                if SYS[sk]:
                    kwargs["system"] = SYS[sk]
                try:
                    r = client.messages.create(**kwargs)
                    text = "".join(b.text for b in r.content if getattr(b, "type", "") == "text")
                    err = None
                except Exception as e:  # noqa: BLE001
                    text, err = None, f"{type(e).__name__}: {e}"
                label = grade(text)
                out.write(json.dumps({"key": key, "model": model, "prompt": pk, "system": sk,
                                      "effort": eff, "sample": i, "label": label, "error": err,
                                      "response_text": text,
                                      "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat()},
                                     ensure_ascii=False) + "\n")
                out.flush()
                tally.setdefault((model, pk, sk), Counter())[label] += 1
                print(f"{key} -> {label}")
    out.close()
    print("\n=== TALLY (George-error rate is the signal) ===")
    for k, c in tally.items():
        print(f"  {k[0]:16} {k[1]:9} {k[2]:9} {dict(c)}")


if __name__ == "__main__":
    main()
