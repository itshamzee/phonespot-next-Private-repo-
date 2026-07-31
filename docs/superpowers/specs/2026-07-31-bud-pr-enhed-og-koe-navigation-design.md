# Bud pr. enhed og kø-navigation — design

**Dato:** 2026-07-31
**Status:** Godkendt, klar til implementeringsplan

## Formål

Opkøbskøen (`/admin/opkoeb/ko`) kan i dag kun bevæge sig én vej, og et tilbud er
ét beløb for hele henvendelsen. To ting følger af det:

1. Et lead kan kun forlades ved at sende bud eller afvise. Vil man springe det
   over, må man forlade køen helt — og næste gang starter man forfra.
2. Har kunden indsendt flere enheder, kan man hverken prissætte dem hver for sig
   eller fravælge én af dem. Kunden får ét samlet tal uden at vide hvad hver
   enhed er værd.

## Nuværende tilstand

- **`src/app/(admin)/admin/opkoeb/ko/page.tsx`** indlæser alle leads med afledt
  status `ny` én gang og holder dem i en fast liste. `advance()` gør kun
  `index + 1`. `LeadCard` er nøglet på inquiry-id og remountes pr. lead, så al
  state (beløb, prisforslag, fejl) hører til det aktuelle lead alene.
- **`trade_in_offers`** har ét `offer_amount` (i øre). Automatikken har senere
  tilføjet `auto_sent`, `pricing_breakdown`, `scheduled_send_at`,
  `resend_email_id` og `send_state` (`20260728_trade_in_offers_auto.sql`).
- **`/api/trade-in/suggest`** regner allerede pr. enhed og returnerer
  `devices[]` med `label`, `explanation`, `manualReason` og `aimKr` — men køen
  bruger kun summen `totalAimKr`.
- **Tilbudsmailen** (`buildOfferEmailHtml`) er bygget til én enhed. Flere
  enheder markeres ved at skrive `"(+1 enhed)"` ind i modelnavnet
  (`src/app/api/trade-in/offers/route.ts:88`).
- **`shouldAutoSend`** afviser leads med `deviceCount !== 1`, så flere enheder
  altid havner i den manuelle kø.
- **Slutseddel-siden** autoudfylder fra `metadata.device` — den gamle flade
  metadata-form. Den nuværende wizard skriver `devices: []`, så feltet er tomt
  på alle nye leads.

## Valgt tilgang

Tilbuddet forbliver **én** række med **ét** samlet beløb som kunden accepterer
alt-eller-intet. Opdelingen pr. enhed er beskrivende: den bestemmer hvad der
står i mailen og på slutsedlen, men giver ikke kunden delvis accept.

Fravalgt: én offer-række pr. enhed med egne tokens. Det ville ramme
accept-flowet, slutsedlen og Shipmondo-labelen på én gang for at kunne håndtere
en halv handel, som i praksis alligevel skal forhandles.

## Ændringer

### 1. Datamodel — `offer_lines`

Ny migration: `offer_lines jsonb` (nullable) på `trade_in_offers`.

Én linje pr. enhed på henvendelsen, også de fravalgte:

```json
[
  { "index": 0, "label": "Apple iPhone 12 128GB", "amount_ore": 180000, "excluded": false, "reason_code": null },
  { "index": 1, "label": "Apple iPad Air 4",      "amount_ore": 0,      "excluded": true,  "reason_code": "icloud_laast" }
]
```

- `index` peger på pladsen i `readLeadDevices(inquiry.metadata)`.
- `label` fryses ved oprettelsen (`deviceLabel`), så mailen og slutsedlen kan
  gengives selvom metadata senere ændres.
- `offer_amount` er summen af `amount_ore` for linjer med `excluded: false`.
- Fravalgte linjer har altid `amount_ore: 0` og en `reason_code` fra
  `DECLINE_REASONS`.

Eksisterende rækker har `offer_lines = null` og renderes som i dag.
Enkelt-enheds-leads skriver også linjer, så mail, slutseddel og admin har én
kodesti.

**Fravalg skriver ikke i `buyback_declines`.** Den tabel driver
`deriveTradeInStatus`, så en delvis fravælgelse ville få hele leadet til at stå
som "afvist" selvom der er sendt et bud. Fravalg lever kun på tilbuddet.

### 2. Domænelogik — `src/lib/buyback/offer-lines.ts`

Ny, ren modul uden I/O:

```ts
export interface OfferLine {
  index: number;
  label: string;
  amount_ore: number;
  excluded: boolean;
  reason_code: DeclineReasonCode | null;
}

// Validerer klientens input mod leadets faktiske enheder.
// Returnerer enten linjer + total, eller en dansk fejl.
export function buildOfferLines(
  devices: LeadDevice[],
  input: unknown,
): { ok: true; lines: OfferLine[]; totalOre: number } | { ok: false; error: string };

// Enkelt-enheds-bud og gamle kald uden linjer.
export function singleLine(devices: LeadDevice[], amountOre: number): OfferLine[];

export function readOfferLines(value: unknown): OfferLine[] | null;
```

Regler håndhævet i `buildOfferLines`:

- Der skal være præcis én linje pr. enhed på leadet, med `index` 0..n-1.
- `amount_ore` skal være et heltal ≥ 0; medtagne linjer skal være > 0.
- Fravalgte linjer skal have en gyldig `reason_code`
  (`isDeclineReasonCode`) og sættes til `amount_ore: 0`.
- Mindst én linje skal være medtaget — er alle fravalgt, er det en afvisning,
  ikke et bud.
- Totalen udregnes her og på serveren; et beløb sendt fra klienten ignoreres.
  Ellers kan mailens total komme til at modsige sine egne linjer.

### 3. Offers-API

`POST /api/trade-in/offers` tager `lines` (valgfrit) ved siden af det
eksisterende `offer_amount`:

- Med `lines`: enhederne læses fra henvendelsen, `buildOfferLines` validerer, og
  `offer_amount` sættes til den udregnede total. Ugyldige linjer giver 400 med
  den danske fejltekst.
- Uden `lines`: uændret adfærd, men der skrives en enkelt linje via `singleLine`
  når leadet har præcis én enhed. Har det flere, gemmes `offer_lines = null`.

Rækkefølgen (udløb af tidligere pending-tilbud → insert → mail → `mail_log`)
er uændret.

### 4. Tilbudsmailen

`buildOfferEmailHtml` får et valgfrit `lines`-argument:

```ts
lines?: {
  included: { label: string; amountKr: string }[];
  excluded: { label: string; reasonBody: string }[];
}
```

- Med `lines` og mere end én enhed: en tabel med enhed → beløb, derefter
  totalen med visuel vægt. Fravalgte enheder står under tabellen med den
  kundevendte tekst fra `DECLINE_REASONS[].body`.
- Med én enhed eller uden `lines`: nuværende layout, uændret.
- Emnelinje ved flere enheder: `"Tilbud på dine 2 enheder — 2.700 kr"`.
  `buildOfferEmailSubject` får en variant der tager antal i stedet for model.
- Alle labels og årsagstekster escapes. `label` stammer fra kundens fritekst
  (`brandCustom`/`modelCustom`) og er ikke betroet.

### 5. Køen — bud pr. enhed

Ved **flere** enheder får hver enhed en række: navn, tilstands-chips (som i
dag), beløbsfelt og en "Ikke med"-knap. En fravalgt række folder ud til
årsagslisten (1-6) og skjuler beløbsfeltet. Nederst en totallinje der lægger
sammen løbende.

- Totalen kan ikke redigeres direkte. Vil man runde op, retter man en
  enhedslinje. Et samlet beløb der ikke stemmer med sine linjer kan ikke
  forklares til kunden.
- Prisforslaget udfylder hver linje fra `suggestion.devices[i].aimKr`. En enhed
  uden forslag starter tom og markeres gul med sin egen `manualReason`, i
  stedet for at trække hele leadet i manuel.
- Ved **én** enhed er skærmen uændret: ét beløbsfelt, ingen ekstra kasser.
- Ved **nul** enheder (manglende metadata) kan der kun afvises eller åbnes.
- Fravælges **alle** enheder, skifter den grønne knap til "Afvis henvendelsen"
  og kalder den eksisterende `/api/trade-in/decline` med den først valgte
  årsag — så et fravalg af det hele ikke ender som et bud på 0 kr.

### 6. Køen — navigation

`index` kan gå begge veje.

- **Alt+← / Alt+→** plus `‹ ›`-knapper i toppen. Ikke bare piletaster:
  beløbsfeltet er autofokuseret, og dér flytter pil kun markøren.
- Kladden løftes til kø-niveau, nøglet på inquiry-id: indtastede beløb, fravalg,
  årsager og det hentede prisforslag. I dag ejer `LeadCard` det hele og
  remountes pr. lead, så et spring frem og tilbage ville smide indtastningen og
  hente forslaget forfra.
- Behandlede leads bliver liggende på deres plads og vises read-only:
  "Bud sendt · 2.700 kr" eller "Afvist · iCloud-låst", med link til hele leadet.
  De kan ikke handles igen — en sendt mail kan ikke trækkes tilbage.
- Efter send eller afvisning hopper køen til næste **ubehandlede** lead, ikke
  bare `index + 1`. Er der ingen efter, søges der forfra. Er der ingen tilbage,
  vises den nuværende "Du er igennem køen"-skærm.
- Tælleren bliver `"3 af 12 · 8 behandlet"`.
- Kladder lever så længe kø-siden er monteret. Forlader man med Esc, er de væk.
  At gemme dem videre er uden for scope.

Genvejsoversigten i bunden opdateres: `Enter sender · A afviser · Alt+← → skifter lead · Esc ud`.

### 7. Slutsedlen

`src/app/(admin)/admin/opkoeb/[id]/slutseddel/page.tsx` autoudfylder i dag fra
`metadata.device` og rammer derfor ingenting på nye leads. Rettes til:

- Læs enhederne med `readLeadDevices`.
- Er der et accepteret tilbud med `offer_lines`: seed én vare pr. **medtaget**
  linje, med linjens `amount_ore` som `price`. Fravalgte enheder kommer ikke på
  slutsedlen.
- Ellers: seed én vare pr. enhed på leadet uden pris, som hidtil tænkt.

`trade_in_receipt_items` har allerede `brand`, `model`, `storage` og `price` pr.
stk. Tabellen ændres ikke.

### 8. Automatikken — uændret

`shouldAutoSend` afviser fortsat leads med flere enheder. At lade automatikken
selv fravælge en enhed er en vurdering, ikke en beregning, og hører til hos et
menneske. `dispatchAutoOffer` skriver `offer_lines` med sin ene linje via
`singleLine`, så dataformen er ens overalt.

## Test / verifikation

Vitest, i `src/lib/buyback/__tests__/offer-lines.test.ts`:

- Total er summen af medtagne linjer; fravalgte tæller ikke med.
- Et beløb sendt fra klienten ignoreres til fordel for summen.
- Fravalgt linje uden gyldig `reason_code` afvises.
- Medtaget linje med beløb 0 afvises.
- Alle linjer fravalgt afvises (det er en afvisning, ikke et bud).
- Forkert antal linjer eller dublet-`index` afvises.
- `readOfferLines` returnerer `null` på gammelt/ugyldigt indhold i stedet for at
  kaste.

I `email-escaping.test.ts` udvides med: enhedslabel med `<script>` i
`modelCustom` escapes i linjetabellen.

Manuelt: et lead med to enheder gennem køen → mail med to linjer og korrekt
total; ét fravalg → mailen nævner enheden med årsag; accept → slutsedlen har kun
den købte enhed med den rigtige pris.

## Uden for scope

- Delvis accept fra kundens side (én enhed ja, én nej).
- At gemme kø-kladder efter man har forladt siden.
- Automatiske bud på leads med flere enheder.
- Udsættelse/snooze af leads med tidsstempel.
