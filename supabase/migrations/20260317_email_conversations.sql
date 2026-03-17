-- ============================================================
-- Migration: Email Conversations & Buyback Flow
-- Date: 2026-03-17
-- ============================================================

-- 1. Staff Profiles
CREATE TABLE IF NOT EXISTS staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  title text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_user_id ON staff_profiles(user_id);

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read staff_profiles"
  ON staff_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert own staff_profiles"
  ON staff_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can update own staff_profiles"
  ON staff_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 2. Company Settings (single-row enforced)
CREATE TABLE IF NOT EXISTS company_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  logo_url text,
  company_name text NOT NULL DEFAULT 'PhoneSpot',
  address text,
  postal_city text,
  phone text,
  email text,
  website text DEFAULT 'https://phonespot.dk',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read company_settings"
  ON company_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update company_settings"
  ON company_settings FOR UPDATE TO authenticated USING (true);

-- Seed default row
INSERT INTO company_settings (company_name, address, postal_city, phone, email, website)
VALUES ('PhoneSpot', 'Nørrebrogade 42', '2200 København N', '+45 50 50 50 50', 'support@phonespot.dk', 'https://phonespot.dk')
ON CONFLICT (id) DO NOTHING;

-- 3. Shipping Labels
CREATE TABLE IF NOT EXISTS shipping_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES trade_in_offers(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'postnord',
  tracking_number text,
  label_url text NOT NULL,
  status text NOT NULL DEFAULT 'label_created'
    CHECK (status IN ('label_created', 'in_transit', 'delivered')),
  shipmondo_shipment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipping_labels_offer_id_unique UNIQUE (offer_id)
);

CREATE INDEX IF NOT EXISTS idx_shipping_labels_offer_id ON shipping_labels(offer_id);

ALTER TABLE shipping_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage shipping_labels"
  ON shipping_labels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Add columns to mail_log
ALTER TABLE mail_log
  ADD COLUMN IF NOT EXISTS message_id text,
  ADD COLUMN IF NOT EXISTS resend_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_log_message_id
  ON mail_log(message_id) WHERE message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_log_resend_event_id
  ON mail_log(resend_event_id) WHERE resend_event_id IS NOT NULL;

-- 5. Add columns to inquiry_messages
ALTER TABLE inquiry_messages
  ADD COLUMN IF NOT EXISTS in_reply_to text;

-- 6. Add email_thread_id to contact_inquiries
ALTER TABLE contact_inquiries
  ADD COLUMN IF NOT EXISTS email_thread_id uuid;

-- 7. Supabase Storage bucket for shipping labels
INSERT INTO storage.buckets (id, name, public)
VALUES ('shipping-labels', 'shipping-labels', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload shipping labels"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shipping-labels');

CREATE POLICY "Authenticated users can read shipping labels"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'shipping-labels');

-- 8. Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER staff_profiles_updated_at
    BEFORE UPDATE ON staff_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER shipping_labels_updated_at
    BEFORE UPDATE ON shipping_labels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
