-- 20260312_001_core_schema.sql
-- Core reference tables for PhoneSpot platform

-- Enable UUID extension (may already exist)
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

CREATE INDEX idx_product_templates_brand ON product_templates(brand);
CREATE INDEX idx_product_templates_category ON product_templates(category);
CREATE INDEX idx_product_templates_slug ON product_templates(slug);

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

CREATE INDEX idx_devices_template ON devices(template_id);
CREATE INDEX idx_devices_location ON devices(location_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_barcode ON devices(barcode);
CREATE INDEX idx_devices_serial ON devices(serial_number);
CREATE INDEX idx_devices_imei ON devices(imei);
CREATE INDEX idx_devices_supplier ON devices(supplier_id);

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

CREATE INDEX idx_sku_products_ean ON sku_products(ean);
CREATE INDEX idx_sku_products_category ON sku_products(category);
CREATE INDEX idx_sku_products_brand ON sku_products(brand);

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

CREATE INDEX idx_purchase_documents_device ON purchase_documents(device_id);
