"use client";

import Script from "next/script";

declare global {
  interface Window {
    turnstile?: { reset: (container?: string | HTMLElement) => void };
  }
}

/**
 * Cloudflare Turnstile, implicit rendering. The widget writes its token into a
 * hidden input named cf-turnstile-response, which the form reads on submit.
 *
 * Renders nothing when no site key is configured, so local development doesn't
 * need a Cloudflare account.
 */
export function Turnstile({ siteKey }: { siteKey: string }) {
  if (!siteKey) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-theme="dark"
        data-size="flexible"
        style={{ marginBottom: "1rem" }}
      />
    </>
  );
}

export function readTurnstileToken(form: HTMLFormElement | null): string {
  if (!form) return "";
  const input = form.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]');
  return input?.value ?? "";
}

export function resetTurnstile(): void {
  try {
    window.turnstile?.reset();
  } catch {
    /* widget not loaded; nothing to reset */
  }
}

/**
 * Coarse device signal, used only to make the daily quota harder to sidestep by
 * cycling IPs. Deliberately low-resolution — timezone, language, rounded screen
 * size — so it groups devices rather than identifying one.
 */
export function coarseFingerprint(): string {
  if (typeof window === "undefined") return "";
  const round = (n: number) => Math.round(n / 100) * 100;
  return [
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "?",
    navigator.language ?? "?",
    round(window.screen.width ?? 0),
    round(window.screen.height ?? 0),
    window.devicePixelRatio ?? 1,
    navigator.hardwareConcurrency ?? 0,
  ].join("|");
}
