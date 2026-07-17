# System prompts used in the surface-comparison diagnostic

## `claude_ai_fable5.txt`
**Verbatim** claude.ai consumer system prompt as published by Anthropic.
- Source: https://platform.claude.com/docs/en/release-notes/system-prompts (release-notes system prompts page)
- Version: Claude Fable 5 claude.ai prompt, dated June 9, 2026 (the most recent published at retrieval time, 2026-07-17)
- No edits. Reproduced for research replication; it is Anthropic's own published transparency artifact.

### Note on model identity
This is the Fable 5 claude.ai prompt. In the surface-comparison diagnostic we apply it to
`claude-opus-4-8` (the original-observation model) as well as `claude-fable-5` (the model it
actually ships with). The identity paragraph names Fable 5, but the same prompt explicitly states
"The person is able to switch models mid-conversation, so previous messages claiming to be from a
different model ... may be accurate" — i.e. a model/identity mismatch is anticipated by the prompt
and is immaterial to a pop-culture recall question. Using the verbatim published text (rather than
a hand-edited Opus-identity variant) avoids introducing any fabricated prompt content. The `{{currentDateTime}}`
placeholder is left as-is; it is a claude.ai runtime substitution, not part of the authored text.

## Why this replaced an earlier reconstruction
An initial version of the diagnostic used a hand-written "chat-style" system prompt that included
a fabricated instruction ("answer enthusiastically in the spirit of a knowledgeable fan"). That
line could itself bias the model toward confident/famous (schema) answers — a confound we
introduced. It was discarded in favor of Anthropic's real published prompt, which contains no such
instruction.
