-- Backfill subcategory on sku_products linked to Foneday catalog items
-- Maps the Foneday category through foneday_category_map to get the correct subcategory
UPDATE sku_products sp
SET subcategory = fcm.phonespot_value
FROM foneday_sku_link fsl
JOIN foneday_catalog fc ON fc.id = fsl.foneday_catalog_id
JOIN foneday_category_map fcm ON fcm.foneday_value = fc.category AND fcm.map_type = 'category'
WHERE fsl.sku_product_id = sp.id
  AND sp.subcategory IS NULL
  AND fsl.use_type = 'retail'
  AND fcm.phonespot_value != '_repair_part_';
