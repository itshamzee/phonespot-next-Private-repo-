-- Migrate accessories to sku_products
-- NOTE: accessories.store_id is often a sentinel UUID that does NOT exist in locations table.
INSERT INTO sku_products (title, description, ean, cost_price, selling_price, sale_price, brand, category, subcategory, images, slug, status, barcode, created_at, updated_at)
SELECT
  a.name,
  a.description,
  a.ean,
  a.cost_price,
  a.price,
  a.sale_price,
  a.brand,
  'accessory',
  a.category,     -- the legacy category becomes subcategory (cover, charger, etc.)
  CASE WHEN a.image_url IS NOT NULL THEN ARRAY[a.image_url] ELSE ARRAY[]::TEXT[] END,
  a.slug,
  COALESCE(a.status, 'published'),
  a.sku,
  a.created_at,
  a.updated_at
FROM accessories a
WHERE NOT EXISTS (
  SELECT 1 FROM sku_products sp
  WHERE sp.slug = a.slug
     OR (sp.ean = a.ean AND sp.ean IS NOT NULL)
);

-- Update foneday_sku_link to point to new sku_product_id
UPDATE foneday_sku_link fsl
SET sku_product_id = sp.id
FROM accessories a
JOIN sku_products sp ON sp.slug = a.slug
WHERE fsl.accessory_id = a.id
  AND fsl.sku_product_id IS NULL;

-- Create sku_stock entries ONLY for accessories with valid location references
INSERT INTO sku_stock (product_id, location_id, quantity)
SELECT sp.id, a.store_id::uuid, GREATEST(a.online_stock, 0) + GREATEST(a.store_stock, 0)
FROM accessories a
JOIN sku_products sp ON sp.slug = a.slug
WHERE EXISTS (SELECT 1 FROM locations l WHERE l.id = a.store_id::uuid)
ON CONFLICT (product_id, location_id) DO NOTHING;

-- DO NOT drop the accessories table yet
