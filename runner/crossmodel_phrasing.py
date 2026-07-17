"""Cross-model parametric-memory test on the observer's verbatim phrasing.

Fills in the capability ladder (Haiku -> Sonnet -> Opus 4.8 -> Fable) on the stimulus that
breaks Opus 4.8. NO TOOLS ARE PASSED => no web search => pure parametric recall. This is the
clean test the chat surface could not give: on claude.ai, Sonnet/Haiku answered correctly by
web-searching; here they must answer from memory.

Thinking levels per model (APIs differ):
  - Sonnet 4.6 (effort model): none = thinking disabled; low/high = effort low/high + adaptive.
  - Haiku 4.5 (NO effort support): none = no thinking; low/high = extended thinking budget_tokens.

Also records simple hedging markers, to probe the calibration question: is a wrong answer
delivered confidently (no hedge) or tentatively? (Confident-wrong is the dangerous case, and the
hypothesis for why chat-Opus didn't self-trigger web search.)
"""
import datetime
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from run_experiment import load_dotenv  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = 12

PROMPT_VERBATIM = ("The Melrose palace reference in Seinfeld.  Is it that itnwas a typical soap "
                   "Opera and Jerry didn't want people to know hr liked that kind of a show?")

with open(os.path.join(ROOT, "config", "system_prompts", "claude_ai_fable5.txt"),
          encoding="utf-8") as _f:
    SYS_CLAUDE_AI = _f.read().strip().replace("{{currentDateTime}}", "Friday, July 17, 2026")

MODELS = {
    "sonnet-4.6": {"model": "claude-sonnet-4-6", "mode": "effort"},
    "haiku-4.5": {"model": "claude-haiku-4-5-20251001", "mode": "budget"},
}
SCAFFOLDS = {"bare": None, "claudeai": SYS_CLAUDE_AI}
THINK = ["none", "low", "high"]
BUDGET = {"low": 2048, "high": 16384}

HEDGE = re.compile(r"\b(i think|i believe|i'?m not (sure|certain)|not (entirely )?sure|"
                   r"if i recall|might be|may be|possibly|i could be (wrong|mistaken)|"
                   r"pretty sure|as far as i (recall|remember))\b", re.I)


def build_thinking(mode, level, max_tokens):
    """Return (kwargs_thinking, kwargs_outputcfg, max_tokens) pieces for the call."""
    if mode == "effort":
        if level == "none":
            return {"type": "disabled"}, None, max_tokens
        return {"type": "adaptive"}, {"effort": level}, max(max_tokens, 16384)
    else:  # budget (Haiku): no effort param
        if level == "none":
            return None, None, max_tokens
        b = BUDGET[level]
        return {"type": "enabled", "budget_tokens": b}, None, b + max_tokens


def grade(text):
    t = (text or "").lower()
    if not t.strip():
        return "EMPTY"
    ji, gi = t.find("jerry"), t.find("george")
    if ji == -1 and gi == -1:
        return "OTHER"
    if gi == -1:
        return "Jerry"
    if ji == -1:
        return "GEORGE"
    return "Jerry" if ji < gi else "GEORGE"


def main():
    load_dotenv()
    import anthropic
    client = anthropic.Anthropic()
    out_dir = os.path.join(ROOT, "transcripts", "crossmodel01")
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
    for mkey, mc in MODELS.items():
        for skey, sys_prompt in SCAFFOLDS.items():
            for level in THINK:
                for i in range(N):
                    key = f"{mkey}|{skey}|{level}|{i}"
                    if key in done:
                        continue
                    think, ocfg, mx = build_thinking(mc["mode"], level, 1024)
                    kwargs = {"model": mc["model"], "max_tokens": mx,
                              "messages": [{"role": "user", "content": PROMPT_VERBATIM}]}
                    if think is not None:
                        kwargs["thinking"] = think
                    if ocfg is not None:
                        kwargs["output_config"] = ocfg
                    if sys_prompt:
                        kwargs["system"] = sys_prompt
                    try:
                        r = client.messages.create(**kwargs)
                        text = "".join(b.text for b in r.content if getattr(b, "type", "") == "text")
                        err = None
                    except Exception as e:  # noqa: BLE001
                        text, err = None, f"{type(e).__name__}: {e}"
                    label = grade(text)
                    hedged = bool(text and HEDGE.search(text))
                    out.write(json.dumps({"key": key, "model_key": mkey, "model": mc["model"],
                                          "scaffold": skey, "think": level, "sample": i,
                                          "label": label, "hedged": hedged, "error": err,
                                          "response_text": text,
                                          "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat()},
                                         ensure_ascii=False) + "\n")
                    out.flush()
                    tally.setdefault((mkey, skey, level), Counter())[label] += 1
                    print(f"{key} -> {label}{' [hedged]' if hedged else ''}{' ERR' if err else ''}")
    out.close()
    print("\n=== TALLY ===")
    for k, c in tally.items():
        print(f"  {k[0]:11} {k[1]:9} {k[2]:5}  {dict(c)}")


if __name__ == "__main__":
    main()
