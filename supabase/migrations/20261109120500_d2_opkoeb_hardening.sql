-- D2: Opkøb i butikken — skærpelse af låsene fra 20261109120000_d2_opkoeb_schema.sql.
--
--  1. En kladde må kun forlade 'draft' til 'confirmed', og kun med nummer,
--     confirmed_at og confirmed_by.
--  2. ID-sletning er kun tilladt, når sedlen er bekræftet for over 5 år siden.
--  3. anon/authenticated mister skriverettigheder (inkl. TRUNCATE) på
--     slutseddel-tabellerne, og TRUNCATE er spærret med en trigger.
--     authenticated beholder SELECT på trade_in_receipts (RLS giver 0 rækker),
--     indtil admin-siderne er flyttet til API'et (Task 4) — ellers fejler hele
--     opkøbskøen (/admin/opkoeb/ko), som læser tabellen med browser-klienten.
--  4. Oprydning af kladder kan ikke blokere den lovpligtige ID-sletning.
--  5. Annullering kræver årsag, tidspunkt og medarbejder, og betalings- og
--     annulleringsfelter kan ikke ændres, når de først er sat.
--  6. En spærret enhed kan ikke flyttes til listed/reserved/sold (heller ikke
--     ved INSERT), men en allerede solgt enhed kan markeres som spærret.
-- Idempotent: kan køres igen.

BEGIN;

SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 1, 2, 5: slutseddel-låsen
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
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'draft' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'receipt_locked';
  END IF;

  -- En kladde må redigeres frit. Den må kun forlade 'draft' til 'confirmed', og
  -- kun med nummer og bekræftelse (trade_in_confirm kan gøre alt i én UPDATE).
  IF OLD.status = 'draft' THEN
    IF NEW.status = 'draft' THEN RETURN NEW; END IF;
    IF NEW.status <> 'confirmed'
       OR NEW.receipt_number IS NULL
       OR NEW.confirmed_at IS NULL
       OR NEW.confirmed_by IS NULL THEN
      RAISE EXCEPTION 'receipt_locked';
    END IF;
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - v_mutable) IS DISTINCT FROM (to_jsonb(OLD) - v_mutable) THEN
    RAISE EXCEPTION 'receipt_locked';
  END IF;

  -- Betaling og annullering skrives én gang.
  IF (OLD.paid_at IS NOT NULL AND NEW.paid_at IS DISTINCT FROM OLD.paid_at)
     OR (OLD.paid_by IS NOT NULL AND NEW.paid_by IS DISTINCT FROM OLD.paid_by)
     OR (OLD.voided_at IS NOT NULL AND NEW.voided_at IS DISTINCT FROM OLD.voided_at)
     OR (OLD.voided_by IS NOT NULL AND NEW.voided_by IS DISTINCT FROM OLD.voided_by)
     OR (OLD.void_reason IS NOT NULL AND NEW.void_reason IS DISTINCT FROM OLD.void_reason) THEN
    RAISE EXCEPTION 'receipt_locked';
  END IF;

  -- ID-oplysninger må kun slettes (alle tre til NULL), kun sammen med
  -- id_purged_at, og kun når sedlen er bekræftet for over 5 år siden.
  IF ROW(NEW.id_type, NEW.id_number, NEW.id_expiry, NEW.id_purged_at)
     IS DISTINCT FROM ROW(OLD.id_type, OLD.id_number, OLD.id_expiry, OLD.id_purged_at) THEN
    IF OLD.confirmed_at IS NULL OR OLD.confirmed_at >= now() - interval '5 years'
       OR OLD.id_purged_at IS NOT NULL OR NEW.id_purged_at IS NULL
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

ALTER TABLE public.trade_in_receipts DROP CONSTRAINT IF EXISTS trade_in_receipts_void_reason_check;
ALTER TABLE public.trade_in_receipts ADD CONSTRAINT trade_in_receipts_void_reason_check
  CHECK (status <> 'voided'
         OR (void_reason IS NOT NULL AND btrim(void_reason) <> ''
             AND voided_at IS NOT NULL AND voided_by IS NOT NULL));

-- ---------------------------------------------------------------------------
-- 3: rettigheder og TRUNCATE
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.trade_in_receipts FROM anon, authenticated;
-- Midlertidigt (fjernes i Task 4): admin-siderne læser stadig med browser-klienten.
-- RLS uden politikker giver 0 rækker, så der læses intet.
GRANT SELECT ON public.trade_in_receipts TO authenticated;
REVOKE ALL ON public.trade_in_receipt_items FROM anon, authenticated;
REVOKE ALL ON public.trade_in_receipt_counters FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.trade_in_receipts_no_truncate() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION 'receipt_locked';
END;
$$;

DROP TRIGGER IF EXISTS trade_in_receipts_no_truncate ON public.trade_in_receipts;
CREATE TRIGGER trade_in_receipts_no_truncate
  BEFORE TRUNCATE ON public.trade_in_receipts
  FOR EACH STATEMENT EXECUTE FUNCTION public.trade_in_receipts_no_truncate();

DROP TRIGGER IF EXISTS trade_in_receipt_items_no_truncate ON public.trade_in_receipt_items;
CREATE TRIGGER trade_in_receipt_items_no_truncate
  BEFORE TRUNCATE ON public.trade_in_receipt_items
  FOR EACH STATEMENT EXECUTE FUNCTION public.trade_in_receipts_no_truncate();

-- ---------------------------------------------------------------------------
-- 4: ID-sletning først; kladde-oprydning isoleret
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.slutseddel_id_purge() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE public.trade_in_receipts
     SET id_type = NULL, id_number = NULL, id_expiry = NULL, id_purged_at = now()
   WHERE confirmed_at < now() - interval '5 years'
     AND id_purged_at IS NULL
     AND status <> 'draft';

  -- Kladder over 30 dage. En fejl her må aldrig rulle ID-sletningen tilbage.
  -- Varelinjerne følger med via ON DELETE CASCADE.
  BEGIN
    DELETE FROM public.trade_in_receipts
     WHERE status = 'draft'
       AND created_at < now() - interval '30 days';
  EXCEPTION WHEN others THEN
    RAISE WARNING 'slutseddel_id_purge: kladder kunne ikke slettes: %', SQLERRM;
  END;
END;
$$;
REVOKE ALL ON FUNCTION public.slutseddel_id_purge() FROM public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6: enhedslåsen, nu også ved INSERT
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

  IF TG_OP = 'INSERT' THEN
    IF NEW.blocked_at IS NOT NULL AND NEW.status IN ('listed', 'reserved', 'sold') THEN
      RAISE EXCEPTION 'device_blocked';
    END IF;
    RETURN NEW;
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

  -- En spærret enhed kan ikke flyttes til listed/reserved/sold. En solgt enhed
  -- kan godt markeres som spærret (fx tyvegods opdaget efter salget), men en
  -- enhed til salg (listed/reserved) skal tages af salg i samme sætning.
  IF NEW.blocked_at IS NOT NULL AND NEW.status IN ('listed', 'reserved', 'sold')
     AND (NEW.status IS DISTINCT FROM OLD.status
          OR (OLD.blocked_at IS NULL AND NEW.status IN ('listed', 'reserved'))) THEN
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
  BEFORE INSERT OR UPDATE OR DELETE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.devices_purchase_guard();

COMMIT;
