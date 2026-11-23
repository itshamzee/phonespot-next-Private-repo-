-- D2: Opkøb i butikken — bekræft og annullér en slutseddel.
--
--  * imei_is_valid(text): 15 cifre med gyldigt Luhn-kontrolciffer (spejler
--    isValidImei i src/lib/opkoeb/rules.ts).
--  * trade_in_confirm(receipt, staff): validerer de samme regler som
--    confirmBlockers (SQL er den endelige kontrol), giver nummeret fra
--    slutseddel_counters (PREFIX-ÅÅÅÅ-NNNN pr. juridisk enhed og år i
--    Europe/Copenhagen), snapshotter køber, opretter enheder, indkøbsbilag og
--    lagerbevægelser, og flipper til sidst sedlen til 'confirmed'. Alt eller intet.
--  * trade_in_void(receipt, staff, reason): annullerer en bekræftet, ikke-udbetalt
--    seddel, hvis alle dens enheder stadig er 'intake'. Enhederne spærres og tages
--    af lager.
--
-- Fejl rejses med pos_fail (SQLSTATE PS001, 'pos:<kode>[:<detalje>]') og
-- oversættes til dansk i src/lib/pos/errors.ts.
-- Kun service-rollen må kalde funktionerne. Idempotent: kan køres igen.

BEGIN;

SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- Luhn-tjek af IMEI
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.imei_is_valid(p_value text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE SET search_path = pg_catalog AS $$
DECLARE
  v_sum int := 0;
  v_digit int;
  i int;
BEGIN
  IF p_value !~ '^[0-9]{15}$' THEN
    RETURN false;
  END IF;
  -- Fra højre: hvert andet ciffer (2., 4., …) fordobles, og 9 trækkes fra over 9.
  FOR i IN 0 .. 14 LOOP
    v_digit := substr(p_value, 15 - i, 1)::int;
    IF i % 2 = 1 THEN
      v_digit := v_digit * 2;
      IF v_digit > 9 THEN v_digit := v_digit - 9; END IF;
    END IF;
    v_sum := v_sum + v_digit;
  END LOOP;
  RETURN v_sum % 10 = 0;
END;
$$;

REVOKE ALL ON FUNCTION public.imei_is_valid(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.imei_is_valid(text) TO service_role;

-- ---------------------------------------------------------------------------
-- Bekræft
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trade_in_confirm(p_receipt_id uuid, p_staff_id uuid) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  r public.trade_in_receipts%ROWTYPE;
  v_loc public.locations%ROWTYPE;
  v_le public.legal_entities%ROWTYPE;
  it record;
  v_now timestamptz := now();
  v_today date := (now() AT TIME ZONE 'Europe/Copenhagen')::date;
  v_year int := extract(year FROM now() AT TIME ZONE 'Europe/Copenhagen')::int;
  v_count int;
  v_total bigint;
  v_n int;
  v_ident text;
  v_imei text;
  v_serial text;
  v_vat text;
  v_cost int;
  v_seq int;
  v_number text;
  v_buyer_address text;
  v_seller_address text;
  v_doc_text text;
  v_dev uuid;
  v_devs uuid[] := '{}';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND is_active) THEN
    PERFORM public.pos_fail('staff_not_found');
  END IF;

  SELECT * INTO r FROM public.trade_in_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM public.pos_fail('receipt_not_found');
  END IF;
  IF r.status <> 'draft' THEN
    PERFORM public.pos_fail('receipt_not_draft');
  END IF;

  -- Butik og juridisk enhed (køber og nummerserie).
  SELECT * INTO v_loc FROM public.locations WHERE id = r.location_id;
  IF NOT FOUND OR v_loc.legal_entity_id IS NULL THEN
    PERFORM public.pos_fail('location_missing');
  END IF;
  SELECT * INTO v_le FROM public.legal_entities WHERE id = v_loc.legal_entity_id;
  IF NOT FOUND OR coalesce(btrim(v_le.receipt_prefix), '') = '' THEN
    PERFORM public.pos_fail('location_missing');
  END IF;

  -- Varelinjerne låses, så de ikke ændres under bekræftelsen.
  PERFORM 1 FROM public.trade_in_receipt_items WHERE receipt_id = r.id FOR UPDATE;
  SELECT count(*), coalesce(sum(price), 0) INTO v_count, v_total
    FROM public.trade_in_receipt_items WHERE receipt_id = r.id;
  IF v_count = 0 THEN
    PERFORM public.pos_fail('receipt_empty');
  END IF;

  -- Hver vare: model, gyldigt IMEI (Luhn) eller serienummer (5–30 A-Z0-9), pris > 0.
  v_n := 0;
  FOR it IN
    SELECT * FROM public.trade_in_receipt_items WHERE receipt_id = r.id ORDER BY created_at, id
  LOOP
    v_n := v_n + 1;
    v_ident := upper(regexp_replace(coalesce(it.imei_serial, ''), '\s+', '', 'g'));
    IF it.template_id IS NULL OR it.price IS NULL OR it.price <= 0
       OR NOT (CASE WHEN v_ident ~ '^[0-9]{15}$' THEN public.imei_is_valid(v_ident)
                    ELSE v_ident ~ '^[A-Z0-9]{5,30}$' END) THEN
      PERFORM public.pos_fail('item_invalid', v_n::text);
    END IF;
  END LOOP;

  -- Sælger. Adressen kræves for alle sælgertyper (momsbek. § 122).
  IF coalesce(btrim(r.seller_name), '') = '' OR coalesce(btrim(r.seller_address), '') = '' THEN
    PERFORM public.pos_fail('seller_missing');
  END IF;
  IF r.seller_type = 'private' THEN
    IF NOT r.seller_age_confirmed THEN
      PERFORM public.pos_fail('age_missing');
    END IF;
  ELSIF coalesce(r.seller_cvr, '') !~ '^[0-9]{8}$' OR r.invoice_type IS NULL THEN
    PERFORM public.pos_fail('business_fields_missing');
  END IF;

  IF NOT r.lock_checks_confirmed THEN
    PERFORM public.pos_fail('checks_missing');
  END IF;

  -- ID: kræves kun strengt over 2.000 kr. Er det angivet, skal det være gyldigt.
  -- Billed-ID kræver udløb, der ikke ligger før i dag; MitID har intet udløb.
  IF r.id_type IS NULL THEN
    IF v_total > 200000 THEN
      PERFORM public.pos_fail('id_required');
    END IF;
  ELSE
    IF r.id_type NOT IN ('pas', 'koerekort', 'id_kort', 'mitid')
       OR coalesce(btrim(r.id_number), '') = ''
       OR (r.id_type <> 'mitid' AND r.id_expiry IS NULL) THEN
      PERFORM public.pos_fail('id_incomplete');
    END IF;
    IF r.id_type <> 'mitid' AND r.id_expiry < v_today THEN
      PERFORM public.pos_fail('id_expired');
    END IF;
  END IF;

  -- Nummer: én fortløbende serie pr. juridisk enhed og år. Rækkelåsen på tælleren
  -- serialiserer samtidige bekræftelser; en fejl senere ruller tælleren tilbage.
  INSERT INTO public.slutseddel_counters AS c (legal_entity_id, year, last_number)
  VALUES (v_le.id, v_year, 1)
  ON CONFLICT (legal_entity_id, year) DO UPDATE SET last_number = c.last_number + 1
  RETURNING c.last_number INTO v_seq;
  v_number := btrim(v_le.receipt_prefix) || '-' || v_year::text || '-'
              || lpad(v_seq::text, greatest(4, length(v_seq::text)), '0');

  -- Kladder har intet nummer. En kladde, der stadig bærer et nummer fra den gamle
  -- tæller (generate_receipt_number), mister det i stedet for at blokere serien.
  UPDATE public.trade_in_receipts
     SET receipt_number = NULL
   WHERE receipt_number = v_number AND status = 'draft' AND id <> r.id;

  -- Køber: den juridiske enheds adresse, ellers butikkens. Esbjerg får aldrig en adresse.
  v_buyer_address := CASE
    WHEN v_loc.slug = 'esbjerg' THEN NULL
    ELSE coalesce(nullif(btrim(v_le.address), ''), nullif(btrim(v_loc.address), ''))
  END;

  v_seller_address := concat_ws(', ', nullif(btrim(r.seller_address), ''), nullif(btrim(r.seller_postal_city), ''));

  -- Momsordning og kostpris (Global Constraints-tabellen / vatSchemeFor + deviceCostOere).
  IF r.seller_type = 'private' OR r.invoice_type = 'brugtmoms' THEN
    v_vat := 'brugtmoms';
  ELSE
    v_vat := 'regular';
  END IF;
  v_doc_text := CASE
    WHEN r.seller_type = 'private' THEN 'Købt fra privat — brugtmoms'
    WHEN r.invoice_type = 'brugtmoms' THEN 'Købt fra virksomhed på brugtmomsfaktura — brugtmoms'
    WHEN r.invoice_type = 'med_moms' THEN 'Købt fra virksomhed — faktura med moms'
    ELSE 'Købt fra virksomhed i EU — faktura uden dansk moms'
  END;

  FOR it IN
    SELECT * FROM public.trade_in_receipt_items WHERE receipt_id = r.id ORDER BY created_at, id
  LOOP
    v_ident := upper(regexp_replace(it.imei_serial, '\s+', '', 'g'));
    IF v_ident ~ '^[0-9]{15}$' THEN
      v_imei := v_ident;
      v_serial := NULL;
      -- Serialiser samtidige opkøb af samme IMEI, før dubletten tjekkes.
      PERFORM pg_advisory_xact_lock(hashtextextended('devices.imei:' || v_imei, 0));
      IF EXISTS (SELECT 1 FROM public.devices
                  WHERE imei = v_imei AND status NOT IN ('sold', 'shipped', 'picked_up')) THEN
        PERFORM public.pos_fail('imei_in_stock', v_imei);
      END IF;
    ELSE
      v_imei := NULL;
      v_serial := v_ident;
    END IF;

    v_cost := CASE
      WHEN r.seller_type = 'business' AND r.invoice_type = 'med_moms' THEN round(it.price * 4 / 5.0)::int
      ELSE it.price
    END;

    INSERT INTO public.devices (
      template_id, imei, serial_number, grade, battery_health, storage, color, condition_notes,
      purchase_price, vat_scheme, location_id, source, status, purchased_at
    ) VALUES (
      it.template_id, v_imei, v_serial,
      CASE it.condition_grade WHEN 'Perfekt' THEN 'A' WHEN 'God' THEN 'B' ELSE 'C' END,
      it.battery_health, it.storage, it.color, it.condition_notes,
      v_cost, v_vat, r.location_id, 'internal', 'intake', v_now
    ) RETURNING id INTO v_dev;

    INSERT INTO public.purchase_documents (
      device_id, seller_name, seller_address, document_date, item_description,
      purchase_price, pdf_url, brugtmoms_text, trade_in_receipt_id
    ) VALUES (
      v_dev, btrim(r.seller_name), v_seller_address, v_today,
      concat_ws(', ', nullif(btrim(it.model), ''), nullif(btrim(it.storage), ''),
                CASE WHEN v_imei IS NOT NULL THEN 'IMEI ' || v_imei ELSE 'Serienr. ' || v_serial END),
      it.price, v_number, v_doc_text, r.id
    );

    INSERT INTO public.stock_movements (location_id, device_id, qty_delta, reason, ref_note, staff_id)
    VALUES (r.location_id, v_dev, 1, 'purchase', 'Slutseddel ' || v_number, p_staff_id);

    -- Sættes, mens sedlen stadig er kladde (varelinjer er låst bagefter).
    UPDATE public.trade_in_receipt_items
       SET device_id = v_dev, imei_serial = v_ident
     WHERE id = it.id;

    v_devs := v_devs || v_dev;
  END LOOP;

  UPDATE public.trade_in_receipts
     SET receipt_number = v_number,
         legal_entity_id = v_le.id,
         buyer_company = v_le.name,
         buyer_cvr = v_le.cvr,
         buyer_address = v_buyer_address,
         buyer_postal_city = NULL,
         total_amount = v_total,
         confirmed_at = v_now,
         confirmed_by = p_staff_id,
         status = 'confirmed'
   WHERE id = r.id;

  RETURN jsonb_build_object('receipt_number', v_number, 'device_ids', to_jsonb(v_devs));
END;
$$;

REVOKE ALL ON FUNCTION public.trade_in_confirm(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trade_in_confirm(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Annullér
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trade_in_void(p_receipt_id uuid, p_staff_id uuid, p_reason text) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  r public.trade_in_receipts%ROWTYPE;
  v_reason text := btrim(coalesce(p_reason, ''));
BEGIN
  IF v_reason = '' THEN
    PERFORM public.pos_fail('void_reason_required');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND is_active) THEN
    PERFORM public.pos_fail('staff_not_found');
  END IF;

  SELECT * INTO r FROM public.trade_in_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM public.pos_fail('receipt_not_found');
  END IF;
  -- Kun en bekræftet seddel, der hverken er udbetalt eller modregnet.
  IF r.status <> 'confirmed' OR r.offset_order_id IS NOT NULL THEN
    PERFORM public.pos_fail('receipt_not_voidable');
  END IF;

  -- Alle enheder skal stadig være i modtagelse (ikke klargjort, listet eller solgt).
  PERFORM 1 FROM public.devices
   WHERE id IN (SELECT device_id FROM public.trade_in_receipt_items WHERE receipt_id = r.id)
   FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.trade_in_receipt_items i
               JOIN public.devices d ON d.id = i.device_id
              WHERE i.receipt_id = r.id AND d.status <> 'intake') THEN
    PERFORM public.pos_fail('receipt_not_voidable');
  END IF;

  -- Spær og tag af lager, så enheden aldrig kan sættes til salg igen.
  WITH blocked AS (
    UPDATE public.devices
       SET blocked_at = now(),
           blocked_reason = 'Slutseddel annulleret',
           status = 'delisted'
     WHERE id IN (SELECT device_id FROM public.trade_in_receipt_items WHERE receipt_id = r.id)
    RETURNING id, location_id
  )
  INSERT INTO public.stock_movements (location_id, device_id, qty_delta, reason, ref_note, staff_id)
  SELECT location_id, id, -1, 'adjust', 'Slutseddel ' || r.receipt_number || ' annulleret', p_staff_id
    FROM blocked;

  UPDATE public.trade_in_receipts
     SET status = 'voided',
         voided_at = now(),
         voided_by = p_staff_id,
         void_reason = v_reason
   WHERE id = r.id;
END;
$$;

REVOKE ALL ON FUNCTION public.trade_in_void(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trade_in_void(uuid, uuid, text) TO service_role;

COMMIT;
