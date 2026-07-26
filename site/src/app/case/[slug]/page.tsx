import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Footer, TopRail } from "@/components/Chrome";
import { CopyLink } from "@/components/CopyLink";
import { StatusBadge } from "@/components/Listings";
import { Transcript, PromptBlock } from "@/components/Transcript";
import { getPublicCase } from "@/lib/db";
import { env } from "@/lib/env";
import { ANCHOR, REVISIONS } from "@/lib/hero";
import { modelDisplay, MODELS } from "@/lib/models";
import { STUDY_CASES, findStudyCase, studyCaseSlug, type StudyCase } from "@/lib/study-cases";
import { verdictSpec } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

/** The five study cases are stable, so prerender them. */
export function generateStaticParams() {
  return STUDY_CASES.map((c) => ({ slug: studyCaseSlug(c.id) }));
}

/** SEIN-001 is the only case with verbatim transcripts on hand. */
const ANCHOR_SLUG = "sein-001";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const study = findStudyCase(slug);
  if (study) {
    return {
      title: `${study.work}: ${study.question} — It's Not a Lie`,
      description: `The answer is ${study.groundTruth}. Models reach for ${study.attractor}. ${study.whyItWorks}`,
      alternates: { canonical: `/case/${slug}` },
    };
  }

  const found = await getPublicCase(slug);
  if (!found) return { title: "Case not found — It's Not a Lie" };

  const { summary } = found;
  const answer = summary.ground_truth || summary.claimed_truth;
  return {
    title: `${summary.work}: ${summary.question} — It's Not a Lie`,
    description: `The answer is ${answer}. Graded wrong ${summary.failures} of ${summary.graded} times by visitors.`,
    alternates: { canonical: `/case/${slug}` },
  };
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = findStudyCase(slug);
  if (study) return <StudyCasePage row={study} slug={slug} />;

  const found = await getPublicCase(slug);
  if (!found) notFound();

  const { summary, responses } = found;
  const answer = summary.ground_truth || summary.claimed_truth;
  const permalink = `${env.siteUrl}/case/${slug}`;
  const tryParams = new URLSearchParams({
    work: summary.work,
    question: summary.question,
    truth: answer,
  });

  return (
    <>
      <TopRail />
      <main className="shell band">
        <p className="slug">
          <Link href="/gallery" style={{ color: "inherit" }}>
            Gallery
          </Link>{" "}
          / found by visitors
        </p>

        <CaseHeading work={summary.work} question={summary.question} />

        <div className="row" style={{ marginBottom: "1.6rem" }}>
          <StatusBadge status={summary.status} />
          <span className="mono-note">
            {summary.visitors} {summary.visitors === 1 ? "visitor" : "visitors"}
          </span>
          <span className="mono-note">
            graded wrong {summary.failures} of {summary.graded} (
            {Math.round(summary.failure_rate * 100)}%)
          </span>
        </div>

        <div className="paper" style={{ marginBottom: "2rem" }}>
          <p className="paper-title">
            <span>The answer</span>
          </p>
          <p className="stagedir">{answer}</p>
          {summary.citations.length > 0 ? (
            <p className="stagedir-note">
              Verified against{" "}
              {summary.citations.map((c, i) => (
                <span key={c}>
                  {i > 0 ? " and " : ""}
                  <a href={c} style={{ color: "var(--ink)" }}>
                    {hostOf(c)}
                  </a>
                </span>
              ))}
              .
            </p>
          ) : (
            <p className="stagedir-note">
              Submitted by a visitor and not yet checked by hand. Until someone reads the responses
              in full and confirms this against two independent sources, treat it as a lead rather
              than a finding.
            </p>
          )}
        </div>

        <PerModel rows={summary.per_model} />

        {responses.length > 0 ? (
          <section style={{ marginTop: "2.4rem" }}>
            <h2 className="slug">What the models said</h2>
            <div className="takes">
              {responses.map((r, i) => {
                const spec = verdictSpec(r.verdict);
                return (
                  <article key={i} className={`revision stock-${MODELS[r.model_id].stock}`}>
                    <header className="revision-head">
                      <span className="revision-stock-name">{MODELS[r.model_id].label}</span>
                      <span>
                        {spec.mark} {spec.label}
                        {r.wrong_answer_given ? ` · said “${r.wrong_answer_given}”` : ""}
                      </span>
                    </header>
                    <PromptBlock text={r.prompt} />
                    <Transcript text={r.text} />
                    {r.note ? (
                      <p className="transcript transcript-closer">
                        Visitor&rsquo;s note: {r.note}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
            <p className="mono-note" style={{ marginTop: "0.9rem" }}>
              Grades are the visitor&rsquo;s own. Responses are exactly what the API returned.
            </p>
          </section>
        ) : null}

        <CaseActions permalink={permalink} tryHref={`/?${tryParams.toString()}#try`} />
      </main>
      <Footer />
    </>
  );
}

// ─── Study case ──────────────────────────────────────────────────────────────

function StudyCasePage({ row, slug }: { row: StudyCase; slug: string }) {
  const permalink = `${env.siteUrl}/case/${slug}`;
  const tryParams = new URLSearchParams({
    work: row.tryIt.work,
    question: row.tryIt.question,
    truth: row.tryIt.truth,
  });
  const isAnchor = slug === ANCHOR_SLUG;

  return (
    <>
      <TopRail />
      <main className="shell band">
        <p className="slug">
          <Link href="/gallery" style={{ color: "inherit" }}>
            Gallery
          </Link>{" "}
          / from the original study / {row.id}
        </p>

        <CaseHeading work={row.work} question={row.question} episode={row.episode} />

        <div className="row" style={{ marginBottom: "1.6rem" }}>
          <span className="badge badge-confirmed">Verified</span>
          <span className="mono-note">{row.id}</span>
        </div>

        <div className="paper" style={{ marginBottom: "2rem" }}>
          <p className="paper-title">
            <span>The answer</span>
            {row.episode ? <span>{row.episode}</span> : null}
          </p>
          <p className="stagedir">{isAnchor ? ANCHOR.stageDirection : row.groundTruth}</p>
          <p className="stagedir-note">
            {isAnchor
              ? `The answer is ${row.groundTruth}, and it is a stage direction — which is why it is almost never quoted. Models reach for ${row.attractor} instead. `
              : `Models reach for ${row.attractor} instead. `}
            {row.whyItWorks}
          </p>
          <p className="stagedir-note">
            Verified against{" "}
            {row.citations.map((c, i) => (
              <span key={c}>
                {i > 0 ? (i === row.citations.length - 1 ? " and " : ", ") : ""}
                <a href={c} style={{ color: "var(--ink)" }}>
                  {hostOf(c)}
                </a>
              </span>
            ))}
            .
          </p>
        </div>

        <section>
          <h2 className="slug">What was observed</h2>
          <div className="stack-tight">
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
          <p className="mono-note" style={{ marginTop: "0.9rem", maxWidth: "56ch" }}>
            Each line is its own condition — different phrasing, different surface, different
            thinking setting. They are not comparable to each other and are never combined.
          </p>
        </section>

        {/* The anchor case is the only one with committed transcripts. */}
        {isAnchor ? (
          <section style={{ marginTop: "2.4rem" }}>
            <h2 className="slug">The transcripts</h2>
            <div className="takes">
              {REVISIONS.filter((r) => r.errors.length > 0).map((rev) => (
                <article
                  key={rev.model}
                  className={`revision stock-${MODELS[rev.model].stock}`}
                >
                  <header className="revision-head">
                    <span className="revision-stock-name">{rev.modelLabel}</span>
                    <span>{rev.source}</span>
                  </header>
                  <p className="mono-note" style={{ marginBottom: "0.9rem" }}>
                    {rev.condition}
                  </p>
                  <PromptBlock text={rev.prompt} />
                  <Transcript text={rev.body} />
                  {rev.closer ? (
                    <p className="transcript transcript-closer">{rev.closer}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <CaseActions permalink={permalink} tryHref={`/?${tryParams.toString()}#try`} />
      </main>
      <Footer />
    </>
  );
}

// ─── Shared pieces ───────────────────────────────────────────────────────────

function CaseHeading({
  work,
  question,
  episode,
}: {
  work: string;
  question: string;
  episode?: string | null;
}) {
  return (
    <>
      <p className="mono-note" style={{ marginBottom: "0.5rem" }}>
        {work.toUpperCase()}
        {episode ? ` · ${episode}` : ""}
      </p>
      <h1
        style={{
          fontFamily: "var(--display)",
          fontWeight: 800,
          fontSize: "var(--step-3)",
          lineHeight: 1.02,
          letterSpacing: "-0.03em",
          margin: "0 0 1.2rem",
          textWrap: "balance",
          maxWidth: "30ch",
        }}
      >
        {question}
      </h1>
    </>
  );
}

function PerModel({ rows }: { rows: Array<{ model_id: keyof typeof MODELS; graded: number; failures: number }> }) {
  if (rows.length === 0) return null;
  return (
    <div className="listing-meters">
      {rows
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
  );
}

function CaseActions({ permalink, tryHref }: { permalink: string; tryHref: string }) {
  return (
    <div className="row" style={{ marginTop: "2.4rem" }}>
      <Link href={tryHref} className="cta" style={{ textDecoration: "none" }}>
        <span className="cta-lamp" />
        Run this one yourself
      </Link>
      <CopyLink url={permalink} label="Copy link to this case" />
      <Link href="/gallery" className="ghost" style={{ textDecoration: "none" }}>
        All cases
      </Link>
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
