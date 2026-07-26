-- ══════════════════════════════════════════════════════════════════════════
-- IT'S NOT A LIE — schema
--
-- Run this once in the Supabase SQL editor. Every table is written and read
-- only by the server using the service-role key, so row-level security is
-- enabled with no policies: nothing reaches these tables through the public
-- anon key.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists submissions (
  id             uuid primary key,
  created_at     timestamptz not null default now(),

  -- Salted hashes. No raw IP or device signal is ever stored.
  ip_hash        text not null,
  fp_hash        text not null default '',

  mode           text not null check (mode in ('quiz', 'correction')),
  work           text not null,
  question       text not null,
  claimed_truth  text not null,
  messy_text     text,

  model_id       text not null,
  -- The exact parameters sent, so any row can be reproduced later.
  params         jsonb not null default '{}'::jsonb,
  n_trials       int  not null default 0,

  status         text not null check (
                   status in ('running', 'done', 'failed', 'capacity_rejected', 'gate_rejected')
                 ),

  -- Normalised work + question, used to cluster submissions into cases.
  case_key       text not null
);

create index if not exists submissions_case_key_idx on submissions (case_key);
create index if not exists submissions_created_at_idx on submissions (created_at desc);
create index if not exists submissions_status_idx on submissions (status);

create table if not exists trials (
  id             uuid primary key,
  submission_id  uuid not null references submissions (id) on delete cascade,
  trial_idx      int  not null,

  -- Anthropic request-id header, kept as an audit trail.
  request_id     text,
  response_text  text not null default '',
  stop_reason    text,
  input_tokens   int  not null default 0,
  output_tokens  int  not null default 0,
  latency_ms     int  not null default 0,

  unique (submission_id, trial_idx)
);

create index if not exists trials_submission_idx on trials (submission_id);

create table if not exists verdicts (
  id                  uuid primary key,
  -- One grade per take. Re-tapping a button replaces the previous answer.
  trial_id            uuid not null unique references trials (id) on delete cascade,
  submission_id       uuid not null references submissions (id) on delete cascade,

  verdict             text not null check (
                        verdict in (
                          'right', 'wrong_fact', 'invented_details',
                          'denied_existence', 'refused_hedged'
                        )
                      ),
  -- What the model said instead. This field is what identifies the attractor.
  wrong_answer_given  text,
  note                text,
  created_at          timestamptz not null default now()
);

create index if not exists verdicts_submission_idx on verdicts (submission_id);

-- Curated layer. Rows here exist only once a human has looked at a case.
create table if not exists cases (
  id             uuid primary key,
  case_key       text not null unique,
  title          text not null default '',
  work           text not null default '',
  question       text not null default '',
  ground_truth   text not null default '',

  -- 'confirmed' requires at least two independent sources. The API enforces
  -- this; the constraint below makes it true at the storage layer as well.
  citations      text[] not null default '{}',
  status         text not null default 'candidate' check (
                   status in ('candidate', 'confirmed', 'refuted', 'hidden')
                 ),
  failure_modes  text[] not null default '{}',
  repo_item_id   text,
  notes          text,
  updated_at     timestamptz not null default now(),

  constraint confirmed_needs_two_sources
    check (status <> 'confirmed' or array_length(citations, 1) >= 2)
);

create index if not exists cases_status_idx on cases (status);

-- Server-only access.
alter table submissions enable row level security;
alter table trials      enable row level security;
alter table verdicts    enable row level security;
alter table cases       enable row level security;
