-- POS foundation, part 2 of 2: transactional functions.
-- Apply AFTER 20261003120000_pos_foundation_tables.sql.
--
-- Every function is SECURITY DEFINER with a pinned search_path and is callable by
-- service_role only. Business errors are raised with SQLSTATE 'PS001' and a
-- message of the form  pos:<code>[:<detail>]  which src/lib/pos/errors.ts maps to
-- Danish messages.
--
--   pos_create_sale              one transaction: order, items, device lock,
--                                accessory stock at the register's location,
--                                payments, stock movements, receipt number
--   pos_create_return            credit note (never edits the original order)
--   pos_open_cash_session / pos_close_cash_session / pos_add_session_adjustment
--   pos_adjust_stock             manual stock adjustment / goods receipt
--
-- Amounts are integer oere, VAT-inclusive. Brugtmoms = 25/125 of the margin, with
-- the margin taken on the line price AFTER its share of the discount.

BEGIN;

CREATE OR REPLACE FUNCTION public.pos_fail(p_code text, p_detail text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION '%', CASE WHEN p_detail IS NULL THEN 'pos:' || p_code ELSE 'pos:' || p_code || ':' || p_detail END
    USING ERRCODE = 'PS001';
END;
$$;

-- Largest-remainder distribution; mirrors distributeDiscount() in src/lib/pos/calc.ts.
CREATE OR REPLACE FUNCTION public.pos_distribute_discount(p_totals integer[], p_discount integer)
RETURNS integer[]
LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog, public AS $$
DECLARE
  n integer := coalesce(array_length(p_totals, 1), 0);
  base bigint := 0;
  res integer[] := '{}';
  rema bigint[] := '{}';
  taken boolean[] := '{}';
  allocated bigint := 0;
  left_over bigint;
  i integer;
  best integer;
  prod bigint;
BEGIN
  FOR i IN 1..n LOOP
    base := base + p_totals[i];
    res := array_append(res, 0);
    rema := array_append(rema, 0::bigint);
    taken := array_append(taken, false);
  END LOOP;
  IF p_discount <= 0 OR base <= 0 THEN RETURN res; END IF;
  IF p_discount > base THEN RAISE EXCEPTION 'pos:discount_exceeds_total' USING ERRCODE = 'PS001'; END IF;
  FOR i IN 1..n LOOP
    prod := p_discount::bigint * p_totals[i];
    res[i] := (prod / base)::integer;
    rema[i] := prod - (res[i]::bigint * base);
    allocated := allocated + res[i];
  END LOOP;
  left_over := p_discount - allocated;
  WHILE left_over > 0 LOOP
    best := 0;
    FOR i IN 1..n LOOP
      IF NOT taken[i] AND rema[i] > 0 AND (best = 0 OR rema[i] > rema[best]) THEN best := i; END IF;
    END LOOP;
    EXIT WHEN best = 0;
    res[best] := res[best] + 1;
    taken[best] := true;
    left_over := left_over - 1;
  END LOOP;
  RETURN res;
END;
$$;

-- Maps a list of payment types to the legacy orders.payment_method summary.
CREATE OR REPLACE FUNCTION public.pos_legacy_payment_method(p_types text[]) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT CASE
    WHEN p_types IS NULL OR cardinality(p_types) = 0 THEN NULL
    WHEN (SELECT count(DISTINCT t) FROM unnest(p_types) t) > 1 THEN 'split'
    WHEN p_types[1] = 'kontant' THEN 'cash'
    WHEN p_types[1] = 'kort_terminal' THEN 'card'
    ELSE p_types[1]
  END;
$$;

-- ============================================================
-- pos_create_sale
--   p_items:    [{type:'device', device_id}
--                {type:'sku_product', sku_product_id, quantity}
--                {type:'free_text', description, unit_price_oere, quantity?}
--                {type:'deposit', description?, unit_price_oere}]
--   p_payments: [{type, amount_oere, reference?}]  (must sum to the total)
-- ============================================================
CREATE OR REPLACE FUNCTION public.pos_create_sale(
  p_location_id uuid, p_register_id uuid, p_staff_id uuid, p_customer_id uuid,
  p_items jsonb, p_payments jsonb, p_discount_amount integer, p_discount_reason text, p_notes text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  reg public.registers%ROWTYPE;
  sess_id uuid;
  v_discount integer := coalesce(p_discount_amount, 0);
  it record; d public.devices%ROWTYPE; sp record; pay record;
  v_name text; v_qty integer; v_unit integer; v_desc text;
  n integer := 0; i integer;
  l_kind text[] := '{}'; l_dev uuid[] := '{}'; l_sku uuid[] := '{}'; l_desc text[] := '{}';
  l_qty integer[] := '{}'; l_unit integer[] := '{}'; l_total integer[] := '{}';
  l_cost integer[] := '{}'; l_scheme text[] := '{}'; l_base integer[] := '{}';
  l_disc integer[]; l_vat integer[] := '{}';
  v_net integer; v_margin integer;
  v_subtotal integer := 0; v_total integer; v_discountable integer := 0;
  v_vat_total integer := 0; v_brugt_total integer := 0;
  v_pay_sum integer := 0; v_pay_types text[] := '{}'; v_has_invoice boolean := false;
  v_receipt_no integer; v_receipt_number text;
  v_order_id uuid; v_order_number text;
  v_rc integer; v_loc uuid; v_unlimited boolean; v_title text;
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
    ELSIF it.e->>'type' IN ('free_text', 'deposit') THEN
      v_desc := left(btrim(coalesce(it.e->>'description', '')), 200);
      IF v_desc = '' AND it.e->>'type' = 'deposit' THEN v_desc := 'Depositum'; END IF;
      IF v_desc = '' THEN PERFORM public.pos_fail('description_required'); END IF;
      v_unit := (it.e->>'unit_price_oere')::integer;
      IF v_unit IS NULL OR v_unit <= 0 THEN PERFORM public.pos_fail('invalid_price'); END IF;
      v_qty := CASE WHEN it.e->>'type' = 'deposit' THEN 1 ELSE coalesce((it.e->>'quantity')::integer, 1) END;
      IF v_qty < 1 OR v_qty > 1000 THEN PERFORM public.pos_fail('invalid_quantity'); END IF;
      l_kind := array_append(l_kind, it.e->>'type');
      l_dev := array_append(l_dev, NULL::uuid);
      l_sku := array_append(l_sku, NULL::uuid);
      l_desc := array_append(l_desc, v_desc);
      l_qty := array_append(l_qty, v_qty);
      l_unit := array_append(l_unit, v_unit);
      l_cost := array_append(l_cost, NULL::integer);
      l_scheme := array_append(l_scheme, 'regular');  -- Depositum and Diverse salg carry 25 % moms
    ELSE
      PERFORM public.pos_fail('invalid_item_type');
    END IF;
    l_total := array_append(l_total, l_unit[n] * l_qty[n]);
    l_base := array_append(l_base, CASE WHEN l_kind[n] = 'deposit' THEN 0 ELSE l_unit[n] * l_qty[n] END);
    v_subtotal := v_subtotal + l_unit[n] * l_qty[n];
    v_discountable := v_discountable + l_base[n];
  END LOOP;

  -- Discount: reason required, distributed proportionally, THEN VAT per line.
  IF v_discount < 0 THEN PERFORM public.pos_fail('invalid_discount'); END IF;
  IF v_discount > 0 AND (p_discount_reason IS NULL
      OR p_discount_reason NOT IN ('Fejl', 'Kundeservice', 'Tilbud', 'Andet')) THEN
    PERFORM public.pos_fail('discount_reason_required');
  END IF;
  IF v_discount > v_discountable THEN PERFORM public.pos_fail('discount_exceeds_total'); END IF;
  l_disc := public.pos_distribute_discount(l_base, v_discount);
  v_total := v_subtotal - v_discount;

  FOR i IN 1..n LOOP
    v_net := l_total[i] - l_disc[i];
    IF l_scheme[i] = 'brugtmoms' THEN
      v_margin := v_net - coalesce(l_cost[i], 0) * l_qty[i];
      l_vat := array_append(l_vat, CASE WHEN v_margin > 0 THEN round(v_margin::numeric * 25 / 125)::integer ELSE 0 END);
      v_brugt_total := v_brugt_total + l_vat[i];
    ELSE
      l_vat := array_append(l_vat, round(v_net::numeric * 25 / 125)::integer);
      v_vat_total := v_vat_total + l_vat[i];
    END IF;
  END LOOP;

  -- Payments: positive amounts that sum to exactly the total.
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
  IF v_has_invoice AND p_customer_id IS NULL THEN PERFORM public.pos_fail('customer_required_for_invoice'); END IF;

  -- Receipt number: sequential per register, never reused (counter lives under
  -- the register row lock taken above; a rolled-back sale rolls the counter back too).
  UPDATE public.registers SET last_receipt_no = last_receipt_no + 1 WHERE id = reg.id
    RETURNING last_receipt_no INTO v_receipt_no;
  v_receipt_number := reg.code || '-' || lpad(v_receipt_no::text, 6, '0');

  INSERT INTO public.orders (
    type, customer_id, location_id, is_b2b, status, payment_method, payment_status,
    subtotal, discount_amount, shipping_cost, total, brugtmoms_total, vat_total, notes, confirmed_at,
    register_id, cash_session_id, staff_id, receipt_no, receipt_number, discount_reason
  ) VALUES (
    'pos', p_customer_id, p_location_id, false, 'confirmed',
    public.pos_legacy_payment_method(v_pay_types),
    CASE WHEN v_has_invoice THEN 'pending' ELSE 'paid' END,
    v_subtotal, v_discount, 0, v_total, v_brugt_total, v_vat_total, nullif(btrim(coalesce(p_notes, '')), ''),
    clock_timestamp(), reg.id, sess_id, p_staff_id, v_receipt_no, v_receipt_number,
    CASE WHEN v_discount > 0 THEN p_discount_reason END
  ) RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR i IN 1..n LOOP
    INSERT INTO public.order_items (
      order_id, item_type, device_id, sku_product_id, quantity, unit_price, total_price,
      purchase_price, vat_scheme, description, discount_amount, vat_amount
    ) VALUES (
      v_order_id, l_kind[i], l_dev[i], l_sku[i], l_qty[i], l_unit[i], l_total[i],
      l_cost[i], l_scheme[i], l_desc[i], l_disc[i], l_vat[i]
    );
  END LOOP;

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
    'payments', coalesce(p_payments, '[]'::jsonb), 'item_count', n));

  RETURN jsonb_build_object(
    'order_id', v_order_id, 'order_number', v_order_number, 'receipt_number', v_receipt_number,
    'receipt_no', v_receipt_no, 'subtotal', v_subtotal, 'discount', v_discount, 'total', v_total,
    'vat_total', v_vat_total, 'brugtmoms_total', v_brugt_total, 'cash_session_id', sess_id);
END;
$$;

-- ============================================================
-- pos_create_return: credit note against a POS sale.
--   p_lines:   [{order_item_id, quantity, restock}]
--   p_refunds: [{type: kontant|kort_terminal|mobilepay|tilgodebevis, amount_oere (positive), reference?}]
-- The original order and its items are only read, never updated.
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
  v_unlimited boolean;
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
  -- Sales made before this migration kept the discount on the order only, so a
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

    n := n + 1;
    c_oi := array_append(c_oi, oi.id); c_qty := array_append(c_qty, rq);
    c_tot := array_append(c_tot, v_tot); c_dis := array_append(c_dis, v_dis);
    c_vat := array_append(c_vat, v_vat); c_restock := array_append(c_restock, v_restock);
    v_subtotal := v_subtotal + v_tot; v_discount := v_discount + v_dis;
    IF oi.vat_scheme = 'brugtmoms' THEN v_brugt_total := v_brugt_total + v_vat; ELSE v_vat_total := v_vat_total + v_vat; END IF;
  END LOOP;
  IF n = 0 THEN PERFORM public.pos_fail('return_nothing'); END IF;
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
    register_id, cash_session_id, staff_id, receipt_no, receipt_number, original_order_id, credit_reason
  ) VALUES (
    'credit_note', orig.customer_id, p_location_id, false, 'confirmed',
    public.pos_legacy_payment_method(v_pay_types), 'paid',
    -v_subtotal, -v_discount, 0, -v_total, -v_brugt_total, -v_vat_total,
    nullif(btrim(coalesce(p_notes, '')), ''), clock_timestamp(),
    reg.id, sess_id, p_staff_id, v_receipt_no, v_receipt_number, orig.id, btrim(p_reason)
  ) RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR i IN 1..n LOOP
    SELECT * INTO oi FROM public.order_items WHERE id = c_oi[i];
    INSERT INTO public.order_items (
      order_id, item_type, device_id, sku_product_id, quantity, unit_price, total_price,
      purchase_price, vat_scheme, description, discount_amount, vat_amount, original_order_item_id
    ) VALUES (
      v_order_id, oi.item_type, oi.device_id, oi.sku_product_id, -c_qty[i], oi.unit_price, -c_tot[i],
      oi.purchase_price, oi.vat_scheme, oi.description, -c_dis[i], -c_vat[i], oi.id
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
    END IF;
  END LOOP;

  FOR pay IN SELECT e FROM jsonb_array_elements(coalesce(p_refunds, '[]'::jsonb)) e LOOP
    INSERT INTO public.order_payments (order_id, type, amount_oere, reference)
      VALUES (v_order_id, pay.e->>'type', -(pay.e->>'amount_oere')::integer, nullif(btrim(coalesce(pay.e->>'reference', '')), ''));
  END LOOP;

  INSERT INTO public.activity_log (actor_id, actor_type, action, entity_type, entity_id, details)
  VALUES (p_staff_id, 'staff', 'pos_return', 'order', v_order_id, jsonb_build_object(
    'receipt_number', v_receipt_number, 'original_order_id', orig.id, 'original_order_number', orig.order_number,
    'register_id', reg.id, 'refund', v_total, 'reason', btrim(p_reason), 'refunds', coalesce(p_refunds, '[]'::jsonb)));

  RETURN jsonb_build_object(
    'order_id', v_order_id, 'order_number', v_order_number, 'receipt_number', v_receipt_number,
    'receipt_no', v_receipt_no, 'total', -v_total, 'refund_amount', v_total,
    'original_order_id', orig.id, 'cash_session_id', sess_id);
END;
$$;

-- ============================================================
-- Cash sessions
-- ============================================================
CREATE OR REPLACE FUNCTION public.pos_session_net_cash(p_session_id uuid) RETURNS integer
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT coalesce(sum(p.amount_oere), 0)::integer
  FROM public.order_payments p JOIN public.orders o ON o.id = p.order_id
  WHERE o.cash_session_id = p_session_id AND p.type = 'kontant';
$$;

CREATE OR REPLACE FUNCTION public.pos_open_cash_session(p_register_id uuid, p_staff_id uuid, p_opening_float integer)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE reg public.registers%ROWTYPE; v_id uuid;
BEGIN
  SELECT * INTO reg FROM public.registers WHERE id = p_register_id FOR UPDATE;
  IF NOT FOUND OR NOT reg.active THEN PERFORM public.pos_fail('register_not_found'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND is_active) THEN
    PERFORM public.pos_fail('staff_not_found');
  END IF;
  IF p_opening_float IS NULL OR p_opening_float < 0 THEN PERFORM public.pos_fail('invalid_opening_float'); END IF;
  IF EXISTS (SELECT 1 FROM public.cash_sessions WHERE register_id = p_register_id AND closed_at IS NULL) THEN
    PERFORM public.pos_fail('session_already_open');
  END IF;
  INSERT INTO public.cash_sessions (register_id, opened_by, opening_float)
    VALUES (p_register_id, p_staff_id, p_opening_float) RETURNING id INTO v_id;
  INSERT INTO public.activity_log (actor_id, actor_type, action, entity_type, entity_id, details)
    VALUES (p_staff_id, 'staff', 'pos_session_open', 'cash_session', v_id,
            jsonb_build_object('register_id', p_register_id, 'opening_float', p_opening_float));
  RETURN jsonb_build_object('session_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_close_cash_session(
  p_session_id uuid, p_staff_id uuid, p_counted_cash integer, p_cash_to_bank integer,
  p_expenses jsonb, p_notes text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE s public.cash_sessions%ROWTYPE; e record; v_exp integer := 0; v_net integer; v_expected integer; v_diff integer;
BEGIN
  SELECT * INTO s FROM public.cash_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.pos_fail('session_not_found'); END IF;
  IF s.locked OR s.closed_at IS NOT NULL THEN PERFORM public.pos_fail('session_closed'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND is_active) THEN
    PERFORM public.pos_fail('staff_not_found');
  END IF;
  IF p_counted_cash IS NULL OR p_counted_cash < 0 THEN PERFORM public.pos_fail('invalid_counted_cash'); END IF;
  IF p_cash_to_bank IS NULL OR p_cash_to_bank < 0 OR p_cash_to_bank > p_counted_cash THEN
    PERFORM public.pos_fail('invalid_cash_to_bank');
  END IF;
  FOR e IN SELECT x FROM jsonb_array_elements(coalesce(p_expenses, '[]'::jsonb)) x LOOP
    IF btrim(coalesce(e.x->>'description', '')) = '' OR (e.x->>'amount_oere')::integer IS NULL
       OR (e.x->>'amount_oere')::integer <= 0 THEN
      PERFORM public.pos_fail('invalid_expense');
    END IF;
    v_exp := v_exp + (e.x->>'amount_oere')::integer;
  END LOOP;

  -- Serialise against in-flight sales on this register (sales lock the register row).
  PERFORM 1 FROM public.registers WHERE id = s.register_id FOR UPDATE;
  v_net := public.pos_session_net_cash(s.id);
  v_expected := s.opening_float + v_net - v_exp;
  v_diff := p_counted_cash - v_expected;

  UPDATE public.cash_sessions SET
    closed_at = clock_timestamp(), closed_by = p_staff_id, counted_cash = p_counted_cash,
    expected_cash = v_expected, difference = v_diff, cash_to_bank = p_cash_to_bank,
    expenses = coalesce(p_expenses, '[]'::jsonb), notes = nullif(btrim(coalesce(p_notes, '')), ''), locked = true
  WHERE id = s.id;

  INSERT INTO public.activity_log (actor_id, actor_type, action, entity_type, entity_id, details)
    VALUES (p_staff_id, 'staff', 'pos_session_close', 'cash_session', s.id,
            jsonb_build_object('register_id', s.register_id, 'counted', p_counted_cash,
                               'expected', v_expected, 'difference', v_diff, 'cash_to_bank', p_cash_to_bank));
  RETURN jsonb_build_object('session_id', s.id, 'expected_cash', v_expected, 'counted_cash', p_counted_cash,
                            'difference', v_diff, 'net_cash_payments', v_net, 'expenses_total', v_exp);
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_add_session_adjustment(
  p_session_id uuid, p_staff_id uuid, p_amount_oere integer, p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE s public.cash_sessions%ROWTYPE; v_id uuid;
BEGIN
  SELECT * INTO s FROM public.cash_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN PERFORM public.pos_fail('session_not_found'); END IF;
  IF NOT s.locked THEN PERFORM public.pos_fail('session_not_locked'); END IF;
  IF p_amount_oere IS NULL OR p_amount_oere = 0 THEN PERFORM public.pos_fail('invalid_adjustment'); END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN PERFORM public.pos_fail('adjustment_reason_required'); END IF;
  INSERT INTO public.cash_session_adjustments (session_id, amount_oere, reason, staff_id)
    VALUES (s.id, p_amount_oere, btrim(p_reason), p_staff_id) RETURNING id INTO v_id;
  INSERT INTO public.activity_log (actor_id, actor_type, action, entity_type, entity_id, details)
    VALUES (p_staff_id, 'staff', 'pos_session_adjust', 'cash_session', s.id,
            jsonb_build_object('amount', p_amount_oere, 'reason', btrim(p_reason)));
  RETURN jsonb_build_object('adjustment_id', v_id);
END;
$$;

-- ============================================================
-- pos_adjust_stock: manual correction or goods receipt for an accessory.
-- ============================================================
CREATE OR REPLACE FUNCTION public.pos_adjust_stock(
  p_product_id uuid, p_location_id uuid, p_delta integer, p_reason text, p_note text, p_staff_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_qty integer;
BEGIN
  IF p_reason NOT IN ('adjust', 'receive') THEN PERFORM public.pos_fail('invalid_stock_reason'); END IF;
  IF p_delta IS NULL OR p_delta = 0 THEN PERFORM public.pos_fail('invalid_stock_delta'); END IF;
  IF p_reason = 'adjust' AND btrim(coalesce(p_note, '')) = '' THEN PERFORM public.pos_fail('stock_note_required'); END IF;
  IF p_reason = 'receive' AND p_delta < 0 THEN PERFORM public.pos_fail('invalid_stock_delta'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sku_products WHERE id = p_product_id) THEN PERFORM public.pos_fail('sku_not_found'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_location_id) THEN PERFORM public.pos_fail('location_not_found'); END IF;

  SELECT quantity INTO v_qty FROM public.sku_stock
    WHERE product_id = p_product_id AND location_id = p_location_id FOR UPDATE;
  IF coalesce(v_qty, 0) + p_delta < 0 THEN PERFORM public.pos_fail('stock_would_go_negative'); END IF;
  INSERT INTO public.sku_stock (product_id, location_id, quantity)
    VALUES (p_product_id, p_location_id, p_delta)
    ON CONFLICT (product_id, location_id)
    DO UPDATE SET quantity = public.sku_stock.quantity + p_delta, updated_at = clock_timestamp()
    RETURNING quantity INTO v_qty;

  INSERT INTO public.stock_movements (location_id, sku_product_id, qty_delta, reason, ref_note, staff_id)
    VALUES (p_location_id, p_product_id, p_delta, p_reason, nullif(btrim(coalesce(p_note, '')), ''), p_staff_id);
  RETURN jsonb_build_object('quantity', v_qty);
END;
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.pos_fail(text,text)',
    'public.pos_distribute_discount(integer[],integer)',
    'public.pos_legacy_payment_method(text[])',
    'public.pos_create_sale(uuid,uuid,uuid,uuid,jsonb,jsonb,integer,text,text)',
    'public.pos_create_return(uuid,uuid,uuid,uuid,jsonb,jsonb,text,text)',
    'public.pos_session_net_cash(uuid)',
    'public.pos_open_cash_session(uuid,uuid,integer)',
    'public.pos_close_cash_session(uuid,uuid,integer,integer,jsonb,text)',
    'public.pos_add_session_adjustment(uuid,uuid,integer,text)',
    'public.pos_adjust_stock(uuid,uuid,integer,text,text,uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

COMMIT;

-- Verification (run after applying):
--   SELECT pos_distribute_discount(ARRAY[10000, 20000, 30000], 1000);   -- {167,333,500}; sums to 1000
--   SELECT proname, prosecdef FROM pg_proc WHERE proname LIKE 'pos\_%' ORDER BY 1;  -- 10 rows, SECURITY DEFINER on the pos_create_*/session/stock ones
--   SELECT has_function_privilege('anon', 'public.pos_create_sale(uuid,uuid,uuid,uuid,jsonb,jsonb,integer,text,text)', 'execute');  -- false
