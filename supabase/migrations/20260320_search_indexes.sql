-- Global admin search indexes (trigram-based fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_product_templates_display_name_trgm
  ON product_templates USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_sku_products_title_trgm
  ON sku_products USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_devices_barcode
  ON devices (barcode);

CREATE INDEX IF NOT EXISTS idx_devices_imei
  ON devices (imei) WHERE imei IS NOT NULL;
