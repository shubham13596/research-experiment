"""Provider-agnostic API wrappers. One method: sample(prompt, **cfg) -> dict.

Every return dict has: text, model (string the provider reports back), stop_reason,
usage (tokens, provider-shaped), and any provider extras. No retries here beyond
basic rate-limit backoff — the runner handles resumption.

Keys come from the environment: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY.
"""
import time


class ProviderError(Exception):
    pass


def _retry(fn, tries=5, base_delay=5.0):
    last = None
    for attempt in range(tries):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001 - provider SDK exception classes vary
            name = type(e).__name__.lower()
            transient = any(k in name for k in ("rate", "overload", "timeout",
                                                "connection", "internalserver", "apistatus"))
            if not transient or attempt == tries - 1:
                raise
            last = e
            time.sleep(base_delay * (2 ** attempt))
    raise ProviderError(str(last))


class AnthropicProvider:
    name = "anthropic"

    def __init__(self):
        import anthropic
        self.client = anthropic.Anthropic()

    def sample(self, prompt, model, system=None, max_tokens=1024,
               temperature=None, thinking_budget=None, effort=None,
               thinking_max_tokens=16384, **_):
        kwargs = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            kwargs["system"] = system
        if temperature is not None:
            kwargs["temperature"] = temperature
        if effort:
            # adaptive-thinking models (Opus 4.8/4.7, Sonnet 4.6/5): effort is the
            # thinking-depth control; manual budget_tokens 400s on Opus 4.8/4.7.
            kwargs["thinking"] = {"type": "adaptive"}
            kwargs["output_config"] = {"effort": effort}
            # max_tokens is a hard cap on thinking + response combined
            kwargs["max_tokens"] = max(max_tokens, thinking_max_tokens)
        elif thinking_budget:
            kwargs["thinking"] = {"type": "enabled", "budget_tokens": int(thinking_budget)}
            # response must have room for thinking + answer
            kwargs["max_tokens"] = int(thinking_budget) + max_tokens

        resp = _retry(lambda: self.client.messages.create(**kwargs))
        text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
        usage = resp.usage.model_dump() if hasattr(resp.usage, "model_dump") else dict(resp.usage)
        return {"text": text, "model": resp.model, "stop_reason": resp.stop_reason,
                "usage": usage}


class OpenAIProvider:
    name = "openai"

    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI()

    def sample(self, prompt, model, system=None, max_tokens=1024,
               temperature=None, reasoning_effort=None, **_):
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        kwargs = {"model": model, "messages": messages,
                  "max_completion_tokens": max_tokens}
        if temperature is not None:
            kwargs["temperature"] = temperature
        if reasoning_effort:
            kwargs["reasoning_effort"] = reasoning_effort
            # reasoning tokens count against the completion cap; leave headroom
            kwargs["max_completion_tokens"] = max(max_tokens, 8192)

        resp = _retry(lambda: self.client.chat.completions.create(**kwargs))
        choice = resp.choices[0]
        usage = resp.usage.model_dump() if hasattr(resp.usage, "model_dump") else dict(resp.usage)
        return {"text": choice.message.content or "", "model": resp.model,
                "stop_reason": choice.finish_reason, "usage": usage}


class GoogleProvider:
    name = "google"

    def __init__(self):
        from google import genai
        self.client = genai.Client()

    def sample(self, prompt, model, system=None, max_tokens=1024,
               temperature=None, **_):
        from google.genai import types
        cfg = types.GenerateContentConfig(
            max_output_tokens=max_tokens,
            system_instruction=system or None,
            temperature=temperature,
        )
        resp = _retry(lambda: self.client.models.generate_content(
            model=model, contents=prompt, config=cfg))
        usage = None
        if getattr(resp, "usage_metadata", None) is not None:
            um = resp.usage_metadata
            usage = {"input_tokens": getattr(um, "prompt_token_count", None),
                     "output_tokens": getattr(um, "candidates_token_count", None)}
        return {"text": resp.text or "", "model": model, "stop_reason": None,
                "usage": usage}


PROVIDERS = {
    "anthropic": AnthropicProvider,
    "openai": OpenAIProvider,
    "google": GoogleProvider,
}


def get_provider(name, _cache={}):
    if name not in _cache:
        if name not in PROVIDERS:
            raise ProviderError(f"Unknown provider: {name}")
        _cache[name] = PROVIDERS[name]()
    return _cache[name]
