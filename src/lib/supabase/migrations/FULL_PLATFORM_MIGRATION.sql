-- =============================================================================
-- FULL_PLATFORM_MIGRATION.sql
-- PhoneSpot Platform — Complete Idempotent Migration
--
-- Combines (in order):
--   Base platform schema:
--     20260312_001_core_schema.sql
--     20260312_002_commerce_schema.sql
--     20260312_003_operations_schema.sql
--     20260312_004_compliance_schema.sql
--     20260312_005_staff_auth.sql
--     20260312_006_immutability_triggers.sql
--     20260312_007_computed_fields.sql
--     20260312_008_seed_data.sql
--     20260312_009_checkout_rpcs.sql
--   Enhancement migrations:
--     src/lib/supabase/migrations/004_product_management.sql
--     src/lib/supabase/migrations/005_orders_upgrade.sql
--     src/lib/supabase/migrations/006_draft_orders.sql
--     src/lib/supabase/migrations/007_abandoned_checkout.sql
--     src/lib/supabase/migrations/008_search_vectors.sql
--
-- SAFE TO RE-RUN: All statements are idempotent.
--
-- EXISTING DATABASE NOTES:
--   The repair system (migration 003_admin_repair_system.sql) already created
--   a `customers` table with columns: id, type, name, email, phone,
--   company_name, cvr, created_at. We ADD the missing commerce columns with
--   ALTER TABLE ADD COLUMN IF NOT EXISTS rather than recreating the table.
--
--   All CREATE INDEX use IF NOT EXISTS.
--   All CREATE POLICY are wrapped in DO $$ blocks to check pg_policies first.
--   All triggers are preceded by DROP TRIGGER IF EXISTS.
-- =============================================================================


-- =============================================================================
-- SECTION 1: 20260312_001_core_schema.sql
-- Core reference tables: locations, suppliers, product_templates, devices,
-- sku_products, sku_stock, purchase_documents
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LOCATIONS — physical stores and online
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  type TEXT NOT NULL CHECK (type IN ('store', 'warehouse', 'online')),
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SUPPLIERS — where devices are purchased
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('customer_trade_in', 'wholesale', 'auction')),
  is_vat_registered BOOLEAN NOT NULL DEFAULT FALSE,
  contact_info JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PRODUCT_TEMPLATES — defines a type of device
-- ============================================
CREATE TABLE IF NOT EXISTS product_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('iphone', 'smartphone', 'ipad', 'tablet', 'smartwatch', 'laptop', 'accessory', 'other')),
  storage_options TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  default_attributes JSONB DEFAULT '{}',
  display_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_templates_brand ON product_templates(brand);
CREATE INDEX IF NOT EXISTS idx_product_templates_category ON product_templates(category);
CREATE INDEX IF NOT EXISTS idx_product_templates_slug ON product_templates(slug);

-- ============================================
-- DEVICES — every physical used device (core table)
-- ============================================
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial_number TEXT,
  imei TEXT,
  template_id UUID NOT NULL REFERENCES product_templates(id) ON DELETE RESTRICT,
  barcode TEXT UNIQUE,
  grade TEXT NOT NULL CHECK (grade IN ('A', 'B', 'C')),
  battery_health INTEGER CHECK (battery_health >= 0 AND battery_health <= 100),
  storage TEXT,
  color TEXT,
  condition_notes TEXT,
  photos TEXT[] DEFAULT '{}',
  purchase_price INTEGER NOT NULL, -- in øre (DKK cents)
  selling_price INTEGER, -- in øre
  margin INTEGER GENERATED ALWAYS AS (COALESCE(selling_price, 0) - purchase_price) STORED,
  vat_scheme TEXT NOT NULL DEFAULT 'brugtmoms' CHECK (vat_scheme IN ('brugtmoms', 'regular')),
  vat_amount INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN vat_scheme = 'brugtmoms' THEN
        GREATEST(0, ((COALESCE(selling_price, 0) - purchase_price) * 25) / 100)
      ELSE
        (COALESCE(selling_price, 0) * 25) / 125 -- extract VAT from incl. price
    END
  ) STORED,
  origin_country TEXT NOT NULL DEFAULT 'DK',
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'intake' CHECK (status IN ('intake', 'graded', 'listed', 'reserved', 'sold', 'shipped', 'picked_up', 'returned')),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  listed_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  reservation_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_template ON devices(template_id);
CREATE INDEX IF NOT EXISTS idx_devices_location ON devices(location_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_barcode ON devices(barcode);
CREATE INDEX IF NOT EXISTS idx_devices_serial ON devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_devices_imei ON devices(imei);
CREATE INDEX IF NOT EXISTS idx_devices_supplier ON devices(supplier_id);

-- ============================================
-- SKU_PRODUCTS — accessories, covers, cables, spare parts
-- ============================================
CREATE TABLE IF NOT EXISTS sku_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  ean TEXT,
  product_number TEXT,
  cost_price INTEGER, -- in øre
  selling_price INTEGER NOT NULL, -- in øre
  sale_price INTEGER, -- permanent markdown, in øre
  brand TEXT,
  category TEXT,
  subcategory TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sku_products_ean ON sku_products(ean);
CREATE INDEX IF NOT EXISTS idx_sku_products_category ON sku_products(category);
CREATE INDEX IF NOT EXISTS idx_sku_products_brand ON sku_products(brand);

-- ============================================
-- SKU_STOCK — quantity per location
-- ============================================
CREATE TABLE IF NOT EXISTS sku_stock (
  product_id UUID NOT NULL REFERENCES sku_products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_level INTEGER DEFAULT 0,
  max_level INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, location_id)
);

-- ============================================
-- PURCHASE_DOCUMENTS — afregningsbilag for brugtmoms
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
  seller_name TEXT NOT NULL,
  seller_address TEXT NOT NULL,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_description TEXT NOT NULL,
  purchase_price INTEGER NOT NULL, -- in øre
  pdf_url TEXT,
  brugtmoms_text TEXT NOT NULL DEFAULT 'Købt med henblik på videresalg under brugtmomsordningen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_documents_device ON purchase_documents(device_id);


-- =============================================================================
-- SECTION 2: 20260312_002_commerce_schema.sql
-- Commerce tables: customers (conflict-safe), orders, order_items,
-- warranties, discount_codes
-- =============================================================================

-- ============================================
-- CUSTOMERS
-- NOTE: If the repair system already created this table (with columns:
--   id, type, name, email, phone, company_name, cvr, created_at),
--   the CREATE TABLE IF NOT EXISTS below will be skipped.
--   The ALTER TABLE statements that follow add the missing commerce columns.
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  phone TEXT,
  name TEXT NOT NULL,
  auth_id UUID UNIQUE,
  addresses JSONB DEFAULT '[]',
  notes TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing commerce columns if table already existed from repair system.
-- We do NOT change existing constraints (e.g. phone NOT NULL from repair system).
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add unique constraint on auth_id if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_auth_id_key'
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT customers_auth_id_key UNIQUE (auth_id);
  END IF;
END $$;

-- Indexes — use IF NOT EXISTS since idx_customers_email and idx_customers_phone
-- may already exist from the repair system migration.
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_auth ON customers(auth_id);

-- ============================================
-- ORDERS — unified online + POS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('online', 'pos')),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  is_b2b BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'picked_up', 'delivered', 'cancelled', 'refunded')),
  payment_method TEXT,
  stripe_payment_id TEXT,
  stripe_checkout_session_id TEXT,
  shipping_method TEXT,
  shipping_address JSONB,
  tracking_number TEXT,
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  shipping_cost INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  brugtmoms_total INTEGER NOT NULL DEFAULT 0,
  discount_code_id UUID,
  withdrawal_token TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_withdrawal_token ON orders(withdrawal_token);

-- ============================================
-- ORDER_ITEMS — line items
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('device', 'sku_product')),
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  sku_product_id UUID REFERENCES sku_products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  purchase_price INTEGER,
  vat_scheme TEXT CHECK (vat_scheme IN ('brugtmoms', 'regular')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_item_ref CHECK (
    (item_type = 'device' AND device_id IS NOT NULL AND sku_product_id IS NULL) OR
    (item_type = 'sku_product' AND sku_product_id IS NOT NULL AND device_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_device ON order_items(device_id);
CREATE INDEX IF NOT EXISTS idx_order_items_sku ON order_items(sku_product_id);

-- ============================================
-- WARRANTIES — garantibeviser
-- ============================================
CREATE TABLE IF NOT EXISTS warranties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  guarantee_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  pdf_url TEXT,
  qr_verification_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranties_order ON warranties(order_id);
CREATE INDEX IF NOT EXISTS idx_warranties_device ON warranties(device_id);
CREATE INDEX IF NOT EXISTS idx_warranties_customer ON warranties(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranties_guarantee_number ON warranties(guarantee_number);
CREATE INDEX IF NOT EXISTS idx_warranties_qr ON warranties(qr_verification_code);

-- ============================================
-- DISCOUNT_CODES
-- ============================================
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed', 'free_shipping')),
  value INTEGER NOT NULL,
  min_order_amount INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  usage_limit INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign key from orders to discount_codes (add only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_discount_code'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT fk_orders_discount_code
      FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE SET NULL;
  END IF;
END $$;


-- =============================================================================
-- SECTION 3: 20260312_003_operations_schema.sql
-- Operations tables: device_transfers, b2b_customers, trade_ins, invoices
-- =============================================================================

-- ============================================
-- DEVICE_TRANSFERS — movement between locations
-- ============================================
CREATE TABLE IF NOT EXISTS device_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  from_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  to_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transferred_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_transfers_device ON device_transfers(device_id);

-- ============================================
-- B2B_CUSTOMERS — business accounts
-- ============================================
CREATE TABLE IF NOT EXISTS b2b_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  cvr_nummer TEXT NOT NULL,
  payment_terms TEXT NOT NULL DEFAULT 'prepay' CHECK (payment_terms IN ('prepay', 'net15', 'net30')),
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_b2b_cvr ON b2b_customers(cvr_nummer);

-- ============================================
-- TRADE_INS — devices submitted for trade-in
-- ============================================
CREATE TABLE IF NOT EXISTS trade_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  device_description TEXT NOT NULL,
  template_id UUID REFERENCES product_templates(id) ON DELETE SET NULL,
  offered_price INTEGER,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'quoted', 'accepted', 'received', 'inspected', 'paid', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  inspection_notes TEXT,
  final_grade TEXT CHECK (final_grade IN ('A', 'B', 'C')),
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'online' CHECK (channel IN ('online', 'pos')),
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'store_credit', 'cash')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_ins_customer ON trade_ins(customer_id);
CREATE INDEX IF NOT EXISTS idx_trade_ins_status ON trade_ins(status);

-- ============================================
-- INVOICES — B2B net-term invoices
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  b2b_customer_id UUID NOT NULL REFERENCES b2b_customers(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  vat_amount INTEGER NOT NULL,
  total INTEGER NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_b2b ON invoices(b2b_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);


-- =============================================================================
-- SECTION 4: 20260312_004_compliance_schema.sql
-- Legal compliance + staff tables: staff, activity_log, price_history,
-- consent_log, tc_versions, order_tc_acceptance, notify_requests
-- =============================================================================

-- ============================================
-- STAFF — employees with roles
-- ============================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'owner')),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ACTIVITY_LOG — immutable audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID,
  actor_type TEXT CHECK (actor_type IN ('staff', 'customer', 'system')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON activity_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- ============================================
-- PRICE_HISTORY — 30-day Omnibus compliance
-- ============================================
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('device', 'sku_product')),
  entity_id UUID NOT NULL,
  old_price INTEGER,
  new_price INTEGER NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID
);

CREATE INDEX IF NOT EXISTS idx_price_history_entity ON price_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed ON price_history(changed_at DESC);

-- ============================================
-- CONSENT_LOG — GDPR consent tracking
-- ============================================
CREATE TABLE IF NOT EXISTS consent_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  session_id TEXT,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('cookies_statistics', 'cookies_marketing', 'marketing_email', 'marketing_sms', 'terms')),
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_consent_log_customer ON consent_log(customer_id);

-- ============================================
-- TC_VERSIONS — terms & conditions versioning
-- ============================================
CREATE TABLE IF NOT EXISTS tc_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT NOT NULL UNIQUE,
  content_hash TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pdf_url TEXT
);

-- ============================================
-- ORDER_TC_ACCEPTANCE — which T&C version accepted per order
-- ============================================
CREATE TABLE IF NOT EXISTS order_tc_acceptance (
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tc_version_id UUID NOT NULL REFERENCES tc_versions(id) ON DELETE RESTRICT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (order_id)
);

-- ============================================
-- NOTIFY_REQUESTS — "notify me" sign-ups
-- ============================================
CREATE TABLE IF NOT EXISTS notify_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_email TEXT NOT NULL,
  template_id UUID NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
  grade_preference TEXT CHECK (grade_preference IN ('A', 'B', 'C')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'purchased')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notify_requests_template ON notify_requests(template_id);
CREATE INDEX IF NOT EXISTS idx_notify_requests_email ON notify_requests(customer_email);


-- =============================================================================
-- SECTION 5: 20260312_005_staff_auth.sql
-- Row Level Security: helper functions + RLS policies
-- All CREATE POLICY statements wrapped in DO $$ blocks for idempotency.
-- =============================================================================

-- Helper functions (CREATE OR REPLACE is idempotent)
CREATE OR REPLACE FUNCTION get_staff_role()
RETURNS TEXT AS $$
  SELECT role FROM staff WHERE auth_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_staff_id()
RETURNS UUID AS $$
  SELECT id FROM staff WHERE auth_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_staff_location()
RETURNS UUID AS $$
  SELECT location_id FROM staff WHERE auth_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM staff WHERE auth_id = auth.uid() AND role = 'owner' AND is_active = TRUE);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_manager_or_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM staff WHERE auth_id = auth.uid() AND role IN ('manager', 'owner') AND is_active = TRUE);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM staff WHERE auth_id = auth.uid() AND is_active = TRUE);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables (safe to run multiple times — ALTER TABLE is idempotent for RLS)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tc_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tc_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notify_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- ── PUBLIC READ policies (for webshop) ───────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'locations_public_read' AND tablename = 'locations') THEN
    CREATE POLICY locations_public_read ON locations FOR SELECT USING (TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'templates_public_read' AND tablename = 'product_templates') THEN
    CREATE POLICY templates_public_read ON product_templates FOR SELECT USING (TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'devices_public_read' AND tablename = 'devices') THEN
    CREATE POLICY devices_public_read ON devices FOR SELECT USING (status = 'listed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sku_products_public_read' AND tablename = 'sku_products') THEN
    CREATE POLICY sku_products_public_read ON sku_products FOR SELECT USING (is_active = TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sku_stock_public_read' AND tablename = 'sku_stock') THEN
    CREATE POLICY sku_stock_public_read ON sku_stock FOR SELECT USING (TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tc_public_read' AND tablename = 'tc_versions') THEN
    CREATE POLICY tc_public_read ON tc_versions FOR SELECT USING (TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'discount_codes_public_read' AND tablename = 'discount_codes') THEN
    CREATE POLICY discount_codes_public_read ON discount_codes FOR SELECT USING (is_active = TRUE);
  END IF;
END $$;

-- ── PUBLIC WRITE policies (for customers) ────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notify_requests_public_insert' AND tablename = 'notify_requests') THEN
    CREATE POLICY notify_requests_public_insert ON notify_requests FOR INSERT WITH CHECK (TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'consent_log_public_insert' AND tablename = 'consent_log') THEN
    CREATE POLICY consent_log_public_insert ON consent_log FOR INSERT WITH CHECK (TRUE);
  END IF;
END $$;

-- ── STAFF policies — all staff can read everything ───────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_devices' AND tablename = 'devices') THEN
    CREATE POLICY staff_read_devices ON devices FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_customers' AND tablename = 'customers') THEN
    CREATE POLICY staff_read_customers ON customers FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_orders' AND tablename = 'orders') THEN
    CREATE POLICY staff_read_orders ON orders FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_order_items' AND tablename = 'order_items') THEN
    CREATE POLICY staff_read_order_items ON order_items FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_warranties' AND tablename = 'warranties') THEN
    CREATE POLICY staff_read_warranties ON warranties FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_suppliers' AND tablename = 'suppliers') THEN
    CREATE POLICY staff_read_suppliers ON suppliers FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_purchase_docs' AND tablename = 'purchase_documents') THEN
    CREATE POLICY staff_read_purchase_docs ON purchase_documents FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_transfers' AND tablename = 'device_transfers') THEN
    CREATE POLICY staff_read_transfers ON device_transfers FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_trade_ins' AND tablename = 'trade_ins') THEN
    CREATE POLICY staff_read_trade_ins ON trade_ins FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_b2b' AND tablename = 'b2b_customers') THEN
    CREATE POLICY staff_read_b2b ON b2b_customers FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_invoices' AND tablename = 'invoices') THEN
    CREATE POLICY staff_read_invoices ON invoices FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_activity' AND tablename = 'activity_log') THEN
    CREATE POLICY staff_read_activity ON activity_log FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_price_history' AND tablename = 'price_history') THEN
    CREATE POLICY staff_read_price_history ON price_history FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_consent' AND tablename = 'consent_log') THEN
    CREATE POLICY staff_read_consent ON consent_log FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_notify' AND tablename = 'notify_requests') THEN
    CREATE POLICY staff_read_notify ON notify_requests FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_staff' AND tablename = 'staff') THEN
    CREATE POLICY staff_read_staff ON staff FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_discount' AND tablename = 'discount_codes') THEN
    CREATE POLICY staff_read_discount ON discount_codes FOR SELECT USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_order_tc' AND tablename = 'order_tc_acceptance') THEN
    CREATE POLICY staff_read_order_tc ON order_tc_acceptance FOR SELECT USING (is_staff());
  END IF;
END $$;

-- ── EMPLOYEE write policies (POS + intake) ───────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_insert_devices' AND tablename = 'devices') THEN
    CREATE POLICY staff_insert_devices ON devices FOR INSERT WITH CHECK (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_update_devices' AND tablename = 'devices') THEN
    CREATE POLICY staff_update_devices ON devices FOR UPDATE USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_insert_purchase_docs' AND tablename = 'purchase_documents') THEN
    CREATE POLICY staff_insert_purchase_docs ON purchase_documents FOR INSERT WITH CHECK (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_insert_orders' AND tablename = 'orders') THEN
    CREATE POLICY staff_insert_orders ON orders FOR INSERT WITH CHECK (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_insert_order_items' AND tablename = 'order_items') THEN
    CREATE POLICY staff_insert_order_items ON order_items FOR INSERT WITH CHECK (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_insert_customers' AND tablename = 'customers') THEN
    CREATE POLICY staff_insert_customers ON customers FOR INSERT WITH CHECK (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_update_customers' AND tablename = 'customers') THEN
    CREATE POLICY staff_update_customers ON customers FOR UPDATE USING (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_insert_warranties' AND tablename = 'warranties') THEN
    CREATE POLICY staff_insert_warranties ON warranties FOR INSERT WITH CHECK (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_insert_activity' AND tablename = 'activity_log') THEN
    CREATE POLICY staff_insert_activity ON activity_log FOR INSERT WITH CHECK (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_insert_trade_ins' AND tablename = 'trade_ins') THEN
    CREATE POLICY staff_insert_trade_ins ON trade_ins FOR INSERT WITH CHECK (is_staff());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_update_trade_ins' AND tablename = 'trade_ins') THEN
    CREATE POLICY staff_update_trade_ins ON trade_ins FOR UPDATE USING (is_staff());
  END IF;
END $$;

-- ── MANAGER+ write policies ──────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manager_insert_transfers' AND tablename = 'device_transfers') THEN
    CREATE POLICY manager_insert_transfers ON device_transfers FOR INSERT
      WITH CHECK (is_manager_or_owner() AND (is_owner() OR from_location_id = get_staff_location()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manager_insert_suppliers' AND tablename = 'suppliers') THEN
    CREATE POLICY manager_insert_suppliers ON suppliers FOR INSERT WITH CHECK (is_manager_or_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manager_update_suppliers' AND tablename = 'suppliers') THEN
    CREATE POLICY manager_update_suppliers ON suppliers FOR UPDATE USING (is_manager_or_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manager_insert_templates' AND tablename = 'product_templates') THEN
    CREATE POLICY manager_insert_templates ON product_templates FOR INSERT WITH CHECK (is_manager_or_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manager_update_templates' AND tablename = 'product_templates') THEN
    CREATE POLICY manager_update_templates ON product_templates FOR UPDATE USING (is_manager_or_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manager_insert_sku' AND tablename = 'sku_products') THEN
    CREATE POLICY manager_insert_sku ON sku_products FOR INSERT WITH CHECK (is_manager_or_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manager_update_sku' AND tablename = 'sku_products') THEN
    CREATE POLICY manager_update_sku ON sku_products FOR UPDATE USING (is_manager_or_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manager_insert_sku_stock' AND tablename = 'sku_stock') THEN
    CREATE POLICY manager_insert_sku_stock ON sku_stock FOR INSERT
      WITH CHECK (is_manager_or_owner() AND (is_owner() OR location_id = get_staff_location()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manager_update_sku_stock' AND tablename = 'sku_stock') THEN
    CREATE POLICY manager_update_sku_stock ON sku_stock FOR UPDATE
      USING (is_manager_or_owner() AND (is_owner() OR location_id = get_staff_location()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manager_insert_price_history' AND tablename = 'price_history') THEN
    CREATE POLICY manager_insert_price_history ON price_history FOR INSERT WITH CHECK (is_manager_or_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manager_update_orders' AND tablename = 'orders') THEN
    CREATE POLICY manager_update_orders ON orders FOR UPDATE
      USING (is_manager_or_owner() AND (is_owner() OR location_id = get_staff_location()));
  END IF;
END $$;

-- ── OWNER-only policies ──────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_insert_staff' AND tablename = 'staff') THEN
    CREATE POLICY owner_insert_staff ON staff FOR INSERT WITH CHECK (is_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_update_staff' AND tablename = 'staff') THEN
    CREATE POLICY owner_update_staff ON staff FOR UPDATE USING (is_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_delete_staff' AND tablename = 'staff') THEN
    CREATE POLICY owner_delete_staff ON staff FOR DELETE USING (is_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_insert_locations' AND tablename = 'locations') THEN
    CREATE POLICY owner_insert_locations ON locations FOR INSERT WITH CHECK (is_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_update_locations' AND tablename = 'locations') THEN
    CREATE POLICY owner_update_locations ON locations FOR UPDATE USING (is_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_insert_discount' AND tablename = 'discount_codes') THEN
    CREATE POLICY owner_insert_discount ON discount_codes FOR INSERT WITH CHECK (is_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_update_discount' AND tablename = 'discount_codes') THEN
    CREATE POLICY owner_update_discount ON discount_codes FOR UPDATE USING (is_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_insert_b2b' AND tablename = 'b2b_customers') THEN
    CREATE POLICY owner_insert_b2b ON b2b_customers FOR INSERT WITH CHECK (is_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_update_b2b' AND tablename = 'b2b_customers') THEN
    CREATE POLICY owner_update_b2b ON b2b_customers FOR UPDATE USING (is_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_insert_invoices' AND tablename = 'invoices') THEN
    CREATE POLICY owner_insert_invoices ON invoices FOR INSERT WITH CHECK (is_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_update_invoices' AND tablename = 'invoices') THEN
    CREATE POLICY owner_update_invoices ON invoices FOR UPDATE USING (is_owner());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_insert_tc' AND tablename = 'tc_versions') THEN
    CREATE POLICY owner_insert_tc ON tc_versions FOR INSERT WITH CHECK (is_owner());
  END IF;
END $$;


-- =============================================================================
-- SECTION 6: 20260312_006_immutability_triggers.sql
-- Prevent modification of finalized orders and activity log (Bogføringsloven)
-- All triggers preceded by DROP TRIGGER IF EXISTS for idempotency.
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_order_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('confirmed', 'shipped', 'picked_up', 'delivered') THEN
    IF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
      IF (OLD.status = 'confirmed' AND NEW.status IN ('shipped', 'picked_up', 'cancelled')) OR
         (OLD.status = 'shipped' AND NEW.status IN ('delivered', 'refunded')) OR
         (OLD.status = 'picked_up' AND NEW.status IN ('delivered', 'refunded')) OR
         (OLD.status = 'delivered' AND NEW.status = 'refunded') THEN
        RETURN NEW;
      END IF;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.tracking_number IS DISTINCT FROM OLD.tracking_number THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cannot modify finalized order %. Use a correction/refund entry instead.', OLD.order_number;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_immutability ON orders;
CREATE TRIGGER trg_order_immutability
  BEFORE UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_order_modification();

CREATE OR REPLACE FUNCTION prevent_order_items_modification()
RETURNS TRIGGER AS $$
DECLARE
  order_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO order_status FROM orders WHERE id = OLD.order_id;
  ELSE
    SELECT status INTO order_status FROM orders WHERE id = NEW.order_id;
  END IF;

  IF order_status IN ('confirmed', 'shipped', 'picked_up', 'delivered') THEN
    RAISE EXCEPTION 'Cannot modify items on a finalized order. Use a correction/refund entry instead.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_items_immutability ON order_items;
CREATE TRIGGER trg_order_items_immutability
  BEFORE UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_order_items_modification();

CREATE OR REPLACE FUNCTION prevent_activity_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Activity log is append-only. Cannot update or delete entries.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_activity_log_immutable ON activity_log;
CREATE TRIGGER trg_activity_log_immutable
  BEFORE UPDATE OR DELETE ON activity_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_activity_log_modification();


-- =============================================================================
-- SECTION 7: 20260312_007_computed_fields.sql
-- Auto-generated order numbers, guarantee numbers, updated_at triggers,
-- price history triggers
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'PSP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_number ON orders;
CREATE TRIGGER trg_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

CREATE SEQUENCE IF NOT EXISTS guarantee_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_guarantee_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.guarantee_number IS NULL OR NEW.guarantee_number = '' THEN
    NEW.guarantee_number := 'PSP-GAR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('guarantee_number_seq')::TEXT, 5, '0');
  END IF;
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.issued_at + INTERVAL '36 months';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guarantee_number ON warranties;
CREATE TRIGGER trg_guarantee_number
  BEFORE INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION generate_guarantee_number();

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'PSP-INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_number ON invoices;
CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

CREATE SEQUENCE IF NOT EXISTS device_barcode_seq START 1;

CREATE OR REPLACE FUNCTION generate_device_barcode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.barcode IS NULL OR NEW.barcode = '' THEN
    NEW.barcode := 'PSP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('device_barcode_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_device_barcode ON devices;
CREATE TRIGGER trg_device_barcode
  BEFORE INSERT ON devices
  FOR EACH ROW
  EXECUTE FUNCTION generate_device_barcode();

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION generate_withdrawal_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'online' AND NEW.withdrawal_token IS NULL THEN
    NEW.withdrawal_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_withdrawal_token ON orders;
CREATE TRIGGER trg_withdrawal_token
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_withdrawal_token();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_updated_at_locations ON locations;
CREATE TRIGGER trg_updated_at_locations BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_suppliers ON suppliers;
CREATE TRIGGER trg_updated_at_suppliers BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_templates ON product_templates;
CREATE TRIGGER trg_updated_at_templates BEFORE UPDATE ON product_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_devices ON devices;
CREATE TRIGGER trg_updated_at_devices BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_sku_products ON sku_products;
CREATE TRIGGER trg_updated_at_sku_products BEFORE UPDATE ON sku_products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_customers ON customers;
CREATE TRIGGER trg_updated_at_customers BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_orders ON orders;
CREATE TRIGGER trg_updated_at_orders BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_b2b ON b2b_customers;
CREATE TRIGGER trg_updated_at_b2b BEFORE UPDATE ON b2b_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_trade_ins ON trade_ins;
CREATE TRIGGER trg_updated_at_trade_ins BEFORE UPDATE ON trade_ins FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_invoices ON invoices;
CREATE TRIGGER trg_updated_at_invoices BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_staff ON staff;
CREATE TRIGGER trg_updated_at_staff BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION track_device_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.selling_price IS DISTINCT FROM NEW.selling_price THEN
    INSERT INTO price_history (entity_type, entity_id, old_price, new_price, changed_by)
    VALUES ('device', NEW.id, OLD.selling_price, NEW.selling_price, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_device_price_history ON devices;
CREATE TRIGGER trg_device_price_history
  AFTER UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION track_device_price_change();

CREATE OR REPLACE FUNCTION track_sku_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.selling_price IS DISTINCT FROM NEW.selling_price OR
     OLD.sale_price IS DISTINCT FROM NEW.sale_price THEN
    INSERT INTO price_history (entity_type, entity_id, old_price, new_price, changed_by)
    VALUES ('sku_product', NEW.id,
      COALESCE(OLD.sale_price, OLD.selling_price),
      COALESCE(NEW.sale_price, NEW.selling_price),
      auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sku_price_history ON sku_products;
CREATE TRIGGER trg_sku_price_history
  AFTER UPDATE ON sku_products
  FOR EACH ROW
  EXECUTE FUNCTION track_sku_price_change();


-- =============================================================================
-- SECTION 8: 20260312_008_seed_data.sql
-- Initial seed data: locations, T&C version
-- =============================================================================

INSERT INTO locations (name, address, type, phone, email) VALUES
  ('Slagelse', 'Slagelse, Denmark', 'store', NULL, 'slagelse@phonespot.dk'),
  ('Vejle', 'Vejle, Denmark', 'store', NULL, 'vejle@phonespot.dk'),
  ('Online', 'phonespot.dk', 'online', NULL, 'info@phonespot.dk')
ON CONFLICT DO NOTHING;

-- Initial T&C version (placeholder — content managed separately)
INSERT INTO tc_versions (version, content_hash, published_at) VALUES
  ('1.0', 'initial', NOW())
ON CONFLICT DO NOTHING;


-- =============================================================================
-- SECTION 9: 20260312_009_checkout_rpcs.sql
-- RPCs for checkout webhook: stock decrement and discount usage increment
-- =============================================================================

CREATE OR REPLACE FUNCTION decrement_sku_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE sku_stock
  SET quantity = quantity - p_quantity,
      updated_at = NOW()
  FROM locations
  WHERE sku_stock.product_id = p_product_id
    AND sku_stock.location_id = locations.id
    AND locations.type = 'online'
    AND sku_stock.quantity >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_discount_usage(p_discount_code_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE discount_codes
  SET times_used = times_used + 1
  WHERE id = p_discount_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- SECTION 10: 004_product_management.sql
-- Enhancement: product management columns, sku_product_templates join table
-- =============================================================================

-- ── product_templates: new columns ──────────────────────────────────────────
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '{}';
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_a integer;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_b integer;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_c integer;

-- Add CHECK constraint for status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_templates_status_check'
  ) THEN
    ALTER TABLE product_templates ADD CONSTRAINT product_templates_status_check
      CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

-- Update category CHECK to include 'console'
-- Drop the old constraint (from CREATE TABLE) and replace with expanded version
ALTER TABLE product_templates DROP CONSTRAINT IF EXISTS product_templates_category_check;
ALTER TABLE product_templates ADD CONSTRAINT product_templates_category_check
  CHECK (category IN ('iphone', 'smartphone', 'ipad', 'tablet', 'smartwatch', 'laptop', 'console', 'accessory', 'other'));

-- ── sku_products: new columns ────────────────────────────────────────────────
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]';
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Add unique constraint on slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sku_products_slug_unique'
  ) THEN
    ALTER TABLE sku_products ADD CONSTRAINT sku_products_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- Add status CHECK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sku_products_status_check'
  ) THEN
    ALTER TABLE sku_products ADD CONSTRAINT sku_products_status_check
      CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

-- Migrate is_active → status (only for rows where status is still NULL)
UPDATE sku_products SET status = CASE WHEN is_active THEN 'published' ELSE 'draft' END
WHERE status IS NULL;

-- ── sku_product_templates join table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sku_product_templates (
  sku_product_id uuid NOT NULL REFERENCES sku_products(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
  PRIMARY KEY (sku_product_id, template_id)
);

-- Index for reverse lookups (accessories for a template)
CREATE INDEX IF NOT EXISTS idx_sku_product_templates_template
  ON sku_product_templates(template_id);


-- =============================================================================
-- SECTION 11: 005_orders_upgrade.sql
-- Enhancement: payment_status, fulfillment_status, tracking fields on orders;
-- expands orders.type CHECK to include 'draft' and 'shopify'
-- =============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('pending', 'paid', 'refunded', 'partially_refunded'));
  END IF;
END $$;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_status text DEFAULT 'unfulfilled';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_fulfillment_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_status_check
      CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'shipped', 'delivered', 'returned'));
  END IF;
END $$;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_order_id text;

-- Expand orders.type CHECK to include 'draft' and 'shopify'
-- (DROP CONSTRAINT IF EXISTS then re-add is the idempotent pattern here)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_type_check
  CHECK (type IN ('online', 'pos', 'draft', 'shopify'));

-- Backfill payment_status for existing orders
UPDATE orders SET payment_status = 'paid'
  WHERE status IN ('confirmed', 'shipped', 'picked_up', 'delivered') AND payment_status = 'pending';
UPDATE orders SET payment_status = 'refunded'
  WHERE status = 'refunded' AND payment_status = 'pending';

-- Backfill fulfillment_status for existing orders
UPDATE orders SET fulfillment_status = 'shipped'
  WHERE status = 'shipped' AND fulfillment_status = 'unfulfilled';
UPDATE orders SET fulfillment_status = 'delivered'
  WHERE status IN ('delivered', 'picked_up') AND fulfillment_status = 'unfulfilled';


-- =============================================================================
-- SECTION 12: 006_draft_orders.sql
-- Enhancement: draft_orders table, draft_order_id on repair_tickets,
-- draft_order_number_seq sequence
-- =============================================================================

CREATE TABLE IF NOT EXISTS draft_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  customer_email text,
  customer_name text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'converting', 'cancelled')),
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal integer NOT NULL DEFAULT 0,
  discount_amount integer DEFAULT 0,
  shipping_cost integer DEFAULT 0,
  tax_amount integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  currency text DEFAULT 'DKK',
  internal_note text,
  customer_note text,
  payment_url text,
  stripe_session_id text,
  paid_at timestamptz,
  converted_order_id uuid REFERENCES orders(id),
  repair_ticket_id uuid REFERENCES repair_tickets(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_draft_orders_status ON draft_orders(status);
CREATE INDEX IF NOT EXISTS idx_draft_orders_customer ON draft_orders(customer_id);

-- Add draft_order_id to repair_tickets
ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS draft_order_id uuid REFERENCES draft_orders(id);

-- Sequence for draft numbers
CREATE SEQUENCE IF NOT EXISTS draft_order_number_seq START WITH 1001;


-- =============================================================================
-- SECTION 13: 007_abandoned_checkout.sql
-- Enhancement: abandoned checkout tracking fields on orders;
-- expands orders.status CHECK to include 'abandoned'
-- =============================================================================

-- Expand orders.status CHECK to include 'abandoned'
-- (DROP CONSTRAINT IF EXISTS then re-add is the idempotent pattern)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'picked_up', 'delivered', 'cancelled', 'refunded', 'abandoned'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS abandoned_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_status text DEFAULT 'none';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_token text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_email_sent_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_sms_sent_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_recovery_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_recovery_status_check
      CHECK (recovery_status IN ('none', 'email_sent', 'sms_sent', 'both_sent', 'recovered'));
  END IF;
END $$;

-- Unique index on recovery_token (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_recovery_token
  ON orders(recovery_token) WHERE recovery_token IS NOT NULL;


-- =============================================================================
-- SECTION 14: 008_search_vectors.sql
-- Enhancement: full-text search vectors with Danish stemming for
-- product_templates and sku_products
-- =============================================================================

-- ── product_templates search vector ──────────────────────────────────────────
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_product_templates_search
  ON product_templates USING GIN (search_vector);

CREATE OR REPLACE FUNCTION update_product_template_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('danish', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('danish', coalesce(NEW.brand, '')), 'A') ||
    setweight(to_tsvector('danish', coalesce(NEW.model, '')), 'B') ||
    setweight(to_tsvector('danish', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('danish', coalesce(NEW.short_description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_templates_search ON product_templates;
CREATE TRIGGER trg_product_templates_search
  BEFORE INSERT OR UPDATE ON product_templates
  FOR EACH ROW EXECUTE FUNCTION update_product_template_search_vector();

-- Backfill existing rows
UPDATE product_templates SET search_vector =
  setweight(to_tsvector('danish', coalesce(display_name, '')), 'A') ||
  setweight(to_tsvector('danish', coalesce(brand, '')), 'A') ||
  setweight(to_tsvector('danish', coalesce(model, '')), 'B') ||
  setweight(to_tsvector('danish', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('danish', coalesce(short_description, '')), 'C');

-- ── sku_products search vector ────────────────────────────────────────────────
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_sku_products_search
  ON sku_products USING GIN (search_vector);

CREATE OR REPLACE FUNCTION update_sku_product_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('danish', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('danish', coalesce(NEW.brand, '')), 'B') ||
    setweight(to_tsvector('danish', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('danish', coalesce(NEW.short_description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sku_products_search ON sku_products;
CREATE TRIGGER trg_sku_products_search
  BEFORE INSERT OR UPDATE ON sku_products
  FOR EACH ROW EXECUTE FUNCTION update_sku_product_search_vector();

-- Backfill existing rows
UPDATE sku_products SET search_vector =
  setweight(to_tsvector('danish', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('danish', coalesce(brand, '')), 'B') ||
  setweight(to_tsvector('danish', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('danish', coalesce(short_description, '')), 'C');


-- =============================================================================
-- END OF FULL_PLATFORM_MIGRATION.sql
-- =============================================================================
