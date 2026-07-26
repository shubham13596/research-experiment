/**
 * Verdict taxonomy. Maps 1:1 onto the six failure modes in the study writeup,
 * plus a non-failure bucket for refusals and hedges.
 *
 * The visitor grades, not a keyword matcher. The study's keyword grader
 * produced both false positives (name-echo: models repeating a wrong name in
 * order to correct it) and false negatives (it caught 1 of 13 Sonnet 5
 * reassignments, because the rewrites starred characters the rule couldn't
 * see). A fan grading their own fandom has neither failure mode.
 */

export type Verdict =
  | "right"
  | "wrong_fact"
  | "invented_details"
  | "denied_existence"
  | "refused_hedged";

export interface VerdictSpec {
  id: Verdict;
  mark: string;
  label: string;
  /** Shown under the button. Plain language, no jargon. */
  hint: string;
  /** Which study failure mode this records. */
  mode: string;
  /** Counts toward the "got it wrong" tally. */
  countsAsFailure: boolean;
  /** Prompts for the "who did it say instead?" field. */
  asksWhat: boolean;
}

export const VERDICTS: VerdictSpec[] = [
  {
    id: "right",
    mark: "✓",
    label: "Right",
    hint: "Correct answer, no invented extras",
    mode: "—",
    countsAsFailure: false,
    asksWhat: false,
  },
  {
    id: "wrong_fact",
    mark: "✗",
    label: "Wrong answer",
    hint: "Named the wrong character or got the fact wrong",
    mode: "stereotype wins / planted-error acceptance",
    countsAsFailure: true,
    asksWhat: true,
  },
  {
    id: "invented_details",
    mark: "≠",
    label: "Right, but invented details",
    hint: "Correct answer wrapped in made-up quotes, names or episodes",
    mode: "famous version steamrolls the precise one",
    countsAsFailure: true,
    asksWhat: true,
  },
  {
    id: "denied_existence",
    mark: "∅",
    label: "Said it never happened",
    hint: "Denied the scene exists, or called your fact unverifiable",
    mode: "existence denial / unverifiable-ing",
    countsAsFailure: true,
    asksWhat: false,
  },
  {
    id: "refused_hedged",
    mark: "?",
    label: "Wouldn't answer",
    hint: "Declined, hedged, or asked to search instead",
    mode: "decline (not a failure)",
    countsAsFailure: false,
    asksWhat: false,
  },
];

export const VERDICT_IDS = VERDICTS.map((v) => v.id);

export function isVerdict(v: unknown): v is Verdict {
  return typeof v === "string" && (VERDICT_IDS as string[]).includes(v);
}

export function verdictSpec(id: Verdict): VerdictSpec {
  return VERDICTS.find((v) => v.id === id)!;
}

export function countsAsFailure(id: Verdict): boolean {
  return verdictSpec(id).countsAsFailure;
}
