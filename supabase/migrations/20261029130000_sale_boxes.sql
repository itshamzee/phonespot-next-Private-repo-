-- Lagersalg-kasser: fysiske udsalgskasser pr. butik (plukoplysning, ikke lagertaelling).
-- sku_stock.quantity er sandheden; sku_box_stock maa afvige uden at blokere salg.
-- Kobler nedtaelling ind i pos_create_sale (fra 20261029120000) og complete_checkout_order
-- (fra 20261005150000); eneste aendring i dem er et PERFORM public.sale_box_consume(...).
-- Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS public.sale_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  number integer NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opened_by uuid REFERENCES public.staff(id),
  closed_by uuid REFERENCES public.staff(id),
  UNIQUE (location_id, number)
);
CREATE UNIQUE INDEX IF NOT EXISTS sale_boxes_one_open_per_location ON public.sale_boxes (location_id) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.sku_box_stock (
  product_id uuid NOT NULL REFERENCES public.sku_products(id) ON DELETE CASCADE,
  box_id uuid NOT NULL REFERENCES public.sale_boxes(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, box_id)
);
CREATE INDEX IF NOT EXISTS sku_box_stock_box_idx ON public.sku_box_stock (box_id);

ALTER TABLE public.sale_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sku_box_stock ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sale_boxes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.sku_box_stock FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.sale_boxes TO service_role;
GRANT ALL ON public.sku_box_stock TO service_role;

CREATE OR REPLACE FUNCTION public.sale_box_open(p_location_id uuid, p_staff_id uuid)
 RETURNS public.sale_boxes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE loc public.locations%ROWTYPE; b public.sale_boxes%ROWTYPE; nxt integer;
BEGIN
  SELECT * INTO loc FROM public.locations WHERE id = p_location_id FOR UPDATE;
  IF NOT FOUND OR loc.type <> 'store' THEN PERFORM public.pos_fail('location_not_found'); END IF;
  IF EXISTS (SELECT 1 FROM public.sale_boxes WHERE location_id = p_location_id AND status = 'open') THEN
    PERFORM public.pos_fail('box_already_open');
  END IF;
  SELECT coalesce(max(number), 0) + 1 INTO nxt FROM public.sale_boxes WHERE location_id = p_location_id;
  INSERT INTO public.sale_boxes (location_id, number, status, opened_by)
    VALUES (p_location_id, nxt, 'open', p_staff_id) RETURNING * INTO b;
  RETURN b;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sale_box_close(p_box_id uuid, p_staff_id uuid, p_open_next boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE b public.sale_boxes%ROWTYPE; nb public.sale_boxes%ROWTYPE; opened jsonb := NULL;
BEGIN
  SELECT * INTO b FROM public.sale_boxes WHERE id = p_box_id FOR UPDATE;
  IF NOT FOUND OR b.status <> 'open' THEN PERFORM public.pos_fail('box_not_open'); END IF;
  UPDATE public.sale_boxes SET status = 'closed', closed_at = now(), closed_by = p_staff_id
    WHERE id = p_box_id RETURNING * INTO b;
  IF coalesce(p_open_next, false) THEN
    nb := public.sale_box_open(b.location_id, p_staff_id);
    opened := to_jsonb(nb);
  END IF;
  RETURN jsonb_build_object('closed', to_jsonb(b), 'opened', opened);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sale_box_add(p_product_id uuid, p_box_id uuid, p_quantity integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE b public.sale_boxes%ROWTYPE; q integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN PERFORM public.pos_fail('invalid_quantity'); END IF;
  SELECT * INTO b FROM public.sale_boxes WHERE id = p_box_id FOR UPDATE;
  IF NOT FOUND OR b.status <> 'open' THEN PERFORM public.pos_fail('box_closed'); END IF;
  INSERT INTO public.sku_box_stock (product_id, box_id, quantity)
    VALUES (p_product_id, p_box_id, p_quantity)
  ON CONFLICT (product_id, box_id)
    DO UPDATE SET quantity = public.sku_box_stock.quantity + EXCLUDED.quantity, updated_at = now()
  RETURNING quantity INTO q;
  RETURN q;
END;
$function$;

-- Tolerant: traekker hvad der findes (laveste kassenummer foerst, aabne og lukkede kasser),
-- stopper stille naar der intet er tilbage. Rejser aldrig.
CREATE OR REPLACE FUNCTION public.sale_box_consume(p_product_id uuid, p_location_id uuid, p_quantity integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE r record; remaining integer; take integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN; END IF;
  remaining := p_quantity;
  FOR r IN
    SELECT bs.box_id, bs.quantity
    FROM public.sku_box_stock bs
    JOIN public.sale_boxes b ON b.id = bs.box_id
    WHERE bs.product_id = p_product_id AND b.location_id = p_location_id AND bs.quantity > 0
    ORDER BY b.number
    FOR UPDATE OF bs
  LOOP
    take := least(remaining, r.quantity);
    UPDATE public.sku_box_stock SET quantity = quantity - take, updated_at = now()
      WHERE product_id = p_product_id AND box_id = r.box_id;
    remaining := remaining - take;
    EXIT WHEN remaining <= 0;
  END LOOP;
END;
$function$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.sale_box_open(uuid,uuid)',
    'public.sale_box_close(uuid,uuid,boolean)',
    'public.sale_box_add(uuid,uuid,integer)',
    'public.sale_box_consume(uuid,uuid,integer)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

-- complete_checkout_order: kopi af 20261005150000_reserved_qty_awareness.sql + PERFORM sale_box_consume
CREATE OR REPLACE FUNCTION public.complete_checkout_order(p_order_id uuid, p_session_id text, p_payment_id text, p_battery_item_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE o public.orders%ROWTYPE; d public.devices%ROWTYPE; i record; s record;
  unlimited boolean; remaining bigint; available bigint; take integer;
  vat bigint := 0; upgrades bigint; failure text;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Checkout order missing'; END IF;
  IF o.type <> 'online' OR p_session_id IS NULL OR o.stripe_checkout_session_id IS DISTINCT FROM p_session_id THEN
    RAISE EXCEPTION 'Checkout session mismatch';
  END IF;
  IF o.stock_committed_at IS NOT NULL THEN RETURN jsonb_build_object('status', 'already_completed'); END IF;
  IF o.status IN ('confirmed', 'shipped', 'picked_up', 'delivered') THEN
    RETURN jsonb_build_object('status', 'already_finalized');
  END IF;
  IF o.status <> 'pending' THEN RETURN jsonb_build_object('status', 'conflict', 'code', 'order_not_pending'); END IF;
  -- This subtransaction rolls back ALL stock/backfill/device writes on known conflict.
  -- The outer order lock keeps the persistent paid failure and retries serialized.
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = p_order_id) THEN
      RAISE EXCEPTION USING ERRCODE = 'PST01', MESSAGE = 'missing_order_items';
    END IF;
    FOR i IN SELECT sku_product_id, sum(quantity)::bigint AS quantity
      FROM public.order_items WHERE order_id = p_order_id AND item_type = 'sku_product'
      GROUP BY sku_product_id ORDER BY sku_product_id
    LOOP
      SELECT always_in_stock INTO unlimited FROM public.sku_products WHERE id = i.sku_product_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'PST01', MESSAGE = 'missing_sku'; END IF;
      IF unlimited THEN CONTINUE; END IF;
      PERFORM 1 FROM public.sku_stock WHERE product_id = i.sku_product_id ORDER BY location_id FOR UPDATE;
      -- Reserved stock belongs to repair cases: only quantity - reserved_qty is for sale.
      SELECT COALESCE(sum(quantity - reserved_qty), 0) INTO available FROM public.sku_stock WHERE product_id = i.sku_product_id;
      IF available < i.quantity THEN RAISE EXCEPTION USING ERRCODE = 'PST01', MESSAGE = 'insufficient_stock'; END IF;
      remaining := i.quantity;
      -- Allocation matches validation's complete inventory: online, warehouse, store.
      FOR s IN SELECT st.location_id, st.quantity - st.reserved_qty AS quantity FROM public.sku_stock st
        JOIN public.locations l ON l.id = st.location_id WHERE st.product_id = i.sku_product_id
        ORDER BY CASE l.type WHEN 'online' THEN 0 WHEN 'warehouse' THEN 1 ELSE 2 END, st.location_id
      LOOP
        take := least(remaining, s.quantity);
        UPDATE public.sku_stock SET quantity = quantity - take, updated_at = clock_timestamp()
          WHERE product_id = i.sku_product_id AND location_id = s.location_id;
        PERFORM public.sale_box_consume(i.sku_product_id, s.location_id, take);
        remaining := remaining - take;
        EXIT WHEN remaining = 0;
      END LOOP;
    END LOOP;
    FOR i IN SELECT * FROM public.order_items WHERE order_id = p_order_id AND item_type = 'device' ORDER BY device_id
    LOOP
      SELECT * INTO d FROM public.devices WHERE id = i.device_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'PST01', MESSAGE = 'missing_device'; END IF;
      IF d.source IS DISTINCT FROM 'foxway' AND (d.status <> 'reserved'
        OR i.reservation_id IS NULL OR d.reservation_id IS DISTINCT FROM i.reservation_id
        OR d.reservation_order_id IS DISTINCT FROM p_order_id
        OR d.reservation_expires_at IS NULL OR d.reservation_expires_at <= clock_timestamp()) THEN
        RAISE EXCEPTION USING ERRCODE = 'PST01', MESSAGE = 'reservation_conflict';
      END IF;
      UPDATE public.order_items SET purchase_price = d.purchase_price, vat_scheme = d.vat_scheme WHERE id = i.id;
      SELECT COALESCE(sum((u->>'price_oere')::bigint), 0) INTO upgrades
        FROM jsonb_array_elements(COALESCE(i.upgrade_details, '[]'::jsonb)) u;
      IF d.vat_scheme = 'brugtmoms' THEN
        vat := vat + greatest(0, round((i.unit_price - upgrades - d.purchase_price) * 25 / 125.0));
      END IF;
      -- Supplier quantity was already deducted during session creation/recovery.
      UPDATE public.devices SET status = 'sold' WHERE id = d.id;
    END LOOP;
    UPDATE public.order_items SET battery_upgrade = true
      WHERE order_id = p_order_id AND id = ANY(COALESCE(p_battery_item_ids, '{}'::uuid[]));
    UPDATE public.orders SET status = 'confirmed', payment_status = 'paid',
      stripe_payment_id = p_payment_id, confirmed_at = clock_timestamp(), brugtmoms_total = vat,
      stock_committed_at = clock_timestamp(), stock_failure_code = NULL, stock_failure_at = NULL
      WHERE id = p_order_id;
  EXCEPTION WHEN SQLSTATE 'PST01' THEN
    GET STACKED DIAGNOSTICS failure = MESSAGE_TEXT;
    UPDATE public.orders SET payment_status = 'paid', stripe_payment_id = p_payment_id,
      stock_failure_code = failure, stock_failure_at = clock_timestamp() WHERE id = p_order_id;
    RETURN jsonb_build_object('status', 'stock_failed', 'code', failure);
  END;
  RETURN jsonb_build_object('status', 'completed');
END;
$function$;

-- pos_create_sale: kopi af 20261029120000_lagersalg_bundle_lines.sql + PERFORM sale_box_consume
CREATE OR REPLACE FUNCTION public.pos_create_sale(p_location_id uuid, p_register_id uuid, p_staff_id uuid, p_customer_id uuid, p_items jsonb, p_payments jsonb, p_discount_amount integer, p_discount_reason text, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
  l_item uuid[] := '{}'; l_resv boolean[] := '{}';
  l_disc integer[]; l_vat integer[] := '{}';
  l_bundle integer[] := '{}'; v_bundle integer; v_bundle_total integer := 0;
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
  ti public.repair_ticket_items%ROWTYPE; v_item uuid; v_resv boolean; v_oi uuid;
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

  -- Lock every case the sale touches (named directly or through a case line) in id
  -- order, before the devices: the same order the repair_case_* functions use.
  PERFORM 1 FROM public.repair_tickets
    WHERE id IN (
      SELECT nullif(e->>'repair_ticket_id', '')::uuid FROM jsonb_array_elements(p_items) e
      UNION
      SELECT x.ticket_id FROM jsonb_array_elements(p_items) e
        JOIN public.repair_ticket_items x ON x.id = nullif(e->>'repair_ticket_item_id', '')::uuid)
    ORDER BY id FOR UPDATE;

  -- Lock devices in id order first (deadlock-free), then evaluate each line.
  PERFORM 1 FROM public.devices
    WHERE id IN (SELECT (e->>'device_id')::uuid FROM jsonb_array_elements(p_items) e WHERE e->>'type' = 'device')
    ORDER BY id FOR UPDATE;

  FOR it IN SELECT e, ord FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(e, ord) ORDER BY ord LOOP
    n := n + 1;
    v_bundle := 0;
    v_ticket := NULL; v_dep_id := NULL; v_item := NULL; v_resv := false;
    IF it.e->>'type' = 'device' THEN
      SELECT * INTO d FROM public.devices WHERE id = (it.e->>'device_id')::uuid;
      IF NOT FOUND THEN PERFORM public.pos_fail('device_not_found'); END IF;
      IF d.id = ANY (l_dev) THEN PERFORM public.pos_fail('duplicate_device', coalesce(d.barcode, d.id::text)); END IF;
      IF d.source IS NOT DISTINCT FROM 'foxway' THEN PERFORM public.pos_fail('device_not_pos_sellable', coalesce(d.barcode, d.id::text)); END IF;
      -- A device line that belongs to a repair case (an upsell on the case): the line
      -- must match the case item, and the device must be reserved for that very case.
      v_item := nullif(it.e->>'repair_ticket_item_id', '')::uuid;
      IF v_item IS NOT NULL THEN
        SELECT * INTO ti FROM public.repair_ticket_items WHERE id = v_item FOR UPDATE;
        IF NOT FOUND THEN PERFORM public.pos_fail('ticket_item_not_found'); END IF;
        IF ti.kind <> 'device' OR ti.device_id IS DISTINCT FROM d.id THEN PERFORM public.pos_fail('ticket_item_mismatch'); END IF;
        IF ti.stock_status = 'sold' OR ti.order_item_id IS NOT NULL THEN PERFORM public.pos_fail('ticket_item_sold'); END IF;
        v_ticket := ti.ticket_id;
        SELECT customer_id INTO v_ticket_customer FROM public.repair_tickets WHERE id = ti.ticket_id;
      END IF;
      -- Same availability rule as the webshop reservation lock: listed, or a
      -- reservation that has expired. A live reservation blocks the sale, except
      -- the case reservation when the line belongs to that case.
      IF NOT (d.status = 'listed'
              OR (d.status = 'reserved' AND d.reservation_expires_at IS NOT NULL
                  AND d.reservation_expires_at <= clock_timestamp())
              OR (v_item IS NOT NULL AND d.status = 'reserved' AND d.reservation_ticket_id = ti.ticket_id)) THEN
        PERFORM public.pos_fail('device_unavailable', coalesce(d.barcode, d.id::text));
      END IF;
      IF v_item IS NULL AND coalesce(d.selling_price, 0) <= 0 THEN PERFORM public.pos_fail('device_no_price', coalesce(d.barcode, d.id::text)); END IF;
      SELECT display_name INTO v_name FROM public.product_templates WHERE id = d.template_id;
      l_kind := array_append(l_kind, 'device');
      l_dev := array_append(l_dev, d.id);
      l_sku := array_append(l_sku, NULL::uuid);
      l_desc := array_append(l_desc, coalesce(v_name, 'Enhed') || coalesce(' ' || d.storage, ''));
      l_qty := array_append(l_qty, 1);
      -- The price agreed on the case (set server-side, discount reason on file) wins over the live price.
      l_unit := array_append(l_unit, CASE WHEN v_item IS NOT NULL THEN ti.unit_price_oere ELSE d.selling_price END);
      l_cost := array_append(l_cost, d.purchase_price);
      l_scheme := array_append(l_scheme, d.vat_scheme);
    ELSIF it.e->>'type' = 'sku_product' THEN
      SELECT id, title, selling_price, sale_price, cost_price INTO sp
        FROM public.sku_products WHERE id = (it.e->>'sku_product_id')::uuid;
      IF NOT FOUND THEN PERFORM public.pos_fail('sku_not_found'); END IF;
      v_qty := coalesce((it.e->>'quantity')::integer, 1);
      IF v_qty < 1 OR v_qty > 1000 THEN PERFORM public.pos_fail('invalid_quantity'); END IF;
      v_item := nullif(it.e->>'repair_ticket_item_id', '')::uuid;
      IF v_item IS NOT NULL THEN
        SELECT * INTO ti FROM public.repair_ticket_items WHERE id = v_item FOR UPDATE;
        IF NOT FOUND THEN PERFORM public.pos_fail('ticket_item_not_found'); END IF;
        IF ti.kind <> 'product' OR ti.sku_product_id IS DISTINCT FROM sp.id THEN PERFORM public.pos_fail('ticket_item_mismatch'); END IF;
        IF ti.stock_status = 'sold' OR ti.order_item_id IS NOT NULL THEN PERFORM public.pos_fail('ticket_item_sold'); END IF;
        IF ti.qty <> v_qty THEN PERFORM public.pos_fail('ticket_item_quantity', ti.qty::text); END IF;
        IF ti.stock_status = 'reserved' AND ti.location_id IS DISTINCT FROM p_location_id THEN
          PERFORM public.pos_fail('ticket_item_location');
        END IF;
        v_ticket := ti.ticket_id;
        SELECT customer_id INTO v_ticket_customer FROM public.repair_tickets WHERE id = ti.ticket_id;
        v_resv := (ti.stock_status = 'reserved');
      END IF;
      l_kind := array_append(l_kind, 'sku_product');
      l_dev := array_append(l_dev, NULL::uuid);
      l_sku := array_append(l_sku, sp.id);
      l_desc := array_append(l_desc, sp.title);
      l_qty := array_append(l_qty, v_qty);
      l_unit := array_append(l_unit, CASE WHEN v_item IS NOT NULL THEN ti.unit_price_oere
                                          WHEN sp.sale_price IS NOT NULL AND sp.sale_price < sp.selling_price
                                          THEN sp.sale_price ELSE sp.selling_price END);
      l_cost := array_append(l_cost, sp.cost_price);
      l_scheme := array_append(l_scheme, 'regular');
      -- Lagersalg 3 for 2: the amount taken off this very line (the free units).
      v_bundle := coalesce((it.e->>'bundle_discount_oere')::integer, 0);
      IF v_bundle < 0 OR v_bundle > l_unit[n] * v_qty THEN PERFORM public.pos_fail('invalid_bundle_discount'); END IF;
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
      IF NOT FOUND THEN PERFORM public.pos_fail('deposit_not_found'); END IF;
      IF dep.order_type <> 'pos' OR dep.order_status NOT IN ('confirmed', 'picked_up', 'delivered') THEN
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
    l_item := array_append(l_item, v_item);
    l_resv := array_append(l_resv, v_resv);
    l_total := array_append(l_total, l_unit[n] * l_qty[n]);
    -- Deposits (received and applied) are prepayments, never discountable.
    l_base := array_append(l_base, CASE WHEN l_kind[n] IN ('deposit', 'deposit_applied') THEN 0 ELSE l_unit[n] * l_qty[n] END);
    -- The manual discount is distributed on the amount left after 3 for 2.
    l_bundle := array_append(l_bundle, v_bundle);
    l_base[n] := l_base[n] - v_bundle;
    v_bundle_total := v_bundle_total + v_bundle;
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
      OR p_discount_reason NOT IN ('Fejl', 'Kundeservice', 'Tilbud', 'Partner', 'Andet')) THEN
    PERFORM public.pos_fail('discount_reason_required');
  END IF;
  IF v_discount > v_discountable THEN PERFORM public.pos_fail('discount_exceeds_total'); END IF;
  l_disc := public.pos_distribute_discount(l_base, v_discount);
  FOR i IN 1..n LOOP
    l_disc[i] := l_disc[i] + l_bundle[i];
  END LOOP;
  v_total := v_subtotal - v_discount - v_bundle_total;
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
    order_number, type, customer_id, location_id, is_b2b, status, payment_method, payment_status,
    subtotal, discount_amount, shipping_cost, total, brugtmoms_total, vat_total, notes, confirmed_at,
    register_id, cash_session_id, staff_id, receipt_no, receipt_number, discount_reason, repair_ticket_id,
    bundle_discount_amount
  ) VALUES (
    v_receipt_number, 'pos', v_customer, p_location_id, false, 'confirmed',
    public.pos_legacy_payment_method(v_pay_types),
    CASE WHEN v_has_invoice THEN 'pending' ELSE 'paid' END,
    v_subtotal, v_discount, 0, v_total, v_brugt_total, v_vat_total, nullif(btrim(coalesce(p_notes, '')), ''),
    clock_timestamp(), reg.id, sess_id, p_staff_id, v_receipt_no, v_receipt_number,
    CASE WHEN v_discount > 0 THEN p_discount_reason END, v_order_ticket,
    v_bundle_total
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
    ) RETURNING id INTO v_oi;
    -- A product/device line from a repair case is now sold: link the case item to the order line.
    IF l_item[i] IS NOT NULL THEN
      UPDATE public.repair_ticket_items
         SET stock_status = 'sold', order_item_id = v_oi, updated_at = clock_timestamp()
       WHERE id = l_item[i];
    END IF;
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
          AND (status = 'listed' OR (status = 'reserved' AND reservation_expires_at <= clock_timestamp())
               OR (l_item[i] IS NOT NULL AND status = 'reserved' AND reservation_ticket_id = l_ticket[i]))
        RETURNING location_id INTO v_loc;
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      IF v_rc <> 1 THEN PERFORM public.pos_fail('device_unavailable', l_dev[i]::text); END IF;
      INSERT INTO public.stock_movements (location_id, device_id, qty_delta, reason, ref_order_id, staff_id)
        VALUES (v_loc, l_dev[i], -1, 'sale', v_order_id, p_staff_id);
    END IF;
  END LOOP;

  -- Accessories: decrement at THIS register's location (never the online location).
  -- A plain line needs quantity - reserved_qty >= q (reserved stock belongs to repair
  -- cases); lines that come from a case's own reservation consume that reservation.
  -- Products with always_in_stock are never counted.
  FOR sp IN
    SELECT u.sku AS sku_id, sum(u.q)::integer AS q,
           sum(CASE WHEN u.resv THEN u.q ELSE 0 END)::integer AS q_res
    FROM unnest(l_sku, l_qty, l_kind, l_resv) AS u(sku, q, kind, resv)
    WHERE u.kind = 'sku_product' GROUP BY u.sku ORDER BY u.sku
  LOOP
    SELECT always_in_stock, title INTO v_unlimited, v_title FROM public.sku_products WHERE id = sp.sku_id;
    IF coalesce(v_unlimited, false) THEN
      IF sp.q_res > 0 THEN
        UPDATE public.sku_stock SET reserved_qty = greatest(reserved_qty - sp.q_res, 0), updated_at = clock_timestamp()
          WHERE product_id = sp.sku_id AND location_id = p_location_id;
      END IF;
      CONTINUE;
    END IF;
    UPDATE public.sku_stock
       SET quantity = quantity - sp.q, reserved_qty = reserved_qty - sp.q_res, updated_at = clock_timestamp()
     WHERE product_id = sp.sku_id AND location_id = p_location_id
       AND reserved_qty >= sp.q_res AND quantity - reserved_qty >= sp.q - sp.q_res;
    IF NOT FOUND THEN PERFORM public.pos_fail('insufficient_stock', v_title); END IF;
    INSERT INTO public.stock_movements (location_id, sku_product_id, qty_delta, reason, ref_order_id, staff_id)
      VALUES (p_location_id, sp.sku_id, -sp.q, 'sale', v_order_id, p_staff_id);
    PERFORM public.sale_box_consume(sp.sku_id, p_location_id, sp.q);
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
    'repair_ticket_id', v_order_ticket, 'deposit_applied', v_applied_total, 'case_paid', v_has_repair,
    'bundle_discount', v_bundle_total);
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_checkout_order(uuid,text,text,uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_checkout_order(uuid,text,text,uuid[]) TO service_role;

REVOKE ALL ON FUNCTION public.pos_create_sale(uuid,uuid,uuid,uuid,jsonb,jsonb,integer,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pos_create_sale(uuid,uuid,uuid,uuid,jsonb,jsonb,integer,text,text) TO service_role;

COMMIT;
