-- Zync: blog posts (DB-backed CMS). Run once in Supabase → SQL Editor.
-- Public can read PUBLISHED posts. All writes happen server-side via the
-- service-role key in admin-gated API routes, so no public write policy exists.

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  date        timestamptz not null default now(),
  category    text not null default 'General',
  excerpt     text not null default '',
  tags        jsonb not null default '[]'::jsonb,
  author      text not null default 'Zync Team',
  content     text not null default '',
  cover_image text,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists posts_published_date_idx
  on public.posts (published, date desc);
create index if not exists posts_category_idx on public.posts (category);

alter table public.posts enable row level security;

-- Anyone (incl. anonymous) can read published posts.
drop policy if exists "posts_public_read" on public.posts;
create policy "posts_public_read" on public.posts
  for select using (published = true);

-- No insert/update/delete policies → writes only via service-role (admin API).
