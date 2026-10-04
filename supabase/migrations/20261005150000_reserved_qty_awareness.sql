-- Ny sag: lager der er reserveret til en reparationssag (sku_stock.reserved_qty) er ikke til salg.
-- Kør EFTER 20261005140000_pos_create_sale_repair_items.sql.
--
-- Erstatter, uden anden ændring end at tilgængeligt = quantity - reserved_qty:
--   * complete_checkout_order (webshoppens betaling; seneste definition 20261002120000_brugtmoms_20_procent.sql):
--     tilgængeligt antal og fordelingen over lokationer bruger quantity - reserved_qty.
--     Alt andet (brugtmoms 25/125, reservationer, fejlkoder) er uændret.
--   * transfer_send (seneste definition 20261004400100): en overførsel kan ikke sende reserveret lager.
--   * checkout_sku_inventory: store_stock / online_stock / total_stock er nu tilgængeligt lager.
--     Samme kolonner og typer som før.
--   * stock_overview: udvides (kolonner til sidst) med repair_only, reserved_vejle, reserved_slagelse,
--     og viser nu også reservedele med repair_only selv om de er is_active = false, så ejeren kan
--     taste lager ind på dem under /admin/varer.
--
-- Antagelser (verificér): ingen anden migration har ændret disse fire objekter efter de nævnte filer.
-- Hvis den ene er ændret i prod, så sammenlign pg_get_functiondef / pg_get_viewdef før kørsel.
--
-- Idempotent og transaktionel.

BEGIN;

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

CREATE OR REPLACE FUNCTION public.transfer_send(p_transfer_id uuid, p_staff_id uuid, p_lines jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  t public.stock_transfers%ROWTYPE; ln record; ov jsonb; v_qty integer; v_have integer;
  v_ids uuid[]; v_id uuid; v_rc integer; v_note text; v_sent integer;
BEGIN
  SELECT * INTO t FROM public.stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.transfer_fail('not_found'); END IF;
  IF t.status <> 'requested' THEN PERFORM public.transfer_fail('not_requested', t.status); END IF;
  PERFORM public.transfer_check_actor(p_staff_id, t.from_location_id);
  v_note := 'Overførsel #' || t.number || ' sendt';

  FOR ln IN SELECT * FROM public.stock_transfer_lines WHERE transfer_id = t.id ORDER BY created_at, id LOOP
    ov := NULL;
    IF p_lines IS NOT NULL AND jsonb_typeof(p_lines) = 'array' THEN
      SELECT x INTO ov FROM jsonb_array_elements(p_lines) x WHERE (x->>'line_id')::uuid = ln.id LIMIT 1;
    END IF;
    v_qty := coalesce((ov->>'qty')::integer, ln.qty);
    IF v_qty < 0 OR v_qty > ln.qty THEN PERFORM public.transfer_fail('invalid_quantity'); END IF;
    IF v_qty = 0 THEN
      DELETE FROM public.stock_transfer_lines WHERE id = ln.id;
      CONTINUE;
    END IF;

    IF ln.sku_product_id IS NOT NULL THEN
      SELECT quantity - reserved_qty INTO v_have FROM public.sku_stock
        WHERE product_id = ln.sku_product_id AND location_id = t.from_location_id FOR UPDATE;
      IF coalesce(v_have, 0) < v_qty THEN PERFORM public.transfer_fail('insufficient_stock', ln.description); END IF;
      UPDATE public.sku_stock SET quantity = quantity - v_qty, updated_at = clock_timestamp()
        WHERE product_id = ln.sku_product_id AND location_id = t.from_location_id;
      INSERT INTO public.stock_movements (location_id, sku_product_id, qty_delta, reason, ref_note, staff_id)
        VALUES (t.from_location_id, ln.sku_product_id, -v_qty, 'transfer', v_note, p_staff_id);
      UPDATE public.stock_transfer_lines SET sent_qty = v_qty WHERE id = ln.id;

    ELSIF ln.device_id IS NOT NULL THEN
      UPDATE public.devices SET status = 'in_transit', updated_at = clock_timestamp()
        WHERE id = ln.device_id AND status = 'listed' AND location_id = t.from_location_id;
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      IF v_rc <> 1 THEN PERFORM public.transfer_fail('device_unavailable', ln.device_id::text); END IF;
      INSERT INTO public.stock_movements (location_id, device_id, qty_delta, reason, ref_note, staff_id)
        VALUES (t.from_location_id, ln.device_id, -1, 'transfer', v_note, p_staff_id);
      UPDATE public.stock_transfer_lines SET sent_qty = 1 WHERE id = ln.id;

    ELSE
      -- Anmodet enhedsgruppe: konkrete enheder fra afsenderen (valgt eller ældste først).
      v_ids := ARRAY(SELECT (x)::uuid FROM jsonb_array_elements_text(coalesce(ov->'device_ids', '[]'::jsonb)) x);
      IF cardinality(v_ids) > 0 THEN
        IF cardinality(v_ids) <> v_qty THEN PERFORM public.transfer_fail('invalid_quantity'); END IF;
      ELSE
        FOR v_id IN
          SELECT d.id FROM public.devices d
          WHERE d.template_id = ln.template_id AND d.storage IS NOT DISTINCT FROM ln.storage AND d.grade = ln.grade
            AND d.status = 'listed' AND d.location_id = t.from_location_id AND d.source IS DISTINCT FROM 'foxway'
            AND NOT EXISTS (
              SELECT 1 FROM public.stock_transfer_lines l2 JOIN public.stock_transfers t2 ON t2.id = l2.transfer_id
              WHERE l2.device_id = d.id AND t2.status IN ('requested', 'sent'))
          ORDER BY d.purchased_at, d.id
          LIMIT v_qty FOR UPDATE SKIP LOCKED
        LOOP
          v_ids := array_append(v_ids, v_id);
        END LOOP;
        IF cardinality(v_ids) < v_qty THEN PERFORM public.transfer_fail('insufficient_devices', ln.description); END IF;
      END IF;

      FOREACH v_id IN ARRAY v_ids LOOP
        UPDATE public.devices SET status = 'in_transit', updated_at = clock_timestamp()
          WHERE id = v_id AND status = 'listed' AND location_id = t.from_location_id
            AND template_id = ln.template_id AND storage IS NOT DISTINCT FROM ln.storage AND grade = ln.grade;
        GET DIAGNOSTICS v_rc = ROW_COUNT;
        IF v_rc <> 1 THEN PERFORM public.transfer_fail('device_unavailable', v_id::text); END IF;
        INSERT INTO public.stock_transfer_lines (transfer_id, device_id, description, qty, sent_qty)
          VALUES (t.id, v_id, ln.description, 1, 1);
        INSERT INTO public.stock_movements (location_id, device_id, qty_delta, reason, ref_note, staff_id)
          VALUES (t.from_location_id, v_id, -1, 'transfer', v_note, p_staff_id);
      END LOOP;
      DELETE FROM public.stock_transfer_lines WHERE id = ln.id;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_sent FROM public.stock_transfer_lines WHERE transfer_id = t.id AND sent_qty > 0;
  IF v_sent = 0 THEN PERFORM public.transfer_fail('nothing_to_send'); END IF;

  UPDATE public.stock_transfers SET status = 'sent', sent_by = p_staff_id, sent_at = clock_timestamp() WHERE id = t.id;
  RETURN jsonb_build_object('id', t.id, 'number', t.number, 'status', 'sent', 'lines', v_sent);
END;
$$;

CREATE OR REPLACE VIEW public.checkout_sku_inventory AS
SELECT p.id, p.title, p.slug, p.subcategory, p.brand, p.selling_price,
  p.always_in_stock, p.sale_price, p.images, p.compatible_models,
  p.variant_label, p.status, p.created_at, p.is_active, p.category, p.attributes,
  COALESCE(s.store_stock, 0) AS store_stock,
  COALESCE(s.online_stock, 0) AS online_stock,
  COALESCE(s.total_stock, 0) AS total_stock
FROM public.sku_products p
LEFT JOIN (
  SELECT st.product_id,
    sum(st.quantity - st.reserved_qty) FILTER (WHERE l.type = 'store') AS store_stock,
    sum(st.quantity - st.reserved_qty) FILTER (WHERE l.type <> 'store') AS online_stock,
    sum(st.quantity - st.reserved_qty) AS total_stock
  FROM public.sku_stock st JOIN public.locations l ON l.id = st.location_id
  GROUP BY st.product_id
) s ON s.product_id = p.id;;

CREATE OR REPLACE VIEW public.stock_overview AS
WITH sku_rows AS (
  SELECT
    'sku:' || p.id::text AS row_key,
    'sku'::text AS kind,
    p.id AS sku_product_id,
    NULL::uuid AS template_id,
    NULL::text AS storage,
    NULL::text AS grade,
    p.title AS name,
    CASE WHEN p.subcategory = 'spare-part' OR p.category = 'spare-part' THEN 'reservedel' ELSE 'tilbehoer' END AS item_type,
    'regular'::text AS vat_scheme,
    p.cost_price::bigint AS cost_price,
    (CASE WHEN p.sale_price IS NOT NULL AND p.sale_price < p.selling_price THEN p.sale_price ELSE p.selling_price END)::bigint AS price,
    (CASE WHEN p.sale_price IS NOT NULL AND p.sale_price < p.selling_price THEN p.sale_price ELSE p.selling_price END)::bigint AS price_max,
    coalesce(p.always_in_stock, false) AS always_in_stock,
    coalesce(s.qty_vejle, 0)::int AS qty_vejle,
    coalesce(s.qty_slagelse, 0)::int AS qty_slagelse,
    coalesce(s.qty_webshop, 0)::int AS qty_webshop,
    s.min_vejle, s.min_slagelse, s.min_webshop,
    coalesce(tr.in_transit, 0)::int AS in_transit,
    lower(concat_ws(' ', p.title, p.ean, p.product_number)) AS search_text,
    coalesce(p.repair_only, false) AS repair_only,
    coalesce(s.res_vejle, 0)::int AS reserved_vejle,
    coalesce(s.res_slagelse, 0)::int AS reserved_slagelse
  FROM public.sku_products p
  LEFT JOIN LATERAL (
    SELECT
      sum(st.quantity) FILTER (WHERE l.slug = 'vejle') AS qty_vejle,
      sum(st.quantity) FILTER (WHERE l.slug = 'slagelse') AS qty_slagelse,
      sum(st.quantity) FILTER (WHERE l.slug = 'webshop') AS qty_webshop,
      max(st.min_level) FILTER (WHERE l.slug = 'vejle') AS min_vejle,
      max(st.min_level) FILTER (WHERE l.slug = 'slagelse') AS min_slagelse,
      max(st.min_level) FILTER (WHERE l.slug = 'webshop') AS min_webshop,
      sum(st.reserved_qty) FILTER (WHERE l.slug = 'vejle') AS res_vejle,
      sum(st.reserved_qty) FILTER (WHERE l.slug = 'slagelse') AS res_slagelse
    FROM public.sku_stock st JOIN public.locations l ON l.id = st.location_id
    WHERE st.product_id = p.id
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT sum(ln.sent_qty - ln.received_qty - ln.returned_qty) AS in_transit
    FROM public.stock_transfer_lines ln JOIN public.stock_transfers t ON t.id = ln.transfer_id
    WHERE ln.sku_product_id = p.id AND t.status = 'sent'
  ) tr ON true
  WHERE coalesce(p.is_active, true) OR p.repair_only
),
device_rows AS (
  SELECT
    'dev:' || d.template_id::text || ':' || coalesce(d.storage, '') || ':' || d.grade AS row_key,
    'device'::text AS kind,
    NULL::uuid AS sku_product_id,
    d.template_id,
    d.storage,
    d.grade,
    t.display_name || coalesce(' ' || d.storage, '') || ' · ' || public.transfer_grade_label(d.grade) AS name,
    'serievare'::text AS item_type,
    CASE WHEN bool_or(d.vat_scheme = 'brugtmoms') THEN 'brugtmoms' ELSE 'regular' END AS vat_scheme,
    round(avg(d.purchase_price))::bigint AS cost_price,
    min(d.selling_price)::bigint AS price,
    max(d.selling_price)::bigint AS price_max,
    false AS always_in_stock,
    (count(*) FILTER (WHERE d.status = 'listed' AND l.slug = 'vejle'))::int AS qty_vejle,
    (count(*) FILTER (WHERE d.status = 'listed' AND l.slug = 'slagelse'))::int AS qty_slagelse,
    (count(*) FILTER (WHERE d.status = 'listed' AND l.slug = 'webshop'))::int AS qty_webshop,
    NULL::int AS min_vejle, NULL::int AS min_slagelse, NULL::int AS min_webshop,
    (count(*) FILTER (WHERE d.status = 'in_transit'))::int AS in_transit,
    lower(concat_ws(' ', t.display_name, d.storage, public.transfer_grade_label(d.grade),
                    string_agg(DISTINCT concat_ws(' ', d.imei, d.barcode, d.serial_number), ' '))) AS search_text,
    false AS repair_only,
    0::int AS reserved_vejle,
    0::int AS reserved_slagelse
  FROM public.devices d
  JOIN public.product_templates t ON t.id = d.template_id
  JOIN public.locations l ON l.id = d.location_id
  WHERE d.status IN ('listed', 'reserved', 'in_transit') AND d.source IS DISTINCT FROM 'foxway'
  GROUP BY d.template_id, d.storage, d.grade, t.display_name
)
SELECT * FROM sku_rows
UNION ALL
SELECT * FROM device_rows;;


DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.complete_checkout_order(uuid,text,text,uuid[])',
    'public.transfer_send(uuid,uuid,jsonb)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;
REVOKE ALL ON public.checkout_sku_inventory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.checkout_sku_inventory TO service_role;
REVOKE ALL ON public.stock_overview FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.stock_overview TO service_role;

COMMIT;

-- Verifikation:
--   SELECT prosrc LIKE '%quantity - reserved_qty%' FROM pg_proc WHERE proname IN ('complete_checkout_order', 'transfer_send');  -- true, true
--   SELECT pg_get_viewdef('public.checkout_sku_inventory'::regclass) LIKE '%reserved_qty%';                                     -- true
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'stock_overview'
--     AND column_name IN ('repair_only', 'reserved_vejle', 'reserved_slagelse');                                                -- 3 rækker
--   SELECT count(*) FROM stock_overview WHERE repair_only;        -- = antal oprettede reservedele (efter bootstrap)
