import Link from "next/link";
import { modelDisplay } from "@/lib/models";
import { studyCaseSlug, type StudyCase } from "@/lib/study-cases";

/**
 * A case carried over from the study. Deliberately shaped differently from a
 * community card: no visitor count, and no combined percentage — each observed
 * rate comes from a different condition, so adding them up would invent a
 * number the study never measured.
 */
export function StudyListing({ row }: { row: StudyCase }) {
  const params = new URLSearchParams({
    work: row.tryIt.work,
    question: row.tryIt.question,
    truth: row.tryIt.truth,
  });

  return (
    <article className="listing">
      <div className="listing-top">
        <span className="listing-work">{row.work}</span>
        <span className="badge badge-confirmed">Verified</span>
        <span>{row.id}</span>
        {row.episode ? <span>{row.episode}</span> : null}
      </div>

      <p className="listing-q">
        <Link href={`/case/${studyCaseSlug(row.id)}`} className="listing-link">
          {row.question}
        </Link>
      </p>

      <p className="listing-truth">
        Answer: <strong>{row.groundTruth}</strong> &nbsp;·&nbsp; models reach for{" "}
        <strong>{row.attractor}</strong>
      </p>

      <p className="dim" style={{ margin: 0, maxWidth: "62ch", fontSize: "var(--step--1)" }}>
        {row.whyItWorks}
      </p>

      <div className="stack-tight" style={{ gap: "0.35rem" }}>
        {row.observed.map((o) => {
          const model = modelDisplay(o.model);
          return (
            <p key={o.model + o.note} className={`observed stock-${model.stock}`}>
              <span className="observed-model">{model.label}</span>
              {o.note}
            </p>
          );
        })}
      </div>

      <p className="listing-truth">
        Sources:{" "}
        {row.citations.map((c, i) => (
          <span key={c}>
            {i > 0 ? " · " : ""}
            <a href={c} style={{ color: "var(--cue)" }}>
              {hostOf(c)}
            </a>
          </span>
        ))}
      </p>

      <div className="row">
        <Link href={`/?${params.toString()}#try`} className="ghost" style={{ textDecoration: "none" }}>
          Run this one yourself
        </Link>
        <Link
          href={`/case/${studyCaseSlug(row.id)}`}
          className="ghost"
          style={{ textDecoration: "none" }}
        >
          Full case
        </Link>
      </div>
    </article>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
