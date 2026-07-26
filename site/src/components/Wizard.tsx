"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MODELS, MODEL_ORDER, TRIALS_PER_SUBMISSION, type ModelId } from "@/lib/models";
import { seedMessyText, type Mode } from "@/lib/prompts";
import { countsAsFailure } from "@/lib/taxonomy";
import { LIMITS } from "@/lib/validate";
import type { SubmitEvent } from "@/lib/types";
import { TakeCard, type Grade } from "./TakeCard";
import { coarseFingerprint, readTurnstileToken, resetTurnstile, Turnstile } from "./Turnstile";

interface TakeState {
  trialIdx: number;
  trialId: string;
  text: string;
  latencyMs: number;
  failed?: string;
}

interface StatusState {
  open: boolean;
  runsLeft: number;
  runsPerDay: number;
  models: Array<{ id: ModelId; open: boolean }>;
}

type Phase = "compose" | "running" | "results";

export function Wizard({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [work, setWork] = useState("");
  const [question, setQuestion] = useState("");
  const [claimedTruth, setClaimedTruth] = useState("");
  const [mode, setMode] = useState<Mode>("quiz");
  const [model, setModel] = useState<ModelId>("claude-sonnet-4-6");
  const [messyText, setMessyText] = useState("");
  const [messyDirty, setMessyDirty] = useState(false);

  const [phase, setPhase] = useState<Phase>("compose");
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [status, setStatus] = useState<StatusState | null>(null);

  const [submissionId, setSubmissionId] = useState("");
  const [caseKey, setCaseKey] = useState("");
  const [takes, setTakes] = useState<TakeState[]>([]);
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [copied, setCopied] = useState(false);
  const refreshedRef = useRef(false);

  // "Run this one yourself" on a gallery card lands here with the fact in the
  // URL. Applied once, so it never fights the visitor's own edits.
  const searchParams = useSearchParams();
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current) return;
    const w = searchParams.get("work");
    const q = searchParams.get("question");
    const t = searchParams.get("truth");
    if (!w && !q && !t) return;
    prefilledRef.current = true;
    if (w) setWork(w.slice(0, LIMITS.work));
    if (q) setQuestion(q.slice(0, LIMITS.question));
    if (t) setClaimedTruth(t.slice(0, LIMITS.claimedTruth));
  }, [searchParams]);

  // What's open today: runs left, and which models still have budget.
  useEffect(() => {
    let alive = true;
    fetch("/api/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data) setStatus(data as StatusState);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Keep the seeded message in step with the fact, until the visitor edits it.
  useEffect(() => {
    if (messyDirty) return;
    setMessyText(seedMessyText(work, claimedTruth, question));
  }, [work, claimedTruth, question, messyDirty]);

  const modelOpen = useCallback(
    (id: ModelId) => status?.models.find((m) => m.id === id)?.open ?? true,
    [status],
  );

  // If today's Opus budget is gone, don't leave the visitor on a dead choice.
  useEffect(() => {
    if (status && !modelOpen(model)) {
      const fallback = MODEL_ORDER.find((id) => modelOpen(id));
      if (fallback) setModel(fallback);
    }
  }, [status, model, modelOpen]);

  const saveGrade = useCallback(
    async (trialId: string, grade: Grade) => {
      setGrades((prev) => ({ ...prev, [trialId]: { ...grade, saved: false } }));
      try {
        const res = await fetch("/api/verdict", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            trialId,
            submissionId,
            verdict: grade.verdict,
            wrongAnswerGiven: grade.wrongAnswerGiven,
            note: grade.note,
          }),
        });
        setGrades((prev) => ({ ...prev, [trialId]: { ...grade, saved: res.ok } }));

        // A case only enters the gallery once it has a grade, so refresh the
        // server-rendered sections after the first one — otherwise the page
        // still says "nothing found yet" directly under the run you just graded.
        if (res.ok && !refreshedRef.current) {
          refreshedRef.current = true;
          router.refresh();
        }
      } catch {
        setGrades((prev) => ({ ...prev, [trialId]: { ...grade, saved: false } }));
      }
    },
    [submissionId, router],
  );

  const run = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setCopied(false);
    setTakes([]);
    setGrades({});
    setSubmissionId("");
    setPhase("running");
    refreshedRef.current = false;

    let res: Response;
    try {
      res = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          model,
          work,
          question,
          claimedTruth,
          messyText: mode === "correction" ? messyText : undefined,
          turnstileToken: readTurnstileToken(formRef.current),
          fingerprint: coarseFingerprint(),
        }),
      });
    } catch {
      setError({ message: "Couldn't reach the server. Check your connection and try again." });
      setPhase("compose");
      return;
    }

    resetTurnstile();

    if (!res.ok || !res.body) {
      let message = "Something went wrong starting that run.";
      let field: string | undefined;
      try {
        const data = (await res.json()) as { message?: string; field?: string };
        if (data.message) message = data.message;
        field = data.field;
      } catch {
        /* keep the default */
      }
      setError({ message, field });
      setPhase("compose");
      return;
    }

    // Consume the SSE stream, placing each take as it lands.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          let ev: SubmitEvent;
          try {
            ev = JSON.parse(line.slice(6)) as SubmitEvent;
          } catch {
            continue;
          }

          if (ev.type === "meta") {
            setSubmissionId(ev.submissionId);
            setCaseKey(ev.caseKey);
            requestAnimationFrame(() =>
              resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
            );
          } else if (ev.type === "take") {
            setTakes((prev) =>
              [
                ...prev.filter((t) => t.trialIdx !== ev.trialIdx),
                {
                  trialIdx: ev.trialIdx,
                  trialId: ev.trialId,
                  text: ev.text,
                  latencyMs: ev.latencyMs,
                },
              ].sort((a, b) => a.trialIdx - b.trialIdx),
            );
          } else if (ev.type === "take_failed") {
            setTakes((prev) =>
              [
                ...prev.filter((t) => t.trialIdx !== ev.trialIdx),
                {
                  trialIdx: ev.trialIdx,
                  trialId: "",
                  text: "",
                  latencyMs: 0,
                  failed: ev.message,
                },
              ].sort((a, b) => a.trialIdx - b.trialIdx),
            );
          } else if (ev.type === "error") {
            setError({ message: ev.message });
          }
        }
      }
    } catch {
      setError({ message: "The connection dropped partway through. Any takes above are yours." });
    }

    setPhase("results");
    setStatus((prev) => (prev ? { ...prev, runsLeft: Math.max(0, prev.runsLeft - 1) } : prev));
  };

  const graded = useMemo(() => Object.values(grades), [grades]);
  const failures = graded.filter((g) => countsAsFailure(g.verdict)).length;
  const spec = MODELS[model];

  const permalink = caseKey
    ? `${typeof window === "undefined" ? "" : window.location.origin}/case/${caseKey}`
    : "";

  const shareText = useMemo(() => {
    if (graded.length === 0) return "";
    const wrongAnswers = Array.from(
      new Set(graded.map((g) => g.wrongAnswerGiven.trim()).filter(Boolean)),
    );
    return [
      `${spec.label} got this wrong ${failures} out of ${graded.length} times:`,
      `"In ${work}, ${question}"`,
      `The answer is ${claimedTruth}.`,
      wrongAnswers.length ? `It said: ${wrongAnswers.join(", ")}.` : "",
      permalink,
    ]
      .filter(Boolean)
      .join("\n");
  }, [graded, failures, spec.label, work, question, claimedTruth, permalink]);

  const closed = status !== null && !status.open;
  const outOfRuns = status !== null && status.runsLeft <= 0 && phase === "compose";
  const busy = phase === "running";

  return (
    <div className="stack">
      {closed ? (
        <div className="notice notice-stop">
          <strong>Today&rsquo;s runs are used up.</strong> This is a personal research project on a
          fixed daily budget, so the box closes when the budget does. It opens again after midnight
          UTC. The <a href="/gallery">gallery</a> has everything found so far.
        </div>
      ) : null}

      <form ref={formRef} onSubmit={run}>
        {/* ── 1. The fact ── */}
        <h2 className="slug">1. The fact</h2>

        <div className="notice" style={{ marginBottom: "1.4rem" }}>
          Pick a mid-tier fact, not the famous one. Deaths, catchphrases and season finales are
          armoured — models know those cold. The sweet spot is the precise structure underneath a
          famous moment: <strong>who actually did the thing, versus who seems like the type</strong>,
          or who really says the line everybody quotes.
        </div>

        <label className="field">
          <span className="field-label">Show, film, book or game</span>
          <input
            className="input"
            value={work}
            maxLength={LIMITS.work}
            required
            placeholder="Friends"
            onChange={(e) => setWork(e.target.value)}
            disabled={busy}
          />
        </label>

        <label className="field">
          <span className="field-label">The question</span>
          <input
            className="input"
            value={question}
            maxLength={LIMITS.question}
            required
            placeholder="who actually pees on Monica's jellyfish sting?"
            onChange={(e) => setQuestion(e.target.value)}
            disabled={busy}
          />
          <span className="field-hint">
            Finishes the sentence &ldquo;In {work.trim() || "…"}, ___&rdquo;
          </span>
        </label>

        <label className="field">
          <span className="field-label">The correct answer</span>
          <input
            className="input"
            value={claimedTruth}
            maxLength={LIMITS.claimedTruth}
            required
            placeholder="Chandler"
            onChange={(e) => setClaimedTruth(e.target.value)}
            disabled={busy}
          />
          <span className="field-hint">
            You are the grader, so be sure. If you turn out to be the one misremembering, the case
            gets published as refuted — which is a real outcome here, not a failure.
          </span>
        </label>

        {/* ── 2. The test ── */}
        <h2 className="slug" style={{ marginTop: "2.6rem" }}>
          2. The test
        </h2>

        <div className="choices choices-2">
          <label className="choice">
            <input
              type="radio"
              name="mode"
              checked={mode === "quiz"}
              onChange={() => setMode("quiz")}
              disabled={busy}
            />
            <span className="choice-name">Just ask it</span>
            <span className="choice-desc">
              We send the plain question and nothing else. Tests whether the model knows the fact at
              all, or invents one.
            </span>
          </label>

          <label className="choice">
            <input
              type="radio"
              name="mode"
              checked={mode === "correction"}
              onChange={() => setMode("correction")}
              disabled={busy}
            />
            <span className="choice-name">Correct it if you dare</span>
            <span className="choice-desc">
              You state the right answer, sloppily, the way you&rsquo;d text a friend. Tests whether
              the model overrules you when you are right. This is the one that found the headline.
            </span>
          </label>
        </div>

        {mode === "correction" ? (
          <label className="field">
            <span className="field-label">Your message, exactly as you&rsquo;d type it</span>
            <textarea
              className="textarea"
              value={messyText}
              maxLength={LIMITS.messyText}
              rows={3}
              onChange={(e) => {
                setMessyText(e.target.value);
                setMessyDirty(true);
              }}
              disabled={busy}
            />
            <span className="field-hint">
              Do not tidy this up. Lowercase, typos, half-remembered — messy phrasing is a
              multiplier, and the message that started this whole study had three typos and a double
              space in it. It has to contain{" "}
              <strong>{claimedTruth.trim() || "your answer"}</strong>, because the test is whether
              the model overrides a correct premise.
            </span>
            <span className="counter">
              {messyText.length}/{LIMITS.messyText}
              {messyDirty ? (
                <>
                  {" · "}
                  <button
                    type="button"
                    className="ghost"
                    style={{ padding: "0.1rem 0.4rem", fontSize: "inherit" }}
                    onClick={() => {
                      setMessyText(seedMessyText(work, claimedTruth, question));
                      setMessyDirty(false);
                    }}
                    disabled={busy}
                  >
                    Reset
                  </button>
                </>
              ) : null}
            </span>
          </label>
        ) : null}

        <div className="choices">
          {MODEL_ORDER.map((id) => {
            const m = MODELS[id];
            const open = modelOpen(id);
            return (
              <label
                key={id}
                className={`choice stock-${m.stock}`}
                data-disabled={!open || undefined}
              >
                <input
                  type="radio"
                  name="model"
                  checked={model === id}
                  onChange={() => setModel(id)}
                  disabled={busy || !open}
                />
                <span className="choice-name">
                  {m.label}
                  <span className="choice-tag">{open ? `${m.stock} pages` : "out of budget"}</span>
                </span>
                <span className="choice-desc">{m.billing}</span>
              </label>
            );
          })}
        </div>

        <Turnstile siteKey={turnstileSiteKey} />

        {error ? (
          <div className="notice notice-stop" style={{ marginBottom: "1.2rem" }}>
            {error.message}
          </div>
        ) : null}

        <div className="row">
          <button
            type="submit"
            className="cta"
            disabled={busy || closed || outOfRuns || !work || !question || !claimedTruth}
          >
            <span className="cta-lamp" />
            {busy ? "Rolling…" : `Roll ${TRIALS_PER_SUBMISSION} takes`}
          </button>
          <span className="mono-note">
            {status
              ? `${status.runsLeft} of ${status.runsPerDay} runs left today`
              : "Checking what's open…"}
          </span>
        </div>

        <p className="field-hint" style={{ marginTop: "0.9rem", maxWidth: "40rem" }}>
          Five takes, because one screenshot is noise in either direction. At a fire rate near one
          in ten, a single answer proves nothing — and neither does a single correct one.
        </p>
      </form>

      {/* ── Takes ── */}
      <div ref={resultsRef}>
        {phase !== "compose" ? (
          <>
            <h2 className="slug" style={{ marginTop: "2.6rem" }}>
              3. The takes
            </h2>

            <div className="takes">
              {Array.from({ length: TRIALS_PER_SUBMISSION }, (_, idx) => {
                const take = takes.find((t) => t.trialIdx === idx);
                if (!take) {
                  return (
                    <div className="take-pending" key={idx}>
                      <span className="rolling" />
                      <span>Take {idx + 1} &mdash; rolling</span>
                    </div>
                  );
                }
                if (take.failed) {
                  return (
                    <div className="take-pending" key={idx}>
                      <span>
                        Take {idx + 1} &mdash; didn&rsquo;t come back. {take.failed}
                      </span>
                    </div>
                  );
                }
                return (
                  <TakeCard
                    key={take.trialId}
                    trialIdx={take.trialIdx}
                    trialId={take.trialId}
                    model={model}
                    text={take.text}
                    latencyMs={take.latencyMs}
                    claimedTruth={claimedTruth}
                    grade={grades[take.trialId]}
                    onGrade={saveGrade}
                  />
                );
              })}
            </div>

            {/* ── Tally ── */}
            {graded.length > 0 ? (
              <div className="tally" style={{ marginTop: "1.4rem" }}>
                <p className="tally-headline">
                  {spec.label} got it wrong {failures} out of {graded.length}{" "}
                  {graded.length === 1 ? "graded take" : "graded takes"}.
                </p>
                <p className="tally-sub">
                  {failures === 0
                    ? "Nothing to see here, which is worth knowing too — most facts are robust. Try a more obscure one, or the same fact on a different model."
                    : graded.length < TRIALS_PER_SUBMISSION
                      ? "Grade the rest of the takes to finish the run."
                      : "Logged. If someone else finds the same thing, this case moves up the queue and we verify it against the script or wiki before publishing it."}
                </p>
                {failures > 0 ? (
                  <div className="row" style={{ marginTop: "1.1rem" }}>
                    <button
                      type="button"
                      className="ghost"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(shareText);
                          setCopied(true);
                        } catch {
                          setCopied(false);
                        }
                      }}
                    >
                      {copied ? "Copied" : "Copy the result"}
                    </button>
                    {caseKey ? (
                      <a
                        className="ghost"
                        href={`/case/${caseKey}`}
                        style={{ textDecoration: "none" }}
                      >
                        This case&rsquo;s page
                      </a>
                    ) : null}
                    <a className="ghost" href="/gallery" style={{ textDecoration: "none" }}>
                      See what others found
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
