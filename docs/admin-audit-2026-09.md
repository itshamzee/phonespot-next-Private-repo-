# Admin-audit, september 2026

Gennemgang af alle 54 sider under `src/app/(admin)/admin/` på `main` (0d321e0, 16. september 2026). Formål: finde dobbeltarbejde, døde sider og manglende overblik, og foreslå en ny informationsarkitektur. Ingen kode er ændret i denne audit.

## 1. Konklusion i fem punkter

1. **Sidebaren har 28 punkter i 4 grupper, og 9 sider er slet ikke i menuen.** Grupperne "Fysisk butik", "Værktøj", "Reservedele" og "Platform" afspejler hvornår tingene blev bygget, ikke hvordan personalet arbejder. To punkter hedder "Kategorier". Skjulte sider: platform-forsiden, abandoned-checkouts, rabatkoder, sku, products/upgrades, foxway-import, indstillinger/profil, indstillinger/virksomhed, seo/guide, spot, tilfoej-cover.
2. **Samme opgave er bygget to til fire gange.** Tilbehør findes på tre sider mod tre forskellige datamodeller (Shopify, gammel `accessories`-tabel, `sku_products`). Indlevering findes tre steder. Dashboard to steder. Overførsel af enhed to steder. Bulk-redigering tre steder. Opret/rediger reservedel er to næsten identiske formularer på 1.500 og 1.700 linjer.
3. **De fleste lister henter hele tabeller til browseren.** Kun ordrer, lager (enheder), reservedele og aktivitetslog paginerer server-side. Kunder, reparationer, henvendelser, opkøb, sms-log, mail-log, venteliste, tilbehør, produkter og SKU henter alt og filtrerer i browseren. Det er derfor admin føles langsom, og det bliver værre for hver måned.
4. **Butik (Vejle/Slagelse) er tilfældig.** Korrekt på reparationer, opkøb, henvendelser, reservedele og POS. Fraværende på ordrer (kun som filter), kunder, sms-log, venteliste, prisliste. Forkert på tilbehør, hvor "Vejle" viser online-lager. Butikskonfiguration ligger tre steder: `lib/store-config`, `lib/stores` og `locations`-tabellen, og slutseddel matcher dem på bynavn.
5. **Der er intet "hvad skal jeg gøre i dag".** Forsiden er statistik. Betalte ordrer med lagerfejl (nyt siden 16. september) vises ingen steder. Venteliste kan ikke afsluttes. Ingen global søgning på IMEI/serienummer eller ordrenummer på tværs.

## 2. Fund pr. side

Format: sti — hvad den gør · datakilde · paginering · genbrug · problem.

### Forside og navigation
- `layout.tsx` — sidebar, login-gate, badges for nye ordrer/sager/henvendelser/opkøb · 4 count-queries pr. sidevisning · — · GlobalSearch, NewOrdersWatcher · ingen butiksvælger; "Platform"-gruppen blander ruter; `startsWith`-aktivmarkering rammer flere punkter.
- `/admin` — to faner: Butik (EcommerceDashboard) og Reparation (statistik + 8 seneste sager + genveje) · `repair_tickets` hele tabellen · nej · dashboard-tiles · reparationsfanen dublerer /reparationer; genvejene dublerer sidebaren.
- `/admin/platform` — KPI-dashboard med periodevælger · `/api/dashboard` (aggregeret server-side) · ok · dashboard-tiles · ikke i menuen; konkurrerer med /admin.

### Ordrer og salg
- `/platform/orders` (+ `[id]`, faktura, pakkeliste) — ordreliste med statusfaner, søgning, kanal/dato/lokation-filter, CSV, bulk-slet; detalje med status, fulfillment, Foxway, garantier · `orders` + joins · **ja, 25/side** · order-list, order-detail, badges · SSR henter side 1 og klienten henter den igen; faktura/pakkeliste taler direkte med Supabase med ét opslag pr. linje; **betalt+pending (lagerfejl) har hverken badge, filter eller tæller**; butik kun som filter, ikke kolonne.
- `/platform/abandoned-checkouts` — forladte kurve, send påmindelse, kopier link · `/api/shipping/orders?status=abandoned` · nej, hårdt loft på 100 · abandoned-checkout-list · ikke i menuen; wrapper laver samme kald to gange.
- `/platform/draft-orders` (+ `[id]`, new) — fakturakladder, send, markér betalt, konvertér · `draft_orders` → `orders` · nej · draft-order-list/form · samme dokument vises også på ordrelisten som kanal "Kladde" med anden statusmodel; ingen butik.
- `/platform/pos` (+ cashup) — kasseterminal (Stripe Terminal, kontant, MobilePay), dagsopgørelse · `/api/pos/*` · n/a · ingen (951 + 259 linjer egen kode) · cashup mangler optælling/difference; rå escape-tegn i tekst.
- `/platform/rabatkoder` — liste + opret, aktiv/inaktiv · `/api/discount-codes` + direkte `update` fra browseren · nej · ingen · ikke i menuen; ingen redigering/sletning; ingen kobling til ordrer.
- `/reservationer` — reservationer af enheder/tilbehør, afhentet/annulleret, auto-refresh · `/api/admin/reservations` (gammel `accessories`-tabel) · nej · ingen · butik som rå tekst, intet butiksfilter selvom API'et kan.
- `/venteliste` — notify-me-liste, efterspørgsel pr. produkt · `notify_requests` hele tabellen · nej · ingen · ingen handling til "kontaktet/afsluttet"; ingen butik.

### Produkter og lager
- `/platform/products` (+ upgrades) — faner Enheder/Tilbehør/Reservedele, RAM/SSD-tilvalg · `/api/platform/templates`, `/sku` uden limit · **nej** · product-template-list/form, sku-product-list/form · Tilbehørsfanen = hele /platform/sku-siden; Reservedele-fanen er et "flyttet"-banner; ubrugt import.
- `/platform/sku` — tilbehør og reservedele med lager pr. lokation, inline-redigering · hele `sku_products` + ét kald pr. lokation · **nej, værste tilfælde** · sku-stock-table, sku-product-form · ikke i menuen; banner om at reservedele er flyttet; æøå-fejl.
- `/platform/stock` (+ `[deviceId]`) — enhedslager: værdi, lavt lager, filtre, pris, label, bulk, overfør, slet · `/api/platform/devices` m.fl. · **ja** (25/50/100, loft 1000) · stock-table, stock-filters, valuation-summary, device-transfer-dialog · lager er splittet på tre sider (enheder her, SKU på /sku, reservedele på /reservedele); butik vises rigtigt.
- `/platform/intake` — hurtig-indlevering af enhed til salg, kan oprette skabelon inline · `/api/platform/devices/quick-add` · n/a · **ingen** (997 linjer, bruger ikke device-intake-form, grade-picker, template-select, photo-uploader) · N sekventielle POST'er ved antal > 1; leverandør/IMEI mangler; tredje indleveringsflow.
- `/platform/transfers` — flyt én enhed, historik · `/api/platform/transfers` seneste 100 · nej · ingen (dublerer device-transfer-dialog) · ingen batch, ingen filtre, rå escape-tegn.
- `/platform/kategorier` — kategoritræ for enheder/tilbehør/reservedele · `categories` · ok · ingen · reservedele-fanen peger på tabeller der nu styres under /reservedele; kan ikke omsortere.
- `/tilbehoer` — tilbehørskatalog med filtre, inline-redigering, slet · **gammel `accessories`-tabel** · nej · ingen · **læser en anden tabel end opret-siden skriver til**; lokationsfilter mapper "Vejle" til online-lager.
- `/tilbehoer/opret` — bulk-opret tilbehør med navnemønster, EAN, scanner, billeder · skriver til `sku_products` + `sku_stock` · n/a · ingen · vælger vilkårligt én butik som lager; nyoprettet vises ikke på listen ovenfor.
- `/tilfoej-cover` — gammel opret-cover mod **Shopify Admin API** med AI-baggrundsfjernelse · Shopify · n/a · ingen · **ulinket og forældet**; bør slettes.
- `/spot` (+ bulk-edit, opret) — beskyttelsesglas: oversigt, regneark, opret variantgruppe · `sku_products` (spot-glass) · nej · egen bulk-editor (tredje kopi) · ikke i menuen; afvigende design; er reelt én tilbehørskategori.
- `/reservedele` (+ `[id]`, opret, bulk-edit, kategorier, kvaliteter) — reservedelskatalog med lager pr. lokation, publish, kategorier og kvalitetsniveauer · `/api/admin/spare-parts` · **ja, 50/side** (men brand/lokation filtreres efter paginering) · ingen fælles · opret og rediger er to kopier på 1.500/1.700 linjer; bulk-edit henter alle sider i løkke og "Slet valgte" er en død knap; kategorier og kvaliteter er samme stillads to gange.
- `/foneday` — leverandørkatalog, link SKU, lager, mappings, sync · `/api/admin/foneday/*` · katalog ja, resten nej · ingen (fire egne tabeller) · sender hårdkodet nul-UUID som butik; hører hjemme under reservedele.
- `/foxway-import` — upload prisfil, preview, sync · `/api/admin/foxway/import` · n/a · foxway/import-preview · **ulinket**; hører hjemme under enheder/lager.

### Reparation
- `/reparationer` (+ `[id]`) — sagsliste med statusfaner, søgning, butiksfilter; detalje med status, tilbud, noter, log, SMS · `repair_tickets` m.fl. **direkte fra browseren** · **nej, hele tabellen** · StoreFilter, StoreBadge · god butikshåndtering, men ingen paginering; SMS logges to steder.
- `/indlevering` — 4-trins modtagelse af enhed til reparation med kvittering · `/api/intake` · n/a · pdf-preview-modal · bedste butikshåndtering i admin (husker valg); ét af tre indleveringsflows.
- `/prisliste` (+ brand, model) — reparationsprisliste: mærker, modeller, services med inline-redigering · `/api/admin/brands|models|services` · nej, modelsiden henter **alle services i basen** · ingen · kvalitetstier er fritekst her og en tabel under reservedele.

### Opkøb
- `/opkoeb` (+ `[id]`, slutseddel, ko, priser, indstillinger) — pipeline, kø, sagsdetalje (tilbud, IMEI, label, mails), slutseddel-PDF, prisliste fra regneark, automatik-indstillinger · `contact_inquiries` (source=saelg-enhed) + `trade_in_*` · nej, alt hentes og joines i JS · BuybackPipeline, BuybackFeed, StoreFilter m.fl. · statuslogik er kopieret mellem oversigt, kø og detalje; slutseddel matcher butik på bynavn; egen indstillingsø.

### Kunder og henvendelser
- `/kunder` (+ `[id]`) — kundeliste med søgning/type; profil med ordrer, sager, enheder, noter · `customers` **med alle enheder, hele tabellen** · **nej** · OrderStatusBadge · skalerer dårligst; læser ikke `?search=` som ordredetaljen sender; ingen butik.
- `/b2b` — godkend/afvis forhandlere, rabat, betingelser · `/api/admin/b2b` · nej · ingen · parallelt kundebegreb til /kunder.
- `/henvendelser` — indbakke: status, skabeloner, svar i tråd, AI-udkast · `contact_inquiries` hele tabellen · nej · StoreFilter, AiDraftCard, MailAgentPanel · samme tabel som opkøb, kun `source` adskiller; mail-agentens udkast bor her.
- `/mail-log`, `/sms-log` — logs med statistik og gensend · `mail_log`, `sms_log` hele tabellerne · nej · ingen · to næsten identiske sider; vokser ubegrænset; ingen butik.

### Indstillinger og andet
- `/indstillinger` (+ profil, virksomhed) — SMS-/mail-skabeloner, quick replies, API-status; profil til signatur; virksomhedsoplysninger · `/api/admin/templates|profile|settings/company` · ok · ingen · profil/virksomhed er ulinkede og bruger inline-styles; virksomhed antager **én** adresse; opkøb og Foneday har egne indstillingsøer.
- `/platform/aktivitetslog` — systemlog med filtre · `activity_log` · **ja** · ingen · hårdkodet handlingsliste; æøå-fejl; ingen butik.
- `/seo` (+ guide) — GSC-nøgletal, keywords, indholdsaudit; statisk guide · `seo_*` uden limit · nej · seo-komponenter · guide er dokumentation, ikke admin.

## 3. Forslag til ny struktur

Syv områder i sidebaren. Hvert område åbner på en "I dag"-side med det, der kræver handling, og har højst 5 underpunkter som faner øverst, ikke i sidebaren.

```
I dag                      (én forside: alt der kræver handling på tværs, pr. butik)

Ordrer
  Alle ordrer              (samler online, POS, kladder og forladte kurve som kanal-filter)
  Lagerfejl                (betalt men ikke bekræftet — ny, med afklar/refunder)
  Fakturakladder
  Forladte kurve
  Rabatkoder

Produkter
  Enheder                  (lager + registrér + overfør + Foxway-import som handlinger)
  Tilbehør                 (én liste mod sku_products; beskyttelsesglas er et filter, ikke en sektion)
  Reservedele              (+ Foneday som fane herunder)
  Kategorier og tilvalg    (enheds-, tilbehørs- og reservedelskategorier, kvaliteter, RAM/SSD)

Reparation
  Sager                    (pagineret, butiksfilter)
  Ny indlevering
  Prisliste
  Reservationer og venteliste

Opkøb
  Pipeline
  Kø
  Priser og automatik

Kunder
  Kunder                   (privat + erhverv i én liste med type-filter; B2B-godkendelse som fane)
  Henvendelser             (indbakke med mail-agentens udkast)

Butik
  Kasse (POS)
  Dagsopgørelse

Indstillinger
  Virksomhed og butikker   (to adresser, telefonnumre, åbningstider; én kilde til sandheden)
  Skabeloner               (SMS, mail, quick replies)
  Brugere og signaturer
  Integrationer            (Stripe/Shipmondo/Resend-status, SEO-værktøj, logs: mail, SMS, aktivitet)
```

Global søgning i topbaren: ordrenummer, kundenavn, e-mail, telefon, IMEI/serienummer, SKU, sagsnummer. Butiksvælger i topbaren (Alle / Vejle / Slagelse) som filtrerer "I dag" og alle lister.

### Hvad der slås sammen eller fjernes

| Nu | Bliver til |
|---|---|
| `/admin` + `/admin/platform` (to dashboards) | Én "I dag"-side med handlingsliste; statistik flyttes til en fane "Nøgletal" |
| `/tilbehoer` (gammel tabel) + `/platform/sku` + Tilbehør-fanen på `/platform/products` + `/spot` | Én tilbehørsliste mod `sku_products` med beskyttelsesglas som filter; opret som ét flow |
| `/tilfoej-cover` (Shopify) | Slettes |
| `/platform/intake` + `device-intake-form` + `/indlevering` | Ét "Registrér enhed"-flow til salg; `/indlevering` bevares som reparations-modtagelse |
| `/platform/transfers` + overførselsdialog | Én dialog, brugt fra enhedslisten, med batch |
| `reservedele/opret` + `reservedele/[id]` | Én formular-komponent |
| Tre bulk-editorer (reservedele, spot, platform) | Én fælles bulk-editor |
| `mail-log` + `sms-log` + `aktivitetslog` | Én "Logs"-side med kanal-faner under Indstillinger |
| `indstillinger` + `opkoeb/indstillinger` + Foneday-fanen Indstillinger + profil + virksomhed | Ét indstillingsområde |
| `reservedele/kategorier` + `reservedele/kvaliteter` + `platform/kategorier` + upgrades | Én "Kategorier og tilvalg"-side |
| `/foneday`, `/foxway-import` | Faner under Reservedele hhv. handling under Enheder |
| `/b2b` | Fane "Erhverv" under Kunder |
| `/seo/guide` | Flyttes til `docs/` |

### Fælles fundament (bygges først, bruges af alle lister)

1. `AdminTable`: kolonner, sortering, server-side paginering, filterbar, tom-tilstand, valg af rækker, bulk-bjælke, mobil-visning som kort under 640 px.
2. `AdminPage`: titel, faner, primær handling, breadcrumb tilbage til området.
3. `StoreContext`: butiksvalg i topbaren, gemt i localStorage, læst af alle lister og "I dag".
4. `useAdminQuery`: ét mønster for hentning med `page`, `limit`, `sort`, `filters`; ingen side må kalde Supabase direkte fra browseren.
5. Én butikskonfiguration: `locations`-tabellen er sandheden; `lib/store-config` og `lib/stores` læser derfra.

### Ting jeg ikke rører uden aftale

- Kundevendt site, checkout, Stripe, Shipmondo, webhooks.
- Tabeller og migrationer. Hvis "Lagerfejl"-fanen skal have en "afklaret"-markering, kræver det en kolonne; jeg foreslår at genbruge `stock_failure_code = NULL` som "afklaret" indtil videre.
- API-ruter under `src/app/api/**`. De lister der mangler paginering får den ved at udvide eksisterende ruter med `page`/`limit` bagudkompatibelt. Det er den ene API-ændring jeg beder om ok til.

## 4. Rækkefølge

1. **Fundament** (AdminTable, AdminPage, StoreContext, useAdminQuery) + ny sidebar med de 7 områder, hvor alle gamle sider stadig virker på deres gamle URL'er. Ingen funktion forsvinder.
2. **Ordrer**: "I dag"-side, lagerfejl-fane, butikskolonne, fjern dobbelt-hentning.
3. **Produkter**: én tilbehørsliste mod `sku_products`, ét registrér-flow, én bulk-editor, én reservedelsformular.
4. **Reparation, Opkøb, Kunder**: paginering, butiksfilter overalt, venteliste-handling, kunder læser `?search=`.
5. **Indstillinger**: samlet, to butiksadresser, logs.
6. **Oprydning**: slet `tilfoej-cover`, gamle `accessories`-læsninger, døde sider; redirects fra gamle URL'er.

Hvert trin er sin egen PR med skærmbilleder (desktop og 390 px) og en liste over "flyttet fra → til" til personalet.
