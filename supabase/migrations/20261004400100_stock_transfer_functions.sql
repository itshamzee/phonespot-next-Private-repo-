-- Overførsler mellem butikker, del 2 af 3: Postgres-funktioner.
-- Kør EFTER 20261004400000_stock_transfers_tables.sql.
--
-- Alle funktioner er SECURITY DEFINER med fast search_path og kan KUN kaldes af
-- service_role (admin-API'erne). De er hele sandheden om lagerregnskabet:
--   transfer_request   anmod om varer fra en anden butik (ingen lagerændring)
--   transfer_send      "Pak og send": tilbehør trækkes fra afsenderen, enheder -> 'in_transit'
--   transfer_receive   modtager scanner: tilbehør lægges til modtageren, enheder -> 'listed' dér.
--                      Delmodtagelse er tilladt; p_close_short lukker med mangler og sender
--                      resten tilbage til afsenderen.
--   transfer_cancel    annullér (anmodet: begge sider; sendt: kun afsender, varen går tilbage)
--   stock_receive_goods  varemodtagelse (faktura) ind på en butik
--
-- Fejl rejses som 'transfer:<kode>[:<detalje>]' (SQLSTATE PS002) og oversættes i
-- src/lib/transfers/errors.ts. Rettigheder tjekkes både her og i API'et: en
-- medarbejder handler kun for sin egen butik, ejeren for alle.
--
-- Lagerbevægelser skrives til stock_movements (reason 'transfer' / 'receive').
-- Idempotent og transaktionel.

BEGIN;

CREATE OR REPLACE FUNCTION public.transfer_fail(p_code text, p_detail text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION '%', CASE WHEN p_detail IS NULL THEN 'transfer:' || p_code ELSE 'transfer:' || p_code || ':' || p_detail END
    USING ERRCODE = 'PS002';
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_grade_label(p_grade text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT CASE WHEN p_grade IS NULL THEN '' WHEN p_grade = 'N' THEN 'Fabriksny' ELSE 'Grade ' || p_grade END;
$$;

-- Aktiv medarbejder, der enten er ejer eller hører til p_location_id.
CREATE OR REPLACE FUNCTION public.transfer_check_actor(p_staff_id uuid, p_location_id uuid, p_need_manager boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE s record;
BEGIN
  SELECT role, location_id INTO s FROM public.staff WHERE id = p_staff_id AND is_active;
  IF NOT FOUND THEN PERFORM public.transfer_fail('staff_not_found'); END IF;
  IF p_need_manager AND s.role NOT IN ('manager', 'owner') THEN PERFORM public.transfer_fail('forbidden_role'); END IF;
  IF s.role <> 'owner' AND s.location_id IS DISTINCT FROM p_location_id THEN
    PERFORM public.transfer_fail('forbidden_location');
  END IF;
END;
$$;

-- ============================================================
-- transfer_request
--   p_lines: [{sku_product_id, qty} | {device_id} | {template_id, storage, grade, qty}]
-- ============================================================
CREATE OR REPLACE FUNCTION public.transfer_request(
  p_from uuid, p_to uuid, p_staff_id uuid, p_lines jsonb, p_note text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_id uuid; v_number integer; e jsonb; v_qty integer; v_desc text;
  sp record; d record; tpl record; n integer := 0;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_from = p_to THEN PERFORM public.transfer_fail('same_location'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_from) THEN PERFORM public.transfer_fail('location_not_found'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_to) THEN PERFORM public.transfer_fail('location_not_found'); END IF;
  -- Man anmoder om varer TIL sin egen butik.
  PERFORM public.transfer_check_actor(p_staff_id, p_to);
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) = 0 THEN
    PERFORM public.transfer_fail('no_lines');
  END IF;
  IF jsonb_array_length(p_lines) > 50 THEN PERFORM public.transfer_fail('too_many_lines'); END IF;

  INSERT INTO public.stock_transfers (from_location_id, to_location_id, status, note, requested_by)
    VALUES (p_from, p_to, 'requested', nullif(btrim(coalesce(p_note, '')), ''), p_staff_id)
    RETURNING id, number INTO v_id, v_number;

  FOR e IN SELECT x FROM jsonb_array_elements(p_lines) x LOOP
    n := n + 1;
    IF e ? 'sku_product_id' THEN
      v_qty := coalesce((e->>'qty')::integer, 1);
      IF v_qty < 1 OR v_qty > 1000 THEN PERFORM public.transfer_fail('invalid_quantity'); END IF;
      SELECT id, title INTO sp FROM public.sku_products WHERE id = (e->>'sku_product_id')::uuid;
      IF NOT FOUND THEN PERFORM public.transfer_fail('sku_not_found'); END IF;
      INSERT INTO public.stock_transfer_lines (transfer_id, sku_product_id, description, qty)
        VALUES (v_id, sp.id, sp.title, v_qty);
    ELSIF e ? 'device_id' THEN
      SELECT dv.id, dv.status, dv.location_id, dv.storage, dv.grade, dv.source, t.display_name
        INTO d FROM public.devices dv LEFT JOIN public.product_templates t ON t.id = dv.template_id
        WHERE dv.id = (e->>'device_id')::uuid;
      IF NOT FOUND THEN PERFORM public.transfer_fail('device_not_found'); END IF;
      IF d.status <> 'listed' OR d.location_id <> p_from OR d.source IS NOT DISTINCT FROM 'foxway' THEN
        PERFORM public.transfer_fail('device_unavailable', d.id::text);
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.stock_transfer_lines l JOIN public.stock_transfers t2 ON t2.id = l.transfer_id
        WHERE l.device_id = d.id AND t2.status IN ('requested', 'sent')
      ) THEN PERFORM public.transfer_fail('device_in_transfer', d.id::text); END IF;
      INSERT INTO public.stock_transfer_lines (transfer_id, device_id, description, qty)
        VALUES (v_id, d.id,
                coalesce(d.display_name, 'Enhed') || coalesce(' ' || d.storage, '') || ' · ' || public.transfer_grade_label(d.grade), 1);
    ELSIF e ? 'template_id' THEN
      v_qty := coalesce((e->>'qty')::integer, 1);
      IF v_qty < 1 OR v_qty > 100 THEN PERFORM public.transfer_fail('invalid_quantity'); END IF;
      SELECT id, display_name INTO tpl FROM public.product_templates WHERE id = (e->>'template_id')::uuid;
      IF NOT FOUND THEN PERFORM public.transfer_fail('template_not_found'); END IF;
      IF coalesce(e->>'grade', '') = '' THEN PERFORM public.transfer_fail('grade_required'); END IF;
      v_desc := tpl.display_name || coalesce(' ' || nullif(e->>'storage', ''), '') || ' · ' || public.transfer_grade_label(e->>'grade');
      INSERT INTO public.stock_transfer_lines (transfer_id, template_id, storage, grade, description, qty)
        VALUES (v_id, tpl.id, nullif(e->>'storage', ''), e->>'grade', v_desc, v_qty);
    ELSE
      PERFORM public.transfer_fail('invalid_line');
    END IF;
  END LOOP;

  RETURN jsonb_build_object('id', v_id, 'number', v_number);
END;
$$;

-- ============================================================
-- transfer_send  ("Pak og send")
--   p_lines (valgfri): [{line_id, qty?, device_ids?}] — afsenderen kan sende mindre end
--   anmodet (qty 0 fjerner linjen) eller pege på konkrete enheder. Enhedsgrupper uden
--   device_ids løses automatisk til de ældste ledige enheder i afsenderens butik.
-- ============================================================
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
      SELECT quantity INTO v_have FROM public.sku_stock
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

-- ============================================================
-- transfer_receive  (scan-baseret)
--   p_lines: [{line_id, qty}] — antal der er scannet ind nu (enheder: qty 1)
--   p_close_short: luk overførslen selv om noget mangler; resten går tilbage til afsenderen.
-- Uden p_close_short bliver overførslen 'sent', indtil alt er modtaget (delmodtagelse).
-- ============================================================
CREATE OR REPLACE FUNCTION public.transfer_receive(
  p_transfer_id uuid, p_staff_id uuid, p_lines jsonb, p_close_short boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  t public.stock_transfers%ROWTYPE; r record; ln record; v_rem integer; v_rc integer;
  v_note text; v_short boolean := false; v_open integer;
BEGIN
  SELECT * INTO t FROM public.stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.transfer_fail('not_found'); END IF;
  IF t.status = 'received' THEN PERFORM public.transfer_fail('already_received'); END IF;
  IF t.status = 'cancelled' THEN PERFORM public.transfer_fail('cancelled'); END IF;
  IF t.status <> 'sent' THEN PERFORM public.transfer_fail('not_sent'); END IF;
  PERFORM public.transfer_check_actor(p_staff_id, t.to_location_id);
  IF (p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0) AND NOT coalesce(p_close_short, false) THEN
    PERFORM public.transfer_fail('nothing_to_receive');
  END IF;
  v_note := 'Overførsel #' || t.number || ' modtaget';

  FOR r IN
    SELECT (x->>'line_id')::uuid AS line_id, sum((x->>'qty')::integer)::integer AS q
    FROM jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) x GROUP BY 1 ORDER BY 1
  LOOP
    SELECT * INTO ln FROM public.stock_transfer_lines WHERE id = r.line_id AND transfer_id = t.id FOR UPDATE;
    IF NOT FOUND THEN PERFORM public.transfer_fail('line_not_found'); END IF;
    IF r.q IS NULL OR r.q <= 0 THEN PERFORM public.transfer_fail('invalid_quantity'); END IF;
    IF ln.received_qty + ln.returned_qty + r.q > ln.sent_qty THEN
      PERFORM public.transfer_fail('over_receive', ln.description);
    END IF;

    IF ln.sku_product_id IS NOT NULL THEN
      INSERT INTO public.sku_stock (product_id, location_id, quantity)
        VALUES (ln.sku_product_id, t.to_location_id, r.q)
        ON CONFLICT (product_id, location_id)
        DO UPDATE SET quantity = public.sku_stock.quantity + r.q, updated_at = clock_timestamp();
      INSERT INTO public.stock_movements (location_id, sku_product_id, qty_delta, reason, ref_note, staff_id)
        VALUES (t.to_location_id, ln.sku_product_id, r.q, 'transfer', v_note, p_staff_id);
    ELSE
      UPDATE public.devices SET status = 'listed', location_id = t.to_location_id, updated_at = clock_timestamp()
        WHERE id = ln.device_id AND status = 'in_transit';
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      IF v_rc <> 1 THEN PERFORM public.transfer_fail('device_unavailable', ln.device_id::text); END IF;
      INSERT INTO public.device_transfers (device_id, from_location_id, to_location_id, transferred_by, reason)
        VALUES (ln.device_id, t.from_location_id, t.to_location_id, p_staff_id, 'Overførsel #' || t.number);
      INSERT INTO public.stock_movements (location_id, device_id, qty_delta, reason, ref_note, staff_id)
        VALUES (t.to_location_id, ln.device_id, 1, 'transfer', v_note, p_staff_id);
    END IF;
    UPDATE public.stock_transfer_lines SET received_qty = received_qty + r.q WHERE id = ln.id;
  END LOOP;

  IF coalesce(p_close_short, false) THEN
    FOR ln IN SELECT * FROM public.stock_transfer_lines
              WHERE transfer_id = t.id AND sent_qty - received_qty - returned_qty > 0 ORDER BY id FOR UPDATE
    LOOP
      v_rem := ln.sent_qty - ln.received_qty - ln.returned_qty;
      v_short := true;
      IF ln.sku_product_id IS NOT NULL THEN
        INSERT INTO public.sku_stock (product_id, location_id, quantity)
          VALUES (ln.sku_product_id, t.from_location_id, v_rem)
          ON CONFLICT (product_id, location_id)
          DO UPDATE SET quantity = public.sku_stock.quantity + v_rem, updated_at = clock_timestamp();
        INSERT INTO public.stock_movements (location_id, sku_product_id, qty_delta, reason, ref_note, staff_id)
          VALUES (t.from_location_id, ln.sku_product_id, v_rem, 'transfer',
                  'Overførsel #' || t.number || ' mangler ved modtagelse, tilbage til afsender', p_staff_id);
      ELSE
        UPDATE public.devices SET status = 'listed', updated_at = clock_timestamp()
          WHERE id = ln.device_id AND status = 'in_transit';
        INSERT INTO public.stock_movements (location_id, device_id, qty_delta, reason, ref_note, staff_id)
          VALUES (t.from_location_id, ln.device_id, 1, 'transfer',
                  'Overførsel #' || t.number || ' mangler ved modtagelse, tilbage til afsender', p_staff_id);
      END IF;
      UPDATE public.stock_transfer_lines SET returned_qty = returned_qty + v_rem WHERE id = ln.id;
    END LOOP;
  END IF;

  SELECT count(*) INTO v_open FROM public.stock_transfer_lines
    WHERE transfer_id = t.id AND sent_qty - received_qty - returned_qty > 0;
  IF v_open = 0 THEN
    UPDATE public.stock_transfers
      SET status = 'received', received_by = p_staff_id, received_at = clock_timestamp(), closed_short = v_short
      WHERE id = t.id;
  END IF;
  RETURN jsonb_build_object('id', t.id, 'number', t.number,
    'status', CASE WHEN v_open = 0 THEN 'received' ELSE 'sent' END, 'open_lines', v_open, 'closed_short', v_short);
END;
$$;

-- ============================================================
-- transfer_cancel
--   anmodet: afsender- og modtagersiden (og ejeren) må annullere.
--   sendt:   kun afsenderen (og ejeren); varen går tilbage til afsenderens lager.
--            Er noget allerede modtaget, skal der i stedet lukkes med mangler.
-- ============================================================
CREATE OR REPLACE FUNCTION public.transfer_cancel(p_transfer_id uuid, p_staff_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  t public.stock_transfers%ROWTYPE; ln record; s record; v_note text;
BEGIN
  SELECT * INTO t FROM public.stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.transfer_fail('not_found'); END IF;
  IF t.status = 'received' THEN PERFORM public.transfer_fail('already_received'); END IF;
  IF t.status = 'cancelled' THEN PERFORM public.transfer_fail('cancelled'); END IF;

  IF t.status = 'requested' THEN
    SELECT role, location_id INTO s FROM public.staff WHERE id = p_staff_id AND is_active;
    IF NOT FOUND THEN PERFORM public.transfer_fail('staff_not_found'); END IF;
    IF s.role <> 'owner' AND s.location_id IS DISTINCT FROM t.from_location_id AND s.location_id IS DISTINCT FROM t.to_location_id THEN
      PERFORM public.transfer_fail('forbidden_location');
    END IF;
  ELSE
    PERFORM public.transfer_check_actor(p_staff_id, t.from_location_id);
    IF EXISTS (SELECT 1 FROM public.stock_transfer_lines WHERE transfer_id = t.id AND received_qty > 0) THEN
      PERFORM public.transfer_fail('partially_received');
    END IF;
    v_note := 'Overførsel #' || t.number || ' annulleret, tilbage til afsender';
    FOR ln IN SELECT * FROM public.stock_transfer_lines WHERE transfer_id = t.id AND sent_qty - returned_qty > 0 ORDER BY id FOR UPDATE LOOP
      IF ln.sku_product_id IS NOT NULL THEN
        INSERT INTO public.sku_stock (product_id, location_id, quantity)
          VALUES (ln.sku_product_id, t.from_location_id, ln.sent_qty - ln.returned_qty)
          ON CONFLICT (product_id, location_id)
          DO UPDATE SET quantity = public.sku_stock.quantity + (ln.sent_qty - ln.returned_qty), updated_at = clock_timestamp();
        INSERT INTO public.stock_movements (location_id, sku_product_id, qty_delta, reason, ref_note, staff_id)
          VALUES (t.from_location_id, ln.sku_product_id, ln.sent_qty - ln.returned_qty, 'transfer', v_note, p_staff_id);
      ELSE
        UPDATE public.devices SET status = 'listed', updated_at = clock_timestamp()
          WHERE id = ln.device_id AND status = 'in_transit';
        INSERT INTO public.stock_movements (location_id, device_id, qty_delta, reason, ref_note, staff_id)
          VALUES (t.from_location_id, ln.device_id, 1, 'transfer', v_note, p_staff_id);
      END IF;
      UPDATE public.stock_transfer_lines SET returned_qty = sent_qty WHERE id = ln.id;
    END LOOP;
  END IF;

  UPDATE public.stock_transfers
    SET status = 'cancelled', cancelled_by = p_staff_id, cancelled_at = clock_timestamp(),
        cancel_reason = nullif(btrim(coalesce(p_reason, '')), '')
    WHERE id = t.id;
  RETURN jsonb_build_object('id', t.id, 'number', t.number, 'status', 'cancelled');
END;
$$;

-- ============================================================
-- stock_receive_goods: varemodtagelse (faktura) af tilbehør/reservedele ind på en butik.
--   p_lines: [{sku_product_id, qty, cost_price_oere?}]
-- Kostprisen på varen sættes til seneste indkøbspris, når den er angivet.
-- Kræver manager eller ejer; manager kun for egen butik.
-- ============================================================
CREATE OR REPLACE FUNCTION public.stock_receive_goods(
  p_location_id uuid, p_staff_id uuid, p_invoice_no text, p_invoice_date date, p_lines jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  e jsonb; v_qty integer; v_cost integer; v_pid uuid; v_note text; n integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_location_id) THEN PERFORM public.transfer_fail('location_not_found'); END IF;
  PERFORM public.transfer_check_actor(p_staff_id, p_location_id, true);
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) = 0 THEN
    PERFORM public.transfer_fail('no_lines');
  END IF;
  IF jsonb_array_length(p_lines) > 100 THEN PERFORM public.transfer_fail('too_many_lines'); END IF;
  v_note := 'Varemodtagelse'
    || CASE WHEN btrim(coalesce(p_invoice_no, '')) <> '' THEN ' · faktura ' || left(btrim(p_invoice_no), 60) ELSE '' END
    || CASE WHEN p_invoice_date IS NOT NULL THEN ' · ' || to_char(p_invoice_date, 'YYYY-MM-DD') ELSE '' END;

  FOR e IN SELECT x FROM jsonb_array_elements(p_lines) x LOOP
    v_pid := (e->>'sku_product_id')::uuid;
    v_qty := (e->>'qty')::integer;
    v_cost := (e->>'cost_price_oere')::integer;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 100000 THEN PERFORM public.transfer_fail('invalid_quantity'); END IF;
    IF v_cost IS NOT NULL AND v_cost < 0 THEN PERFORM public.transfer_fail('invalid_cost'); END IF;
    IF NOT EXISTS (SELECT 1 FROM public.sku_products WHERE id = v_pid) THEN PERFORM public.transfer_fail('sku_not_found'); END IF;
    INSERT INTO public.sku_stock (product_id, location_id, quantity)
      VALUES (v_pid, p_location_id, v_qty)
      ON CONFLICT (product_id, location_id)
      DO UPDATE SET quantity = public.sku_stock.quantity + v_qty, updated_at = clock_timestamp();
    INSERT INTO public.stock_movements (location_id, sku_product_id, qty_delta, reason, ref_note, staff_id)
      VALUES (p_location_id, v_pid, v_qty, 'receive', v_note, p_staff_id);
    IF v_cost IS NOT NULL THEN
      UPDATE public.sku_products SET cost_price = v_cost, updated_at = clock_timestamp() WHERE id = v_pid;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN jsonb_build_object('lines', n);
END;
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.transfer_fail(text,text)',
    'public.transfer_grade_label(text)',
    'public.transfer_check_actor(uuid,uuid,boolean)',
    'public.transfer_request(uuid,uuid,uuid,jsonb,text)',
    'public.transfer_send(uuid,uuid,jsonb)',
    'public.transfer_receive(uuid,uuid,jsonb,boolean)',
    'public.transfer_cancel(uuid,uuid,text)',
    'public.stock_receive_goods(uuid,uuid,text,date,jsonb)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

COMMIT;
