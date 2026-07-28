# Opkøb — automatisk budgivning med fuld indsigt

**Dato:** 2026-07-28
**Status:** Design godkendt, klar til implementeringsplan
**Erstatter:** `2026-07-20-opkoeb-hurtig-bud-design.md` (kø-tilstand og afvisning er overtaget herfra; den manuelle pristabel er reduceret til fallback)

## Formål

Opkøb skal køre uden at kræve tid. Et lead prissættes automatisk i det øjeblik det
lander, og buddet sendes af sig selv — men intet sker lydløst, og alt kan overtages
manuelt inden det er ude af huset.

To krav styrer hele designet:

1. **Automatik.** Admin skal ikke regne priser ud eller sende bud i hverdagen.
2. **Ingen tavshed.** Hver eneste automatiske beslutning er synlig, og der findes
   altid et sted at gribe ind. Fejl råber; de forsvinder ikke i en log.

## Beslutninger

| Spørgsmål | Valg |
|---|---|
| Hvor autonomt? | Auto-send inden for en sikkerhedsramme; resten i manuel kø |
| Kundeoplevelse | Tilbud på email kort efter indsendelse. Wizarden viser ingen pris |
| Prisgrundlag | Juni-motoren (egen salgspris − Foneday-reservedele) primær, `buyback_prices` som fallback |
| Hold-vindue | 15 minutter, konfigurerbart |
| Besked-kanaler | Live-feed i admin + SMS ved det kritiske + daglig driftsmail. **Ingen** email per hændelse |

## Afgrænsning

- Bygger oven på det eksisterende trade-in-flow (tilbud → accept → slutseddel →
  forsendelse → betaling). Ændrer ikke accept-, slutseddel- eller Shipmondo-delen.
- Én butik. `preferredStore` vises som information; ingen butiksopdelte priser eller køer.
- Custom-modeller og enheder uden for katalog og pristabel går altid manuelt.
  Intet går i stykker; de lander bare hos admin.

---

## 1. Grundlag: prismotoren

`feat/buyback-pricing-engine` (11 commits, `src/lib/buyback/`) merges til `main`
**før** noget andet bygges. De fire blockers fra
`docs/superpowers/plans/2026-06-22-buyback-pricing-engine.md` lukkes som første
opgave — alle fire fører til for høje bud, og et for højt bud der sendes
automatisk er den dyreste fejl systemet kan lave:

1. **Verificér Foneday `category`-strenge.** ~~Gættet~~ — **udført 2026-07-28**
   mod 15.874 rigtige rækker. To fejl, begge værre end forventet:
   - `model_codes` indeholder **producentens varenumre** (`A2412`, `A2643`,
     `SM-A125`), ikke modelnavne. `contains(model_codes, ["iPhone 12"])` ramte
     nul rækker, så hver eneste fejl var uprissat og alt ville være endt manuelt.
     Modelnavnet ligger i `suitable_for` som kommasepareret liste. Opslaget
     matcher nu det, eksakt per segment — "iPhone 13" må ikke hente en
     "iPhone 13 Pro Max"-del til næsten dobbelt pris.
   - Substring-matchning mod `category + title` var alt for løs: `back_glass`
     ramte 4.714 rækker inkl. Display, Softcase, Camera Lens og tape. Da
     opslaget tager den billigste, blev et knust bagglas prissat til få kroner.
     Kategorier matches nu eksakt: Display, Back Cover, Battery, Charging Connector.
   - Kvalitetstrin strammet til Service Pack / Pulled A / Refurbished. Pulled B
     og C er billigere og ville have undervurderet fradraget.
2. **Uprissættelige defekte dele → `manual`.** Wizardens `brokenParts` rummer
   Kamera, Højtaler, Mikrofon, WiFi, Bluetooth, Knapper, Face ID, Tastatur,
   Trackpad, USB-porte — ingen af dem har en `FaultType`. I dag ignoreres de, så
   en telefon med dødt kamera prissættes som perfekt. Ny ren funktion
   `unpriceableBrokenParts(condition)`; findes der nogen → `manual`.
3. **`lookupBaseValueOre` bruger `.limit(1)` i stedet for `.maybeSingle()`.**
   To templates med samme `model`-streng giver PostgREST 406 og dermed et crash
   midt i prissætningen.
4. **`manualReason` vises ordret i admin.** `knownModel` betyder kun "modelfeltet
   var ikke tomt" — ikke "findes i vores katalog". Admin må ikke læse det som en
   garanti.

### Fallback-pristabel

`buyback_prices` (fra 20.-juli-specen) bygges uændret i skema, men bruges **kun**
når `lookupBaseValueOre` returnerer `null`. Fradragsprocenterne fra den spec
gælder tilsvarende kun for fallback-basisprisen. Motorens egne reservedelsfradrag
bruges når motoren har en basispris.

Rækkefølgen i `estimateBuyback` bliver:

```
basisværdi = egen salgspris (devices.selling_price → product_templates.base_price_a)
          ?? buyback_prices.base_price
          ?? null → manual
```

### Beløbet der sendes

Motoren returnerer `aimOfferOre` (40% margin) og `floorOfferOre` (30%).

- Der auto-sendes altid **`aimOfferOre`**, afrundet **ned til nærmeste 50 kr**, så
  tilbuddet ser skrevet ud og ikke maskinberegnet.
- `floorOfferOre` sendes aldrig ud. Den gemmes på tilbuddet, så når en kunde
  afviser, står der i admin: *"Kunde afviste 1.850 kr — du kan gå til 2.150 kr"*,
  og leadet hopper i den manuelle kø som modbud.

---

## 2. Auto-flow

Wizarden poster allerede til `POST /api/contact`, som er serverside. Hooket hænger
der — ingen ny klient-tillid, ingen cron.

```
POST /api/contact  (source = "saelg-enhed")
  → inquiry gemt
  → estimateBuyback()            → PricingResult
  → shouldAutoSend(result, lead, settings)
       nej  → buyback_events: "manual"   → lead i "Kræver din handling"
       ja   → trade_in_offers-række (status pending, auto_sent = true)
            → resend.emails.send({ scheduledAt: now + holdMinutes })
            → gem resend_email_id + scheduled_send_at
            → buyback_events: "scheduled"
```

Prissætningen må aldrig vælte kundens indsendelse. Hele blokken kører i
try/catch — fejler den, gemmes leadet stadig, der skrives en `error`-hændelse, og
leadet lander i manuel kø.

### Sikkerhedsrammen

`shouldAutoSend()` er en ren funktion. Alt skal være opfyldt:

| Betingelse | Begrundelse |
|---|---|
| `autoSendEnabled` er tændt | Global kill-switch |
| `result.status === "ok"` | Motoren kunne prissætte alt |
| `aimOfferOre ≤ autoSendMaxOre` (default 400.000 øre = 4.000 kr) | Store beløb ses af et menneske |
| Leadet har præcis **én** enhed | Et tilbud er ét beløb; multi-enheds-leads er for lette at ramme forkert |
| Systemet er ikke auto-pauset | Se §3 |

Falder et lead uden for rammen, er det ikke en fejl — det er et lead til køen,
med `manualReason` som overskrift.

### iCloud-låst

`cloudLocked === "Ja"` auto-afvises med `icloud_laast`-emailen. Det er den eneste
tilstand hvor svaret aldrig afhænger af en vurdering. Alle andre afvisningsårsager
vælges af admin.

Auto-afvisning kalder samme kodesti som den manuelle (§6) — den sætter blot
`declined_by = "system"` og skriver `auto_declined` i stedet for `declined`. Derfor
skal afvisning (byggetrin 5) stå færdig før auto-send (trin 6).

---

## 3. Hold-vindue og "tag over"

Resend v6.9.3 understøtter `scheduledAt`, `emails.update()` og `emails.cancel()`.
Det giver et rigtigt fortrydelsesvindue uden cron.

- Tilbudsemailen planlægges til **nu + 15 minutter** (`holdMinutes`, konfigurerbar;
  `0` = send straks).
- I hele vinduet står leadet i live-feedet som **"Sendes om 12 min"** med to knapper:
  - **Tag over** → `resend.emails.cancel(resend_email_id)`, tilbuddet markeres
    `cancelled`, leadet flyttes til manuel kø. Hændelse: `taken_over`.
  - **Send nu** → `resend.emails.update(id, { scheduledAt: now })`.
- Ændrer admin beløbet i vinduet: aflys + opret nyt tilbud med det nye beløb.
  Enklere end at opdatere HTML på en planlagt mail, og giver en ærlig historik.
- Efter afsendelse er "tag over" stadig muligt indtil kunden accepterer — via det
  eksisterende flow, hvor et nyt tilbud expirer det gamle.

Nye kolonner på `trade_in_offers`:

| Kolonne | Type | Note |
|---|---|---|
| `auto_sent` | boolean default false | Blev buddet regnet og sendt af systemet |
| `pricing_breakdown` | jsonb NULL | Hele `PricingResult`, inkl. `floorOfferOre` |
| `scheduled_send_at` | timestamptz NULL | Hvornår mailen går |
| `resend_email_id` | text NULL | Nøglen til cancel/update |
| `send_state` | text | `scheduled` / `sent` / `cancelled` / `failed` |

`pricing_breakdown` vises i admin som én læsbar linje:
*"Egen salgspris 3.000 − margin 1.200 − skærm (Foneday original) 330 = 1.470 → afrundet 1.450"*.
Admin skal aldrig gætte hvorfor tallet blev som det blev.

---

## 4. Ingen tavshed

### `buyback_events` (ny tabel, append-only)

Ét sted hvor alt hvad systemet gør står i rækkefølge.

| Kolonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `inquiry_id` | uuid FK → contact_inquiries NULL | NULL for systemhændelser (pause m.m.) |
| `offer_id` | uuid FK → trade_in_offers NULL | |
| `type` | text | se nedenfor |
| `severity` | text | `info` / `warn` / `critical` |
| `summary` | text | dansk étlinjes-tekst til feed, SMS og morgenmail |
| `detail` | jsonb NULL | breakdown, fejlbesked, webhook-payload |
| `created_at` | timestamptz default now() | |

**Typer:** `priced`, `scheduled`, `sent`, `cancelled`, `taken_over`, `manual`,
`auto_declined`, `declined`, `delivered`, `bounced`, `accepted`, `rejected`,
`paused`, `resumed`, `error`.

Tabellen er kilden til live-feedet, morgenmailen og SMS-udløsning. Én skrivning,
tre aftagere.

### Live-feed i admin

Øverst på `/admin/opkoeb`: en strøm af `buyback_events` nyeste først, opdateret
via Supabase realtime. Klokke med antal ulæste (`buyback_events.created_at` vs.
`feedLastSeenAt` i indstillingerne). Kritiske hændelser står øverst og forsvinder
ikke før de er kvitteret.

Alle indstillinger i dette dokument bor i den eksisterende `app_settings`-række
med `key = 'buyback'`, som `loadBuybackSettings()` allerede læser. Motorens
`BuybackSettings` udvides med automatikfelterne (`autoSendEnabled`,
`autoSendMaxOre`, `holdMinutes`, `smsAcceptThresholdOre`, `pausedReason`,
`feedLastSeenAt`, afsenderadresse, SMS-modtager). Ingen ny settings-tabel.

### SMS ved det kritiske

Via eksisterende `sendSms({ to, message })` (GatewayAPI). Kun `severity =
critical`, og hver type kan slås fra:

- Systemet har sat sig selv på pause, med årsag
- Tilbudsmail bouncede eller blev afvist af Resend
- Kunde accepterede et bud over `smsAcceptThresholdOre` (default 3.000 kr) —
  penge er på vej ud
- Kunde afviste et auto-bud (modbud muligt)
- Prissætningen kastede en fejl

SMS er altid ét ærinde: hvad skete der, hvilken kunde, og et kort link.

### Daglig driftsmail kl. 07:00

Ikke et referat — en arbejdsseddel for dagen. Sektioner, i den rækkefølge:

1. **Skal betales.** Slutsedler med status `confirmed`: sælgers navn, reg.nr,
   kontonr og beløb, klar til at taste i netbank. Med afkrydsning der sætter
   `paid`.
2. **Skal markeres modtaget.** Accepterede tilbud hvor der findes en forsendelse,
   men ingen slutseddel — inkl. Shipmondo-tracking og hvor længe de har været undervejs.
3. **Venter på dig.** Manuel kø: antal, ældste lead, og de tre største beløb.
4. **Kørte automatisk i går.** Sendt / accepteret / afvist, med acceptrate.
5. **Problemer.** Alle `warn` og `critical` siden sidste mail.

Sendes fra en verificeret afsender (se §7) til admin-adressen.
Cron-slot: `0 7 * * *`. Vercel-planen har allerede fire daglige crons; afviser den
en femte, kaldes digest-funktionen i stedet fra `/api/cron/foneday-sync`, som
alligevel kører kl. 06:00.

### Auto-pause

Systemet standser sig selv og sender SMS når:

- `foneday_catalog` ikke er synkroniseret i mere end 3 dage — reservedelspriser
  der er forældede giver forkerte fradrag
- En tilbudsmail bouncer
- Tre auto-bud i træk afvises af kunden inden for 24 timer — enten er marginen
  for grådig, eller også er en prisforudsætning skredet

Pause betyder: nye leads prissættes stadig og vises stadig, men intet sendes.
Kun admin kan genstarte, og genstart skrives som `resumed`-hændelse.

---

## 5. Admin-UI

Den nuværende `/admin/opkoeb` er en flad liste hvor alt kræver lige meget
opmærksomhed. Når 80% kører af sig selv, er det den forkerte form: det vigtige
drukner i det færdige.

### `/admin/opkoeb` — panel

- **Toplinje:** `Kræver dig: 3` · `Sendes nu: 1` · `Auto-sendt i dag: 11` ·
  `Acceptrate 7 dage: 62%` · kill-switch med tydelig tilstand
- **Sendes om lidt** — leads i hold-vinduet med nedtælling og
  *Tag over* / *Send nu*. Kun synlig når der er nogen.
- **Kræver din handling** — den manuelle kø, visuelt dominerende. Hver række
  viser `manualReason` som årsag, ikke bare "Ny". Knap: **Behandl kø**.
- **Aktivitet** — live-feedet.
- **Alt andet** — de eksisterende statusfaner, nu sekundære og sammenklappede.

### `/admin/opkoeb/ko` — kø-tilstand

Én lead ad gangen, tastaturdrevet:

- Kompakt farvekodet standsoversigt i stedet for spredte kort
- Forudfyldt beløb hvor motoren kunne regne, med breakdown under
- `Enter` sender · `A` afviser (årsagsliste) · `Esc` ud
- Efter handling loader næste ubehandlede lead straks
- Uden forslag: tomt felt + knappen **Gem som basispris** (skriver til
  `buyback_prices`; ved ikke-perfekt stand gemmes den opjusterede basis
  `beløb ÷ (1 − samlet fradrag)`)

### `/admin/opkoeb/indstillinger`

To faner:

- **Automatik** — kill-switch, beløbsloft, hold-vindue, marginer,
  cleaning-sandsynligheder, SMS-nummer og hvilke SMS-typer der er tændt,
  modtageradresse for morgenmailen
- **Basispriser** — fallback-tabellen med CSV-indsæt og fradragsprocenter

### Fejl der rettes undervejs

Både listen og `POST /api/trade-in/offers` læser `metadata.device` (ental), men
wizarden har sendt `metadata.devices[]` siden multi-enheds-opdateringen. Mærke og
model står derfor tomt på alle nyere leads, og tilbudsemailen skriver "enhed". En
lille normaliser (`readLeadDevices(metadata)`) læser begge former og bruges begge
steder.

---

## 6. Afvisning

Fra 20.-juli-specen, uændret:

- `buyback_declines` (`inquiry_id`, `reason_code`, `note`, `email_sent`,
  `declined_at`, `declined_by`)
- Årsagskoder: `ikke_koeb_stand`, `vandskade`, `skaerm_knust`, `icloud_laast`,
  `for_gammel_model`, `mangler_info`
- `src/lib/email/decline-email.ts` i samme stil som `offer-email.ts`. Én variant
  per årsag, dansk, PhoneSpot-tone, ingen emojis, intet link (afvisning er terminal)
- `POST /api/trade-in/decline` (admin-vendt): opretter rækken, sender mail, logger
  i `mail_log` og `inquiry_messages`, sætter `contact_inquiries.status = 'lukket'`,
  skriver `buyback_events`
- `deriveTradeInStatus()` får en ny gren der tjekkes **først**: findes der en
  `buyback_declines`-række → `afvist`. Så kan en lead afvises uden tilbud, og også
  efter et tilbud, men aldrig efter accept

---

## 7. Afsender-afhængighed

Tilbudsmails sendes i dag fra `info@phonespot.dk`. `info@` og `ordre@` blev
suppresset i Resend efter et hard bounce 17. april 2026. Er det stadig gældende,
forsvinder auto-buddene lydløst — præcis den fejl designet findes for at undgå.

Derfor:

- `autoSendEnabled` fødes **slået fra**, med teksten *"Verificér afsender først"*
  ved kontakten
- En preflight-knap i indstillingerne sender en testmail til admin og viser
  Resend-svaret råt
- `POST /api/webhooks/resend` modtager `email.delivered`, `email.bounced`,
  `email.complained` og skriver dem som `buyback_events`. Bounce → auto-pause + SMS
- Afsenderadressen flyttes til en indstilling, så den kan skiftes uden deploy

---

## 8. Byggerækkefølge

Hvert trin er nyttigt alene og kan tages i drift for sig.

1. **Motoren i hus.** Merge `feat/buyback-pricing-engine`, luk de fire blockers,
   tilføj `unpriceableBrokenParts()`. Ingen synlig ændring.
2. **Fallback + afrunding.** `buyback_prices`, fradragstabel, kæden i
   `estimateBuyback`, afrunding til 50 kr. Stadig ingen synlig ændring.
3. **Hændelseslog og feed.** `buyback_events`, live-feed på `/admin/opkoeb`,
   `readLeadDevices()`-fixet. Systemet begynder at fortælle, før det begynder at handle.
4. **Prisforslag i admin.** Forudfyldt beløb + breakdown på detaljesiden og i
   `/admin/opkoeb/ko`. Admin sender stadig selv, men skal ikke længere regne.
5. **Afvisning.** `buyback_declines`, `decline-email.ts`, route, status-gren.
6. **Auto-send.** `shouldAutoSend()`, hold-vindue, Resend-planlægning, tag over,
   kill-switch, webhook, auto-pause. Slås til manuelt efter afsender-preflight.
7. **SMS og morgenmail.** Alarmer og den daglige driftsmail.

## 9. Test

- `shouldAutoSend()`: hver betingelse for sig, loft-grænsen, multi-enhed, pause
- `unpriceableBrokenParts()`: hver del i wizardens lister, tom liste, ukendt streng
- Afrunding: 1.470 → 1.450, præcist 1.450 → 1.450, beløb under 50 kr
- Basisværdi-kæden: egen salgspris vinder over pristabel; pristabel når salgspris
  mangler; `null` → manual
- Hold-vindue: aflys inden afsendelse, send-nu, aflys efter afsendelse fejler pænt
- `deriveTradeInStatus()`: afvist-gren før og efter tilbud; låst efter accept
- Auto-pause: forældet katalog, bounce, tre afvisninger i træk
- Morgenmail: hver sektion med og uden indhold; ingen mail hvis alt er tomt
- Prissætning der kaster må ikke vælte `POST /api/contact`

## 10. Åbne beslutninger (defaults valgt)

- Beløbsloft 4.000 kr og SMS-tærskel 3.000 kr er startgæt, redigerbare i admin
- Hold-vindue 15 minutter
- Marginer 40% mål / 30% gulv arves fra motorens defaults og justeres efter
  acceptraten i morgenmailen
- Multi-enheds-leads auto-sendes ikke i v1. Tages op igen når acceptraten på
  enkelt-enheder er kendt
