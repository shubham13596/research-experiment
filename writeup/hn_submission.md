# Hacker News submission

**URL:** [personal-blog version of the post — not the LessWrong crosspost]
**Title (≤80 chars):** It's not a lie if you believe it: LLMs defend their most fluent memory
**Note:** HN discards the text field on URL submissions — post the summary below as the author's first comment immediately after submitting.

---

## First comment (author context)

Author here. This started when Claude Opus 4.8 — at max thinking effort — confidently told me I was wrong about a Seinfeld episode I was right about, swapped the protagonist for the character who "seems like the type," invented a girlfriend named Gwen, and reassigned the episode's famous quote to fit its rewritten version of the scene. (Gwen turns out to be a real Seinfeld girlfriend — from a different episode. Even the confabulated details are schema-consistent.)

I preregistered a study and ran ~1,600 API calls to pin down when this happens. The findings that surprised me:

- Clean lab prompts show a 0% error rate on the same fact that my messy, typo-ridden phone phrasing elicits 63% of the time. Evals built on tidy prompts are measuring the wrong distribution — the moments you're fuzzy and type a garbled question are exactly when the model is most licensed to confidently "correct" you.
- The claude.ai system prompt is protective (63%→47%), not causative. More thinking effort doesn't rescue it.
- The effect is item-gated: it fires only where a more famous/more retold version of the fact exists (an archetype, a compressed anecdote). Well-encoded facts resist any amount of messy phrasing.
- Real people never got their roles swapped in my items (the 2023 Brian Hood defamation case didn't reproduce). Instead they get the mirror-image failure: the model disputes documented facts specifically when the *user* asserts them, while stating the same facts unprompted when asked cold.
- My automated keyword grading fabricated more false findings (~10) than I care to admit — every number in the post comes from reading the responses.

Opus 5 shipped the night before I published, so I re-ran the decisive cells on it within 24 hours: the wrongful-correction rate collapses 63%→7%, the "answered from memory and wrong" cell empties, and verification becomes effort-gated — but the attractor survives (identical full inversion when it fires, ~7–10%), and it missed once on a clean direct question where Opus 4.8 was 40/40.

All raw transcripts, the preregistration, the runner scripts, and every retraction I had to make along the way are in the repo linked in the post. The failure lives in the long tail of specific fandoms, so the post ends with a recipe for building a susceptible item from *your* favorite show and testing Opus 5 yourself — at a ~7–10% fire rate, single screenshots mislead in both directions, so run it a few times. Happy to answer questions.
