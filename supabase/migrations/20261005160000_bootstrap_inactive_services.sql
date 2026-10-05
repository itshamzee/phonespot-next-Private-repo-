-- bootstrap_repair_parts opretter nu også reservedele for inaktive reparationer
-- (fx nye modeller med 'priser kommer snart'), så delene kan lagerføres før lancering.
-- Samme definition som den rettede 20261005110000; denne fil er den der faktisk ændrer databasen.

BEGIN;
CREATE OR REPLACE FUNCTION public.bootstrap_repair_parts(p_dry_run boolean DEFAULT true, p_repair_service_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_stats jsonb;
  v_linked integer; v_claim integer; v_create integer;
  v_services integer; v_no_rule integer;
  v_stock_missing integer; v_links_missing integer; v_links_stale integer;
  v_cost_matches integer; v_cost_no_codes integer;
  v_unmapped jsonb;
  v_done_claim integer := 0; v_done_create integer := 0; v_done_stock integer := 0;
  v_done_links integer := 0; v_done_cost integer := 0; v_done_fsl integer := 0; v_done_stale integer := 0;
  v_locs integer;
BEGIN
  IF NOT p_dry_run THEN
    PERFORM pg_advisory_xact_lock(hashtext('bootstrap_repair_parts'));
  END IF;

  SELECT count(*) INTO v_locs FROM public.locations WHERE slug IN ('vejle', 'slagelse');

  -- ---- statistik (altid, før ændringer) ----
  SELECT count(*) FILTER (WHERE r_action = 'linked'),
         count(*) FILTER (WHERE r_action = 'claim'),
         count(*) FILTER (WHERE r_action = 'create')
    INTO v_linked, v_claim, v_create
    FROM public.repair_parts_plan(p_repair_service_id);

  SELECT count(*) INTO v_services FROM public.repair_parts_services(p_repair_service_id);

  SELECT count(*) INTO v_no_rule
    FROM public.repair_services rs
    WHERE rs.part_mode = 'part' AND rs.part_category_id IS NOT NULL
      AND (p_repair_service_id IS NULL OR rs.id = p_repair_service_id)
      AND NOT EXISTS (SELECT 1 FROM public.repair_part_tier_rules r
                       WHERE r.part_category_id = rs.part_category_id
                         AND r.repair_quality = coalesce(rs.quality_tier, 'standard'));

  SELECT coalesce(jsonb_agg(jsonb_build_object('category', cat, 'services', n) ORDER BY n DESC), '[]'::jsonb)
    INTO v_unmapped
    FROM (
      SELECT coalesce(nullif(btrim(service_category), ''), '(ingen kategori)') AS cat, count(*) AS n
      FROM public.repair_services
      WHERE part_mode = 'manual' AND coalesce(active, true)
        AND (p_repair_service_id IS NULL OR id = p_repair_service_id)
      GROUP BY 1
    ) u;

  -- Lagerrækker der mangler: for eksisterende/koblede varer + 2 pr. ny vare.
  SELECT (SELECT count(*) FROM (
            SELECT DISTINCT p.r_sku_id, l.id AS loc
            FROM public.repair_parts_plan(p_repair_service_id) p
            CROSS JOIN public.locations l
            WHERE p.r_sku_id IS NOT NULL AND l.slug IN ('vejle', 'slagelse')
              AND NOT EXISTS (SELECT 1 FROM public.sku_stock st WHERE st.product_id = p.r_sku_id AND st.location_id = l.id)
          ) q)
         + v_create * v_locs
    INTO v_stock_missing;

  -- Links der mangler: reparationer hvis (reparation, vare) endnu ikke er koblet.
  SELECT count(*) INTO v_links_missing
    FROM public.repair_parts_services(p_repair_service_id) s
    LEFT JOIN public.repair_parts_plan(p_repair_service_id) p
      ON p.r_model_id = s.s_model_id AND p.r_cat_id = s.s_cat_id AND p.r_tier_id = s.s_tier_id
    WHERE p.r_sku_id IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.repair_service_parts x
                       WHERE x.repair_service_id = s.s_service_id AND x.sku_product_id = p.r_sku_id);

  SELECT count(*) INTO v_links_stale
    FROM public.repair_service_parts rsp
    WHERE rsp.source = 'bootstrap'
      AND (p_repair_service_id IS NULL OR rsp.repair_service_id = p_repair_service_id)
      AND NOT EXISTS (SELECT 1 FROM public.repair_parts_targets(p_repair_service_id) t
                       WHERE t.t_service_id = rsp.repair_service_id AND t.t_sku_id = rsp.sku_product_id);

  SELECT count(*) INTO v_cost_matches FROM public.repair_parts_cost_matches(p_repair_service_id);

  SELECT count(*) INTO v_cost_no_codes
    FROM public.sku_products s
    WHERE s.id IN (SELECT t_sku_id FROM public.repair_parts_targets(p_repair_service_id))
      AND cardinality(coalesce(s.device_model_codes, '{}')) = 0;

  IF NOT p_dry_run THEN
    -- 1. claim
    UPDATE public.sku_products s
       SET repair_model_id = p.r_model_id, updated_at = clock_timestamp()
      FROM public.repair_parts_plan(p_repair_service_id) p
     WHERE p.r_action = 'claim' AND s.id = p.r_sku_id AND s.repair_model_id IS NULL;
    GET DIAGNOSTICS v_done_claim = ROW_COUNT;

    -- 2. create
    INSERT INTO public.sku_products (
      title, slug, category, subcategory, part_category_id, quality_tier_id,
      device_brand, device_series, device_model, repair_model_id, repair_only,
      selling_price, always_in_stock, status, is_active
    )
    SELECT
      m.name || ' ' || c.name || ' — ' || t.name,
      CASE WHEN EXISTS (SELECT 1 FROM public.sku_products x WHERE x.slug = base.slug)
           THEN base.slug || '-' || left(md5(m.id::text), 6) ELSE base.slug END,
      'spare-part', 'spare-part', p.r_cat_id, p.r_tier_id,
      b.name, m.series, m.name, m.id, true,
      0, true, 'draft', false
    FROM public.repair_parts_plan(p_repair_service_id) p
    JOIN public.repair_models m ON m.id = p.r_model_id
    JOIN public.repair_brands b ON b.id = m.brand_id
    JOIN public.spare_part_categories c ON c.id = p.r_cat_id
    JOIN public.spare_part_quality_tiers t ON t.id = p.r_tier_id
    CROSS JOIN LATERAL (SELECT lower('del-' || b.slug || '-' || m.slug || '-' || c.slug || '-' || t.slug) AS slug) base
    WHERE p.r_action = 'create'
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_done_create = ROW_COUNT;

    -- 3. lagerrækker (0 stk.)
    INSERT INTO public.sku_stock (product_id, location_id, quantity)
    SELECT DISTINCT tg.t_sku_id, l.id, 0
    FROM public.repair_parts_targets(p_repair_service_id) tg
    CROSS JOIN public.locations l
    WHERE l.slug IN ('vejle', 'slagelse')
    ON CONFLICT (product_id, location_id) DO NOTHING;
    GET DIAGNOSTICS v_done_stock = ROW_COUNT;

    -- 4. kostpris + foneday-link
    UPDATE public.sku_products s
       SET cost_price = m.c_price_oere, cost_source = 'foneday', cost_ref = m.c_foneday_sku,
           cost_updated_at = clock_timestamp(), updated_at = clock_timestamp()
      FROM public.repair_parts_cost_matches(p_repair_service_id) m
     WHERE s.id = m.c_sku_id
       AND (s.cost_price IS DISTINCT FROM m.c_price_oere OR s.cost_ref IS DISTINCT FROM m.c_foneday_sku);
    GET DIAGNOSTICS v_done_cost = ROW_COUNT;

    INSERT INTO public.foneday_sku_link
      (foneday_catalog_id, accessory_id, sku_product_id, use_type, auto_sync_price, auto_sync_stock, markup_percentage)
    SELECT m.c_catalog_id, NULL, m.c_sku_id, 'repair_part', false, false, 0
    FROM public.repair_parts_cost_matches(p_repair_service_id) m
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_done_fsl = ROW_COUNT;

    -- 5. repair_service_parts
    DELETE FROM public.repair_service_parts rsp
     WHERE rsp.source = 'bootstrap'
       AND (p_repair_service_id IS NULL OR rsp.repair_service_id = p_repair_service_id)
       AND NOT EXISTS (SELECT 1 FROM public.repair_parts_targets(p_repair_service_id) t
                        WHERE t.t_service_id = rsp.repair_service_id AND t.t_sku_id = rsp.sku_product_id);
    GET DIAGNOSTICS v_done_stale = ROW_COUNT;

    INSERT INTO public.repair_service_parts (repair_service_id, sku_product_id, qty, is_primary, source)
    SELECT t.t_service_id, t.t_sku_id, 1,
           NOT EXISTS (SELECT 1 FROM public.repair_service_parts x WHERE x.repair_service_id = t.t_service_id AND x.is_primary),
           'bootstrap'
    FROM public.repair_parts_targets(p_repair_service_id) t
    WHERE NOT EXISTS (SELECT 1 FROM public.repair_service_parts x
                       WHERE x.repair_service_id = t.t_service_id AND x.source = 'manual' AND x.is_primary)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_done_links = ROW_COUNT;
  END IF;

  v_stats := jsonb_build_object(
    'dry_run', p_dry_run,
    'scope', CASE WHEN p_repair_service_id IS NULL THEN 'alle reparationer' ELSE p_repair_service_id::text END,
    'services_using_a_part', v_services,
    'services_without_tier_rule', v_no_rule,
    'triples_already_linked', v_linked,
    'triples_to_claim_existing_sku', v_claim,
    'triples_to_create_new_sku', v_create,
    'stock_rows_to_create', v_stock_missing,
    'service_part_links_to_create', v_links_missing,
    'service_part_links_stale', v_links_stale,
    'foneday_cost_matches', v_cost_matches,
    'skus_without_model_codes_no_auto_cost', v_cost_no_codes,
    'services_needing_manual_category', v_unmapped,
    'done', CASE WHEN p_dry_run THEN NULL ELSE jsonb_build_object(
      'skus_claimed', v_done_claim, 'skus_created', v_done_create, 'stock_rows_created', v_done_stock,
      'costs_updated', v_done_cost, 'foneday_links_created', v_done_fsl,
      'service_part_links_created', v_done_links, 'service_part_links_removed', v_done_stale) END
  );
  RETURN v_stats;
END;
$$;
COMMIT;
