-- Zync: app_settings table for runtime configuration.
-- Run this once in Supabase → SQL Editor.
-- Values here override environment variables at runtime (no redeploy needed).
-- RLS denies ALL public access — only the service-role key can read/write.

create table if not exists public.app_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- No public policies: only service-role (server-side admin client) can access.
-- Anon and authenticated roles are explicitly blocked.
create policy "deny_all_anon" on public.app_settings
  as restrictive for all to anon using (false);

create policy "deny_all_authenticated" on public.app_settings
  as restrictive for all to authenticated using (false);
