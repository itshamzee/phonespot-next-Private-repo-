-- 20260317_auto_link_foneday_models.sql
-- Auto-populate sku_product_templates from Foneday compatibility data.
--
-- Foneday stores device compatibility in two fields:
--   model_codes TEXT[]  — e.g. {"iPhone 11","iPhone 11 Pro"}
--   suitable_for TEXT   — e.g. "Apple iPhone 11"
--
-- SKU products imported from Foneday are linked via foneday_sku_link
-- (foneday_catalog_id → accessory_id = sku_products.id).
--
-- This migration matches those model names against product_templates.display_name
-- and inserts the resulting rows into sku_product_templates.

-- ── Pass 1: match via model_codes array ──────────────────────────────────────
INSERT INTO sku_product_templates (sku_product_id, template_id)
SELECT DISTINCT fsl.accessory_id, pt.id
FROM foneday_sku_link fsl
JOIN foneday_catalog fc ON fc.id = fsl.foneday_catalog_id
CROSS JOIN LATERAL unnest(fc.model_codes) AS mc(model_code)
JOIN product_templates pt
  ON pt.display_name ILIKE '%' || mc.model_code || '%'
WHERE fsl.accessory_id IS NOT NULL
  AND array_length(fc.model_codes, 1) > 0
ON CONFLICT DO NOTHING;

-- ── Pass 2: match via suitable_for string ────────────────────────────────────
INSERT INTO sku_product_templates (sku_product_id, template_id)
SELECT DISTINCT fsl.accessory_id, pt.id
FROM foneday_sku_link fsl
JOIN foneday_catalog fc ON fc.id = fsl.foneday_catalog_id
JOIN product_templates pt
  ON fc.suitable_for ILIKE '%' || pt.display_name || '%'
WHERE fsl.accessory_id IS NOT NULL
  AND fc.suitable_for IS NOT NULL
  AND fc.suitable_for <> ''
ON CONFLICT DO NOTHING;
