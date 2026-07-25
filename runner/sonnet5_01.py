"""Sonnet 5 full row for the flagship table (run-id: sonnet5_01). EXPLORATORY, post-publication.

Runs claude-sonnet-5 through the same four cells as Sonnet 4.6's row, at the same
conventions (n=12 x {none, low, high} thinking, crossmodel01/fillgrid01 style):

  1. verbatim messy phrasing, bare API        (4.6: 0/36 wrongful corrections; but cold it confabulates)
  2. verbatim messy phrasing + claude.ai      (4.6: 0/36)
  3. clean direct lookup (repro01 phrasing_A) (4.6: 36/36 WRONG - George 20 / Elaine 16)
  4. typos tidied + claude.ai prompt          (4.6: 4/36 wrongful corrections)

Question: does the current mid-tier know the binding (Opus-4.8-style), confabulate it
(4.6-style), or decline (Haiku-style)? Same first-named grading heuristic, same known
name-echo failure mode - ALL non-correct rows get read-adjudicated before any number is cited.
"""
import datetime
import json
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(__file__))
from run_experiment import load_dotenv  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUN_ID = "sonnet5_01"
MODEL = "claude-sonnet-5"

PROMPT_VERBATIM = ("The Melrose palace reference in Seinfeld.  Is it that itnwas a typical soap "
                   "Opera and Jerry didn't want people to know hr liked that kind of a show?")
PROMPT_CLEANED = ("The Melrose Place reference in Seinfeld. Is it that it was a typical soap "
                  "opera and Jerry didn't want people to know he liked that kind of a show?")
CLEAN_REPRO = ("In the Seinfeld episode 'The Beard', which character takes a lie detector test "
               "about watching Melrose Place?")

with open(os.path.join(ROOT, "config", "system_prompts", "claude_ai_fable5.txt"),
          encoding="utf-8") as _f:
    SYS_CLAUDE_AI = _f.read().strip().replace("{{currentDateTime}}", "Sunday, July 26, 2026")

PROMPTS = {"verbatim": PROMPT_VERBATIM, "cleaned": PROMPT_CLEANED, "clean_repro": CLEAN_REPRO}
SYS = {"bare": None, "claudeai": SYS_CLAUDE_AI}

# (block, prompt_key, scaffold)
CELLS = [
    ("messy_bare", "verbatim", "bare"),
    ("messy_claudeai", "verbatim", "claudeai"),
    ("lookup", "clean_repro", "bare"),
    ("tidied_claudeai", "cleaned", "claudeai"),
]
LEVELS = ["none", "low", "high"]
N = 12


def build_kwargs(prompt_key, scaffold, level):
    kwargs = {"model": MODEL, "messages": [{"role": "user", "content": PROMPTS[prompt_key]}]}
    if level == "none":
        kwargs["thinking"] = {"type": "disabled"}
        kwargs["max_tokens"] = 1024
    else:
        kwargs["thinking"] = {"type": "adaptive"}
        kwargs["output_config"] = {"effort": level}
        kwargs["max_tokens"] = 16384
    if SYS[scaffold]:
        kwargs["system"] = SYS[scaffold]
    return kwargs


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
    out_dir = os.path.join(ROOT, "transcripts", RUN_ID)
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "records.jsonl")
    done = set()
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            try:
                rec = json.loads(line)
                if rec.get("label") != "ERR":  # ERR rows retry on resume
                    done.add(rec["key"])
            except Exception:
                pass
    out = open(path, "a", encoding="utf-8")
    lock = threading.Lock()
    from collections import Counter
    tally = {}

    def one(job):
        block, pk, sk, level, i = job
        key = f"{block}|{MODEL}|{pk}|{sk}|{level}|{i}"
        try:
            r = client.messages.create(**build_kwargs(pk, sk, level))
            text = "".join(b.text for b in r.content if getattr(b, "type", "") == "text")
            err = None
        except Exception as e:  # noqa: BLE001
            text, err = None, f"{type(e).__name__}: {e}"
        label = "ERR" if err else grade(text)
        with lock:
            out.write(json.dumps({"key": key, "run": RUN_ID, "block": block, "model": MODEL,
                                  "prompt": pk, "system": sk, "level": level, "sample": i,
                                  "label": label, "error": err, "response_text": text,
                                  "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat()},
                                 ensure_ascii=False) + "\n")
            out.flush()
            tally.setdefault((block, level), Counter())[label] += 1
            print(f"{key} -> {label}", flush=True)

    jobs = []
    for block, pk, sk in CELLS:
        for level in LEVELS:
            for i in range(N):
                key = f"{block}|{MODEL}|{pk}|{sk}|{level}|{i}"
                if key not in done:
                    jobs.append((block, pk, sk, level, i))
    print(f"{len(jobs)} calls to run", flush=True)
    with ThreadPoolExecutor(max_workers=4) as ex:
        list(ex.map(one, jobs))
    out.close()

    print("\n=== SONNET5_01 TALLY (4.6 baselines: messy 0/36, lookup 36/36 WRONG, tidied 4/36) ===")
    for k, c in sorted(tally.items()):
        print(f"  {k[0]:16} {k[1]:6} {dict(c)}")


if __name__ == "__main__":
    main()
