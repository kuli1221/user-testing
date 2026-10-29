-- Kjør hele filen i Supabase > SQL Editor
create extension if not exists pgcrypto;

create table participants (
  id uuid primary key default gen_random_uuid(),
  pid integer unique not null,                    -- lesbart deltakernummer (1,2,3..)
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  consent boolean not null check (consent),
  age_group text check (age_group in ('<20','20-29','30-39','40-49','50+')),
  gender text check (gender in ('kvinne','mann','annet','vil_ikke_oppgi')),
  device_class text not null check (device_class in ('mouse','touch')),
  viewport_w integer,
  viewport_h integer,
  order_group smallint not null check (order_group between 0 and 3),
  block_order text not null,                      -- f.eks. 'buttons-numeric,slider-numeric,...'
  preferred_interface text check (preferred_interface in ('buttons','slider','none')),
  preferred_numeric text check (preferred_numeric in ('buttons','slider','none')),
  preferred_perceptual text check (preferred_perceptual in ('buttons','slider','none')),
  comments text
);

create sequence participants_pid_seq owned by participants.pid;

create table trials (
  id bigserial primary key,
  participant_id uuid not null references participants(id) on delete cascade,
  block_index smallint not null,                  -- 0..3, rekkefølge deltakeren fikk
  interface text not null check (interface in ('buttons','slider')),
  task text not null check (task in ('numeric','perceptual')),
  trial_number smallint not null,
  is_practice boolean not null default false,
  target smallint not null check (target between 0 and 100),
  start_value smallint not null check (start_value between 0 and 100),
  distance_cat text not null check (distance_cat in ('near','far')),
  final_value smallint not null check (final_value between 0 and 100),
  error_abs smallint generated always as (abs(final_value - target)) stored,
  distance_abs smallint generated always as (abs(target - start_value)) stored,
  time_ms integer not null check (time_ms >= 0),
  first_input_ms integer,
  n_interactions integer not null default 0,      -- klikk (knapper) eller drag-start/endringer (slider)
  n_overshoots integer not null default 0,        -- ganger man passerte målet og snudde
  created_at timestamptz not null default now(),
  unique (participant_id, block_index, is_practice, trial_number)
);
create index on trials (participant_id);

create table ratings (
  id bigserial primary key,
  participant_id uuid not null references participants(id) on delete cascade,
  interface text not null check (interface in ('buttons','slider')),
  task text not null check (task in ('numeric','perceptual')),
  ease smallint not null check (ease between 1 and 7),
  precision smallint not null check (precision between 1 and 7),
  satisfaction smallint not null check (satisfaction between 1 and 7),
  unique (participant_id, interface, task)
);

-- Viktig: ingen RLS-policies = Supabase sin offentlige anon-nøkkel kan ikke lese/skrive.
-- Serveren vår kobler til direkte som postgres og er upåvirket.
alter table participants enable row level security;
alter table trials enable row level security;
alter table ratings enable row level security;
