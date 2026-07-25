"""Opus 5 replication of the three decisive Opus 4.8 tests (run-id: opus5_01). EXPLORATORY, post-freeze.

claude-opus-5 shipped after the study froze (Opus 4.8 was flagship at freeze). This run asks the
successor the same three questions, with identical stimuli, configs, and sample sizes:

  1. PHRASING block (mirrors phrasing01): anchor item SEIN-001, observer's verbatim messy phrasing
     + cleaned variant, bare vs claude.ai scaffold, low/high effort, n=15/cell.
     Opus 4.8 baseline: verbatim/bare 63% wrongful correction, verbatim/claudeai 47%, cleaned/claudeai 17%.
  2. CONTROL block (mirrors repro01's clean lookup): direct question, no premise. Opus 4.8: 40/40 correct.
  3. SEARCH block (mirrors search01): optional never-executed web_search tool, verbatim phrasing,
     bare/claudeai x low/high, n=12. Opus 4.8: searched 0-17%, danger cell (answered & wrong) 18/48.

Grading heuristics are the same first-named ones as the source runs, and carry the same known
failure mode (name-echo false positives) — ALL rows get read-adjudicated before any number is cited.
"""
import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from run_experiment import load_dotenv  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = "claude-opus-5"
RUN_ID = "opus5_01"

PROMPT_VERBATIM = ("The Melrose palace reference in Seinfeld.  Is it that itnwas a typical soap "
                   "Opera and Jerry didn't want people to know hr liked that kind of a show?")
PROMPT_CLEANED = ("The Melrose Place reference in Seinfeld. Is it that it was a typical soap "
                  "opera and Jerry didn't want people to know he liked that kind of a show?")
PROMPT_CONTROL = "In Seinfeld's 'The Beard', which character takes the polygraph?"

with open(os.path.join(ROOT, "config", "system_prompts", "claude_ai_fable5.txt"),
          encoding="utf-8") as _f:
    SYS_CLAUDE_AI = _f.read().strip().replace("{{currentDateTime}}", "Saturday, July 25, 2026")

SYS = {"bare": None, "claudeai": SYS_CLAUDE_AI}

WEB_SEARCH_TOOL = {
    "name": "web_search",
    "description": "Search the web to look up or verify factual information before answering.",
    "input_schema": {
        "type": "object",
        "properties": {"query": {"type": "string", "description": "The search query"}},
        "required": ["query"],
    },
}

# (block, prompt_key, prompt, scaffold, effort, n, tools?)
CELLS = []
for eff in ("low", "high"):
    CELLS += [
        ("phrasing", "verbatim", PROMPT_VERBATIM, "bare", eff, 15, False),
        ("phrasing", "verbatim", PROMPT_VERBATIM, "claudeai", eff, 15, False),
        ("phrasing", "cleaned", PROMPT_CLEANED, "claudeai", eff, 15, False),
        ("control", "clean_lookup", PROMPT_CONTROL, "bare", eff, 5, False),
        ("search", "verbatim", PROMPT_VERBATIM, "bare", eff, 12, True),
        ("search", "verbatim", PROMPT_VERBATIM, "claudeai", eff, 12, True),
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
    out = open(path, "a", encoding="utf-8")
    from collections import Counter
    tally = {}
    for block, pk, prompt, sk, eff, n, with_tool in CELLS:
        for i in range(n):
            key = f"{block}|{pk}|{sk}|{eff}|{i}"
            if key in done:
                continue
            kwargs = {"model": MODEL, "max_tokens": 16384,
                      "thinking": {"type": "adaptive"},
                      "output_config": {"effort": eff},
                      "messages": [{"role": "user", "content": prompt}]}
            if SYS[sk]:
                kwargs["system"] = SYS[sk]
            if with_tool:
                kwargs["tools"] = [WEB_SEARCH_TOOL]
            searched, query = None, None
            try:
                r = client.messages.create(**kwargs)
                tool_blocks = [b for b in r.content if getattr(b, "type", "") == "tool_use"]
                text = "".join(b.text for b in r.content if getattr(b, "type", "") == "text")
                if with_tool:
                    searched = bool(tool_blocks) or r.stop_reason == "tool_use"
                    query = tool_blocks[0].input.get("query") if tool_blocks else None
                err = None
            except Exception as e:  # noqa: BLE001
                text, err = None, f"{type(e).__name__}: {e}"
            if err:
                label = "ERR"
            elif searched:
                label = "SEARCHED"
            else:
                label = grade(text)
            out.write(json.dumps({"key": key, "run": RUN_ID, "model": MODEL, "block": block,
                                  "prompt": pk, "system": sk, "effort": eff, "sample": i,
                                  "label": label, "searched": searched, "search_query": query,
                                  "error": err, "response_text": text,
                                  "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat()},
                                 ensure_ascii=False) + "\n")
            out.flush()
            tally.setdefault((block, pk, sk, eff), Counter())[label] += 1
            print(f"{key} -> {label}" + (f" q={query!r}" if query else ""))
    out.close()
    print("\n=== OPUS 5 TALLY (vs Opus 4.8: 63/47/17 phrasing, 40/40 control, 0-17% search) ===")
    for k, c in sorted(tally.items()):
        print(f"  {k[0]:9} {k[1]:12} {k[2]:9} {k[3]:5} {dict(c)}")


if __name__ == "__main__":
    main()
