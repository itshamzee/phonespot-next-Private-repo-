-- 20260317_foneday_integration.sql
-- Foneday API integration: catalog mirror, category mapping, product links, app settings

-- ============================================
-- APP_SETTINGS — simple key-value config store
-- ============================================
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default Foneday settings
INSERT INTO app_settings (key, value) VALUES (
  'foneday',
  '{"eur_dkk_rate": 745, "in_stock_qty": 99}'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- ============================================
-- FONEDAY_CATALOG — full mirror of Foneday API
-- ============================================
CREATE TABLE IF NOT EXISTS foneday_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  foneday_sku TEXT NOT NULL UNIQUE,
  ean TEXT,
  title TEXT NOT NULL,
  in_stock BOOLEAN NOT NULL DEFAULT FALSE,
  suitable_for TEXT,
  category TEXT,
  product_brand TEXT,
  artcode TEXT,
  quality TEXT,
  model_brand TEXT,
  model_codes TEXT[] DEFAULT '{}',
  price_eur NUMERIC(10,2) NOT NULL,
  price_dkk INTEGER,
  raw_data JSONB,
  missing_since TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: foneday_sku UNIQUE constraint already creates an implicit index
CREATE INDEX idx_foneday_catalog_category ON foneday_catalog(category);
CREATE INDEX idx_foneday_catalog_model_brand ON foneday_catalog(model_brand);
CREATE INDEX idx_foneday_catalog_in_stock ON foneday_catalog(in_stock);

-- ============================================
-- FONEDAY_CATEGORY_MAP — taxonomy translation
-- ============================================
CREATE TABLE IF NOT EXISTS foneday_category_map (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_type TEXT NOT NULL CHECK (map_type IN ('category', 'quality')),
  foneday_value TEXT NOT NULL,
  phonespot_value TEXT NOT NULL,
  display_label TEXT,
  UNIQUE(map_type, foneday_value)
);

-- Seed default category mappings
INSERT INTO foneday_category_map (map_type, foneday_value, phonespot_value, display_label) VALUES
  ('category', 'Case', 'cover', 'Covers & Cases'),
  ('category', 'Glass', 'screen_protector', 'Skaermbeskyttelse'),
  ('category', 'Cables', 'cable', 'Kabler'),
  ('category', 'Charger', 'charger', 'Opladere'),
  ('category', 'Mount', 'other', 'Holdere'),
  ('category', 'Data Storage', 'other', 'Tilbehoer'),
  ('category', 'Audio', 'audio', 'Lyd & Hoeretelefoner'),
  ('category', 'Connectivity', 'other', 'Tilbehoer'),
  ('category', 'Display', '_repair_part_', 'Skaerm (repair only)'),
  ('category', 'Battery', '_repair_part_', 'Batteri (repair only)'),
  ('quality', 'Service Pack', 'original', 'Original'),
  ('quality', 'Pulled', 'original-brugt', 'Original Brugt'),
  ('quality', 'Refurbished', 'refurbished', 'Refurbished'),
  ('quality', 'OEM-Equivalent', 'oem', 'OEM'),
  ('quality', 'FDX Lite', 'fdx-lite', 'FDX Lite'),
  ('quality', 'FDX Ultra', 'fdx-ultra', 'FDX Ultra'),
  ('quality', 'FDX Pro', 'fdx-pro', 'FDX Pro'),
  ('quality', 'FDX Elite', 'fdx-elite', 'FDX Elite'),
  ('quality', 'FDX Prime', 'fdx-prime', 'FDX Prime')
ON CONFLICT (map_type, foneday_value) DO NOTHING;

-- ============================================
-- FONEDAY_SKU_LINK — links catalog to accessories
-- ============================================
CREATE TABLE IF NOT EXISTS foneday_sku_link (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  foneday_catalog_id UUID NOT NULL REFERENCES foneday_catalog(id) ON DELETE CASCADE,
  accessory_id UUID REFERENCES accessories(id) ON DELETE SET NULL,
  use_type TEXT NOT NULL CHECK (use_type IN ('retail', 'repair_part')),
  auto_sync_price BOOLEAN NOT NULL DEFAULT TRUE,
  auto_sync_stock BOOLEAN NOT NULL DEFAULT TRUE,
  markup_percentage NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(foneday_catalog_id),
  UNIQUE(accessory_id)
);
