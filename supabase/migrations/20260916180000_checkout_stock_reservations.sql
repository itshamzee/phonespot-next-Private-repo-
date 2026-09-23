-- Checkout-only stock transactions. Existing POS/draft/supplier RPCs are unchanged.
BEGIN;

ALTER TABLE public.devices
  ADD COLUMN reservation_owner_hash text,
  ADD COLUMN reservation_id uuid,
  ADD COLUMN reservation_order_id uuid REFERENCES public.orders(id);
ALTER TABLE public.order_items ADD COLUMN reservation_id uuid;
ALTER TABLE public.orders
  ADD COLUMN stock_committed_at timestamptz,
  ADD COLUMN stock_failure_code text,
  ADD COLUMN stock_failure_at timestamptz;

CREATE FUNCTION public.clear_device_reservation() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.status <> 'reserved' THEN
    NEW.reservation_owner_hash := NULL;
    NEW.reservation_id := NULL;
    NEW.reservation_order_id := NULL;
    NEW.reservation_expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER clear_device_reservation BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.clear_device_reservation();

-- Aggregation precedes PostgREST filtering/pagination. Do not expose costs or owners.
CREATE VIEW public.checkout_sku_inventory AS
SELECT p.id, p.title, p.slug, p.subcategory, p.brand, p.selling_price,
  p.always_in_stock, p.sale_price, p.images, p.compatible_models,
  p.variant_label, p.status, p.created_at, p.is_active, p.category, p.attributes,
  COALESCE(s.store_stock, 0) AS store_stock,
  COALESCE(s.online_stock, 0) AS online_stock,
  COALESCE(s.total_stock, 0) AS total_stock
FROM public.sku_products p
LEFT JOIN (
  SELECT st.product_id,
    sum(st.quantity) FILTER (WHERE l.type = 'store') AS store_stock,
    sum(st.quantity) FILTER (WHERE l.type <> 'store') AS online_stock,
    sum(st.quantity) AS total_stock
  FROM public.sku_stock st JOIN public.locations l ON l.id = st.location_id
  GROUP BY st.product_id
) s ON s.product_id = p.id;
REVOKE ALL ON public.checkout_sku_inventory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.checkout_sku_inventory TO service_role;

CREATE FUNCTION public.reserve_cart_device(p_device_id uuid, p_owner_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE d public.devices%ROWTYPE; expiry timestamptz;
BEGIN
  IF p_owner_hash IS NULL OR p_owner_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN jsonb_build_object('reserved', false);
  END IF;
  SELECT * INTO d FROM public.devices WHERE id = p_device_id FOR UPDATE;
  IF NOT FOUND OR d.source = 'foxway' THEN RETURN jsonb_build_object('reserved', false); END IF;
  IF d.status = 'reserved' AND d.reservation_expires_at > clock_timestamp() THEN
    IF d.reservation_owner_hash = p_owner_hash AND d.reservation_order_id IS NULL AND d.reservation_id IS NOT NULL THEN
      RETURN jsonb_build_object('reserved', true, 'reservedUntil', d.reservation_expires_at);
    END IF;
    RETURN jsonb_build_object('reserved', false);
  END IF;
  IF d.status <> 'listed' AND NOT (d.status = 'reserved' AND d.reservation_expires_at <= clock_timestamp()) THEN
    RETURN jsonb_build_object('reserved', false);
  END IF;
  -- NULL expiry is deliberately not reclaimable.
  IF d.status = 'reserved' AND d.reservation_expires_at IS NULL THEN RETURN jsonb_build_object('reserved', false); END IF;
  expiry := clock_timestamp() + interval '15 minutes';
  UPDATE public.devices SET status = 'reserved', reservation_owner_hash = p_owner_hash,
    reservation_id = gen_random_uuid(), reservation_order_id = NULL, reservation_expires_at = expiry
  WHERE id = p_device_id;
  RETURN jsonb_build_object('reserved', true, 'reservedUntil', expiry);
END;
$$;

CREATE FUNCTION public.release_cart_device(p_device_id uuid, p_owner_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE affected integer;
BEGIN
  UPDATE public.devices SET status = 'listed'
  WHERE id = p_device_id AND source IS DISTINCT FROM 'foxway' AND status = 'reserved'
    AND reservation_owner_hash = p_owner_hash AND reservation_order_id IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN jsonb_build_object('released', affected = 1);
END;
$$;

CREATE FUNCTION public.attach_checkout_order_items(p_order_id uuid, p_owner_hash text, p_items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE o public.orders%ROWTYPE; d public.devices%ROWTYPE; i record;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR o.type <> 'online' OR o.status <> 'pending' OR o.payment_status = 'paid'
    OR EXISTS (SELECT 1 FROM public.order_items WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'Order cannot accept checkout items';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Checkout items required';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS x(device_id uuid)
    WHERE device_id IS NOT NULL GROUP BY device_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate checkout device';
  END IF;
  FOR i IN SELECT * FROM jsonb_to_recordset(p_items) AS x(device_id uuid, reservation_id uuid)
    WHERE device_id IS NOT NULL ORDER BY device_id
  LOOP
    SELECT * INTO d FROM public.devices WHERE id = i.device_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Checkout device missing'; END IF;
    IF d.source IS DISTINCT FROM 'foxway' THEN
      IF d.status <> 'reserved' OR d.reservation_owner_hash IS DISTINCT FROM p_owner_hash
        OR p_owner_hash IS NULL OR d.reservation_id IS DISTINCT FROM i.reservation_id
        OR i.reservation_id IS NULL OR d.reservation_order_id IS NOT NULL
        OR d.reservation_expires_at IS NULL OR d.reservation_expires_at <= clock_timestamp() THEN
        RAISE EXCEPTION 'Checkout reservation conflict';
      END IF;
      UPDATE public.devices SET reservation_order_id = p_order_id,
        reservation_expires_at = clock_timestamp() + interval '35 minutes' WHERE id = d.id;
    END IF;
  END LOOP;
  INSERT INTO public.order_items(order_id, item_type, device_id, sku_product_id,
    quantity, unit_price, total_price, purchase_price, upgrade_details, reservation_id)
  SELECT p_order_id, x.item_type, x.device_id, x.sku_product_id, x.quantity,
    x.unit_price, x.total_price, x.purchase_price, x.upgrade_details,
    CASE WHEN dev.source = 'foxway' THEN gen_random_uuid() ELSE x.reservation_id END
  FROM jsonb_to_recordset(p_items) AS x(item_type text, device_id uuid, sku_product_id uuid,
    quantity integer, unit_price integer, total_price integer, purchase_price integer,
    upgrade_details jsonb, reservation_id uuid)
  LEFT JOIN public.devices dev ON dev.id = x.device_id;
END;
$$;

CREATE FUNCTION public.complete_checkout_order(p_order_id uuid, p_session_id text,
  p_payment_id text, p_battery_item_ids uuid[] DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
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
      SELECT COALESCE(sum(quantity), 0) INTO available FROM public.sku_stock WHERE product_id = i.sku_product_id;
      IF available < i.quantity THEN RAISE EXCEPTION USING ERRCODE = 'PST01', MESSAGE = 'insufficient_stock'; END IF;
      remaining := i.quantity;
      -- Allocation matches validation's complete inventory: online, warehouse, store.
      FOR s IN SELECT st.location_id, st.quantity FROM public.sku_stock st
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
        vat := vat + greatest(0, round((i.unit_price - upgrades - d.purchase_price) * 0.25));
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
$$;

CREATE FUNCTION public.expire_checkout_order(p_order_id uuid, p_session_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE o public.orders%ROWTYPE; i record;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Checkout order missing'; END IF;
  IF o.type <> 'online' OR p_session_id IS NULL OR o.stripe_checkout_session_id IS DISTINCT FROM p_session_id
    OR o.status <> 'pending' OR o.payment_status IS DISTINCT FROM 'pending' OR o.stock_committed_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'ignored');
  END IF;
  -- Same order -> SKU -> device lock order as completion; expiry needs no SKU locks.
  PERFORM d.id FROM public.devices d JOIN public.order_items oi ON oi.device_id = d.id
    WHERE oi.order_id = p_order_id ORDER BY d.id FOR UPDATE OF d;
  FOR i IN SELECT oi.*, d.source FROM public.order_items oi JOIN public.devices d ON d.id = oi.device_id
    WHERE oi.order_id = p_order_id ORDER BY d.id
  LOOP
    IF i.source = 'foxway' THEN
      PERFORM public.increment_foxway_stock(i.device_id);
      UPDATE public.order_items SET reservation_id = NULL WHERE id = i.id;
    ELSE
      UPDATE public.devices SET status = 'listed' WHERE id = i.device_id AND status = 'reserved'
        AND reservation_id = i.reservation_id AND reservation_order_id = p_order_id;
    END IF;
  END LOOP;
  UPDATE public.orders SET status = 'abandoned', abandoned_at = clock_timestamp(),
    recovery_token = COALESCE(recovery_token, gen_random_uuid()::text), foxway_status = NULL, foxway_order_ref = NULL
    WHERE id = p_order_id;
  RETURN jsonb_build_object('status', 'expired');
END;
$$;

CREATE FUNCTION public.reserve_recovery_order(p_order_id uuid, p_recovery_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE o public.orders%ROWTYPE; d public.devices%ROWTYPE; i record; generation uuid;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR o.type <> 'online' OR o.status <> 'abandoned'
    OR o.payment_status IS DISTINCT FROM 'pending' OR p_recovery_token IS NULL
    OR o.recovery_token IS DISTINCT FROM p_recovery_token THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;
  BEGIN
    FOR i IN SELECT * FROM public.order_items WHERE order_id = p_order_id AND item_type = 'device' ORDER BY device_id
    LOOP
      SELECT * INTO d FROM public.devices WHERE id = i.device_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'PST01', MESSAGE = 'missing_device'; END IF;
      IF d.source = 'foxway' THEN
        -- Line marker prevents a retried recovery from deducting supplier stock twice.
        -- It is cleared by the winning expiry, under the same order lock.
        IF i.reservation_id IS NULL THEN
          IF COALESCE(d.source_stock, 0) <= 0 THEN RAISE EXCEPTION USING ERRCODE = 'PST01', MESSAGE = 'insufficient_stock'; END IF;
          PERFORM public.decrement_foxway_stock(d.id);
          UPDATE public.order_items SET reservation_id = gen_random_uuid() WHERE id = i.id;
        END IF;
        CONTINUE;
      END IF;
      IF d.status = 'reserved' AND d.reservation_order_id = p_order_id
        AND d.reservation_id = i.reservation_id AND d.reservation_expires_at > clock_timestamp() THEN CONTINUE; END IF;
      IF d.status <> 'listed' AND NOT COALESCE(d.status = 'reserved' AND d.reservation_expires_at <= clock_timestamp(), false) THEN
        RAISE EXCEPTION USING ERRCODE = 'PST01', MESSAGE = 'reservation_conflict';
      END IF;
      generation := gen_random_uuid();
      UPDATE public.devices SET status = 'reserved', reservation_owner_hash = NULL,
        reservation_order_id = p_order_id, reservation_id = generation,
        reservation_expires_at = clock_timestamp() + interval '35 minutes' WHERE id = d.id;
      UPDATE public.order_items SET reservation_id = generation WHERE id = i.id;
    END LOOP;
  EXCEPTION WHEN SQLSTATE 'PST01' THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END;
  RETURN jsonb_build_object('status', 'reserved');
END;
$$;

REVOKE ALL ON FUNCTION public.clear_device_reservation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_cart_device(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_cart_device(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_checkout_order_items(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_checkout_order(uuid,text,text,uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_checkout_order(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_recovery_order(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_device_reservation() TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_cart_device(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_cart_device(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_checkout_order_items(uuid,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_checkout_order(uuid,text,text,uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_checkout_order(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_recovery_order(uuid,text) TO service_role;
COMMIT;
