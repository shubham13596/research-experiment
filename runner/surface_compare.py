"""Surface-comparison diagnostic (EXPLORATORY, post-freeze — not part of the frozen protocol).

Question: is the Opus 4.8 'George' failure on SEIN-001 triggered by deployment scaffolding
(system prompt, conversational priming) rather than parametric memory? The clean-API baseline
(run-id repro01) was 40/40 correct. Here we vary ONLY the scaffolding and hold the item,
phrasings, model, effort levels, and n identical.

Conditions (system_prompt x priming), each x 2 cold phrasings x {low,high} effort x n=5:
  S0  none              (baseline; already have from repro01 — re-run here for matched comparison)
  S1  minimal assistant system prompt
  S2  realistic chat-surface-style system prompt (representative, NOT claude.ai's verbatim prompt)
  P   optional neutral Seinfeld conversational priming turn before the question

Writes transcripts/surface01/records.jsonl (append-only). Labels are graded inline (Jerry/George).
"""
import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from run_experiment import load_dotenv  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = 5
EFFORTS = ["low", "high"]
# Models to test the surface effect on: the original-observation model, and the newest model
# (which is the one the claude.ai prompt actually ships with — perfectly-matched condition).
MODELS = ["claude-opus-4-8", "claude-fable-5"]

with open(os.path.join(ROOT, "config", "system_prompts", "claude_ai_fable5.txt"),
          encoding="utf-8") as _f:
    SYS_CLAUDE_AI = _f.read().strip()
# claude.ai substitutes {{currentDateTime}} at runtime; supply a concrete value here.
SYS_CLAUDE_AI = SYS_CLAUDE_AI.replace("{{currentDateTime}}", "Friday, July 17, 2026")

# SEIN-001 cold phrasings (identical to items/SEIN-001.json)
PHRASINGS = {
    "phrasing_A": "In the Seinfeld episode 'The Beard', which character takes a lie detector test about watching Melrose Place?",
    "phrasing_B": "There's a Seinfeld storyline where a character denies watching Melrose Place and is given a polygraph. Which character is it?",
}

SYS_MINIMAL = "You are Claude, a helpful AI assistant."

# Neutral Seinfeld priming exchange (mirrors being mid-conversation about the show). The prior
# assistant turn is FIXED so context is identical across samples. It does NOT mention the
# polygraph or who took it; it does mention George as a famous character (as any real Seinfeld
# chat naturally would) — the point is to test whether that ambient context shifts the answer.
PRIMING = [
    {"role": "user", "content": "I've been rewatching Seinfeld lately. It really holds up. What do you think makes it such a classic?"},
    {"role": "assistant", "content": (
        "It really does hold up! A few things make Seinfeld a classic: it's the definitive "
        "\"show about nothing,\" mining huge comedy out of tiny everyday situations — waiting "
        "for a table, losing a car in a parking garage, close-talkers and low-talkers. The four "
        "leads are all gloriously, unapologetically petty, with no obligation to grow or learn a "
        "lesson. And the plotting is famously tight, with separate storylines converging in the "
        "last act. Do you have a favorite episode or character?"
    )},
]

CONDITIONS = [
    {"id": "S0_none", "system": None, "priming": False},
    {"id": "S1_minimal", "system": SYS_MINIMAL, "priming": False},
    {"id": "S2_claudeai", "system": SYS_CLAUDE_AI, "priming": False},
    {"id": "S2_claudeai_primed", "system": SYS_CLAUDE_AI, "priming": True},
    {"id": "S0_none_primed", "system": None, "priming": True},
]


def grade(text):
    """These are answer-first responses ('That's George...', 'That would be Jerry...'),
    so the FIRST-named character is the asserted answer. This is far more accurate than
    keyword-presence (both names usually appear — one as answer, one as context)."""
    t = (text or "").lower()
    if not t.strip():
        return "EMPTY"
    ji = t.find("jerry")
    gi = t.find("george")
    if ji == -1 and gi == -1:
        return "OTHER"
    if gi == -1:
        return "Jerry(correct)"
    if ji == -1:
        return "GEORGE(lure)"
    return "Jerry(correct)" if ji < gi else "GEORGE(lure)"


def main():
    load_dotenv()
    import anthropic
    client = anthropic.Anthropic()
    out_dir = os.path.join(ROOT, "transcripts", "surface01")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "records.jsonl")
    done = set()
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                try:
                    done.add(json.loads(line)["key"])
                except Exception:
                    pass
    out = open(path, "a", encoding="utf-8")
    tally = {}
    for model in MODELS:
        for cond in CONDITIONS:
            for pk, ptext in PHRASINGS.items():
                for eff in EFFORTS:
                    for i in range(N):
                        key = f"{model}|{cond['id']}|{pk}|{eff}|{i}"
                        if key in done:
                            continue
                        msgs = list(PRIMING) if cond["priming"] else []
                        msgs = msgs + [{"role": "user", "content": ptext}]
                        kwargs = {"model": model, "max_tokens": 16384,
                                  "thinking": {"type": "adaptive"},
                                  "output_config": {"effort": eff}, "messages": msgs}
                        if cond["system"]:
                            kwargs["system"] = cond["system"]
                        try:
                            r = client.messages.create(**kwargs)
                            text = "".join(b.text for b in r.content if getattr(b, "type", "") == "text")
                            err = None
                        except Exception as e:  # noqa: BLE001
                            text, err = None, f"{type(e).__name__}: {e}"
                        label = grade(text)
                        row = {"key": key, "model": model, "condition": cond["id"],
                               "system_used": bool(cond["system"]), "primed": cond["priming"],
                               "phrasing": pk, "effort": eff, "sample": i, "label": label,
                               "error": err, "response_text": text,
                               "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat()}
                        out.write(json.dumps(row, ensure_ascii=False) + "\n")
                        out.flush()
                        tk = (model, cond["id"])
                        tally.setdefault(tk, {})
                        tally[tk][label] = tally[tk].get(label, 0) + 1
                        print(f"{key}  -> {label}")
    out.close()
    print("\n=== TALLY ===")
    for (model, cid), c in tally.items():
        print(f"  {model} / {cid}: {c}")


if __name__ == "__main__":
    main()
