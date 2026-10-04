# Ny sag: spec (godkendt af ejeren 2026-10-04)

Design: `docs/design/admin-2026-10/NySag.dc.html` (ejeren godkendte det). Grundlag: arkitekturanalyse og UX-research 2026-10-04.

## Ejerens beslutninger

- Kundetype vælges først: **Privat** eller **Erhverv**. Erhverv har CVR, firma, EAN, faktura-e-mail og kontaktperson.
- Enhed vælges som Mærke → Serie → Model → Reparation. Priser og reparationer kommer fra hjemmesidens katalog (`repair_brands`, `repair_models`, `repair_services`).
- Der er lager på reservedele pr. butik fra dag ét. **Alle reservedele starter som "altid på lager"** (`always_in_stock = true`), indtil ejeren taster lager ind. Første gang en del får et lagertal (varemodtagelse eller lagerregulering), sættes `always_in_stock = false` automatisk.
  - Ved "altid på lager" reserveres der ikke, og intet blokeres. UI'et viser "Ikke optalt".
  - Med lagerstyring vises "X på lager i Vejle · Y i Slagelse" og "0 → bestil".
- Tilkøb på sagen: enheder (refurb), tilbehør og produkter, solgt sammen med reparationen i kassen.
- Depositum som allerede bygget. Brugtmoms gælder brugt elektronik.
- Der skal kun være **én** måde at oprette en sag på. `/admin/indlevering` erstattes af `/admin/reparationer/ny`.

## Navne i databasen

- Reparationskvalitet: `standard` = Budget, `premium` = OEM, `original` = Original.
- Reservedelskvalitet: 7 trin i `spare_part_quality_tiers`. Kobles via tabellen `repair_part_tier_rules`:

  | Kategori | standard | premium | original |
  |---|---|---|---|
  | Skærm | `standard-incell` | `premium-soft-oled` | `service-pack` |
  | Batteri | `oem-equivalent` | `oem-equivalent` | `service-pack` |
  | Øvrige | `oem-equivalent` | `oem-equivalent` | `service-pack` |

- Kategorier har to ordsæt i dag, "Skærmskift"/"Batteriskift" og "Skaerm"/"Batteri" osv. De normaliseres til ét sæt, uden at hjemmesidens prisoversigter går i stykker (`src/lib/supabase/repairs.ts:150-151` læser "Skærmskift"/"Batteriskift").
- Serie: brug `repair_models.series`. Hvor den er tom, udfyldes den med en fast regel (funktionen `repair_series_for`), og en trigger sætter den på nye modeller.

## Skema (migrationer `20261005…`, transaktionelle og idempotente)

### B1 Katalog

- `repair_services.part_category_id` (FK `spare_part_categories`).
- `repair_services.part_mode` (`part`/`none`/`manual`). `none` bruges til diagnostik, software og vandskade.
- `repair_part_tier_rules` med startregler som i tabellen ovenfor.
- `repair_series_for()` + trigger + backfill af tomme serier.

### B2 Reservedele og lager

- Nye kolonner på `sku_products`:
  - `repair_model_id` (FK `repair_models`)
  - `repair_only` (skjules fra web, feed og kassens søgning)
  - `cost_source`, `cost_ref`, `cost_updated_at`
  - unikt index på (`repair_model_id`, `part_category_id`, `quality_tier_id`)
- `repair_service_parts` (`repair_service_id`, `sku_product_id`, `qty`, `is_primary`, `source`).
- `sku_stock.reserved_qty int default 0`.
- `stock_movements`: ny reason `repair` og kolonnen `ref_repair_ticket_id`.
- Funktionen `bootstrap_repair_parts(p_dry_run boolean) returns jsonb`. Den er sætbaseret og kan køres igen uden skade. Den laver:
  1. Kategori-mapping.
  2. Mapping af kvalitetstrin.
  3. Genbrug af eksisterende spare-part-varer via normaliseret model.
  4. Opretter manglende varer, én pr. model × kategori × kvalitetstrin:
     - `status = 'draft'`
     - `repair_only = true`
     - **`always_in_stock = true`**
     - `selling_price = 0`
  5. Lagerrækker med 0 i Vejle og Slagelse.
  6. Kostpris fra `foneday_catalog` (`price_dkk` er i **øre**), som `foneday_sku_link use_type = 'repair_part'`, `auto_sync_price = false`. Tjek først, at `src/lib/foneday/sync.ts` ikke overskriver salgsprisen.
  7. Udfylder `repair_service_parts`.
  8. Returnerer statistik.
- En trigger på `repair_services` kører bootstrap for en enkelt reparation.
- Eksisterende offentlige iPhone-dele kobles, men forbliver `always_in_stock = true` (ejerens beslutning).
- Trigger: når `sku_stock.quantity` sættes via `stock_receive_goods` eller `pos_adjust_stock` på en vare med `always_in_stock = true`, sættes den til `false`. Det sker kun via de to funktioner, ikke ved et vilkårligt UPDATE.

### B3 Sager og linjer

- Nye kolonner på `customers`: `ean` (13 cifre), `invoice_email`, `contact_person` og index på `cvr` (ikke unikt).
- Nye kolonner på `repair_tickets`:
  - `location_id` (backfill via `locations.slug = store_id` + trigger der holder dem synkrone)
  - `repair_model_id`
  - `billing_snapshot jsonb`
  - status `annulleret`. Find den eksisterende constraint dynamisk, og behold alle nuværende værdier.
- `repair_ticket_items`:
  - Kolonner:
    - `id`, `ticket_id`, `parent_item_id`
    - `kind` (`repair`/`part`/`device`/`product`/`free_text`)
    - `repair_service_id`, `sku_product_id`, `device_id`
    - `description`, `quality_label`, `qty`
    - `list_price_oere`, `unit_price_oere`, `price_reason`, `cost_oere`
    - `location_id`
    - `stock_status` (`none`/`planned`/`reserved`/`backorder`/`consumed`/`released`/`sold`)
    - `reserved_at`, `consumed_at`, `released_at`
    - `order_item_id`, `created_by`, `created_at`, `updated_at`
  - CHECK på kind og referencer.
  - RLS slået til uden policies.
- `devices.reservation_ticket_id`.
- RPC'er (`SECURITY DEFINER`, `search_path` sat, kun `service_role`, rækkelåse i fast rækkefølge):
  - `repair_case_create(jsonb)`: opret eller opdatér kunde, sag og linjer. Priser **altid** fra `repair_services`, og en afvigelse kræver `price_reason`. Reservation for dele med lagerstyring, `backorder` ved 0 og `none` for "altid på lager". Skriver statuslog og spejler `services` jsonb (`{id, name, price_dkk}`).
  - `repair_case_add_item`, `repair_case_remove_item` (frigiver delen), `repair_case_swap_part`.
  - `repair_consume_parts(ticket)` ved status `faerdig`. Idempotent. Trækker `quantity` og `reserved_qty`, skriver `stock_movement` med reason `repair` og gemmer et snapshot af `cost_oere`.
  - `repair_case_cancel` frigiver alt og sætter status `annulleret`.
- `pos_create_sale` udvides:
  - Linjer med `repair_ticket_item_id`: `product` sælges som `sku_product`-linje og trækker reserveret lager, `device` er tilladt når `reservation_ticket_id` matcher.
  - Linjen markeres `sold`.
  - Reparation og fritekst samles stadig i én `repair_service`-linje. Enheder lægges **aldrig** ind i den linje (brugtmoms).
  - Almindelige salg kræver `quantity - reserved_qty >= q`, undtagen ved `always_in_stock`.
- `complete_checkout_order` (webshop) og `transfer_send` skal tage højde for `reserved_qty`.

## API'er

- `GET /api/admin/repair-catalog/tree` returnerer brands (grupperet under forælder, se `PARENT_BRAND_MAP` i `src/app/reparation/brand-picker.tsx`; flyt konstanterne til en delt fil), serier og modeller med id, navn og billede.
- `GET /api/admin/repair-catalog/models/:id/services?location=` returnerer reparationer grupperet pr. kategori med `price_dkk`, `quality_tier`, `estimated_minutes`, `warranty_info` og `part`, hvor `part` har følgende felter:
  - `sku_product_id`
  - `tracked` (false = altid på lager)
  - `available`
  - `other_locations[{slug, available}]`
  - `in_transit`
  - `cost_oere` (kun manager og owner)
- `GET /api/admin/repair-catalog/models/:id/upsell?location=` returnerer tilbehør, der er kompatibelt med modellen (`compatible_models`), med lager.
- `GET /api/customers/search` (findes allerede) med `type`. `POST /api/customers` får de nye erhvervsfelter. CVR-opslag (cvrapi.dk, sigende user agent, cache på kunden) er valgfrit og bag en knap.
- `POST /api/admin/repairs` kalder `repair_case_create` og bruger headeren `Idempotency-Key`. Svaret indeholder `ticket_id`, `ticket_number`, linjer, backorders og `kasse_url`.
- `POST /api/admin/repairs/:id/items`, `DELETE …/items/:itemId`, `POST …/items/:itemId/swap-part`, `POST /api/admin/repairs/:id/cancel`.
- Statusruten kalder `repair_consume_parts` ved `faerdig`.
- `caseLines()` prioriterer `repair_ticket_items`, derefter `services`, derefter booking og til sidst tilbud. Kassens `/api/pos/case` returnerer linjerne.

## UI

- `/admin/reparationer/ny` følger designet. Én side med sektionerne:
  1. Kunde
  2. Enhed
  3. Reparation
  4. Tilkøb
  5. Detaljer (sammenfoldet)

  Panelet til højre er fast og viser kunde, enhed, linjer, total, besked om depositum når en del skal bestilles eller flyttes, afkrydsning for SMS og print, og knappen "Opret sag" (Ctrl+Enter).
- Når en sektion er udfyldt, foldes den sammen til en opsummering, der kan klikkes op igen.
- Fokus flytter videre af sig selv. Søgningen på tværs ("iph 15 pro") virker uden at klikke igennem.
- Standardværdier:
  - Privat.
  - Butik fra scope.
  - Lovet klar = nu + `estimated_minutes`, eller næste hverdag kl. 16 ved bestilling.
  - Ansvarlig = indlogget medarbejder.
  - Den billigste kvalitet, der er på lager, er forvalgt.
  - Tilstand = "ikke vurderet" med knappen "Alt som normalt".
- Efter oprettelse vises sagsnummeret stort sammen med knapperne Print, "Tag depositum" (når en del skal bestilles) og "Ny sag". Linket "Åbn sag" fører til sagen.
- Knappen "Ny sag" i Sagsstyring peger på den nye side, og `/admin/indlevering` videresender dertil.
- Sagssiden kan redigere linjer (tilføj, fjern, skift del) og viser lagerstatus pr. linje.
