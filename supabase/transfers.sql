-- Zync: transfer history table.
-- Run this once in Supabase → SQL Editor. Records each transfer a signed-in
-- user creates (slug, title, file names, total size). Row-Level Security
-- ensures users only ever see/manage their own rows.

create table if not exists public.transfers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  slug        text,
  title       text,
  files       jsonb not null default '[]'::jsonb,
  file_count  int  not null default 0,
  total_bytes bigint not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists transfers_user_created_idx
  on public.transfers (user_id, created_at desc);

alter table public.transfers enable row level security;

-- Each user can read their own history.
drop policy if exists "transfers_select_own" on public.transfers;
create policy "transfers_select_own" on public.transfers
  for select using (auth.uid() = user_id);

-- Each user can insert rows for themselves.
drop policy if exists "transfers_insert_own" on public.transfers;
create policy "transfers_insert_own" on public.transfers
  for insert with check (auth.uid() = user_id);

-- Each user can delete their own history entries.
drop policy if exists "transfers_delete_own" on public.transfers;
create policy "transfers_delete_own" on public.transfers
  for delete using (auth.uid() = user_id);
