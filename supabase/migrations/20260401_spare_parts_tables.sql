-- Migration: spare parts catalog
-- Creates spare_part_categories and spare_part_quality_tiers tables,
-- then extends sku_products with spare-parts-specific columns.

-- ---------------------------------------------------------------------------
-- spare_part_categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spare_part_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  icon            TEXT,
  description     TEXT,
  seo_title       TEXT,
  seo_description TEXT,
  seo_text        TEXT,
  hero_title      TEXT,
  hero_subtitle   TEXT,
  quality_guide   TEXT,
  faq             JSONB DEFAULT '[]'::jsonb,
  featured_models JSONB DEFAULT '[]'::jsonb,
  default_warranty_months INTEGER,
  sort_order      INTEGER DEFAULT 0,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_spare_part_categories_slug   ON spare_part_categories(slug);
CREATE INDEX idx_spare_part_categories_active ON spare_part_categories(active);

-- ---------------------------------------------------------------------------
-- spare_part_quality_tiers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spare_part_quality_tiers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  slug                    TEXT NOT NULL UNIQUE,
  badge_color             TEXT NOT NULL DEFAULT '#86868B',
  badge_text_color        TEXT DEFAULT '#FFFFFF',
  description             TEXT NOT NULL,
  short_description       TEXT,
  specifications          JSONB DEFAULT '{}'::jsonb,
  default_warranty_months INTEGER NOT NULL DEFAULT 12,
  sort_order              INTEGER DEFAULT 0,
  active                  BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_spare_part_quality_tiers_slug   ON spare_part_quality_tiers(slug);
CREATE INDEX idx_spare_part_quality_tiers_active ON spare_part_quality_tiers(active);

-- ---------------------------------------------------------------------------
-- Extend sku_products with spare-parts columns
-- ---------------------------------------------------------------------------
ALTER TABLE sku_products
  ADD COLUMN IF NOT EXISTS quality_tier_id      UUID REFERENCES spare_part_quality_tiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warranty_months       INTEGER,
  ADD COLUMN IF NOT EXISTS part_category_id     UUID REFERENCES spare_part_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS device_brand         TEXT,
  ADD COLUMN IF NOT EXISTS device_series        TEXT,
  ADD COLUMN IF NOT EXISTS device_model         TEXT,
  ADD COLUMN IF NOT EXISTS device_model_codes   TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_inquiry_only      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS color_variants       JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS compatible_models    JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS specifications       JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_sku_products_quality_tier  ON sku_products(quality_tier_id);
CREATE INDEX IF NOT EXISTS idx_sku_products_part_category ON sku_products(part_category_id);
CREATE INDEX IF NOT EXISTS idx_sku_products_device_brand  ON sku_products(device_brand);
CREATE INDEX IF NOT EXISTS idx_sku_products_device_model  ON sku_products(device_model);
CREATE INDEX IF NOT EXISTS idx_sku_products_subcategory   ON sku_products(subcategory);
