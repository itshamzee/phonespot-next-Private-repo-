-- =====================================================================
--  OPKØB-AUTOMATISERING — PLAN 1
--  Kør hele denne fil i Supabase SQL-editoren.
--  Alt er idempotent: den kan køres igen uden skade.
--
--  Indtil den er kørt, opfører systemet sig præcis som før:
--  fallback-priser og hændelsesloggen er der bare ikke, og
--  aktivitets-panelet i /admin/opkoeb skjuler sig selv.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Fallback-basispriser
--    Bruges KUN når vi ikke selv har modellen til salg (ingen listet
--    enhed og ingen base_price_a på skabelonen). Priser i ØRE.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS buyback_prices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type text NOT NULL,
  brand       text NOT NULL,
  model       text NOT NULL,
  storage     text,
  ram         text,
  base_price  integer NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_buyback_prices_variant
  ON buyback_prices (
    lower(trim(device_type)),
    lower(trim(brand)),
    lower(trim(model)),
    lower(trim(coalesce(storage, ''))),
    lower(trim(coalesce(ram, '')))
  );

CREATE INDEX IF NOT EXISTS idx_buyback_prices_lookup
  ON buyback_prices (lower(trim(brand)), lower(trim(model)))
  WHERE active;

ALTER TABLE public.buyback_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.buyback_prices;
CREATE POLICY "Allow all for authenticated users" ON public.buyback_prices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------
-- 2. Hændelseslog
--    Ét sted hvor alt hvad systemet gør står i rækkefølge. Føder
--    aktivitets-panelet nu, og SMS-alarmer + morgenmail i Plan 3.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS buyback_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid REFERENCES contact_inquiries(id) ON DELETE SET NULL,
  offer_id   uuid REFERENCES trade_in_offers(id) ON DELETE SET NULL,
  type       text NOT NULL,
  severity   text NOT NULL DEFAULT 'info',
  summary    text NOT NULL,
  detail     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyback_events_created_at
  ON buyback_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buyback_events_inquiry
  ON buyback_events (inquiry_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buyback_events_severity
  ON buyback_events (severity, created_at DESC)
  WHERE severity <> 'info';

ALTER TABLE public.buyback_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.buyback_events;
CREATE POLICY "Allow all for authenticated users" ON public.buyback_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------
-- 3. Indeks på reservedelskataloget
--    Fra juni-planen, aldrig kørt. Holder pris-opslagene hurtige.
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_foneday_catalog_model_codes
  ON foneday_catalog USING GIN (model_codes);

CREATE INDEX IF NOT EXISTS idx_foneday_catalog_in_stock
  ON foneday_catalog (in_stock);

-- Opslaget slår modeller op på suitable_for, ikke model_codes.
CREATE INDEX IF NOT EXISTS idx_foneday_catalog_category
  ON foneday_catalog (category)
  WHERE in_stock;


-- ---------------------------------------------------------------------
-- 4. Kontrol — kør denne til sidst. Alle fire linjer skal give rækker.
-- ---------------------------------------------------------------------

-- select count(*) as buyback_prices_ok from buyback_prices;
-- select count(*) as buyback_events_ok from buyback_events;
-- select indexname from pg_indexes where tablename = 'foneday_catalog';
-- select tablename, policyname from pg_policies where tablename in ('buyback_prices','buyback_events');
