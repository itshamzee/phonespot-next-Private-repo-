-- Spot tempered glass line: add variant grouping to sku_products
-- Groups related variants (Normal + Privacy of same glass) so the
-- customer product page can render a toggle, while keeping separate
-- stock and pricing per variant row.

ALTER TABLE sku_products
  ADD COLUMN IF NOT EXISTS variant_group TEXT,
  ADD COLUMN IF NOT EXISTS variant_label TEXT,
  ADD COLUMN IF NOT EXISTS variant_sort  INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sku_products_variant_group
  ON sku_products(variant_group)
  WHERE variant_group IS NOT NULL;

COMMENT ON COLUMN sku_products.variant_group IS 'Groups variants of the same logical product (e.g. spot-glass-iphone-13-14-15). NULL for products without variants.';
COMMENT ON COLUMN sku_products.variant_label IS 'Human-readable toggle label (e.g. Normal, Privacy, Dark Blue).';
COMMENT ON COLUMN sku_products.variant_sort  IS 'Display order within a variant_group (lower = earlier).';
