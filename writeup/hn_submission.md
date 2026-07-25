# Hacker News submission

**URL:** https://shubhamg.bearblog.dev/llms-defend-fluent-memory/ (verify the final slug on bearblog before submitting — this is the personal-blog version, not the LessWrong crosspost)
**Title (≤80 chars):** It's not a lie if you believe it: LLMs defend their most fluent memory
**Note:** HN discards the text field on URL submissions — post the summary below as the author's first comment immediately after submitting.

---

## First comment (author context)

Author here. This started when Claude Opus 4.8 — at max thinking effort — confidently told me I was wrong about a Seinfeld episode I was right about: it swapped the protagonist for the character who "seems like the type," invented a girlfriend for him, and moved the episode's famous quote to fit its rewritten scene.

I preregistered a study and ran ~1,750 API calls (about $40) to pin down when this happens:

- Tidy prompts: 1 error in 140. My messy, typo-ridden phone phrasing: 63%. Same model, same fact — and it only fires where a more famous/more-retold version of the fact exists. Evals built on tidy prompts measure the wrong distribution.
- Real people never got their roles swapped (the 2023 Brian Hood case didn't reproduce). They get the mirror image instead: the model disputes documented facts when the *user* asserts them, while stating the same facts unprompted when asked cold.
- My automated keyword grading fabricated ~10 false findings before I banned it — every number in the post comes from reading the responses.

Opus 5 shipped the night before I published, so I re-ran the decisive cells within 24 hours: 63%→7%, the "answered from memory and wrong" cell empties, and at high thinking effort it now chooses to search. But when it does fail, it's the identical inversion — and it missed once in ten on a plain direct lookup (different wording than 4.8's 40/40 run, so suggestive, not a measured regression).

The repo has all raw transcripts, the preregistration with its scorecard (2 bets supported, 2 wrong, 2 never run), and a recipe for testing your own favorite show. At a ~7–10% fire rate single screenshots mislead in both directions, so run it a few times. Happy to answer questions.
