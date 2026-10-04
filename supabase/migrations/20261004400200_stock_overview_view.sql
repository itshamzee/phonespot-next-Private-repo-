-- Overførsler mellem butikker, del 3 af 3: vare- og lageroverblik til /admin/varer.
-- Kør EFTER 20261004400100_stock_transfer_functions.sql (bruger transfer_grade_label).
--
-- Én række pr. vare: enten et tilbehør/en reservedel (sku_products) eller en
-- ENHEDSGRUPPE (skabelon + lager + grade, fx "iPhone 14 Pro 128 GB · Grade A").
-- Antal pr. butik: tilbehør = sku_stock.quantity; enheder = antal med status 'listed'.
-- 'in_transit' = antal der er på vej (sendt, ikke modtaget endnu).
--
-- Aggregeringen sker FØR PostgREST filtrerer/paginerer, så søgning, filtre og
-- sideinddeling er ægte server-side. Viewet indeholder kostpris, så det er
-- KUN for service_role; API'et fjerner kostpris for medarbejdere uden manager-rolle.
--
-- Antagelser: locations.slug findes (20261003100000_locations_slug.sql) med
-- 'vejle' | 'slagelse' | 'webshop'; devices.source findes (20260325_foxway_integration.sql).
-- Idempotent.

BEGIN;

CREATE OR REPLACE VIEW public.stock_overview AS
WITH sku_rows AS (
  SELECT
    'sku:' || p.id::text AS row_key,
    'sku'::text AS kind,
    p.id AS sku_product_id,
    NULL::uuid AS template_id,
    NULL::text AS storage,
    NULL::text AS grade,
    p.title AS name,
    CASE WHEN p.subcategory = 'spare-part' OR p.category = 'spare-part' THEN 'reservedel' ELSE 'tilbehoer' END AS item_type,
    'regular'::text AS vat_scheme,
    p.cost_price::bigint AS cost_price,
    (CASE WHEN p.sale_price IS NOT NULL AND p.sale_price < p.selling_price THEN p.sale_price ELSE p.selling_price END)::bigint AS price,
    (CASE WHEN p.sale_price IS NOT NULL AND p.sale_price < p.selling_price THEN p.sale_price ELSE p.selling_price END)::bigint AS price_max,
    coalesce(p.always_in_stock, false) AS always_in_stock,
    coalesce(s.qty_vejle, 0)::int AS qty_vejle,
    coalesce(s.qty_slagelse, 0)::int AS qty_slagelse,
    coalesce(s.qty_webshop, 0)::int AS qty_webshop,
    s.min_vejle, s.min_slagelse, s.min_webshop,
    coalesce(tr.in_transit, 0)::int AS in_transit,
    lower(concat_ws(' ', p.title, p.ean, p.product_number)) AS search_text
  FROM public.sku_products p
  LEFT JOIN LATERAL (
    SELECT
      sum(st.quantity) FILTER (WHERE l.slug = 'vejle') AS qty_vejle,
      sum(st.quantity) FILTER (WHERE l.slug = 'slagelse') AS qty_slagelse,
      sum(st.quantity) FILTER (WHERE l.slug = 'webshop') AS qty_webshop,
      max(st.min_level) FILTER (WHERE l.slug = 'vejle') AS min_vejle,
      max(st.min_level) FILTER (WHERE l.slug = 'slagelse') AS min_slagelse,
      max(st.min_level) FILTER (WHERE l.slug = 'webshop') AS min_webshop
    FROM public.sku_stock st JOIN public.locations l ON l.id = st.location_id
    WHERE st.product_id = p.id
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT sum(ln.sent_qty - ln.received_qty - ln.returned_qty) AS in_transit
    FROM public.stock_transfer_lines ln JOIN public.stock_transfers t ON t.id = ln.transfer_id
    WHERE ln.sku_product_id = p.id AND t.status = 'sent'
  ) tr ON true
  WHERE coalesce(p.is_active, true)
),
device_rows AS (
  SELECT
    'dev:' || d.template_id::text || ':' || coalesce(d.storage, '') || ':' || d.grade AS row_key,
    'device'::text AS kind,
    NULL::uuid AS sku_product_id,
    d.template_id,
    d.storage,
    d.grade,
    t.display_name || coalesce(' ' || d.storage, '') || ' · ' || public.transfer_grade_label(d.grade) AS name,
    'serievare'::text AS item_type,
    CASE WHEN bool_or(d.vat_scheme = 'brugtmoms') THEN 'brugtmoms' ELSE 'regular' END AS vat_scheme,
    round(avg(d.purchase_price))::bigint AS cost_price,
    min(d.selling_price)::bigint AS price,
    max(d.selling_price)::bigint AS price_max,
    false AS always_in_stock,
    (count(*) FILTER (WHERE d.status = 'listed' AND l.slug = 'vejle'))::int AS qty_vejle,
    (count(*) FILTER (WHERE d.status = 'listed' AND l.slug = 'slagelse'))::int AS qty_slagelse,
    (count(*) FILTER (WHERE d.status = 'listed' AND l.slug = 'webshop'))::int AS qty_webshop,
    NULL::int AS min_vejle, NULL::int AS min_slagelse, NULL::int AS min_webshop,
    (count(*) FILTER (WHERE d.status = 'in_transit'))::int AS in_transit,
    lower(concat_ws(' ', t.display_name, d.storage, public.transfer_grade_label(d.grade),
                    string_agg(DISTINCT concat_ws(' ', d.imei, d.barcode, d.serial_number), ' '))) AS search_text
  FROM public.devices d
  JOIN public.product_templates t ON t.id = d.template_id
  JOIN public.locations l ON l.id = d.location_id
  WHERE d.status IN ('listed', 'reserved', 'in_transit') AND d.source IS DISTINCT FROM 'foxway'
  GROUP BY d.template_id, d.storage, d.grade, t.display_name
)
SELECT * FROM sku_rows
UNION ALL
SELECT * FROM device_rows;

REVOKE ALL ON public.stock_overview FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.stock_overview TO service_role;

COMMIT;

-- Verifikation:
--   SELECT kind, count(*) FROM stock_overview GROUP BY 1;            -- sku + device
--   SELECT name, qty_vejle, qty_slagelse, qty_webshop FROM stock_overview WHERE kind = 'device' LIMIT 5;
