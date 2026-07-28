-- =====================================================================
--  OPKØB-AUTOMATISERING — HELE OPSÆTNINGEN
--  Kør hele denne fil i Supabase SQL-editoren.
--  Alt er idempotent: den kan køres igen uden skade.
--
--  Indtil den er kørt, opfører systemet sig præcis som før:
--  de nye tabeller findes ikke, panelerne skjuler sig selv, og
--  automatikken kan alligevel ikke tændes (den er slået fra som
--  udgangspunkt og kræver en godkendt test af afsenderen).
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

-- Kun personale. B2B-grossistkunder har rigtige Supabase-konti, og flere af dem
-- er forhandlere: denne tabel ER vores indkøbsstrategi. Motoren læser den med
-- service-rollen, som går uden om RLS.
ALTER TABLE public.buyback_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.buyback_prices;
DROP POLICY IF EXISTS "Staff can manage buyback prices" ON public.buyback_prices;
CREATE POLICY "Staff can manage buyback prices" ON public.buyback_prices
  FOR ALL TO authenticated USING (is_staff()) WITH CHECK (is_staff());


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

-- Kun personale — loggen indeholder kundenavne og hvad vi har budt.
ALTER TABLE public.buyback_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.buyback_events;
DROP POLICY IF EXISTS "Staff can read buyback events" ON public.buyback_events;
CREATE POLICY "Staff can read buyback events" ON public.buyback_events
  FOR SELECT TO authenticated USING (is_staff());


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
-- 4. Afvisninger
--    Giver afvisninger deres eget hjem i stedet for at fylde
--    contact_inquiries med opkøbs-kolonner.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS buyback_declines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id  uuid NOT NULL REFERENCES contact_inquiries(id) ON DELETE CASCADE,
  reason_code text NOT NULL,
  note        text,
  email_sent  boolean NOT NULL DEFAULT false,
  declined_at timestamptz NOT NULL DEFAULT now(),
  declined_by text
);

-- En lead afvises én gang. Det unikke indeks er det, der gør routen idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_buyback_declines_inquiry
  ON buyback_declines (inquiry_id);

ALTER TABLE public.buyback_declines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read buyback declines" ON public.buyback_declines;
CREATE POLICY "Staff can read buyback declines" ON public.buyback_declines
  FOR SELECT TO authenticated USING (is_staff());


-- ---------------------------------------------------------------------
-- 5. Automatik-kolonner på tilbud
--    Hold-vinduet lever her: scheduled_send_at og resend_email_id er
--    det, der gør det muligt at aflyse et bud inden det sendes.
-- ---------------------------------------------------------------------

ALTER TABLE trade_in_offers
  ADD COLUMN IF NOT EXISTS auto_sent         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS resend_email_id   text,
  ADD COLUMN IF NOT EXISTS send_state        text NOT NULL DEFAULT 'sent';

UPDATE trade_in_offers SET send_state = 'sent' WHERE send_state IS NULL;

CREATE INDEX IF NOT EXISTS idx_trade_in_offers_scheduled
  ON trade_in_offers (scheduled_send_at)
  WHERE send_state = 'scheduled';


-- ---------------------------------------------------------------------
-- 6. Kontrol — kør disse til sidst. Alle skal svare uden fejl.
-- ---------------------------------------------------------------------

-- select count(*) as buyback_prices_ok   from buyback_prices;
-- select count(*) as buyback_events_ok   from buyback_events;
-- select count(*) as buyback_declines_ok from buyback_declines;
-- select column_name from information_schema.columns
--   where table_name = 'trade_in_offers'
--     and column_name in ('auto_sent','pricing_breakdown','scheduled_send_at','resend_email_id','send_state');
-- select tablename, policyname from pg_policies
--   where tablename in ('buyback_prices','buyback_events','buyback_declines');
