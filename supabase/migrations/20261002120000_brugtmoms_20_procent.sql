-- Brugtmoms er 25/125 (= 20 %) af avancen, fordi salgspris og avance er inkl.
-- moms (momsloven §§ 69-71). Tidligere blev der regnet 25 % af avancen, hvilket
-- overvurderede brugtmomsen med en fjerdedel. Rammer webshoppens checkout
-- (complete_checkout_order) og den beregnede devices.vat_amount.

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

ALTER TABLE public.devices DROP COLUMN vat_amount;
ALTER TABLE public.devices ADD COLUMN vat_amount INTEGER GENERATED ALWAYS AS (
  CASE
    WHEN vat_scheme = 'brugtmoms' THEN
      GREATEST(0, ((COALESCE(selling_price, 0) - purchase_price) * 25) / 125)
    ELSE
      (COALESCE(selling_price, 0) * 25) / 125
  END
) STORED;
