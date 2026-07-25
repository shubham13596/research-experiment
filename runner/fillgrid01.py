"""Fill the empty cells of the flagship results table (run-id: fillgrid01). EXPLORATORY, post-publication.

The post's central table (writeup/post.md §5.2) shipped with honest "not run" cells and one
under-powered cell (Opus 5 clean lookup, 1/10, different wording than 4.8's 40/40). This run
fills them, at the same sample-size conventions as the source runs:

  A. Fable 5, verbatim messy phrasing, BARE API        — its existing 0/30 was measured only
     under the claude.ai prompt, which we know is protective for Opus (63%->47%). n=15 x low/high,
     mirroring phrasing01.
  B. Fable 5, typos-tidied + claude.ai prompt          — n=15 x low/high, mirroring phrasing01.
  C. Clean-lookup 2x2: {Opus 4.8, Opus 5} x {repro01 wording, opus5_01 wording}, n=10 x four
     effort levels (low/medium/high/xhigh), bare — mirroring repro01. Resolves whether Opus 5's
     1/10 miss on a plain direct lookup is a real regression or wording/sampling noise.
     (The opus5 x opus5-wording cell re-runs at full n=40; opus5_01's original 10 stay in their
     own transcript and can be pooled at read time.)
  D. Sonnet 4.6 + Haiku 4.5: clean lookup (repro01 wording, bare) and tidied + claude.ai —
     n=12 x {none, low, high}, mirroring crossmodel01's conventions incl. Haiku's budget-token
     thinking. Expected zeros (both are 0% on the strictly harder messy condition); run for
     table completeness.

Grading is the same first-named Jerry/George heuristic as the source runs and carries the same
known failure mode (name-echo false positives) — ALL rows get read-adjudicated before any number
is cited.
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
RUN_ID = "fillgrid01"

PROMPT_VERBATIM = ("The Melrose palace reference in Seinfeld.  Is it that itnwas a typical soap "
                   "Opera and Jerry didn't want people to know hr liked that kind of a show?")
PROMPT_CLEANED = ("The Melrose Place reference in Seinfeld. Is it that it was a typical soap "
                  "opera and Jerry didn't want people to know he liked that kind of a show?")
CLEAN_REPRO = ("In the Seinfeld episode 'The Beard', which character takes a lie detector test "
               "about watching Melrose Place?")
CLEAN_OPUS5 = "In Seinfeld's 'The Beard', which character takes the polygraph?"

with open(os.path.join(ROOT, "config", "system_prompts", "claude_ai_fable5.txt"),
          encoding="utf-8") as _f:
    SYS_CLAUDE_AI = _f.read().strip().replace("{{currentDateTime}}", "Saturday, July 25, 2026")

PROMPTS = {"verbatim": PROMPT_VERBATIM, "cleaned": PROMPT_CLEANED,
           "clean_repro": CLEAN_REPRO, "clean_opus5": CLEAN_OPUS5}
SYS = {"bare": None, "claudeai": SYS_CLAUDE_AI}
HAIKU_BUDGET = {"low": 2048, "high": 16384}  # crossmodel01's mapping

# (block, model, mode, prompt_key, scaffold, level, n)
CELLS = []
for eff in ("low", "high"):
    CELLS += [
        ("fable_messy_bare", "claude-fable-5", "effort", "verbatim", "bare", eff, 15),
        ("fable_tidied_claudeai", "claude-fable-5", "effort", "cleaned", "claudeai", eff, 15),
    ]
for eff in ("low", "medium", "high", "xhigh"):
    CELLS += [
        ("lookup_2x2", "claude-opus-5", "effort", "clean_repro", "bare", eff, 10),
        ("lookup_2x2", "claude-opus-5", "effort", "clean_opus5", "bare", eff, 10),
        ("lookup_2x2", "claude-opus-4-8", "effort", "clean_opus5", "bare", eff, 10),
    ]
for level in ("none", "low", "high"):
    CELLS += [
        ("sonnet_lookup", "claude-sonnet-4-6", "effort", "clean_repro", "bare", level, 12),
        ("sonnet_tidied", "claude-sonnet-4-6", "effort", "cleaned", "claudeai", level, 12),
        ("haiku_lookup", "claude-haiku-4-5-20251001", "budget", "clean_repro", "bare", level, 12),
        ("haiku_tidied", "claude-haiku-4-5-20251001", "budget", "cleaned", "claudeai", level, 12),
    ]


def build_kwargs(model, mode, prompt_key, scaffold, level):
    kwargs = {"model": model, "messages": [{"role": "user", "content": PROMPTS[prompt_key]}]}
    if mode == "effort":
        if level == "none":
            kwargs["thinking"] = {"type": "disabled"}
            kwargs["max_tokens"] = 1024
        else:
            kwargs["thinking"] = {"type": "adaptive"}
            kwargs["output_config"] = {"effort": level}
            kwargs["max_tokens"] = 16384
    else:  # Haiku budget-token thinking
        if level == "none":
            kwargs["max_tokens"] = 1024
        else:
            b = HAIKU_BUDGET[level]
            kwargs["thinking"] = {"type": "enabled", "budget_tokens": b}
            kwargs["max_tokens"] = b + 1024
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
        block, model, mode, pk, sk, level, i = job
        key = f"{block}|{model}|{pk}|{sk}|{level}|{i}"
        try:
            r = client.messages.create(**build_kwargs(model, mode, pk, sk, level))
            text = "".join(b.text for b in r.content if getattr(b, "type", "") == "text")
            err = None
        except Exception as e:  # noqa: BLE001
            text, err = None, f"{type(e).__name__}: {e}"
        label = "ERR" if err else grade(text)
        with lock:
            out.write(json.dumps({"key": key, "run": RUN_ID, "block": block, "model": model,
                                  "prompt": pk, "system": sk, "level": level, "sample": i,
                                  "label": label, "error": err, "response_text": text,
                                  "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat()},
                                 ensure_ascii=False) + "\n")
            out.flush()
            tally.setdefault((block, model, pk, sk, level), Counter())[label] += 1
            print(f"{key} -> {label}", flush=True)

    jobs = []
    for block, model, mode, pk, sk, level, n in CELLS:
        for i in range(n):
            key = f"{block}|{model}|{pk}|{sk}|{level}|{i}"
            if key not in done:
                jobs.append((block, model, mode, pk, sk, level, i))
    print(f"{len(jobs)} calls to run", flush=True)
    with ThreadPoolExecutor(max_workers=4) as ex:
        list(ex.map(one, jobs))
    out.close()

    print("\n=== FILLGRID01 TALLY ===")
    for k, c in sorted(tally.items()):
        print(f"  {k[0]:22} {k[1]:26} {k[2]:11} {k[3]:9} {k[4]:6} {dict(c)}")


if __name__ == "__main__":
    main()
