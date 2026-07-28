"use client";

import { useState } from "react";
import { ANCHOR, LADDER, REVISIONS } from "@/lib/hero";
import { MODELS } from "@/lib/models";
import { PromptBlock, Transcript } from "./Transcript";

/**
 * The hero: one script page holding the true stage direction, and a stack of
 * revision pages holding what each model said instead.
 *
 * Everything here is static, pre-recorded transcript. The page costs nothing to
 * serve, so a visitor who never submits still sees the phenomenon — and the
 * demo can't be knocked out by the daily budget.
 */
export function HeroScript() {
  const [active, setActive] = useState(0);
  const revision = REVISIONS[active];
  const stock = MODELS[revision.model].stock;

  return (
    <div className="stack">
      {/* ── The true page ── */}
      <article className="paper">
        <p className="paper-title">
          <span>{ANCHOR.work}</span>
          <span>&ldquo;{ANCHOR.episode}&rdquo;</span>
          <span>{ANCHOR.season}</span>
          <span>{ANCHOR.aired}</span>
          <span>Shooting script &mdash; white pages</span>
        </p>

        <p className="paper-caption">The proof — a stage direction in the polygraph scene:</p>
        <p className="stagedir">{ANCHOR.stageDirection}</p>

        <p className="stagedir-note">
          That single line is the whole answer: Jerry takes the test. But it is a stage direction,
          so it lives in the script and almost nowhere else — recaps and quote pages never carry
          it. What they carry instead is this exchange, from a different scene, where George is
          telling Jerry how to beat the machine:
        </p>

        <div className="cue-block" aria-label="The episode's famous line, spoken by George">
          <p className="cue-name">George</p>
          <p className="cue-line">
            Jerry, just remember. It&rsquo;s not a lie... if you believe it.
          </p>
        </div>

        <p className="stagedir-note">
          So the famous quote belongs to George, and the polygraph belongs to Jerry. A model
          reconstructing the episode from what people quote pulls both facts toward George — and
          that is exactly the wrong answer it defends.
        </p>
      </article>

      {/* ── Revision pages ── */}
      <section>
        <h2 className="slug">What each model said instead</h2>
        <p className="dim legend-note">
          One tab per model. The colours copy 1990s script practice: every round of revisions was
          printed on a new colour of paper — blue pages, pink pages, goldenrod — so a colour here
          always means the same model, everywhere on this site. White is the unrevised original,
          reserved for the model that never got this wrong.
        </p>

        <div className="tabs" role="tablist" aria-label="Model responses">
          {REVISIONS.map((rev, i) => (
            <button
              key={rev.model}
              type="button"
              role="tab"
              id={`rev-tab-${i}`}
              aria-selected={i === active}
              aria-controls={`rev-panel-${i}`}
              tabIndex={i === active ? 0 : -1}
              className={`tab stock-${MODELS[rev.model].stock}`}
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setActive((a) => (a + 1) % REVISIONS.length);
                if (e.key === "ArrowLeft")
                  setActive((a) => (a - 1 + REVISIONS.length) % REVISIONS.length);
              }}
            >
              {rev.modelLabel}
            </button>
          ))}
        </div>

        <article
          key={revision.model}
          className={`revision stock-${stock}`}
          role="tabpanel"
          id={`rev-panel-${active}`}
          aria-labelledby={`rev-tab-${active}`}
        >
          <header className="revision-head">
            <span className="revision-stock-name">
              {stock} pages &mdash; {revision.modelLabel}
            </span>
            <span>{revision.source}</span>
          </header>

          <p className="mono-note" style={{ marginBottom: "0.9rem" }}>
            {revision.condition}
          </p>

          <PromptBlock text={revision.prompt} />

          <Transcript text={revision.body} />
          {revision.closer ? (
            <p className="transcript transcript-closer">{revision.closer}</p>
          ) : null}

          {revision.errors.length > 0 ? (
            <ul className="notes">
              {revision.errors.map((error) => (
                <li key={error}>
                  <span className="notes-mark">✗</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="notes">
              <li>
                <span className="notes-mark" style={{ color: "var(--ink-soft)" }}>
                  —
                </span>
                <span>
                  Nothing wrong here. It declined instead of guessing, which is the correct
                  behaviour and the rarest.
                </span>
              </li>
            </ul>
          )}

          <p className="verdict-saved">
            {revision.rate} &mdash; {revision.rateNote}
          </p>
        </article>
      </section>

      {/* ── The ladder ── */}
      <section>
        <h2 className="slug">What makes this odd</h2>
        <p className="dim" style={{ marginTop: "-0.6rem", maxWidth: "44rem" }}>
          Getting smarter does not fix this in a straight line. The smallest model is the safest
          because it knows it doesn&rsquo;t know. The failure appears in the middle of the range,
          and the worst version of it — overruling a user who is right — needs a model good enough
          to be confident.
        </p>
        <div className="ladder">
          {LADDER.map((rung) => (
            <div className="ladder-row" key={rung.label}>
              <span className="ladder-model">{rung.label}</span>
              <span className="ladder-note">{rung.note}</span>
              <span className="ladder-outcome">{rung.outcome}</span>
            </div>
          ))}
        </div>
        <p className="mono-note" style={{ marginTop: "0.9rem" }}>
          Rates are from the write-up&rsquo;s flagship table. Each cell is a different condition —
          see the method page before comparing them to each other.
        </p>
      </section>
    </div>
  );
}
