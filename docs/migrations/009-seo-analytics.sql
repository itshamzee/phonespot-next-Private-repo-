-- ============================================================
-- Migration 009: SEO Analytics — Multi-site keyword tracking
-- Run in Supabase Dashboard SQL Editor
-- ============================================================

-- Sites table
create table public.seo_sites (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  domain text not null,
  gsc_property text not null,
  gsc_credentials_env text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.seo_sites enable row level security;
create policy "Admin can manage seo_sites" on public.seo_sites
  for all to authenticated using (true) with check (true);

-- Keywords table
create table public.seo_keywords (
  id uuid default gen_random_uuid() primary key,
  site_id uuid not null references public.seo_sites(id) on delete cascade,
  date date not null,
  query text not null,
  page text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr decimal not null default 0,
  position decimal not null default 0,
  created_at timestamptz default now()
);

create index idx_seo_keywords_site_date_query on public.seo_keywords (site_id, date, query);
create index idx_seo_keywords_site_query on public.seo_keywords (site_id, query);

alter table public.seo_keywords enable row level security;
create policy "Admin can read seo_keywords" on public.seo_keywords
  for select to authenticated using (true);
create policy "Service can insert seo_keywords" on public.seo_keywords
  for insert with check (true);
create policy "Admin can delete seo_keywords" on public.seo_keywords
  for delete to authenticated using (true);

-- Pages table
create table public.seo_pages (
  id uuid default gen_random_uuid() primary key,
  site_id uuid not null references public.seo_sites(id) on delete cascade,
  date date not null,
  page text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr decimal not null default 0,
  position decimal not null default 0,
  top_query text,
  created_at timestamptz default now()
);

create index idx_seo_pages_site_date_page on public.seo_pages (site_id, date, page);

alter table public.seo_pages enable row level security;
create policy "Admin can read seo_pages" on public.seo_pages
  for select to authenticated using (true);
create policy "Service can insert seo_pages" on public.seo_pages
  for insert with check (true);
create policy "Admin can delete seo_pages" on public.seo_pages
  for delete to authenticated using (true);

-- Content audits table
create table public.seo_content_audits (
  id uuid default gen_random_uuid() primary key,
  site_id uuid not null references public.seo_sites(id) on delete cascade,
  page_path text not null,
  content_type text not null check (content_type in ('service_page', 'product_page', 'landing_page', 'external')),
  content_id uuid,
  score integer not null default 0 check (score >= 0 and score <= 100),
  issues jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  last_audited timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_seo_content_audits_site on public.seo_content_audits (site_id);

alter table public.seo_content_audits enable row level security;
create policy "Admin can manage seo_content_audits" on public.seo_content_audits
  for all to authenticated using (true) with check (true);

-- Sync log table
create table public.seo_sync_log (
  id uuid default gen_random_uuid() primary key,
  site_id uuid not null references public.seo_sites(id) on delete cascade,
  status text not null check (status in ('success', 'error')),
  keywords_synced integer not null default 0,
  pages_synced integer not null default 0,
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create index idx_seo_sync_log_site on public.seo_sync_log (site_id, started_at desc);

alter table public.seo_sync_log enable row level security;
create policy "Admin can read seo_sync_log" on public.seo_sync_log
  for select to authenticated using (true);
create policy "Service can insert seo_sync_log" on public.seo_sync_log
  for insert with check (true);
create policy "Service can update seo_sync_log" on public.seo_sync_log
  for update with check (true);
