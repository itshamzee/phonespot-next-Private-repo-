-- ============================================================
-- 003_admin_repair_system.sql
-- New tables: customers, customer_devices, contact_inquiries, sms_log
-- Alter: repair_tickets (add new columns, new status value)
-- ============================================================

-- customers
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('privat', 'erhverv')),
  name text not null,
  email text,
  phone text not null,
  company_name text,
  cvr text,
  created_at timestamptz default now()
);

create index if not exists idx_customers_phone on customers(phone);
create index if not exists idx_customers_email on customers(email);

-- customer_devices
create table if not exists customer_devices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  brand text not null,
  model text not null,
  serial_number text,
  color text,
  condition_notes text,
  photos jsonb default '[]',
  created_at timestamptz default now()
);

create index if not exists idx_customer_devices_customer on customer_devices(customer_id);

-- contact_inquiries
create table if not exists contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  status text not null default 'ny' check (status in ('ny', 'besvaret', 'lukket')),
  admin_notes text,
  created_at timestamptz default now()
);

-- sms_log
create table if not exists sms_log (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references repair_tickets(id),
  customer_id uuid references customers(id),
  phone text not null,
  message text not null,
  provider_message_id text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz default now()
);

create index if not exists idx_sms_log_ticket on sms_log(ticket_id);

-- Extend repair_tickets
alter table repair_tickets
  add column if not exists customer_id uuid references customers(id),
  add column if not exists device_id uuid references customer_devices(id),
  add column if not exists services jsonb,
  add column if not exists internal_notes jsonb default '[]',
  add column if not exists intake_checklist jsonb,
  add column if not exists intake_photos jsonb default '[]',
  add column if not exists checkout_photos jsonb default '[]',
  add column if not exists shopify_draft_order_id text,
  add column if not exists shopify_order_id text,
  add column if not exists paid boolean default false,
  add column if not exists paid_at timestamptz;

-- Update status constraint to include 'diagnostik'
alter table repair_tickets drop constraint if exists repair_tickets_status_check;
alter table repair_tickets add constraint repair_tickets_status_check
  check (status in ('modtaget', 'diagnostik', 'tilbud_sendt', 'godkendt', 'i_gang', 'faerdig', 'afhentet'));

-- RLS policies
alter table customers enable row level security;
alter table customer_devices enable row level security;
alter table contact_inquiries enable row level security;
alter table sms_log enable row level security;

create policy "Auth read customers" on customers for select using (auth.role() = 'authenticated');
create policy "Auth write customers" on customers for all using (auth.role() = 'authenticated');
create policy "Auth read customer_devices" on customer_devices for select using (auth.role() = 'authenticated');
create policy "Auth write customer_devices" on customer_devices for all using (auth.role() = 'authenticated');
create policy "Auth read contact_inquiries" on contact_inquiries for select using (auth.role() = 'authenticated');
create policy "Auth write contact_inquiries" on contact_inquiries for all using (auth.role() = 'authenticated');
create policy "Auth read sms_log" on sms_log for select using (auth.role() = 'authenticated');
create policy "Auth write sms_log" on sms_log for all using (auth.role() = 'authenticated');

-- NOTE: Create Supabase Storage bucket 'device-photos' (private) manually in Dashboard
