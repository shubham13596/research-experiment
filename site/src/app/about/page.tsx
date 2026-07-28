import type { Metadata } from "next";
import Link from "next/link";
import { Footer, TopRail } from "@/components/Chrome";
import { ANCHOR } from "@/lib/hero";
import { MODELS, MODEL_ORDER, TRIALS_PER_SUBMISSION } from "@/lib/models";
import { VERDICTS } from "@/lib/taxonomy";

export const metadata: Metadata = {
  title: "Method — It's Not a Lie",
  description:
    "How this site runs its tests, what it logs, why visitors do the grading, and what counts as a confirmed case.",
};

export default function AboutPage() {
  return (
    <>
      <TopRail />

      <main className="shell band">
        <p className="slug">Production notes</p>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontWeight: 700,
            fontSize: "var(--step-3)",
            lineHeight: 1.06,
            letterSpacing: "-0.02em",
            margin: "0 0 1.6rem",
            textWrap: "balance",
            maxWidth: "26ch",
          }}
        >
          How this works.
        </h1>

        <div className="prose">
          <p>
            This site is the public arm of a study called <em>Schema-Lure Recall in Frontier
            LLMs</em>. The study found that language models sometimes hold a fluent, wrong version of
            a fact and defend it — including against a user who states the right answer. The effect
            is specific to particular facts, varies sharply between models, and only shows up
            reliably across repeated runs.
          </p>
          <p>
            The point of this site is <strong>replication</strong>. The study covers a handful of
            shows. There are thousands. You know one of them better than any automated grader we
            could write, so the fastest way to find more cases is to let you look.
          </p>

          <h2>What happens when you press the button</h2>
          <p>
            Your fact is sent to one model, {TRIALS_PER_SUBMISSION} times, through the Anthropic API
            from our server. The settings are fixed and recorded with every single response, so any
            result here can be reproduced later by the study&rsquo;s own scripts.
          </p>

          <div className="table-scroll" style={{ margin: "0 0 1.4rem" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Setting</th>
                  <th scope="col">Value</th>
                  <th scope="col">Why</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>System prompt</td>
                  <td>none</td>
                  <td>The raw API. Consumer apps add one, and it changes the results.</td>
                </tr>
                <tr>
                  <td>Temperature</td>
                  <td>not sent</td>
                  <td>Provider default, matching the study. Two of these models reject it anyway.</td>
                </tr>
                <tr>
                  <td>Tools</td>
                  <td>none</td>
                  <td>No web search. We are testing memory, not retrieval.</td>
                </tr>
                <tr>
                  <td>Thinking</td>
                  <td>each model&rsquo;s default</td>
                  <td>Recorded per response, because it differs by model.</td>
                </tr>
                <tr>
                  <td>Runs</td>
                  <td>{TRIALS_PER_SUBMISSION} per submission</td>
                  <td>One answer is noise, in either direction.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            That last row matters more than it looks. Some of these failures fire around one time in
            ten. A single screenshot showing the failure proves very little, and a single screenshot
            showing a correct answer proves just as little — which is why &ldquo;it&rsquo;s fixed
            now&rdquo; posts and &ldquo;it&rsquo;s still broken&rdquo; posts are both usually wrong.
          </p>

          <h2>Why you do the grading</h2>
          <p>
            The study originally scored responses with a keyword rule, and it failed in both
            directions. It flagged models that named a wrong character only in order to correct it.
            Worse, when one model rewrote the scene around characters the rule wasn&rsquo;t looking
            for, it caught <strong>one failure out of thirteen</strong> — the other twelve were
            scored as correct answers.
          </p>
          <p>
            A fan grading their own fandom has neither problem. So the buttons under each take are
            the instrument, and they map onto the failure modes the study documents:
          </p>
          <ul>
            {VERDICTS.map((v) => (
              <li key={v.id}>
                <strong>
                  {v.mark} {v.label}
                </strong>{" "}
                — {v.hint}
                {v.mode !== "—" ? <span className="dim"> ({v.mode})</span> : null}
              </li>
            ))}
          </ul>
          <p>
            Three of those are invisible to name-matching, which is exactly why they went
            under-counted in the first place.
          </p>

          <h2>What makes a case &ldquo;confirmed&rdquo;</h2>
          <p>
            Visitor grades decide <strong>what gets reviewed</strong>, never what is true. When a
            case is graded wrong by two or more independent visitors, it goes into a review queue.
            Confirming it then requires a human reading every response in full and checking the
            ground truth against <strong>two independent sources</strong> — a script or transcript
            plus a reference work. That is the same bar the study&rsquo;s own items use, and no
            automated check can clear it.
          </p>
          <p>
            Sometimes the review finds that the model was right and the visitor was misremembering.
            Those get published too, marked <em>refuted</em>. A replication project that only shows
            its hits isn&rsquo;t one.
          </p>

          <h2>Which models, and why those</h2>
          <ul>
            {MODEL_ORDER.map((id) => (
              <li key={id}>
                <strong>{MODELS[id].label}</strong> — {MODELS[id].billing}
              </li>
            ))}
          </ul>
          <p>
            Only Anthropic models, for now. The study measured these, so results here are comparable
            to numbers that already exist. Adding other vendors without matching the study&rsquo;s
            conditions would produce a table nobody could interpret.
          </p>

          <h2>Picking a fact that will actually work</h2>
          <p>
            Famous facts are armoured. Deaths, catchphrases, finales, the twist everyone quotes — the
            models know those cold. What breaks is the precise structure <em>underneath</em> a famous
            moment.
          </p>
          <p>
            The study&rsquo;s anchor case is a clean example. In {ANCHOR.work}{" "}
            &ldquo;{ANCHOR.episode}&rdquo;, <strong>{ANCHOR.answer}</strong> takes the polygraph — but
            the famous line from that episode belongs to {ANCHOR.lure}, and{" "}
            {ANCHOR.lure} is the character everyone associates with lying. So when a model reaches
            for the scene, the wrong character arrives first with the quote attached. The true fact
            is a stage direction: &ldquo;{ANCHOR.stageDirection}&rdquo; Nobody quotes stage
            directions.
          </p>
          <p>Which gives you a recipe: look for a fact where</p>
          <ul>
            <li>the thing happened to someone other than the obvious candidate,</li>
            <li>a nearby detail — a line, a trait — points at the wrong person, and</li>
            <li>the true version lives somewhere unquotable.</li>
          </ul>

          <h2>What we log</h2>
          <p>
            Your submitted text, the model responses, your grades, a timestamp, and{" "}
            <strong>salted hashes</strong> of your IP address and a coarse device signal, used only
            for the daily run limit. No accounts, no email address, no name, nothing that identifies
            you.
          </p>
          <p>
            Submissions may be published as anonymous research data alongside the study, in the same
            open form as its existing transcripts. If that isn&rsquo;t something you want, don&rsquo;t
            submit — reading the page and the <Link href="/gallery">gallery</Link> logs nothing.
          </p>

          <h2>Limits</h2>
          <p>
            This is one person&rsquo;s research project on a fixed daily budget, not a service. There
            is a cap on runs per visitor per day and a cap on total spend per day. When the budget is
            gone the box closes until midnight UTC and the gallery stays open. Model behaviour also
            changes over time, so every result is stamped with its date and settings, and a case
            confirmed today may not reproduce next month. That is a finding, not a bug.
          </p>

          <h2>Who made this</h2>
          <p>
            Shubham Gupta. The full write-up is{" "}
            <a href="https://shubhamg.bearblog.dev/llms-defend-fluent-memory/">here</a>, and the
            data, code and preregistration are{" "}
            <a href="https://github.com/shubham13596/research-experiment">on GitHub</a>. The findings
            were reported to Anthropic before publication.
          </p>
          <p>
            <strong>This site is not affiliated with, endorsed by, or operated by Anthropic.</strong>{" "}
            It calls their public API the same way any other developer would.
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
