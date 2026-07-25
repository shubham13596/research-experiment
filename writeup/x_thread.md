# X (Twitter) thread

**Format:** thread of 8 posts. Post 1 carries the hook; attach the screenshot of the original wrong claude.ai reply to it if you have one. Attaching the central results table (screenshot the blog's §5.2 table) to post 2 or 5 helps a lot — tables stop the scroll.

**Tagging:** tag @AnthropicAI once, in the final post. Don't mass-tag individual researchers in the thread body — that reads as spam and gets muted. If you want individuals to see it, a short DM or a reply-mention *after* the thread has some traction works better.

**Timing:** weekday, roughly 15:00–18:00 UTC (morning US) is when AI-X is most awake.

---

## The thread

**1/**
Claude Opus 4.8, at max thinking effort, confidently told me I was wrong about a Seinfeld episode. I was right.

It swapped the protagonist, invented a girlfriend for him, and reassigned the episode's famous quote to fit its rewrite.

I spent $40 and ~1,750 API calls finding out when this happens. 🧵

**2/**
The headline: asked tidily, the bug basically doesn't exist — 1 error in 140 clean-prompt calls.

Asked in my actual messy, typo-ridden phone phrasing: 63% wrong. Same model, same fact.

It fires exactly where evals don't look — in how real users actually type.

**3/**
More thinking effort does NOT fix it. Wrong at the same rate at high effort as at low.

The claude.ai system prompt helps (63% → 47%) — I went in suspecting the app was the cause, and the data reversed me. But the same prompt also suppresses web-search checking in every model I tested.

**4/**
Real people never got role-swapped (I tried hard to reproduce the 2023 Brian Hood defamation case — zero hits).

They get the mirror image instead: the model disputes documented facts specifically when *you* assert them, while stating the same facts unprompted when asked cold.

**5/**
Opus 5 shipped the night before I planned to publish. So I re-ran the decisive cells on it within 24 hours — identical prompts down to the typo:

• wrongly "corrects" me: 63% → 7%
• answered from memory AND wrong: ~37% → 0/33
• chooses to search at high effort: 17% → 100%

**6/**
But the bug is still underneath. When Opus 5 fails (~7–10% of the time), it's the *identical* rewrite: "it's George, not Jerry," invented police-officer girlfriend, quote reassigned.

Same script, rarer performances.

**7/**
Rigor notes: predictions were frozen in a public git commit before any data. Scorecard: 2 supported, 2 wrong, 2 never run.

And my automated keyword grading fabricated ~10 false findings before I banned it and read all ~900 responses by hand. That confession is in the writeup too.

**8/**
Full writeup: https://shubhamg.bearblog.dev/llms-defend-fluent-memory/

Repo — preregistration, all ~1,750 raw transcripts, and a recipe for testing YOUR favorite show: https://github.com/shubham13596/research-experiment

If you try it on Opus 5: run it several times. At ~7–10%, single screenshots mislead in both directions. @AnthropicAI

---

## Single-post alternative (if you have Premium and prefer one long post)

Collapse posts 1, 2, 5, and 8 into one post: hook paragraph → 1/140 vs 63% → the three Opus 5 numbers as a bullet list → both links + the run-it-several-times caveat. Skip the tagging until it's live, then reply to your own post with the @AnthropicAI mention so the tag doesn't gate the initial distribution.
