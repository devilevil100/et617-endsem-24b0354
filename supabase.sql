-- The Willow Mystery (24B0354): shared progress + teacher reviews.
-- Run once in the Supabase SQL Editor (or psql). Only the app's server function (DATABASE_URL secret) reads or writes:
-- RLS is on and there are no public policies, so the browser cannot reach these tables directly.

create table if not exists learners (
  id          text primary key,              -- random id generated on the learner's device
  name        text not null default '',
  state       jsonb not null,                -- the app's saved progress (answers, AI feedback, logs)
  updated_at  timestamptz not null default now()
);

create table if not exists reviews (
  fb_id        text primary key,             -- one AI feedback item
  learner_id   text not null references learners(id) on delete cascade,
  status       text not null check (status in ('approved', 'overridden')),
  teacher_text text not null default '',
  updated_at   timestamptz not null default now()
);

alter table learners enable row level security;
alter table reviews  enable row level security;
