# It's Not a Lie

Public replication site for the *Schema-Lure Recall in Frontier LLMs* study in the
parent repo. A visitor types in a fandom fact they know cold, the site runs it
past one model five times at pinned settings, and the visitor grades each answer.
Cases that several people independently flag get read-adjudicated by hand and
published with citations.

Built to the design in [`SPEC.md`](./SPEC.md).

Why a website rather than the repo: replicating from the repo requires cloning it
and running Python, which filters replicators down to developers who then send
screenshots from claude.ai with unknown settings. A server-side API call gives
the opposite — every replication runs on a pinned model with pinned parameters,
so a new case arrives already reproducible.

---

## Run it locally

You need Node 20+ and an Anthropic API key. Nothing else is required: without
Supabase it stores submissions in memory, without Upstash it counts rate limits
in memory, and without a Turnstile secret it skips the bot check. Each of those
prints a warning at boot.

```bash
cd site
npm install
cp .env.example .env.local     # add ANTHROPIC_API_KEY
npm run dev                    # http://localhost:3000
```

`npm run typecheck` and `npm run build` both need to pass before deploying.

## Deploy on Heroku (recommended)

A long-lived process suits this app better than serverless: the streaming
endpoint holds a connection for the length of five model calls, and spend caps
can be derived from stored rows instead of a separate counter service. **You need
one add-on, Heroku Postgres, and no Redis.**

**Two things bite immediately.** `site/` is not the git root in this repo, so
`heroku create` cannot add a git remote and every later command needs an explicit
`-a <app>`. And `openssl` does not exist on Windows, so generate secrets with
.NET instead.

PowerShell, from the repo root:

```powershell
$app = "your-app-name"
function New-Secret {
  $b = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  ($b | ForEach-Object { $_.ToString('x2') }) -join ''
}

heroku create $app
heroku addons:create heroku-postgresql:essential-0 -a $app   # sets DATABASE_URL

$adminToken = New-Secret
$salt = New-Secret
heroku config:set -a $app "ANTHROPIC_API_KEY=sk-ant-..."
heroku config:set -a $app "ADMIN_TOKEN=$adminToken"
heroku config:set -a $app "IP_HASH_SALT=$salt"
heroku config:set -a $app "DAILY_BUDGET_USD=15" "OPUS_DAILY_BUDGET_USD=5"

# Heroku app URLs now carry a random suffix — copy the real one from `heroku apps:info`.
heroku config:set -a $app "NEXT_PUBLIC_SITE_URL=https://$app-xxxxxxxx.herokuapp.com"
```

Bash is the same with `-a $app` added and `openssl rand -hex 32` for the secrets.

Then make `site/` the build root. The [subdir
buildpack](https://github.com/timanovsky/subdir-heroku-buildpack) is the better
option because deploys afterwards are an ordinary `git push` — **order matters,
the subdir buildpack has to be added first**:

```powershell
heroku buildpacks:add -a $app https://github.com/timanovsky/subdir-heroku-buildpack
heroku buildpacks:add -a $app heroku/nodejs
heroku config:set -a $app PROJECT_PATH=site

git remote add heroku "https://git.heroku.com/$app.git"
git push heroku HEAD:main
```

`git subtree push --prefix=site heroku main` also works and needs no buildpack
config, but it rewrites history on every deploy and gets slow.

`NEXT_PUBLIC_SITE_URL` matters more than it looks: share cards have to be
absolute URLs or no social scraper will fetch them.

Notes specific to Heroku:

- **The schema creates itself** on first request, so there is no migration step.
  `db/schema.sql` stays as the readable reference and adds a couple of CHECK
  constraints worth applying by hand if you want them enforced at the storage
  layer: `heroku pg:psql < db/schema.sql`.
- **`next start` honours `$PORT`**, which is what the `Procfile` relies on.
- **The router closes idle connections after 55 seconds.** The submit stream
  sends an SSE heartbeat every 15 seconds to prevent that; don't remove it.
- **Dynos restart daily.** That's why spend is re-derived from stored rows rather
  than held in memory — the daily cap survives the cycle.
- **One web dyno is enough** and keeps the in-process tally coherent. If you
  scale past one, add Upstash so the counters are shared.

## Deploy on Vercel (alternative)

1. Import `site/` as the project root. The submit route sets `maxDuration = 300`,
   because five trials on a thinking model can take a couple of minutes.
2. **Supabase** — create a project, run [`db/schema.sql`](./db/schema.sql), set
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Row-level security is on with
   no policies, so nothing reaches these tables through the anon key.
3. **Upstash Redis** — required here, not optional. Serverless means many
   short-lived instances, so an in-process tally would let the daily caps drift.

## Either way

- **Turnstile** — add a widget, set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and
  `TURNSTILE_SECRET_KEY`.
- **Secrets** — `ADMIN_TOKEN` and `IP_HASH_SALT`, both long and random. Rotating
  the salt resets rate limits and unlinks past submissions from future ones.
- **Belt and braces** — use a workspace-scoped Anthropic API key with its own
  spend limit, so a bug in this app's budget code can't run past it.

## Spend and abuse controls

Layered, in request order. All of it ships in the first deploy, because the first
viral moment won't wait for a follow-up PR.

| Control | Where | Default |
|---|---|---|
| Turnstile | `lib/guards.ts` | on when a secret is set |
| Runs per visitor per day | `lib/counters.ts` | 3, by IP hash **and** coarse device hash |
| Topical gate | `lib/anthropic.ts` → `runGate` | one Haiku call, ~$0.0006 |
| Output cap | `lib/models.ts` | 1024 tokens, or 16384 where thinking is on by default |
| Daily spend cap | `lib/counters.ts` | `DAILY_BUDGET_USD`, default $15 |
| Opus sub-budget | same | `OPUS_DAILY_BUDGET_USD`, default $5 |
| Kill switch | `lib/env.ts` | `KILL_SWITCH=1` |

With Postgres, the daily spend figure is recomputed from the tokens recorded on
every stored trial, plus a known per-submission constant for the gate call. An
in-process tally runs alongside it and whichever is higher wins — the stored
number survives restarts, the tally covers requests still in flight.

At roughly $0.05 per Sonnet submission, $15/day is about 250–300 submissions. When
the cap is hit the wizard closes and the page points at the gallery — never an
error.

Two deliberate failure choices worth knowing about:

- **The topical gate fails open.** If the Haiku call errors, the submission goes
  through. A Haiku outage shouldn't close the site, and the 3-per-day quota plus
  the token cap already bound the damage.
- **Turnstile fails open** if Cloudflare is unreachable, for the same reason.
  It fails *closed* on an actual invalid token.

## How a case becomes real

```
submission → clustered by normalised work+question → candidate
  ≥2 distinct visitors AND ≥40% wrong  → surfaces in /admin queue
    human reads every response in full
    ground truth checked against 2 independent sources
      → confirmed  (+ "Export repo item" → items/ JSON skeleton)
      → refuted    (the model was right; the visitor misremembered)
```

Visitor grades decide **what gets read**, never what is true. This is the
study's own standing rule: automated entity matching is banned for scoring, and
the site inherits it. `/api/admin/queue` refuses to mark anything `confirmed`
without two citations, and so does a CHECK constraint in the schema.

`refuted` is a first-class published outcome. A replication project that only
shows its hits isn't one.

## Pinned parameters

Logged with every trial in `submissions.params`, so any row here can be re-run by
the study's harness.

| Parameter | Value | Why |
|---|---|---|
| `system` | none | Bare API. The claude.ai prompt suppresses these failures — separate condition. |
| `temperature` | not sent | Provider default, as in the study. Sonnet 5 and Opus 4.8 reject it anyway. |
| `tools` | none | Testing memory, not retrieval. |
| `thinking` | omitted | Each model's own default, recorded per row. |
| `max_tokens` | 1024 | 16384 for Sonnet 5, where adaptive thinking is on by default and shares the budget with the answer. |
| trials | 5 | The study's floor for "one run is noise". |

Adding a model means one entry in `MODELS` in `lib/models.ts`, including its
revision-stock colour. Nothing else needs to change.

## Layout

```
src/lib/                models, prompts, taxonomy, counters, guards
src/lib/db.ts           three storage drivers behind one interface
src/lib/hero.ts         verbatim transcript excerpts for the static hero
src/lib/study-cases.ts  the five cases seeded from the study
src/app/case/[slug]/    per-case permalink + its own share card
src/app/api/            submit (SSE), verdict, status, admin
src/components/         HeroScript, Wizard, TakeCard, Transcript, Listings
db/schema.sql           readable schema reference; Postgres self-creates
```

## Case permalinks

Every case has a page at `/case/<slug>` with its own generated share card, so a
posted link previews the actual finding — question, real answer, and what the
model said instead — rather than a site banner.

Study cases use their item id (`/case/sein-001`) and are prerendered. Community
cases use the clustering key, which `caseKeyFor` produces already URL-safe
(`/case/frasier--baby-cab-delivers-driver-s`). The share card pulls the wrong
answer from the "what did it say instead?" field visitors fill in, which is the
same field that later fills `lure_entity` in an exported repo item.

Case pages include runs that are still in flight, deliberately: a visitor who
grades the first take and clicks straight through would otherwise land on a 404
while the remaining four are still going. The gallery stays finished-runs-only,
so a half-complete run never appears in a public list.

`getGallery` and `getAdminQueue` aggregate in TypeScript rather than SQL so the
three drivers can't drift apart. If submissions reach six figures, move
`summarise()` in `lib/db.ts` into a materialised view and keep the shape.

## The seeded gallery

An empty gallery on launch day undercuts the premise, so `lib/study-cases.ts`
carries five cases over from the study. Inclusion was deliberately narrow,
because **`verification_status: "verified"` in the parent repo is not a usable
gate** — 46 items claim it, only 21 have an `evidence/*_verification.md` log, and
six of the claimants sit in a file headed *"DO NOT PROMOTE ANY ITEM IN THIS
FILE"*. A case is seeded only if it is a conflict item, has a dedicated evidence
log, has two or more real independent source URLs, and has a specific written-down
observed failure.

That admits SEIN-001, SEIN-002, FRI-003, TV-008 and SIMP-004. Left out on
purpose: the 15 `fiction_batch2_built` items (single-source, no evidence log, and
no `lure_rationale` to explain the lure from), `film_quote_batch1` (file marked
rejected), the tier-3a real-person items (well sourced, but two carry
contested-record caveats and one earlier claim was retracted as a grader
artifact), and the control items (no lure by construction).

Two honesty constraints are enforced in the UI. Each observed result names its
own model and condition and is **never combined into a single rate**, because the
numbers come from different cells of the study. And where the attractor the
models actually produced differs from the item's designed lure, the site shows
what they produced — TV-008's designed lure is Frasier, but models invent Niles,
so Niles is what the card says.

Adding a case is one entry in `STUDY_CASES`. Each one gets a "Run this one
yourself" link that prefills the wizard.

## Design notes

The subject is 1990s television production paperwork, because the study's whole
finding is that the true fact lives in a stage direction nobody quotes. Colour
comes from production revision stock — scripts were revised on coloured paper in
a fixed order, and one stock is assigned per model everywhere on the site, so a
colour always means the same model.

- Blue pages — Sonnet 4.6
- Pink pages — Sonnet 5
- Goldenrod — Opus 4.8
- Green — Haiku 4.5

Monospace (Courier Prime) means "this is the record": script, transcript, data,
labels. Explanatory prose is in a sans, so the monospace stays meaningful rather
than ambient.

Model responses arrive as markdown. `components/Transcript.tsx` renders bold
spans and the model's own blockquotes and leaves every other character alone —
the stored and exported strings are never modified. This matters for the study's
original stimulus, whose three typos and double space are load-bearing.

## Not affiliated with Anthropic

The site calls the public API the way any developer would. The footer and the
method page say so, and no Anthropic branding is used in the name or domain.
