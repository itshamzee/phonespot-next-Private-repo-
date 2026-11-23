-- D2: Opkøb i butikken — skema, låse og serveradgang for slutsedler.
--
-- Additiv: nye kolonner er nullable eller har en default, eksisterende flows
-- (webshop-checkout, kasse, retur, overførsler, opkøb fra hjemmesiden) ændrer
-- ikke de felter, der låses her.
--
-- Låse:
--  * trade_in_receipts_guard: en seddel, der ikke er kladde, kan ikke slettes, og
--    kun betalings-, bilags-, modregnings-, mistanke- og annulleringsfelter kan
--    ændres. ID-felterne må kun tømmes sammen med id_purged_at.
--  * trade_in_receipt_items_guard: varelinjer på en seddel, der ikke er kladde,
--    kan ikke ændres, slettes eller tilføjes.
--  * devices_purchase_guard: en solgt/afsendt/afhentet enhed kan ikke slettes, og
--    IMEI, serienummer, indkøbspris og momsordning kan ikke ændres. Ellers logges
--    ændringer af de fire felter i device_changes. En spærret enhed kan ikke være
--    listed/reserved/sold.
--
-- Adgang: slutseddel-tabellerne har RLS uden politikker, så kun service-rollen
-- (og SECURITY DEFINER-funktioner) kan læse og skrive.

BEGIN;

-- Vent ikke længe på tabel-låse i prod; fejl hellere og kør igen.
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
  IF (SELECT count(*) FROM public.trade_in_receipts) > 0 THEN
    RAISE EXCEPTION 'trade_in_receipts har rækker — legal_entity_id/location_id skal udfyldes, før migrationen køres';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Juridiske enheder: adresse og præfiks til slutseddelnumre
-- ---------------------------------------------------------------------------
ALTER TABLE public.legal_entities
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS receipt_prefix text;

UPDATE public.legal_entities SET address = 'Løversysselvej 3C, 7100 Vejle', receipt_prefix = 'SS'
 WHERE cvr = '46079019';
UPDATE public.legal_entities SET address = NULL, receipt_prefix = 'SP'
 WHERE cvr = '38688766';

-- ---------------------------------------------------------------------------
-- Slutsedler
-- ---------------------------------------------------------------------------
ALTER TABLE public.trade_in_receipts
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id),
  ADD COLUMN IF NOT EXISTS legal_entity_id uuid REFERENCES public.legal_entities(id),
  ADD COLUMN IF NOT EXISTS seller_type text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS seller_cvr text,
  ADD COLUMN IF NOT EXISTS invoice_type text,
  ADD COLUMN IF NOT EXISTS seller_age_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lock_checks_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lock_checks_by uuid,
  ADD COLUMN IF NOT EXISTS lock_checks_at timestamptz,
  ADD COLUMN IF NOT EXISTS id_type text,
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS id_expiry date,
  ADD COLUMN IF NOT EXISTS id_checked_by uuid,
  ADD COLUMN IF NOT EXISTS id_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS id_purged_at timestamptz,
  ADD COLUMN IF NOT EXISTS attestation text NOT NULL DEFAULT 'paper_scan',
  ADD COLUMN IF NOT EXISTS signed_scan_path text,
  ADD COLUMN IF NOT EXISTS invoice_file_path text,
  ADD COLUMN IF NOT EXISTS payout_proof_path text,
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS account_owner_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offset_order_id uuid REFERENCES public.orders(id),
  ADD COLUMN IF NOT EXISTS offset_amount integer,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS paid_by uuid,
  ADD COLUMN IF NOT EXISTS suspected_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspected_by uuid,
  ADD COLUMN IF NOT EXISTS suspicion_note text,
  ADD COLUMN IF NOT EXISTS police_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS void_reason text;

ALTER TABLE public.trade_in_receipts DROP CONSTRAINT IF EXISTS trade_in_receipts_seller_type_check;
ALTER TABLE public.trade_in_receipts ADD CONSTRAINT trade_in_receipts_seller_type_check
  CHECK (seller_type IN ('private', 'business'));
ALTER TABLE public.trade_in_receipts DROP CONSTRAINT IF EXISTS trade_in_receipts_invoice_type_check;
ALTER TABLE public.trade_in_receipts ADD CONSTRAINT trade_in_receipts_invoice_type_check
  CHECK (invoice_type IN ('med_moms', 'brugtmoms', 'eu_normal'));
ALTER TABLE public.trade_in_receipts DROP CONSTRAINT IF EXISTS trade_in_receipts_attestation_check;
ALTER TABLE public.trade_in_receipts ADD CONSTRAINT trade_in_receipts_attestation_check
  CHECK (attestation IN ('paper_scan', 'online_accept'));
ALTER TABLE public.trade_in_receipts DROP CONSTRAINT IF EXISTS trade_in_receipts_payout_method_check;
ALTER TABLE public.trade_in_receipts ADD CONSTRAINT trade_in_receipts_payout_method_check
  CHECK (payout_method IN ('bank', 'modregning'));

-- Kladder har intet nummer endnu. Den unikke nøgle beholdes, og defaulten
-- (generate_receipt_number) beholdes, fordi den nuværende hjemmeside-rute
-- (POST /api/trade-in/receipts) bruger den.
ALTER TABLE public.trade_in_receipts ALTER COLUMN receipt_number DROP NOT NULL;

ALTER TABLE public.trade_in_receipts DROP CONSTRAINT IF EXISTS trade_in_receipts_status_check;
ALTER TABLE public.trade_in_receipts ADD CONSTRAINT trade_in_receipts_status_check
  CHECK (status IN ('draft', 'confirmed', 'paid', 'completed', 'voided'));

-- ---------------------------------------------------------------------------
-- Varelinjer
-- ---------------------------------------------------------------------------
ALTER TABLE public.trade_in_receipt_items
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.product_templates(id),
  ADD COLUMN IF NOT EXISTS battery_health integer,
  ADD COLUMN IF NOT EXISTS suggested_price integer,
  ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES public.devices(id);

ALTER TABLE public.trade_in_receipt_items DROP CONSTRAINT IF EXISTS trade_in_receipt_items_battery_health_check;
ALTER TABLE public.trade_in_receipt_items ADD CONSTRAINT trade_in_receipt_items_battery_health_check
  CHECK (battery_health BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS trade_in_receipt_items_device_id_idx ON public.trade_in_receipt_items (device_id);

-- ---------------------------------------------------------------------------
-- Enheder, ordrelinjer, indkøbsbilag, lagerbevægelser
-- ---------------------------------------------------------------------------
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS imei text;

ALTER TABLE public.purchase_documents
  ADD COLUMN IF NOT EXISTS trade_in_receipt_id uuid REFERENCES public.trade_in_receipts(id);
CREATE INDEX IF NOT EXISTS purchase_documents_trade_in_receipt_id_idx
  ON public.purchase_documents (trade_in_receipt_id);

ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reason_check;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_reason_check
  CHECK (reason IN ('adjust', 'receive', 'repair', 'return', 'sale', 'transfer', 'purchase'));

-- ---------------------------------------------------------------------------
-- Nye tabeller
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.slutseddel_counters (
  legal_entity_id uuid NOT NULL REFERENCES public.legal_entities(id),
  year int NOT NULL,
  last_number int NOT NULL DEFAULT 0,
  PRIMARY KEY (legal_entity_id, year)
);

-- Ingen fremmednøgle til devices: historikken skal overleve, hvis en
-- intake-enhed slettes.
CREATE TABLE IF NOT EXISTS public.device_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  field text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS device_changes_device_id_idx ON public.device_changes (device_id, changed_at);

-- ---------------------------------------------------------------------------
-- "Andet"-skabeloner til opkøb af modeller uden egen skabelon
-- ---------------------------------------------------------------------------
INSERT INTO public.product_templates (brand, model, category, display_name, slug, status)
VALUES
  ('Andet', 'Andet (telefon)',  'smartphone', 'Andet (telefon)',  'andet-telefon',  'draft'),
  ('Andet', 'Andet (tablet)',   'tablet',     'Andet (tablet)',   'andet-tablet',   'draft'),
  ('Andet', 'Andet (computer)', 'laptop',     'Andet (computer)', 'andet-computer', 'draft'),
  ('Andet', 'Andet (ur)',       'smartwatch', 'Andet (ur)',       'andet-ur',       'draft')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Lås: slutsedler
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trade_in_receipts_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  -- Felter, der må ændres, efter sedlen er bekræftet. ID-felterne behandles for sig.
  v_mutable constant text[] := ARRAY[
    'status', 'paid_at', 'paid_by', 'payout_method', 'payout_proof_path',
    'account_owner_confirmed', 'signed_scan_path', 'invoice_file_path',
    'offset_order_id', 'offset_amount', 'suspected_at', 'suspected_by',
    'suspicion_note', 'police_notified_at', 'voided_at', 'voided_by', 'void_reason',
    'updated_at', 'id_type', 'id_number', 'id_expiry', 'id_purged_at'
  ];
BEGIN
  -- En kladde må alt (Task 3's bekræftelse skriver nummer, køber og enheder og
  -- flipper status i samme transaktion).
  IF OLD.status = 'draft' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'receipt_locked';
  END IF;

  IF (to_jsonb(NEW) - v_mutable) IS DISTINCT FROM (to_jsonb(OLD) - v_mutable) THEN
    RAISE EXCEPTION 'receipt_locked';
  END IF;

  -- ID-oplysninger må kun slettes (alle tre til NULL), og kun sammen med id_purged_at.
  IF ROW(NEW.id_type, NEW.id_number, NEW.id_expiry, NEW.id_purged_at)
     IS DISTINCT FROM ROW(OLD.id_type, OLD.id_number, OLD.id_expiry, OLD.id_purged_at) THEN
    IF OLD.id_purged_at IS NOT NULL OR NEW.id_purged_at IS NULL
       OR NEW.id_type IS NOT NULL OR NEW.id_number IS NOT NULL OR NEW.id_expiry IS NOT NULL THEN
      RAISE EXCEPTION 'receipt_locked';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND (OLD.status, NEW.status) NOT IN (('confirmed', 'paid'), ('confirmed', 'voided'), ('paid', 'completed')) THEN
    RAISE EXCEPTION 'receipt_locked';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trade_in_receipts_guard ON public.trade_in_receipts;
CREATE TRIGGER trade_in_receipts_guard
  BEFORE UPDATE OR DELETE ON public.trade_in_receipts
  FOR EACH ROW EXECUTE FUNCTION public.trade_in_receipts_guard();

-- ---------------------------------------------------------------------------
-- Lås: varelinjer
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trade_in_receipt_items_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v_status text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    -- Findes sedlen ikke længere (cascade-sletning af en kladde), er alt tilladt.
    SELECT status INTO v_status FROM public.trade_in_receipts WHERE id = OLD.receipt_id;
    IF FOUND AND v_status <> 'draft' THEN
      RAISE EXCEPTION 'receipt_locked';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.receipt_id IS DISTINCT FROM OLD.receipt_id) THEN
    SELECT status INTO v_status FROM public.trade_in_receipts WHERE id = NEW.receipt_id;
    IF FOUND AND v_status <> 'draft' THEN
      RAISE EXCEPTION 'receipt_locked';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trade_in_receipt_items_guard ON public.trade_in_receipt_items;
CREATE TRIGGER trade_in_receipt_items_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.trade_in_receipt_items
  FOR EACH ROW EXECUTE FUNCTION public.trade_in_receipt_items_guard();

-- ---------------------------------------------------------------------------
-- Lås: enheder
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.devices_purchase_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('sold', 'shipped', 'picked_up') THEN
      RAISE EXCEPTION 'device_locked';
    END IF;
    RETURN OLD;
  END IF;

  -- En solgt enheds indkøbsdata er låst. Et salg, der i samme sætning sætter et
  -- tomt IMEI/serienummer, er tilladt, fordi OLD.status da ikke er solgt endnu.
  IF OLD.status IN ('sold', 'shipped', 'picked_up')
     AND (NEW.imei IS DISTINCT FROM OLD.imei
          OR NEW.serial_number IS DISTINCT FROM OLD.serial_number
          OR NEW.purchase_price IS DISTINCT FROM OLD.purchase_price
          OR NEW.vat_scheme IS DISTINCT FROM OLD.vat_scheme) THEN
    RAISE EXCEPTION 'device_locked';
  END IF;

  IF NEW.blocked_at IS NOT NULL AND NEW.status IN ('listed', 'reserved', 'sold') THEN
    RAISE EXCEPTION 'device_blocked';
  END IF;

  IF NEW.imei IS DISTINCT FROM OLD.imei THEN
    INSERT INTO public.device_changes (device_id, field, old_value, new_value)
    VALUES (OLD.id, 'imei', OLD.imei, NEW.imei);
  END IF;
  IF NEW.serial_number IS DISTINCT FROM OLD.serial_number THEN
    INSERT INTO public.device_changes (device_id, field, old_value, new_value)
    VALUES (OLD.id, 'serial_number', OLD.serial_number, NEW.serial_number);
  END IF;
  IF NEW.purchase_price IS DISTINCT FROM OLD.purchase_price THEN
    INSERT INTO public.device_changes (device_id, field, old_value, new_value)
    VALUES (OLD.id, 'purchase_price', OLD.purchase_price::text, NEW.purchase_price::text);
  END IF;
  IF NEW.vat_scheme IS DISTINCT FROM OLD.vat_scheme THEN
    INSERT INTO public.device_changes (device_id, field, old_value, new_value)
    VALUES (OLD.id, 'vat_scheme', OLD.vat_scheme, NEW.vat_scheme);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS devices_purchase_guard ON public.devices;
CREATE TRIGGER devices_purchase_guard
  BEFORE UPDATE OR DELETE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.devices_purchase_guard();

-- ---------------------------------------------------------------------------
-- Adgang: kun service-rollen
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated full access" ON public.trade_in_receipts;
DROP POLICY IF EXISTS "Authenticated full access" ON public.trade_in_receipt_items;
DROP POLICY IF EXISTS "Authenticated full access" ON public.trade_in_receipt_counters;
ALTER TABLE public.trade_in_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_in_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_in_receipt_counters ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.slutseddel_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.slutseddel_counters FROM anon, authenticated;
REVOKE ALL ON public.device_changes FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Natlig oprydning: ID slettes efter 5 år, kladder efter 30 dage
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.slutseddel_id_purge() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE public.trade_in_receipts
     SET id_type = NULL, id_number = NULL, id_expiry = NULL, id_purged_at = now()
   WHERE confirmed_at < now() - interval '5 years'
     AND id_purged_at IS NULL
     AND status <> 'draft';

  -- Varelinjerne følger med via ON DELETE CASCADE.
  DELETE FROM public.trade_in_receipts
   WHERE status = 'draft'
     AND created_at < now() - interval '30 days';
END;
$$;
REVOKE ALL ON FUNCTION public.slutseddel_id_purge() FROM public, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('slutseddel-id-purge')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'slutseddel-id-purge');
  PERFORM cron.schedule('slutseddel-id-purge', '15 3 * * *', $c$SELECT public.slutseddel_id_purge()$c$);
END $$;

COMMIT;
