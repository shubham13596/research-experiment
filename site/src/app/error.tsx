"use client";

import Link from "next/link";

/**
 * Errors state what happened and what to do. They don't apologise, and they
 * don't guess at a cause.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="shell band">
      <p className="slug">Cut</p>
      <h1
        style={{
          fontFamily: "var(--display)",
          fontWeight: 800,
          fontSize: "var(--step-3)",
          lineHeight: 1.02,
          letterSpacing: "-0.03em",
          margin: "0 0 1.2rem",
          maxWidth: "26ch",
        }}
      >
        This page stopped partway through.
      </h1>
      <p className="dim" style={{ maxWidth: "44ch", marginBottom: "2rem" }}>
        Nothing you submitted was lost. Try loading it again; if it keeps
        happening, the gallery and the method page are unaffected.
      </p>
      <div className="row">
        <button type="button" className="cta" onClick={reset}>
          <span className="cta-lamp" />
          Try again
        </button>
        <Link href="/gallery" className="ghost" style={{ textDecoration: "none" }}>
          Go to the gallery
        </Link>
      </div>
    </main>
  );
}
