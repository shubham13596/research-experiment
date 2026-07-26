"use client";

import { useState } from "react";

/**
 * Copies a permalink. Falls back to selecting the text if the clipboard is
 * unavailable, which happens on insecure origins and in some in-app browsers.
 */
export function CopyLink({
  url,
  label = "Copy link",
  copiedLabel = "Copied",
}: {
  url: string;
  label?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        } catch {
          window.prompt("Copy this link:", url);
        }
      }}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
