import { createHash } from "node:crypto";
import { env, hasTurnstile } from "./env";

/** Salted hash. We never store a raw IP or fingerprint. */
export function hashVisitor(value: string): string {
  return createHash("sha256").update(`${env.ipHashSalt}:${value}`).digest("hex").slice(0, 32);
}

/**
 * Client IP. Vercel and Cloudflare both put the real client first in
 * x-forwarded-for; the header is spoofable in general, which is why it is only
 * one of several controls.
 */
export function clientIp(headers: Headers): string {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  ];
  return candidates.find((v) => v && v.length > 0) ?? "unknown";
}

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!hasTurnstile) return true; // Disabled in local dev; warned at boot.
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: env.turnstileSecret, response: token, remoteip: ip }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // A Cloudflare outage shouldn't take the site down; the other controls hold.
    console.error("[its-not-a-lie] Turnstile verification failed to reach Cloudflare.");
    return true;
  }
}

export function isAdmin(headers: Headers): boolean {
  if (!env.adminToken) return false;
  const provided = headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (provided.length !== env.adminToken.length) return false;
  // Constant-time-ish comparison.
  let diff = 0;
  for (let i = 0; i < provided.length; i += 1) {
    diff |= provided.charCodeAt(i) ^ env.adminToken.charCodeAt(i);
  }
  return diff === 0;
}
