-- repair_brands
create table if not exists repair_brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  device_type text not null check (device_type in ('smartphone','tablet','laptop','watch','console')),
  logo_url text,
  sort_order int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- repair_models
create table if not exists repair_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references repair_brands(id) on delete cascade,
  slug text not null,
  name text not null,
  image_url text,
  sort_order int default 0,
  active boolean default true,
  created_at timestamptz default now(),
  unique(brand_id, slug)
);

-- repair_services
create table if not exists repair_services (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references repair_models(id) on delete cascade,
  slug text not null,
  name text not null,
  price_dkk int not null,
  estimated_minutes int,
  sort_order int default 0,
  active boolean default true,
  created_at timestamptz default now(),
  unique(model_id, slug)
);

-- Indexes
create index if not exists idx_repair_models_brand on repair_models(brand_id);
create index if not exists idx_repair_services_model on repair_services(model_id);

-- RLS
alter table repair_brands enable row level security;
alter table repair_models enable row level security;
alter table repair_services enable row level security;

create policy "Public read repair_brands" on repair_brands for select using (true);
create policy "Public read repair_models" on repair_models for select using (true);
create policy "Public read repair_services" on repair_services for select using (true);

create policy "Auth write repair_brands" on repair_brands for all using (auth.role() = 'authenticated');
create policy "Auth write repair_models" on repair_models for all using (auth.role() = 'authenticated');
create policy "Auth write repair_services" on repair_services for all using (auth.role() = 'authenticated');
