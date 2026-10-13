-- 20261013100000_retire_spare_parts.sql
-- Reservedele sælges ikke længere på phonespot.dk (spec 2026-10-13 §4.1).
-- Rækkerne bevares (ordrehistorik + katalogmatch til lagersystemet, §6.2).
-- is_active=false  -> checkout afviser dem (src/lib/checkout/validate.ts) og
--                     RLS-politikken sku_products_public_read skjuler dem.
-- repair_only=true -> stock_overview (/admin/varer) viser dem stadig for personalet,
--                     men de er ude af web, feeds og POS.
-- status='draft'   -> ude af alle offentlige lister, feeds og sitemap.
-- Både subcategory og category tjekkes: begge stavemåder findes i koden.
-- sku_stock for reservedele røres ikke; Slagelses tal eksporteres til
-- lagersystemets OPENING ved skiftet (scripts/export-spare-parts-for-lagersystem.ts).

UPDATE public.sku_products
   SET is_active  = false,
       repair_only = true,
       status     = 'draft',
       updated_at = now()
 WHERE (subcategory = 'spare-part' OR category = 'spare-part')
   AND (is_active OR status = 'published');
