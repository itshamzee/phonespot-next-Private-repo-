-- D2 task 6: en slutseddel under mistanke kan ikke annulleres.
-- Erstatter trade_in_void (nyeste definition: 20261109121000) og tilføjer suspected_at-tjekket.
-- Idempotent.

BEGIN;

SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.trade_in_void(p_receipt_id uuid, p_staff_id uuid, p_reason text) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  r public.trade_in_receipts%ROWTYPE;
  v_reason text := btrim(coalesce(p_reason, ''));
BEGIN
  IF v_reason = '' THEN
    PERFORM public.pos_fail('void_reason_required');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND is_active) THEN
    PERFORM public.pos_fail('staff_not_found');
  END IF;

  SELECT * INTO r FROM public.trade_in_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM public.pos_fail('receipt_not_found');
  END IF;
  -- En seddel under mistanke kan hverken annulleres eller udbetales (spærringen skal ophæves først).
  IF r.suspected_at IS NOT NULL THEN
    PERFORM public.pos_fail('receipt_not_voidable');
  END IF;
  -- Kun en bekræftet seddel, der hverken er udbetalt eller modregnet.
  IF r.status <> 'confirmed' OR r.offset_order_id IS NOT NULL THEN
    PERFORM public.pos_fail('receipt_not_voidable');
  END IF;

  -- Alle enheder skal stadig være i modtagelse (ikke klargjort, listet eller solgt).
  PERFORM 1 FROM public.devices
   WHERE id IN (SELECT device_id FROM public.trade_in_receipt_items WHERE receipt_id = r.id)
   FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.trade_in_receipt_items i
               JOIN public.devices d ON d.id = i.device_id
              WHERE i.receipt_id = r.id AND d.status <> 'intake') THEN
    PERFORM public.pos_fail('receipt_not_voidable');
  END IF;

  -- Spær og tag af lager, så enheden aldrig kan sættes til salg igen.
  WITH blocked AS (
    UPDATE public.devices
       SET blocked_at = now(),
           blocked_reason = 'Slutseddel annulleret',
           status = 'delisted'
     WHERE id IN (SELECT device_id FROM public.trade_in_receipt_items WHERE receipt_id = r.id)
    RETURNING id, location_id
  )
  INSERT INTO public.stock_movements (location_id, device_id, qty_delta, reason, ref_note, staff_id)
  SELECT location_id, id, -1, 'adjust', 'Slutseddel ' || r.receipt_number || ' annulleret', p_staff_id
    FROM blocked;

  UPDATE public.trade_in_receipts
     SET status = 'voided',
         voided_at = now(),
         voided_by = p_staff_id,
         void_reason = v_reason
   WHERE id = r.id;
END;
$$;

REVOKE ALL ON FUNCTION public.trade_in_void(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trade_in_void(uuid, uuid, text) TO service_role;

COMMIT;
