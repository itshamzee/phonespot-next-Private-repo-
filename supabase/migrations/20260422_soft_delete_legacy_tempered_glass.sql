-- 20260422_soft_delete_legacy_tempered_glass.sql
-- Phase out the legacy tempered-glass product line in favor of Spot.
-- Soft-delete: is_active=false + status='draft'. Keeps rows for order history.
-- ('archived' is not an allowed value in the sku_products.status CHECK constraint,
--  which only permits 'published' and 'draft'.)
-- Matches the three subcategories actually present in prod: screen_protector (401 rows
-- of NOVANL GlassProtector Pro), tempered (1 row "Tempered Glass - Kant til kant"),
-- and privacy (1 row "Privacy Glass - Anti-kig beskyttelse"). Total: 403 rows.
-- Never touches spot-glass SKUs — they live under subcategory='spot-glass'.

UPDATE sku_products
   SET is_active = false,
       status    = 'draft'
 WHERE subcategory IN ('screen_protector','tempered','privacy')
   AND is_active = true;
