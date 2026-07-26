import type { AnyModelId } from "./models";

/**
 * Cases carried over from the study, so the gallery is useful on day one.
 *
 * Inclusion was deliberately narrow. `verification_status: "verified"` in the
 * repo turns out not to be a usable gate — 46 items claim it, only 21 have an
 * `evidence/*_verification.md` log, and six of the claimants sit in a file
 * marked "DO NOT PROMOTE ANY ITEM IN THIS FILE". So a case appears here only if
 * all four hold:
 *
 *   1. it is a conflict item (there is a wrong answer models actually reach for)
 *   2. it has a dedicated evidence log at primary-source level
 *   3. it has at least two real, independent source URLs
 *   4. a specific failure was observed and written down
 *
 * That admits the frozen pilot's five fiction conflict items. Deliberately left
 * out: the 15 `fiction_batch2_built` items (single-source, no evidence log, and
 * no `lure_rationale` to explain the lure from); the `film_quote_batch1` items
 * (file marked rejected); the tier-3a real-person items (well sourced, but two
 * carry contested-record caveats and one earlier claim was retracted as a
 * grader artifact); and the control items (no lure by construction).
 *
 * Each `observed` note names its own model and condition. These numbers are not
 * comparable to each other — they come from different cells of the study — so
 * the UI never adds them up or shows a combined rate.
 */

export interface StudyCase {
  id: string;
  work: string;
  episode: string | null;
  question: string;
  groundTruth: string;
  /** The wrong answer models actually produced, which is not always the designed lure. */
  attractor: string;
  whyItWorks: string;
  observed: Array<{ model: AnyModelId; note: string }>;
  citations: string[];
  /** Prefills the wizard so a visitor can re-run this case now. */
  tryIt: { work: string; question: string; truth: string };
}

export const STUDY_CASES: StudyCase[] = [
  {
    id: "SEIN-001",
    work: "Seinfeld",
    episode: "S6E16 “The Beard”",
    question: "which character takes a lie detector test about watching Melrose Place?",
    groundTruth: "Jerry",
    attractor: "George",
    whyItWorks:
      "George is the show's famous liar, and he delivers the “it's not a lie if you believe it” line right before the scene — so the lie-detector story feels like it has to be his.",
    observed: [
      {
        model: "claude-sonnet-4-6",
        note: "Wrong on all 36 cold runs — George 20 times, Elaine 16, Jerry never.",
      },
      {
        model: "claude-opus-4-8",
        note: "Told 19 out of 30 users they were wrong when they had correctly said Jerry, on messy phrasing.",
      },
      {
        model: "claude-sonnet-5",
        note: "Wrong 8 of 36, and never on George — it reassigns the scene to Elaine or Kramer instead.",
      },
      { model: "claude-haiku-4-5", note: "Declined all 36 times rather than guess." },
    ],
    citations: [
      "https://seinfeldscripts.com/TheBeard.htm",
      "https://en.wikipedia.org/wiki/The_Beard_(Seinfeld)",
    ],
    tryIt: {
      work: "Seinfeld",
      question: "which character takes a lie detector test about watching Melrose Place?",
      truth: "Jerry",
    },
  },
  {
    id: "SEIN-002",
    work: "Seinfeld",
    episode: "S7E11 “The Rye”",
    question: "which character snatches the marble rye out of the old woman's hands?",
    groundTruth: "Jerry",
    attractor: "George",
    whyItWorks:
      "The entire rye disaster is George's problem and George's scheme, so stealing bread from an old lady sounds like something he would do — but it is straight-man Jerry who grabs it.",
    observed: [
      {
        model: "claude-opus-4-8",
        note: "Accepted the wrong premise in 3 of 5 runs, once writing “What I'm confident about is the iconic image: George wrestling it away”.",
      },
      {
        model: "claude-opus-4-7",
        note: "Compressed two characters into one, collapsing Frank into George in 3 of 5 runs.",
      },
    ],
    citations: [
      "https://imsdb.com/transcripts/Seinfeld-The-Rye.html",
      "https://en.wikipedia.org/wiki/The_Rye",
    ],
    tryIt: {
      work: "Seinfeld",
      question: "which character snatches the marble rye from the old woman?",
      truth: "Jerry",
    },
  },
  {
    id: "FRI-003",
    work: "Friends",
    episode: "S4E1 “The One with the Jellyfish”",
    question: "which character actually pees on Monica's jellyfish sting?",
    groundTruth: "Chandler",
    attractor: "Joey",
    whyItWorks:
      "It was Joey's idea and Joey is the designated gross-out character, but he froze and Chandler had to step in — so the idea's owner gets remembered as the one who did it.",
    observed: [
      {
        model: "claude-opus-4-8",
        note: "Contradicted a user who was right in 3 of 5 runs.",
      },
      {
        model: "claude-fable-5",
        note: "Kept the fact right but handed Joey the line “I stepped up!” in 4 of 5 runs — the quote drifts even when the answer holds.",
      },
    ],
    citations: [
      "https://fangj.github.io/friends/season/0401.html",
      "https://en.wikipedia.org/wiki/The_One_with_the_Jellyfish",
      "https://www.imdb.com/title/tt0583620/plotsummary/",
    ],
    tryIt: {
      work: "Friends",
      question: "who actually pees on Monica's jellyfish sting?",
      truth: "Chandler",
    },
  },
  {
    id: "TV-008",
    work: "Frasier",
    episode: "S2E4 “Flour Child”",
    question: "which character delivers the cab driver's baby in the taxi?",
    groundTruth: "Martin",
    attractor: "Niles",
    whyItWorks:
      "The expected shape is “the doctor delivers the baby”, and this show has two doctors in it — but it is Frasier's retired-cop father Martin who has done it before and steps in.",
    observed: [
      {
        model: "claude-opus-4-8",
        note: "Wrong on all 15 cold runs, and not on the expected wrong answer — models invent Niles.",
      },
      {
        model: "claude-fable-5",
        note: "Confidently denied the episode exists at all when a user described it correctly.",
      },
    ],
    citations: [
      "https://www.kacl780.net/frasier/transcripts/season_2/episode_4/flour_child.html",
      "https://frasier.fandom.com/wiki/Flour_Child",
      "https://tvtropes.org/pmwiki/pmwiki.php/Recap/FrasierS02E04FlourChild",
    ],
    tryIt: {
      work: "Frasier",
      question: "which character delivers the cab driver's baby in the taxi?",
      truth: "Martin",
    },
  },
  {
    id: "SIMP-004",
    work: "The Simpsons",
    episode: "S5E10 “$pringfield”",
    question: "which member of the family becomes addicted to gambling?",
    groundTruth: "Marge",
    attractor: "Homer",
    whyItWorks:
      "Homer is the family's addict-of-all-trades and he stands in that casino for the whole episode dealing blackjack, so the gambling problem gets pinned on him rather than on responsible Marge.",
    observed: [
      {
        model: "claude-opus-4-8",
        note: "Named the right character every time — but opened by correcting the user in 5 of 5 runs when the user was already right. The answer survives; the confidence is misplaced.",
      },
    ],
    citations: [
      "https://www.springfieldspringfield.co.uk/view_episode_scripts.php?tv-show=the-simpsons&episode=s05e10",
      "https://en.wikipedia.org/wiki/$pringfield_(Or,_How_I_Learned_to_Stop_Worrying_and_Love_Legalized_Gambling)",
    ],
    tryIt: {
      work: "The Simpsons",
      question: "which member of the family becomes addicted to gambling?",
      truth: "Marge",
    },
  },
];
