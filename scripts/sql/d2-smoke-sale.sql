-- D2 smoke-test: pos_create_sale med modregning af opkøb, IMEI på bonen og spærrede enheder.
-- Forudsætter migrationen 20261109127000_d2_pos_sale_opkoeb.sql.
-- Kør: node .superpowers/sdd/2026-11-09-d2-opkoeb-i-butikken/run-sql.mjs scripts/sql/d2-smoke-sale.sql
-- Alt sker i én transaktion, der slutter med ROLLBACK: ordrer, bonnumre, enheder,
-- slutsedler og lagerbevægelser rulles tilbage. Kassernes række låses kort under kørslen.
-- Hver DO-blok RAISE'r, hvis en forventet fejl udebliver, eller hvis et tilladt skridt fejler.
-- IMEI'erne 359999… er gyldige (Luhn) testnumre, der ikke findes i prod.

BEGIN;

SET LOCAL lock_timeout = '3s';

CREATE TEMP TABLE _smoke (k text PRIMARY KEY, v uuid, t text) ON COMMIT DROP;

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

-- Hjælper: en enhed på en lokation. p_imei/p_serial kan være NULL.
CREATE FUNCTION pg_temp.mk_device(p_loc_slug text, p_barcode text, p_price int, p_scheme text,
                                  p_imei text, p_serial text, p_status text DEFAULT 'listed',
                                  p_blocked boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.devices (template_id, grade, purchase_price, vat_scheme, location_id, status,
                              selling_price, barcode, imei, serial_number, storage, source,
                              blocked_at, blocked_reason)
  VALUES ((SELECT id FROM public.product_templates WHERE slug = 'andet-telefon'), 'B', 150000, p_scheme,
          (SELECT id FROM public.locations WHERE slug = p_loc_slug), p_status,
          p_price, p_barcode, p_imei, p_serial, '128GB', 'internal',
          CASE WHEN p_blocked THEN now() END, CASE WHEN p_blocked THEN 'Smoke: spærret' END)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Hjælper: en bekræftet slutseddel. Privat + paper_scan; p_scan styrer, om scannet er lagt op,
-- p_bank, om sælgers konto står på sedlen (kræves for et restbeløb efter modregning).
CREATE FUNCTION pg_temp.mk_receipt(p_loc_slug text, p_number text, p_total int, p_scan boolean,
                                   p_bank boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.trade_in_receipts (
    receipt_number, location_id, seller_type, seller_name, seller_address, seller_postal_city,
    seller_age_confirmed, lock_checks_confirmed, total_amount, status, attestation,
    signed_scan_path, confirmed_at, confirmed_by, payout_method,
    seller_bank_reg, seller_bank_account, account_owner_confirmed
  ) VALUES (
    p_number, (SELECT id FROM public.locations WHERE slug = p_loc_slug), 'private', 'Smoke Sælger',
    'Testvej 1', '7100 Vejle', true, true, p_total, 'confirmed', 'paper_scan',
    CASE WHEN p_scan THEN 'smoke/scan.pdf' END, now(), (SELECT v FROM _smoke WHERE k = 'staff'), 'modregning',
    CASE WHEN p_bank THEN '1234' END, CASE WHEN p_bank THEN '12345678' END, p_bank
  ) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Hjælper: SQL-teksten for et salg på en butiks kasse.
CREATE FUNCTION pg_temp.sale_sql(p_loc_slug text, p_items jsonb, p_payments jsonb) RETURNS text
LANGUAGE sql AS $$
  SELECT format(
    'SELECT public.pos_create_sale(%L::uuid, %L::uuid, %L::uuid, NULL, %L::jsonb, %L::jsonb, 0, NULL, NULL)',
    (SELECT location_id FROM public.registers r JOIN public.locations l ON l.id = r.location_id
      WHERE l.slug = p_loc_slug AND r.active ORDER BY r.code LIMIT 1),
    (SELECT r.id FROM public.registers r JOIN public.locations l ON l.id = r.location_id
      WHERE l.slug = p_loc_slug AND r.active ORDER BY r.code LIMIT 1),
    (SELECT v FROM _smoke WHERE k = 'staff'),
    p_items, p_payments);
$$;

INSERT INTO _smoke (k, v) SELECT 'staff', id FROM public.staff WHERE is_active ORDER BY created_at LIMIT 1;

-- Kasserne i Vejle og Slagelse skal have en åben session (den eksisterende bruges; ellers åbnes en,
-- som rulles tilbage).
INSERT INTO public.cash_sessions (register_id, opening_float, opened_by)
SELECT r.id, 0, (SELECT v FROM _smoke WHERE k = 'staff')
  FROM public.registers r JOIN public.locations l ON l.id = r.location_id
 WHERE l.slug IN ('vejle', 'slagelse') AND r.active
   AND NOT EXISTS (SELECT 1 FROM public.cash_sessions s WHERE s.register_id = r.id AND s.closed_at IS NULL);

-- Typen 'opkoeb' er tilladt på betalingslinjer.
DO $$
BEGIN
  IF pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'order_payments_type_check'))
     NOT LIKE '%''opkoeb''%' THEN
    RAISE EXCEPTION 'smoke: order_payments_type_check tillader ikke opkoeb';
  END IF;
END $$;

-- 1. Vejle: seddel på 3.000 kr med scan, enhed på 5.000 kr. opkoeb 3.000 + kontant 2.000.
INSERT INTO _smoke (k, v) VALUES
  ('rec1', pg_temp.mk_receipt('vejle', 'SMOKE-D2-1', 300000, true)),
  ('dev1', pg_temp.mk_device('vejle', 'SMOKE-D2-DEV1', 500000, 'brugtmoms', '359999000000018', NULL));

DO $$
DECLARE
  v_res jsonb;
  v_order uuid;
  r record;
  v_imei text;
BEGIN
  EXECUTE pg_temp.sale_sql('vejle',
    jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev1'))),
    '[{"type":"opkoeb","amount_oere":300000,"reference":" smoke-d2-1 "},{"type":"kontant","amount_oere":200000}]')
    INTO v_res;
  v_order := (v_res->>'order_id')::uuid;
  INSERT INTO _smoke (k, v) VALUES ('order1', v_order);

  SELECT * INTO r FROM public.trade_in_receipts WHERE id = (SELECT v FROM _smoke WHERE k = 'rec1');
  IF r.status <> 'paid' OR r.offset_order_id IS DISTINCT FROM v_order OR r.offset_amount <> 300000
     OR r.payout_method <> 'modregning' OR r.paid_at IS NULL
     OR r.paid_by IS DISTINCT FROM (SELECT v FROM _smoke WHERE k = 'staff') THEN
    RAISE EXCEPTION 'smoke: sedlen blev ikke modregnet korrekt: status=% offset=% amount=% method=%',
      r.status, r.offset_order_id, r.offset_amount, r.payout_method;
  END IF;

  SELECT imei INTO v_imei FROM public.order_items WHERE order_id = v_order AND item_type = 'device';
  IF v_imei IS DISTINCT FROM '359999000000018' THEN
    RAISE EXCEPTION 'smoke: order_items.imei er %, ikke 359999000000018', v_imei;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.order_payments
                  WHERE order_id = v_order AND type = 'opkoeb' AND amount_oere = 300000 AND reference = 'SMOKE-D2-1') THEN
    RAISE EXCEPTION 'smoke: betalingslinjen opkoeb mangler';
  END IF;
  IF (SELECT status FROM public.devices WHERE id = (SELECT v FROM _smoke WHERE k = 'dev1')) <> 'sold' THEN
    RAISE EXCEPTION 'smoke: enheden er ikke solgt';
  END IF;
END $$;

-- 2. Samme seddel igen giver trade_in_not_settleable.
INSERT INTO _smoke (k, v) VALUES ('dev2', pg_temp.mk_device('vejle', 'SMOKE-D2-DEV2', 500000, 'brugtmoms', '359999000000026', NULL));
SELECT pg_temp.expect_pos(pg_temp.sale_sql('vejle',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev2'))),
  '[{"type":"opkoeb","amount_oere":300000,"reference":"SMOKE-D2-1"},{"type":"kontant","amount_oere":200000}]'),
  'trade_in_not_settleable');

-- 3. Slagelse-kassen med en Vejle-seddel giver trade_in_not_settleable.
INSERT INTO _smoke (k, v) VALUES
  ('rec3', pg_temp.mk_receipt('vejle', 'SMOKE-D2-3', 300000, true)),
  ('dev3', pg_temp.mk_device('slagelse', 'SMOKE-D2-DEV3', 500000, 'brugtmoms', '359999000000034', NULL));
SELECT pg_temp.expect_pos(pg_temp.sale_sql('slagelse',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev3'))),
  '[{"type":"opkoeb","amount_oere":300000,"reference":"SMOKE-D2-3"},{"type":"kontant","amount_oere":200000}]'),
  'trade_in_not_settleable');

-- 4. En spærret enhed giver device_blocked (før alt andet på linjen, også status).
INSERT INTO _smoke (k, v) VALUES
  ('dev4', pg_temp.mk_device('vejle', 'SMOKE-D2-DEV4', 500000, 'brugtmoms', '359999000000042', NULL, 'intake', true));
SELECT pg_temp.expect_pos(pg_temp.sale_sql('vejle',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev4'))),
  '[{"type":"kontant","amount_oere":500000}]'),
  'device_blocked');

-- 5. Brugtmoms-enhed uden IMEI og uden medsendt IMEI giver imei_required.
INSERT INTO _smoke (k, v) VALUES ('dev5', pg_temp.mk_device('vejle', 'SMOKE-D2-DEV5', 500000, 'brugtmoms', NULL, NULL));
SELECT pg_temp.expect_pos(pg_temp.sale_sql('vejle',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev5'))),
  '[{"type":"kontant","amount_oere":500000}]'),
  'imei_required');
-- … også når det medsendte er tomt.
SELECT pg_temp.expect_pos(pg_temp.sale_sql('vejle',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev5'), 'imei', '  ')),
  '[{"type":"kontant","amount_oere":500000}]'),
  'imei_required');

-- 6. Et ugyldigt medsendt IMEI (forkert Luhn) giver imei_invalid.
SELECT pg_temp.expect_pos(pg_temp.sale_sql('vejle',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev5'), 'imei', '359999000000019')),
  '[{"type":"kontant","amount_oere":500000}]'),
  'imei_invalid');

-- 7. Enhed med IMEI og et andet medsendt giver imei_mismatch; det samme (med mellemrum) er i orden.
SELECT pg_temp.expect_pos(pg_temp.sale_sql('vejle',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev2'), 'imei', '359999000000034')),
  '[{"type":"kontant","amount_oere":500000}]'),
  'imei_mismatch');

-- 8. Seddel, der ikke findes → trade_in_not_found; for højt beløb → trade_in_amount_too_high;
--    uden scan → trade_in_not_settleable; uden reference → payment_reference_required.
INSERT INTO _smoke (k, v) VALUES
  ('rec8', pg_temp.mk_receipt('vejle', 'SMOKE-D2-8', 100000, true, true)),
  ('rec8b', pg_temp.mk_receipt('vejle', 'SMOKE-D2-8B', 300000, false)),
  ('rec8c', pg_temp.mk_receipt('vejle', 'SMOKE-D2-8C', 300000, true));
-- Restbeløb uden konto på sedlen: trade_in_remainder_no_account (fuld modregning af samme seddel er i orden, se 1).
SELECT pg_temp.expect_pos(pg_temp.sale_sql('vejle',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev2'))),
  '[{"type":"opkoeb","amount_oere":100000,"reference":"SMOKE-D2-8C"},{"type":"kontant","amount_oere":400000}]'),
  'trade_in_remainder_no_account');
SELECT pg_temp.expect_pos(pg_temp.sale_sql('vejle',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev2'))),
  '[{"type":"opkoeb","amount_oere":300000,"reference":"SMOKE-D2-FINDES-IKKE"},{"type":"kontant","amount_oere":200000}]'),
  'trade_in_not_found');
SELECT pg_temp.expect_pos(pg_temp.sale_sql('vejle',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev2'))),
  '[{"type":"opkoeb","amount_oere":300000,"reference":"SMOKE-D2-8"},{"type":"kontant","amount_oere":200000}]'),
  'trade_in_amount_too_high');
SELECT pg_temp.expect_pos(pg_temp.sale_sql('vejle',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev2'))),
  '[{"type":"opkoeb","amount_oere":300000,"reference":"SMOKE-D2-8B"},{"type":"kontant","amount_oere":200000}]'),
  'trade_in_not_settleable');
SELECT pg_temp.expect_pos(pg_temp.sale_sql('vejle',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev2'))),
  '[{"type":"opkoeb","amount_oere":300000},{"type":"kontant","amount_oere":200000}]'),
  'payment_reference_required');
-- Samme seddel to gange i samme salg.
SELECT pg_temp.expect_pos(pg_temp.sale_sql('vejle',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev2'))),
  '[{"type":"opkoeb","amount_oere":50000,"reference":"SMOKE-D2-8"},{"type":"opkoeb","amount_oere":50000,"reference":"SMOKE-D2-8"},{"type":"kontant","amount_oere":400000}]'),
  'trade_in_not_settleable');

-- 9. Delvis modregning: sedlen forbliver bekræftet med offset_amount, restbeløbet udbetales senere.
--    Medsendt IMEI udfylder enhedens tomme IMEI og står på bonen.
DO $$
DECLARE
  v_res jsonb;
  r record;
  d record;
BEGIN
  EXECUTE pg_temp.sale_sql('vejle',
    jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev5'),
                                         'imei', '3599 9900 0000 059')),
    '[{"type":"opkoeb","amount_oere":60000,"reference":"SMOKE-D2-8"},{"type":"kontant","amount_oere":440000}]')
    INTO v_res;
  SELECT * INTO r FROM public.trade_in_receipts WHERE id = (SELECT v FROM _smoke WHERE k = 'rec8');
  IF r.status <> 'confirmed' OR r.offset_amount <> 60000 OR r.offset_order_id IS DISTINCT FROM (v_res->>'order_id')::uuid
     OR r.payout_method <> 'modregning' OR r.paid_at IS NOT NULL THEN
    RAISE EXCEPTION 'smoke: delvis modregning forkert: status=% amount=% paid_at=%', r.status, r.offset_amount, r.paid_at;
  END IF;
  SELECT * INTO d FROM public.devices WHERE id = (SELECT v FROM _smoke WHERE k = 'dev5');
  IF d.imei IS DISTINCT FROM '359999000000059' OR d.serial_number IS NOT NULL OR d.status <> 'sold' THEN
    RAISE EXCEPTION 'smoke: enhedens IMEI blev ikke udfyldt: imei=% serial=% status=%', d.imei, d.serial_number, d.status;
  END IF;
  IF (SELECT imei FROM public.order_items WHERE order_id = (v_res->>'order_id')::uuid AND item_type = 'device')
     IS DISTINCT FROM '359999000000059' THEN
    RAISE EXCEPTION 'smoke: order_items.imei mangler ved udfyldt IMEI';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.device_changes WHERE device_id = d.id AND field = 'imei' AND new_value = '359999000000059') THEN
    RAISE EXCEPTION 'smoke: IMEI-udfyldningen blev ikke logget i device_changes';
  END IF;
END $$;

-- 10. Et serienummer udfylder serial_number; en enhed med almindelig moms uden id kan sælges uden.
INSERT INTO _smoke (k, v) VALUES
  ('dev10', pg_temp.mk_device('vejle', 'SMOKE-D2-DEV10', 400000, 'brugtmoms', NULL, NULL)),
  ('dev11', pg_temp.mk_device('vejle', 'SMOKE-D2-DEV11', 400000, 'regular', NULL, NULL));
DO $$
DECLARE
  v_res jsonb;
  d record;
BEGIN
  EXECUTE pg_temp.sale_sql('vejle',
    jsonb_build_array(
      jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev10'), 'imei', 'f2lxk0abcd12'),
      jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev11'))),
    '[{"type":"kort_terminal","amount_oere":800000}]')
    INTO v_res;
  SELECT * INTO d FROM public.devices WHERE id = (SELECT v FROM _smoke WHERE k = 'dev10');
  IF d.serial_number IS DISTINCT FROM 'F2LXK0ABCD12' OR d.imei IS NOT NULL THEN
    RAISE EXCEPTION 'smoke: serienummeret blev ikke udfyldt: imei=% serial=%', d.imei, d.serial_number;
  END IF;
  IF (SELECT imei FROM public.order_items WHERE order_id = (v_res->>'order_id')::uuid
        AND device_id = (SELECT v FROM _smoke WHERE k = 'dev10')) IS DISTINCT FROM 'F2LXK0ABCD12'
     OR (SELECT imei FROM public.order_items WHERE order_id = (v_res->>'order_id')::uuid
        AND device_id = (SELECT v FROM _smoke WHERE k = 'dev11')) IS NOT NULL THEN
    RAISE EXCEPTION 'smoke: order_items.imei forkert ved serienummer / almindelig moms';
  END IF;
END $$;

-- 11. Et almindeligt salg uden opkøb og uden IMEI-felt virker som før (tilbehør eller diverse salg).
DO $$
BEGIN
  EXECUTE pg_temp.sale_sql('vejle',
    '[{"type":"free_text","description":"Smoke diverse","unit_price_oere":10000,"quantity":1}]',
    '[{"type":"mobilepay","amount_oere":10000}]');
END $$;

-- 12. En enhed solgt på en reparationssag (case-linje) følger samme IMEI-regler som en almindelig linje.
INSERT INTO _smoke (k, v) VALUES ('dev12', pg_temp.mk_device('vejle', 'SMOKE-D2-DEV12', 400000, 'brugtmoms', NULL, NULL));
WITH t AS (
  INSERT INTO public.repair_tickets (customer_name, customer_email, customer_phone, device_type, device_model,
                                     issue_description, service_type, store_id)
  VALUES ('Smoke Kunde', 'smoke@example.dk', '12345678', 'Smartphone', 'iPhone 13', 'Smoke', 'repair', 'vejle')
  RETURNING id)
INSERT INTO _smoke (k, v) SELECT 'ticket12', id FROM t;
INSERT INTO public.repair_ticket_items (ticket_id, kind, description, qty, unit_price_oere, list_price_oere, device_id, stock_status)
SELECT (SELECT v FROM _smoke WHERE k = 'ticket12'), 'device', 'Smoke iPhone 13', 1, 400000, 400000,
       (SELECT v FROM _smoke WHERE k = 'dev12'), 'planned';
INSERT INTO _smoke (k, v)
SELECT 'item12', id FROM public.repair_ticket_items WHERE device_id = (SELECT v FROM _smoke WHERE k = 'dev12');
SELECT pg_temp.expect_pos(pg_temp.sale_sql('vejle',
  jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev12'),
                                       'repair_ticket_item_id', (SELECT v FROM _smoke WHERE k = 'item12'))),
  '[{"type":"kontant","amount_oere":400000}]'),
  'imei_required');
DO $$
DECLARE
  v_res jsonb;
BEGIN
  EXECUTE pg_temp.sale_sql('vejle',
    jsonb_build_array(jsonb_build_object('type', 'device', 'device_id', (SELECT v FROM _smoke WHERE k = 'dev12'),
                                         'repair_ticket_item_id', (SELECT v FROM _smoke WHERE k = 'item12'),
                                         'imei', '359999000000067')),
    '[{"type":"kontant","amount_oere":400000}]')
    INTO v_res;
  IF (SELECT imei FROM public.devices WHERE id = (SELECT v FROM _smoke WHERE k = 'dev12')) IS DISTINCT FROM '359999000000067'
     OR (SELECT imei FROM public.order_items WHERE order_id = (v_res->>'order_id')::uuid AND item_type = 'device')
        IS DISTINCT FROM '359999000000067'
     OR (SELECT stock_status FROM public.repair_ticket_items WHERE id = (SELECT v FROM _smoke WHERE k = 'item12')) <> 'sold' THEN
    RAISE EXCEPTION 'smoke: case-linjens IMEI blev ikke gemt (enhed, bon eller sagslinje)';
  END IF;
END $$;

SELECT 'd2-smoke-sale OK' AS result;

ROLLBACK;
