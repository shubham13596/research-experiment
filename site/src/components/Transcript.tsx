import type { ReactNode } from "react";

/**
 * Renders a model response.
 *
 * Models answer in markdown, so a raw dump shows `**Chandler**` and a bare `>`
 * for the model's own pull-quotes. Two problems with leaving that raw: the
 * asterisks read as a rendering bug, and `>` would mean both "we sent this" and
 * "the model quoted this" on the same page.
 *
 * So this renders the two things models actually emit here — bold spans and
 * blockquote lines — and leaves every other character exactly as it arrived.
 * Whitespace is preserved by the pre-wrap on `.transcript`, which is why the
 * double space in the study's original messy prompt survives on screen. The
 * unmodified string is what goes to the database and the JSONL export.
 */

interface Block {
  kind: "text" | "quote";
  lines: string[];
}

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split("\n")) {
    const quoted = /^\s*>\s?(.*)$/.exec(raw);
    const kind: Block["kind"] = quoted ? "quote" : "text";
    const line = quoted ? quoted[1] : raw;
    const last = blocks[blocks.length - 1];
    if (last && last.kind === kind) last.lines.push(line);
    else blocks.push({ kind, lines: [line] });
  }
  return blocks.filter((b) => b.lines.join("").trim().length > 0);
}

/** Only `**bold**`. Anything else stays literal. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/\*\*([^*\n]+)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={`${keyPrefix}-${i}`}>{part}</strong> : part,
  );
}

export function Transcript({ text }: { text: string }) {
  if (!text.trim()) {
    return <p className="transcript dim">(The model returned nothing.)</p>;
  }

  const blocks = toBlocks(text);

  return (
    <>
      {blocks.map((block, i) => (
        <p
          key={i}
          className={
            block.kind === "quote"
              ? "transcript transcript-quote"
              : i === 0
                ? "transcript"
                : "transcript transcript-para"
          }
        >
          {inline(block.lines.join("\n").replace(/\n+$/, ""), String(i))}
        </p>
      ))}
    </>
  );
}

/**
 * The prompt we sent. Labelled rather than marked with a character, so it can't
 * be confused with a quote the model itself wrote.
 */
export function PromptBlock({ text, label = "Sent to the model" }: { text: string; label?: string }) {
  return (
    <div className="prompt-block">
      <span className="prompt-label">{label}</span>
      <p className="transcript">{text}</p>
    </div>
  );
}
