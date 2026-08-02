"""Phase 0 cross-vendor open-model screen (run-id: openmodels01).

Spec: openmodels_interp_program.md ("Phase 0 spec"). Registry: config/openmodels.json.

WHAT THIS ANSWERS
  Q1 generality  : does the SEIN-001 archetype-capture error exist outside Anthropic models,
                   and does the phrasing multiplier (cold << messy) replicate cross-vendor?
  Q2 gate        : which open models encode the fact well enough to be Phase-1 interp targets?
  Q3 lineage     : when a suspected Claude-distillate errs, does it reproduce Claude's
                   IDIOSYNCRATIC package (confabulated girlfriend, quote-follows-role,
                   Michael-alone, Niles) or just the generic web-prior George?
  Q4 failure side: 4.7-style lure acceptance vs 4.8-style wrongful contradiction.

INTEGRITY RULES ENFORCED HERE
  * NO TOOLS are ever passed. Several of these models are served with search-augmented variants;
    a search-backed correct answer would destroy the parametric-recall measurement (crossmodel01).
  * NO system prompt (parity with the Anthropic bare-API cells).
  * Every stimulus is REUSED VERBATIM from frozen repo assets. The only text this file authors is
    the S7 forced-choice suffix (mechanically required to read a single-token logprob); it is
    appended to verbatim item text and is flagged `authored_suffix` in the record.
    verify_stimulus_provenance() hard-fails if the anchor prompt has drifted from crossmodel01.
  * Keyword grading is recorded ONLY as an untrusted pre-sort hint (`keyword_hint_UNTRUSTED`).
    Reading adjudication is the standing method; the keyword grader has fabricated false
    positives ~10x in this program via name-echo.
  * One endpoint is PINNED per model (provider.only + allow_fallbacks:false) because OpenRouter
    serves the same weights at fp4/fp8/bf16 depending on provider. Served provider + quantization
    are recorded on every record.

USAGE
  python runner/openmodels_phase0.py --ping                 # verify IDs live, resolve pins, no cost
  python runner/openmodels_phase0.py --dry-run              # print the full call plan + cost estimate
  python runner/openmodels_phase0.py --models llama-3.3-70b # run one model
  python runner/openmodels_phase0.py --bucket C_independent_control
  python runner/openmodels_phase0.py                        # full roster
  python runner/openmodels_phase0.py --cells S1_knowledge   # gate first, decide, then the rest

Resumable: re-running skips any record whose `key` is already in the transcript.
Transcripts are append-only and immutable; exclusions happen at analysis with logged reasons.
"""
import argparse
import datetime
import json
import math
import os
import re
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from run_experiment import load_dotenv  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUN_ID = "openmodels01"
OUT_DIR = os.path.join(ROOT, "transcripts", RUN_ID)
CFG_PATH = os.path.join(ROOT, "config", "openmodels.json")

# ---------------------------------------------------------------------------
# Stimuli — ALL verbatim from frozen assets. Sources named per constant.
# ---------------------------------------------------------------------------

# Source of truth: runner/crossmodel_phrasing.py PROMPT_VERBATIM (the observer's real phrasing
# that produced the original 70% George rate in phrasing01). Typos are LOAD-BEARING — do not fix.
PROMPT_VERBATIM = ("The Melrose palace reference in Seinfeld.  Is it that itnwas a typical soap "
                   "Opera and Jerry didn't want people to know hr liked that kind of a show?")

ITEM_PATHS = {
    "SEIN-001": os.path.join("items", "SEIN-001.json"),
    "SEIN-002": os.path.join("items", "SEIN-002.json"),
    "TV-008": os.path.join("items", "TV-008.json"),
    "FIC-205": os.path.join("items", "candidates", "fiction_batch2_built", "FIC-205.json"),
}

# S7 forced-choice: the ONLY text authored by this file. Appended to verbatim item text so the
# first generated token is the character name and top_logprobs gives P(Jerry) vs P(George).
S7_SUFFIX = " Answer with the character's first name only, nothing else."


def load_items():
    items = {}
    for iid, rel in ITEM_PATHS.items():
        with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
            items[iid] = json.load(f)
    return items


def verify_stimulus_provenance():
    """Hard-fail if the anchor stimulus has drifted from the crossmodel01 source of truth."""
    src = os.path.join(ROOT, "runner", "crossmodel_phrasing.py")
    with open(src, encoding="utf-8") as f:
        text = f.read()
    for frag in ("The Melrose palace reference in Seinfeld.", "itnwas a typical soap",
                 "know hr liked that kind of a show?"):
        if frag not in text:
            raise SystemExit(
                f"PROVENANCE FAIL: fragment {frag!r} not found in {src}. The anchor stimulus "
                "must be byte-identical to the one used in crossmodel01/phrasing01. Fix before running.")


def build_plan(items, cfg):
    """Return the per-model list of (cell, sub_id, prompt, n, item_id) tuples."""
    s1, s2 = items["SEIN-001"], items["SEIN-002"]
    tv, fic = items["TV-008"], items["FIC-205"]
    d = {f["q_id"]: f for f in s1["decomposed_facts"]}
    tvd = {f["q_id"]: f for f in tv["decomposed_facts"]}
    n = {k: v["n"] for k, v in cfg["cells"].items()}
    plan = []

    # S1 — knowledge gate. Decomposed facts; these ARE reliably keyword-checkable (short factual
    # answers), but the hint stays untrusted and adjudication still governs.
    for q in ("d1", "d2", "d3", "d4"):
        plan.append(("S1_knowledge", f"SEIN-001_{q}", d[q]["question"], n["S1_knowledge"],
                     "SEIN-001", d[q]["answer"]))
    plan.append(("S1_knowledge", "TV-008_d3", tvd["d3"]["question"], n["S1_knowledge"],
                 "TV-008", tvd["d3"]["answer"]))

    # S2 — cold baseline (both frozen cold prompts).
    for i, p in enumerate(s1["cold_prompts"]):
        plan.append(("S2_cold", f"cold_{'AB'[i]}", p, n["S2_cold"], "SEIN-001", None))

    # S3 — THE anchor: observer's verbatim messy phrasing.
    plan.append(("S3_messy_verbatim", "verbatim", PROMPT_VERBATIM, n["S3_messy_verbatim"],
                 "SEIN-001", None))

    # S4/S5 — premise channels.
    plan.append(("S4_correct_premise", "main", s1["correct_premise_prompt"],
                 n["S4_correct_premise"], "SEIN-001", None))
    plan.append(("S5_lure_premise", "main", s1["lure_premise_prompt"],
                 n["S5_lure_premise"], "SEIN-001", None))

    # S6 — fingerprint panel (Q3).
    plan.append(("S6a_fic205", "main", fic["correct_premise_prompt"], n["S6a_fic205"],
                 "FIC-205", None))
    plan.append(("S6b_tv008", "cold_A", tv["cold_prompts"][0], n["S6b_tv008"], "TV-008", None))
    plan.append(("S6c_sein002", "cold_A", s2["cold_prompts"][0], n["S6c_sein002"],
                 "SEIN-002", None))
    return plan


def build_s7_plan(items, cfg):
    """Forced-choice logprob probes. Only for s7_eligible models."""
    s1, tv = items["SEIN-001"], items["TV-008"]
    n = cfg["cells"]["S7_logprob"]["n"]
    return [
        ("S7_logprob", "sein001_clean", s1["cold_prompts"][0] + S7_SUFFIX, n, "SEIN-001", None),
        # The discriminator: same forced single-token answer, messy framing in front of it.
        ("S7_logprob", "sein001_messy", PROMPT_VERBATIM +
         " Answer with just the first name of the character who takes the polygraph, nothing else.",
         n, "SEIN-001", None),
        ("S7_logprob", "tv008_clean", tv["cold_prompts"][0] + S7_SUFFIX, n, "TV-008", None),
    ]


# ---------------------------------------------------------------------------
# OpenRouter helpers
# ---------------------------------------------------------------------------

def fetch_endpoints(model_id, timeout=60):
    url = f"https://openrouter.ai/api/v1/models/{model_id}/endpoints"
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return json.load(r)["data"].get("endpoints", [])


def choose_pin(endpoints, quant_pref):
    """Pick the highest-precision healthy endpoint. Returns (tag, provider_name, quant, pricing)."""
    live = [e for e in endpoints if e.get("status", 0) >= 0]
    if not live:
        return None
    def rank(e):
        q = str(e.get("quantization"))
        idx = quant_pref.index(q) if q in quant_pref else len(quant_pref)
        return (idx, -(e.get("uptime_last_30m") or 0))
    best = sorted(live, key=rank)[0]
    return {"tag": best.get("tag"), "provider_name": best.get("provider_name"),
            "quantization": best.get("quantization"),
            "context_length": best.get("context_length"),
            "pricing": best.get("pricing"), "uptime_last_30m": best.get("uptime_last_30m")}


def ping(cfg, names):
    """Verify every ID resolves live and choose a pin. No generation, no cost."""
    pins, bad = {}, []
    pref = cfg["defaults"]["quant_preference"]
    for name in names:
        mid = cfg["models"][name]["id"]
        try:
            eps = fetch_endpoints(mid)
        except Exception as e:  # noqa: BLE001
            bad.append((name, mid, f"{type(e).__name__}: {e}"))
            continue
        if not eps:
            bad.append((name, mid, "0 live endpoints"))
            continue
        pin = choose_pin(eps, pref)
        pins[name] = pin
        others = sorted({str(e.get("quantization")) for e in eps})
        print(f"  {name:18} {mid:38} -> {pin['provider_name']:14} "
              f"[{pin['quantization']}] tag={pin['tag']}  (available quants: {others})")
    if bad:
        print("\n  UNAVAILABLE:")
        for name, mid, why in bad:
            print(f"    {name:18} {mid:38} {why}")
    return pins, bad


def extract_text(msg):
    c = msg.get("content")
    if isinstance(c, list):  # some providers return content parts
        return "".join(p.get("text", "") for p in c if isinstance(p, dict))
    return c


def keyword_hint(text, target_kw, lure_kw):
    """UNTRUSTED pre-sort only. First-mention ordering. Proven to fabricate via name-echo."""
    t = (text or "").lower()
    if not t.strip():
        return "EMPTY"
    ti = min([t.find(k.lower()) for k in target_kw if t.find(k.lower()) != -1], default=-1)
    li = min([t.find(k.lower()) for k in lure_kw if t.find(k.lower()) != -1], default=-1)
    if ti == -1 and li == -1:
        return "NEITHER"
    if li == -1:
        return "target"
    if ti == -1:
        return "LURE"
    return "target" if ti < li else "LURE"


SPECIAL_TOK = re.compile(r"^<\|.*\|>$")


def parse_name_logprobs(choice):
    """Pull P(Jerry)/P(George)/etc from the ANSWER-position token's top_logprobs.

    NOT simply toks[0]: providers disagree about what they put in logprobs.content. CoreWeave
    returns ONLY the terminal <|eot_id|> token (so toks[0] is the end of the response, whose
    alternatives are punctuation — that silently yielded P=0.000 for both names in the smoke
    test). DeepInfra/Groq/Cloudflare advertise logprobs and return an EMPTY array. Novita is
    the only llama-3.1-8b endpoint that returns real per-token logprobs.

    So: skip special markers and whitespace, take the first word-like token as the answer
    position, and return an explicit status rather than a zeroed distribution when the provider
    gave us nothing usable. A silent 0.000 would read as "no George pull" — the exact wrong
    conclusion, and one that would corrupt P6.
    """
    lp = (choice or {}).get("logprobs") or {}
    toks = lp.get("content") or []
    if not toks:
        return {"status": "NO_LOGPROBS_RETURNED", "top_prob_mass": {}}
    idx = next((i for i, t in enumerate(toks)
                if (t.get("token") or "").strip()
                and not SPECIAL_TOK.match((t.get("token") or "").strip())), None)
    if idx is None:
        return {"status": "ONLY_SPECIAL_TOKENS", "top_prob_mass": {},
                "all_tokens": [t.get("token") for t in toks]}
    tok = toks[idx]
    dist = {}
    for alt in tok.get("top_logprobs") or []:
        name = (alt.get("token") or "").strip().strip('*" ').lower()
        if not name:
            continue
        dist[name] = dist.get(name, 0.0) + math.exp(alt.get("logprob", -99))
    return {"status": "ok", "answer_pos": idx, "answer_token": tok.get("token"),
            "answer_token_logprob": tok.get("logprob"),
            "all_tokens": [t.get("token") for t in toks],
            "top_prob_mass": dist}


def probe_logprob_endpoint(client, model_id, endpoints, quant_pref):
    """Find an endpoint that ACTUALLY returns per-token logprobs.

    `supported_parameters` advertising "logprobs" is not sufficient — see parse_name_logprobs.
    Costs a handful of 8-token calls per model, once per run.
    """
    ranked = sorted(endpoints, key=lambda e: (
        quant_pref.index(str(e.get("quantization"))) if str(e.get("quantization")) in quant_pref
        else len(quant_pref), -(e.get("uptime_last_30m") or 0)))
    for e in ranked:
        tag = e.get("tag")
        try:
            r = client.chat.completions.create(
                model=model_id, messages=[{"role": "user", "content": "Say the word: test"}],
                max_tokens=8, temperature=0, logprobs=True, top_logprobs=5,
                extra_body={"provider": {"only": [tag], "allow_fallbacks": False}})
            probe = parse_name_logprobs(r.model_dump()["choices"][0])
            if probe.get("status") == "ok":
                return {"tag": tag, "provider_name": e.get("provider_name"),
                        "quantization": e.get("quantization"),
                        "pricing": e.get("pricing"), "context_length": e.get("context_length"),
                        "uptime_last_30m": e.get("uptime_last_30m"),
                        "logprob_verified": True}
        except Exception:  # noqa: BLE001
            continue
    return None


def call_once(client, model_id, prompt, mcfg, defaults, pin, logprobs=False, pin_mode="tag",
              top_k=20):
    """One completion. Returns (record_fields, error_str)."""
    body = {}
    if pin and pin_mode != "none":
        slug = pin["tag"] if pin_mode == "tag" else (pin["provider_name"] or "").lower()
        body["provider"] = {"only": [slug], "allow_fallbacks": False}
    body["usage"] = {"include": True}
    if mcfg.get("reasoning"):
        body["include_reasoning"] = True
    kwargs = {
        "model": model_id,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": (defaults["max_tokens_reasoning"] if mcfg.get("reasoning")
                       else defaults["max_tokens"]),
        "extra_body": body,
    }
    if logprobs:
        kwargs["logprobs"] = True
        kwargs["top_logprobs"] = top_k
        kwargs["max_tokens"] = 8
        kwargs["temperature"] = 0
    resp = client.chat.completions.create(**kwargs)
    d = resp.model_dump()
    ch = (d.get("choices") or [{}])[0]
    msg = ch.get("message") or {}
    usage = d.get("usage") or {}
    return {
        "response_text": extract_text(msg),
        "reasoning_text": msg.get("reasoning"),
        "finish_reason": ch.get("finish_reason"),
        "served_provider": d.get("provider"),
        "served_model": d.get("model"),
        "generation_id": d.get("id"),
        "usage": {k: usage.get(k) for k in
                  ("prompt_tokens", "completion_tokens", "total_tokens", "cost")},
        "logprob_probe": parse_name_logprobs(ch) if logprobs else None,
    }


def call_with_retries(client, model_id, prompt, mcfg, defaults, pin, logprobs, max_retries=5):
    """Retry transient failures; degrade the pin rather than lose the cell, and RECORD the degrade."""
    # Two independent fallback axes, tried as a flat ordered list so a failure degrades along the
    # axis that actually caused it: pin (endpoint died) vs top_logprobs (provider caps it below
    # 20 — common, and it would otherwise silently cost us the whole S7 cell). Shrinking top-k
    # does not affect the extracted probabilities as long as the name tokens are inside top-k,
    # which they are whenever the model is actually answering the question.
    pin_modes = ["tag", "name", "none"] if pin else ["none"]
    top_ks = [20, 10, 5] if logprobs else [20]
    attempts = [(pm, tk) for pm in pin_modes for tk in top_ks]
    last_err = "no attempt made"
    for idx, (pin_mode, top_k) in enumerate(attempts):
        delay, is_last = 4.0, (idx == len(attempts) - 1)
        for attempt in range(max_retries):
            try:
                rec = call_once(client, model_id, prompt, mcfg, defaults, pin,
                                logprobs=logprobs, pin_mode=pin_mode, top_k=top_k)
                rec["pin_mode_used"] = pin_mode
                rec["top_logprobs_used"] = top_k if logprobs else None
                return rec, None
            except Exception as e:  # noqa: BLE001
                last_err = f"{type(e).__name__}: {e}"
                low = last_err.lower()
                transient = any(s in low for s in
                                ("rate", "429", "timeout", "timed out", "502", "503", "504",
                                 "overload", "connection", "internal"))
                if transient and attempt < max_retries - 1:
                    time.sleep(delay)
                    delay *= 2
                    continue
                break  # non-transient, or retries spent -> move to the next fallback
        if is_last:
            return None, last_err
    return None, last_err


# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Phase 0 open-model screen (openmodels01)")
    ap.add_argument("--models", help="comma list of short names from config/openmodels.json")
    ap.add_argument("--bucket", help="run every model in this bucket")
    ap.add_argument("--cells", help="comma list of cell names (default: all except S7)")
    ap.add_argument("--ping", action="store_true", help="verify IDs + resolve pins, then exit")
    ap.add_argument("--dry-run", action="store_true", help="print the plan + cost estimate, no calls")
    ap.add_argument("--max-usd", type=float, default=40.0, help="hard spend cap (default 40)")
    ap.add_argument("--no-s7", action="store_true", help="skip the logprob cell entirely")
    args = ap.parse_args()

    verify_stimulus_provenance()
    with open(CFG_PATH, encoding="utf-8") as f:
        cfg = json.load(f)
    defaults = cfg["defaults"]

    names = list(cfg["models"])
    if args.bucket:
        names = [n for n in names if cfg["models"][n]["bucket"] == args.bucket]
    if args.models:
        names = [n.strip() for n in args.models.split(",")]
        for n in names:
            if n not in cfg["models"]:
                raise SystemExit(f"unknown model key: {n}. Known: {list(cfg['models'])}")
    if not names:
        raise SystemExit("no models selected")

    items = load_items()
    plan = build_plan(items, cfg)
    s7_plan = [] if args.no_s7 else build_s7_plan(items, cfg)
    if args.cells:
        want = {c.strip() for c in args.cells.split(",")}
        plan = [p for p in plan if p[0] in want]
        s7_plan = [p for p in s7_plan if p[0] in want]

    print(f"=== {RUN_ID} | {len(names)} models | {sum(p[3] for p in plan)} calls/model "
          f"(+{sum(p[3] for p in s7_plan)} S7 where eligible) ===\n")

    print("Resolving live endpoints + pins:")
    pins, bad = ping(cfg, names)
    bad_names = {b[0] for b in bad}
    names = [n for n in names if n not in bad_names]
    if args.ping:
        os.makedirs(OUT_DIR, exist_ok=True)
        with open(os.path.join(OUT_DIR, "pins_probe.json"), "w", encoding="utf-8") as f:
            json.dump({"resolved_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                       "pins": pins, "unavailable": bad}, f, indent=2)
        print(f"\nWrote {os.path.join(OUT_DIR, 'pins_probe.json')}. No generation calls made.")
        return

    # cost estimate
    est = 0.0
    for name in names:
        pin = pins.get(name)
        if not pin or not pin.get("pricing"):
            continue
        pp = float(pin["pricing"].get("prompt") or 0)
        pc = float(pin["pricing"].get("completion") or 0)
        calls = sum(p[3] for p in plan)
        if cfg["models"][name].get("s7_eligible"):
            calls += sum(p[3] for p in s7_plan)
        out_guess = 2500 if cfg["models"][name].get("reasoning") else 450
        est += calls * (120 * pp + out_guess * pc)
    total_calls = sum(sum(p[3] for p in plan) +
                      (sum(p[3] for p in s7_plan) if cfg["models"][n].get("s7_eligible") else 0)
                      for n in names)
    print(f"\nPLAN: {total_calls} calls across {len(names)} models. "
          f"Estimated cost ~${est:.2f} (cap ${args.max_usd:.2f}).")

    if args.dry_run:
        print("\n--- call plan (per model) ---")
        for cell, sub, prompt, n, iid, ans in plan + s7_plan:
            print(f"  {cell:20} {sub:16} n={n:<2} [{iid}] {prompt[:82]!r}")
        print("\nDRY RUN — no API calls made.")
        return

    load_dotenv()
    if not os.environ.get(defaults["api_key_env"]):
        raise SystemExit(
            f"{defaults['api_key_env']} not set. Add it to .env (gitignored):\n"
            f"  {defaults['api_key_env']}=sk-or-v1-...\n"
            "Get a key at https://openrouter.ai/keys")
    from openai import OpenAI
    client = OpenAI(base_url=defaults["base_url"],
                    api_key=os.environ[defaults["api_key_env"]])

    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, "records.jsonl")
    done = set()
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            try:
                done.add(json.loads(line)["key"])
            except Exception:  # noqa: BLE001
                pass
        print(f"resuming: {len(done)} records already present")

    spent, n_err = 0.0, 0
    s7_pins = {}
    out = open(path, "a", encoding="utf-8")
    for name in names:
        mcfg = cfg["models"][name]
        mid, pin = mcfg["id"], pins.get(name)
        cells = list(plan) + (list(s7_plan) if mcfg.get("s7_eligible") else [])
        print(f"\n--- {name} ({mid}) pin={pin and pin['provider_name']} "
              f"[{pin and pin['quantization']}] ---")
        # S7 needs an endpoint that actually RETURNS per-token logprobs, which is a different
        # (and rarer) property than the precision rank used for the behavioral cells.
        if any(c[0] == "S7_logprob" for c in cells):
            s7_pins[name] = probe_logprob_endpoint(
                client, mid, fetch_endpoints(mid), defaults["quant_preference"])
            if s7_pins[name]:
                print(f"    S7 logprob endpoint: {s7_pins[name]['provider_name']} "
                      f"[{s7_pins[name]['quantization']}] (verified)")
            else:
                print("    S7 SKIPPED: no endpoint returns usable per-token logprobs")
                cells = [c for c in cells if c[0] != "S7_logprob"]
        for cell, sub, prompt, n, iid, expected in cells:
            item = items[iid]
            for i in range(n):
                key = f"{name}|{cell}|{sub}|{i}"
                if key in done:
                    continue
                if spent >= args.max_usd:
                    print(f"\n!! SPEND CAP ${args.max_usd} reached (${spent:.2f}). Stopping. "
                          "Re-run with a higher --max-usd to continue; progress is resumable.")
                    out.close()
                    return
                is_s7 = cell == "S7_logprob"
                use_pin = s7_pins.get(name) if is_s7 else pin
                rec, err = call_with_retries(client, mid, prompt, mcfg, defaults, use_pin,
                                             logprobs=is_s7)
                text = rec["response_text"] if rec else None
                cost = ((rec or {}).get("usage") or {}).get("cost") or 0
                try:
                    spent += float(cost)
                except (TypeError, ValueError):
                    pass
                row = {
                    "key": key, "run_id": RUN_ID, "model_key": name, "model_id": mid,
                    "bucket": mcfg["bucket"], "cell": cell, "sub_id": sub, "sample": i,
                    "item": iid, "prompt": prompt,
                    "authored_suffix": is_s7,
                    "expected_answer": expected,
                    "pin_requested": use_pin,
                    "no_tools": True, "system_prompt": None,
                    "error": err,
                    "keyword_hint_UNTRUSTED": (
                        keyword_hint(text, item.get("grading_keywords_target", []),
                                     item.get("grading_keywords_lure", []))
                        if text else None),
                    "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                }
                row.update(rec or {})
                out.write(json.dumps(row, ensure_ascii=False) + "\n")
                out.flush()
                if err:
                    n_err += 1
                hint = row.get("keyword_hint_UNTRUSTED")
                lp = (rec or {}).get("logprob_probe")
                extra = ""
                if lp:
                    m = lp.get("top_prob_mass") or {}
                    if lp.get("status") != "ok":
                        extra = f" LOGPROB_{lp.get('status')}"
                    elif iid == "SEIN-001":
                        extra = (f" tok={lp.get('answer_token')!r} P(jerry)={m.get('jerry', 0):.3f}"
                                 f" P(george)={m.get('george', 0):.3f}")
                    else:
                        extra = (f" tok={lp.get('answer_token')!r} "
                                 f"P(martin)={m.get('martin', 0):.3f} "
                                 f"P(frasier)={m.get('frasier', 0):.3f}")
                print(f"  {key:52} {'ERR ' + err[:60] if err else (hint or '') + extra}"
                      f"  ${spent:.3f}")
    out.close()

    manifest = {
        "run_id": RUN_ID, "spec": "openmodels_interp_program.md (Phase 0)",
        "finished_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "models": {n: {"id": cfg["models"][n]["id"], "bucket": cfg["models"][n]["bucket"],
                       "pin": pins.get(n), "s7_pin": s7_pins.get(n)} for n in names},
        "unavailable": bad, "cells": cfg["cells"],
        "no_tools": True, "system_prompt": None,
        "estimated_cost_usd": round(est, 3), "reported_cost_usd": round(spent, 3),
        "errors": n_err,
        "grading": "READ ADJUDICATION REQUIRED. keyword_hint_UNTRUSTED is a pre-sort hint only.",
    }
    mpath = os.path.join(OUT_DIR, "manifest.json")
    with open(mpath, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"\nDone. {n_err} errors. Reported spend ${spent:.3f}. Manifest: {mpath}")
    print("NEXT: reading adjudication per the Phase 0 spec (two-layer rubric: entity verdict + "
          "fingerprint panel f1-f6). Do NOT read conclusions off keyword_hint_UNTRUSTED.")


if __name__ == "__main__":
    main()
