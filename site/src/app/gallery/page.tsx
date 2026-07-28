import Link from "next/link";
import type { Metadata } from "next";
import { Footer, TopRail } from "@/components/Chrome";
import { Listing } from "@/components/Listings";
import { StudyListing } from "@/components/StudyListing";
import { getGallery } from "@/lib/db";
import { STUDY_CASES } from "@/lib/study-cases";
import { MODELS, MODEL_ORDER, type ModelId } from "@/lib/models";
import type { CaseStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery — It's Not a Lie",
  description:
    "Every fandom fact visitors have caught an AI getting wrong, with the transcripts and the sources.",
};

const STATUS_FILTERS: Array<{ value: CaseStatus | "all"; label: string }> = [
  { value: "all", label: "Everything" },
  { value: "confirmed", label: "Confirmed" },
  { value: "candidate", label: "Candidates" },
  { value: "refuted", label: "Refuted" },
];

/**
 * Filtering runs through query parameters and re-renders on the server, so the
 * gallery works with JavaScript off and every filtered view has its own URL to
 * share.
 */
export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; model?: string }>;
}) {
  const params = await searchParams;
  const status = (params.status ?? "all") as CaseStatus | "all";
  const model = params.model as ModelId | undefined;

  const all = await getGallery();
  const rows = all.filter((row) => {
    if (status !== "all" && row.status !== status) return false;
    if (model && !row.per_model.some((m) => m.model_id === model && m.graded > 0)) return false;
    return true;
  });

  const href = (next: { status?: string; model?: string }) => {
    const q = new URLSearchParams();
    const s = next.status ?? status;
    const m = next.model ?? model;
    if (s && s !== "all") q.set("status", s);
    if (m) q.set("model", m);
    const qs = q.toString();
    return qs ? `/gallery?${qs}` : "/gallery";
  };

  const confirmed = all.filter((r) => r.status === "confirmed").length;
  const refuted = all.filter((r) => r.status === "refuted").length;

  return (
    <>
      <TopRail />

      <main className="shell band">
        <p className="slug">Listings</p>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontWeight: 700,
            fontSize: "var(--step-3)",
            lineHeight: 1.06,
            letterSpacing: "-0.02em",
            margin: "0 0 1rem",
            textWrap: "balance",
            maxWidth: "28ch",
          }}
        >
          What visitors have caught.
        </h1>

        <p className="dim" style={{ maxWidth: "54ch", margin: "0 0 2.5rem" }}>
          {STUDY_CASES.length} cases carried over from the original study, plus {all.length} from
          visitors — {confirmed} of those verified against two independent sources, and {refuted}{" "}
          where the model turned out to be right and the visitor didn&rsquo;t. Both are published,
          because a replication project that only shows its hits isn&rsquo;t one.
        </p>

        {/* Cases from the study. Shown first because they are the verified ones. */}
        {status === "all" || status === "confirmed" ? (
          <section style={{ marginBottom: "3rem" }}>
            <h2 className="slug">From the original study</h2>
            <div className="listings">
              {STUDY_CASES.map((row) => (
                <StudyListing key={row.id} row={row} />
              ))}
            </div>
            <p className="mono-note" style={{ marginTop: "0.9rem", maxWidth: "56rem" }}>
              Each result names its own model and condition. They are not comparable to each other —
              they come from different cells of the study — so nothing here is combined into a single
              rate.
            </p>
          </section>
        ) : null}

        <h2 className="slug">Found by visitors</h2>

        <div className="row" style={{ marginBottom: "0.6rem" }}>
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={href({ status: f.value })}
              className="ghost"
              style={{
                textDecoration: "none",
                borderColor: status === f.value ? "var(--cue)" : undefined,
                color: status === f.value ? "var(--cue)" : undefined,
              }}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="row" style={{ marginBottom: "2rem" }}>
          <Link
            href={href({ model: "" })}
            className="ghost"
            style={{
              textDecoration: "none",
              borderColor: !model ? "var(--cue)" : undefined,
              color: !model ? "var(--cue)" : undefined,
            }}
          >
            All models
          </Link>
          {MODEL_ORDER.map((id) => (
            <Link
              key={id}
              href={href({ model: id })}
              className={`ghost stock-${MODELS[id].stock}`}
              style={{
                textDecoration: "none",
                borderLeft: "4px solid var(--stock)",
                borderColor: model === id ? "var(--cue)" : undefined,
                borderLeftColor: "var(--stock)",
                color: model === id ? "var(--cue)" : undefined,
              }}
            >
              {MODELS[id].label}
            </Link>
          ))}
        </div>

        {rows.length > 0 ? (
          <div className="listings">
            {rows.map((row) => (
              <Listing key={row.case_key} row={row} />
            ))}
          </div>
        ) : (
          <div className="notice">
            {all.length === 0 ? (
              <>
                <strong>No visitor cases yet.</strong> The five above came from the study itself.
                The first community one could be yours — <Link href="/">go and break something</Link>.
              </>
            ) : (
              <>
                <strong>Nothing matches that filter.</strong>{" "}
                <Link href="/gallery">Clear the filters.</Link>
              </>
            )}
          </div>
        )}

        <p className="mono-note" style={{ marginTop: "2rem", maxWidth: "52rem" }}>
          Percentages are visitor self-reports across whatever conditions those visitors chose. They
          rank cases for review; they are not measurements. The measured rates live in the{" "}
          <a href="https://shubhamg.bearblog.dev/llms-defend-fluent-memory/">write-up</a>.
        </p>
      </main>

      <Footer />
    </>
  );
}
