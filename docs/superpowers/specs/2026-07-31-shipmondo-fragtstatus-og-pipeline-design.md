# Shipmondo: fragtstatus og opkøbs-pipeline — design

**Dato:** 2026-07-31
**Status:** Godkendt, klar til implementering
**Dækker:** Fase 1 (fundament) og fase 2 (indgående opkøb). Fase 3 (udgående
webshop-fragt) er beskrevet til sidst, men ligger uden for denne spec.

## Formål

Man kan i dag ikke se hvor en indbyttet telefon er. Efter kunden accepterer et
tilbud, står henvendelsen som "accepteret" indtil nogen opretter en slutseddel —
og den ene tilstand dækker over alt fra "label ikke sendt endnu" til "pakken har
ligget uåbnet i baglokalet i en uge". Der skal være et spor fra tilbud til
udbetaling, og fragtstatus skal komme fra Shipmondo i stedet for at blive gættet.

## Nuværende tilstand — tre fejl der hver især er nok til at stoppe det

1. **Nøglerne findes ikke i produktion.** `SHIPMONDO_API_USER` og
   `SHIPMONDO_API_KEY` står kun i den lokale `.env.local`, ikke i Vercel.
   `getHeaders()` (`src/lib/shipmondo/client.ts:12`) kaster før første kald, så
   hver eneste labelgenerering i drift er fejlet siden funktionen blev bygget.

2. **Produktkoderne findes ikke på kontoen.** Verificeret mod
   `/products` og `/carriers` med de nye nøgler:

   | Bruges i koden | Findes? | Skal være |
   |---|---|---|
   | `carrier_code: "postnord"` | nej | `pdk` |
   | `PDK17` (dør) | nej | `PDK_MH` |
   | `PDK19` (pakkeshop) | nej | `PDK_MC` |
   | `PDKEP` (opkøbsreturlabel) | nej | `PDK_MC` |
   | `GLSDK_HD` (GLS dør) | nej | udgår — kontoen har kun `GLSDK_SD` |
   | `DAO_DIRECT` | nej | udgår — ingen DAO-produkter på kontoen |

   Kontoens tilgængelige danske produkter er `PDK_MH`, `PDK_MC`, `PDK_BPE` og
   `GLSDK_SD`.

3. **Status opdateres aldrig.** `shipping_labels.status` sættes til
   `label_created` ved oprettelsen og røres ikke igen. Der findes hverken
   webhook eller polling. `daysInTransit` i den daglige digest tæller dage siden
   accepten, ikke reelle fragtdata.

## Fase 1 — fundamentet

### 1.1 Nøgler

De nye nøgler (API-adgang "Phonespot Admin" under Phonego Aps) lægges i Vercel
for production, preview og development, og `.env.local` opdateres til samme par.

### 1.2 Produktkoder ét sted

`src/lib/shipmondo/carriers.ts` bliver den eneste kilde til carrier- og
produktkoder, med koderne rettet til kontoens faktiske. DAO- og GLS-dør-valgene
fjernes fra checkout, fordi de ikke kan bookes.

En vitest holder koderne ærlige: hver kode i tabellen skal matche mønsteret for
et Shipmondo-produkt, og de fjernede koder må ikke snige sig tilbage.

### 1.3 Statuslagring

Migration `20260731_shipment_tracking.sql`:

```sql
ALTER TABLE shipping_labels
  ADD COLUMN IF NOT EXISTS in_transit_at  timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at   timestamptz,
  ADD COLUMN IF NOT EXISTS last_event_at  timestamptz,
  ADD COLUMN IF NOT EXISTS carrier_status text;

ALTER TABLE trade_in_offers
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_by text;
```

`carrier_status` gemmer Shipmondos egen tekst ubearbejdet, så en ukendt status
kan aflæses bagefter i stedet for at forsvinde i vores egen forsimpling.

`received_at` ligger på **tilbuddet**, ikke på labelen: en enhed kan også
afleveres i butikken uden nogensinde at have haft en label.

### 1.4 Webhook

Shipmondo leverer webhook-payloads som **JWT signeret med en nøgle vi selv
vælger** ved oprettelsen (`POST /webhooks` kræver `name`, `endpoint`, `key`,
`action`, `resource_name`). Det er verifikationen — ingen hjemmelavet
header-hemmelighed.

- Nyt endpoint: `POST /api/webhooks/shipmondo`
- Ny env: `SHIPMONDO_WEBHOOK_KEY`
- Abonnement: `resource_name: "Shipment Monitor"` med `action: "latest"` (hver
  fragthændelse, som er den der giver "på vej") og `action: "delivered"`,
  oprettet programmatisk via et script i `scripts/`.

  OpenAPI-enum'et for `action` lister mange flere værdier, men de tilhører de
  andre ressourcer: `status_update` og `create` svarer begge 422 "Action is
  missing for webhook" på Shipment Monitor. Kun de to ovenfor virker.

  Webhooks kræver en betalt plan. Registreret på kontoen 2026-07-31 som id 3962
  (`latest`) og 3961 (`delivered`).

Verifikationen er HS256 med `node:crypto` — ingen ny afhængighed. Signaturen
sammenlignes med `timingSafeEqual`, samme mønster som Shopify-webhooken
(`src/app/api/webhooks/shopify/route.ts:10`).

Handleren er bevidst defensiv: **Shipment Monitor-payloaden står ikke i
OpenAPI-specen**, så den gemmer råpayloaden, mapper de felter den genkender
(`pkg_no` mod `tracking_number`), og logger en ukendt status som en
buyback-hændelse frem for at fejle. Ukendt status ændrer ingenting.

Ukendt pakkenummer giver `200`, ikke `404` — en webhook der får fejl bliver
prøvet igen i det uendelige, og vi sender også pakker der ikke er opkøb.

### 1.5 Fastlåste forsendelser i den daglige rapport

**Der findes ingen REST-endpoint til fragtstatus.** Verificeret mod
OpenAPI-specen: der er ingen path med "monitor", "track" eller "status", og
`delivery_details` på et shipment er *ønsket* leveringstidspunkt, ikke faktisk
status. Shipment Monitor findes udelukkende som webhook.

Derfor kan en manglende webhook ikke repareres ved at spørge igen. I stedet
gøres tavsheden synlig: den daglige `buyback-digest` (kl. 07) får et afsnit med
forsendelser der ikke har haft et event i mere end tre dage, med tracking-nummer,
så et menneske kan slå den op hos PostNord. Det er ærligere end en oprydning der
ikke kan lade sig gøre, og det koster ingen ny cron.

Samme mekanik i den anden ende af forløbet: leveret men ikke modtaget (§2.2).

## Fase 2 — det indgående forløb

### 2.1 Ny tilstand: modtaget

"Modtaget" bliver en eksplicit handling i admin: **vi står med telefonen**. Den
sætter `received_at` og `received_by` på tilbuddet.

`deriveTradeInStatus` udvides. De eksisterende værdier beholder deres betydning,
så køen (`status === "ny"`) og admin-listerne kører uændret; de nye lægges ind
mellem `accepteret` og `modtaget`:

```
ny → tilbud_sendt → accepteret → afventer_forsendelse
   → paa_vej → leveret → modtaget → vurderet → betalt
```

- `afventer_forsendelse` — accepteret, label oprettet, intet fragtevent endnu
- `paa_vej` — `in_transit_at` sat
- `leveret` — `delivered_at` sat, men `received_at` er tom
- `modtaget` — `received_at` sat, eller en slutseddel findes (bagudkompatibelt:
  alle nuværende rækker med slutseddel læses fortsat som modtaget)
- `vurderet` — slutseddel `confirmed`
- `betalt` — slutseddel `paid` eller `completed`

Funktionen er ren og testdækket i forvejen (`derive-status.test.ts`), så
udvidelsen sker testfirst.

### 2.2 Pipeline i opkøbspanelet

Ind i `/admin/opkoeb`, ikke som en ny side — panelet blev bygget om til at være
overvågningsfladen, og en skærm mere ville splitte billedet.

Øverst en stribe med antal pr. tilstand. Under den de enheder der venter, med
kunde, enhed, dage i tilstanden og tracking-nummer.

Den ene visning der reelt fanger fejl: **leveret men ikke modtaget**. En pakke
PostNord har afleveret, som ingen har åbnet. Over to dage markeres den —
i dag ville den være usynlig.

### 2.3 Udbetalingsbatch

Digestens "skal betales"-liste findes allerede. Den får en skærm i panelet med
de samme rækker: sælger, beløb, reg- og kontonummer fra slutsedlen, og en knap
der markerer en slutseddel som betalt.

Stripe er fravalgt til udbetalingerne. Stripe flytter kun penge til en
**connected account**, og hver af dem skal igennem KYC før udbetaling
aktiveres — en privatperson der sælger én telefon skulle altså onboardes med
legitimation. Dertil kommer at pengene ved et opkøb stammer fra vores egen
bankkonto og ikke fra en kortbetaling, så Stripe ville skulle fyldes op først og
dermed lægge KYC og gebyrer oven i en bankoverførsel den ikke fjerner.
Bankoverførsel bliver stående; gevinsten ligger i listen og afstemningen.

## Test / verifikation

- `carriers.test.ts` — koderne matcher kontoens produkter; DAO og `GLSDK_HD` er
  væk; ingen kode indeholder de gamle `PDK17`/`PDK19`/`PDKEP`.
- `shipmondo-webhook.test.ts` — gyldig JWT accepteres; forkert signatur afvises;
  ukendt pakkenummer giver 200 uden at ændre noget; ukendt status ændrer intet.
- `derive-status.test.ts` udvides med de nye tilstande, inklusive at en gammel
  række med slutseddel og uden `received_at` fortsat læses som modtaget.
- Manuelt: opret en rigtig label på opkøb, bekræft at den trækkes fra saldoen og
  at webhooken lander med en status.

## Fase 3 — udgående webshop-fragt (uden for scope)

Aftalt, men bygges særskilt: kundens fragtpris er **fast**, ikke realtid.
Pakkeshop 0 kr, dør 39 kr, og den eksisterende grænse på 500 kr for fri fragt
består — så telefoner sendes gratis til døren som nu, og de 39 kr rammer kun
tilbehør og reservedele. Realtid gælder **hvilke pakkeshops** der findes i
nærheden, ikke prisen. Shipmondos pris er vores omkostning, ikke kundens pris,
hvilket holder Stripe-beløbet forudsigeligt.
