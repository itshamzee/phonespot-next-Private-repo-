-- ============================================================
-- COMBINED MIGRATION: 004 → 008
-- Run this in Supabase SQL Editor in one go.
-- All statements are idempotent (safe to re-run).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 004: PRODUCT MANAGEMENT
-- ────────────────────────────────────────────────────────────

ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '{}';
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_a integer;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_b integer;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_c integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_templates_status_check'
  ) THEN
    ALTER TABLE product_templates ADD CONSTRAINT product_templates_status_check
      CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

ALTER TABLE product_templates DROP CONSTRAINT IF EXISTS product_templates_category_check;
ALTER TABLE product_templates ADD CONSTRAINT product_templates_category_check
  CHECK (category IN ('iphone', 'smartphone', 'ipad', 'tablet', 'smartwatch', 'laptop', 'console', 'accessory', 'other'));

ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]';
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sku_products_slug_unique'
  ) THEN
    ALTER TABLE sku_products ADD CONSTRAINT sku_products_slug_unique UNIQUE (slug);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sku_products_status_check'
  ) THEN
    ALTER TABLE sku_products ADD CONSTRAINT sku_products_status_check
      CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

UPDATE sku_products SET status = CASE WHEN is_active THEN 'published' ELSE 'draft' END
WHERE status IS NULL;

CREATE TABLE IF NOT EXISTS sku_product_templates (
  sku_product_id uuid NOT NULL REFERENCES sku_products(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
  PRIMARY KEY (sku_product_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_sku_product_templates_template
  ON sku_product_templates(template_id);


-- ────────────────────────────────────────────────────────────
-- 005: ORDERS UPGRADE
-- ────────────────────────────────────────────────────────────

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

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_type_check
  CHECK (type IN ('online', 'pos', 'draft', 'shopify'));

UPDATE orders SET payment_status = 'paid' WHERE status IN ('confirmed', 'shipped', 'picked_up', 'delivered') AND payment_status = 'pending';
UPDATE orders SET payment_status = 'refunded' WHERE status = 'refunded' AND payment_status = 'pending';
UPDATE orders SET fulfillment_status = 'shipped' WHERE status = 'shipped' AND fulfillment_status = 'unfulfilled';
UPDATE orders SET fulfillment_status = 'delivered' WHERE status IN ('delivered', 'picked_up') AND fulfillment_status = 'unfulfilled';


-- ────────────────────────────────────────────────────────────
-- 006: DRAFT ORDERS
-- ────────────────────────────────────────────────────────────

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

ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS draft_order_id uuid REFERENCES draft_orders(id);

CREATE SEQUENCE IF NOT EXISTS draft_order_number_seq START WITH 1001;


-- ────────────────────────────────────────────────────────────
-- 007: ABANDONED CHECKOUT
-- ────────────────────────────────────────────────────────────

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_recovery_token
  ON orders(recovery_token) WHERE recovery_token IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 008: SEARCH VECTORS
-- ────────────────────────────────────────────────────────────

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

UPDATE product_templates SET search_vector =
  setweight(to_tsvector('danish', coalesce(display_name, '')), 'A') ||
  setweight(to_tsvector('danish', coalesce(brand, '')), 'A') ||
  setweight(to_tsvector('danish', coalesce(model, '')), 'B') ||
  setweight(to_tsvector('danish', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('danish', coalesce(short_description, '')), 'C');

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

UPDATE sku_products SET search_vector =
  setweight(to_tsvector('danish', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('danish', coalesce(brand, '')), 'B') ||
  setweight(to_tsvector('danish', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('danish', coalesce(short_description, '')), 'C');

-- ============================================================
-- DONE! All migrations 004-008 applied.
-- ============================================================
