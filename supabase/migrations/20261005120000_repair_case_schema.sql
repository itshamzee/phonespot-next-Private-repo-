-- Ny sag, B3 del 1: skema for sager og sagslinjer.
-- Kør EFTER 20261005110000_repair_parts_stock.sql og FØR 20261005130000_repair_case_functions.sql.
--
-- Hvad den gør:
--   1. customers: ean (13 cifre), invoice_email, contact_person, cvr_lookup (cache af CVR-opslag),
--      indeks på cvr (ikke unikt).
--   2. repair_tickets: location_id (baggrundsfyldt fra locations.slug = store_id, holdt
--      synkront af en trigger), repair_model_id, billing_snapshot, og status 'annulleret'.
--      Statusconstraintens eksisterende værdier læses dynamisk og bevares.
--   3. repair_ticket_items: sagens linjer (reparation, del, enhed, produkt, fritekst) med
--      lagerstatus, kostprissnapshot og kobling til kassens ordrelinje. RLS slået til uden
--      policies (kun service_role).
--   4. devices.reservation_ticket_id (+ clear_device_reservation nulstiller den).
--   5. repair_case_requests: idempotensnøgler til POST /api/admin/repairs.
--
-- Antagelser om live-skemaet (verificér før kørsel):
--   * repair_tickets.status har en CHECK i formen "status = ANY (ARRAY[...])" (eller ingen).
--     Er den anderledes, stopper migrationen med en forklarende fejl.
--     Er status en enum-type, stopper den også (ALTER TYPE kan ikke blandes ind her).
--   * locations.slug findes (20261003100000); devices.reservation_* findes (20260916180000).
--   * Der findes en trigger der giver repair_tickets.ticket_number (20260310_mega_upgrade.sql).
--
-- Idempotent og transaktionel.

BEGIN;

-- ------------------------------------------------------------
-- customers
-- ------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS ean text,
  ADD COLUMN IF NOT EXISTS invoice_email text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS cvr_lookup jsonb,
  ADD COLUMN IF NOT EXISTS cvr_lookup_at timestamptz;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_ean_check;
ALTER TABLE public.customers ADD CONSTRAINT customers_ean_check
  CHECK (ean IS NULL OR ean ~ '^[0-9]{13}$') NOT VALID;   -- gamle rækker har ingen ean; nye valideres

CREATE INDEX IF NOT EXISTS customers_cvr_idx ON public.customers (cvr) WHERE cvr IS NOT NULL;

-- ------------------------------------------------------------
-- repair_tickets: nye kolonner
-- ------------------------------------------------------------
ALTER TABLE public.repair_tickets
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id),
  ADD COLUMN IF NOT EXISTS repair_model_id uuid REFERENCES public.repair_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_snapshot jsonb,
  -- Enhedens adgangskode. Aldrig i noter, lister, PDF, SMS eller mail; kun sagssiden for personale.
  -- Ryddes når sagen bliver afhentet eller annulleret.
  ADD COLUMN IF NOT EXISTS device_passcode text;

CREATE INDEX IF NOT EXISTS repair_tickets_location_idx ON public.repair_tickets (location_id) WHERE location_id IS NOT NULL;

UPDATE public.repair_tickets t
   SET location_id = l.id
  FROM public.locations l
 WHERE t.location_id IS NULL AND t.store_id IS NOT NULL AND l.slug = t.store_id;

-- store_id (tekst) og location_id (uuid) holdes synkrone. Den der ændres vinder.
CREATE OR REPLACE FUNCTION public.repair_tickets_sync_location() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE v_slug text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.store_id IS NOT NULL THEN
      NEW.location_id := (SELECT id FROM public.locations WHERE slug = NEW.store_id);
    ELSIF NEW.location_id IS NOT NULL THEN
      SELECT slug INTO v_slug FROM public.locations WHERE id = NEW.location_id;
      IF v_slug IN ('vejle', 'slagelse') THEN NEW.store_id := v_slug; END IF;
    END IF;
  ELSE
    IF NEW.store_id IS DISTINCT FROM OLD.store_id THEN
      NEW.location_id := (SELECT id FROM public.locations WHERE slug = NEW.store_id);
    ELSIF NEW.location_id IS DISTINCT FROM OLD.location_id THEN
      SELECT slug INTO v_slug FROM public.locations WHERE id = NEW.location_id;
      NEW.store_id := CASE WHEN v_slug IN ('vejle', 'slagelse') THEN v_slug ELSE NULL END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_repair_tickets_sync_location ON public.repair_tickets;
CREATE TRIGGER trg_repair_tickets_sync_location
  BEFORE INSERT OR UPDATE OF store_id, location_id ON public.repair_tickets
  FOR EACH ROW EXECUTE FUNCTION public.repair_tickets_sync_location();

-- ------------------------------------------------------------
-- repair_tickets.status: tilføj 'annulleret', bevar alle eksisterende værdier
-- ------------------------------------------------------------
DO $$
DECLARE c record; v_vals text[] := '{}'; v_found text[]; v_type text;
BEGIN
  SELECT t.typtype::text INTO v_type
    FROM pg_attribute a JOIN pg_type t ON t.oid = a.atttypid
   WHERE a.attrelid = 'public.repair_tickets'::regclass AND a.attname = 'status' AND NOT a.attisdropped;
  IF v_type = 'e' THEN
    RAISE EXCEPTION 'repair_tickets.status er en enum-type. Tilføj ''annulleret'' med ALTER TYPE ... ADD VALUE uden for en transaktion og kør migrationen igen.';
  END IF;

  FOR c IN
    SELECT oid, conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
    WHERE conrelid = 'public.repair_tickets'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    IF c.def ~ '^CHECK \(+\(?status\)?(::text)? = ANY' THEN
      SELECT array_agg(x[1]) INTO v_found FROM regexp_matches(c.def, '''([^'']+)''', 'g') AS x;
      v_vals := v_vals || coalesce(v_found, '{}');
    ELSIF c.def ILIKE '%''modtaget''%' THEN
      RAISE EXCEPTION 'repair_tickets: ukendt status-constraint % (%). Ret migrationen i hånden.', c.conname, c.def;
    END IF;
  END LOOP;
  IF cardinality(v_vals) = 0 THEN RETURN; END IF;   -- ingen status-constraint i prod: intet at ændre
  SELECT array_agg(DISTINCT v ORDER BY v) INTO v_vals FROM unnest(v_vals || ARRAY['annulleret']) v;

  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.repair_tickets'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ~ '^CHECK \(+\(?status\)?(::text)? = ANY'
  LOOP
    EXECUTE format('ALTER TABLE public.repair_tickets DROP CONSTRAINT %I', c.conname);
  END LOOP;
  EXECUTE format(
    'ALTER TABLE public.repair_tickets ADD CONSTRAINT repair_tickets_status_check CHECK (status IN (%s))',
    (SELECT string_agg(quote_literal(v), ', ' ORDER BY v) FROM unnest(v_vals) v));
END $$;

-- ------------------------------------------------------------
-- repair_ticket_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.repair_ticket_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.repair_tickets(id) ON DELETE RESTRICT,
  parent_item_id uuid REFERENCES public.repair_ticket_items(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('repair', 'part', 'device', 'product', 'free_text')),
  repair_service_id uuid REFERENCES public.repair_services(id) ON DELETE SET NULL,
  sku_product_id uuid REFERENCES public.sku_products(id) ON DELETE RESTRICT,
  device_id uuid REFERENCES public.devices(id) ON DELETE RESTRICT,
  description text NOT NULL CHECK (length(btrim(description)) > 0),
  quality_label text,
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  list_price_oere integer NOT NULL DEFAULT 0 CHECK (list_price_oere >= 0),
  unit_price_oere integer NOT NULL DEFAULT 0 CHECK (unit_price_oere >= 0),
  price_reason text,
  cost_oere integer CHECK (cost_oere IS NULL OR cost_oere >= 0),
  location_id uuid REFERENCES public.locations(id),
  stock_status text NOT NULL DEFAULT 'none'
    CHECK (stock_status IN ('none', 'planned', 'reserved', 'backorder', 'consumed', 'released', 'sold')),
  reserved_at timestamptz,
  consumed_at timestamptz,
  released_at timestamptz,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT repair_ticket_items_ref_check CHECK (
    (kind = 'repair'    AND repair_service_id IS NOT NULL AND sku_product_id IS NULL AND device_id IS NULL) OR
    (kind = 'part'      AND sku_product_id IS NOT NULL AND parent_item_id IS NOT NULL AND device_id IS NULL) OR
    (kind = 'device'    AND device_id IS NOT NULL AND sku_product_id IS NULL AND repair_service_id IS NULL) OR
    (kind = 'product'   AND sku_product_id IS NOT NULL AND device_id IS NULL AND repair_service_id IS NULL) OR
    (kind = 'free_text' AND sku_product_id IS NULL AND device_id IS NULL AND repair_service_id IS NULL)
  ),
  -- En afvigelse fra listeprisen kræver en begrundelse.
  CONSTRAINT repair_ticket_items_price_reason_check CHECK (
    unit_price_oere = list_price_oere OR length(btrim(coalesce(price_reason, ''))) > 0
  )
);

CREATE INDEX IF NOT EXISTS repair_ticket_items_ticket ON public.repair_ticket_items (ticket_id);
CREATE INDEX IF NOT EXISTS repair_ticket_items_parent ON public.repair_ticket_items (parent_item_id) WHERE parent_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS repair_ticket_items_sku_open
  ON public.repair_ticket_items (sku_product_id, location_id)
  WHERE sku_product_id IS NOT NULL AND stock_status IN ('reserved', 'backorder');
CREATE INDEX IF NOT EXISTS repair_ticket_items_device ON public.repair_ticket_items (device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS repair_ticket_items_order_item ON public.repair_ticket_items (order_item_id) WHERE order_item_id IS NOT NULL;

ALTER TABLE public.repair_ticket_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.repair_ticket_items FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.repair_ticket_items TO service_role;

-- ------------------------------------------------------------
-- devices.reservation_ticket_id
-- ------------------------------------------------------------
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS reservation_ticket_id uuid REFERENCES public.repair_tickets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS devices_reservation_ticket ON public.devices (reservation_ticket_id) WHERE reservation_ticket_id IS NOT NULL;

-- Som i 20260916180000, plus den nye kolonne: forlader en enhed 'reserved', nulstilles al reservationsinfo.
CREATE OR REPLACE FUNCTION public.clear_device_reservation() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.status <> 'reserved' THEN
    NEW.reservation_owner_hash := NULL;
    NEW.reservation_id := NULL;
    NEW.reservation_order_id := NULL;
    NEW.reservation_expires_at := NULL;
    NEW.reservation_ticket_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- Idempotensnøgler til oprettelse af sag
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.repair_case_requests (
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  idem_key text NOT NULL CHECK (length(idem_key) BETWEEN 8 AND 100),
  request_hash text NOT NULL,
  ticket_id uuid REFERENCES public.repair_tickets(id) ON DELETE SET NULL,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (staff_id, idem_key)
);
CREATE INDEX IF NOT EXISTS repair_case_requests_created ON public.repair_case_requests (created_at);
ALTER TABLE public.repair_case_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.repair_case_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.repair_case_requests TO service_role;

REVOKE ALL ON FUNCTION public.repair_tickets_sync_location() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_device_reservation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_device_reservation() TO service_role;

COMMIT;

-- Verifikation (forventet resultat i kommentar):
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--     WHERE conrelid = 'public.repair_tickets'::regclass AND conname = 'repair_tickets_status_check';
--                                          -- alle gamle værdier (modtaget ... afhentet, bero, reklamation_*) + 'annulleret'
--   SELECT count(*) FILTER (WHERE location_id IS NULL AND store_id IS NOT NULL) FROM repair_tickets;   -- 0
--   SELECT count(*) FROM repair_tickets t JOIN locations l ON l.id = t.location_id WHERE l.slug <> t.store_id;   -- 0
--   SELECT count(*) FROM information_schema.columns WHERE table_name = 'customers'
--     AND column_name IN ('ean', 'invoice_email', 'contact_person');   -- 3
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'public.repair_ticket_items'::regclass;   -- true
--   SELECT count(*) FROM pg_policies WHERE tablename = 'repair_ticket_items';                 -- 0
