-- 20261013_retire_spare_parts.sql
-- Reservedele sælges ikke længere på phonespot.dk (spec 2026-10-13 §4.1).
-- Rækkerne bevares (ordrehistorik + katalogmatch til lagersystemet, §6.2).
-- is_active=false  -> checkout afviser dem (src/lib/checkout/validate.ts) og
--                     RLS-politikken sku_products_public_read skjuler dem.
-- status='draft'   -> ude af alle offentlige lister, feeds og sitemap.
-- Både subcategory og category tjekkes: begge stavemåder findes i koden.
-- sku_stock for reservedele røres ikke; Slagelses tal eksporteres til
-- lagersystemets OPENING ved skiftet (scripts/export-spare-parts-for-lagersystem.ts).

UPDATE public.sku_products
   SET is_active  = false,
       status     = 'draft',
       updated_at = now()
 WHERE (subcategory = 'spare-part' OR category = 'spare-part')
   AND (is_active OR status = 'published');
