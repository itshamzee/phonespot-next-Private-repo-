-- Kostpris på reparationsdele fra Foneday, matchet på TITEL (model-koderne matchede 0).
--   * repair_parts_title_models/category/tiers: parser-funktioner (spejles i src/lib/foneday/title-parser.ts).
--   * repair_parts_title_matches(): alle (vare, katalograekke)-match.
--   * repair_parts_refresh_costs(p_dry_run): vaelger billigste paa-lager-raekke pr. vare og saetter
--       cost_price (oere), cost_source='foneday', cost_ref, cost_updated_at. Roerer aldrig selling_price,
--       aldrig cost_source='manual'.
--   * repair_case_requests_cleanup(p_days): sletter idempotensnoegler aeldre end 7 dage (+ pg_cron hvis muligt).
-- Transaktionel og idempotent.

BEGIN;

-- ------------------------------------------------------------
-- Parser: model-noegler (prioriteret), f.eks. {"iphone 15 (60hz)","iphone 15"}
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_parts_title_models(p_title text)
RETURNS text[]
LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog, public AS $$
DECLARE
  t text := regexp_replace(coalesce(p_title, ''), '\s+', ' ', 'g');
  m text[];
  a text;
  b text;
BEGIN
  m := regexp_match(t,
    '\mFor\s+(.+?)(?:\s*\||\s+(?:black|white|blue|red|green|gold|silver|gr[ae]y|space|pink|purple|yellow|midnight|starlight|graphite|titanium|natural|desert|orange|coral|rose|jet|refurbished|original|oem|genuine|with|without)\M|\s*$)',
    'i');
  IF m IS NULL THEN RETURN '{}'::text[]; END IF;
  a := lower(btrim(regexp_replace(m[1], '[\s,;-]+$', '')));
  IF a = '' THEN RETURN '{}'::text[]; END IF;
  b := btrim(regexp_replace(a, '\s*\(.*$', ''));
  IF b = '' OR b = a THEN RETURN ARRAY[a]; END IF;
  RETURN ARRAY[a, b];
END;
$$;

-- ------------------------------------------------------------
-- Parser: kategori-slug (spare_part_categories.slug) eller NULL
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_parts_title_category(p_title text, p_category text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog, public AS $$
DECLARE
  t text := regexp_replace(coalesce(p_title, ''), '\s+', ' ', 'g');
  pre text;
BEGIN
  -- Teksten foer " For " er produkttypen ("FDX Prime Display"); parenteser fjernes ("(Without IC)").
  pre := lower(regexp_replace(coalesce((regexp_match(t, '^(.*?)\mFor\M', 'i'))[1], t), '\([^)]*\)', ' ', 'g'));
  IF pre ~ '(adhesive|tape|sticker|protector|tool|tester|cleaner|\mkit\M|screw|gasket|bracket|lens)' THEN
    RETURN NULL;
  END IF;
  IF pre ~ '(back\s*cover|back\s*glass|rear\s*glass|battery\s*cover|battery\s*door|back\s*housing|rear\s*housing)' THEN RETURN 'bagcovers'; END IF;
  IF pre ~ '(charging\s*port|charge\s*port|dock\s*connector|charging\s*connector|usb\s*connector)' THEN RETURN 'opladningsstik'; END IF;
  IF pre ~ '\mcamera\M' AND pre !~ 'flex' THEN RETURN 'kameraer'; END IF;
  IF pre ~ '\m(display|lcd|screen)\M' AND pre !~ 'flex' THEN RETURN 'skaerme'; END IF;
  IF pre ~ '\mbattery\M' AND pre !~ '(connector|flex|holder)' THEN RETURN 'batterier'; END IF;
  RETURN NULL;
END;
$$;

-- ------------------------------------------------------------
-- Parser: kvalitetstrin (spare_part_quality_tiers.slug) som kandidater
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_parts_title_tiers(p_title text, p_quality text, p_cat text)
RETURNS text[]
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  s text := lower(coalesce(p_title, '') || ' ' || coalesce(p_quality, ''));
  has_hard boolean;
BEGIN
  IF s ~ '\mservice\s*pack\M' THEN RETURN ARRAY['service-pack']; END IF;
  IF s ~ '\mpulled\M' THEN RETURN ARRAY['original-pulled']; END IF;
  IF p_cat = 'skaerme' THEN
    IF s ~ '(soft\s*oled|fdx\s+ultra)' THEN RETURN ARRAY['premium-soft-oled']; END IF;
    IF s ~ '(hard\s*oled|fdx\s+pro\M)' THEN
      SELECT EXISTS (SELECT 1 FROM public.spare_part_quality_tiers WHERE slug = 'premium-hard-oled') INTO has_hard;
      RETURN ARRAY[CASE WHEN has_hard THEN 'premium-hard-oled' ELSE 'premium-soft-oled' END];
    END IF;
    IF s ~ '(in-?cell|fdx\s+(lite|prime|elite)\M|\mlcd\M)' THEN RETURN ARRAY['standard-incell']; END IF;
    IF s ~ '\mrefurbished\M' THEN RETURN ARRAY['refurbished', 'original-pulled']; END IF;
    RETURN '{}'::text[];
  END IF;
  -- Batterier og oevrige dele: OEM-equivalent/premium er standard.
  RETURN ARRAY['oem-equivalent'];
END;
$$;

-- ------------------------------------------------------------
-- Alle match mellem reparationsdele og Foneday-raekker paa lager (titel-baseret)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_parts_title_matches()
RETURNS TABLE (m_sku_id uuid, m_catalog_id uuid, m_foneday_sku text, m_title text, m_price_oere integer, m_priority integer,
               m_cost_source text, m_cost_price integer)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH parsed AS (
    SELECT fc.id, fc.foneday_sku, fc.title, fc.price_dkk,
           public.repair_parts_title_models(fc.title) AS models,
           c.cat,
           public.repair_parts_title_tiers(fc.title, fc.quality, c.cat) AS tiers
    FROM public.foneday_catalog fc
    CROSS JOIN LATERAL (SELECT public.repair_parts_title_category(fc.title, fc.category) AS cat) c
    WHERE fc.in_stock AND fc.missing_since IS NULL AND fc.price_dkk IS NOT NULL AND fc.price_dkk > 0
      AND c.cat IS NOT NULL
  )
  SELECT s.id, p.id, p.foneday_sku, p.title, p.price_dkk,
         array_position(p.models, lower(regexp_replace(btrim(m.name), '\s+', ' ', 'g'))),
         s.cost_source, s.cost_price
  FROM public.sku_products s
  JOIN public.repair_models m ON m.id = s.repair_model_id
  JOIN public.spare_part_categories c ON c.id = s.part_category_id
  JOIN public.spare_part_quality_tiers q ON q.id = s.quality_tier_id
  JOIN parsed p ON p.cat = c.slug
               AND q.slug = ANY (p.tiers)
               AND lower(regexp_replace(btrim(m.name), '\s+', ' ', 'g')) = ANY (p.models)
  WHERE s.repair_model_id IS NOT NULL
$$;

-- ------------------------------------------------------------
-- Hovedfunktion
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_parts_refresh_costs(p_dry_run boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_matched integer; v_would integer; v_updated integer := 0; v_links integer := 0;
  v_skus integer; v_skus_unmatched integer; v_manual_skipped integer;
  v_unmatched_by_cat jsonb; v_sample jsonb;
BEGIN
  IF NOT p_dry_run THEN
    PERFORM pg_advisory_xact_lock(hashtext('repair_parts_refresh_costs'));
  END IF;

  DROP TABLE IF EXISTS _rpc_all;
  DROP TABLE IF EXISTS _rpc_pick;
  DROP TABLE IF EXISTS _rpc_unmatched;

  CREATE TEMP TABLE _rpc_all ON COMMIT DROP AS SELECT * FROM public.repair_parts_title_matches();
  CREATE TEMP TABLE _rpc_pick ON COMMIT DROP AS
    SELECT DISTINCT ON (m_sku_id) m_sku_id, m_catalog_id, m_foneday_sku, m_price_oere, m_cost_price
    FROM _rpc_all
    WHERE m_cost_source IS NULL OR m_cost_source = 'foneday'
    ORDER BY m_sku_id, m_price_oere, m_priority, m_foneday_sku;

  SELECT count(*) INTO v_matched FROM _rpc_pick;
  SELECT count(*) INTO v_would FROM _rpc_pick p JOIN public.sku_products s ON s.id = p.m_sku_id
    WHERE s.cost_price IS DISTINCT FROM p.m_price_oere OR s.cost_ref IS DISTINCT FROM p.m_foneday_sku
       OR s.cost_source IS DISTINCT FROM 'foneday';
  SELECT count(DISTINCT m_sku_id) INTO v_manual_skipped FROM _rpc_all WHERE m_cost_source = 'manual';

  SELECT count(*) INTO v_skus FROM public.sku_products WHERE repair_model_id IS NOT NULL;
  SELECT count(*) INTO v_skus_unmatched FROM public.sku_products s
    WHERE s.repair_model_id IS NOT NULL AND (s.cost_source IS NULL OR s.cost_source = 'foneday')
      AND NOT EXISTS (SELECT 1 FROM _rpc_all a WHERE a.m_sku_id = s.id);

  IF NOT p_dry_run THEN
    UPDATE public.sku_products s
       SET cost_price = p.m_price_oere, cost_source = 'foneday', cost_ref = p.m_foneday_sku,
           cost_updated_at = clock_timestamp(), updated_at = clock_timestamp()
      FROM _rpc_pick p
     WHERE s.id = p.m_sku_id
       AND (s.cost_price IS DISTINCT FROM p.m_price_oere OR s.cost_ref IS DISTINCT FROM p.m_foneday_sku
            OR s.cost_source IS DISTINCT FROM 'foneday')
       AND (s.cost_source IS NULL OR s.cost_source = 'foneday');
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    INSERT INTO public.foneday_sku_link
      (foneday_catalog_id, accessory_id, sku_product_id, use_type, auto_sync_price, auto_sync_stock, markup_percentage)
    SELECT p.m_catalog_id, NULL, p.m_sku_id, 'repair_part', false, false, 0 FROM _rpc_pick p
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_links = ROW_COUNT;
  END IF;

  -- Foneday-raekker (paa lager, med kendt kategori) der ikke matcher nogen reparationsdel.
  CREATE TEMP TABLE _rpc_unmatched ON COMMIT DROP AS
    SELECT fc.title, public.repair_parts_title_category(fc.title, fc.category) AS cat
    FROM public.foneday_catalog fc
    WHERE fc.in_stock AND fc.missing_since IS NULL AND fc.price_dkk > 0
      AND public.repair_parts_title_category(fc.title, fc.category) IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM _rpc_all a WHERE a.m_catalog_id = fc.id);

  SELECT coalesce(jsonb_object_agg(cat, n), '{}'::jsonb) INTO v_unmatched_by_cat
    FROM (SELECT cat, count(*) AS n FROM _rpc_unmatched GROUP BY cat) x;
  SELECT coalesce(jsonb_agg(title), '[]'::jsonb) INTO v_sample
    FROM (SELECT title FROM _rpc_unmatched ORDER BY md5(title) LIMIT 20) x;

  RETURN jsonb_build_object(
    'dry_run', p_dry_run,
    'repair_part_skus', v_skus,
    'matched', v_matched,
    CASE WHEN p_dry_run THEN 'would_update' ELSE 'updated' END, CASE WHEN p_dry_run THEN v_would ELSE v_updated END,
    'foneday_links_created', CASE WHEN p_dry_run THEN NULL ELSE v_links END,
    'skus_without_any_match', v_skus_unmatched,
    'skus_skipped_manual_cost', v_manual_skipped,
    'unmatched_catalog_by_category', v_unmatched_by_cat,
    'unmatched_titles_sample', v_sample
  );
END;
$$;

-- ------------------------------------------------------------
-- Oprydning: idempotensnoegler aeldre end 7 dage
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_case_requests_cleanup(p_days integer DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_n integer;
BEGIN
  DELETE FROM public.repair_case_requests WHERE created_at < now() - make_interval(days => greatest(p_days, 1));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.repair_parts_title_models(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.repair_parts_title_category(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.repair_parts_title_tiers(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.repair_parts_title_matches() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.repair_parts_refresh_costs(boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.repair_case_requests_cleanup(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.repair_parts_title_models(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.repair_parts_title_category(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.repair_parts_title_tiers(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.repair_parts_title_matches() TO service_role;
GRANT EXECUTE ON FUNCTION public.repair_parts_refresh_costs(boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.repair_case_requests_cleanup(integer) TO service_role;

-- pg_cron (ren SQL, ingen hemmelighed): daglig oprydning kl. 03:30 UTC. Springes over uden pg_cron.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'repair-case-requests-cleanup';
    PERFORM cron.schedule('repair-case-requests-cleanup', '30 3 * * *', 'SELECT public.repair_case_requests_cleanup(7)');
  ELSE
    RAISE NOTICE 'pg_cron ikke installeret: oprydning koeres kun via /api/cron/repair-part-costs';
  END IF;
END $$;

COMMIT;

-- Verifikation (forventet resultat i kommentar):
--   SELECT public.repair_parts_title_models('FDX Ultra Display For iPhone 15 (60Hz) | Soft Oled | LTPS | Black');  -- {"iphone 15 (60hz)","iphone 15"}
--   SELECT public.repair_parts_title_models('Display (Without IC) For iPhone 11 Black Refurbished');                -- {"iphone 11"}
--   SELECT public.repair_parts_title_category('FDX Prime Display For iPhone 15 | In-Cell | Black');                  -- skaerme
--   SELECT public.repair_parts_title_tiers('FDX Pro Display For iPhone 13 | Hard Oled | Black', NULL, 'skaerme');    -- {premium-hard-oled}
--   SELECT public.repair_parts_refresh_costs(true);   -- dry-run: matched > 0, would_update > 0, intet aendres
--   SELECT jobname, schedule FROM cron.job WHERE jobname = 'repair-case-requests-cleanup';  -- 30 3 * * *
