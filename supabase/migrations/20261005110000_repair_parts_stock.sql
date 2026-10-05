-- Ny sag, B2: reservedele og lager pr. butik.
-- Kør EFTER 20261005100000_repair_catalog_links.sql.
--
-- Hvad den gør:
--   1. sku_products: repair_model_id (FK repair_models), repair_only, cost_source,
--      cost_ref, cost_updated_at + unikt indeks på (repair_model_id, part_category_id,
--      quality_tier_id). repair_only-varer skjules fra web, feed og kassens søgning
--      (koden filtrerer; se src/app/api/pos/lookup/route.ts).
--   2. repair_service_parts: hvilke dele en reparation bruger (primær + evt. alternativer).
--   3. sku_stock.reserved_qty (default 0) med CHECK 0 <= reserved_qty <= quantity.
--      Tilgængeligt = quantity - reserved_qty.
--   4. stock_movements: ny reason 'repair' + kolonnen ref_repair_ticket_id.
--      Reason-constraintens eksisterende værdier læses dynamisk og bevares.
--   5. bootstrap_repair_parts(p_dry_run, p_repair_service_id): sætbaseret og kan
--      køres igen uden skade. Se funktionskommentaren. Den KØRES IKKE af
--      migrationen; kør først tørkørslen (nederst) og læs statistikken.
--   6. Trigger på repair_services: ny/ændret reparation bootstrapper kun sig selv.
--   7. Alle dele starter som always_in_stock = true. pos_adjust_stock og
--      stock_receive_goods (erstattet her, ellers uændret) sætter den til false første
--      gang en reservedel får et lagertal. Kun disse to funktioner gør det.
--
-- Valg hvor spec'en var åben (sikreste udlægning):
--   * Auto-skiftet af always_in_stock rammer kun reservedele: varer med repair_model_id,
--     part_category_id eller en række i repair_service_parts. Almindeligt tilbehør,
--     der bevidst er "altid på lager", skiftes ikke af en varemodtagelse.
--   * Nye varer oprettes med status 'draft', repair_only = true, is_active = false,
--     selling_price = 0 (usynlige alle steder, selv i kode der kun tjekker is_active).
--     Lageroverblikket viser dem alligevel (se 20261005150000).
--   * Kostpris sættes kun hvor varen ikke har en manuelt sat kostpris
--     (cost_price IS NULL eller cost_source = 'foneday').
--   * Foneday-match sker via modelkoder (foneday_catalog.model_codes mod
--     sku_products.device_model_codes) + kategori + kvalitet. Varer uden modelkoder
--     får ingen automatisk kostpris (rapporteres i statistikken).
--   * src/lib/foneday/sync.ts opdaterer kun links med use_type = 'retail' (verificeret),
--     så salgsprisen på repair_part-links bliver ikke overskrevet; auto_sync_price = false.
--
-- Antagelser om live-skemaet (verificér før kørsel):
--   * sku_products har kolonnerne status, slug, device_brand, device_series, device_model,
--     device_model_codes, part_category_id, quality_tier_id, always_in_stock, cost_price,
--     is_active (20260401_spare_parts_tables.sql, 20260316_always_in_stock.sql).
--   * foneday_catalog.price_dkk er i ØRE (src/lib/foneday/sync.ts: eurToOere).
--   * foneday_sku_link har sku_product_id og UNIQUE(foneday_catalog_id).
--   * locations.slug 'vejle' og 'slagelse' findes (20261003100000).
--   * stock_movements.reason-constraintens definition er "CHECK (reason = ANY (...))";
--     ellers stopper migrationen (hellere det end at overskrive en ukendt regel).
--
-- Idempotent og transaktionel.

BEGIN;

-- ------------------------------------------------------------
-- sku_products
-- ------------------------------------------------------------
ALTER TABLE public.sku_products
  ADD COLUMN IF NOT EXISTS repair_model_id uuid REFERENCES public.repair_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS repair_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cost_source text,
  ADD COLUMN IF NOT EXISTS cost_ref text,
  ADD COLUMN IF NOT EXISTS cost_updated_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS sku_products_repair_part_unique
  ON public.sku_products (repair_model_id, part_category_id, quality_tier_id)
  WHERE repair_model_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sku_products_repair_only
  ON public.sku_products (repair_only) WHERE repair_only;

-- ------------------------------------------------------------
-- repair_service_parts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.repair_service_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_service_id uuid NOT NULL REFERENCES public.repair_services(id) ON DELETE CASCADE,
  sku_product_id uuid NOT NULL REFERENCES public.sku_products(id) ON DELETE CASCADE,
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  is_primary boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'bootstrap' CHECK (source IN ('bootstrap', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (repair_service_id, sku_product_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS repair_service_parts_one_primary
  ON public.repair_service_parts (repair_service_id) WHERE is_primary;
CREATE INDEX IF NOT EXISTS repair_service_parts_sku ON public.repair_service_parts (sku_product_id);
ALTER TABLE public.repair_service_parts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.repair_service_parts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.repair_service_parts TO service_role;

-- ------------------------------------------------------------
-- sku_stock.reserved_qty
-- ------------------------------------------------------------
ALTER TABLE public.sku_stock ADD COLUMN IF NOT EXISTS reserved_qty integer NOT NULL DEFAULT 0;
ALTER TABLE public.sku_stock DROP CONSTRAINT IF EXISTS sku_stock_reserved_valid;
ALTER TABLE public.sku_stock ADD CONSTRAINT sku_stock_reserved_valid
  CHECK (reserved_qty >= 0 AND reserved_qty <= quantity);

-- ------------------------------------------------------------
-- stock_movements: reason 'repair' + ref_repair_ticket_id
-- ------------------------------------------------------------
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS ref_repair_ticket_id uuid;
CREATE INDEX IF NOT EXISTS stock_movements_repair_ticket
  ON public.stock_movements (ref_repair_ticket_id) WHERE ref_repair_ticket_id IS NOT NULL;

DO $$
DECLARE c record; v_vals text[] := '{}'; v_found text[];
BEGIN
  FOR c IN
    SELECT oid, conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
    WHERE conrelid = 'public.stock_movements'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%reason%'
  LOOP
    IF c.def !~ '^CHECK \(+\(?reason\)?(::text)? = ANY' THEN
      RAISE EXCEPTION 'stock_movements: ukendt reason-constraint % (%). Ret migrationen i hånden.', c.conname, c.def;
    END IF;
    SELECT array_agg(x[1]) INTO v_found FROM regexp_matches(c.def, '''([^'']+)''', 'g') AS x;
    v_vals := v_vals || coalesce(v_found, '{}');
  END LOOP;
  IF cardinality(v_vals) = 0 THEN RETURN; END IF;   -- ingen reason-constraint i prod: intet at ændre
  SELECT array_agg(DISTINCT v ORDER BY v) INTO v_vals FROM unnest(v_vals || ARRAY['repair']) v;
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.stock_movements'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%reason%'
  LOOP
    EXECUTE format('ALTER TABLE public.stock_movements DROP CONSTRAINT %I', c.conname);
  END LOOP;
  EXECUTE format(
    'ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_reason_check CHECK (reason IN (%s))',
    (SELECT string_agg(quote_literal(v), ', ' ORDER BY v) FROM unnest(v_vals) v));
END $$;

-- ------------------------------------------------------------
-- Planlægning (rene læsefunktioner, bruges af bootstrap og tørkørslen)
-- ------------------------------------------------------------

-- Reparationer der bruger en del, med det reservedelstrin reglerne giver.
CREATE OR REPLACE FUNCTION public.repair_parts_services(p_service_id uuid DEFAULT NULL)
RETURNS TABLE (s_service_id uuid, s_model_id uuid, s_cat_id uuid, s_tier_id uuid)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT rs.id, rs.model_id, rs.part_category_id, r.spare_quality_tier_id
  FROM public.repair_services rs
  JOIN public.repair_part_tier_rules r
    ON r.part_category_id = rs.part_category_id
   AND r.repair_quality = coalesce(rs.quality_tier, 'standard')
  -- Også inaktive reparationer (priser kommer snart): delene skal kunne lagerføres før modellen åbner.
  WHERE rs.part_mode = 'part' AND rs.part_category_id IS NOT NULL
    AND (p_service_id IS NULL OR rs.id = p_service_id)
$$;

-- Én række pr. model x kategori x kvalitetstrin:
--   linked = findes allerede (sku_products.repair_model_id er sat)
--   claim  = en eksisterende vare med samme normaliserede model/kategori/trin kobles til modellen
--   create = ny vare oprettes
CREATE OR REPLACE FUNCTION public.repair_parts_plan(p_service_id uuid DEFAULT NULL)
RETURNS TABLE (r_model_id uuid, r_cat_id uuid, r_tier_id uuid, r_action text, r_sku_id uuid, r_services integer)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH trip AS (
    SELECT s_model_id AS model_id, s_cat_id AS cat_id, s_tier_id AS tier_id, count(*)::int AS n
    FROM public.repair_parts_services(p_service_id) GROUP BY 1, 2, 3
  ), linked AS (
    SELECT t.model_id, t.cat_id, t.tier_id, t.n, s.id AS sku_id
    FROM trip t
    JOIN public.sku_products s
      ON s.repair_model_id = t.model_id AND s.part_category_id = t.cat_id AND s.quality_tier_id = t.tier_id
  ), open_trip AS (
    SELECT t.* FROM trip t
    WHERE NOT EXISTS (SELECT 1 FROM linked l
      WHERE l.model_id = t.model_id AND l.cat_id = t.cat_id AND l.tier_id = t.tier_id)
  ), cand AS (
    SELECT DISTINCT ON (t.model_id, t.cat_id, t.tier_id)
           t.model_id, t.cat_id, t.tier_id, t.n, s.id AS sku_id, m.created_at AS m_created
    FROM open_trip t
    JOIN public.repair_models m ON m.id = t.model_id
    JOIN public.sku_products s
      ON s.repair_model_id IS NULL AND s.part_category_id = t.cat_id AND s.quality_tier_id = t.tier_id
     AND public.repair_norm(s.device_model) <> ''
     AND public.repair_norm(s.device_model) = public.repair_norm(m.name)
    ORDER BY t.model_id, t.cat_id, t.tier_id, (s.status = 'published') DESC, s.created_at, s.id
  ), cand_u AS (
    SELECT c.*, row_number() OVER (PARTITION BY c.sku_id ORDER BY c.m_created, c.model_id) AS rn FROM cand c
  )
  SELECT l.model_id, l.cat_id, l.tier_id, 'linked'::text, l.sku_id, l.n FROM linked l
  UNION ALL
  SELECT c.model_id, c.cat_id, c.tier_id, 'claim'::text, c.sku_id, c.n FROM cand_u c WHERE c.rn = 1
  UNION ALL
  SELECT t.model_id, t.cat_id, t.tier_id, 'create'::text, NULL::uuid, t.n FROM open_trip t
  WHERE NOT EXISTS (SELECT 1 FROM cand_u c
    WHERE c.rn = 1 AND c.model_id = t.model_id AND c.cat_id = t.cat_id AND c.tier_id = t.tier_id)
$$;

-- Reparation -> vare (efter model x kategori x trin). Kun varer der findes.
CREATE OR REPLACE FUNCTION public.repair_parts_targets(p_service_id uuid DEFAULT NULL)
RETURNS TABLE (t_service_id uuid, t_sku_id uuid)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT s.s_service_id, p.id
  FROM public.repair_parts_services(p_service_id) s
  JOIN public.sku_products p
    ON p.repair_model_id = s.s_model_id AND p.part_category_id = s.s_cat_id AND p.quality_tier_id = s.s_tier_id
$$;

-- Kostpris fra Foneday pr. vare (billigste på lager først). price_dkk er øre.
-- Kun varer med modelkoder, og kun skærme og batterier (kategorier Foneday kalder
-- Display og Battery); alt andet bliver uden automatisk kostpris.
CREATE OR REPLACE FUNCTION public.repair_parts_cost_matches(p_service_id uuid DEFAULT NULL)
RETURNS TABLE (c_sku_id uuid, c_catalog_id uuid, c_foneday_sku text, c_price_oere integer)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT ON (s.id) s.id, fc.id, fc.foneday_sku, fc.price_dkk
  FROM (SELECT DISTINCT t_sku_id FROM public.repair_parts_targets(p_service_id)) tg
  JOIN public.sku_products s ON s.id = tg.t_sku_id
  JOIN public.spare_part_categories c ON c.id = s.part_category_id
  JOIN public.spare_part_quality_tiers q ON q.id = s.quality_tier_id
  JOIN public.foneday_catalog fc
    ON fc.model_codes && s.device_model_codes
   AND fc.price_dkk IS NOT NULL AND fc.price_dkk > 0 AND fc.missing_since IS NULL
   AND (
        (c.slug = 'skaerme' AND fc.category ILIKE 'display%')
     OR (c.slug = 'batterier' AND fc.category ILIKE 'batter%')
   )
   AND (
        (q.slug = 'service-pack' AND fc.quality ILIKE 'service pack')
     OR (q.slug = 'oem-equivalent' AND fc.quality ILIKE 'oem%')
     OR (q.slug = 'original-pulled' AND fc.quality ILIKE 'pulled')
     OR (q.slug = 'refurbished' AND fc.quality ILIKE 'refurbished')
     OR (q.slug = 'standard-incell' AND fc.title ~* 'in-?cell')
     OR (q.slug = 'premium-soft-oled' AND fc.title ~* 'soft\s*oled')
     OR (q.slug = 'premium-hard-oled' AND fc.title ~* 'hard\s*oled')
   )
  WHERE cardinality(coalesce(s.device_model_codes, '{}')) > 0
    AND (s.cost_price IS NULL OR s.cost_source = 'foneday')
  ORDER BY s.id, fc.in_stock DESC, fc.price_dkk, fc.foneday_sku
$$;

-- ------------------------------------------------------------
-- bootstrap_repair_parts
-- ------------------------------------------------------------
-- p_dry_run = true (standard): skriver intet, returnerer kun statistik.
-- p_dry_run = false: kører trinene i rækkefølge (alt i den kaldende transaktion):
--   1. kobler eksisterende reservedels-varer til modellen (claim) via normaliseret model
--   2. opretter manglende varer, én pr. model x kategori x kvalitetstrin:
--      draft, repair_only, always_in_stock = true, selling_price = 0
--   3. lagerrækker med 0 i Vejle og Slagelse
--   4. foneday-kostpris + foneday_sku_link (repair_part, auto_sync_price = false)
--   5. repair_service_parts (fjerner forældede bootstrap-links, rører ikke manuelle)
-- p_repair_service_id begrænser alt til én reparation (bruges af triggeren).
-- Statistikken er den samme i begge tilstande ("to_*" i tørkørsel, "done_*" ellers).
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

-- Én reparation ændret/oprettet: bootstrap kun den. Fejl stopper aldrig en prisredigering.
CREATE OR REPLACE FUNCTION public.repair_services_bootstrap_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.part_mode <> 'part' THEN RETURN NULL; END IF;
  BEGIN
    PERFORM public.bootstrap_repair_parts(false, NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'bootstrap_repair_parts fejlede for reparation %: %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_repair_services_bootstrap ON public.repair_services;
CREATE TRIGGER trg_repair_services_bootstrap
  AFTER INSERT OR UPDATE OF part_category_id, part_mode, quality_tier, model_id, active ON public.repair_services
  FOR EACH ROW EXECUTE FUNCTION public.repair_services_bootstrap_trg();

-- ------------------------------------------------------------
-- always_in_stock -> false første gang en reservedel får et lagertal.
-- pos_adjust_stock og stock_receive_goods er identiske med de tidligere
-- definitioner (20261003130000 / 20261004400100) plus:
--   * pos_adjust_stock: kan ikke sænke lageret under det reserverede (stock_below_reserved)
--   * begge: nulstiller always_in_stock på reservedele (se toppen)
--   * stock_receive_goods: lægger varer til side til sager der venter på delen (backorder),
--     hvis repair_allocate_backorders findes (20261005120000)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_part_start_tracking(p_product_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_rc integer;
BEGIN
  UPDATE public.sku_products
     SET always_in_stock = false, updated_at = clock_timestamp()
   WHERE id = p_product_id AND always_in_stock
     AND (repair_model_id IS NOT NULL OR part_category_id IS NOT NULL
          OR EXISTS (SELECT 1 FROM public.repair_service_parts WHERE sku_product_id = p_product_id));
  GET DIAGNOSTICS v_rc = ROW_COUNT;
  RETURN v_rc > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_adjust_stock(
  p_product_id uuid, p_location_id uuid, p_delta integer, p_reason text, p_note text, p_staff_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_qty integer; v_res integer; v_flipped boolean;
BEGIN
  IF p_reason NOT IN ('adjust', 'receive') THEN PERFORM public.pos_fail('invalid_stock_reason'); END IF;
  IF p_delta IS NULL OR p_delta = 0 THEN PERFORM public.pos_fail('invalid_stock_delta'); END IF;
  IF p_reason = 'adjust' AND btrim(coalesce(p_note, '')) = '' THEN PERFORM public.pos_fail('stock_note_required'); END IF;
  IF p_reason = 'receive' AND p_delta < 0 THEN PERFORM public.pos_fail('invalid_stock_delta'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sku_products WHERE id = p_product_id) THEN PERFORM public.pos_fail('sku_not_found'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_location_id) THEN PERFORM public.pos_fail('location_not_found'); END IF;

  SELECT quantity, reserved_qty INTO v_qty, v_res FROM public.sku_stock
    WHERE product_id = p_product_id AND location_id = p_location_id FOR UPDATE;
  IF coalesce(v_qty, 0) + p_delta < 0 THEN PERFORM public.pos_fail('stock_would_go_negative'); END IF;
  IF coalesce(v_qty, 0) + p_delta < coalesce(v_res, 0) THEN
    PERFORM public.pos_fail('stock_below_reserved', coalesce(v_res, 0)::text);
  END IF;
  INSERT INTO public.sku_stock (product_id, location_id, quantity)
    VALUES (p_product_id, p_location_id, p_delta)
    ON CONFLICT (product_id, location_id)
    DO UPDATE SET quantity = public.sku_stock.quantity + p_delta, updated_at = clock_timestamp()
    RETURNING quantity INTO v_qty;

  INSERT INTO public.stock_movements (location_id, sku_product_id, qty_delta, reason, ref_note, staff_id)
    VALUES (p_location_id, p_product_id, p_delta, p_reason, nullif(btrim(coalesce(p_note, '')), ''), p_staff_id);

  v_flipped := public.repair_part_start_tracking(p_product_id);
  IF p_delta > 0 AND to_regprocedure('public.repair_allocate_backorders(uuid,uuid)') IS NOT NULL THEN
    PERFORM public.repair_allocate_backorders(p_product_id, p_location_id);
  END IF;
  RETURN jsonb_build_object('quantity', v_qty, 'tracking_started', v_flipped);
END;
$$;

CREATE OR REPLACE FUNCTION public.stock_receive_goods(
  p_location_id uuid, p_staff_id uuid, p_invoice_no text, p_invoice_date date, p_lines jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  e jsonb; v_qty integer; v_cost integer; v_pid uuid; v_note text; n integer := 0; v_started integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_location_id) THEN PERFORM public.transfer_fail('location_not_found'); END IF;
  PERFORM public.transfer_check_actor(p_staff_id, p_location_id, true);
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) = 0 THEN
    PERFORM public.transfer_fail('no_lines');
  END IF;
  IF jsonb_array_length(p_lines) > 100 THEN PERFORM public.transfer_fail('too_many_lines'); END IF;
  v_note := 'Varemodtagelse'
    || CASE WHEN btrim(coalesce(p_invoice_no, '')) <> '' THEN ' · faktura ' || left(btrim(p_invoice_no), 60) ELSE '' END
    || CASE WHEN p_invoice_date IS NOT NULL THEN ' · ' || to_char(p_invoice_date, 'YYYY-MM-DD') ELSE '' END;

  FOR e IN SELECT x FROM jsonb_array_elements(p_lines) x LOOP
    v_pid := (e->>'sku_product_id')::uuid;
    v_qty := (e->>'qty')::integer;
    v_cost := (e->>'cost_price_oere')::integer;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 100000 THEN PERFORM public.transfer_fail('invalid_quantity'); END IF;
    IF v_cost IS NOT NULL AND v_cost < 0 THEN PERFORM public.transfer_fail('invalid_cost'); END IF;
    IF NOT EXISTS (SELECT 1 FROM public.sku_products WHERE id = v_pid) THEN PERFORM public.transfer_fail('sku_not_found'); END IF;
    INSERT INTO public.sku_stock (product_id, location_id, quantity)
      VALUES (v_pid, p_location_id, v_qty)
      ON CONFLICT (product_id, location_id)
      DO UPDATE SET quantity = public.sku_stock.quantity + v_qty, updated_at = clock_timestamp();
    INSERT INTO public.stock_movements (location_id, sku_product_id, qty_delta, reason, ref_note, staff_id)
      VALUES (p_location_id, v_pid, v_qty, 'receive', v_note, p_staff_id);
    IF v_cost IS NOT NULL THEN
      UPDATE public.sku_products
         SET cost_price = v_cost, cost_source = 'manual', cost_ref = NULL,
             cost_updated_at = clock_timestamp(), updated_at = clock_timestamp()
       WHERE id = v_pid;
    END IF;
    IF public.repair_part_start_tracking(v_pid) THEN v_started := v_started + 1; END IF;
    IF to_regprocedure('public.repair_allocate_backorders(uuid,uuid)') IS NOT NULL THEN
      PERFORM public.repair_allocate_backorders(v_pid, p_location_id);
    END IF;
    n := n + 1;
  END LOOP;
  RETURN jsonb_build_object('lines', n, 'tracking_started', v_started);
END;
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.repair_parts_services(uuid)',
    'public.repair_parts_plan(uuid)',
    'public.repair_parts_targets(uuid)',
    'public.repair_parts_cost_matches(uuid)',
    'public.bootstrap_repair_parts(boolean,uuid)',
    'public.repair_services_bootstrap_trg()',
    'public.repair_part_start_tracking(uuid)',
    'public.pos_adjust_stock(uuid,uuid,integer,text,text,uuid)',
    'public.stock_receive_goods(uuid,uuid,text,date,jsonb)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

COMMIT;

-- Tørkørsel af bootstrap (skriver intet, returnerer statistik som jsonb):
--   SELECT public.bootstrap_repair_parts(true);
-- Kør den rigtige først når tallene er gennemgået (alt i én transaktion; ROLLBACK hvis noget ser forkert ud):
--   BEGIN; SELECT public.bootstrap_repair_parts(false); -- gennemgå 'done', kør verifikationen, så COMMIT eller ROLLBACK;
--
-- Verifikation (forventet resultat i kommentar):
--   SELECT count(*) FROM sku_products WHERE repair_only;                  -- = triples_to_create_new_sku (efter rigtig kørsel)
--   SELECT count(*) FROM sku_products WHERE repair_only AND NOT always_in_stock;   -- 0 (alle starter som "altid på lager")
--   SELECT count(*) FROM sku_stock WHERE reserved_qty <> 0;                -- 0
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'stock_movements_reason_check';
--                                                                          -- indeholder 'repair' og alle gamle værdier (sale, return, adjust, receive, transfer)
--   SELECT count(*) FROM repair_service_parts WHERE is_primary;            -- = services_using_a_part (efter rigtig kørsel)
--   SELECT repair_model_id, part_category_id, quality_tier_id, count(*) FROM sku_products
--     WHERE repair_model_id IS NOT NULL GROUP BY 1, 2, 3 HAVING count(*) > 1;   -- 0 rækker
--   SELECT jsonb_pretty(public.bootstrap_repair_parts(true));              -- efter rigtig kørsel: alle "to_*" = 0 (genkørsel er skadesløs)
