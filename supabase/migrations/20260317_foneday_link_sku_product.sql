-- Add sku_product_id to foneday_sku_link so linked products go into sku_products (new system)
-- The old accessory_id FK to accessories is preserved for backwards compat but no longer written.

ALTER TABLE foneday_sku_link
  ADD COLUMN IF NOT EXISTS sku_product_id UUID REFERENCES sku_products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_foneday_sku_link_sku_product_id
  ON foneday_sku_link(sku_product_id);
