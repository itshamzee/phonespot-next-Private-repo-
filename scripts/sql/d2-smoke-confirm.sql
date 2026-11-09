-- D2 smoke-test: trade_in_confirm og trade_in_void.
-- Kør: node .superpowers/sdd/2026-11-09-d2-opkoeb-i-butikken/run-sql.mjs scripts/sql/d2-smoke-confirm.sql
-- Alt sker i én transaktion, der slutter med ROLLBACK, så der efterlades ingen
-- rækker, og slutseddel-tællerne rulles også tilbage.
-- Hver DO-blok RAISE'r, hvis en forventet fejl udebliver, eller hvis et tilladt skridt fejler.
-- IMEI'erne 359999… er gyldige (Luhn) testnumre, der ikke findes i prod.

BEGIN;

SET LOCAL lock_timeout = '3s';

CREATE TEMP TABLE _smoke (k text PRIMARY KEY, v uuid, t text) ON COMMIT DROP;

-- Hjælper: opret en privat kladde, der kan bekræftes (bortset fra ID), med én vare pr. pris.
CREATE FUNCTION pg_temp.mk_receipt(p_loc_slug text, p_prices int[], p_idents text[]) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_loc uuid;
  v_tpl uuid;
  v_rec uuid;
  i int;
BEGIN
  SELECT id INTO v_loc FROM public.locations WHERE slug = p_loc_slug;
  IF v_loc IS NULL THEN RAISE EXCEPTION 'smoke: lokationen % findes ikke', p_loc_slug; END IF;
  SELECT id INTO v_tpl FROM public.product_templates WHERE slug = 'andet-telefon';
  IF v_tpl IS NULL THEN RAISE EXCEPTION 'smoke: skabelonen andet-telefon mangler'; END IF;

  INSERT INTO public.trade_in_receipts (
    receipt_number, location_id, seller_type, seller_name, seller_address, seller_postal_city,
    seller_age_confirmed, lock_checks_confirmed, total_amount, status
  ) VALUES (
    NULL, v_loc, 'private', 'Smoke Sælger', 'Testvej 1', '7100 Vejle',
    true, true, (SELECT sum(x) FROM unnest(p_prices) x), 'draft'
  ) RETURNING id INTO v_rec;

  FOR i IN 1 .. array_length(p_prices, 1) LOOP
    INSERT INTO public.trade_in_receipt_items (
      receipt_id, template_id, brand, model, storage, color, condition_grade, battery_health,
      imei_serial, price, created_at
    ) VALUES (
      v_rec, v_tpl, 'Apple', 'iPhone 13', '128GB', 'Midnight',
      (ARRAY['Perfekt', 'God', 'Acceptabel', 'Defekt'])[1 + (i - 1) % 4], 85,
      p_idents[i], p_prices[i], now() + make_interval(secs => i)
    );
  END LOOP;
  RETURN v_rec;
END $$;

-- Hjælper: kør en sætning, og kræv en bestemt pos-fejl (SQLSTATE PS001, 'pos:<kode>[:…]').
CREATE FUNCTION pg_temp.expect_pos(p_sql text, p_code text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = 'PS001' AND (SQLERRM = 'pos:' || p_code OR SQLERRM LIKE 'pos:' || p_code || ':%') THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'smoke: % gav "%" (%) i stedet for pos:%', p_sql, SQLERRM, SQLSTATE, p_code;
  END;
  RAISE EXCEPTION 'smoke: % lykkedes, men skulle give pos:%', p_sql, p_code;
END $$;

-- Aktiv medarbejder til confirmed_by/voided_by.
INSERT INTO _smoke (k, v) SELECT 'staff', id FROM public.staff WHERE is_active ORDER BY created_at LIMIT 1;

-- Rettigheder: kun service-rollen må kalde funktionerne.
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.trade_in_confirm(uuid, uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.trade_in_confirm(uuid, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.trade_in_void(uuid, uuid, text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.trade_in_void(uuid, uuid, text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.trade_in_confirm(uuid, uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.trade_in_void(uuid, uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'smoke: forkerte EXECUTE-rettigheder på trade_in_confirm/trade_in_void';
  END IF;
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.trade_in_confirm(uuid, uuid)'::regprocedure)
     OR NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.trade_in_void(uuid, uuid, text)'::regprocedure) THEN
    RAISE EXCEPTION 'smoke: funktionerne er ikke SECURITY DEFINER';
  END IF;
  -- Luhn-hjælperen
  IF NOT public.imei_is_valid('490154203237518') OR public.imei_is_valid('490154203237519')
     OR public.imei_is_valid('49015420323751') OR public.imei_is_valid('49015420323751X') THEN
    RAISE EXCEPTION 'smoke: imei_is_valid regner forkert';
  END IF;
END $$;

-- 1. Vejle, 2 × 1.500 kr: uden ID → id_required; med kørekort → SS-2026-NNNN og alt oprettet.
DO $$
DECLARE
  v_staff uuid := (SELECT v FROM _smoke WHERE k = 'staff');
  v_rec uuid;
  v_res jsonb;
  v_loc uuid := (SELECT id FROM public.locations WHERE slug = 'vejle');
  r public.trade_in_receipts%ROWTYPE;
BEGIN
  v_rec := pg_temp.mk_receipt('vejle', ARRAY[150000, 150000], ARRAY['359999000000018', ' 3599 9900 0000 026 ']);

  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_confirm(%L, %L)', v_rec, v_staff), 'id_required');

  UPDATE public.trade_in_receipts
     SET id_type = 'koerekort', id_number = 'K1234567',
         id_expiry = (now() AT TIME ZONE 'Europe/Copenhagen')::date + 1
   WHERE id = v_rec;

  v_res := public.trade_in_confirm(v_rec, v_staff);
  SELECT * INTO r FROM public.trade_in_receipts WHERE id = v_rec;

  IF v_res->>'receipt_number' !~ '^SS-2026-\d{4}$' OR r.receipt_number IS DISTINCT FROM v_res->>'receipt_number' THEN
    RAISE EXCEPTION 'smoke 1: forkert nummer %', v_res;
  END IF;
  IF jsonb_array_length(v_res->'device_ids') <> 2 THEN
    RAISE EXCEPTION 'smoke 1: device_ids skal have 2 elementer: %', v_res;
  END IF;
  IF r.status <> 'confirmed' OR r.confirmed_by IS DISTINCT FROM v_staff OR r.confirmed_at IS NULL
     OR r.buyer_company <> 'Fixon ApS' OR r.buyer_cvr <> '46079019'
     OR r.buyer_address IS DISTINCT FROM 'Løversysselvej 3C, 7100 Vejle'
     OR r.legal_entity_id IS DISTINCT FROM (SELECT legal_entity_id FROM public.locations WHERE slug = 'vejle')
     OR r.total_amount <> 300000 THEN
    RAISE EXCEPTION 'smoke 1: sedlen er forkert efter bekræftelse: %', to_jsonb(r);
  END IF;

  IF (SELECT count(*) FROM public.devices d
       WHERE d.id IN (SELECT (jsonb_array_elements_text(v_res->'device_ids'))::uuid)
         AND d.status = 'intake' AND d.vat_scheme = 'brugtmoms' AND d.purchase_price = 150000
         AND d.location_id = v_loc AND d.source = 'internal' AND d.battery_health = 85
         AND d.storage = '128GB' AND d.color = 'Midnight' AND d.serial_number IS NULL
         AND d.blocked_at IS NULL) <> 2 THEN
    RAISE EXCEPTION 'smoke 1: enhederne er forkerte';
  END IF;
  -- Stand → grad: vare 1 Perfekt → A, vare 2 God → B; identifier normaliseret til imei.
  IF NOT EXISTS (SELECT 1 FROM public.devices WHERE imei = '359999000000018' AND grade = 'A')
     OR NOT EXISTS (SELECT 1 FROM public.devices WHERE imei = '359999000000026' AND grade = 'B') THEN
    RAISE EXCEPTION 'smoke 1: grad eller IMEI er forkert';
  END IF;

  IF (SELECT count(*) FROM public.purchase_documents
       WHERE trade_in_receipt_id = v_rec AND purchase_price = 150000
         AND seller_name = 'Smoke Sælger' AND seller_address = 'Testvej 1, 7100 Vejle'
         AND pdf_url = r.receipt_number AND brugtmoms_text = 'Købt fra privat — brugtmoms'
         AND item_description LIKE 'iPhone 13, 128GB, IMEI 35999900000%'
         AND document_date = (now() AT TIME ZONE 'Europe/Copenhagen')::date) <> 2 THEN
    RAISE EXCEPTION 'smoke 1: purchase_documents er forkerte';
  END IF;
  IF (SELECT count(*) FROM public.stock_movements
       WHERE device_id IN (SELECT (jsonb_array_elements_text(v_res->'device_ids'))::uuid)
         AND reason = 'purchase' AND qty_delta = 1 AND location_id = v_loc AND staff_id = v_staff) <> 2 THEN
    RAISE EXCEPTION 'smoke 1: stock_movements er forkerte';
  END IF;
  IF (SELECT count(*) FROM public.trade_in_receipt_items
       WHERE receipt_id = v_rec AND device_id IS NOT NULL) <> 2
     OR NOT EXISTS (SELECT 1 FROM public.trade_in_receipt_items
                     WHERE receipt_id = v_rec AND imei_serial = '359999000000026') THEN
    RAISE EXCEPTION 'smoke 1: items.device_id er ikke sat, eller identifier ikke normaliseret';
  END IF;

  -- En bekræftet seddel kan ikke bekræftes igen.
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_confirm(%L, %L)', v_rec, v_staff), 'receipt_not_draft');

  INSERT INTO _smoke (k, v, t) VALUES ('vejle_rec', v_rec, r.receipt_number);
END $$;

-- 2. Slagelse → SP-2026-0001 og PhoneGo ApS med butikkens adresse.
DO $$
DECLARE
  v_staff uuid := (SELECT v FROM _smoke WHERE k = 'staff');
  v_rec uuid;
  v_res jsonb;
  r public.trade_in_receipts%ROWTYPE;
BEGIN
  v_rec := pg_temp.mk_receipt('slagelse', ARRAY[50000], ARRAY['C02XK1ZJJG5H']);
  v_res := public.trade_in_confirm(v_rec, v_staff);
  SELECT * INTO r FROM public.trade_in_receipts WHERE id = v_rec;
  IF r.receipt_number <> 'SP-2026-0001' OR r.buyer_company <> 'PhoneGo ApS' OR r.buyer_cvr <> '38688766'
     OR r.buyer_address IS DISTINCT FROM (SELECT address FROM public.locations WHERE slug = 'slagelse') THEN
    RAISE EXCEPTION 'smoke 2: Slagelse-sedlen er forkert: %', to_jsonb(r);
  END IF;
  -- Serienummer → serial_number, ikke imei.
  IF NOT EXISTS (SELECT 1 FROM public.devices
                  WHERE id = (v_res->'device_ids'->>0)::uuid
                    AND serial_number = 'C02XK1ZJJG5H' AND imei IS NULL) THEN
    RAISE EXCEPTION 'smoke 2: serienummeret er ikke gemt i serial_number';
  END IF;
END $$;

-- 3. Esbjerg → ingen køberadresse.
DO $$
DECLARE
  v_staff uuid := (SELECT v FROM _smoke WHERE k = 'staff');
  v_rec uuid;
  r public.trade_in_receipts%ROWTYPE;
BEGIN
  v_rec := pg_temp.mk_receipt('esbjerg', ARRAY[40000], ARRAY['SERIALESB01']);
  PERFORM public.trade_in_confirm(v_rec, v_staff);
  SELECT * INTO r FROM public.trade_in_receipts WHERE id = v_rec;
  IF r.receipt_number !~ '^SS-2026-\d{4}$' OR r.buyer_company <> 'Fixon ApS'
     OR r.buyer_address IS NOT NULL OR r.buyer_postal_city IS NOT NULL THEN
    RAISE EXCEPTION 'smoke 3: Esbjerg-sedlen må ikke have adresse: %', to_jsonb(r);
  END IF;
END $$;

-- 4. Grænsen på 2.000 kr.: præcis 200000 øre uden ID lykkes, 200001 øre giver id_required.
DO $$
DECLARE
  v_staff uuid := (SELECT v FROM _smoke WHERE k = 'staff');
  v_rec uuid;
BEGIN
  v_rec := pg_temp.mk_receipt('vejle', ARRAY[200000], ARRAY['359999000000034']);
  PERFORM public.trade_in_confirm(v_rec, v_staff);
  IF (SELECT status FROM public.trade_in_receipts WHERE id = v_rec) <> 'confirmed' THEN
    RAISE EXCEPTION 'smoke 4: 2.000 kr. uden ID blev ikke bekræftet';
  END IF;

  v_rec := pg_temp.mk_receipt('vejle', ARRAY[100000, 100001], ARRAY['SERIAL0004A', 'SERIAL0004B']);
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_confirm(%L, %L)', v_rec, v_staff), 'id_required');
END $$;

-- 5. IMEI på en intake-enhed → imei_in_stock; på en solgt enhed → lykkes.
DO $$
DECLARE
  v_staff uuid := (SELECT v FROM _smoke WHERE k = 'staff');
  v_loc uuid := (SELECT id FROM public.locations WHERE slug = 'vejle');
  v_tpl uuid := (SELECT id FROM public.product_templates WHERE slug = 'andet-telefon');
  v_rec uuid;
BEGIN
  INSERT INTO public.devices (template_id, grade, purchase_price, location_id, status, imei)
  VALUES (v_tpl, 'A', 40000, v_loc, 'intake', '359999000000042'),
         (v_tpl, 'A', 40000, v_loc, 'sold', '359999000000059');

  v_rec := pg_temp.mk_receipt('vejle', ARRAY[30000], ARRAY['359999000000042']);
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_confirm(%L, %L)', v_rec, v_staff), 'imei_in_stock');

  v_rec := pg_temp.mk_receipt('vejle', ARRAY[30000], ARRAY['359999000000059']);
  PERFORM public.trade_in_confirm(v_rec, v_staff);
  IF (SELECT count(*) FROM public.devices WHERE imei = '359999000000059') <> 2 THEN
    RAISE EXCEPTION 'smoke 5: genkøb af en solgt enhed oprettede ikke en ny enhed';
  END IF;

  -- Samme IMEI to gange på én seddel → imei_in_stock.
  v_rec := pg_temp.mk_receipt('vejle', ARRAY[30000, 30000], ARRAY['359999000000067', '359999000000067']);
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_confirm(%L, %L)', v_rec, v_staff), 'imei_in_stock');
END $$;

-- 6. Øvrige blokkere.
DO $$
DECLARE
  v_staff uuid := (SELECT v FROM _smoke WHERE k = 'staff');
  v_rec uuid;
  v_sql text;
BEGIN
  -- Ukendt seddel og inaktiv/ukendt medarbejder.
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_confirm(%L, %L)', gen_random_uuid(), v_staff), 'receipt_not_found');
  v_rec := pg_temp.mk_receipt('vejle', ARRAY[10000], ARRAY['SERIAL0006A']);
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_confirm(%L, %L)', v_rec, gen_random_uuid()), 'staff_not_found');

  v_sql := format('SELECT public.trade_in_confirm(%L, %L)', v_rec, v_staff);

  -- Ingen varer.
  DELETE FROM public.trade_in_receipt_items WHERE receipt_id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'receipt_empty');
  INSERT INTO public.trade_in_receipt_items (receipt_id, template_id, brand, model, imei_serial, price)
  VALUES (v_rec, (SELECT id FROM public.product_templates WHERE slug = 'andet-telefon'), 'Apple', 'iPhone 13', '359999000000075', 10000);

  -- Ugyldig vare: IMEI med forkert kontrolciffer, intet identifier, ingen skabelon.
  UPDATE public.trade_in_receipt_items SET imei_serial = '359999000000076' WHERE receipt_id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'item_invalid');
  UPDATE public.trade_in_receipt_items SET imei_serial = NULL WHERE receipt_id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'item_invalid');
  UPDATE public.trade_in_receipt_items SET imei_serial = 'AB1' WHERE receipt_id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'item_invalid');
  UPDATE public.trade_in_receipt_items SET imei_serial = '359999000000075', template_id = NULL WHERE receipt_id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'item_invalid');
  UPDATE public.trade_in_receipt_items SET template_id = (SELECT id FROM public.product_templates WHERE slug = 'andet-telefon')
   WHERE receipt_id = v_rec;

  -- Sælger.
  UPDATE public.trade_in_receipts SET seller_address = '  ' WHERE id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'seller_missing');
  UPDATE public.trade_in_receipts SET seller_address = 'Testvej 1', seller_age_confirmed = false WHERE id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'age_missing');
  UPDATE public.trade_in_receipts SET seller_age_confirmed = true, lock_checks_confirmed = false WHERE id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'checks_missing');
  UPDATE public.trade_in_receipts SET lock_checks_confirmed = true WHERE id = v_rec;

  -- ID: udløbet, mangler nummer, mangler udløb (billed-ID), ukendt type; MitID uden udløb er ok.
  UPDATE public.trade_in_receipts
     SET id_type = 'pas', id_number = 'P1', id_expiry = (now() AT TIME ZONE 'Europe/Copenhagen')::date - 1
   WHERE id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'id_expired');
  UPDATE public.trade_in_receipts SET id_expiry = NULL WHERE id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'id_incomplete');
  UPDATE public.trade_in_receipts SET id_expiry = (now() AT TIME ZONE 'Europe/Copenhagen')::date, id_number = ' ' WHERE id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'id_incomplete');
  UPDATE public.trade_in_receipts SET id_type = 'sundhedskort', id_number = 'S1' WHERE id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'id_incomplete');

  -- Lokation uden juridisk enhed / manglende lokation.
  UPDATE public.trade_in_receipts SET id_type = 'mitid', id_number = 'MITID-REF', id_expiry = NULL, location_id = NULL
   WHERE id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'location_missing');
  UPDATE public.trade_in_receipts SET location_id = (SELECT id FROM public.locations WHERE slug = 'vejle') WHERE id = v_rec;

  -- Firma: 18+ kræves ikke, men CVR (8 cifre) og fakturatype gør.
  UPDATE public.trade_in_receipts
     SET seller_type = 'business', seller_age_confirmed = false, seller_cvr = '1234567', invoice_type = 'med_moms'
   WHERE id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'business_fields_missing');
  UPDATE public.trade_in_receipts SET seller_cvr = '12345678', invoice_type = NULL WHERE id = v_rec;
  PERFORM pg_temp.expect_pos(v_sql, 'business_fields_missing');
  UPDATE public.trade_in_receipts SET invoice_type = 'med_moms' WHERE id = v_rec;

  -- Nu lykkes det (MitID uden udløb, firma med moms → regular, pris × 4/5).
  PERFORM public.trade_in_confirm(v_rec, v_staff);
  IF NOT EXISTS (SELECT 1 FROM public.devices WHERE imei = '359999000000075'
                  AND vat_scheme = 'regular' AND purchase_price = 8000) THEN
    RAISE EXCEPTION 'smoke 6: firma med moms gav forkert momsordning eller kostpris';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.purchase_documents WHERE trade_in_receipt_id = v_rec
                  AND purchase_price = 10000 AND brugtmoms_text = 'Købt fra virksomhed — faktura med moms') THEN
    RAISE EXCEPTION 'smoke 6: firmabilaget er forkert';
  END IF;
END $$;

-- 7. Momstabellen for firma: brugtmoms-faktura → brugtmoms/pris, EU-faktura → regular/pris.
DO $$
DECLARE
  v_staff uuid := (SELECT v FROM _smoke WHERE k = 'staff');
  v_rec uuid;
BEGIN
  v_rec := pg_temp.mk_receipt('vejle', ARRAY[12345], ARRAY['359999000000083']);
  UPDATE public.trade_in_receipts SET seller_type = 'business', seller_cvr = '12345678', invoice_type = 'brugtmoms' WHERE id = v_rec;
  PERFORM public.trade_in_confirm(v_rec, v_staff);
  v_rec := pg_temp.mk_receipt('vejle', ARRAY[12345], ARRAY['359999000000091']);
  UPDATE public.trade_in_receipts SET seller_type = 'business', seller_cvr = '12345678', invoice_type = 'eu_normal' WHERE id = v_rec;
  PERFORM public.trade_in_confirm(v_rec, v_staff);
  -- Afrunding: 12345 × 4/5 = 9876.
  v_rec := pg_temp.mk_receipt('vejle', ARRAY[12345], ARRAY['359999000000109']);
  UPDATE public.trade_in_receipts SET seller_type = 'business', seller_cvr = '12345678', invoice_type = 'med_moms' WHERE id = v_rec;
  PERFORM public.trade_in_confirm(v_rec, v_staff);

  IF NOT EXISTS (SELECT 1 FROM public.devices WHERE imei = '359999000000083' AND vat_scheme = 'brugtmoms' AND purchase_price = 12345)
     OR NOT EXISTS (SELECT 1 FROM public.devices WHERE imei = '359999000000091' AND vat_scheme = 'regular' AND purchase_price = 12345)
     OR NOT EXISTS (SELECT 1 FROM public.devices WHERE imei = '359999000000109' AND vat_scheme = 'regular' AND purchase_price = 9876) THEN
    RAISE EXCEPTION 'smoke 7: momstabellen for firmakøb er forkert';
  END IF;
END $$;

-- 8. En kladde, der stadig bærer et gammelt nummer fra den gamle tæller, mister det,
--    når nummeret gives til en bekræftet seddel (kladder har intet nummer).
DO $$
DECLARE
  v_staff uuid := (SELECT v FROM _smoke WHERE k = 'staff');
  v_old uuid;
  v_rec uuid;
  v_next text;
  v_le uuid := (SELECT legal_entity_id FROM public.locations WHERE slug = 'vejle');
BEGIN
  SELECT 'SS-2026-' || lpad((last_number + 1)::text, 4, '0') INTO v_next
    FROM public.slutseddel_counters WHERE legal_entity_id = v_le AND year = 2026;
  v_old := pg_temp.mk_receipt('vejle', ARRAY[1000], ARRAY['SERIAL0008A']);
  UPDATE public.trade_in_receipts SET receipt_number = v_next WHERE id = v_old;

  v_rec := pg_temp.mk_receipt('vejle', ARRAY[1000], ARRAY['SERIAL0008B']);
  PERFORM public.trade_in_confirm(v_rec, v_staff);
  IF (SELECT receipt_number FROM public.trade_in_receipts WHERE id = v_rec) <> v_next
     OR (SELECT receipt_number FROM public.trade_in_receipts WHERE id = v_old) IS NOT NULL THEN
    RAISE EXCEPTION 'smoke 8: nummerkollision med en gammel kladde blev ikke håndteret';
  END IF;
END $$;

-- 9. Annullering.
DO $$
DECLARE
  v_staff uuid := (SELECT v FROM _smoke WHERE k = 'staff');
  v_rec uuid := (SELECT v FROM _smoke WHERE k = 'vejle_rec');
  v_other uuid;
  v_dev uuid;
  r public.trade_in_receipts%ROWTYPE;
BEGIN
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_void(%L, %L, %L)', v_rec, v_staff, '   '), 'void_reason_required');
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_void(%L, %L, NULL)', v_rec, v_staff), 'void_reason_required');
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_void(%L, %L, %L)', v_rec, gen_random_uuid(), 'x'), 'staff_not_found');
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_void(%L, %L, %L)', gen_random_uuid(), v_staff, 'x'), 'receipt_not_found');

  PERFORM public.trade_in_void(v_rec, v_staff, '  Forkert pris  ');
  SELECT * INTO r FROM public.trade_in_receipts WHERE id = v_rec;
  IF r.status <> 'voided' OR r.void_reason <> 'Forkert pris' OR r.voided_by IS DISTINCT FROM v_staff OR r.voided_at IS NULL THEN
    RAISE EXCEPTION 'smoke 9: sedlen er ikke annulleret korrekt: %', to_jsonb(r);
  END IF;
  IF (SELECT count(*) FROM public.devices d JOIN public.trade_in_receipt_items i ON i.device_id = d.id
       WHERE i.receipt_id = v_rec AND d.status = 'delisted' AND d.blocked_at IS NOT NULL
         AND d.blocked_reason = 'Slutseddel annulleret') <> 2 THEN
    RAISE EXCEPTION 'smoke 9: enhederne er ikke spærret og taget af lager';
  END IF;
  IF (SELECT count(*) FROM public.stock_movements s JOIN public.trade_in_receipt_items i ON i.device_id = s.device_id
       WHERE i.receipt_id = v_rec AND s.qty_delta = -1 AND s.reason = 'adjust' AND s.staff_id = v_staff) <> 2 THEN
    RAISE EXCEPTION 'smoke 9: annulleringens lagerbevægelser mangler';
  END IF;
  -- En annulleret enhed kan ikke sættes til salg.
  BEGIN
    UPDATE public.devices SET status = 'listed'
     WHERE id = (SELECT device_id FROM public.trade_in_receipt_items WHERE receipt_id = v_rec LIMIT 1);
    RAISE EXCEPTION 'smoke 9: annulleret enhed kunne sættes til salg';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'device_blocked' THEN RAISE; END IF;
  END;
  -- Allerede annulleret → receipt_not_voidable.
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_void(%L, %L, %L)', v_rec, v_staff, 'igen'), 'receipt_not_voidable');

  -- En enhed, der ikke længere er intake → receipt_not_voidable.
  v_other := pg_temp.mk_receipt('vejle', ARRAY[5000], ARRAY['SERIAL0009A']);
  PERFORM public.trade_in_confirm(v_other, v_staff);
  SELECT device_id INTO v_dev FROM public.trade_in_receipt_items WHERE receipt_id = v_other;
  UPDATE public.devices SET status = 'graded' WHERE id = v_dev;
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_void(%L, %L, %L)', v_other, v_staff, 'x'), 'receipt_not_voidable');

  -- En udbetalt seddel → receipt_not_voidable.
  v_other := pg_temp.mk_receipt('vejle', ARRAY[5000], ARRAY['SERIAL0009B']);
  PERFORM public.trade_in_confirm(v_other, v_staff);
  UPDATE public.trade_in_receipts SET status = 'paid', paid_at = now(), paid_by = v_staff WHERE id = v_other;
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_void(%L, %L, %L)', v_other, v_staff, 'x'), 'receipt_not_voidable');

  -- En kladde → receipt_not_voidable.
  v_other := pg_temp.mk_receipt('vejle', ARRAY[5000], ARRAY['SERIAL0009C']);
  PERFORM pg_temp.expect_pos(format('SELECT public.trade_in_void(%L, %L, %L)', v_other, v_staff, 'x'), 'receipt_not_voidable');
END $$;

SELECT 'd2-smoke-confirm: ok' AS result,
       (SELECT jsonb_agg(jsonb_build_object('le', legal_entity_id, 'year', year, 'last', last_number))
          FROM public.slutseddel_counters) AS counters_in_tx;

ROLLBACK;
