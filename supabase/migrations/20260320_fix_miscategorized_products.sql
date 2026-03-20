-- Migration: Fix miscategorized products and remove duplicates
-- Date: 2026-03-20
-- Context: Cleanup data issues from before proper dedup checks were added

-- 1. Find sku_products that should be spare-parts but aren't tagged
-- (products linked to Foneday items with _repair_part_ category mapping)
UPDATE sku_products sp
SET subcategory = 'spare-part'
FROM foneday_sku_link fsl
JOIN foneday_catalog fc ON fc.id = fsl.foneday_catalog_id
JOIN foneday_category_map fcm ON fcm.foneday_value = fc.category AND fcm.map_type = 'category'
WHERE fsl.sku_product_id = sp.id
  AND fcm.phonespot_value = '_repair_part_'
  AND (sp.subcategory IS NULL OR sp.subcategory != 'spare-part');

-- 2. Find and log any sku_products with category='smartwatch' that should be product_templates
-- (This is a manual review step — output to console for admin to check)
-- SELECT id, title, category FROM sku_products WHERE category = 'smartwatch';

-- 3. Remove exact duplicate sku_products (same title, same EAN, keep the one with lower ID)
-- Only delete if no FK references exist in sku_stock, order_items, or sku_product_templates
DELETE FROM sku_products
WHERE id IN (
  SELECT sp2.id
  FROM sku_products sp1
  JOIN sku_products sp2 ON sp1.title = sp2.title
    AND sp1.id < sp2.id
    AND (sp1.ean = sp2.ean OR (sp1.ean IS NULL AND sp2.ean IS NULL))
  WHERE NOT EXISTS (
    SELECT 1 FROM foneday_sku_link fsl WHERE fsl.sku_product_id = sp2.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM sku_stock ss WHERE ss.product_id = sp2.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM sku_product_templates spt WHERE spt.sku_product_id = sp2.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.sku_product_id = sp2.id
  )
);
