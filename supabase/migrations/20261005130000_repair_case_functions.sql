-- Ny sag, B3 del 2: funktioner til sager og sagslinjer.
-- Kør EFTER 20261005120000_repair_case_schema.sql.
--
-- Alle funktioner er SECURITY DEFINER med fast search_path og kan KUN kaldes af
-- service_role (admin-API'erne). Fejl rejses som 'case:<kode>[:<detalje>]'
-- (SQLSTATE PS003) og oversættes i src/lib/repairs/case-errors.ts.
--
--   repair_case_create(jsonb)       opret/opdatér kunde, sag og linjer i ÉN transaktion.
--                                   Priser hentes ALTID fra repair_services / sku_products /
--                                   devices; en afvigelse kræver price_reason. Dele med
--                                   lagerstyring reserveres (reserved_qty), 'backorder' ved 0,
--                                   'none' for "altid på lager". Skriver statuslog, spejler
--                                   services jsonb ({id, name, price_dkk}) og gemmer
--                                   idempotensnøglen (samme nøgle + body = samme svar).
--   repair_case_add_item(jsonb)     tilføj linje
--   repair_case_remove_item(jsonb)  fjern linje (frigiver delen/enheden)
--   repair_case_swap_part(jsonb)    skift (eller sæt) del på en reparationslinje
--   repair_consume_parts(uuid,uuid) ved status 'faerdig': trækker quantity og reserved_qty,
--                                   skriver stock_movement 'repair', snapshot af kostpris. Idempotent.
--   repair_case_cancel(jsonb)       frigiver alt og sætter status 'annulleret'
--   repair_allocate_backorders(uuid,uuid)  lægger indkomne varer til side til sager der venter
--
-- Låserækkefølge (fast, mod deadlocks): sag -> enheder (id) -> sku_stock (product_id).
--
-- Valg hvor spec'en var åben:
--   * Sager oprettet før de nye linjer (services jsonb / booking_details / tilbud uden linjer)
--     kan ikke få tilføjet linjer (legacy_ticket): linjerne ville ellers skjule de gamle
--     (caseLines prioriterer linjer foran services). De redigeres som hidtil.
--   * En sag skal have mindst én reparation eller fritekstlinje (repair_required).
--   * Fjernelse sletter linjen (efter frigivelse) og logger den i activity_log;
--     'released' bruges kun når en sag annulleres.
--   * repair_consume_parts trækker IKKE lager for dele med status 'none' (altid på lager).
--   * En sag kan ikke annulleres hvis der ligger et ubrugt depositum (refunder det først i
--     kassen) eller hvis en linje allerede er solgt.
--
-- Antagelser (verificér): staff(id, role, location_id, name, is_active), activity_log(actor_id,
-- actor_type, action, entity_type, entity_id, details), repair_status_log(ticket_id, old_status,
-- new_status, note), product_templates(display_name), transfer_grade_label (20261004400100),
-- pos_deposit_remaining (20261004300000).
--
-- Idempotent (CREATE OR REPLACE) og transaktionel.

BEGIN;

CREATE OR REPLACE FUNCTION public.case_fail(p_code text, p_detail text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION '%', CASE WHEN p_detail IS NULL THEN 'case:' || p_code ELSE 'case:' || p_code || ':' || p_detail END
    USING ERRCODE = 'PS003';
END;
$$;

-- Medarbejderen skal være aktiv; andre end ejeren må kun røre sagens egen butik.
CREATE OR REPLACE FUNCTION public.repair__check_actor(p_staff uuid, p_loc uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE s record;
BEGIN
  SELECT role, location_id INTO s FROM public.staff WHERE id = p_staff AND is_active;
  IF NOT FOUND THEN PERFORM public.case_fail('staff_not_found'); END IF;
  IF s.role <> 'owner' AND s.location_id IS DISTINCT FROM p_loc THEN PERFORM public.case_fail('forbidden_store'); END IF;
  RETURN s.role;
END;
$$;

-- ------------------------------------------------------------
-- Visninger (jsonb) til svar
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair__items_json(p_ticket uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'parent_item_id', i.parent_item_id, 'kind', i.kind, 'description', i.description,
      'quality_label', i.quality_label, 'qty', i.qty,
      'list_price_oere', i.list_price_oere, 'unit_price_oere', i.unit_price_oere,
      'total_oere', i.qty * i.unit_price_oere, 'price_reason', i.price_reason,
      'stock_status', i.stock_status, 'location_slug', l.slug,
      'repair_service_id', i.repair_service_id, 'sku_product_id', i.sku_product_id,
      'device_id', i.device_id, 'order_item_id', i.order_item_id, 'cost_oere', i.cost_oere
    ) ORDER BY coalesce(pr.created_at, i.created_at), coalesce(i.parent_item_id, i.id),
               CASE WHEN i.kind = 'part' THEN 1 ELSE 0 END, i.id), '[]'::jsonb)
  FROM public.repair_ticket_items i
  LEFT JOIN public.repair_ticket_items pr ON pr.id = i.parent_item_id
  LEFT JOIN public.locations l ON l.id = i.location_id
  WHERE i.ticket_id = p_ticket
$$;

CREATE OR REPLACE FUNCTION public.repair__backorders_json(p_ticket uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'item_id', i.id, 'sku_product_id', i.sku_product_id, 'description', i.description, 'qty', i.qty,
      'other_locations', coalesce((
        SELECT jsonb_agg(jsonb_build_object('slug', ol.slug, 'available', greatest(st.quantity - st.reserved_qty, 0))
                         ORDER BY ol.slug)
        FROM public.sku_stock st JOIN public.locations ol ON ol.id = st.location_id
        WHERE st.product_id = i.sku_product_id AND ol.slug IN ('vejle', 'slagelse')
          AND ol.id IS DISTINCT FROM i.location_id
      ), '[]'::jsonb)
    ) ORDER BY i.created_at, i.id), '[]'::jsonb)
  FROM public.repair_ticket_items i
  WHERE i.ticket_id = p_ticket AND i.stock_status = 'backorder'
$$;

CREATE OR REPLACE FUNCTION public.repair__total(p_ticket uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT coalesce(sum(qty * unit_price_oere), 0)::integer FROM public.repair_ticket_items WHERE ticket_id = p_ticket
$$;

-- services jsonb og issue_description følger linjerne (reparation + fritekst).
CREATE OR REPLACE FUNCTION public.repair__sync_services(p_ticket uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE public.repair_tickets t SET
    services = coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', CASE WHEN i.kind = 'repair' THEN i.repair_service_id::text ELSE 'custom-' || i.id::text END,
        'name', i.description || CASE WHEN i.qty > 1 THEN ' ×' || i.qty ELSE '' END,
        'price_dkk', round((i.unit_price_oere * i.qty) / 100.0, 2)
      ) ORDER BY i.created_at, i.id)
      FROM public.repair_ticket_items i WHERE i.ticket_id = t.id AND i.kind IN ('repair', 'free_text')
    ), '[]'::jsonb),
    issue_description = coalesce(nullif((
      SELECT string_agg(i.description, ', ' ORDER BY i.created_at, i.id)
      FROM public.repair_ticket_items i WHERE i.ticket_id = t.id AND i.kind IN ('repair', 'free_text')
    ), ''), t.issue_description),
    updated_at = clock_timestamp()
  WHERE t.id = p_ticket;
END;
$$;

-- ------------------------------------------------------------
-- Lager: lås og reservation
-- ------------------------------------------------------------
-- Opretter manglende lagerrækker (kun varer med lagerstyring) og låser dem i product_id-orden.
CREATE OR REPLACE FUNCTION public.repair__lock_skus(p_skus uuid[], p_loc uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF p_loc IS NULL OR p_skus IS NULL OR cardinality(p_skus) = 0 THEN RETURN; END IF;
  INSERT INTO public.sku_stock (product_id, location_id, quantity)
    SELECT sp.id, p_loc, 0 FROM public.sku_products sp
     WHERE sp.id = ANY (p_skus) AND NOT coalesce(sp.always_in_stock, false)
     ORDER BY sp.id
    ON CONFLICT (product_id, location_id) DO NOTHING;
  PERFORM 1 FROM public.sku_stock
    WHERE location_id = p_loc AND product_id = ANY (p_skus) ORDER BY product_id FOR UPDATE;
END;
$$;

-- 'none' (altid på lager / ingen butik), 'reserved' eller 'backorder'. Delvis reservation findes ikke.
CREATE OR REPLACE FUNCTION public.repair__reserve_sku(p_sku uuid, p_loc uuid, p_qty integer) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_unl boolean; v_q integer; v_r integer;
BEGIN
  SELECT always_in_stock INTO v_unl FROM public.sku_products WHERE id = p_sku;
  IF NOT FOUND THEN PERFORM public.case_fail('sku_not_found'); END IF;
  IF coalesce(v_unl, false) OR p_loc IS NULL THEN RETURN 'none'; END IF;
  INSERT INTO public.sku_stock (product_id, location_id, quantity) VALUES (p_sku, p_loc, 0)
    ON CONFLICT (product_id, location_id) DO NOTHING;
  SELECT quantity, reserved_qty INTO v_q, v_r FROM public.sku_stock
    WHERE product_id = p_sku AND location_id = p_loc FOR UPDATE;
  IF v_q - v_r >= p_qty THEN
    UPDATE public.sku_stock SET reserved_qty = reserved_qty + p_qty, updated_at = clock_timestamp()
      WHERE product_id = p_sku AND location_id = p_loc;
    RETURN 'reserved';
  END IF;
  RETURN 'backorder';
END;
$$;

-- Frigiver reservationen på én linje (ingen statusændring på linjen selv).
CREATE OR REPLACE FUNCTION public.repair__release_item(p_item_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE it public.repair_ticket_items%ROWTYPE;
BEGIN
  SELECT * INTO it FROM public.repair_ticket_items WHERE id = p_item_id;
  IF NOT FOUND OR it.stock_status <> 'reserved' THEN RETURN; END IF;
  IF it.kind IN ('part', 'product') THEN
    UPDATE public.sku_stock SET reserved_qty = greatest(reserved_qty - it.qty, 0), updated_at = clock_timestamp()
      WHERE product_id = it.sku_product_id AND location_id = it.location_id;
  ELSIF it.kind = 'device' THEN
    UPDATE public.devices SET status = 'listed', updated_at = clock_timestamp()
      WHERE id = it.device_id AND status = 'reserved' AND reservation_ticket_id = it.ticket_id;
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- Planlægning og anvendelse af én linje
-- ------------------------------------------------------------
-- Validerer en linje fra klienten og slår prisen op. Returnerer en plan (jsonb):
--   { kind, desc, qty, list, unit, reason, cost, quality_label, service_id, model_id,
--     sku_id, device_id, part: {sku_id, qty, title, quality_label, cost}?, warn? }
CREATE OR REPLACE FUNCTION public.repair__plan_item(p_item jsonb, p_loc uuid, p_model uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  k text := p_item->>'kind';
  rs public.repair_services%ROWTYPE; sp public.sku_products%ROWTYPE; dv public.devices%ROWTYPE;
  rsp public.repair_service_parts%ROWTYPE; part_sp public.sku_products%ROWTYPE;
  v_list integer; v_unit integer; v_unit_in integer; v_reason text; v_qty integer;
  v_desc text; v_label text; v_cost integer; v_part jsonb := NULL; v_warn text := NULL;
  v_part_id uuid; v_part_label text; v_name text; v_found boolean;
BEGIN
  v_reason := nullif(btrim(coalesce(p_item->>'price_reason', '')), '');
  IF length(coalesce(v_reason, '')) > 200 THEN PERFORM public.case_fail('price_reason_too_long'); END IF;
  IF p_item->>'unit_price_oere' IS NOT NULL AND p_item->>'unit_price_oere' !~ '^[0-9]{1,9}$' THEN
    PERFORM public.case_fail('invalid_price');
  END IF;
  v_unit_in := (p_item->>'unit_price_oere')::integer;

  IF k = 'repair' THEN
    SELECT * INTO rs FROM public.repair_services WHERE id = nullif(p_item->>'repair_service_id', '')::uuid;
    IF NOT FOUND OR NOT coalesce(rs.active, true) THEN PERFORM public.case_fail('service_not_found'); END IF;
    IF p_model IS NOT NULL AND rs.model_id <> p_model THEN PERFORM public.case_fail('service_model_mismatch'); END IF;
    v_list := rs.price_dkk * 100;
    v_unit := coalesce(v_unit_in, v_list);
    v_qty := 1;
    v_label := CASE rs.quality_tier WHEN 'standard' THEN 'Budget' WHEN 'premium' THEN 'OEM' WHEN 'original' THEN 'Original' ELSE NULL END;
    IF rs.part_mode IN ('part', 'manual') THEN
      v_part_id := nullif(p_item->>'part_sku_product_id', '')::uuid;
      IF v_part_id IS NOT NULL THEN
        SELECT * INTO rsp FROM public.repair_service_parts WHERE repair_service_id = rs.id AND sku_product_id = v_part_id;
        v_found := FOUND;
        IF NOT v_found THEN
          -- ikke koblet: kun tilladt hvis varen er en reservedel til samme model
          IF NOT EXISTS (SELECT 1 FROM public.sku_products x
                          WHERE x.id = v_part_id AND x.repair_model_id = rs.model_id AND x.part_category_id IS NOT NULL) THEN
            PERFORM public.case_fail('part_not_allowed');
          END IF;
        END IF;
      ELSIF rs.part_mode = 'part' THEN
        SELECT * INTO rsp FROM public.repair_service_parts WHERE repair_service_id = rs.id
          ORDER BY is_primary DESC, created_at, id LIMIT 1;
        IF FOUND THEN v_part_id := rsp.sku_product_id; END IF;
      END IF;
      IF v_part_id IS NOT NULL THEN
        SELECT * INTO part_sp FROM public.sku_products WHERE id = v_part_id;
        IF NOT FOUND THEN PERFORM public.case_fail('sku_not_found'); END IF;
        SELECT q.name INTO v_part_label FROM public.spare_part_quality_tiers q WHERE q.id = part_sp.quality_tier_id;
        v_part := jsonb_build_object('sku_id', part_sp.id, 'qty', coalesce(rsp.qty, 1), 'title', part_sp.title,
                                     'quality_label', v_part_label, 'cost', part_sp.cost_price);
      ELSIF rs.part_mode = 'part' THEN
        v_warn := 'Ingen reservedel er koblet til "' || rs.name || '". Vælg en del på sagen.';
      END IF;
    END IF;
    v_desc := rs.name;

  ELSIF k = 'product' THEN
    SELECT * INTO sp FROM public.sku_products WHERE id = nullif(p_item->>'sku_product_id', '')::uuid;
    IF NOT FOUND THEN PERFORM public.case_fail('sku_not_found'); END IF;
    IF sp.repair_only THEN PERFORM public.case_fail('sku_repair_only'); END IF;
    IF NOT coalesce(sp.is_active, true) THEN PERFORM public.case_fail('sku_inactive'); END IF;
    v_qty := coalesce((p_item->>'qty')::integer, 1);
    IF v_qty < 1 OR v_qty > 100 THEN PERFORM public.case_fail('invalid_quantity'); END IF;
    v_list := CASE WHEN sp.sale_price IS NOT NULL AND sp.sale_price < sp.selling_price THEN sp.sale_price ELSE sp.selling_price END;
    IF v_list <= 0 THEN PERFORM public.case_fail('product_no_price', sp.title); END IF;
    v_unit := coalesce(v_unit_in, v_list);
    v_desc := sp.title;
    v_cost := sp.cost_price;

  ELSIF k = 'device' THEN
    SELECT * INTO dv FROM public.devices WHERE id = nullif(p_item->>'device_id', '')::uuid;
    IF NOT FOUND THEN PERFORM public.case_fail('device_not_found'); END IF;
    IF dv.source IS NOT DISTINCT FROM 'foxway' THEN PERFORM public.case_fail('device_not_sellable'); END IF;
    IF dv.status <> 'listed' THEN PERFORM public.case_fail('device_unavailable', coalesce(dv.barcode, dv.id::text)); END IF;
    IF p_loc IS NULL OR dv.location_id IS DISTINCT FROM p_loc THEN
      PERFORM public.case_fail('device_other_location', coalesce(dv.barcode, dv.id::text));
    END IF;
    IF coalesce(dv.selling_price, 0) <= 0 THEN PERFORM public.case_fail('device_no_price', coalesce(dv.barcode, dv.id::text)); END IF;
    SELECT t.display_name INTO v_name FROM public.product_templates t WHERE t.id = dv.template_id;
    v_qty := 1;
    v_list := dv.selling_price;
    v_unit := coalesce(v_unit_in, v_list);
    v_desc := coalesce(v_name, 'Enhed') || coalesce(' ' || dv.storage, '');
    v_label := nullif(public.transfer_grade_label(dv.grade), '');
    v_cost := dv.purchase_price;

  ELSIF k = 'free_text' THEN
    v_desc := left(btrim(coalesce(p_item->>'description', '')), 200);
    IF v_desc = '' THEN PERFORM public.case_fail('description_required'); END IF;
    IF v_unit_in IS NULL THEN PERFORM public.case_fail('invalid_price'); END IF;
    v_qty := coalesce((p_item->>'qty')::integer, 1);
    IF v_qty < 1 OR v_qty > 100 THEN PERFORM public.case_fail('invalid_quantity'); END IF;
    v_list := v_unit_in;
    v_unit := v_unit_in;
  ELSE
    PERFORM public.case_fail('invalid_item_kind');
  END IF;

  IF v_unit < 0 THEN PERFORM public.case_fail('invalid_price'); END IF;
  IF v_unit <> v_list AND v_reason IS NULL THEN PERFORM public.case_fail('price_reason_required', v_desc); END IF;

  RETURN jsonb_strip_nulls(jsonb_build_object(
    'kind', k, 'desc', v_desc, 'qty', v_qty, 'list', v_list, 'unit', v_unit,
    'reason', CASE WHEN v_unit <> v_list THEN v_reason END,
    'cost', v_cost, 'quality_label', v_label,
    'service_id', rs.id, 'model_id', rs.model_id,
    'sku_id', CASE WHEN k = 'product' THEN sp.id END,
    'device_id', CASE WHEN k = 'device' THEN dv.id END,
    'part', v_part, 'warn', v_warn));
END;
$$;

-- Indsætter en planlagt linje (og evt. dellinje) og reserverer lager/enhed.
-- Kalderen har låst sagen, enhederne og lagerrækkerne (repair__lock_skus).
CREATE OR REPLACE FUNCTION public.repair__apply_plan(p_ticket uuid, p_plan jsonb, p_loc uuid, p_staff uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  k text := p_plan->>'kind'; v_id uuid := gen_random_uuid(); v_part_id uuid;
  v_status text := 'none'; v_rc integer; v_qty integer := (p_plan->>'qty')::integer;
  v_now timestamptz := clock_timestamp(); part jsonb := p_plan->'part'; v_pstatus text;
BEGIN
  IF k = 'product' THEN
    v_status := public.repair__reserve_sku((p_plan->>'sku_id')::uuid, p_loc, v_qty);
  ELSIF k = 'device' THEN
    UPDATE public.devices
       SET status = 'reserved', reservation_ticket_id = p_ticket, reservation_expires_at = NULL,
           updated_at = clock_timestamp()
     WHERE id = (p_plan->>'device_id')::uuid AND status = 'listed' AND location_id = p_loc;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN PERFORM public.case_fail('device_unavailable', p_plan->>'device_id'); END IF;
    v_status := 'reserved';
  END IF;

  INSERT INTO public.repair_ticket_items (
    id, ticket_id, kind, repair_service_id, sku_product_id, device_id, description, quality_label,
    qty, list_price_oere, unit_price_oere, price_reason, cost_oere, location_id, stock_status,
    reserved_at, created_by, created_at, updated_at
  ) VALUES (
    v_id, p_ticket, k,
    CASE WHEN k = 'repair' THEN (p_plan->>'service_id')::uuid END,
    CASE WHEN k = 'product' THEN (p_plan->>'sku_id')::uuid END,
    CASE WHEN k = 'device' THEN (p_plan->>'device_id')::uuid END,
    p_plan->>'desc', p_plan->>'quality_label', v_qty,
    (p_plan->>'list')::integer, (p_plan->>'unit')::integer, p_plan->>'reason',
    (p_plan->>'cost')::integer, p_loc, v_status,
    CASE WHEN v_status = 'reserved' THEN v_now END, p_staff, v_now, v_now);

  IF k = 'repair' AND part IS NOT NULL THEN
    v_pstatus := public.repair__reserve_sku((part->>'sku_id')::uuid, p_loc, (part->>'qty')::integer);
    INSERT INTO public.repair_ticket_items (
      ticket_id, parent_item_id, kind, sku_product_id, description, quality_label, qty,
      list_price_oere, unit_price_oere, cost_oere, location_id, stock_status, reserved_at,
      created_by, created_at, updated_at
    ) VALUES (
      p_ticket, v_id, 'part', (part->>'sku_id')::uuid, part->>'title', part->>'quality_label',
      (part->>'qty')::integer, 0, 0, (part->>'cost')::integer, p_loc, v_pstatus,
      CASE WHEN v_pstatus = 'reserved' THEN v_now END, p_staff, v_now + interval '1 microsecond', v_now);
  END IF;
  RETURN v_id;
END;
$$;

-- Skal en sag have linjer tilføjet, må den ikke have gamle linjer (services/booking/tilbud)
-- uden linjer: caseLines() prioriterer linjer og ville skjule de gamle.
CREATE OR REPLACE FUNCTION public.repair__assert_editable(p_ticket public.repair_tickets) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF coalesce(p_ticket.paid, false) THEN PERFORM public.case_fail('ticket_paid'); END IF;
  IF p_ticket.status IN ('afhentet', 'annulleret') THEN PERFORM public.case_fail('ticket_closed', p_ticket.status); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.repair_ticket_items WHERE ticket_id = p_ticket.id) AND (
       jsonb_array_length(CASE WHEN jsonb_typeof(p_ticket.services) = 'array' THEN p_ticket.services ELSE '[]'::jsonb END) > 0
    OR jsonb_array_length(CASE WHEN jsonb_typeof(p_ticket.booking_details->'selected_services') = 'array'
                               THEN p_ticket.booking_details->'selected_services' ELSE '[]'::jsonb END) > 0
    OR coalesce(p_ticket.booking_details->>'includes_tempered_glass', 'false') = 'true'
    OR EXISTS (SELECT 1 FROM public.repair_quotes q WHERE q.ticket_id = p_ticket.id AND q.declined_at IS NULL)
  ) THEN
    PERFORM public.case_fail('legacy_ticket');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.repair__log(p_staff uuid, p_action text, p_ticket uuid, p_details jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF p_staff IS NULL THEN RETURN; END IF;
  INSERT INTO public.activity_log (actor_id, actor_type, action, entity_type, entity_id, details)
  VALUES (p_staff, 'staff', p_action, 'repair_ticket', p_ticket, p_details);
END;
$$;

-- ------------------------------------------------------------
-- repair_case_create
-- ------------------------------------------------------------
-- p = { staff_id, idempotency_key?, store_id ('vejle'|'slagelse'),
--       customer{id?, type, name, phone, email?, company_name?, cvr?, ean?, invoice_email?, contact_person?},
--       device{repair_model_id?, brand?, model?, serial_number?, color?, customer_device_id?, passcode?},
--       items[{kind: repair|product|device|free_text, ...}],
--       details{promised_at?, assigned_to?, internal_notes?, checklist?, intake_photos?, is_urgent?} }
CREATE OR REPLACE FUNCTION public.repair_case_create(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_staff uuid := nullif(p->>'staff_id', '')::uuid;
  v_key text := nullif(btrim(coalesce(p->>'idempotency_key', '')), '');
  v_hash text := md5((p - 'idempotency_key' - 'staff_id')::text);
  v_store text := lower(btrim(coalesce(p->>'store_id', '')));
  cu jsonb := coalesce(p->'customer', '{}'::jsonb);
  dv jsonb := coalesce(p->'device', '{}'::jsonb);
  det jsonb := coalesce(p->'details', '{}'::jsonb);
  items jsonb := p->'items';
  v_loc uuid; v_staff_name text; v_rc integer; v_prev record;
  v_type text; v_cname text; v_phone text; v_email text; v_company text; v_cvr text; v_ean text;
  v_inv text; v_contact text; v_cust uuid; crow public.customers%ROWTYPE;
  v_model uuid := nullif(dv->>'repair_model_id', '')::uuid;
  v_brand text; v_modelname text; v_dtype text := 'smartphone'; v_label text; v_cdev uuid;
  e record; v_plan jsonb; v_plans jsonb := '[]'::jsonb; v_has_repair boolean := false;
  v_skus uuid[]; v_devs uuid[]; v_ticket uuid; v_number text; v_warnings jsonb := '[]'::jsonb;
  v_notes jsonb := '[]'::jsonb; v_promised timestamptz; v_resp jsonb; v_back jsonb; v_checklist jsonb;
  v_photos text[];
BEGIN
  IF v_staff IS NULL THEN PERFORM public.case_fail('staff_not_found'); END IF;
  IF v_store NOT IN ('vejle', 'slagelse') THEN PERFORM public.case_fail('store_required'); END IF;
  SELECT id INTO v_loc FROM public.locations WHERE slug = v_store;
  IF v_loc IS NULL THEN PERFORM public.case_fail('store_required'); END IF;
  PERFORM public.repair__check_actor(v_staff, v_loc);
  SELECT name INTO v_staff_name FROM public.staff WHERE id = v_staff;

  IF jsonb_typeof(items) IS DISTINCT FROM 'array' OR jsonb_array_length(items) = 0 THEN
    PERFORM public.case_fail('no_items');
  END IF;
  IF jsonb_array_length(items) > 30 THEN PERFORM public.case_fail('too_many_items'); END IF;

  -- Idempotens: samme nøgle + samme body giver det gemte svar; en anden body er en fejl.
  IF v_key IS NOT NULL THEN
    INSERT INTO public.repair_case_requests (staff_id, idem_key, request_hash)
      VALUES (v_staff, v_key, v_hash) ON CONFLICT (staff_id, idem_key) DO NOTHING;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc = 0 THEN
      SELECT request_hash, response INTO v_prev FROM public.repair_case_requests
        WHERE staff_id = v_staff AND idem_key = v_key;
      IF v_prev.request_hash <> v_hash THEN PERFORM public.case_fail('idempotency_conflict'); END IF;
      IF v_prev.response IS NULL THEN PERFORM public.case_fail('request_in_progress'); END IF;
      RETURN v_prev.response || jsonb_build_object('replayed', true);
    END IF;
  END IF;

  -- ---- kunde ----
  v_type := coalesce(nullif(cu->>'type', ''), 'privat');
  IF v_type NOT IN ('privat', 'erhverv') THEN PERFORM public.case_fail('invalid_customer_type'); END IF;
  v_cname := left(btrim(coalesce(cu->>'name', '')), 200);
  IF v_cname = '' THEN PERFORM public.case_fail('customer_name_required'); END IF;
  v_phone := left(btrim(coalesce(cu->>'phone', '')), 40);
  IF v_phone = '' THEN PERFORM public.case_fail('customer_phone_required'); END IF;
  v_email := nullif(left(btrim(coalesce(cu->>'email', '')), 200), '');
  v_company := nullif(left(btrim(coalesce(cu->>'company_name', '')), 200), '');
  v_cvr := nullif(regexp_replace(upper(coalesce(cu->>'cvr', '')), '^DK|[^0-9]', '', 'g'), '');
  v_ean := nullif(regexp_replace(coalesce(cu->>'ean', ''), '[^0-9]', '', 'g'), '');
  v_inv := nullif(left(btrim(coalesce(cu->>'invoice_email', '')), 200), '');
  v_contact := nullif(left(btrim(coalesce(cu->>'contact_person', '')), 200), '');
  IF v_cvr IS NOT NULL AND v_cvr !~ '^[0-9]{8}$' THEN PERFORM public.case_fail('invalid_cvr'); END IF;
  IF v_ean IS NOT NULL AND v_ean !~ '^[0-9]{13}$' THEN PERFORM public.case_fail('invalid_ean'); END IF;
  IF v_inv IS NOT NULL AND position('@' IN v_inv) < 2 THEN PERFORM public.case_fail('invalid_invoice_email'); END IF;
  IF v_type = 'erhverv' AND v_company IS NULL THEN PERFORM public.case_fail('company_required'); END IF;

  v_cust := nullif(cu->>'id', '')::uuid;
  IF v_cust IS NOT NULL THEN
    SELECT * INTO crow FROM public.customers WHERE id = v_cust FOR UPDATE;
    IF NOT FOUND THEN PERFORM public.case_fail('customer_not_found'); END IF;
    UPDATE public.customers SET
      name = v_cname, phone = v_phone, email = coalesce(v_email, email),
      type = CASE WHEN v_type = 'erhverv' THEN 'erhverv' ELSE type END,
      company_name = CASE WHEN v_type = 'erhverv' THEN coalesce(v_company, company_name) ELSE company_name END,
      cvr = CASE WHEN v_type = 'erhverv' THEN coalesce(v_cvr, cvr) ELSE cvr END,
      ean = CASE WHEN v_type = 'erhverv' THEN coalesce(v_ean, ean) ELSE ean END,
      invoice_email = CASE WHEN v_type = 'erhverv' THEN coalesce(v_inv, invoice_email) ELSE invoice_email END,
      contact_person = CASE WHEN v_type = 'erhverv' THEN coalesce(v_contact, contact_person) ELSE contact_person END
    WHERE id = v_cust RETURNING * INTO crow;
  ELSE
    INSERT INTO public.customers (type, name, email, phone, company_name, cvr, ean, invoice_email, contact_person)
    VALUES (v_type, v_cname, v_email, v_phone,
            CASE WHEN v_type = 'erhverv' THEN v_company END, CASE WHEN v_type = 'erhverv' THEN v_cvr END,
            CASE WHEN v_type = 'erhverv' THEN v_ean END, CASE WHEN v_type = 'erhverv' THEN v_inv END,
            CASE WHEN v_type = 'erhverv' THEN v_contact END)
    RETURNING * INTO crow;
    v_cust := crow.id;
  END IF;

  -- ---- enhed ----
  v_brand := nullif(btrim(coalesce(dv->>'brand', '')), '');
  v_modelname := nullif(btrim(coalesce(dv->>'model', '')), '');
  IF v_model IS NOT NULL THEN
    SELECT coalesce(v_brand, b.name), coalesce(v_modelname, m.name), b.device_type
      INTO v_brand, v_modelname, v_dtype
      FROM public.repair_models m JOIN public.repair_brands b ON b.id = m.brand_id WHERE m.id = v_model;
    IF NOT FOUND THEN PERFORM public.case_fail('model_not_found'); END IF;
  END IF;
  IF v_modelname IS NULL THEN PERFORM public.case_fail('device_model_required'); END IF;
  v_label := CASE WHEN v_brand IS NULL OR lower(v_modelname) LIKE lower(v_brand) || '%' THEN v_modelname
                  ELSE v_brand || ' ' || v_modelname END;

  v_cdev := nullif(dv->>'customer_device_id', '')::uuid;
  IF v_cdev IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.customer_devices WHERE id = v_cdev AND customer_id = v_cust) THEN
      PERFORM public.case_fail('customer_device_not_found');
    END IF;
  ELSE
    INSERT INTO public.customer_devices (customer_id, brand, model, serial_number, color)
    VALUES (v_cust, coalesce(v_brand, 'Ukendt'), v_modelname,
            nullif(btrim(coalesce(dv->>'serial_number', '')), ''), nullif(btrim(coalesce(dv->>'color', '')), ''))
    RETURNING id INTO v_cdev;
  END IF;

  -- ---- linjer: lås enheder, planlæg, lås lager ----
  SELECT array_agg((x->>'device_id')::uuid ORDER BY (x->>'device_id')::uuid) INTO v_devs
    FROM jsonb_array_elements(items) x WHERE x->>'kind' = 'device';
  IF v_devs IS NOT NULL THEN
    PERFORM 1 FROM public.devices WHERE id = ANY (v_devs) ORDER BY id FOR UPDATE;
  END IF;

  FOR e IN SELECT x FROM jsonb_array_elements(items) AS t(x) LOOP
    v_plan := public.repair__plan_item(e.x, v_loc, v_model);
    IF v_plan->>'kind' = 'repair' THEN
      IF v_model IS NULL THEN v_model := (v_plan->>'model_id')::uuid; END IF;
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_plans) q WHERE q->>'service_id' = v_plan->>'service_id') THEN
        PERFORM public.case_fail('duplicate_service', v_plan->>'desc');
      END IF;
      v_has_repair := true;
    ELSIF v_plan->>'kind' = 'free_text' THEN
      v_has_repair := true;
    END IF;
    IF v_plan ? 'warn' THEN v_warnings := v_warnings || to_jsonb(v_plan->>'warn'); END IF;
    v_plans := v_plans || jsonb_build_array(v_plan);
  END LOOP;
  IF NOT v_has_repair THEN PERFORM public.case_fail('repair_required'); END IF;

  SELECT array_agg(DISTINCT s) INTO v_skus FROM (
    SELECT (q->>'sku_id')::uuid AS s FROM jsonb_array_elements(v_plans) q
    UNION ALL
    SELECT (q->'part'->>'sku_id')::uuid FROM jsonb_array_elements(v_plans) q
  ) z WHERE s IS NOT NULL;
  PERFORM public.repair__lock_skus(v_skus, v_loc);

  -- ---- sagen ----
  IF nullif(det->>'promised_at', '') IS NOT NULL THEN v_promised := (det->>'promised_at')::timestamptz; END IF;
  IF nullif(btrim(coalesce(det->>'internal_notes', '')), '') IS NOT NULL THEN
    v_notes := jsonb_build_array(jsonb_build_object(
      'text', left(btrim(det->>'internal_notes'), 2000), 'author', coalesce(v_staff_name, 'Ny sag'),
      'timestamp', to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  END IF;
  v_checklist := CASE WHEN jsonb_typeof(det->'checklist') = 'array' THEN det->'checklist' ELSE '[]'::jsonb END;
  v_photos := CASE WHEN jsonb_typeof(det->'intake_photos') = 'array'
                   THEN ARRAY(SELECT jsonb_array_elements_text(det->'intake_photos')) ELSE '{}'::text[] END;

  INSERT INTO public.repair_tickets (
    customer_name, customer_email, customer_phone, device_type, device_model, issue_description,
    service_type, status, customer_id, device_id, store_id, location_id, repair_model_id, services,
    internal_notes, intake_checklist, intake_photos, checkout_photos, paid, promised_at, assigned_to,
    is_urgent, billing_snapshot, device_passcode
  ) VALUES (
    v_cname, coalesce(v_email, ''), v_phone, v_dtype, v_label, '',
    'repair', 'modtaget', v_cust, v_cdev, v_store, v_loc, v_model, '[]'::jsonb,
    v_notes, v_checklist, v_photos, '{}'::text[], false, v_promised,
    nullif(btrim(coalesce(det->>'assigned_to', '')), ''),
    coalesce((det->>'is_urgent')::boolean, false),
    jsonb_build_object('type', v_type, 'name', crow.name, 'phone', crow.phone, 'email', crow.email,
      'company_name', crow.company_name, 'cvr', crow.cvr, 'ean', crow.ean,
      'invoice_email', crow.invoice_email, 'contact_person', crow.contact_person),
    nullif(left(btrim(coalesce(dv->>'passcode', '')), 100), '')
  ) RETURNING id, ticket_number INTO v_ticket, v_number;

  FOR e IN SELECT x FROM jsonb_array_elements(v_plans) AS t(x) LOOP
    PERFORM public.repair__apply_plan(v_ticket, e.x, v_loc, v_staff);
  END LOOP;
  PERFORM public.repair__sync_services(v_ticket);

  INSERT INTO public.repair_status_log (ticket_id, old_status, new_status, note)
    VALUES (v_ticket, NULL, 'modtaget', 'Sag oprettet via Ny sag');
  PERFORM public.repair__log(v_staff, 'repair_case_created', v_ticket, jsonb_build_object(
    'ticket_number', v_number, 'store', v_store, 'items', jsonb_array_length(v_plans),
    'total_oere', public.repair__total(v_ticket)));

  v_back := public.repair__backorders_json(v_ticket);
  v_resp := jsonb_build_object(
    'ticket_id', v_ticket, 'ticket_number', v_number, 'customer_id', v_cust,
    'lines', public.repair__items_json(v_ticket), 'backorders', v_back,
    'total_oere', public.repair__total(v_ticket),
    'needs_deposit', jsonb_array_length(v_back) > 0,
    'replayed', false, 'warnings', v_warnings);

  IF v_key IS NOT NULL THEN
    UPDATE public.repair_case_requests SET ticket_id = v_ticket, response = v_resp
      WHERE staff_id = v_staff AND idem_key = v_key;
  END IF;
  RETURN v_resp;
END;
$$;

-- ------------------------------------------------------------
-- repair_case_add_item   p = { ticket_id, staff_id, item{...} }
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_case_add_item(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_ticket uuid := nullif(p->>'ticket_id', '')::uuid; v_staff uuid := nullif(p->>'staff_id', '')::uuid;
  item jsonb := p->'item'; t public.repair_tickets%ROWTYPE; v_plan jsonb; v_skus uuid[]; v_id uuid;
BEGIN
  SELECT * INTO t FROM public.repair_tickets WHERE id = v_ticket FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.case_fail('ticket_not_found'); END IF;
  PERFORM public.repair__check_actor(v_staff, t.location_id);
  PERFORM public.repair__assert_editable(t);
  IF jsonb_typeof(item) IS DISTINCT FROM 'object' THEN PERFORM public.case_fail('invalid_item_kind'); END IF;

  IF item->>'kind' = 'device' THEN
    PERFORM 1 FROM public.devices WHERE id = nullif(item->>'device_id', '')::uuid FOR UPDATE;
  END IF;
  v_plan := public.repair__plan_item(item, t.location_id, t.repair_model_id);
  IF v_plan->>'kind' = 'repair' AND EXISTS (
       SELECT 1 FROM public.repair_ticket_items WHERE ticket_id = t.id AND kind = 'repair'
          AND repair_service_id = (v_plan->>'service_id')::uuid) THEN
    PERFORM public.case_fail('duplicate_service', v_plan->>'desc');
  END IF;
  SELECT array_agg(s) INTO v_skus FROM (
    SELECT (v_plan->>'sku_id')::uuid AS s UNION ALL SELECT (v_plan->'part'->>'sku_id')::uuid) z WHERE s IS NOT NULL;
  PERFORM public.repair__lock_skus(v_skus, t.location_id);

  v_id := public.repair__apply_plan(t.id, v_plan, t.location_id, v_staff);
  IF v_plan->>'kind' = 'repair' AND t.repair_model_id IS NULL THEN
    UPDATE public.repair_tickets SET repair_model_id = (v_plan->>'model_id')::uuid WHERE id = t.id;
  END IF;
  PERFORM public.repair__sync_services(t.id);
  PERFORM public.repair__log(v_staff, 'repair_case_item_added', t.id,
    jsonb_build_object('item_id', v_id, 'kind', v_plan->>'kind', 'description', v_plan->>'desc', 'unit_oere', (v_plan->>'unit')::integer));
  RETURN jsonb_build_object('lines', public.repair__items_json(t.id), 'backorders', public.repair__backorders_json(t.id),
                            'total_oere', public.repair__total(t.id),
                            'warnings', CASE WHEN v_plan ? 'warn' THEN jsonb_build_array(v_plan->>'warn') ELSE '[]'::jsonb END);
END;
$$;

-- ------------------------------------------------------------
-- repair_case_remove_item   p = { ticket_id, item_id, staff_id }
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_case_remove_item(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_ticket uuid := nullif(p->>'ticket_id', '')::uuid; v_staff uuid := nullif(p->>'staff_id', '')::uuid;
  v_item uuid := nullif(p->>'item_id', '')::uuid; t public.repair_tickets%ROWTYPE;
  it public.repair_ticket_items%ROWTYPE; ch public.repair_ticket_items%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.repair_tickets WHERE id = v_ticket FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.case_fail('ticket_not_found'); END IF;
  PERFORM public.repair__check_actor(v_staff, t.location_id);
  PERFORM public.repair__assert_editable(t);
  SELECT * INTO it FROM public.repair_ticket_items WHERE id = v_item AND ticket_id = t.id FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.case_fail('item_not_found'); END IF;
  IF it.stock_status = 'sold' THEN PERFORM public.case_fail('item_sold'); END IF;
  IF it.stock_status = 'consumed' THEN PERFORM public.case_fail('item_consumed'); END IF;

  FOR ch IN SELECT * FROM public.repair_ticket_items WHERE parent_item_id = it.id
             ORDER BY sku_product_id, id FOR UPDATE LOOP
    IF ch.stock_status IN ('sold', 'consumed') THEN PERFORM public.case_fail('item_consumed'); END IF;
    PERFORM public.repair__release_item(ch.id);
    DELETE FROM public.repair_ticket_items WHERE id = ch.id;
  END LOOP;
  PERFORM public.repair__release_item(it.id);
  DELETE FROM public.repair_ticket_items WHERE id = it.id;

  PERFORM public.repair__sync_services(t.id);
  PERFORM public.repair__log(v_staff, 'repair_case_item_removed', t.id,
    jsonb_build_object('item_id', it.id, 'kind', it.kind, 'description', it.description,
                       'unit_oere', it.unit_price_oere, 'qty', it.qty, 'stock_status', it.stock_status));
  RETURN jsonb_build_object('lines', public.repair__items_json(t.id), 'backorders', public.repair__backorders_json(t.id),
                            'total_oere', public.repair__total(t.id));
END;
$$;

-- ------------------------------------------------------------
-- repair_case_swap_part   p = { ticket_id, item_id (reparations- eller dellinje), sku_product_id, staff_id }
-- Sætter også en del på en reparation der ikke har nogen (part_mode 'manual').
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_case_swap_part(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_ticket uuid := nullif(p->>'ticket_id', '')::uuid; v_staff uuid := nullif(p->>'staff_id', '')::uuid;
  v_item uuid := nullif(p->>'item_id', '')::uuid; v_sku uuid := nullif(p->>'sku_product_id', '')::uuid;
  t public.repair_tickets%ROWTYPE; it public.repair_ticket_items%ROWTYPE; rep public.repair_ticket_items%ROWTYPE;
  part public.repair_ticket_items%ROWTYPE; sp public.sku_products%ROWTYPE; v_label text; v_status text;
  v_qty integer := 1; v_ok boolean; v_rsp public.repair_service_parts%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.repair_tickets WHERE id = v_ticket FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.case_fail('ticket_not_found'); END IF;
  PERFORM public.repair__check_actor(v_staff, t.location_id);
  PERFORM public.repair__assert_editable(t);

  SELECT * INTO it FROM public.repair_ticket_items WHERE id = v_item AND ticket_id = t.id FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.case_fail('item_not_found'); END IF;
  IF it.kind = 'repair' THEN
    rep := it;
    SELECT * INTO part FROM public.repair_ticket_items WHERE parent_item_id = rep.id AND kind = 'part' FOR UPDATE;
  ELSIF it.kind = 'part' THEN
    part := it;
    SELECT * INTO rep FROM public.repair_ticket_items WHERE id = part.parent_item_id;
  ELSE
    PERFORM public.case_fail('not_a_repair_item');
  END IF;
  IF part.id IS NOT NULL AND part.stock_status IN ('consumed', 'sold') THEN PERFORM public.case_fail('item_consumed'); END IF;

  SELECT * INTO sp FROM public.sku_products WHERE id = v_sku;
  IF NOT FOUND THEN PERFORM public.case_fail('sku_not_found'); END IF;
  -- Tilladt: koblet til reparationen, eller en reservedel til samme model.
  SELECT * INTO v_rsp FROM public.repair_service_parts WHERE repair_service_id = rep.repair_service_id AND sku_product_id = v_sku;
  v_ok := FOUND OR (sp.part_category_id IS NOT NULL AND sp.repair_model_id IS NOT NULL
                    AND sp.repair_model_id IS NOT DISTINCT FROM t.repair_model_id);
  IF NOT v_ok THEN PERFORM public.case_fail('part_not_allowed'); END IF;
  v_qty := coalesce(v_rsp.qty, 1);

  PERFORM public.repair__lock_skus(ARRAY[v_sku] || CASE WHEN part.id IS NOT NULL THEN ARRAY[part.sku_product_id] ELSE '{}'::uuid[] END,
                                   t.location_id);
  IF part.id IS NOT NULL THEN PERFORM public.repair__release_item(part.id); END IF;
  v_status := public.repair__reserve_sku(v_sku, t.location_id, v_qty);
  SELECT q.name INTO v_label FROM public.spare_part_quality_tiers q WHERE q.id = sp.quality_tier_id;

  IF part.id IS NOT NULL THEN
    UPDATE public.repair_ticket_items SET
      sku_product_id = v_sku, description = sp.title, quality_label = v_label, qty = v_qty,
      cost_oere = sp.cost_price, stock_status = v_status,
      reserved_at = CASE WHEN v_status = 'reserved' THEN clock_timestamp() END,
      released_at = NULL, updated_at = clock_timestamp()
    WHERE id = part.id;
  ELSE
    INSERT INTO public.repair_ticket_items (
      ticket_id, parent_item_id, kind, sku_product_id, description, quality_label, qty,
      list_price_oere, unit_price_oere, cost_oere, location_id, stock_status, reserved_at, created_by,
      created_at, updated_at
    ) VALUES (
      t.id, rep.id, 'part', v_sku, sp.title, v_label, v_qty, 0, 0, sp.cost_price, t.location_id, v_status,
      CASE WHEN v_status = 'reserved' THEN clock_timestamp() END, v_staff,
      clock_timestamp(), clock_timestamp());
  END IF;
  UPDATE public.repair_tickets SET updated_at = clock_timestamp() WHERE id = t.id;
  PERFORM public.repair__log(v_staff, 'repair_case_part_swapped', t.id,
    jsonb_build_object('repair_item_id', rep.id, 'old_sku', part.sku_product_id, 'new_sku', v_sku, 'stock_status', v_status));
  RETURN jsonb_build_object('lines', public.repair__items_json(t.id), 'backorders', public.repair__backorders_json(t.id),
                            'total_oere', public.repair__total(t.id));
END;
$$;

-- ------------------------------------------------------------
-- repair_consume_parts: ved status 'faerdig'. Idempotent (kun dele der ikke er brugt endnu).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_consume_parts(p_ticket_id uuid, p_staff_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  t record; it record; v_cost integer; v_unl boolean; v_q integer; v_r integer;
  v_done integer := 0; v_short integer := 0; v_already integer; v_note text;
BEGIN
  SELECT id, status, ticket_number INTO t FROM public.repair_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.case_fail('ticket_not_found'); END IF;
  IF t.status = 'annulleret' THEN
    RETURN jsonb_build_object('consumed', 0, 'already', 0, 'shortfall', 0, 'skipped', 'annulleret');
  END IF;
  v_note := 'Sag ' || coalesce(t.ticket_number, p_ticket_id::text) || ' · del brugt';
  SELECT count(*) INTO v_already FROM public.repair_ticket_items
    WHERE ticket_id = p_ticket_id AND kind = 'part' AND stock_status = 'consumed';

  FOR it IN
    SELECT * FROM public.repair_ticket_items
     WHERE ticket_id = p_ticket_id AND kind = 'part' AND stock_status IN ('none', 'planned', 'reserved', 'backorder')
     ORDER BY sku_product_id, id FOR UPDATE
  LOOP
    SELECT cost_price, always_in_stock INTO v_cost, v_unl FROM public.sku_products WHERE id = it.sku_product_id;
    IF it.stock_status = 'reserved' THEN
      UPDATE public.sku_stock
         SET quantity = quantity - it.qty, reserved_qty = reserved_qty - it.qty, updated_at = clock_timestamp()
       WHERE product_id = it.sku_product_id AND location_id = it.location_id
         AND quantity >= it.qty AND reserved_qty >= it.qty;
      IF FOUND THEN
        INSERT INTO public.stock_movements (location_id, sku_product_id, qty_delta, reason, ref_note, staff_id, ref_repair_ticket_id)
          VALUES (it.location_id, it.sku_product_id, -it.qty, 'repair', v_note, p_staff_id, p_ticket_id);
      ELSE
        v_short := v_short + 1;
        UPDATE public.sku_stock SET reserved_qty = greatest(reserved_qty - it.qty, 0), updated_at = clock_timestamp()
         WHERE product_id = it.sku_product_id AND location_id = it.location_id;
      END IF;
    ELSIF it.stock_status = 'backorder' AND NOT coalesce(v_unl, false) AND it.location_id IS NOT NULL THEN
      SELECT quantity, reserved_qty INTO v_q, v_r FROM public.sku_stock
        WHERE product_id = it.sku_product_id AND location_id = it.location_id FOR UPDATE;
      IF coalesce(v_q, 0) - coalesce(v_r, 0) >= it.qty THEN
        UPDATE public.sku_stock SET quantity = quantity - it.qty, updated_at = clock_timestamp()
          WHERE product_id = it.sku_product_id AND location_id = it.location_id;
        INSERT INTO public.stock_movements (location_id, sku_product_id, qty_delta, reason, ref_note, staff_id, ref_repair_ticket_id)
          VALUES (it.location_id, it.sku_product_id, -it.qty, 'repair', v_note, p_staff_id, p_ticket_id);
      ELSE
        v_short := v_short + 1;   -- delen kom aldrig ind på lager: intet at trække
      END IF;
    END IF;
    UPDATE public.repair_ticket_items
       SET stock_status = 'consumed', consumed_at = clock_timestamp(),
           cost_oere = coalesce(v_cost, cost_oere), updated_at = clock_timestamp()
     WHERE id = it.id;
    v_done := v_done + 1;
  END LOOP;

  IF v_done > 0 THEN
    PERFORM public.repair__log(p_staff_id, 'repair_parts_consumed', p_ticket_id,
      jsonb_build_object('consumed', v_done, 'shortfall', v_short));
  END IF;
  RETURN jsonb_build_object('consumed', v_done, 'already', v_already, 'shortfall', v_short);
END;
$$;

-- ------------------------------------------------------------
-- repair_case_cancel   p = { ticket_id, staff_id, reason }
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_case_cancel(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_ticket uuid := nullif(p->>'ticket_id', '')::uuid; v_staff uuid := nullif(p->>'staff_id', '')::uuid;
  v_reason text := left(btrim(coalesce(p->>'reason', '')), 300);
  t public.repair_tickets%ROWTYPE; it record; v_n integer := 0; v_old text;
BEGIN
  IF v_reason = '' THEN PERFORM public.case_fail('cancel_reason_required'); END IF;
  SELECT * INTO t FROM public.repair_tickets WHERE id = v_ticket FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.case_fail('ticket_not_found'); END IF;
  PERFORM public.repair__check_actor(v_staff, t.location_id);
  IF t.status = 'annulleret' THEN PERFORM public.case_fail('already_cancelled'); END IF;
  IF t.status = 'afhentet' OR coalesce(t.paid, false) THEN PERFORM public.case_fail('cancel_not_allowed'); END IF;
  IF EXISTS (SELECT 1 FROM public.repair_ticket_items WHERE ticket_id = t.id AND stock_status = 'sold') THEN
    PERFORM public.case_fail('cancel_has_sold_items');
  END IF;
  IF EXISTS (SELECT 1 FROM public.order_items oi
              WHERE oi.repair_ticket_id = t.id AND oi.item_type = 'deposit' AND oi.quantity > 0
                AND coalesce(public.pos_deposit_remaining(oi.id), 0) > 0) THEN
    PERFORM public.case_fail('cancel_has_deposit');
  END IF;

  FOR it IN
    SELECT id FROM public.repair_ticket_items
     WHERE ticket_id = t.id AND stock_status IN ('none', 'planned', 'reserved', 'backorder')
     ORDER BY sku_product_id, id FOR UPDATE
  LOOP
    PERFORM public.repair__release_item(it.id);
    UPDATE public.repair_ticket_items SET stock_status = 'released', released_at = clock_timestamp(),
           updated_at = clock_timestamp() WHERE id = it.id;
    v_n := v_n + 1;
  END LOOP;

  v_old := t.status;
  UPDATE public.repair_tickets SET status = 'annulleret', device_passcode = NULL, updated_at = clock_timestamp() WHERE id = t.id;
  INSERT INTO public.repair_status_log (ticket_id, old_status, new_status, note)
    VALUES (t.id, v_old, 'annulleret', v_reason);
  PERFORM public.repair__log(v_staff, 'repair_case_cancelled', t.id,
    jsonb_build_object('reason', v_reason, 'released_items', v_n, 'old_status', v_old));
  RETURN jsonb_build_object('ticket_id', t.id, 'status', 'annulleret', 'released_items', v_n);
END;
$$;

-- ------------------------------------------------------------
-- repair_allocate_backorders: indkommen vare lægges til side til de ældste ventende linjer.
-- Kaldes af stock_receive_goods / pos_adjust_stock (som allerede har låst lagerrækken).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_allocate_backorders(p_sku uuid, p_loc uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE it record; v_q integer; v_r integer; v_n integer := 0;
BEGIN
  SELECT quantity, reserved_qty INTO v_q, v_r FROM public.sku_stock
    WHERE product_id = p_sku AND location_id = p_loc FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;
  FOR it IN
    SELECT i.id, i.qty FROM public.repair_ticket_items i
     JOIN public.repair_tickets t ON t.id = i.ticket_id
     WHERE i.sku_product_id = p_sku AND i.location_id = p_loc AND i.stock_status = 'backorder'
       AND t.status NOT IN ('annulleret', 'afhentet')
     ORDER BY i.created_at, i.id
     FOR UPDATE OF i SKIP LOCKED
  LOOP
    IF v_q - v_r >= it.qty THEN
      UPDATE public.sku_stock SET reserved_qty = reserved_qty + it.qty, updated_at = clock_timestamp()
        WHERE product_id = p_sku AND location_id = p_loc;
      v_r := v_r + it.qty;
      UPDATE public.repair_ticket_items SET stock_status = 'reserved', reserved_at = clock_timestamp(),
             updated_at = clock_timestamp() WHERE id = it.id;
      v_n := v_n + 1;
    END IF;
  END LOOP;
  RETURN v_n;
END;
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.case_fail(text,text)',
    'public.repair__check_actor(uuid,uuid)',
    'public.repair__items_json(uuid)',
    'public.repair__backorders_json(uuid)',
    'public.repair__total(uuid)',
    'public.repair__sync_services(uuid)',
    'public.repair__lock_skus(uuid[],uuid)',
    'public.repair__reserve_sku(uuid,uuid,integer)',
    'public.repair__release_item(uuid)',
    'public.repair__plan_item(jsonb,uuid,uuid)',
    'public.repair__apply_plan(uuid,jsonb,uuid,uuid)',
    'public.repair__assert_editable(public.repair_tickets)',
    'public.repair__log(uuid,text,uuid,jsonb)',
    'public.repair_case_create(jsonb)',
    'public.repair_case_add_item(jsonb)',
    'public.repair_case_remove_item(jsonb)',
    'public.repair_case_swap_part(jsonb)',
    'public.repair_consume_parts(uuid,uuid)',
    'public.repair_case_cancel(jsonb)',
    'public.repair_allocate_backorders(uuid,uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

COMMIT;

-- Verifikation (forventet resultat i kommentar):
--   SELECT proname, prosecdef FROM pg_proc WHERE proname LIKE 'repair\_case\_%' OR proname = 'repair_consume_parts' ORDER BY 1;
--                                  -- 6 rækker, alle SECURITY DEFINER
--   SELECT has_function_privilege('anon', 'public.repair_case_create(jsonb)', 'execute');         -- false
--   SELECT has_function_privilege('service_role', 'public.repair_case_create(jsonb)', 'execute'); -- true
--   -- Rygtest i en transaktion der rulles tilbage (indsæt rigtige id'er): kald repair_case_create med én reparation og
--   -- kontrollér sagen, linjerne, reserved_qty og at samme idempotency_key giver replayed = true.
