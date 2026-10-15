-- Sagsbehandling: ret prisen på en sagslinje og fjern en linje med begrundelse.
-- Kør EFTER 20261005130000_repair_case_functions.sql.
--
--   repair_case_update_item(jsonb)  ret stykprisen på en linje (p = { ticket_id, item_id, staff_id,
--                                   unit_price_oere, reason }). Tilladt også når delen er brugt: prisen
--                                   er kommerciel, ikke lager. En pris der afviger fra listeprisen kræver
--                                   en begrundelse (price_reason); en pris lig listeprisen nulstiller den.
--                                   Fritekst har ingen listepris: listeprisen følger den nye pris.
--                                   Logger gammel pris, ny pris og begrundelse i activity_log.
--   repair_case_remove_item(jsonb)  erstatter versionen fra 20261005130000 (p = { ticket_id, item_id,
--                                   staff_id, reason? }). Nu kan en linje også fjernes, når dens del
--                                   allerede er brugt (status 'faerdig'): linjen forsvinder fra regningen,
--                                   men lageret gives IKKE tilbage (delen er brugt fysisk, og
--                                   stock_movements 'repair' står urørt). En begrundelse er påkrævet i
--                                   det tilfælde. Solgte linjer kan stadig ikke fjernes her (returnér i
--                                   kassen), og betalte/afsluttede sager afvises af repair__assert_editable.
--
-- Fejl rejses som 'case:<kode>' (SQLSTATE PS003) som i de øvrige funktioner.
-- Idempotent (CREATE OR REPLACE) og transaktionel.

BEGIN;

-- ------------------------------------------------------------
-- repair_case_update_item
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_case_update_item(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_ticket uuid := nullif(p->>'ticket_id', '')::uuid; v_staff uuid := nullif(p->>'staff_id', '')::uuid;
  v_item uuid := nullif(p->>'item_id', '')::uuid; t public.repair_tickets%ROWTYPE;
  it public.repair_ticket_items%ROWTYPE; v_new integer; v_reason text; v_stored_reason text; v_list integer;
BEGIN
  IF p->>'unit_price_oere' IS NULL OR p->>'unit_price_oere' !~ '^[0-9]{1,9}$' THEN
    PERFORM public.case_fail('invalid_price');
  END IF;
  v_new := (p->>'unit_price_oere')::integer;
  v_reason := nullif(btrim(coalesce(p->>'reason', '')), '');
  IF length(coalesce(v_reason, '')) > 200 THEN PERFORM public.case_fail('price_reason_too_long'); END IF;

  SELECT * INTO t FROM public.repair_tickets WHERE id = v_ticket FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.case_fail('ticket_not_found'); END IF;
  PERFORM public.repair__check_actor(v_staff, t.location_id);
  PERFORM public.repair__assert_editable(t);
  SELECT * INTO it FROM public.repair_ticket_items WHERE id = v_item AND ticket_id = t.id FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.case_fail('item_not_found'); END IF;
  IF it.kind = 'part' THEN PERFORM public.case_fail('item_not_priced', it.description); END IF;
  IF it.stock_status = 'sold' THEN PERFORM public.case_fail('item_sold'); END IF;
  IF it.stock_status = 'released' THEN PERFORM public.case_fail('item_released'); END IF;

  -- Fritekst har ingen listepris: listeprisen er altid den aktuelle pris (som i repair__plan_item).
  v_list := CASE WHEN it.kind = 'free_text' THEN v_new ELSE it.list_price_oere END;
  IF v_new <> v_list AND v_reason IS NULL THEN PERFORM public.case_fail('price_reason_required', it.description); END IF;
  v_stored_reason := CASE WHEN v_new <> v_list THEN v_reason END;

  IF v_new = it.unit_price_oere AND v_stored_reason IS NOT DISTINCT FROM it.price_reason THEN
    RETURN jsonb_build_object('lines', public.repair__items_json(t.id), 'backorders', public.repair__backorders_json(t.id),
                              'total_oere', public.repair__total(t.id));
  END IF;

  UPDATE public.repair_ticket_items
     SET unit_price_oere = v_new, list_price_oere = v_list, price_reason = v_stored_reason,
         updated_at = clock_timestamp()
   WHERE id = it.id;

  PERFORM public.repair__sync_services(t.id);
  PERFORM public.repair__log(v_staff, 'repair_case_price_changed', t.id, jsonb_build_object(
    'item_id', it.id, 'kind', it.kind, 'description', it.description, 'qty', it.qty,
    'old_unit_oere', it.unit_price_oere, 'new_unit_oere', v_new, 'list_oere', v_list,
    'reason', v_reason, 'stock_status', it.stock_status));
  RETURN jsonb_build_object('lines', public.repair__items_json(t.id), 'backorders', public.repair__backorders_json(t.id),
                            'total_oere', public.repair__total(t.id));
END;
$$;

-- ------------------------------------------------------------
-- repair_case_remove_item   p = { ticket_id, item_id, staff_id, reason? }
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_case_remove_item(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_ticket uuid := nullif(p->>'ticket_id', '')::uuid; v_staff uuid := nullif(p->>'staff_id', '')::uuid;
  v_item uuid := nullif(p->>'item_id', '')::uuid; t public.repair_tickets%ROWTYPE;
  it public.repair_ticket_items%ROWTYPE; ch public.repair_ticket_items%ROWTYPE;
  v_reason text := nullif(left(btrim(coalesce(p->>'reason', '')), 300), '');
  v_used jsonb := '[]'::jsonb; v_consumed boolean;
BEGIN
  SELECT * INTO t FROM public.repair_tickets WHERE id = v_ticket FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.case_fail('ticket_not_found'); END IF;
  PERFORM public.repair__check_actor(v_staff, t.location_id);
  PERFORM public.repair__assert_editable(t);
  SELECT * INTO it FROM public.repair_ticket_items WHERE id = v_item AND ticket_id = t.id FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.case_fail('item_not_found'); END IF;
  IF it.stock_status = 'sold' THEN PERFORM public.case_fail('item_sold'); END IF;

  v_consumed := it.stock_status = 'consumed';
  FOR ch IN SELECT * FROM public.repair_ticket_items WHERE parent_item_id = it.id
             ORDER BY sku_product_id, id FOR UPDATE LOOP
    IF ch.stock_status = 'sold' THEN PERFORM public.case_fail('item_sold'); END IF;
    IF ch.stock_status = 'consumed' THEN v_consumed := true; END IF;
  END LOOP;
  -- En brugt del er fysisk væk: linjen må gerne fjernes fra regningen, men kun med en begrundelse.
  IF v_consumed AND v_reason IS NULL THEN PERFORM public.case_fail('remove_reason_required'); END IF;

  FOR ch IN SELECT * FROM public.repair_ticket_items WHERE parent_item_id = it.id
             ORDER BY sku_product_id, id LOOP
    IF ch.stock_status = 'consumed' THEN
      -- Lageret er allerede trukket (stock_movements 'repair'); intet gives tilbage. Delen noteres i loggen.
      v_used := v_used || jsonb_build_array(jsonb_build_object(
        'description', ch.description, 'qty', ch.qty, 'cost_oere', ch.cost_oere, 'sku_product_id', ch.sku_product_id));
    ELSE
      PERFORM public.repair__release_item(ch.id);
    END IF;
    DELETE FROM public.repair_ticket_items WHERE id = ch.id;
  END LOOP;
  IF it.stock_status = 'consumed' THEN
    v_used := v_used || jsonb_build_array(jsonb_build_object(
      'description', it.description, 'qty', it.qty, 'cost_oere', it.cost_oere, 'sku_product_id', it.sku_product_id));
  ELSE
    PERFORM public.repair__release_item(it.id);
  END IF;
  DELETE FROM public.repair_ticket_items WHERE id = it.id;

  PERFORM public.repair__sync_services(t.id);
  PERFORM public.repair__log(v_staff, 'repair_case_item_removed', t.id,
    jsonb_build_object('item_id', it.id, 'kind', it.kind, 'description', it.description,
                       'unit_oere', it.unit_price_oere, 'qty', it.qty, 'stock_status', it.stock_status,
                       'reason', v_reason, 'used_parts', v_used, 'stock_returned', NOT v_consumed));
  RETURN jsonb_build_object('lines', public.repair__items_json(t.id), 'backorders', public.repair__backorders_json(t.id),
                            'total_oere', public.repair__total(t.id));
END;
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.repair_case_update_item(jsonb)',
    'public.repair_case_remove_item(jsonb)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

COMMIT;

-- Verifikation (forventet resultat i kommentar):
--   SELECT has_function_privilege('anon', 'public.repair_case_update_item(jsonb)', 'execute');         -- false
--   SELECT has_function_privilege('service_role', 'public.repair_case_update_item(jsonb)', 'execute'); -- true
--   -- Rygtest i en transaktion der rulles tilbage: ret en linje til 999 kr. (price_reason sat, activity_log
--   -- 'repair_case_price_changed'), ret den tilbage til listeprisen (price_reason NULL), sæt en dels status
--   -- til 'consumed' og fjern reparationslinjen med og uden reason (uden: case:remove_reason_required;
--   -- med: linjerne væk, sku_stock uændret).
