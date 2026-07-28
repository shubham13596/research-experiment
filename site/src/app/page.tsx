import Link from "next/link";
import { Footer, TopRail } from "@/components/Chrome";
import { HeroScript } from "@/components/HeroScript";
import { Wizard } from "@/components/Wizard";
import { Listing } from "@/components/Listings";
import { StudyListing } from "@/components/StudyListing";
import { getGallery } from "@/lib/db";
import { env } from "@/lib/env";
import { ANCHOR } from "@/lib/hero";
import { STUDY_CASES } from "@/lib/study-cases";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const gallery = await getGallery();
  const teaser = gallery.slice(0, 3);

  return (
    <>
      <TopRail />

      <main>
        {/* ── Cold open — the pitch in one screen ── */}
        <section className="shell band-tight">
          <p className="slug">Cold open</p>
          <h1
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: "clamp(2.4rem, 1.5rem + 3.1vw, 4.5rem)",
              lineHeight: 0.98,
              letterSpacing: "-0.035em",
              margin: "0 0 1.4rem",
              textWrap: "balance",
              maxWidth: "32ch",
            }}
          >
            AI models have a favourite wrong answer. They will defend it — including from you.
          </h1>
          <p className="hero-question">&ldquo;{ANCHOR.question}&rdquo;</p>
          <p className="hero-answer" style={{ marginBottom: "1.2rem" }}>
            The correct answer is <strong>{ANCHOR.answer}</strong>. Four of the six Claude models
            we tested say <strong>{ANCHOR.lure}</strong> — and stand by it when you correct them.{" "}
            <a href="#evidence">The transcripts are below.</a> First, try to catch one yourself.
          </p>
        </section>

        {/* ── Your turn — the interesting part, so it comes first ── */}
        <section className="shell band-tight" id="try">
          <p className="slug">Your turn</p>
          <h2
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: "var(--step-3)",
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              margin: "0 0 1rem",
              textWrap: "balance",
              maxWidth: "30ch",
            }}
          >
            Bring a fact you know cold.
          </h2>
          <p className="dim" style={{ maxWidth: "52ch", margin: "0 0 2.5rem" }}>
            You know your fandom better than any grader we could write, so you do the grading. We
            run your fact five times against one model, at fixed settings, and log what comes back.
            If several people find the same failure, we check it against the script or the wiki and
            publish it with citations.
          </p>

          <Wizard turnstileSiteKey={env.turnstileSiteKey} />
        </section>

        {/* ── The evidence ── */}
        <section className="shell band" id="evidence" style={{ borderTop: "var(--rule)" }}>
          <p className="slug">The evidence</p>
          <p className="dim" style={{ fontSize: "var(--step-1)", maxWidth: "52ch", margin: "0 0 2.5rem" }}>
            One question from a 1995 Seinfeld episode, the page of the shooting script that answers
            it, and what six Claude models said — every excerpt byte-exact from the study&rsquo;s
            transcripts.
          </p>

          <HeroScript />
        </section>

        {/* ── Gallery teaser ── */}
        <section className="shell band" style={{ borderTop: "var(--rule)" }}>
          <p className="slug">Known broken facts</p>
          <p className="dim" style={{ maxWidth: "52ch", margin: "-0.6rem 0 2rem" }}>
            Five cases from the study, each verified against two independent sources. Every one is
            runnable here in a single click — a good way to see the effect before hunting your own.
          </p>

          <div className="listings" style={{ marginBottom: "1.5rem" }}>
            {STUDY_CASES.slice(0, 3).map((row) => (
              <StudyListing key={row.id} row={row} />
            ))}
          </div>

          {teaser.length > 0 ? (
            <>
              <p className="slug" style={{ marginTop: "2.6rem" }}>
                Found by visitors
              </p>
              <div className="listings" style={{ marginBottom: "1.5rem" }}>
                {teaser.map((row) => (
                  <Listing key={row.case_key} row={row} />
                ))}
              </div>
            </>
          ) : null}

          <Link href="/gallery" className="ghost" style={{ textDecoration: "none" }}>
            {gallery.length > 0
              ? `All ${STUDY_CASES.length + gallery.length} cases`
              : "See all five, and the sources"}
          </Link>
        </section>
      </main>

      <Footer />
    </>
  );
}
