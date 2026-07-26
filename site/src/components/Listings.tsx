import { MODELS } from "@/lib/models";
import type { CaseStatus, CaseSummary } from "@/lib/types";

const STATUS_COPY: Record<CaseStatus, { label: string; className: string; blurb: string }> = {
  confirmed: {
    label: "Confirmed",
    className: "badge-confirmed",
    blurb: "Ground truth checked against two independent sources.",
  },
  candidate: {
    label: "Candidate",
    className: "badge-candidate",
    blurb: "Logged from visitor grades. Not yet verified by hand.",
  },
  refuted: {
    label: "Refuted",
    className: "badge-refuted",
    blurb: "Checked, and the model was right. The submitted answer was the wrong one.",
  },
  hidden: { label: "Hidden", className: "badge-hidden", blurb: "" },
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  const copy = STATUS_COPY[status];
  return <span className={`badge ${copy.className}`}>{copy.label}</span>;
}

export function Listing({ row }: { row: CaseSummary }) {
  const quoteStock = row.best_quote_model ? MODELS[row.best_quote_model].stock : "blue";
  const pct = Math.round(row.failure_rate * 100);

  return (
    <article className="listing">
      <div className="listing-top">
        <span className="listing-work">{row.work}</span>
        <StatusBadge status={row.status} />
        <span>
          {row.visitors} {row.visitors === 1 ? "visitor" : "visitors"}
        </span>
        <span>
          wrong {row.failures}/{row.graded} ({pct}%)
        </span>
      </div>

      <p className="listing-q">{row.question}</p>

      <p className="listing-truth">
        Answer: <strong>{row.ground_truth || row.claimed_truth}</strong>
        {row.status === "refuted" ? " — submitted answer, which turned out to be wrong" : ""}
      </p>

      {row.best_quote ? (
        <blockquote className={`listing-quote stock-${quoteStock}`}>
          {row.best_quote}
          {row.best_quote_model ? (
            <footer style={{ marginTop: "0.5rem", color: "var(--ink-faint)" }}>
              — {MODELS[row.best_quote_model].label}
            </footer>
          ) : null}
        </blockquote>
      ) : null}

      <div className="listing-meters">
        {row.per_model
          .slice()
          .sort((a, b) => b.failures - a.failures)
          .map((m) => (
            <span key={m.model_id} className={`meter stock-${MODELS[m.model_id].stock}`}>
              {MODELS[m.model_id].label}{" "}
              <strong>
                {m.failures}/{m.graded}
              </strong>
            </span>
          ))}
      </div>

      {row.citations.length > 0 ? (
        <p className="listing-truth">
          Sources:{" "}
          {row.citations.map((c, i) => (
            <span key={c}>
              {i > 0 ? " · " : ""}
              {/^https?:\/\//.test(c) ? (
                <a href={c} style={{ color: "var(--cue)" }}>
                  {new URL(c).hostname.replace(/^www\./, "")}
                </a>
              ) : (
                c
              )}
            </span>
          ))}
        </p>
      ) : null}

      <p className="mono-note">{STATUS_COPY[row.status].blurb}</p>
    </article>
  );
}
