"use client";

import { useCallback, useEffect, useState } from "react";
import { Transcript } from "@/components/Transcript";
import { MODELS } from "@/lib/models";
import { verdictSpec } from "@/lib/taxonomy";
import type { CaseStatus, CaseSummary, Submission, Trial, VerdictRow } from "@/lib/types";

type QueueRow = CaseSummary & { ready: boolean; priority: number };
type DetailSubmission = Submission & {
  trials: Array<Trial & { verdict: VerdictRow | null }>;
};

/**
 * Read-adjudication dashboard.
 *
 * The queue ranks by independent visitors times failure rate — the two things
 * that make a case worth a researcher's time. Confirming still means reading
 * every response in full, which is why the detail view shows whole transcripts
 * rather than summaries.
 */
export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [openCase, setOpenCase] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailSubmission[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("inal-admin-token");
    if (saved) setToken(saved);
  }, []);

  const authFetch = useCallback(
    (path: string, init?: RequestInit) =>
      fetch(path, {
        ...init,
        headers: { ...(init?.headers ?? {}), authorization: `Bearer ${token}` },
      }),
    [token],
  );

  const loadQueue = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await authFetch("/api/admin/queue");
      if (!res.ok) {
        setAuthed(false);
        setMessage(res.status === 401 ? "That token was rejected." : "Could not load the queue.");
        return;
      }
      const data = (await res.json()) as { queue: QueueRow[] };
      setQueue(data.queue);
      setAuthed(true);
      sessionStorage.setItem("inal-admin-token", token);
    } finally {
      setBusy(false);
    }
  }, [authFetch, token]);

  const loadDetail = async (caseKey: string) => {
    if (openCase === caseKey) {
      setOpenCase(null);
      setDetail([]);
      return;
    }
    const res = await authFetch(`/api/admin/queue?case=${encodeURIComponent(caseKey)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { submissions: DetailSubmission[] };
    setOpenCase(caseKey);
    setDetail(data.submissions);
  };

  const setStatus = async (row: QueueRow, status: CaseStatus) => {
    let citations: string[] = row.citations;
    let groundTruth = row.ground_truth ?? row.claimed_truth;

    if (status === "confirmed") {
      const entered = window.prompt(
        "Two source URLs or references, separated by a newline or a pipe.\nA script or transcript first, then a reference work.",
        citations.join(" | "),
      );
      if (entered === null) return;
      citations = entered
        .split(/[\n|]/)
        .map((c) => c.trim())
        .filter(Boolean);
      if (citations.length < 2) {
        setMessage("Confirming needs two citations. Nothing was changed.");
        return;
      }
      const truth = window.prompt("Verified correct answer:", groundTruth);
      if (truth === null) return;
      groundTruth = truth.trim();
    }

    const res = await authFetch("/api/admin/queue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        caseKey: row.case_key,
        status,
        citations,
        groundTruth,
        work: row.work,
        question: row.question,
        title: `${row.work} — ${row.question}`.slice(0, 160),
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setMessage(data.message ?? "Could not change that status.");
      return;
    }
    setMessage(`Marked ${status}.`);
    await loadQueue();
  };

  const exportItem = async (row: QueueRow) => {
    const id = window.prompt("Item id for the repo (e.g. COM-001):", "COM-001");
    if (!id) return;
    const res = await authFetch(
      `/api/admin/export-item?case=${encodeURIComponent(row.case_key)}&id=${encodeURIComponent(id)}`,
    );
    if (!res.ok) {
      setMessage("Could not build that item.");
      return;
    }
    downloadBlob(await res.blob(), `${id}.json`);
  };

  const exportData = async () => {
    const res = await authFetch("/api/admin/export-data");
    if (!res.ok) {
      setMessage("Could not build the export.");
      return;
    }
    downloadBlob(await res.blob(), "itsnotalie-submissions.jsonl");
  };

  if (!authed) {
    return (
      <main className="shell-narrow band">
        <p className="slug">Restricted</p>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "var(--step-2)", margin: "0 0 1.4rem" }}>
          Adjudication queue
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void loadQueue();
          }}
        >
          <label className="field">
            <span className="field-label">Admin token</span>
            <input
              className="input"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </label>
          {message ? <div className="notice notice-stop">{message}</div> : null}
          <button type="submit" className="cta" style={{ marginTop: "1rem" }} disabled={!token || busy}>
            <span className="cta-lamp" />
            {busy ? "Checking…" : "Open"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="shell band">
      <p className="slug">Adjudication queue</p>

      <div className="row" style={{ marginBottom: "1.4rem" }}>
        <button type="button" className="ghost" onClick={() => void loadQueue()} disabled={busy}>
          Refresh
        </button>
        <button type="button" className="ghost" onClick={() => void exportData()}>
          Export all submissions (JSONL)
        </button>
        <span className="mono-note push">{queue.length} cases</span>
      </div>

      {message ? (
        <div className="notice" style={{ marginBottom: "1.4rem" }}>
          {message}
        </div>
      ) : null}

      <div className="notice" style={{ marginBottom: "1.4rem" }}>
        <strong>Ready</strong> means two or more independent visitors and a failure rate of 40% or
        more. It is a signal to read the case, not a verdict. Confirming requires reading every
        response and checking two independent sources.
      </div>

      <div className="listings">
        {queue.map((row) => (
          <article className="listing" key={row.case_key}>
            <div className="listing-top">
              <span className="listing-work">{row.work}</span>
              <span className={`badge badge-${row.status}`}>{row.status}</span>
              {row.ready ? (
                <span className="badge badge-candidate">ready to read</span>
              ) : null}
              <span>
                {row.visitors} {row.visitors === 1 ? "visitor" : "visitors"}
              </span>
              <span>
                wrong {row.failures}/{row.graded} ({Math.round(row.failure_rate * 100)}%)
              </span>
              <span>priority {row.priority.toFixed(2)}</span>
            </div>

            <p className="listing-q">{row.question}</p>
            <p className="listing-truth">
              Submitted answer: <strong>{row.claimed_truth}</strong>
            </p>

            <div className="listing-meters">
              {row.per_model.map((m) => (
                <span key={m.model_id} className={`meter stock-${MODELS[m.model_id].stock}`}>
                  {MODELS[m.model_id].label}{" "}
                  <strong>
                    {m.failures}/{m.graded}
                  </strong>
                </span>
              ))}
            </div>

            <div className="row">
              <button type="button" className="ghost" onClick={() => void loadDetail(row.case_key)}>
                {openCase === row.case_key ? "Hide transcripts" : "Read transcripts"}
              </button>
              <button type="button" className="ghost" onClick={() => void setStatus(row, "confirmed")}>
                Confirm
              </button>
              <button type="button" className="ghost" onClick={() => void setStatus(row, "refuted")}>
                Refute
              </button>
              <button type="button" className="ghost" onClick={() => void setStatus(row, "hidden")}>
                Hide
              </button>
              <button type="button" className="ghost" onClick={() => void exportItem(row)}>
                Export repo item
              </button>
            </div>

            {openCase === row.case_key ? (
              <div className="stack-tight" style={{ marginTop: "1rem" }}>
                {detail.map((sub) => (
                  <div key={sub.id}>
                    <p className="mono-note">
                      {new Date(sub.created_at).toISOString().slice(0, 16).replace("T", " ")} ·{" "}
                      {MODELS[sub.model_id].label} · {sub.mode} ·{" "}
                      {String((sub.params as Record<string, unknown>).thinking ?? "")}
                    </p>
                    <p className="transcript" style={{ color: "var(--cue-soft)", marginBottom: "0.6rem" }}>
                      <span className="prompt-label">Sent to the model</span>
                      {sub.messy_text ?? `In ${sub.work}, ${sub.question}`}
                    </p>
                    {sub.trials.map((trial) => (
                      <article
                        key={trial.id}
                        className={`revision stock-${MODELS[sub.model_id].stock}`}
                        style={{ marginBottom: "0.6rem" }}
                      >
                        <header className="revision-head">
                          <span className="revision-stock-name">Take {trial.trial_idx + 1}</span>
                          <span>
                            {trial.verdict
                              ? `${verdictSpec(trial.verdict.verdict).mark} ${verdictSpec(trial.verdict.verdict).label}`
                              : "ungraded"}
                            {trial.verdict?.wrong_answer_given
                              ? ` · said "${trial.verdict.wrong_answer_given}"`
                              : ""}
                          </span>
                        </header>
                        <Transcript text={trial.response_text} />
                        {trial.verdict?.note ? (
                          <p className="transcript transcript-closer">
                            Visitor note: {trial.verdict.note}
                          </p>
                        ) : null}
                        <p className="verdict-saved">
                          {trial.request_id ?? "no request id"} · {trial.input_tokens}→
                          {trial.output_tokens} tokens · {trial.stop_reason ?? "?"}
                        </p>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {queue.length === 0 ? (
        <div className="notice">No graded submissions yet.</div>
      ) : null}
    </main>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
