-- D2 smoke-test: pos_create_return refunderer opkøbsandelen af et salg kun som tilgodebevis.
-- Forudsætter migrationerne 20261109127000_d2_pos_sale_opkoeb.sql og 20261109128000_d2_return_opkoeb.sql.
-- Kør: node .superpowers/sdd/2026-11-09-d2-opkoeb-i-butikken/run-sql.mjs scripts/sql/d2-smoke-return.sql
-- Alt sker i én transaktion, der slutter med ROLLBACK. Kassens række låses kort under kørslen.
-- Hver DO-blok RAISE'r, hvis en forventet fejl udebliver, eller hvis et tilladt skridt fejler.

BEGIN;

SET LOCAL lock_timeout = '3s';

CREATE TEMP TABLE _smoke (k text PRIMARY KEY, v uuid, t text) ON COMMIT DROP;

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

CREATE FUNCTION pg_temp.reg(p_slug text) RETURNS uuid LANGUAGE sql AS $$
  SELECT r.id FROM public.registers r JOIN public.locations l ON l.id = r.location_id
   WHERE l.slug = p_slug AND r.active ORDER BY r.code LIMIT 1;
$$;

-- Et salg i Vejle; returnerer ordre-id.
CREATE FUNCTION pg_temp.sale(p_items jsonb, p_payments jsonb) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_res jsonb;
BEGIN
  v_res := public.pos_create_sale(
    (SELECT location_id FROM public.registers WHERE id = pg_temp.reg('vejle')), pg_temp.reg('vejle'),
    (SELECT v FROM _smoke WHERE k = 'staff'), NULL, p_items, p_payments, 0, NULL, NULL);
  RETURN (v_res->>'order_id')::uuid;
END $$;

-- SQL-teksten for en retur af hele linjer (p_item_ids) på salget.
CREATE FUNCTION pg_temp.return_sql(p_order uuid, p_item_ids uuid[], p_refunds jsonb) RETURNS text
LANGUAGE sql AS $$
  SELECT format(
    'SELECT public.pos_create_return(%L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::jsonb, %L::jsonb, %L, NULL)',
    p_order, pg_temp.reg('vejle'),
    (SELECT location_id FROM public.registers WHERE id = pg_temp.reg('vejle')),
    (SELECT v FROM _smoke WHERE k = 'staff'),
    (SELECT jsonb_agg(jsonb_build_object('order_item_id', x, 'quantity', 1, 'restock', false))
       FROM unnest(p_item_ids) x),
    p_refunds, 'Fortrudt køb');
$$;

-- Bekræftet privat slutseddel med scan.
CREATE FUNCTION pg_temp.mk_receipt(p_number text, p_total int) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.trade_in_receipts (
    receipt_number, location_id, seller_type, seller_name, seller_address, seller_postal_city,
    seller_age_confirmed, lock_checks_confirmed, total_amount, status, attestation,
    signed_scan_path, confirmed_at, confirmed_by, payout_method
  ) VALUES (
    p_number, (SELECT id FROM public.locations WHERE slug = 'vejle'), 'private', 'Smoke Sælger',
    'Testvej 1', '7100 Vejle', true, true, p_total, 'confirmed', 'paper_scan',
    'smoke/scan.pdf', now(), (SELECT v FROM _smoke WHERE k = 'staff'), 'modregning'
  ) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

INSERT INTO _smoke (k, v) SELECT 'staff', id FROM public.staff WHERE is_active ORDER BY created_at LIMIT 1;

INSERT INTO public.cash_sessions (register_id, opening_float, opened_by)
SELECT pg_temp.reg('vejle'), 0, (SELECT v FROM _smoke WHERE k = 'staff')
 WHERE NOT EXISTS (SELECT 1 FROM public.cash_sessions s WHERE s.register_id = pg_temp.reg('vejle') AND s.closed_at IS NULL);

-- 1. Salg på 5.000 kr. (to linjer à 2.500 kr.), betalt med opkøb 3.000 + kontant 2.000.
SELECT pg_temp.mk_receipt('SMOKE-D2-R1', 300000);
INSERT INTO _smoke (k, v) SELECT 'order1', pg_temp.sale(
  '[{"type":"free_text","description":"Smoke A","unit_price_oere":250000,"quantity":1},
    {"type":"free_text","description":"Smoke B","unit_price_oere":250000,"quantity":1}]',
  '[{"type":"opkoeb","amount_oere":300000,"reference":"SMOKE-D2-R1"},{"type":"kontant","amount_oere":200000}]');
INSERT INTO _smoke (k, v)
SELECT 'item' || row_number() OVER (ORDER BY description), id
  FROM public.order_items WHERE order_id = (SELECT v FROM _smoke WHERE k = 'order1');

-- 2. Hele salget retur kontant: afvist.
SELECT pg_temp.expect_pos(pg_temp.return_sql((SELECT v FROM _smoke WHERE k = 'order1'),
  ARRAY[(SELECT v FROM _smoke WHERE k = 'item1'), (SELECT v FROM _smoke WHERE k = 'item2')],
  '[{"type":"kontant","amount_oere":500000}]'), 'opkoeb_refund_tilgodebevis');
-- … også kort/MobilePay, og 1 øre for meget kontant.
SELECT pg_temp.expect_pos(pg_temp.return_sql((SELECT v FROM _smoke WHERE k = 'order1'),
  ARRAY[(SELECT v FROM _smoke WHERE k = 'item1'), (SELECT v FROM _smoke WHERE k = 'item2')],
  '[{"type":"kort_terminal","amount_oere":200000},{"type":"mobilepay","amount_oere":1},{"type":"tilgodebevis","amount_oere":299999}]'),
  'opkoeb_refund_tilgodebevis');

-- 3. Første linje retur: 2.000 kontant + 500 tilgodebevis er i orden.
DO $$
BEGIN
  EXECUTE pg_temp.return_sql((SELECT v FROM _smoke WHERE k = 'order1'),
    ARRAY[(SELECT v FROM _smoke WHERE k = 'item1')],
    '[{"type":"kontant","amount_oere":200000},{"type":"tilgodebevis","amount_oere":50000}]');
END $$;

-- 4. Anden linje: kontant-rammen er brugt op, så selv 1 øre kontant afvises (tælles over alle returer).
SELECT pg_temp.expect_pos(pg_temp.return_sql((SELECT v FROM _smoke WHERE k = 'order1'),
  ARRAY[(SELECT v FROM _smoke WHERE k = 'item2')],
  '[{"type":"kontant","amount_oere":1},{"type":"tilgodebevis","amount_oere":249999}]'), 'opkoeb_refund_tilgodebevis');
DO $$
DECLARE v_res jsonb;
BEGIN
  EXECUTE pg_temp.return_sql((SELECT v FROM _smoke WHERE k = 'order1'),
    ARRAY[(SELECT v FROM _smoke WHERE k = 'item2')],
    '[{"type":"tilgodebevis","amount_oere":250000}]') INTO v_res;
  IF (v_res->>'refund_amount')::int <> 250000 THEN
    RAISE EXCEPTION 'smoke: refund_amount er %, ikke 250000', v_res->>'refund_amount';
  END IF;
END $$;

-- 5. Et salg uden opkøb refunderes kontant som før.
INSERT INTO _smoke (k, v) SELECT 'order5', pg_temp.sale(
  '[{"type":"free_text","description":"Smoke C","unit_price_oere":10000,"quantity":1}]',
  '[{"type":"kontant","amount_oere":10000}]');
DO $$
BEGIN
  EXECUTE pg_temp.return_sql((SELECT v FROM _smoke WHERE k = 'order5'),
    ARRAY[(SELECT id FROM public.order_items WHERE order_id = (SELECT v FROM _smoke WHERE k = 'order5'))],
    '[{"type":"kontant","amount_oere":10000}]');
END $$;

-- 6. Salg betalt fuldt med opkøb: delvis retur kun som tilgodebevis.
SELECT pg_temp.mk_receipt('SMOKE-D2-R6', 50000);
INSERT INTO _smoke (k, v) SELECT 'order6', pg_temp.sale(
  '[{"type":"free_text","description":"Smoke D","unit_price_oere":50000,"quantity":1}]',
  '[{"type":"opkoeb","amount_oere":50000,"reference":"SMOKE-D2-R6"}]');
SELECT pg_temp.expect_pos(pg_temp.return_sql((SELECT v FROM _smoke WHERE k = 'order6'),
  ARRAY[(SELECT id FROM public.order_items WHERE order_id = (SELECT v FROM _smoke WHERE k = 'order6'))],
  '[{"type":"mobilepay","amount_oere":50000}]'), 'opkoeb_refund_tilgodebevis');
DO $$
BEGIN
  EXECUTE pg_temp.return_sql((SELECT v FROM _smoke WHERE k = 'order6'),
    ARRAY[(SELECT id FROM public.order_items WHERE order_id = (SELECT v FROM _smoke WHERE k = 'order6'))],
    '[{"type":"tilgodebevis","amount_oere":50000}]');
END $$;

SELECT 'd2-smoke-return OK' AS result;

ROLLBACK;
