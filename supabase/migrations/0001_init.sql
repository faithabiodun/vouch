-- VOUCH schema (§7). Applied to Supabase Postgres.
-- Indexed on-chain settlement history keyed by Agent ID, plus the call log that
-- Revenue Rocket is judged on.

create table if not exists agents (
  agent_id     text primary key,
  first_seen   timestamptz not null,
  last_seen    timestamptz not null,
  display_name text
);

create table if not exists jobs (
  job_id       text primary key,
  provider_id  text not null references agents(agent_id),
  buyer_id     text not null,
  amount_usd   numeric(18,6),
  status       text not null,   -- settled | abandoned | disputed
  opened_at    timestamptz not null,
  closed_at    timestamptz,
  block_number bigint not null,
  tx_hash      text not null
);

create table if not exists disputes (
  dispute_id   text primary key,
  job_id       text not null references jobs(job_id),
  against_id   text not null,
  outcome      text,            -- provider | buyer | pending
  resolved_at  timestamptz,
  block_number bigint not null
);

create table if not exists indexer_state (
  id                 int primary key default 1,
  last_indexed_block bigint not null,
  updated_at         timestamptz not null default now()
);

create table if not exists call_log (
  id         bigserial primary key,
  endpoint   text not null,
  agent_id   text,
  paid       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists jobs_provider_idx    on jobs(provider_id);
create index if not exists jobs_buyer_idx       on jobs(buyer_id);
create index if not exists disputes_against_idx on disputes(against_id);
create index if not exists call_log_created_idx on call_log(created_at desc);

-- Single-row cursor so the indexer resumes rather than restarts after a crash.
insert into indexer_state (id, last_indexed_block)
values (1, 0)
on conflict (id) do nothing;
