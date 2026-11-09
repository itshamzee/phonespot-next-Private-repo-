-- D2: Den del af et kassesalg, der blev betalt ved modregning af et opkøb ('opkoeb'),
-- kan kun refunderes som tilgodebevis — aldrig kontant, kort eller MobilePay.
--
-- Bygget på den aktuelle prod-definition af pos_create_return (pg_get_functiondef
-- 2026-11-09). Samme signatur og samme krop; kun tilføjet efter refund_mismatch-tjekket:
--   opkøbsandel = sum(order_payments.amount_oere) med type 'opkoeb' på det oprindelige salg.
--   Er den > 0: tidligere kreditnotaers ikke-tilgodebevis-refusioner + denne returs
--   ikke-tilgodebevis-refusioner må højst være salgets total minus opkøbsandelen.
--   Ellers pos:opkoeb_refund_tilgodebevis.
--
-- Forudsætter 20261109127000_d2_pos_sale_opkoeb.sql (betalingstypen 'opkoeb').
-- Køres ved deploy sammen med 127000, efter at kassens nye kode er ude.
-- Smoke: scripts/sql/d2-smoke-return.sql (BEGIN … ROLLBACK).

BEGIN;

SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.pos_create_return(p_original_order_id uuid, p_register_id uuid, p_location_id uuid, p_staff_id uuid, p_lines jsonb, p_refunds jsonb, p_reason text, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  reg public.registers%ROWTYPE; orig public.orders%ROWTYPE; oi public.order_items%ROWTYPE;
  d public.devices%ROWTYPE; ln record; pay record;
  sess_id uuid;
  r_q integer; r_t integer; r_d integer; r_v integer; rem_q integer; rq integer;
  v_tot integer; v_dis integer; v_vat integer; v_restock boolean;
  n integer := 0; i integer;
  c_oi uuid[] := '{}'; c_qty integer[] := '{}'; c_tot integer[] := '{}'; c_dis integer[] := '{}';
  c_vat integer[] := '{}'; c_restock boolean[] := '{}';
  v_subtotal integer := 0; v_discount integer := 0; v_total integer;
  v_vat_total integer := 0; v_brugt_total integer := 0;
  v_pay_sum integer := 0; v_pay_types text[] := '{}';
  v_receipt_no integer; v_receipt_number text; v_order_id uuid; v_order_number text;
  v_unlimited boolean; v_rem integer;
  k_rs integer := 0; k_da integer := 0; v_open integer;
  v_opkoeb integer := 0; v_cash_prev integer := 0; v_cash_now integer := 0;
BEGIN
  SELECT * INTO reg FROM public.registers WHERE id = p_register_id FOR UPDATE;
  IF NOT FOUND OR NOT reg.active THEN PERFORM public.pos_fail('register_not_found'); END IF;
  IF reg.location_id IS DISTINCT FROM p_location_id THEN PERFORM public.pos_fail('register_location_mismatch'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND is_active) THEN
    PERFORM public.pos_fail('staff_not_found');
  END IF;
  SELECT id INTO sess_id FROM public.cash_sessions WHERE register_id = p_register_id AND closed_at IS NULL;
  IF sess_id IS NULL THEN PERFORM public.pos_fail('no_open_session'); END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN PERFORM public.pos_fail('return_reason_required'); END IF;

  -- Locking the original row (no UPDATE, so the immutability trigger stays quiet)
  -- serialises concurrent returns of the same sale.
  SELECT * INTO orig FROM public.orders WHERE id = p_original_order_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.pos_fail('order_not_found'); END IF;
  IF orig.type <> 'pos' THEN PERFORM public.pos_fail('return_not_pos_order'); END IF;
  IF orig.status NOT IN ('confirmed', 'picked_up', 'delivered') THEN PERFORM public.pos_fail('order_not_returnable'); END IF;
  -- Sales made before the POS foundation kept the discount on the order only, so a
  -- line-based refund would over-refund. Those need a manual credit note.
  IF orig.discount_amount > 0 AND NOT EXISTS (
       SELECT 1 FROM public.order_items WHERE order_id = orig.id AND discount_amount > 0) THEN
    PERFORM public.pos_fail('return_legacy_discount');
  END IF;

  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) = 0 THEN
    PERFORM public.pos_fail('return_nothing');
  END IF;

  FOR ln IN SELECT e FROM jsonb_array_elements(p_lines) e ORDER BY e->>'order_item_id' LOOP
    rq := coalesce((ln.e->>'quantity')::integer, 0);
    IF rq = 0 THEN CONTINUE; END IF;
    SELECT * INTO oi FROM public.order_items WHERE id = (ln.e->>'order_item_id')::uuid AND order_id = orig.id;
    IF NOT FOUND THEN PERFORM public.pos_fail('return_item_not_found'); END IF;
    IF oi.id = ANY (c_oi) THEN PERFORM public.pos_fail('return_duplicate_line'); END IF;

    SELECT coalesce(-sum(x.quantity), 0), coalesce(-sum(x.total_price), 0),
           coalesce(-sum(x.discount_amount), 0), coalesce(-sum(x.vat_amount), 0)
      INTO r_q, r_t, r_d, r_v
      FROM public.order_items x JOIN public.orders o ON o.id = x.order_id
      WHERE x.original_order_item_id = oi.id AND o.type = 'credit_note';
    rem_q := oi.quantity - r_q;
    IF rq < 1 OR rq > rem_q THEN PERFORM public.pos_fail('return_quantity_invalid', rem_q::text); END IF;

    IF rq = rem_q THEN
      v_tot := oi.total_price - r_t; v_dis := oi.discount_amount - r_d; v_vat := oi.vat_amount - r_v;
    ELSE
      v_tot := least(round(oi.total_price::numeric * rq / oi.quantity)::integer, oi.total_price - r_t);
      v_dis := least(round(oi.discount_amount::numeric * rq / oi.quantity)::integer, oi.discount_amount - r_d);
      v_vat := least(round(oi.vat_amount::numeric * rq / oi.quantity)::integer, oi.vat_amount - r_v);
    END IF;
    v_restock := coalesce((ln.e->>'restock')::boolean, oi.item_type = 'sku_product');

    IF oi.item_type = 'device' AND oi.device_id IS NOT NULL THEN
      SELECT * INTO d FROM public.devices WHERE id = oi.device_id FOR UPDATE;
      IF FOUND AND d.status <> 'sold' THEN PERFORM public.pos_fail('device_not_returnable', coalesce(d.barcode, d.id::text)); END IF;
    END IF;

    -- A deposit can only be refunded while nothing of it has been applied to a
    -- case payment. The row lock serialises against a sale applying it right now.
    IF oi.item_type = 'deposit' THEN
      PERFORM 1 FROM public.order_items WHERE id = oi.id FOR UPDATE;
      v_rem := public.pos_deposit_remaining(oi.id);
      IF coalesce(v_rem, 0) < v_tot THEN PERFORM public.pos_fail('return_deposit_applied'); END IF;
    END IF;
    IF oi.item_type = 'repair_service' THEN k_rs := k_rs + 1; END IF;
    IF oi.item_type = 'deposit_applied' THEN k_da := k_da + 1; END IF;

    n := n + 1;
    c_oi := array_append(c_oi, oi.id); c_qty := array_append(c_qty, rq);
    c_tot := array_append(c_tot, v_tot); c_dis := array_append(c_dis, v_dis);
    c_vat := array_append(c_vat, v_vat); c_restock := array_append(c_restock, v_restock);
    v_subtotal := v_subtotal + v_tot; v_discount := v_discount + v_dis;
    IF oi.vat_scheme = 'brugtmoms' THEN v_brugt_total := v_brugt_total + v_vat; ELSE v_vat_total := v_vat_total + v_vat; END IF;
  END LOOP;
  IF n = 0 THEN PERFORM public.pos_fail('return_nothing'); END IF;

  -- The repair line and the deposit applied to it are returned together: the
  -- refund is then exactly what the customer paid at pickup, and the deposit is
  -- available again afterwards.
  IF k_rs > 0 THEN
    SELECT count(*) INTO v_open FROM public.order_items da
     WHERE da.order_id = orig.id AND da.item_type = 'deposit_applied' AND da.quantity > 0
       AND da.id <> ALL (c_oi)
       AND NOT EXISTS (SELECT 1 FROM public.order_items cr JOIN public.orders co ON co.id = cr.order_id
                        WHERE cr.original_order_item_id = da.id AND co.type = 'credit_note');
    IF v_open > 0 THEN PERFORM public.pos_fail('return_deposit_pair'); END IF;
  END IF;
  IF k_da > 0 THEN
    SELECT count(*) INTO v_open FROM public.order_items rs
     WHERE rs.order_id = orig.id AND rs.item_type = 'repair_service' AND rs.quantity > 0
       AND rs.id <> ALL (c_oi)
       AND NOT EXISTS (SELECT 1 FROM public.order_items cr JOIN public.orders co ON co.id = cr.order_id
                        WHERE cr.original_order_item_id = rs.id AND co.type = 'credit_note');
    IF v_open > 0 THEN PERFORM public.pos_fail('return_deposit_pair'); END IF;
  END IF;

  v_total := v_subtotal - v_discount;   -- positive here; stored negated below

  FOR pay IN SELECT e FROM jsonb_array_elements(coalesce(p_refunds, '[]'::jsonb)) e LOOP
    IF pay.e->>'type' NOT IN ('kontant', 'kort_terminal', 'mobilepay', 'tilgodebevis') THEN
      PERFORM public.pos_fail('invalid_refund_type');
    END IF;
    IF (pay.e->>'amount_oere')::integer IS NULL OR (pay.e->>'amount_oere')::integer <= 0 THEN
      PERFORM public.pos_fail('invalid_payment_amount');
    END IF;
    v_pay_sum := v_pay_sum + (pay.e->>'amount_oere')::integer;
    v_pay_types := array_append(v_pay_types, pay.e->>'type');
  END LOOP;
  IF v_pay_sum <> v_total THEN PERFORM public.pos_fail('refund_mismatch', v_pay_sum::text || '/' || v_total::text); END IF;

  -- D2: The share of the sale that was paid by offsetting an in-store buyback
  -- ('opkoeb') never leaves the shop as money; it can only come back as a
  -- tilgodebevis. Counted over all returns of the sale (the original row lock
  -- above serialises them): cash, card and MobilePay refunds together may not
  -- exceed what the customer paid with something other than the buyback.
  SELECT coalesce(sum(amount_oere), 0) INTO v_opkoeb
    FROM public.order_payments WHERE order_id = orig.id AND type = 'opkoeb';
  IF v_opkoeb > 0 THEN
    SELECT coalesce(-sum(op.amount_oere), 0) INTO v_cash_prev
      FROM public.order_payments op JOIN public.orders co ON co.id = op.order_id
     WHERE co.original_order_id = orig.id AND co.type = 'credit_note' AND op.type <> 'tilgodebevis';
    SELECT coalesce(sum((e->>'amount_oere')::integer), 0) INTO v_cash_now
      FROM jsonb_array_elements(coalesce(p_refunds, '[]'::jsonb)) e
     WHERE e->>'type' <> 'tilgodebevis';
    IF v_cash_prev + v_cash_now > orig.total - v_opkoeb THEN
      PERFORM public.pos_fail('opkoeb_refund_tilgodebevis');
    END IF;
  END IF;

  UPDATE public.registers SET last_receipt_no = last_receipt_no + 1 WHERE id = reg.id
    RETURNING last_receipt_no INTO v_receipt_no;
  v_receipt_number := reg.code || '-' || lpad(v_receipt_no::text, 6, '0');

  INSERT INTO public.orders (
    order_number, type, customer_id, location_id, is_b2b, status, payment_method, payment_status,
    subtotal, discount_amount, shipping_cost, total, brugtmoms_total, vat_total, notes, confirmed_at,
    register_id, cash_session_id, staff_id, receipt_no, receipt_number, original_order_id, credit_reason,
    repair_ticket_id
  ) VALUES (
    'KN-' || v_receipt_number, 'credit_note', orig.customer_id, p_location_id, false, 'confirmed',
    public.pos_legacy_payment_method(v_pay_types), 'paid',
    -v_subtotal, -v_discount, 0, -v_total, -v_brugt_total, -v_vat_total,
    nullif(btrim(coalesce(p_notes, '')), ''), clock_timestamp(),
    reg.id, sess_id, p_staff_id, v_receipt_no, v_receipt_number, orig.id, btrim(p_reason),
    orig.repair_ticket_id
  ) RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR i IN 1..n LOOP
    SELECT * INTO oi FROM public.order_items WHERE id = c_oi[i];
    INSERT INTO public.order_items (
      order_id, item_type, device_id, sku_product_id, quantity, unit_price, total_price,
      purchase_price, vat_scheme, description, discount_amount, vat_amount, original_order_item_id,
      repair_ticket_id, deposit_item_id
    ) VALUES (
      v_order_id, oi.item_type, oi.device_id, oi.sku_product_id, -c_qty[i], oi.unit_price, -c_tot[i],
      oi.purchase_price, oi.vat_scheme, oi.description, -c_dis[i], -c_vat[i], oi.id,
      oi.repair_ticket_id, oi.deposit_item_id
    );

    IF oi.item_type = 'device' AND oi.device_id IS NOT NULL THEN
      IF c_restock[i] THEN
        UPDATE public.devices SET status = 'listed', location_id = p_location_id, sold_at = NULL
          WHERE id = oi.device_id AND status = 'sold';
        INSERT INTO public.stock_movements (location_id, device_id, qty_delta, reason, ref_order_id, staff_id)
          VALUES (p_location_id, oi.device_id, 1, 'return', v_order_id, p_staff_id);
      ELSE
        -- Not back for sale (defect etc.): parked as 'returned' for inspection.
        UPDATE public.devices SET status = 'returned' WHERE id = oi.device_id AND status = 'sold';
      END IF;
    ELSIF oi.item_type = 'sku_product' AND oi.sku_product_id IS NOT NULL AND c_restock[i] THEN
      SELECT always_in_stock INTO v_unlimited FROM public.sku_products WHERE id = oi.sku_product_id;
      IF NOT coalesce(v_unlimited, false) THEN
        INSERT INTO public.sku_stock (product_id, location_id, quantity)
          VALUES (oi.sku_product_id, p_location_id, c_qty[i])
          ON CONFLICT (product_id, location_id)
          DO UPDATE SET quantity = public.sku_stock.quantity + EXCLUDED.quantity, updated_at = clock_timestamp();
        INSERT INTO public.stock_movements (location_id, sku_product_id, qty_delta, reason, ref_order_id, staff_id)
          VALUES (p_location_id, oi.sku_product_id, c_qty[i], 'return', v_order_id, p_staff_id);
      END IF;
    ELSIF oi.item_type = 'repair_service' AND oi.repair_ticket_id IS NOT NULL THEN
      UPDATE public.repair_tickets SET paid = false, paid_at = NULL WHERE id = oi.repair_ticket_id;
    END IF;
  END LOOP;

  FOR pay IN SELECT e FROM jsonb_array_elements(coalesce(p_refunds, '[]'::jsonb)) e LOOP
    INSERT INTO public.order_payments (order_id, type, amount_oere, reference)
      VALUES (v_order_id, pay.e->>'type', -(pay.e->>'amount_oere')::integer, nullif(btrim(coalesce(pay.e->>'reference', '')), ''));
  END LOOP;

  INSERT INTO public.activity_log (actor_id, actor_type, action, entity_type, entity_id, details)
  VALUES (p_staff_id, 'staff', 'pos_return', 'order', v_order_id, jsonb_build_object(
    'receipt_number', v_receipt_number, 'original_order_id', orig.id, 'original_order_number', orig.order_number,
    'register_id', reg.id, 'refund', v_total, 'reason', btrim(p_reason), 'refunds', coalesce(p_refunds, '[]'::jsonb),
    'repair_ticket_id', orig.repair_ticket_id));

  RETURN jsonb_build_object(
    'order_id', v_order_id, 'order_number', v_order_number, 'receipt_number', v_receipt_number,
    'receipt_no', v_receipt_no, 'total', -v_total, 'refund_amount', v_total,
    'original_order_id', orig.id, 'cash_session_id', sess_id);
END;
$function$;

-- Same privileges as before: only the service role (the API) calls it.
REVOKE ALL ON FUNCTION public.pos_create_return(uuid, uuid, uuid, uuid, jsonb, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pos_create_return(uuid, uuid, uuid, uuid, jsonb, jsonb, text, text) TO service_role;

COMMIT;
