"""Experiment driver. Fresh conversation per sample; transcripts are append-only JSONL.

Examples:
  # dry run: show what would execute, no API calls
  python runner/run_experiment.py --run-id pilot01 --models opus-4.8 --conditions cold --dry-run

  # pilot cold condition (prereg §5): three models, thinking budget high for 4.8
  python runner/run_experiment.py --run-id pilot01 --models opus-4.8:high,opus-4.7,sonnet-4.6 --conditions cold

  # full pilot on one model across all budgets
  python runner/run_experiment.py --run-id pilot01 --models opus-4.8:low,opus-4.8:med,opus-4.8:high,opus-4.8:extra

Model spec: <config-key>[:<budget>] where budget is one of config thinking_budgets
(low/med/high/extra) or 'none'. Default: none (no extended thinking).

Resumable: re-running with the same --run-id skips samples already present in the
transcript file (keyed by item|condition|sub|model|budget|sample_idx). Transcripts
are immutable — never edit them; exclusions happen at analysis with logged reasons.
"""
import argparse
import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from build_prompts import build  # noqa: E402
from providers import get_provider  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_dotenv():
    """Load KEY=VALUE lines from <repo>/.env into os.environ without overriding
    variables already set in the real environment. No external dependency."""
    path = os.path.join(ROOT, ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key, val = key.strip(), val.strip().strip('"').strip("'")
            if key and val and key not in os.environ:
                os.environ[key] = val


def load_config():
    with open(os.path.join(ROOT, "config", "models.json"), encoding="utf-8") as f:
        return json.load(f)


def parse_model_specs(arg, cfg):
    specs = []
    for token in arg.split(","):
        token = token.strip()
        key, _, budget = token.partition(":")
        budget = budget or "none"
        if key not in cfg["models"]:
            sys.exit(f"Unknown model key '{key}' (config/models.json has: {list(cfg['models'])})")
        mc = cfg["models"][key]
        if budget != "none":
            mode = mc.get("thinking_mode")
            if mode in ("effort", "reasoning_effort"):
                valid = cfg["budget_levels"]["effort_map"]
            elif mode == "budget_tokens":
                valid = cfg["budget_levels"]["budget_tokens_map"]
            else:
                sys.exit(f"{key} exposes no thinking control (thinking_mode=null); use budget 'none'")
            if budget not in valid:
                sys.exit(f"Unknown budget '{budget}' for {key} (have: {list(valid)})")
        if not mc.get("verified", False):
            print(f"WARNING: model '{key}' -> '{mc['model']}' is marked verified:false in "
                  f"config/models.json — confirm the API model ID before trusting this run.")
        specs.append((key, budget))
    return specs


def sample_key(rec, model_key, budget, idx):
    return "|".join([rec["item_id"], rec["condition"], rec["sub_id"], model_key, budget, str(idx)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-id", required=True, help="transcripts/<run-id>/ directory")
    ap.add_argument("--models", required=True, help="e.g. opus-4.8:high,opus-4.7,sonnet-4.6")
    ap.add_argument("--conditions", default="cold,decomposed,correct_premise,lure_premise")
    ap.add_argument("--items", default=os.path.join(ROOT, "items", "*.json"))
    ap.add_argument("--n", type=int, default=None, help="samples per cell (default from config)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    load_dotenv()
    cfg = load_config()
    n = args.n or cfg["defaults"]["n_samples"]
    conditions = [c.strip() for c in args.conditions.split(",")]
    specs = parse_model_specs(args.models, cfg)
    _, recs = build(args.items)
    recs = [r for r in recs if r["condition"] in conditions]

    run_dir = os.path.join(ROOT, "transcripts", args.run_id)
    os.makedirs(run_dir, exist_ok=True)
    out_path = os.path.join(run_dir, "records.jsonl")

    done = set()
    if os.path.exists(out_path):
        with open(out_path, encoding="utf-8") as f:
            for line in f:
                try:
                    done.add(json.loads(line)["key"])
                except (json.JSONDecodeError, KeyError):
                    pass

    todo = []
    for model_key, budget in specs:
        for rec in recs:
            for idx in range(n):
                key = sample_key(rec, model_key, budget, idx)
                if key not in done:
                    todo.append((key, model_key, budget, rec, idx))

    print(f"{len(recs)} prompt records x {len(specs)} model specs x n={n} "
          f"= {len(recs) * len(specs) * n} samples ({len(done)} already done, {len(todo)} to run)")
    if args.dry_run:
        for key, *_ in todo[:20]:
            print("  ", key)
        if len(todo) > 20:
            print(f"   ... and {len(todo) - 20} more")
        return

    manifest = {
        "run_id": args.run_id,
        "started_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "models": {k: cfg["models"][k] for k, _ in specs},
        "budget_levels": cfg["budget_levels"],
        "defaults": cfg["defaults"],
        "conditions": conditions,
        "n_samples": n,
        "system_prompt": cfg["defaults"]["system_prompt"],
        "argv": sys.argv,
    }
    with open(os.path.join(run_dir, f"manifest_{datetime.date.today().isoformat()}.json"),
              "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    out = open(out_path, "a", encoding="utf-8")
    for i, (key, model_key, budget, rec, idx) in enumerate(todo, 1):
        mc = cfg["models"][model_key]
        provider = get_provider(mc["provider"])
        call_cfg = {
            "model": mc["model"],
            "system": cfg["defaults"]["system_prompt"],
            "max_tokens": cfg["defaults"]["max_tokens"],
            "temperature": cfg["defaults"]["temperature"],
        }
        if budget != "none":
            mode = mc.get("thinking_mode")
            if mode == "effort":
                call_cfg["effort"] = cfg["budget_levels"]["effort_map"][budget]
                call_cfg["thinking_max_tokens"] = cfg["defaults"].get("thinking_max_tokens", 16384)
            elif mode == "budget_tokens":
                call_cfg["thinking_budget"] = cfg["budget_levels"]["budget_tokens_map"][budget]
            elif mode == "reasoning_effort":
                call_cfg["reasoning_effort"] = cfg["budget_levels"]["effort_map"][budget]
        try:
            result = provider.sample(rec["prompt"], **call_cfg)
            error = None
        except Exception as e:  # noqa: BLE001 - log and continue; rerun resumes
            result = {"text": None, "model": mc["model"], "stop_reason": "ERROR", "usage": None}
            error = f"{type(e).__name__}: {e}"
        row = {
            "key": key,
            "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "model_key": model_key,
            "budget": budget,
            "sample_idx": idx,
            "error": error,
            **rec,
            "response_text": result["text"],
            "response_model": result.get("model"),
            "stop_reason": result.get("stop_reason"),
            "usage": result.get("usage"),
        }
        out.write(json.dumps(row, ensure_ascii=False) + "\n")
        out.flush()
        status = "ERR" if error else "ok"
        print(f"[{i}/{len(todo)}] {status} {key}")
    out.close()
    print(f"Done. Transcripts: {out_path}")


if __name__ == "__main__":
    main()
