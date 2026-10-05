-- Ny sag: indlevering af flere enheder på én gang (én sag pr. enhed, samme kunde, delt gruppe-id).
-- Kør EFTER 20261005130000_repair_case_functions.sql (repair_case_create) og 20261005120000_repair_case_schema.sql
-- (repair_case_requests).
--
--   repair_tickets.intake_group_id   nullable uuid. Alle sager fra samme indlevering deler id'et.
--                                    Enkeltsager (én enhed) får IKKE et gruppe-id (null).
--   repair_case_create_group(jsonb)  opretter 1..10 sager i ÉN transaktion ved at kalde repair_case_create
--                                    én gang pr. enhed. Priser, lager, reservation, statuslog og
--                                    kundeopdatering bor derfor stadig ét sted (repair_case_create).
--
-- p = { staff_id, idempotency_key?, store_id ('vejle'|'slagelse'),
--       customer{...som repair_case_create},
--       devices[{ device{...}, items[...], details{...} }, ...] }   (maks. 10)
--
-- Svar: { group_id, customer_id, tickets[ <svar fra repair_case_create> ... ], ticket_ids[],
--         total_oere, needs_deposit, replayed, warnings[] }
--
-- Idempotens: ÉN nøgle for hele gruppen (repair_case_requests, som ved enkeltsager). Samme nøgle + samme
-- body giver det gemte svar; en anden body er en fejl. Hver enhed kaldes uden egen nøgle.
-- Fejler én enhed (fx en del eller enhed der ikke er ledig), rulles ALLE sagerne tilbage, og
-- idempotensrækken forsvinder med, så et nyt forsøg med samme nøgle er sikkert.
--
-- Kunden oprettes/opdateres af den første enhed; resten får kundens id, så der aldrig opstår dubletter.
--
-- Idempotent (IF NOT EXISTS / CREATE OR REPLACE) og transaktionel.

BEGIN;

ALTER TABLE public.repair_tickets ADD COLUMN IF NOT EXISTS intake_group_id uuid;
CREATE INDEX IF NOT EXISTS repair_tickets_intake_group_idx
  ON public.repair_tickets (intake_group_id) WHERE intake_group_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.repair_case_create_group(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_staff uuid := nullif(p->>'staff_id', '')::uuid;
  v_key text := nullif(btrim(coalesce(p->>'idempotency_key', '')), '');
  v_hash text := md5((p - 'idempotency_key' - 'staff_id')::text);
  v_devices jsonb := p->'devices';
  v_group uuid := gen_random_uuid();
  v_cust jsonb := coalesce(p->'customer', '{}'::jsonb);
  v_cust_id uuid;
  v_rc integer; v_prev record;
  d jsonb; v_one jsonb; v_res jsonb;
  v_tickets jsonb := '[]'::jsonb; v_ids jsonb := '[]'::jsonb; v_warnings jsonb := '[]'::jsonb;
  v_total bigint := 0; v_deposit boolean := false; v_n integer;
BEGIN
  IF v_staff IS NULL THEN PERFORM public.case_fail('staff_not_found'); END IF;
  IF jsonb_typeof(v_devices) IS DISTINCT FROM 'array' OR jsonb_array_length(v_devices) = 0 THEN
    PERFORM public.case_fail('no_devices');
  END IF;
  v_n := jsonb_array_length(v_devices);
  IF v_n > 10 THEN PERFORM public.case_fail('too_many_devices'); END IF;

  -- Idempotens for hele gruppen (samme mønster som repair_case_create).
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

  FOR d IN SELECT x FROM jsonb_array_elements(v_devices) AS t(x) LOOP
    v_one := jsonb_build_object(
      'staff_id', v_staff,
      'store_id', p->'store_id',
      'customer', v_cust,
      'device', coalesce(d->'device', '{}'::jsonb),
      'items', d->'items',
      'details', coalesce(d->'details', '{}'::jsonb));
    v_res := public.repair_case_create(v_one);

    -- Kunden findes nu: resten af enhederne bruger den samme.
    IF v_cust_id IS NULL THEN
      v_cust_id := (v_res->>'customer_id')::uuid;
      v_cust := v_cust || jsonb_build_object('id', v_cust_id);
    END IF;

    IF v_n > 1 THEN
      UPDATE public.repair_tickets SET intake_group_id = v_group WHERE id = (v_res->>'ticket_id')::uuid;
    END IF;

    v_tickets := v_tickets || jsonb_build_array(v_res);
    v_ids := v_ids || to_jsonb(v_res->>'ticket_id');
    v_total := v_total + coalesce((v_res->>'total_oere')::bigint, 0);
    IF coalesce((v_res->>'needs_deposit')::boolean, false) THEN v_deposit := true; END IF;
    IF jsonb_typeof(v_res->'warnings') = 'array' THEN v_warnings := v_warnings || (v_res->'warnings'); END IF;
  END LOOP;

  v_res := jsonb_build_object(
    'group_id', CASE WHEN v_n > 1 THEN to_jsonb(v_group) ELSE 'null'::jsonb END,
    'customer_id', v_cust_id,
    'tickets', v_tickets,
    'ticket_ids', v_ids,
    'total_oere', v_total,
    'needs_deposit', v_deposit,
    'replayed', false,
    'warnings', v_warnings);

  IF v_key IS NOT NULL THEN
    UPDATE public.repair_case_requests SET ticket_id = (v_ids->>0)::uuid, response = v_res
      WHERE staff_id = v_staff AND idem_key = v_key;
  END IF;
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.repair_case_create_group(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.repair_case_create_group(jsonb) TO service_role;

COMMIT;

-- Verifikation (forventet resultat i kommentar):
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'repair_tickets' AND column_name = 'intake_group_id';                       -- 1 række
--   SELECT has_function_privilege('anon', 'public.repair_case_create_group(jsonb)', 'execute');         -- false
--   SELECT has_function_privilege('service_role', 'public.repair_case_create_group(jsonb)', 'execute'); -- true
--   -- Rygtest i en transaktion der rulles tilbage: kald med to enheder og kontrollér at begge sager har samme
--   -- intake_group_id og samme customer_id, og at samme idempotency_key giver replayed = true.
