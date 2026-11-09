-- D2 smoke-test: skema, låse og adgang for slutsedler.
-- Kør: node .superpowers/sdd/2026-11-09-d2-opkoeb-i-butikken/run-sql.mjs scripts/sql/d2-smoke-schema.sql
-- Alt sker i én transaktion, der slutter med ROLLBACK, så der efterlades ingen rækker.
-- Hver DO-blok RAISE'r, hvis en forventet fejl udebliver, eller hvis et tilladt skridt fejler.

BEGIN;

CREATE TEMP TABLE _smoke (k text PRIMARY KEY, v uuid) ON COMMIT DROP;

-- Opsætning: Vejle-butik, en skabelon, en bekræftet seddel med én vare og tre enheder.
DO $$
DECLARE
  v_loc uuid;
  v_le uuid;
  v_tpl uuid;
  v_rec uuid;
  v_item uuid;
  v_dev uuid;
BEGIN
  SELECT l.id, l.legal_entity_id INTO v_loc, v_le
  FROM public.locations l WHERE l.type = 'store' AND l.name = 'Vejle' LIMIT 1;
  IF v_loc IS NULL THEN RAISE EXCEPTION 'smoke: ingen Vejle-butik'; END IF;

  SELECT id INTO v_tpl FROM public.product_templates WHERE slug = 'andet-telefon';
  IF v_tpl IS NULL THEN RAISE EXCEPTION 'smoke: skabelonen andet-telefon mangler'; END IF;

  INSERT INTO public.trade_in_receipts (receipt_number, location_id, legal_entity_id, seller_name, total_amount, status)
  VALUES (NULL, v_loc, v_le, 'Smoke Test', 50000, 'draft')
  RETURNING id INTO v_rec;

  INSERT INTO public.trade_in_receipt_items (receipt_id, template_id, brand, model, price, battery_health)
  VALUES (v_rec, v_tpl, 'Andet', 'Andet (telefon)', 50000, 88)
  RETURNING id INTO v_item;

  -- Kladde: alt er tilladt, også at skrive nummer og flippe til confirmed.
  UPDATE public.trade_in_receipts
     SET receipt_number = 'SMOKE-D2-0001', id_type = 'kørekort', id_number = '123456',
         id_expiry = DATE '2030-01-01', confirmed_at = now() - interval '6 years',
         status = 'confirmed'
   WHERE id = v_rec;

  INSERT INTO _smoke VALUES ('loc', v_loc), ('tpl', v_tpl), ('rec', v_rec), ('item', v_item);

  INSERT INTO public.devices (template_id, grade, purchase_price, location_id, status, imei)
  VALUES (v_tpl, 'A', 40000, v_loc, 'sold', '350000000000001') RETURNING id INTO v_dev;
  INSERT INTO _smoke VALUES ('sold', v_dev);

  INSERT INTO public.devices (template_id, grade, purchase_price, location_id, status, imei)
  VALUES (v_tpl, 'A', 40000, v_loc, 'listed', '350000000000002') RETURNING id INTO v_dev;
  INSERT INTO _smoke VALUES ('listed', v_dev);

  INSERT INTO public.devices (template_id, grade, purchase_price, location_id, status)
  VALUES (v_tpl, 'A', 40000, v_loc, 'listed') RETURNING id INTO v_dev;
  INSERT INTO _smoke VALUES ('to_sell', v_dev);
END $$;

-- Hjælper: kør en sætning, og kræv en bestemt fejl.
CREATE FUNCTION pg_temp.expect_error(p_sql text, p_err text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = p_err THEN RETURN; END IF;
    RAISE EXCEPTION 'smoke: % gav "%" i stedet for %', p_sql, SQLERRM, p_err;
  END;
  RAISE EXCEPTION 'smoke: % lykkedes, men skulle give %', p_sql, p_err;
END $$;

-- Hjælper: kør en sætning, og kræv præcis én påvirket række.
CREATE FUNCTION pg_temp.expect_one(p_sql text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'smoke: % ramte % rækker, forventede 1', p_sql, n; END IF;
END $$;

-- 1. Bekræftet seddel: beløb er låst, sletning er låst, ulovligt statusskift er låst.
DO $$
DECLARE r uuid := (SELECT v FROM _smoke WHERE k = 'rec');
BEGIN
  PERFORM pg_temp.expect_error(format('UPDATE public.trade_in_receipts SET total_amount = 1 WHERE id = %L', r), 'receipt_locked');
  PERFORM pg_temp.expect_error(format('UPDATE public.trade_in_receipts SET seller_name = %L WHERE id = %L', 'X', r), 'receipt_locked');
  PERFORM pg_temp.expect_error(format('UPDATE public.trade_in_receipts SET id_number = %L WHERE id = %L', '999', r), 'receipt_locked');
  PERFORM pg_temp.expect_error(format('UPDATE public.trade_in_receipts SET id_number = NULL WHERE id = %L', r), 'receipt_locked');
  PERFORM pg_temp.expect_error(format('UPDATE public.trade_in_receipts SET status = %L WHERE id = %L', 'completed', r), 'receipt_locked');
  PERFORM pg_temp.expect_error(format('UPDATE public.trade_in_receipts SET status = %L WHERE id = %L', 'draft', r), 'receipt_locked');
  PERFORM pg_temp.expect_error(format('DELETE FROM public.trade_in_receipts WHERE id = %L', r), 'receipt_locked');
END $$;

-- 2. Bekræftet seddel: varelinjen kan hverken ændres, slettes eller suppleres.
DO $$
DECLARE
  r uuid := (SELECT v FROM _smoke WHERE k = 'rec');
  i uuid := (SELECT v FROM _smoke WHERE k = 'item');
BEGIN
  PERFORM pg_temp.expect_error(format('UPDATE public.trade_in_receipt_items SET price = 1 WHERE id = %L', i), 'receipt_locked');
  PERFORM pg_temp.expect_error(format('DELETE FROM public.trade_in_receipt_items WHERE id = %L', i), 'receipt_locked');
  PERFORM pg_temp.expect_error(format(
    'INSERT INTO public.trade_in_receipt_items (receipt_id, brand, model, price) VALUES (%L, %L, %L, 100)', r, 'X', 'Y'), 'receipt_locked');
END $$;

-- 3. Tilladte skridt efter bekræftelse: betaling, mistanke, ID-sletning (via cron-funktionen), afslutning.
DO $$
DECLARE r uuid := (SELECT v FROM _smoke WHERE k = 'rec');
BEGIN
  PERFORM pg_temp.expect_one(format(
    'UPDATE public.trade_in_receipts SET paid_at = now(), status = %L, payout_method = %L, account_owner_confirmed = true WHERE id = %L',
    'paid', 'bank', r));
  PERFORM pg_temp.expect_one(format(
    'UPDATE public.trade_in_receipts SET suspected_at = now(), suspicion_note = %L WHERE id = %L', 'smoke', r));

  -- Cron-jobbet findes og kalder purge-funktionen; sedlen er bekræftet for 6 år siden.
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'slutseddel-id-purge' AND schedule = '15 3 * * *') THEN
    RAISE EXCEPTION 'smoke: cron-jobbet slutseddel-id-purge mangler';
  END IF;
  PERFORM public.slutseddel_id_purge();
  IF NOT EXISTS (SELECT 1 FROM public.trade_in_receipts
                 WHERE id = r AND id_type IS NULL AND id_number IS NULL AND id_expiry IS NULL AND id_purged_at IS NOT NULL) THEN
    RAISE EXCEPTION 'smoke: ID-felterne blev ikke slettet af purge';
  END IF;
  -- Efter sletning kan ID ikke skrives igen.
  PERFORM pg_temp.expect_error(format('UPDATE public.trade_in_receipts SET id_number = %L WHERE id = %L', '1', r), 'receipt_locked');

  PERFORM pg_temp.expect_one(format('UPDATE public.trade_in_receipts SET status = %L WHERE id = %L', 'completed', r));
  PERFORM pg_temp.expect_error(format('UPDATE public.trade_in_receipts SET status = %L WHERE id = %L', 'voided', r), 'receipt_locked');
END $$;

-- 4. Kladder: kan slettes med varer (cascade), og purge sletter kladder over 30 dage.
DO $$
DECLARE
  v_loc uuid := (SELECT v FROM _smoke WHERE k = 'loc');
  d1 uuid;
  d2 uuid;
BEGIN
  INSERT INTO public.trade_in_receipts (receipt_number, location_id, seller_name, status)
  VALUES (NULL, v_loc, 'Smoke kladde', 'draft') RETURNING id INTO d1;
  INSERT INTO public.trade_in_receipt_items (receipt_id, brand, model, price) VALUES (d1, 'A', 'B', 100);
  PERFORM pg_temp.expect_one(format('UPDATE public.trade_in_receipt_items SET price = 200 WHERE receipt_id = %L', d1));
  PERFORM pg_temp.expect_one(format('DELETE FROM public.trade_in_receipts WHERE id = %L', d1));
  IF EXISTS (SELECT 1 FROM public.trade_in_receipt_items WHERE receipt_id = d1) THEN
    RAISE EXCEPTION 'smoke: kladdens varer blev ikke slettet';
  END IF;

  INSERT INTO public.trade_in_receipts (receipt_number, location_id, seller_name, status, created_at)
  VALUES (NULL, v_loc, 'Smoke gammel kladde', 'draft', now() - interval '31 days') RETURNING id INTO d2;
  INSERT INTO public.trade_in_receipt_items (receipt_id, brand, model, price) VALUES (d2, 'A', 'B', 100);
  PERFORM public.slutseddel_id_purge();
  IF EXISTS (SELECT 1 FROM public.trade_in_receipts WHERE id = d2) THEN
    RAISE EXCEPTION 'smoke: gammel kladde blev ikke slettet af purge';
  END IF;
END $$;

-- 5. Solgt enhed: IMEI, serienummer, indkøbspris og momsordning er låst, og den kan ikke slettes.
--    Statusskift til returned er tilladt.
DO $$
DECLARE d uuid := (SELECT v FROM _smoke WHERE k = 'sold');
BEGIN
  PERFORM pg_temp.expect_error(format('UPDATE public.devices SET imei = %L WHERE id = %L', '350000000000009', d), 'device_locked');
  PERFORM pg_temp.expect_error(format('UPDATE public.devices SET purchase_price = 1 WHERE id = %L', d), 'device_locked');
  PERFORM pg_temp.expect_error(format('UPDATE public.devices SET serial_number = %L WHERE id = %L', 'SN', d), 'device_locked');
  PERFORM pg_temp.expect_error(format('UPDATE public.devices SET vat_scheme = %L WHERE id = %L', 'regular', d), 'device_locked');
  PERFORM pg_temp.expect_error(format('DELETE FROM public.devices WHERE id = %L', d), 'device_locked');
  PERFORM pg_temp.expect_one(format('UPDATE public.devices SET status = %L WHERE id = %L', 'returned', d));
  IF EXISTS (SELECT 1 FROM public.device_changes WHERE device_id = d) THEN
    RAISE EXCEPTION 'smoke: statusskift skrev i device_changes';
  END IF;
END $$;

-- 6. Usolgt enhed: IMEI kan ændres og skriver præcis én række i device_changes.
--    Salg, der sætter et tomt IMEI i samme sætning, er tilladt og logges.
DO $$
DECLARE
  d uuid := (SELECT v FROM _smoke WHERE k = 'listed');
  s uuid := (SELECT v FROM _smoke WHERE k = 'to_sell');
  n int;
BEGIN
  PERFORM pg_temp.expect_one(format('UPDATE public.devices SET imei = %L WHERE id = %L', '350000000000003', d));
  SELECT count(*) INTO n FROM public.device_changes
   WHERE device_id = d AND field = 'imei' AND old_value = '350000000000002' AND new_value = '350000000000003';
  IF n <> 1 OR (SELECT count(*) FROM public.device_changes WHERE device_id = d) <> 1 THEN
    RAISE EXCEPTION 'smoke: forventede én device_changes-række, fandt %', n;
  END IF;

  PERFORM pg_temp.expect_one(format('UPDATE public.devices SET status = %L, imei = %L, sold_at = now() WHERE id = %L', 'sold', '350000000000004', s));
  IF NOT EXISTS (SELECT 1 FROM public.device_changes WHERE device_id = s AND field = 'imei' AND old_value IS NULL) THEN
    RAISE EXCEPTION 'smoke: IMEI sat ved salg blev ikke logget';
  END IF;
END $$;

-- 7. Spærret enhed kan ikke sættes til salg.
DO $$
DECLARE d uuid := (SELECT v FROM _smoke WHERE k = 'listed');
BEGIN
  PERFORM pg_temp.expect_error(format('UPDATE public.devices SET blocked_at = now() WHERE id = %L', d), 'device_blocked');
  PERFORM pg_temp.expect_one(format(
    'UPDATE public.devices SET blocked_at = now(), blocked_reason = %L, status = %L WHERE id = %L', 'smoke', 'delisted', d));
  PERFORM pg_temp.expect_error(format('UPDATE public.devices SET status = %L WHERE id = %L', 'listed', d), 'device_blocked');
  PERFORM pg_temp.expect_error(format('UPDATE public.devices SET status = %L WHERE id = %L', 'reserved', d), 'device_blocked');
  PERFORM pg_temp.expect_error(format('UPDATE public.devices SET status = %L WHERE id = %L', 'sold', d), 'device_blocked');
END $$;

-- 8. Skema og adgang.
DO $$
BEGIN
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'
      AND tablename IN ('trade_in_receipts', 'trade_in_receipt_items', 'trade_in_receipt_counters', 'slutseddel_counters', 'device_changes')) > 0 THEN
    RAISE EXCEPTION 'smoke: der findes stadig politikker på slutseddel-tabellerne';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname IN ('trade_in_receipts', 'trade_in_receipt_items', 'trade_in_receipt_counters',
                                                          'slutseddel_counters', 'device_changes')
               AND NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'smoke: RLS er slået fra på en slutseddel-tabel';
  END IF;
  IF has_table_privilege('authenticated', 'public.device_changes', 'SELECT')
     OR has_table_privilege('anon', 'public.slutseddel_counters', 'SELECT')
     OR has_table_privilege('authenticated', 'public.slutseddel_counters', 'UPDATE') THEN
    RAISE EXCEPTION 'smoke: anon/authenticated har stadig rettigheder';
  END IF;
  IF (SELECT receipt_prefix FROM public.legal_entities WHERE cvr = '46079019') IS DISTINCT FROM 'SS'
     OR (SELECT address FROM public.legal_entities WHERE cvr = '46079019') IS DISTINCT FROM 'Løversysselvej 3C, 7100 Vejle'
     OR (SELECT receipt_prefix FROM public.legal_entities WHERE cvr = '38688766') IS DISTINCT FROM 'SP'
     OR (SELECT address FROM public.legal_entities WHERE cvr = '38688766') IS NOT NULL THEN
    RAISE EXCEPTION 'smoke: legal_entities har forkerte adresser eller præfikser';
  END IF;
  IF (SELECT count(*) FROM public.product_templates
      WHERE status = 'draft' AND brand = 'Andet'
        AND (slug, model, category) IN (('andet-telefon', 'Andet (telefon)', 'smartphone'),
                                        ('andet-tablet', 'Andet (tablet)', 'tablet'),
                                        ('andet-computer', 'Andet (computer)', 'laptop'),
                                        ('andet-ur', 'Andet (ur)', 'smartwatch'))) <> 4 THEN
    RAISE EXCEPTION 'smoke: de fire Andet-skabeloner mangler';
  END IF;
  -- stock_movements accepterer 'purchase', og order_items har imei.
  PERFORM 1 FROM pg_constraint WHERE conname = 'stock_movements_reason_check'
    AND pg_get_constraintdef(oid) LIKE '%purchase%';
  IF NOT FOUND THEN RAISE EXCEPTION 'smoke: stock_movements.reason mangler purchase'; END IF;
  PERFORM imei FROM public.order_items LIMIT 0;
  PERFORM trade_in_receipt_id FROM public.purchase_documents LIMIT 0;
  PERFORM legal_entity_id, year, last_number FROM public.slutseddel_counters LIMIT 0;
END $$;

ROLLBACK;
