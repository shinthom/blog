-- ============================================================
-- Geonwoo Blog — Supabase schema
-- Run once in: Supabase Dashboard → SQL editor → New query.
-- ============================================================

-- ---------- posts ----------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  content text not null default '',
  category text,
  excerpt text,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists posts_status_idx       on public.posts (status);
create index if not exists posts_category_idx     on public.posts (category);
create index if not exists posts_published_at_idx on public.posts (published_at desc);

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
alter table public.posts enable row level security;

-- Anonymous visitors may read only published posts.
drop policy if exists "anon can read published posts" on public.posts;
create policy "anon can read published posts"
  on public.posts for select
  to anon
  using (status = 'published');

-- The service role bypasses RLS by design — admin pages and API routes
-- use SUPABASE_SERVICE_ROLE_KEY so they can read/write drafts.

-- ---------- Storage bucket for inline images ----------
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

-- Public can read uploaded images.
drop policy if exists "blog-images public read" on storage.objects;
create policy "blog-images public read"
  on storage.objects for select
  to anon
  using (bucket_id = 'blog-images');
