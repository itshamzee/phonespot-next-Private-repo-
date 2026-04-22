-- 20260422_soft_delete_legacy_tempered_glass.sql
-- Phase out the legacy tempered-glass product line in favor of Spot.
-- Soft-delete: is_active=false + status='archived'. Keeps rows for order history.
-- Never touches new spot-glass SKUs (explicit guard in WHERE clause).

UPDATE sku_products
   SET is_active = false,
       status    = 'archived'
 WHERE subcategory IN ('skaermbeskyttelse','skaerm-beskyttelse')
   AND subcategory <> 'spot-glass'
   AND is_active = true;  -- only touch rows not already deleted
