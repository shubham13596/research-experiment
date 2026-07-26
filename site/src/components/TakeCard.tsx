"use client";

import { useState } from "react";
import { MODELS, type ModelId } from "@/lib/models";
import { VERDICTS, verdictSpec, type Verdict } from "@/lib/taxonomy";
import { LIMITS } from "@/lib/validate";
import { Transcript } from "./Transcript";

export interface Grade {
  verdict: Verdict;
  wrongAnswerGiven: string;
  note: string;
  saved: boolean;
}

interface TakeCardProps {
  trialIdx: number;
  trialId: string;
  model: ModelId;
  text: string;
  latencyMs: number;
  claimedTruth: string;
  grade: Grade | undefined;
  onGrade: (trialId: string, grade: Grade) => void;
}

/**
 * One take, plus the grading row.
 *
 * The visitor grades, because they know the fandom and we don't. The study's
 * keyword grader failed in both directions here — it flagged models that named
 * a wrong character only to correct it, and it missed rewrites starring
 * characters that weren't in its keyword list.
 */
export function TakeCard({
  trialIdx,
  trialId,
  model,
  text,
  latencyMs,
  claimedTruth,
  grade,
  onGrade,
}: TakeCardProps) {
  const spec = MODELS[model];
  const [wrongAnswer, setWrongAnswer] = useState(grade?.wrongAnswerGiven ?? "");
  const [note, setNote] = useState(grade?.note ?? "");

  const active = grade?.verdict;
  const activeSpec = active ? verdictSpec(active) : null;

  const submit = (verdict: Verdict, over?: { wrongAnswer?: string; note?: string }) => {
    onGrade(trialId, {
      verdict,
      wrongAnswerGiven: over?.wrongAnswer ?? wrongAnswer,
      note: over?.note ?? note,
      saved: false,
    });
  };

  return (
    <article className={`revision stock-${spec.stock}`}>
      <header className="revision-head">
        <span className="take-slate">
          <span className="revision-stock-name">Take {trialIdx + 1}</span>
        </span>
        <span>
          {spec.label} &middot; {(latencyMs / 1000).toFixed(1)}s
        </span>
      </header>

      <Transcript text={text} />

      <div className="verdicts" role="group" aria-label={`Grade take ${trialIdx + 1}`}>
        {VERDICTS.map((v) => (
          <button
            key={v.id}
            type="button"
            className="verdict"
            aria-pressed={active === v.id}
            title={v.hint}
            onClick={() => submit(v.id)}
          >
            <span className="verdict-mark">{v.mark}</span>
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {!active ? (
        <p className="verdict-prompt">
          You said the answer is <strong>{claimedTruth}</strong>. Did this take get it?
        </p>
      ) : null}

      {activeSpec ? (
        <div className="verdict-followup">
          {activeSpec.asksWhat ? (
            <label className="field" style={{ marginBottom: 0 }}>
              <span className="field-label" style={{ color: "var(--ink)" }}>
                What did it say instead?
              </span>
              <input
                className="input"
                value={wrongAnswer}
                maxLength={LIMITS.wrongAnswer}
                placeholder="e.g. George"
                onChange={(e) => setWrongAnswer(e.target.value)}
                onBlur={() => submit(activeSpec.id, { wrongAnswer })}
              />
              <span className="field-hint" style={{ color: "var(--ink-soft)" }}>
                This is the field that tells us what the model would rather believe.
              </span>
            </label>
          ) : null}

          <label className="field" style={{ marginBottom: 0 }}>
            <span className="field-label" style={{ color: "var(--ink)" }}>
              Anything else worth noting? (optional)
            </span>
            <textarea
              className="textarea"
              value={note}
              maxLength={LIMITS.note}
              rows={2}
              placeholder="Invented an episode title, moved a famous line, that sort of thing."
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => submit(activeSpec.id, { note })}
            />
          </label>

          <p className="verdict-saved">
            {grade?.saved ? "Graded — thank you." : "Saving…"}
          </p>
        </div>
      ) : null}
    </article>
  );
}
