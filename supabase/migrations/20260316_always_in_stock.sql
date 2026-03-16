-- Add always_in_stock flag to sku_products
-- Products with this flag bypass stock checks (e.g., screen protectors)
ALTER TABLE sku_products
  ADD COLUMN IF NOT EXISTS always_in_stock BOOLEAN NOT NULL DEFAULT false;

-- Mark privacy glass and tempered glass as always in stock
-- (matches by category = screen protection)
UPDATE sku_products
  SET always_in_stock = true
  WHERE lower(category) IN ('skaermbeskyttelse', 'skærmbeskyttelse', 'screen_protection')
    OR lower(title) LIKE '%privacy glass%'
    OR lower(title) LIKE '%tempered glass%'
    OR lower(title) LIKE '%panserglas%';
