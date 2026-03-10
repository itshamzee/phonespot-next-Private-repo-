-- PhoneSpot Admin Repair System - Database Schema
-- Run this in Supabase SQL Editor

-- ============================================================
-- Customers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'privat' CHECK (type IN ('privat', 'erhverv')),
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  company_name text,
  cvr text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON public.customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Customer Devices
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customer_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  brand text NOT NULL,
  model text NOT NULL,
  serial_number text,
  color text,
  condition_notes text,
  photos text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON public.customer_devices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Repair Tickets (add new columns if table exists, else create)
-- ============================================================

-- If repair_tickets already exists, add the new columns:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repair_tickets' AND table_schema = 'public') THEN
    -- Add columns that may not exist yet
    BEGIN ALTER TABLE public.repair_tickets ADD COLUMN customer_id uuid REFERENCES public.customers(id); EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.repair_tickets ADD COLUMN device_id uuid REFERENCES public.customer_devices(id); EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.repair_tickets ADD COLUMN services jsonb DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.repair_tickets ADD COLUMN internal_notes jsonb DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.repair_tickets ADD COLUMN intake_checklist jsonb DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.repair_tickets ADD COLUMN intake_photos text[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.repair_tickets ADD COLUMN checkout_photos text[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.repair_tickets ADD COLUMN shopify_draft_order_id text; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.repair_tickets ADD COLUMN shopify_order_id text; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.repair_tickets ADD COLUMN paid boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.repair_tickets ADD COLUMN paid_at timestamptz; EXCEPTION WHEN duplicate_column THEN NULL; END;
  ELSE
    CREATE TABLE public.repair_tickets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_name text NOT NULL,
      customer_email text NOT NULL DEFAULT '',
      customer_phone text NOT NULL DEFAULT '',
      device_type text NOT NULL DEFAULT '',
      device_model text NOT NULL DEFAULT '',
      issue_description text NOT NULL DEFAULT '',
      service_type text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'modtaget' CHECK (status IN ('modtaget', 'diagnostik', 'tilbud_sendt', 'godkendt', 'i_gang', 'faerdig', 'afhentet')),
      booking_details jsonb,
      customer_id uuid REFERENCES public.customers(id),
      device_id uuid REFERENCES public.customer_devices(id),
      services jsonb DEFAULT '[]',
      internal_notes jsonb DEFAULT '[]',
      intake_checklist jsonb DEFAULT '[]',
      intake_photos text[] DEFAULT '{}',
      checkout_photos text[] DEFAULT '{}',
      shopify_draft_order_id text,
      shopify_order_id text,
      paid boolean DEFAULT false,
      paid_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE public.repair_tickets ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Allow all for authenticated users" ON public.repair_tickets
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- ============================================================
-- Repair Quotes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.repair_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  price_dkk numeric NOT NULL DEFAULT 0,
  estimated_days integer,
  notes text,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON public.repair_quotes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Repair Status Log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.repair_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON public.repair_status_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Contact Inquiries
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'ny' CHECK (status IN ('ny', 'besvaret', 'lukket')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON public.contact_inquiries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anonymous inserts (from contact form)
CREATE POLICY "Allow anonymous inserts" ON public.contact_inquiries
  FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- SMS Log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sms_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.repair_tickets(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  phone text NOT NULL,
  message text NOT NULL,
  provider_message_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON public.sms_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Storage bucket for repair photos
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('repair-photos', 'repair-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload repair photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'repair-photos');

CREATE POLICY "Anyone can view repair photos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'repair-photos');

CREATE POLICY "Authenticated users can delete repair photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'repair-photos');

-- ============================================================
-- Updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'repair_tickets_updated_at') THEN
    CREATE TRIGGER repair_tickets_updated_at
      BEFORE UPDATE ON public.repair_tickets
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END
$$;
