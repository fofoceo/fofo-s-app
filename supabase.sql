-- Fofo · The Weekly Edit — cloud sync table
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.planner_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: each person can only ever see and change their own planner.
alter table public.planner_state enable row level security;

drop policy if exists "Read own planner" on public.planner_state;
create policy "Read own planner" on public.planner_state
  for select using (auth.uid() = user_id);

drop policy if exists "Create own planner" on public.planner_state;
create policy "Create own planner" on public.planner_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "Update own planner" on public.planner_state;
create policy "Update own planner" on public.planner_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
