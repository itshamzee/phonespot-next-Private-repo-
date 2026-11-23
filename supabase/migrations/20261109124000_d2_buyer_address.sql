-- D2: Opkøb i butikken — købers adresse på slutsedlen.
-- Rettelse til trade_in_confirm (20261109121500): købers adresse er altid den
-- juridiske enheds adresse. Esbjerg-sedler fik før NULL; nu får de enhedens
-- adresse (Fixon: Løversysselvej 3C, 7100 Vejle). Butikkens adresse bruges kun som
-- fallback, hvis enheden ingen har, og aldrig for Esbjerg. Ellers uændret.
-- Idempotent: kan køres igen.

BEGIN;

SET LOCAL lock_timeout = '5s';

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
  v_lock_imei text;
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

  -- IMEI-låse tages i sorteret rækkefølge, før tælleren og varerne, så to
  -- samtidige bekræftelser (også på tværs af firmaer) ikke kan deadlocke.
  FOR v_lock_imei IN
    SELECT DISTINCT upper(regexp_replace(imei_serial, '\s+', '', 'g')) AS v
      FROM public.trade_in_receipt_items
     WHERE receipt_id = r.id
       AND upper(regexp_replace(imei_serial, '\s+', '', 'g')) ~ '^[0-9]{15}$'
     ORDER BY 1
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('devices.imei:' || v_lock_imei, 0));
  END LOOP;

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

  -- Køber: den juridiske enheds adresse (momsbekendtgørelsen § 122 kræver købers adresse).
  -- Butikkens adresse bruges kun, hvis enheden ingen har, og aldrig for Esbjerg,
  -- hvis butiksadresse ikke er offentlig.
  v_buyer_address := coalesce(
    nullif(btrim(v_le.address), ''),
    CASE WHEN v_loc.slug = 'esbjerg' THEN NULL ELSE nullif(btrim(v_loc.address), '') END
  );

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
      -- IMEI'et er låst ovenfor. En enhed fra en annulleret slutseddel tæller
      -- ikke: annullering er måden at rette en forkert seddel på, og samme
      -- telefon skal kunne købes ind igen.
      IF EXISTS (SELECT 1 FROM public.devices
                  WHERE imei = v_imei AND status NOT IN ('sold', 'shipped', 'picked_up')
                    AND blocked_reason IS DISTINCT FROM 'Slutseddel annulleret') THEN
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

COMMIT;
