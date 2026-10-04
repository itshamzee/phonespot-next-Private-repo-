-- Ny sag, B1: katalog. Kobler reparationer (repair_services) til reservedels-
-- kategorier og -kvaliteter, normaliserer kategorinavne og udfylder serier.
-- Kør FØRST af de fem 20261005-migrationer (se docs/ny-sag-spec-2026-10.md).
--
-- Hvad den gør:
--   1. repair_services.part_category_id (FK spare_part_categories) og
--      repair_services.part_mode ('part' | 'none' | 'manual').
--      none = diagnostik, software, vandskade. Baggrundsfyldes ud fra kategorinavnet;
--      kun rækker der stadig står som 'manual' uden kategori røres.
--   2. repair_part_tier_rules: hvilket reservedelstrin (spare_part_quality_tiers)
--      hver reparationskvalitet (standard/premium/original) bruger pr. kategori.
--      Startregler: skærm = incell / soft OLED / service pack, alt andet = OEM / OEM /
--      service pack.
--   3. Kategorinavne på repair_services.service_category normaliseres til ét sæt.
--      Skærm og batteri tvinges til "Skærmskift"/"Batteriskift", fordi hjemmesidens
--      prisoversigter (src/lib/supabase/repairs.ts) læser præcis de to navne.
--      Øvrige kategorier slås kun sammen, når de findes i flere stavemåder
--      ("Kamera" / "Kameraskift"); den stavemåde der ender på "skift" vinder, ellers
--      den mest brugte. Ingen nye kategorinavne opfindes.
--   4. repair_series_for() + trigger + baggrundsfyldning af tomme repair_models.series.
--
-- Antagelser om live-skemaet (verificér før kørsel, se spørgsmål nederst):
--   * repair_brands / repair_models / repair_services findes med kolonnerne fra
--     src/lib/supabase/migrations/001_repair_catalog.sql + 002 (series) +
--     20260310_mega_upgrade.sql (quality_tier, service_category).
--   * spare_part_categories har slugs 'skaerme' og 'batterier'; spare_part_quality_tiers
--     har 'standard-incell', 'premium-soft-oled', 'oem-equivalent', 'service-pack'
--     (20260401_spare_parts_seed.sql + 20260406_bulk_iphone_spare_parts.sql).
--     Mangler en af dem, stopper migrationen (hellere det end halve regler).
--
-- Idempotent og transaktionel.

BEGIN;

-- ------------------------------------------------------------
-- Hjælpefunktioner (rene, IMMUTABLE)
-- ------------------------------------------------------------

-- Foldet nøgle til sammenligning: "Skærmskift" -> "skaermskift", "iPhone 13 Pro" -> "iphone13pro".
CREATE OR REPLACE FUNCTION public.repair_norm(p_text text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT regexp_replace(
    replace(replace(replace(replace(replace(replace(replace(
      lower(coalesce(p_text, '')), 'æ', 'ae'), 'ø', 'oe'), 'å', 'aa'), 'ä', 'a'), 'ö', 'o'), 'ü', 'u'), 'é', 'e'),
    '[^a-z0-9]+', '', 'g')
$$;

-- Hvilken reservedelskategori (slug) og part_mode hører en reparationskategori til?
-- (NULL, 'none') = bruger ingen del; (NULL, 'manual') = ukendt, personalet vælger.
CREATE OR REPLACE FUNCTION public.repair_category_hint(p_text text)
RETURNS TABLE (part_slug text, part_mode text)
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  WITH k AS (SELECT public.repair_norm(p_text) AS key)
  SELECT
    CASE
      WHEN key ~ '(vandskade|diagnos|software|fejlfind|tilbud|rensning|datasikring|dataoverfoersel)' THEN NULL
      WHEN key ~ '(bagcover|bagglas|bagside|bagplade)' THEN 'bagcovers'
      WHEN key ~ '(kameralinse|kameraglas|linse)' THEN 'kameralinser'
      WHEN key ~ 'kamera' THEN 'kameraer'
      WHEN key ~ '(skaerm|display|frontglas|lcd|oled)' THEN 'skaerme'
      WHEN key ~ 'batteri' THEN 'batterier'
      WHEN key ~ '(opladning|ladestik|ladeport|ladeconnector|charg)' THEN 'opladningsstik'
      WHEN key ~ '(hoejttaler|hojttaler|speaker|ringer)' THEN 'hojttalere'
      WHEN key ~ 'mikrofon' THEN 'hovedtelefon-mikrofon'
      WHEN key ~ '(homeknap|touchid)' THEN 'home-knapper'
      WHEN key ~ '(frame|ramme)' THEN 'frames'
      WHEN key ~ 'tastatur' THEN 'tastaturer'
      WHEN key ~ '(simkort|simholder)' THEN 'sim-kortholdere'
      WHEN key ~ '(vibration|buzzer)' THEN 'buzzere'
      ELSE NULL
    END,
    CASE
      WHEN key = '' THEN 'manual'
      WHEN key ~ '(vandskade|diagnos|software|fejlfind|tilbud|rensning|datasikring|dataoverfoersel)' THEN 'none'
      WHEN key ~ '(bagcover|bagglas|bagside|bagplade|kamera|linse|skaerm|display|frontglas|lcd|oled|batteri|opladning|ladestik|ladeport|ladeconnector|charg|hoejttaler|hojttaler|speaker|ringer|mikrofon|homeknap|touchid|frame|ramme|tastatur|simkort|simholder|vibration|buzzer)' THEN 'part'
      ELSE 'manual'
    END
  FROM k
$$;

-- Fast regel for serier. NULL = ingen regel passer (så er serien tom, og
-- kataloget viser modellen under "Øvrige").
CREATE OR REPLACE FUNCTION public.repair_series_for(p_brand_slug text, p_model_name text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog, public AS $$
DECLARE
  n text := btrim(coalesce(p_model_name, ''));
  b text := lower(coalesce(p_brand_slug, ''));
  m text[];
BEGIN
  IF n = '' THEN RETURN NULL; END IF;

  -- Apple
  IF n ~* '^iphone' THEN
    IF n ~* '^iphone\s+se' THEN RETURN 'iPhone SE'; END IF;
    IF n ~* '^iphone\s+air' THEN RETURN 'iPhone Air'; END IF;
    IF n ~* '^iphone\s+(x|xr|xs)(\s|$)' THEN RETURN 'iPhone X'; END IF;
    m := regexp_match(n, '^iphone\s+(\d+s?)(\s|$)', 'i');
    IF m IS NOT NULL THEN RETURN 'iPhone ' || lower(m[1]); END IF;
    RETURN NULL;
  END IF;
  IF n ~* '^ipad' THEN
    IF n ~* '^ipad\s+pro' THEN RETURN 'iPad Pro'; END IF;
    IF n ~* '^ipad\s+air' THEN RETURN 'iPad Air'; END IF;
    IF n ~* '^ipad\s+mini' THEN RETURN 'iPad mini'; END IF;
    RETURN 'iPad';
  END IF;
  IF n ~* '^macbook' THEN
    IF n ~* '^macbook\s+pro' THEN RETURN 'MacBook Pro'; END IF;
    IF n ~* '^macbook\s+air' THEN RETURN 'MacBook Air'; END IF;
    RETURN 'MacBook';
  END IF;
  IF n ~* '^apple\s+watch' THEN
    IF n ~* '^apple\s+watch\s+ultra' THEN RETURN 'Apple Watch Ultra'; END IF;
    IF n ~* '^apple\s+watch\s+se' THEN RETURN 'Apple Watch SE'; END IF;
    RETURN 'Apple Watch Series';
  END IF;

  -- Samsung (også uden "Galaxy" foran)
  IF b = 'samsung' OR n ~* '^(samsung\s+)?galaxy' THEN
    IF n ~* 'z\s*(fold|flip)' THEN RETURN 'Z-serien'; END IF;
    IF n ~* 'galaxy\s+tab|^tab\s' THEN RETURN 'Tab-serien'; END IF;
    IF n ~* 'xcover' THEN RETURN 'XCover-serien'; END IF;
    IF n ~* 'galaxy\s+watch' THEN RETURN 'Watch-serien'; END IF;
    IF n ~* 'galaxy\s+note|^note\s*\d' THEN RETURN 'Note-serien'; END IF;
    IF n ~* '(galaxy\s+|^)s\d' THEN RETURN 'S-serien'; END IF;
    IF n ~* '(galaxy\s+|^)a\d' THEN RETURN 'A-serien'; END IF;
    IF n ~* '(galaxy\s+|^)m\d' THEN RETURN 'M-serien'; END IF;
    RETURN NULL;
  END IF;

  -- Google Pixel
  IF n ~* '^(google\s+)?pixel' THEN
    IF n ~* 'pixel\s+fold' THEN RETURN 'Pixel Fold'; END IF;
    m := regexp_match(n, 'pixel\s+(\d+)', 'i');
    IF m IS NOT NULL THEN RETURN 'Pixel ' || m[1]; END IF;
    RETURN 'Pixel';
  END IF;

  RETURN NULL;
END;
$$;

-- ------------------------------------------------------------
-- Kolonner på repair_services
-- ------------------------------------------------------------
ALTER TABLE public.repair_services
  ADD COLUMN IF NOT EXISTS part_category_id uuid REFERENCES public.spare_part_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS part_mode text NOT NULL DEFAULT 'manual';

ALTER TABLE public.repair_services DROP CONSTRAINT IF EXISTS repair_services_part_mode_check;
ALTER TABLE public.repair_services ADD CONSTRAINT repair_services_part_mode_check
  CHECK (part_mode IN ('part', 'none', 'manual'));

CREATE INDEX IF NOT EXISTS idx_repair_services_part_category
  ON public.repair_services (part_category_id) WHERE part_category_id IS NOT NULL;

-- ------------------------------------------------------------
-- repair_part_tier_rules
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.repair_part_tier_rules (
  part_category_id uuid NOT NULL REFERENCES public.spare_part_categories(id) ON DELETE CASCADE,
  repair_quality text NOT NULL CHECK (repair_quality IN ('standard', 'premium', 'original')),
  spare_quality_tier_id uuid NOT NULL REFERENCES public.spare_part_quality_tiers(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (part_category_id, repair_quality)
);
ALTER TABLE public.repair_part_tier_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.repair_part_tier_rules FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.repair_part_tier_rules TO service_role;

DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(s, ', ') INTO missing FROM (
    SELECT 'kategori ' || x AS s FROM unnest(ARRAY['skaerme', 'batterier']) x
      WHERE NOT EXISTS (SELECT 1 FROM public.spare_part_categories WHERE slug = x)
    UNION ALL
    SELECT 'trin ' || x FROM unnest(ARRAY['standard-incell', 'premium-soft-oled', 'oem-equivalent', 'service-pack']) x
      WHERE NOT EXISTS (SELECT 1 FROM public.spare_part_quality_tiers WHERE slug = x)
  ) q;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'repair_part_tier_rules: mangler % i reservedelskataloget', missing;
  END IF;
END $$;

-- Skærm: incell / soft OLED / service pack. Alt andet: OEM / OEM / service pack.
INSERT INTO public.repair_part_tier_rules (part_category_id, repair_quality, spare_quality_tier_id)
SELECT c.id, q.quality, t.id
FROM public.spare_part_categories c
CROSS JOIN (VALUES ('standard'), ('premium'), ('original')) AS q(quality)
JOIN public.spare_part_quality_tiers t ON t.slug = CASE
  WHEN c.slug = 'skaerme' AND q.quality = 'standard' THEN 'standard-incell'
  WHEN c.slug = 'skaerme' AND q.quality = 'premium' THEN 'premium-soft-oled'
  WHEN q.quality = 'original' THEN 'service-pack'
  ELSE 'oem-equivalent'
END
ON CONFLICT (part_category_id, repair_quality) DO NOTHING;

-- ------------------------------------------------------------
-- Kategorinavne: ét sæt
-- ------------------------------------------------------------
-- (a) Skærm og batteri tvinges til hjemmesidens navne.
UPDATE public.repair_services
SET service_category = 'Skærmskift'
WHERE service_category IS NOT NULL
  AND service_category <> 'Skærmskift'
  AND public.repair_norm(service_category) IN ('skaerm', 'skaerme', 'skaermskift', 'skaermudskiftning', 'skaermreparation');

UPDATE public.repair_services
SET service_category = 'Batteriskift'
WHERE service_category IS NOT NULL
  AND service_category <> 'Batteriskift'
  AND public.repair_norm(service_category) IN ('batteri', 'batterier', 'batteriskift', 'batteriudskiftning');

-- (b) Øvrige kategorier der findes i flere stavemåder slås sammen til den bedste.
WITH spellings AS (
  SELECT service_category AS cat,
         regexp_replace(public.repair_norm(service_category), '(skift|udskiftning|reparation)$', '') AS grp,
         count(*) AS n
  FROM public.repair_services
  WHERE service_category IS NOT NULL AND btrim(service_category) <> ''
  GROUP BY service_category
), multi AS (
  SELECT grp FROM spellings GROUP BY grp HAVING count(*) > 1
), ranked AS (
  SELECT s.cat, s.grp,
         first_value(s.cat) OVER (
           PARTITION BY s.grp
           ORDER BY (public.repair_norm(s.cat) LIKE '%skift') DESC, s.n DESC, s.cat
         ) AS canonical
  FROM spellings s JOIN multi m ON m.grp = s.grp
)
UPDATE public.repair_services rs
SET service_category = r.canonical
FROM ranked r
WHERE rs.service_category = r.cat AND r.cat <> r.canonical;

-- ------------------------------------------------------------
-- Baggrundsfyld part_category_id og part_mode (kun urørte rækker)
-- ------------------------------------------------------------
WITH hints AS (
  SELECT rs.id, h.part_mode AS mode, c.id AS cat_id
  FROM public.repair_services rs
  CROSS JOIN LATERAL public.repair_category_hint(coalesce(nullif(btrim(rs.service_category), ''), rs.name)) h
  LEFT JOIN public.spare_part_categories c ON c.slug = h.part_slug
  WHERE rs.part_mode = 'manual' AND rs.part_category_id IS NULL
)
UPDATE public.repair_services rs
SET part_mode = h.mode,
    part_category_id = h.cat_id
FROM hints h
WHERE h.id = rs.id
  AND (h.mode = 'none' OR (h.mode = 'part' AND h.cat_id IS NOT NULL));

-- Nye reparationer får samme udledning (kun når intet er valgt).
CREATE OR REPLACE FUNCTION public.repair_services_derive_part() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE h record; v_cat uuid;
BEGIN
  IF NEW.part_mode = 'manual' AND NEW.part_category_id IS NULL THEN
    SELECT * INTO h FROM public.repair_category_hint(coalesce(nullif(btrim(NEW.service_category), ''), NEW.name));
    IF h.part_mode = 'none' THEN
      NEW.part_mode := 'none';
    ELSIF h.part_mode = 'part' THEN
      SELECT id INTO v_cat FROM public.spare_part_categories WHERE slug = h.part_slug;
      IF v_cat IS NOT NULL THEN NEW.part_mode := 'part'; NEW.part_category_id := v_cat; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_repair_services_derive_part ON public.repair_services;
CREATE TRIGGER trg_repair_services_derive_part BEFORE INSERT ON public.repair_services
  FOR EACH ROW EXECUTE FUNCTION public.repair_services_derive_part();

-- ------------------------------------------------------------
-- Serier
-- ------------------------------------------------------------
UPDATE public.repair_models m
SET series = public.repair_series_for(b.slug, m.name)
FROM public.repair_brands b
WHERE b.id = m.brand_id
  AND (m.series IS NULL OR btrim(m.series) = '')
  AND public.repair_series_for(b.slug, m.name) IS NOT NULL;

CREATE OR REPLACE FUNCTION public.repair_models_set_series() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.series IS NULL OR btrim(NEW.series) = '' THEN
    NEW.series := public.repair_series_for((SELECT slug FROM public.repair_brands WHERE id = NEW.brand_id), NEW.name);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_repair_models_set_series ON public.repair_models;
CREATE TRIGGER trg_repair_models_set_series BEFORE INSERT OR UPDATE OF name, brand_id ON public.repair_models
  FOR EACH ROW EXECUTE FUNCTION public.repair_models_set_series();

COMMIT;

-- Verifikation (forventet resultat i kommentar):
--   SELECT part_mode, count(*) FROM repair_services GROUP BY 1;          -- part / none / manual; manual = uafklarede kategorier
--   SELECT service_category, part_mode, count(*) FROM repair_services
--     WHERE part_mode = 'manual' GROUP BY 1, 2 ORDER BY 3 DESC;           -- gennemgå: kategorier der skal mappes i hånden
--   SELECT service_category, count(*) FROM repair_services GROUP BY 1 ORDER BY 2 DESC;
--                                                                         -- "Skærmskift" og "Batteriskift" findes, "Skaerm"/"Batteri" er væk
--   SELECT c.slug, r.repair_quality, t.slug FROM repair_part_tier_rules r
--     JOIN spare_part_categories c ON c.id = r.part_category_id
--     JOIN spare_part_quality_tiers t ON t.id = r.spare_quality_tier_id
--    WHERE c.slug IN ('skaerme', 'batterier') ORDER BY 1, 2;             -- 6 rækker som i spec'ens tabel
--   SELECT count(*) FILTER (WHERE series IS NULL OR btrim(series) = '') AS uden_serie, count(*) FROM repair_models;
--   SELECT public.repair_series_for('iphone', 'iPhone 15 Pro Max');       -- 'iPhone 15'
--   SELECT public.repair_series_for('samsung', 'Galaxy S24 Ultra');        -- 'S-serien'
