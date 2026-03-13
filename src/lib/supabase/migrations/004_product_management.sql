-- 004_product_management.sql
-- Adds product management columns to product_templates and sku_products
-- and creates the sku_product_templates join table.

-- ── product_templates: new columns ──────────────────────────────────
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '{}';
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_a integer;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_b integer;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_c integer;

-- Add CHECK constraint for status (separate step for IF NOT EXISTS safety)
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
ALTER TABLE product_templates DROP CONSTRAINT IF EXISTS product_templates_category_check;
ALTER TABLE product_templates ADD CONSTRAINT product_templates_category_check
  CHECK (category IN ('iphone', 'smartphone', 'ipad', 'tablet', 'smartwatch', 'laptop', 'console', 'accessory', 'other'));

-- ── sku_products: new columns ───────────────────────────────────────
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]';
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Add unique constraint on slug (only if column was just created, skip on re-run)
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

-- Migrate is_active → status
UPDATE sku_products SET status = CASE WHEN is_active THEN 'published' ELSE 'draft' END
WHERE status IS NULL;

-- ── sku_product_templates join table ────────────────────────────────
CREATE TABLE IF NOT EXISTS sku_product_templates (
  sku_product_id uuid NOT NULL REFERENCES sku_products(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
  PRIMARY KEY (sku_product_id, template_id)
);

-- Index for reverse lookups (accessories for a template)
CREATE INDEX IF NOT EXISTS idx_sku_product_templates_template
  ON sku_product_templates(template_id);
