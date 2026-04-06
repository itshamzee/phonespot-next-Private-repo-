-- ============================================================
-- Bulk create: iPhone screens (4 qualities) + batteries (3 qualities)
-- Models: iPhone 6 through iPhone 16 series + SE series
-- Also adds OEM Equivalent quality tier for batteries
-- ============================================================

-- 1. Add OEM Equivalent quality tier
INSERT INTO spare_part_quality_tiers (name, slug, badge_color, badge_text_color, description, short_description, default_warranty_months, sort_order)
VALUES (
  'OEM Equivalent', 'oem-equivalent', '#E8A317', '#FFFFFF',
  'Højkvalitets OEM-equivalent del produceret efter originale specifikationer. Samme kapacitet og ydeevne som originaldelen. Grundigt testet og certificeret til sikker daglig brug. Den bedste balance mellem pris og kvalitet.',
  'OEM-kvalitet — samme ydeevne som originalt',
  12, 7
) ON CONFLICT (slug) DO NOTHING;

-- 2. Bulk insert all products via PL/pgSQL
DO $$
DECLARE
  v_skaerm_cat_id UUID;
  v_batteri_cat_id UUID;
  v_tier_incell UUID;
  v_tier_soft_oled UUID;
  v_tier_pulled UUID;
  v_tier_refurb UUID;
  v_tier_oem UUID;
  v_tier_sp UUID;
  v_model RECORD;
  v_slug TEXT;
  v_existing INT;
BEGIN
  -- Get category IDs
  SELECT id INTO v_skaerm_cat_id FROM spare_part_categories WHERE slug = 'skaerme';
  SELECT id INTO v_batteri_cat_id FROM spare_part_categories WHERE slug = 'batterier';

  -- Get quality tier IDs
  SELECT id INTO v_tier_incell FROM spare_part_quality_tiers WHERE slug = 'standard-incell';
  SELECT id INTO v_tier_soft_oled FROM spare_part_quality_tiers WHERE slug = 'premium-soft-oled';
  SELECT id INTO v_tier_pulled FROM spare_part_quality_tiers WHERE slug = 'original-pulled';
  SELECT id INTO v_tier_refurb FROM spare_part_quality_tiers WHERE slug = 'refurbished';
  SELECT id INTO v_tier_oem FROM spare_part_quality_tiers WHERE slug = 'oem-equivalent';
  SELECT id INTO v_tier_sp FROM spare_part_quality_tiers WHERE slug = 'service-pack';

  -- Validate all IDs found
  IF v_skaerm_cat_id IS NULL THEN RAISE EXCEPTION 'Category skaerme not found'; END IF;
  IF v_batteri_cat_id IS NULL THEN RAISE EXCEPTION 'Category batterier not found'; END IF;
  IF v_tier_incell IS NULL THEN RAISE EXCEPTION 'Tier standard-incell not found'; END IF;
  IF v_tier_soft_oled IS NULL THEN RAISE EXCEPTION 'Tier premium-soft-oled not found'; END IF;
  IF v_tier_pulled IS NULL THEN RAISE EXCEPTION 'Tier original-pulled not found'; END IF;
  IF v_tier_refurb IS NULL THEN RAISE EXCEPTION 'Tier refurbished not found'; END IF;
  IF v_tier_oem IS NULL THEN RAISE EXCEPTION 'Tier oem-equivalent not found'; END IF;
  IF v_tier_sp IS NULL THEN RAISE EXCEPTION 'Tier service-pack not found'; END IF;

  -- Loop through all iPhone models
  FOR v_model IN
    SELECT * FROM (VALUES
      -- iPhone 6 series
      ('iPhone 6',          'iPhone 6',  ARRAY['A1549','A1586'],  14900, 34900, 44900, 29900,  9900, 14900, 19900),
      ('iPhone 6 Plus',     'iPhone 6',  ARRAY['A1522','A1524'],  14900, 34900, 44900, 29900,  9900, 14900, 19900),
      -- iPhone 6s series
      ('iPhone 6s',         'iPhone 6s', ARRAY['A1633','A1688'],  14900, 34900, 44900, 29900,  9900, 14900, 19900),
      ('iPhone 6s Plus',    'iPhone 6s', ARRAY['A1634','A1687'],  14900, 34900, 44900, 29900,  9900, 14900, 19900),
      -- iPhone 7 series
      ('iPhone 7',          'iPhone 7',  ARRAY['A1660','A1778'],  17900, 39900, 49900, 29900, 11900, 16900, 22900),
      ('iPhone 7 Plus',     'iPhone 7',  ARRAY['A1661','A1784'],  19900, 44900, 54900, 34900, 11900, 16900, 22900),
      -- iPhone 8 series
      ('iPhone 8',          'iPhone 8',  ARRAY['A1863','A1905'],  17900, 39900, 49900, 29900, 11900, 16900, 22900),
      ('iPhone 8 Plus',     'iPhone 8',  ARRAY['A1864','A1897'],  19900, 44900, 54900, 34900, 11900, 16900, 22900),
      -- iPhone SE series
      ('iPhone SE (1. gen)','iPhone SE', ARRAY['A1662','A1723'],  14900, 34900, 44900, 29900,  9900, 14900, 19900),
      ('iPhone SE (2. gen)','iPhone SE', ARRAY['A2275','A2296'],  17900, 39900, 49900, 29900, 11900, 16900, 22900),
      ('iPhone SE (3. gen)','iPhone SE', ARRAY['A2595','A2783'],  19900, 44900, 54900, 34900, 12900, 17900, 24900),
      -- iPhone X series
      ('iPhone X',          'iPhone X',  ARRAY['A1865','A1901'],  24900, 54900, 69900, 39900, 12900, 17900, 24900),
      ('iPhone XR',         'iPhone X',  ARRAY['A1984','A2105'],  22900, 49900, 64900, 37900, 12900, 17900, 24900),
      ('iPhone XS',         'iPhone X',  ARRAY['A1920','A2097'],  24900, 54900, 69900, 39900, 12900, 17900, 24900),
      ('iPhone XS Max',     'iPhone X',  ARRAY['A1921','A2101'],  27900, 59900, 74900, 44900, 14900, 19900, 27900),
      -- iPhone 11 series
      ('iPhone 11',         'iPhone 11', ARRAY['A2111','A2221'],  24900, 59900, 79900, 44900, 12900, 17900, 24900),
      ('iPhone 11 Pro',     'iPhone 11', ARRAY['A2160','A2215'],  29900, 69900, 89900, 49900, 14900, 19900, 27900),
      ('iPhone 11 Pro Max', 'iPhone 11', ARRAY['A2161','A2220'],  34900, 74900, 99900, 54900, 14900, 19900, 27900),
      -- iPhone 12 series
      ('iPhone 12 Mini',    'iPhone 12', ARRAY['A2176','A2398'],  29900, 69900, 89900, 49900, 14900, 19900, 29900),
      ('iPhone 12',         'iPhone 12', ARRAY['A2172','A2402'],  29900, 69900, 89900, 49900, 14900, 19900, 29900),
      ('iPhone 12 Pro',     'iPhone 12', ARRAY['A2341','A2407'],  34900, 79900, 99900, 54900, 14900, 19900, 29900),
      ('iPhone 12 Pro Max', 'iPhone 12', ARRAY['A2342','A2410'],  39900, 84900, 109900, 59900, 16900, 22900, 32900),
      -- iPhone 13 series
      ('iPhone 13 Mini',    'iPhone 13', ARRAY['A2628','A2481'],  34900, 79900, 99900, 59900, 14900, 19900, 29900),
      ('iPhone 13',         'iPhone 13', ARRAY['A2633','A2482'],  34900, 79900, 99900, 59900, 14900, 19900, 29900),
      ('iPhone 13 Pro',     'iPhone 13', ARRAY['A2638','A2483'],  39900, 89900, 114900, 64900, 16900, 22900, 32900),
      ('iPhone 13 Pro Max', 'iPhone 13', ARRAY['A2643','A2484'],  44900, 94900, 124900, 69900, 16900, 22900, 32900),
      -- iPhone 14 series
      ('iPhone 14',         'iPhone 14', ARRAY['A2649','A2882'],  39900, 89900, 119900, 69900, 17900, 24900, 34900),
      ('iPhone 14 Plus',    'iPhone 14', ARRAY['A2632','A2886'],  44900, 94900, 129900, 74900, 17900, 24900, 34900),
      ('iPhone 14 Pro',     'iPhone 14', ARRAY['A2650','A2892'],  49900, 99900, 139900, 79900, 19900, 27900, 39900),
      ('iPhone 14 Pro Max', 'iPhone 14', ARRAY['A2651','A2893'],  54900, 109900, 149900, 84900, 19900, 27900, 39900),
      -- iPhone 15 series
      ('iPhone 15',         'iPhone 15', ARRAY['A2846','A3092'],  44900, 99900, 139900, 79900, 17900, 24900, 34900),
      ('iPhone 15 Plus',    'iPhone 15', ARRAY['A2847','A3093'],  49900, 104900, 149900, 84900, 17900, 24900, 34900),
      ('iPhone 15 Pro',     'iPhone 15', ARRAY['A2848','A3104'],  54900, 109900, 159900, 89900, 19900, 27900, 39900),
      ('iPhone 15 Pro Max', 'iPhone 15', ARRAY['A2849','A3105'],  59900, 119900, 179900, 99900, 22900, 29900, 44900),
      -- iPhone 16 series
      ('iPhone 16',         'iPhone 16', ARRAY['A3292','A2891'],  49900, 109900, 159900, 89900, 19900, 27900, 39900),
      ('iPhone 16 Plus',    'iPhone 16', ARRAY['A3294','A2893'],  54900, 114900, 169900, 94900, 19900, 27900, 39900),
      ('iPhone 16 Pro',     'iPhone 16', ARRAY['A3293','A2892'],  59900, 119900, 179900, 99900, 22900, 29900, 44900),
      ('iPhone 16 Pro Max', 'iPhone 16', ARRAY['A3295','A2894'],  64900, 129900, 199900, 109900, 24900, 34900, 49900)
    ) AS t(model_name, series, codes,
           scr_incell, scr_soft_oled, scr_pulled, scr_refurb,
           bat_oem, bat_pulled, bat_sp)
  LOOP
    -- ── SCREENS ──────────────────────────────────────────────

    -- Standard In-Cell
    v_slug := lower(replace(replace(replace(replace(v_model.model_name, ' ', '-'), '(', ''), ')', ''), '.', '')) || '-skaerm-standard-incell';
    SELECT COUNT(*) INTO v_existing FROM sku_products WHERE slug = v_slug;
    IF v_existing = 0 THEN
      INSERT INTO sku_products (
        title, slug, category, subcategory,
        part_category_id, quality_tier_id,
        device_brand, device_series, device_model, device_model_codes,
        selling_price, always_in_stock,
        status, is_active
      ) VALUES (
        v_model.model_name || ' Skærm — Standard In-Cell',
        v_slug, 'spare-part', 'spare-part',
        v_skaerm_cat_id, v_tier_incell,
        'Apple', v_model.series, v_model.model_name, v_model.codes,
        v_model.scr_incell, true,
        'published', true
      );
    END IF;

    -- Premium Soft OLED
    v_slug := lower(replace(replace(replace(replace(v_model.model_name, ' ', '-'), '(', ''), ')', ''), '.', '')) || '-skaerm-premium-soft-oled';
    SELECT COUNT(*) INTO v_existing FROM sku_products WHERE slug = v_slug;
    IF v_existing = 0 THEN
      INSERT INTO sku_products (
        title, slug, category, subcategory,
        part_category_id, quality_tier_id,
        device_brand, device_series, device_model, device_model_codes,
        selling_price, always_in_stock,
        status, is_active
      ) VALUES (
        v_model.model_name || ' Skærm — Premium Soft OLED',
        v_slug, 'spare-part', 'spare-part',
        v_skaerm_cat_id, v_tier_soft_oled,
        'Apple', v_model.series, v_model.model_name, v_model.codes,
        v_model.scr_soft_oled, true,
        'published', true
      );
    END IF;

    -- Original Pulled
    v_slug := lower(replace(replace(replace(replace(v_model.model_name, ' ', '-'), '(', ''), ')', ''), '.', '')) || '-skaerm-original-pulled';
    SELECT COUNT(*) INTO v_existing FROM sku_products WHERE slug = v_slug;
    IF v_existing = 0 THEN
      INSERT INTO sku_products (
        title, slug, category, subcategory,
        part_category_id, quality_tier_id,
        device_brand, device_series, device_model, device_model_codes,
        selling_price, always_in_stock,
        status, is_active
      ) VALUES (
        v_model.model_name || ' Skærm — Original (Pulled)',
        v_slug, 'spare-part', 'spare-part',
        v_skaerm_cat_id, v_tier_pulled,
        'Apple', v_model.series, v_model.model_name, v_model.codes,
        v_model.scr_pulled, true,
        'published', true
      );
    END IF;

    -- Refurbished
    v_slug := lower(replace(replace(replace(replace(v_model.model_name, ' ', '-'), '(', ''), ')', ''), '.', '')) || '-skaerm-refurbished';
    SELECT COUNT(*) INTO v_existing FROM sku_products WHERE slug = v_slug;
    IF v_existing = 0 THEN
      INSERT INTO sku_products (
        title, slug, category, subcategory,
        part_category_id, quality_tier_id,
        device_brand, device_series, device_model, device_model_codes,
        selling_price, always_in_stock,
        status, is_active
      ) VALUES (
        v_model.model_name || ' Skærm — Refurbished',
        v_slug, 'spare-part', 'spare-part',
        v_skaerm_cat_id, v_tier_refurb,
        'Apple', v_model.series, v_model.model_name, v_model.codes,
        v_model.scr_refurb, true,
        'published', true
      );
    END IF;

    -- ── BATTERIES ────────────────────────────────────────────

    -- OEM Equivalent
    v_slug := lower(replace(replace(replace(replace(v_model.model_name, ' ', '-'), '(', ''), ')', ''), '.', '')) || '-batteri-oem-equivalent';
    SELECT COUNT(*) INTO v_existing FROM sku_products WHERE slug = v_slug;
    IF v_existing = 0 THEN
      INSERT INTO sku_products (
        title, slug, category, subcategory,
        part_category_id, quality_tier_id,
        device_brand, device_series, device_model, device_model_codes,
        selling_price, always_in_stock,
        status, is_active
      ) VALUES (
        v_model.model_name || ' Batteri — OEM Equivalent',
        v_slug, 'spare-part', 'spare-part',
        v_batteri_cat_id, v_tier_oem,
        'Apple', v_model.series, v_model.model_name, v_model.codes,
        v_model.bat_oem, true,
        'published', true
      );
    END IF;

    -- Original Pulled
    v_slug := lower(replace(replace(replace(replace(v_model.model_name, ' ', '-'), '(', ''), ')', ''), '.', '')) || '-batteri-original-pulled';
    SELECT COUNT(*) INTO v_existing FROM sku_products WHERE slug = v_slug;
    IF v_existing = 0 THEN
      INSERT INTO sku_products (
        title, slug, category, subcategory,
        part_category_id, quality_tier_id,
        device_brand, device_series, device_model, device_model_codes,
        selling_price, always_in_stock,
        status, is_active
      ) VALUES (
        v_model.model_name || ' Batteri — Original (Pulled)',
        v_slug, 'spare-part', 'spare-part',
        v_batteri_cat_id, v_tier_pulled,
        'Apple', v_model.series, v_model.model_name, v_model.codes,
        v_model.bat_pulled, true,
        'published', true
      );
    END IF;

    -- Service Pack
    v_slug := lower(replace(replace(replace(replace(v_model.model_name, ' ', '-'), '(', ''), ')', ''), '.', '')) || '-batteri-service-pack';
    SELECT COUNT(*) INTO v_existing FROM sku_products WHERE slug = v_slug;
    IF v_existing = 0 THEN
      INSERT INTO sku_products (
        title, slug, category, subcategory,
        part_category_id, quality_tier_id,
        device_brand, device_series, device_model, device_model_codes,
        selling_price, always_in_stock,
        status, is_active
      ) VALUES (
        v_model.model_name || ' Batteri — Service Pack',
        v_slug, 'spare-part', 'spare-part',
        v_batteri_cat_id, v_tier_sp,
        'Apple', v_model.series, v_model.model_name, v_model.codes,
        v_model.bat_sp, true,
        'published', true
      );
    END IF;

  END LOOP;

  RAISE NOTICE 'Bulk insert complete for all iPhone spare parts';
END $$;

-- 3. Ensure ALL spare parts with stock in any store show as always_in_stock
-- This fixes: Vejle + Slagelse stock should both count as "på lager"
UPDATE sku_products
SET always_in_stock = true
WHERE subcategory = 'spare-part'
  AND is_active = true
  AND id IN (
    SELECT DISTINCT s.product_id
    FROM sku_stock s
    JOIN locations l ON l.id = s.location_id
    WHERE l.type = 'store' AND s.quantity > 0
  );
