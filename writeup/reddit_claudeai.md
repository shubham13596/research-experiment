# r/ClaudeAI submission

**Format:** text post (not a link post) with the blog + repo linked in the body. Disclose it's your own work; hang around in the comments. Flair: "Comparison" or "Other" — check the sidebar for current options before posting.

**Title (pick one):**

1. Opus 4.8 rewrote a Seinfeld episode to "correct" me when I was right — 63% of the time. I re-ran the exact same test on Opus 5 the day it shipped: 7%, but the same bug is still underneath
2. I spent $40 testing why Claude confidently tells you you're wrong when you're right. Opus 5 shipped the night before I published, so I ran it back within 24 hours
3. "It's not a lie if you believe it": I preregistered a study of Claude defending false memories against users who are right — including a day-one Opus 5 rematch

---

## Body

I asked Opus 4.8 (high thinking, claude.ai) about the Seinfeld episode where Jerry takes a polygraph over watching Melrose Place. I had it right — it's Jerry. The reply:

> "You've got the gist right, but **the character is George, not Jerry.** ... George is dating a woman named **Gwen** who's a police officer... and **Jerry coaches him with the famous line: 'It's not a lie if you believe it.'**"

Every part of that is wrong, and it's not one wrong detail — it's a coherent rewrite: protagonist swapped for the show's designated liar, a girlfriend invented, the famous quote reassigned so the new scene stays consistent. Max thinking effort produces the same swap.

So I preregistered a study (predictions frozen in a public git commit before any data) and ran ~1,750 API calls — about **$40** — to pin down when this happens. Every response was read and judged, not keyword-matched. What surprised me most:

- **Asked tidily, the bug basically doesn't exist:** 1 error in 140 clean-prompt calls. Asked in my actual messy phone-typed phrasing: **63% wrong.** Same model, same fact. The moments you're fuzzy and type a garbled question are exactly when it's most likely to confidently "rewrite" your memory.
- **The claude.ai system prompt helps** (63% → 47%) — I went in suspecting the app was causing it, and the data reversed me. But the same prompt also **suppresses web-search checking** in every model I tested, so the app giveth and taketh away.
- **More thinking effort does not fix it.** Wrong at the same rate at high effort as at low.
- **Real people don't get role-swapped** (I tried hard to reproduce the 2023 Brian Hood defamation case — zero hits). Instead, models dispute *documented* facts specifically when the user asserts them, while stating the same facts unprompted when asked cold.

Then **Opus 5 shipped the night before I planned to publish**, so I re-ran the decisive cells on it within 24 hours — identical prompts down to the typo:

| Measurement | Opus 4.8 | Opus 5 |
|---|---|---|
| Wrongly "corrects" me (messy phrasing, raw API) | 63% | **7%** |
| Answered from memory AND wrong (optional search tool offered) | ~37% of calls | **0/33** |
| Chooses to search at high thinking effort (raw API) | 17% | **100%** |

Genuinely impressive — and the bug is still in there. When Opus 5 does fail (~7–10%), it's the *identical* rewrite: "it's George, not Jerry," invented police-officer girlfriend, quote reassigned. Same script, rarer performances. And it missed once in ten on a plain direct lookup, which the old model almost never did (different wording though, so treat that one as suggestive).

Practical takeaways for daily Claude use:

1. **When it confidently corrects you, that's a reflex, not evidence.** The correcting posture fires even in responses that go on to fully agree with you.
2. **When you half-remember something, ask a lookup question** ("who takes the polygraph in The Beard?"), not a reconstruction question ("was it that Jerry didn't want people to know...?"). Direct questions were near-perfect; reconstruction framing is where scenes get rebuilt around whoever "seems like the type."
3. **Quotes and side details are the flakiest layer.** Even correct Opus 5 answers kept inventing the girlfriend's name (Celia, Gretchen, Gail...).

Full writeup (my blog): https://shubhamg.bearblog.dev/llms-defend-fluent-memory/
Repo with the preregistration, all ~1,750 raw transcripts, every retraction I had to make, and a recipe for testing YOUR favorite show: https://github.com/shubham13596/research-experiment

That last part is the actual ask — this failure lives in the long tail of specific fandoms, so it needs people who know their shows cold. If you try it on Opus 5, run the prompt several times before concluding anything: at a ~7–10% fire rate, both "it's fixed!" and "still broken!" screenshots are sampling noise.

(Disclosure: my own study, my own blog. My automated grading fabricated ~10 false findings before I banned it and read everything by hand — the writeup includes that confession, plus the preregistration scorecard: 2 predictions supported, 2 wrong, 2 never run.)
