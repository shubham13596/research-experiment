/**
 * Flattens a model response into plain text for places that show a short
 * excerpt rather than the record — gallery cards, share text, tooltips.
 *
 * Only markdown emphasis and blockquote markers are removed. The full response
 * is always stored and exported unmodified; this is presentation only.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, " — ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
