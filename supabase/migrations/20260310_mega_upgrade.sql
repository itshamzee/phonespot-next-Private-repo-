-- ============================================================
-- PhoneSpot Mega Upgrade Migration
-- Date: 2026-03-10
-- ============================================================

-- Repair ticket extensions
ALTER TABLE repair_tickets
  ADD COLUMN IF NOT EXISTS is_urgent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS on_hold_reason text,
  ADD COLUMN IF NOT EXISTS parent_ticket_id uuid REFERENCES repair_tickets(id),
  ADD COLUMN IF NOT EXISTS ticket_number text,
  ADD COLUMN IF NOT EXISTS store_location_id uuid;

-- Repair service extensions
ALTER TABLE repair_services
  ADD COLUMN IF NOT EXISTS quality_tier text CHECK (quality_tier IN ('standard', 'premium', 'original')),
  ADD COLUMN IF NOT EXISTS info_note text,
  ADD COLUMN IF NOT EXISTS service_category text;

-- Contact inquiry extensions
ALTER TABLE contact_inquiries
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'kontaktformular',
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- ============================================================
-- New tables
-- ============================================================

-- Repair comments (intern + kundesynlige)
CREATE TABLE IF NOT EXISTS repair_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  author text NOT NULL,
  message text NOT NULL,
  visibility text NOT NULL DEFAULT 'intern' CHECK (visibility IN ('intern', 'kunde')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_repair_comments_ticket ON repair_comments(ticket_id);

-- Inquiry messages (conversation thread)
CREATE TABLE IF NOT EXISTS inquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES contact_inquiries(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('staff', 'customer')),
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'form')),
  body text NOT NULL,
  staff_name text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inquiry_messages_inquiry ON inquiry_messages(inquiry_id);

-- Reply templates (SMS, email, quick-reply)
CREATE TABLE IF NOT EXISTS reply_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('sms', 'email', 'quick-reply')),
  name text NOT NULL,
  subject text,
  body text NOT NULL,
  variables text[] DEFAULT '{}',
  sort_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Mail log
CREATE TABLE IF NOT EXISTS mail_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES repair_tickets(id),
  inquiry_id uuid REFERENCES contact_inquiries(id),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('delivered', 'bounced', 'failed', 'pending')),
  resend_id text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mail_log_ticket ON mail_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_mail_log_inquiry ON mail_log(inquiry_id);

-- Store locations
CREATE TABLE IF NOT EXISTS store_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  street text NOT NULL,
  city text NOT NULL,
  zip text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  mall text,
  hours_weekdays text NOT NULL DEFAULT '10:00 – 18:00',
  hours_saturday text NOT NULL DEFAULT '10:00 – 16:00',
  hours_sunday text NOT NULL DEFAULT 'Lukket',
  google_maps_url text NOT NULL,
  google_maps_embed text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- Seed data
-- ============================================================

-- Store locations
INSERT INTO store_locations (slug, name, street, city, zip, phone, email, mall, google_maps_url, google_maps_embed, latitude, longitude)
VALUES
  ('slagelse', 'PhoneSpot Slagelse', 'VestsjællandsCentret 10', 'Slagelse', '4200', '+45 XX XX XX XX', 'info@phonespot.dk', 'VestsjællandsCentret', 'https://maps.google.com/?q=VestsjællandsCentret+10,+4200+Slagelse', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2245.5!2d11.3531!3d55.4028', 55.4028, 11.3531),
  ('vejle', 'PhoneSpot Vejle', 'TBD', 'Vejle', '7100', '+45 XX XX XX XX', 'vejle@phonespot.dk', NULL, 'https://maps.google.com/?q=Vejle', 'https://www.google.com/maps/embed?pb=TBD', 55.7113, 9.5357)
ON CONFLICT (slug) DO NOTHING;

-- Default reply templates
INSERT INTO reply_templates (channel, name, body, variables, sort_order) VALUES
  ('quick-reply', 'Tak for henvendelse', 'Tak for din henvendelse, {kundenavn}. Vi vender tilbage inden for 24 timer.', '{kundenavn}', 1),
  ('quick-reply', 'Klar til afhentning', 'Hej {kundenavn}, din enhed er klar til afhentning i vores butik.', '{kundenavn}', 2),
  ('quick-reply', 'Modtaget enhed', 'Hej {kundenavn}, vi har modtaget din {enhed} og starter reparationen.', '{kundenavn,enhed}', 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Ticket number auto-generation
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'PS-' || EXTRACT(YEAR FROM NOW())::text || '-' || LPAD(nextval('ticket_number_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ticket_number ON repair_tickets;
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON repair_tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION generate_ticket_number();

-- ============================================================
-- RLS policies
-- ============================================================

ALTER TABLE repair_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reply_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON repair_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON inquiry_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON reply_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON mail_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON store_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public read access for store locations
CREATE POLICY "anon_read_locations" ON store_locations FOR SELECT TO anon USING (active = true);
