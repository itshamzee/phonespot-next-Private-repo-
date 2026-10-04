-- Repair deposit (depositum) model, part 2 of 2: replaces pos_create_sale and
-- pos_create_return from 20261003130000 (same signatures, same grants).
-- Apply AFTER 20261004300000_pos_deposit_schema.sql.
--
-- pos_create_sale item types (p_items):
--   {type:'device', device_id}
--   {type:'sku_product', sku_product_id, quantity}
--   {type:'free_text', description, unit_price_oere, quantity?}
--   {type:'deposit', repair_ticket_id, description?, unit_price_oere}          prepayment on a case (25 % VAT)
--   {type:'repair_service', repair_ticket_id, description?, unit_price_oere}   the case total (25 % VAT); marks the case paid
--   {type:'deposit_applied', deposit_item_id, amount_oere}                     negative line; needs a repair_service line for the same case
--
-- Rules enforced here (business errors are pos:<code>, mapped in src/lib/pos/errors.ts):
--   * a sale touches at most one case
--   * deposit / repair_service need an existing, unpaid case
--   * a deposit is applied at most up to its remaining balance (locked, race-free)
--     and never twice in one request
--   * the total can never become negative (deposit larger than the final price
--     is applied up to the price; the rest is refunded through the return flow)
--   * repair_service marks repair_tickets.paid = true / paid_at (also for faktura:
--     the case is billed; order.payment_status stays 'pending' until paid)
--
-- pos_create_return additions:
--   * credit-note lines copy repair_ticket_id and deposit_item_id
--   * a deposit that has been (even partly) applied cannot be returned
--   * repair_service and deposit_applied lines are returned together (all or
--     nothing), which gives the customer exactly what they paid at pickup, and
--     the deposit becomes available again (the reversal restores its balance)
--   * returning a repair_service line resets repair_tickets.paid / paid_at

BEGIN;

CREATE OR REPLACE FUNCTION public.pos_create_sale(
  p_location_id uuid, p_register_id uuid, p_staff_id uuid, p_customer_id uuid,
  p_items jsonb, p_payments jsonb, p_discount_amount integer, p_discount_reason text, p_notes text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  reg public.registers%ROWTYPE;
  sess_id uuid;
  v_discount integer := coalesce(p_discount_amount, 0);
  it record; d public.devices%ROWTYPE; sp record; pay record; tk record; dep record;
  v_name text; v_qty integer; v_unit integer; v_desc text;
  n integer := 0; i integer; j integer;
  l_kind text[] := '{}'; l_dev uuid[] := '{}'; l_sku uuid[] := '{}'; l_desc text[] := '{}';
  l_qty integer[] := '{}'; l_unit integer[] := '{}'; l_total integer[] := '{}';
  l_cost integer[] := '{}'; l_scheme text[] := '{}'; l_base integer[] := '{}';
  l_ticket uuid[] := '{}'; l_depref uuid[] := '{}';
  l_disc integer[]; l_vat integer[] := '{}';
  v_net integer; v_margin integer;
  v_subtotal integer := 0; v_total integer; v_discountable integer := 0;
  v_vat_total integer := 0; v_brugt_total integer := 0;
  v_pay_sum integer := 0; v_pay_types text[] := '{}'; v_has_invoice boolean := false;
  v_receipt_no integer; v_receipt_number text;
  v_order_id uuid; v_order_number text;
  v_rc integer; v_loc uuid; v_unlimited boolean; v_title text;
  v_ticket uuid; v_dep_id uuid; v_amt integer; v_rem integer;
  v_order_ticket uuid; v_customer uuid := p_customer_id; v_ticket_customer uuid;
  v_has_repair boolean := false; v_applied_total integer := 0; v_found boolean;
BEGIN
  -- Register: row lock serialises receipt numbers per register.
  SELECT * INTO reg FROM public.registers WHERE id = p_register_id FOR UPDATE;
  IF NOT FOUND OR NOT reg.active THEN PERFORM public.pos_fail('register_not_found'); END IF;
  IF reg.location_id IS DISTINCT FROM p_location_id THEN PERFORM public.pos_fail('register_location_mismatch'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND is_active) THEN
    PERFORM public.pos_fail('staff_not_found');
  END IF;
  SELECT id INTO sess_id FROM public.cash_sessions WHERE register_id = p_register_id AND closed_at IS NULL;
  IF sess_id IS NULL THEN PERFORM public.pos_fail('no_open_session'); END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    PERFORM public.pos_fail('no_items');
  END IF;

  -- Lock devices in id order first (deadlock-free), then evaluate each line.
  PERFORM 1 FROM public.devices
    WHERE id IN (SELECT (e->>'device_id')::uuid FROM jsonb_array_elements(p_items) e WHERE e->>'type' = 'device')
    ORDER BY id FOR UPDATE;

  FOR it IN SELECT e, ord FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(e, ord) ORDER BY ord LOOP
    n := n + 1;
    v_ticket := NULL; v_dep_id := NULL;
    IF it.e->>'type' = 'device' THEN
      SELECT * INTO d FROM public.devices WHERE id = (it.e->>'device_id')::uuid;
      IF NOT FOUND THEN PERFORM public.pos_fail('device_not_found'); END IF;
      IF d.id = ANY (l_dev) THEN PERFORM public.pos_fail('duplicate_device', coalesce(d.barcode, d.id::text)); END IF;
      IF d.source IS NOT DISTINCT FROM 'foxway' THEN PERFORM public.pos_fail('device_not_pos_sellable', coalesce(d.barcode, d.id::text)); END IF;
      -- Same availability rule as the webshop reservation lock: listed, or a
      -- reservation that has expired. A live reservation blocks the sale.
      IF NOT (d.status = 'listed'
              OR (d.status = 'reserved' AND d.reservation_expires_at IS NOT NULL
                  AND d.reservation_expires_at <= clock_timestamp())) THEN
        PERFORM public.pos_fail('device_unavailable', coalesce(d.barcode, d.id::text));
      END IF;
      IF coalesce(d.selling_price, 0) <= 0 THEN PERFORM public.pos_fail('device_no_price', coalesce(d.barcode, d.id::text)); END IF;
      SELECT display_name INTO v_name FROM public.product_templates WHERE id = d.template_id;
      l_kind := array_append(l_kind, 'device');
      l_dev := array_append(l_dev, d.id);
      l_sku := array_append(l_sku, NULL::uuid);
      l_desc := array_append(l_desc, coalesce(v_name, 'Enhed') || coalesce(' ' || d.storage, ''));
      l_qty := array_append(l_qty, 1);
      l_unit := array_append(l_unit, d.selling_price);
      l_cost := array_append(l_cost, d.purchase_price);
      l_scheme := array_append(l_scheme, d.vat_scheme);
    ELSIF it.e->>'type' = 'sku_product' THEN
      SELECT id, title, selling_price, sale_price, cost_price INTO sp
        FROM public.sku_products WHERE id = (it.e->>'sku_product_id')::uuid;
      IF NOT FOUND THEN PERFORM public.pos_fail('sku_not_found'); END IF;
      v_qty := coalesce((it.e->>'quantity')::integer, 1);
      IF v_qty < 1 OR v_qty > 1000 THEN PERFORM public.pos_fail('invalid_quantity'); END IF;
      l_kind := array_append(l_kind, 'sku_product');
      l_dev := array_append(l_dev, NULL::uuid);
      l_sku := array_append(l_sku, sp.id);
      l_desc := array_append(l_desc, sp.title);
      l_qty := array_append(l_qty, v_qty);
      l_unit := array_append(l_unit, CASE WHEN sp.sale_price IS NOT NULL AND sp.sale_price < sp.selling_price
                                          THEN sp.sale_price ELSE sp.selling_price END);
      l_cost := array_append(l_cost, sp.cost_price);
      l_scheme := array_append(l_scheme, 'regular');
    ELSIF it.e->>'type' IN ('free_text', 'deposit', 'repair_service') THEN
      v_desc := left(btrim(coalesce(it.e->>'description', '')), 200);
      IF v_desc = '' AND it.e->>'type' = 'deposit' THEN v_desc := 'Depositum'; END IF;
      IF v_desc = '' AND it.e->>'type' = 'repair_service' THEN v_desc := 'Reparation'; END IF;
      IF v_desc = '' THEN PERFORM public.pos_fail('description_required'); END IF;
      v_unit := (it.e->>'unit_price_oere')::integer;
      IF v_unit IS NULL OR v_unit <= 0 THEN PERFORM public.pos_fail('invalid_price'); END IF;
      v_qty := CASE WHEN it.e->>'type' IN ('deposit', 'repair_service') THEN 1 ELSE coalesce((it.e->>'quantity')::integer, 1) END;
      IF v_qty < 1 OR v_qty > 1000 THEN PERFORM public.pos_fail('invalid_quantity'); END IF;
      IF it.e->>'type' IN ('deposit', 'repair_service') THEN
        v_ticket := nullif(it.e->>'repair_ticket_id', '')::uuid;
        IF v_ticket IS NULL THEN PERFORM public.pos_fail('ticket_required'); END IF;
        SELECT id, ticket_number, paid, customer_id INTO tk FROM public.repair_tickets WHERE id = v_ticket FOR UPDATE;
        IF NOT FOUND THEN PERFORM public.pos_fail('ticket_not_found'); END IF;
        IF coalesce(tk.paid, false) THEN PERFORM public.pos_fail('ticket_already_paid', coalesce(tk.ticket_number, v_ticket::text)); END IF;
        v_ticket_customer := tk.customer_id;
        IF it.e->>'type' = 'repair_service' THEN v_has_repair := true; END IF;
      END IF;
      l_kind := array_append(l_kind, it.e->>'type');
      l_dev := array_append(l_dev, NULL::uuid);
      l_sku := array_append(l_sku, NULL::uuid);
      l_desc := array_append(l_desc, v_desc);
      l_qty := array_append(l_qty, v_qty);
      l_unit := array_append(l_unit, v_unit);
      l_cost := array_append(l_cost, NULL::integer);
      l_scheme := array_append(l_scheme, 'regular');  -- Depositum, reparation and Diverse salg carry 25 % moms
    ELSIF it.e->>'type' = 'deposit_applied' THEN
      v_dep_id := nullif(it.e->>'deposit_item_id', '')::uuid;
      v_amt := (it.e->>'amount_oere')::integer;
      IF v_dep_id IS NULL THEN PERFORM public.pos_fail('deposit_not_found'); END IF;
      IF v_amt IS NULL OR v_amt <= 0 THEN PERFORM public.pos_fail('invalid_price'); END IF;
      IF v_dep_id = ANY (l_depref) THEN PERFORM public.pos_fail('duplicate_deposit_application'); END IF;
      -- Lock the deposit line: a concurrent sale using the same deposit waits here
      -- and then sees this sale's applied line in the balance.
      SELECT oi.id, oi.repair_ticket_id, o.type AS order_type, o.status AS order_status INTO dep
        FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
       WHERE oi.id = v_dep_id AND oi.item_type = 'deposit' AND oi.quantity > 0
       FOR UPDATE OF oi;
      IF NOT FOUND OR dep.order_type <> 'pos' OR dep.order_status NOT IN ('confirmed', 'picked_up', 'delivered') THEN
        PERFORM public.pos_fail('deposit_not_found');
      END IF;
      v_rem := public.pos_deposit_remaining(v_dep_id);
      IF v_amt > coalesce(v_rem, 0) THEN PERFORM public.pos_fail('deposit_exceeded', coalesce(v_rem, 0)::text); END IF;
      v_ticket := dep.repair_ticket_id;
      l_kind := array_append(l_kind, 'deposit_applied');
      l_dev := array_append(l_dev, NULL::uuid);
      l_sku := array_append(l_sku, NULL::uuid);
      l_desc := array_append(l_desc, 'Depositum modregnet');
      l_qty := array_append(l_qty, 1);
      l_unit := array_append(l_unit, -v_amt);
      l_cost := array_append(l_cost, NULL::integer);
      l_scheme := array_append(l_scheme, 'regular');
      v_applied_total := v_applied_total + v_amt;
    ELSE
      PERFORM public.pos_fail('invalid_item_type');
    END IF;
    l_ticket := array_append(l_ticket, v_ticket);
    l_depref := array_append(l_depref, v_dep_id);
    l_total := array_append(l_total, l_unit[n] * l_qty[n]);
    -- Deposits (received and applied) are prepayments, never discountable.
    l_base := array_append(l_base, CASE WHEN l_kind[n] IN ('deposit', 'deposit_applied') THEN 0 ELSE l_unit[n] * l_qty[n] END);
    v_subtotal := v_subtotal + l_unit[n] * l_qty[n];
    v_discountable := v_discountable + l_base[n];
  END LOOP;

  -- Case rules: one case per sale; an applied deposit needs the case's repair line.
  SELECT count(DISTINCT u.tid), min(u.tid::text)::uuid INTO i, v_order_ticket
    FROM unnest(l_ticket) AS u(tid) WHERE u.tid IS NOT NULL;
  IF i > 1 THEN PERFORM public.pos_fail('one_ticket_per_sale'); END IF;
  FOR i IN 1..n LOOP
    IF l_kind[i] = 'deposit_applied' THEN
      v_found := false;
      FOR j IN 1..n LOOP
        IF l_kind[j] = 'repair_service' AND l_ticket[j] = l_ticket[i] THEN v_found := true; END IF;
      END LOOP;
      IF NOT v_found THEN PERFORM public.pos_fail('deposit_requires_repair_line'); END IF;
    END IF;
  END LOOP;
  IF v_customer IS NULL THEN v_customer := v_ticket_customer; END IF;

  -- Discount: reason required, distributed proportionally, THEN VAT per line.
  IF v_discount < 0 THEN PERFORM public.pos_fail('invalid_discount'); END IF;
  IF v_discount > 0 AND (p_discount_reason IS NULL
      OR p_discount_reason NOT IN ('Fejl', 'Kundeservice', 'Tilbud', 'Andet')) THEN
    PERFORM public.pos_fail('discount_reason_required');
  END IF;
  IF v_discount > v_discountable THEN PERFORM public.pos_fail('discount_exceeds_total'); END IF;
  l_disc := public.pos_distribute_discount(l_base, v_discount);
  v_total := v_subtotal - v_discount;
  IF v_total < 0 THEN PERFORM public.pos_fail('negative_total'); END IF;

  FOR i IN 1..n LOOP
    v_net := l_total[i] - l_disc[i];
    IF l_scheme[i] = 'brugtmoms' THEN
      v_margin := v_net - coalesce(l_cost[i], 0) * l_qty[i];
      l_vat := array_append(l_vat, CASE WHEN v_margin > 0 THEN round(v_margin::numeric * 25 / 125)::integer ELSE 0 END);
      v_brugt_total := v_brugt_total + l_vat[i];
    ELSE
      -- Also for deposit_applied (negative net): round() is symmetric, so the
      -- applied line carries exactly minus the VAT of the deposit it consumes.
      l_vat := array_append(l_vat, round(v_net::numeric * 25 / 125)::integer);
      v_vat_total := v_vat_total + l_vat[i];
    END IF;
  END LOOP;

  -- Payments: positive amounts that sum to exactly the total (an empty list for a 0 total).
  FOR pay IN SELECT e FROM jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) e LOOP
    IF pay.e->>'type' NOT IN ('kontant', 'kort_terminal', 'mobilepay', 'klarna', 'faktura', 'tilgodebevis', 'gavekort') THEN
      PERFORM public.pos_fail('invalid_payment_type');
    END IF;
    IF (pay.e->>'amount_oere')::integer IS NULL OR (pay.e->>'amount_oere')::integer <= 0 THEN
      PERFORM public.pos_fail('invalid_payment_amount');
    END IF;
    IF pay.e->>'type' IN ('tilgodebevis', 'gavekort') AND btrim(coalesce(pay.e->>'reference', '')) = '' THEN
      PERFORM public.pos_fail('payment_reference_required');
    END IF;
    v_pay_sum := v_pay_sum + (pay.e->>'amount_oere')::integer;
    v_pay_types := array_append(v_pay_types, pay.e->>'type');
    IF pay.e->>'type' = 'faktura' THEN v_has_invoice := true; END IF;
  END LOOP;
  IF v_pay_sum <> v_total THEN
    PERFORM public.pos_fail('payment_mismatch', v_pay_sum::text || '/' || v_total::text);
  END IF;
  IF v_has_invoice AND v_customer IS NULL THEN PERFORM public.pos_fail('customer_required_for_invoice'); END IF;

  -- Receipt number: sequential per register, never reused (counter lives under
  -- the register row lock taken above; a rolled-back sale rolls the counter back too).
  UPDATE public.registers SET last_receipt_no = last_receipt_no + 1 WHERE id = reg.id
    RETURNING last_receipt_no INTO v_receipt_no;
  v_receipt_number := reg.code || '-' || lpad(v_receipt_no::text, 6, '0');

  INSERT INTO public.orders (
    type, customer_id, location_id, is_b2b, status, payment_method, payment_status,
    subtotal, discount_amount, shipping_cost, total, brugtmoms_total, vat_total, notes, confirmed_at,
    register_id, cash_session_id, staff_id, receipt_no, receipt_number, discount_reason, repair_ticket_id
  ) VALUES (
    'pos', v_customer, p_location_id, false, 'confirmed',
    public.pos_legacy_payment_method(v_pay_types),
    CASE WHEN v_has_invoice THEN 'pending' ELSE 'paid' END,
    v_subtotal, v_discount, 0, v_total, v_brugt_total, v_vat_total, nullif(btrim(coalesce(p_notes, '')), ''),
    clock_timestamp(), reg.id, sess_id, p_staff_id, v_receipt_no, v_receipt_number,
    CASE WHEN v_discount > 0 THEN p_discount_reason END, v_order_ticket
  ) RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR i IN 1..n LOOP
    INSERT INTO public.order_items (
      order_id, item_type, device_id, sku_product_id, quantity, unit_price, total_price,
      purchase_price, vat_scheme, description, discount_amount, vat_amount,
      repair_ticket_id, deposit_item_id
    ) VALUES (
      v_order_id, l_kind[i], l_dev[i], l_sku[i], l_qty[i], l_unit[i], l_total[i],
      l_cost[i], l_scheme[i], l_desc[i], l_disc[i], l_vat[i],
      l_ticket[i], l_depref[i]
    );
  END LOOP;

  -- Final payment of a case: mark it paid.
  IF v_has_repair THEN
    UPDATE public.repair_tickets SET paid = true, paid_at = clock_timestamp() WHERE id = v_order_ticket;
  END IF;

  -- Devices: conditional update guards against a webshop reservation taking the unit.
  FOR i IN 1..n LOOP
    IF l_kind[i] = 'device' THEN
      UPDATE public.devices SET status = 'sold', sold_at = clock_timestamp()
        WHERE id = l_dev[i]
          AND (status = 'listed' OR (status = 'reserved' AND reservation_expires_at <= clock_timestamp()))
        RETURNING location_id INTO v_loc;
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      IF v_rc <> 1 THEN PERFORM public.pos_fail('device_unavailable', l_dev[i]::text); END IF;
      INSERT INTO public.stock_movements (location_id, device_id, qty_delta, reason, ref_order_id, staff_id)
        VALUES (v_loc, l_dev[i], -1, 'sale', v_order_id, p_staff_id);
    END IF;
  END LOOP;

  -- Accessories: decrement at THIS register's location (never the online location).
  FOR sp IN
    SELECT u.sku AS sku_id, sum(u.q)::integer AS q
    FROM unnest(l_sku, l_qty, l_kind) AS u(sku, q, kind)
    WHERE u.kind = 'sku_product' GROUP BY u.sku ORDER BY u.sku
  LOOP
    SELECT always_in_stock, title INTO v_unlimited, v_title FROM public.sku_products WHERE id = sp.sku_id;
    IF coalesce(v_unlimited, false) THEN CONTINUE; END IF;
    UPDATE public.sku_stock SET quantity = quantity - sp.q, updated_at = clock_timestamp()
      WHERE product_id = sp.sku_id AND location_id = p_location_id AND quantity >= sp.q;
    IF NOT FOUND THEN PERFORM public.pos_fail('insufficient_stock', v_title); END IF;
    INSERT INTO public.stock_movements (location_id, sku_product_id, qty_delta, reason, ref_order_id, staff_id)
      VALUES (p_location_id, sp.sku_id, -sp.q, 'sale', v_order_id, p_staff_id);
  END LOOP;

  FOR pay IN SELECT e FROM jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) e LOOP
    INSERT INTO public.order_payments (order_id, type, amount_oere, reference)
      VALUES (v_order_id, pay.e->>'type', (pay.e->>'amount_oere')::integer, nullif(btrim(coalesce(pay.e->>'reference', '')), ''));
  END LOOP;

  INSERT INTO public.activity_log (actor_id, actor_type, action, entity_type, entity_id, details)
  VALUES (p_staff_id, 'staff', 'pos_sale', 'order', v_order_id, jsonb_build_object(
    'receipt_number', v_receipt_number, 'register_id', reg.id, 'location_id', p_location_id,
    'total', v_total, 'discount', v_discount, 'discount_reason', p_discount_reason,
    'payments', coalesce(p_payments, '[]'::jsonb), 'item_count', n,
    'repair_ticket_id', v_order_ticket, 'deposit_applied', v_applied_total, 'case_paid', v_has_repair));

  RETURN jsonb_build_object(
    'order_id', v_order_id, 'order_number', v_order_number, 'receipt_number', v_receipt_number,
    'receipt_no', v_receipt_no, 'subtotal', v_subtotal, 'discount', v_discount, 'total', v_total,
    'vat_total', v_vat_total, 'brugtmoms_total', v_brugt_total, 'cash_session_id', sess_id,
    'repair_ticket_id', v_order_ticket, 'deposit_applied', v_applied_total, 'case_paid', v_has_repair);
END;
$$;

-- ============================================================
-- pos_create_return: credit note against a POS sale (deposit-aware).
-- ============================================================
CREATE OR REPLACE FUNCTION public.pos_create_return(
  p_original_order_id uuid, p_register_id uuid, p_location_id uuid, p_staff_id uuid,
  p_lines jsonb, p_refunds jsonb, p_reason text, p_notes text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
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

  UPDATE public.registers SET last_receipt_no = last_receipt_no + 1 WHERE id = reg.id
    RETURNING last_receipt_no INTO v_receipt_no;
  v_receipt_number := reg.code || '-' || lpad(v_receipt_no::text, 6, '0');

  INSERT INTO public.orders (
    type, customer_id, location_id, is_b2b, status, payment_method, payment_status,
    subtotal, discount_amount, shipping_cost, total, brugtmoms_total, vat_total, notes, confirmed_at,
    register_id, cash_session_id, staff_id, receipt_no, receipt_number, original_order_id, credit_reason,
    repair_ticket_id
  ) VALUES (
    'credit_note', orig.customer_id, p_location_id, false, 'confirmed',
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
$$;

-- CREATE OR REPLACE keeps existing privileges, but restate them so the file is self-contained.
REVOKE ALL ON FUNCTION public.pos_create_sale(uuid,uuid,uuid,uuid,jsonb,jsonb,integer,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pos_create_sale(uuid,uuid,uuid,uuid,jsonb,jsonb,integer,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.pos_create_return(uuid,uuid,uuid,uuid,jsonb,jsonb,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pos_create_return(uuid,uuid,uuid,uuid,jsonb,jsonb,text,text) TO service_role;

COMMIT;

-- Verification (run after applying; use a test case / register):
--   SELECT has_function_privilege('anon', 'public.pos_create_sale(uuid,uuid,uuid,uuid,jsonb,jsonb,integer,text,text)', 'execute');  -- false
--   -- 1. deposit:   pos_create_sale(..., '[{"type":"deposit","repair_ticket_id":"<ticket>","unit_price_oere":50000}]', '[{"type":"kontant","amount_oere":50000}]', 0, null, null)
--   -- 2. pickup:    items [{"type":"repair_service","repair_ticket_id":"<ticket>","description":"Skærm","unit_price_oere":169800},
--   --                      {"type":"deposit_applied","deposit_item_id":"<deposit order_items.id>","amount_oere":50000}], payments summing to 119800
--   --               -> repair_tickets.paid = true; same deposit again -> pos:deposit_exceeded:0
