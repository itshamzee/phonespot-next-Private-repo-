-- ============================================================
-- Trade-In & Slutseddel System
-- ============================================================

-- 1. Yearly counter for receipt numbers
CREATE TABLE IF NOT EXISTS trade_in_receipt_counters (
  year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

-- 2. Receipt number generator (SS-YYYY-NNNN, resets yearly)
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text AS $$
DECLARE
  current_year integer;
  next_num integer;
BEGIN
  current_year := extract(year from now())::integer;
  INSERT INTO trade_in_receipt_counters (year, last_number)
  VALUES (current_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = trade_in_receipt_counters.last_number + 1
  RETURNING last_number INTO next_num;
  RETURN 'SS-' || current_year || '-' || lpad(next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Trade-in offers
CREATE TABLE IF NOT EXISTS trade_in_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES contact_inquiries(id) ON DELETE CASCADE,
  offer_amount integer NOT NULL CHECK (offer_amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  admin_note text,
  customer_response_note text,
  responded_at timestamptz,
  seller_name text,
  seller_address text,
  seller_postal_city text,
  seller_bank_reg text,
  seller_bank_account text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_in_offers_inquiry ON trade_in_offers(inquiry_id);
CREATE INDEX idx_trade_in_offers_token ON trade_in_offers(token);
CREATE INDEX idx_trade_in_offers_status ON trade_in_offers(status);

-- 4. Trade-in receipts (slutsedler)
CREATE TABLE IF NOT EXISTS trade_in_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL DEFAULT generate_receipt_number(),
  inquiry_id uuid REFERENCES contact_inquiries(id),
  offer_id uuid REFERENCES trade_in_offers(id),
  store_location_id uuid REFERENCES store_locations(id),
  seller_name text NOT NULL,
  seller_address text,
  seller_postal_city text,
  seller_phone text,
  seller_email text,
  seller_bank_reg text,
  seller_bank_account text,
  buyer_company text NOT NULL DEFAULT 'Phonego ApS',
  buyer_cvr text NOT NULL DEFAULT '38688766',
  buyer_address text,
  buyer_postal_city text,
  buyer_email text NOT NULL DEFAULT 'ha@phonespot.dk',
  buyer_phone text,
  total_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid', 'completed')),
  staff_initials text,
  pdf_url text,
  delivery_method text CHECK (delivery_method IN ('shipping', 'in_store')),
  confirmed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_in_receipts_inquiry ON trade_in_receipts(inquiry_id);
CREATE INDEX idx_trade_in_receipts_offer ON trade_in_receipts(offer_id);
CREATE INDEX idx_trade_in_receipts_status ON trade_in_receipts(status);

-- 5. Trade-in receipt items (devices on a slutseddel)
CREATE TABLE IF NOT EXISTS trade_in_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES trade_in_receipts(id) ON DELETE CASCADE,
  imei_serial text,
  brand text NOT NULL,
  model text NOT NULL,
  storage text,
  ram text,
  condition_grade text CHECK (condition_grade IN ('Perfekt', 'God', 'Acceptabel', 'Defekt')),
  color text,
  condition_notes text,
  price integer NOT NULL CHECK (price > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_in_receipt_items_receipt ON trade_in_receipt_items(receipt_id);

-- 6. Updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trade_in_offers_updated_at
  BEFORE UPDATE ON trade_in_offers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trade_in_receipts_updated_at
  BEFORE UPDATE ON trade_in_receipts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trade_in_receipt_items_updated_at
  BEFORE UPDATE ON trade_in_receipt_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. RLS Policies
ALTER TABLE trade_in_receipt_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_in_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_in_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_in_receipt_items ENABLE ROW LEVEL SECURITY;

-- Authenticated users (admin) get full access
CREATE POLICY "Authenticated full access" ON trade_in_receipt_counters
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON trade_in_offers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON trade_in_receipts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON trade_in_receipt_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
