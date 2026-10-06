-- Foneday-kostpris på titel, version 2: modelmatch som præfiks i stedet for regex-udtræk.
--
-- Version 1 (20261005190000) fandt kun 36 af 1.241 dele. Postgres' regex blander ikke "dovne" og
-- grådige kvantorer pålideligt, så modeludtrækket slugte resten af titlen
-- ("For iPhone 13 Mini White OEM-Equivalent" -> "iphone 13 mini white oem-equivalent").
-- Samsung-titler har desuden mærket foran ("For Samsung Galaxy S23"), og vores navne bruger "+".
--
-- Nu: halen efter "For " normaliseres (lowercase, "+" -> " plus", mellemrum), og en model matcher, hvis
-- halen ER modelnavnet eller starter med modelnavnet + mellemrum, og næste ord ikke gør det til en
-- anden model (pro, max, mini, plus, ultra, fe, lite, edge, neo, xl eller et årstal i parentes).
-- "iPhone 15" matcher derfor ikke "iPhone 15 Pro", men "Galaxy A35" matcher "Galaxy A35 5G (SM-A356B)".
--
-- Kun funktioner ændres; ingen data. Eksisterende kostpriser uden kilde overskrives aldrig. Kostpriser skrives først, når repair_parts_refresh_costs(false) køres.
-- TS-spejl: src/lib/foneday/title-parser.ts (titleTails / titleModelMatch).

BEGIN;

CREATE OR REPLACE FUNCTION public.repair_parts_norm_model(p text)
RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT btrim(regexp_replace(regexp_replace(lower(coalesce(p, '')), '\+', ' plus ', 'g'), '\s+', ' ', 'g'))
$$;

-- Haler efter "For ": selve halen og halen uden et førende mærkenavn.
CREATE OR REPLACE FUNCTION public.repair_parts_title_models(p_title text)
RETURNS text[]
LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog, public AS $$
DECLARE
  pos integer;
  tail text;
  stripped text;
BEGIN
  pos := position(' for ' IN lower(' ' || regexp_replace(coalesce(p_title, ''), '\s+', ' ', 'g') || ' '));
  IF pos = 0 THEN RETURN '{}'::text[]; END IF;
  tail := public.repair_parts_norm_model(
    substr(' ' || regexp_replace(coalesce(p_title, ''), '\s+', ' ', 'g') || ' ', pos + 5));
  IF tail = '' THEN RETURN '{}'::text[]; END IF;
  stripped := regexp_replace(tail,
    '^(samsung|apple|google|huawei|xiaomi|oneplus|motorola|nokia|sony|oppo|realme|honor|lg|asus|vivo) ', '');
  IF stripped = tail THEN RETURN ARRAY[tail]; END IF;
  RETURN ARRAY[tail, stripped];
END;
$$;

-- 0 = halen er præcis modellen, 1 = halen starter med modellen, NULL = intet match.
CREATE OR REPLACE FUNCTION public.repair_parts_title_model_match(p_tails text[], p_model text)
RETURNS integer
LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog, public AS $$
DECLARE
  n text := public.repair_parts_norm_model(p_model);
  t text;
  nxt text;
  best integer;
BEGIN
  IF n = '' THEN RETURN NULL; END IF;
  FOREACH t IN ARRAY coalesce(p_tails, '{}'::text[]) LOOP
    IF t = n THEN RETURN 0; END IF;
    IF left(t, length(n) + 1) = n || ' ' THEN
      nxt := split_part(substr(t, length(n) + 2), ' ', 1);
      IF nxt NOT IN ('pro', 'max', 'mini', 'plus', 'ultra', 'fe', 'lite', 'edge', 'neo', 'xl')
         AND nxt !~ '^\(\d{4}\)$' THEN
        best := 1;
      END IF;
    END IF;
  END LOOP;
  RETURN best;
END;
$$;

-- Kategori: udeluk chips, FPC-stik på bundkortet og flerpak ("(3 pieces)"); de er ikke den del, reparationen bruger.
CREATE OR REPLACE FUNCTION public.repair_parts_title_category(p_title text, p_category text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog, public AS $$
DECLARE
  t text := regexp_replace(coalesce(p_title, ''), '\s+', ' ', 'g');
  raw text;
  pre text;
BEGIN
  raw := lower(coalesce((regexp_match(t, '^(.*?)\mFor\M', 'i'))[1], t));
  IF raw ~ '(\mchip\M|\mfpc\M|\mpieces?\M|\mpcs\M)' THEN RETURN NULL; END IF;
  pre := regexp_replace(raw, '\([^)]*\)', ' ', 'g');
  IF pre ~ '(\mic\M|adhesive|tape|sticker|protector|tool|tester|cleaner|\mkit\M|screw|gasket|bracket|lens)' THEN
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

-- Kvalitet: "Refurbished" på andre dele end skærme er ikke OEM-equivalent (fx et brugt bagkabinet).
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
  IF s ~ '\mrefurbished\M' THEN RETURN ARRAY['refurbished', 'original-pulled']; END IF;
  RETURN ARRAY['oem-equivalent'];
END;
$$;

CREATE OR REPLACE FUNCTION public.repair_parts_title_matches()
RETURNS TABLE (m_sku_id uuid, m_catalog_id uuid, m_foneday_sku text, m_title text, m_price_oere integer, m_priority integer,
               m_cost_source text, m_cost_price integer)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH parsed AS (
    SELECT fc.id, fc.foneday_sku, fc.title, fc.price_dkk, c.cat,
           public.repair_parts_title_models(fc.title) AS tails,
           public.repair_parts_title_tiers(fc.title, fc.quality, c.cat) AS tiers
    FROM public.foneday_catalog fc
    CROSS JOIN LATERAL (SELECT public.repair_parts_title_category(fc.title, fc.category) AS cat) c
    WHERE fc.in_stock AND fc.missing_since IS NULL AND fc.price_dkk IS NOT NULL AND fc.price_dkk > 0
      AND c.cat IS NOT NULL
  ), rows AS (
    SELECT p.id, p.foneday_sku, p.title, p.price_dkk, p.cat, tier, tail
    FROM parsed p, unnest(p.tiers) AS tier, unnest(p.tails) AS tail
  ), skus AS (
    SELECT s.id, s.cost_source, s.cost_price, c.slug AS cat, q.slug AS tier,
           public.repair_parts_norm_model(m.name) AS n
    FROM public.sku_products s
    JOIN public.repair_models m ON m.id = s.repair_model_id
    JOIN public.spare_part_categories c ON c.id = s.part_category_id
    JOIN public.spare_part_quality_tiers q ON q.id = s.quality_tier_id
    WHERE s.repair_model_id IS NOT NULL
  ), cand AS (
    SELECT k.id AS sku_id, r.id AS cat_id, r.foneday_sku, r.title, r.price_dkk, k.cost_source, k.cost_price,
           CASE WHEN r.tail = k.n THEN 0 ELSE 1 END AS prio,
           split_part(substr(r.tail, length(k.n) + 2), ' ', 1) AS nxt
    FROM skus k
    JOIN rows r ON r.cat = k.cat AND r.tier = k.tier
               AND left(r.tail, length(k.n)) = k.n
               AND (r.tail = k.n OR substr(r.tail, length(k.n) + 1, 1) = ' ')
  )
  SELECT DISTINCT ON (sku_id, cat_id) sku_id, cat_id, foneday_sku, title, price_dkk, prio, cost_source, cost_price
  FROM cand
  WHERE prio = 0
     OR (nxt NOT IN ('pro', 'max', 'mini', 'plus', 'ultra', 'fe', 'lite', 'edge', 'neo', 'xl') AND nxt !~ '^\(\d{4}\)$')
  ORDER BY sku_id, cat_id, prio
$$;

-- Kostpris skrives kun, hvor den er tom eller allerede kommer fra Foneday. En kostpris uden kilde
-- (tastet ind før kildemarkering fandtes) behandles som manuel og røres ikke.
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
    WHERE m_cost_source = 'foneday' OR (m_cost_source IS NULL AND coalesce(m_cost_price, 0) = 0)
    ORDER BY m_sku_id, m_price_oere, m_priority, m_foneday_sku;

  SELECT count(*) INTO v_matched FROM _rpc_pick;
  SELECT count(*) INTO v_would FROM _rpc_pick p JOIN public.sku_products s ON s.id = p.m_sku_id
    WHERE s.cost_price IS DISTINCT FROM p.m_price_oere OR s.cost_ref IS DISTINCT FROM p.m_foneday_sku
       OR s.cost_source IS DISTINCT FROM 'foneday';
  SELECT count(DISTINCT m_sku_id) INTO v_manual_skipped FROM _rpc_all
    WHERE m_cost_source = 'manual' OR (m_cost_source IS NULL AND coalesce(m_cost_price, 0) > 0);

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
       AND (s.cost_source = 'foneday' OR (s.cost_source IS NULL AND coalesce(s.cost_price, 0) = 0));
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

COMMIT;

-- Verifikation:
--   SELECT public.repair_parts_title_model_match(public.repair_parts_title_models('Battery For iPhone 13 Mini White OEM-Equivalent'), 'iPhone 13');       -- NULL
--   SELECT public.repair_parts_title_model_match(public.repair_parts_title_models('Battery For iPhone 13 Mini White OEM-Equivalent'), 'iPhone 13 Mini');  -- 1
--   SELECT public.repair_parts_title_model_match(public.repair_parts_title_models('Display For Samsung Galaxy A35 5G (SM-A356B) Black'), 'Galaxy A35');   -- 1
--   SELECT public.repair_parts_refresh_costs(true);  -- matched skal være langt over 36
