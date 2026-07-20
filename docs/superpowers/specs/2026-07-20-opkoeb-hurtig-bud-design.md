# Opkøb — hurtigere budgivning, afvisning og kø-tilstand

**Dato:** 2026-07-20
**Status:** Design godkendt, klar til implementeringsplan

## Formål

Gøre det hurtigere og lettere for admin at give priser på sælg-enhed-leads i
`/admin/opkoeb`. Tre konkrete forbedringer:

1. **Prisforslag** — et foreslået beløb er udfyldt på forhånd, så admin ikke skal
   regne prisen ud fra hukommelsen hver gang.
2. **Afvisning** — en "vi køber desværre ikke denne enhed"-funktion der sender en
   pæn dansk email til kunden med én klik.
3. **Kø-tilstand** — efter et bud eller en afvisning hopper man direkte til næste
   ubehandlede lead uden at gå tilbage til listen.

Alle fire flaskehalse admin nævnte adresseres: beslutte tallet (prisforslag),
taste/klikke (forudfyldt felt + tastatur), navigere mellem leads (kø), og læse
leaden (kompakt farvekodet oversigt).

## Afgrænsning (scope)

- **Én butik.** Ingen butiks-opdeling af kø eller priser. Kundens `preferredStore`
  (Vejle/Slagelse) vises stadig på hver lead som information, men der er ingen
  filtre eller separate pristabeller. Kan deles op senere hvis behovet opstår.
- Bygger oven på det eksisterende trade-in-system. Ændrer **ikke** den nuværende
  tilbuds-, accept- eller slutseddel-flow.
- Custom-modeller (kunde valgte "Min enhed findes ikke") og enheder uden for
  pristabellen falder tilbage til manuel indtastning — intet går i stykker.

## Eksisterende flow (kontekst)

- En "lead" er en `contact_inquiries`-række med `source = 'saelg-enhed'`.
  Enheds- og standdata ligger i `metadata`-JSON (`metadata.devices[]`, hver med
  `device` og `condition`).
- Én lead kan indeholde **flere enheder** (wizarden sender et `devices`-array),
  men et tilbud er ét samlet beløb (`trade_in_offers.offer_amount`, i øre).
- Status udledes af `deriveTradeInStatus()` i
  `src/lib/supabase/trade-in-types.ts` — der er ingen gemt status-kolonne for
  trade-in. `afvist` kan i dag kun nås hvis der allerede findes et tilbud.
- Admin-detaljeside: `src/app/(admin)/admin/opkoeb/[id]/page.tsx`. Tilbud sendes
  via `POST /api/trade-in/offers`.
- Der findes **ingen** admin-afvisning i dag. `/api/trade-in/reject` er
  kundevendt og token-gated bag et eksisterende tilbud.

## Datamodel

### `buyback_prices` (ny tabel)

Pristabellen admin selv vedligeholder. Én række per enhedsvariant.

| Kolonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `device_type` | text | Telefon / Tablet / Laptop / Smartwatch |
| `brand` | text | fx Apple, Samsung |
| `model` | text | fx iPhone 13 Pro Max |
| `storage` | text NULL | fx 256GB; NULL for enheder uden lager-valg |
| `ram` | text NULL | primært til laptops |
| `base_price` | integer | **øre**, matcher `trade_in_offers.offer_amount`. Prisen for en enhed i perfekt stand |
| `active` | boolean default true | |
| `note` | text NULL | intern |
| `updated_at` | timestamptz default now() | |

Unik constraint på `(device_type, brand, model, coalesce(storage,''), coalesce(ram,''))`.
Opslag er case-insensitivt og tolerant over for whitespace (matcher mod
wizardens gemte strenge).

### `buyback_deduction_settings` (ny tabel, én række)

Fradrags-procenterne, redigerbare uden deploy. Én global række (`id = 1`).
Gemmes som JSON eller som navngivne kolonner — implementeringsplanen vælger.
Startværdier:

| Standsvar (fra wizarden) | Fradrag |
|---|---|
| Skærm: Små ridser | −5% |
| Skærm: Revnet / Skærmfejl | −35% |
| Skærm: Virker ikke / Knækket | −45% |
| Bagside: Små ridser | −3% |
| Bagside: Revnet / Buler/ridser | −12% |
| Batteri: Okay (60-80%) | −5% |
| Batteri: Dårligt (<60%) | −12% |
| Batteri: Ved ikke | −5% |
| Hver afkrydset defekt del (`brokenParts`) | −8% |
| iCloud-låst = Ja | markér som "foreslå afvisning" (ingen pris) |

Fradrag lægges sammen additivt og trækkes fra `base_price`. Resultatet rundes til
nærmeste hele krone og gulv-sættes ved 0.

### `buyback_declines` (ny tabel)

Giver afvisninger deres eget hjem uden at tilføje buyback-kolonner til den delte
`contact_inquiries`-tabel.

| Kolonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `inquiry_id` | uuid FK → contact_inquiries | |
| `reason_code` | text | se årsagsliste |
| `note` | text NULL | fri tekst er ikke i scope for v1, men kolonnen reserveres |
| `email_sent` | boolean | om afvisnings-emailen faktisk blev sendt |
| `declined_at` | timestamptz default now() | |
| `declined_by` | text NULL | admin-identitet hvis tilgængelig |

**Årsagskoder** (styrer email-tekst): `ikke_koeb_stand` (stand for dårlig),
`vandskade`, `skaerm_knust`, `icloud_laast`, `for_gammel_model`,
`mangler_info`.

### Ændring til `deriveTradeInStatus()`

Ny gren, tjekkes **først**: hvis der findes en `buyback_declines`-række for
leaden → status `afvist`. Dette gør det muligt at afvise en lead uden noget
tilbud, og også efter et tilbud er sendt (så længe kunden ikke har accepteret).
Efter accept (`accepted`-offer eller kvittering findes) er afvisning låst i UI.

## Prisforslag

Beregnes i en ren funktion, fx `lib/buyback/suggest-price.ts`:

```
suggestPrice(device, condition, prices, settings) -> { amount, breakdown, matched }
```

- Slår `device` op i `buyback_prices`. Ved match: `base_price` minus summen af
  fradrag udledt af `condition`.
- Returnerer en **breakdown** til visning: fx
  `Base 3.000 − skærm revnet 35% − batteri okay 5% = 1.800`.
- Ved manglende match (custom-model eller ikke i tabel): `matched = false`,
  ingen amount → feltet står tomt.
- iCloud-låst: `suggestDecline = true` med foreslået årsag `icloud_laast`.

For en **multi-enheds-lead** er forslaget summen, med én breakdown-linje per
enhed. Da tilbuddet er ét beløb, er dette den eneste ærlige visning.

## Admin — pristabel

Rute: `/admin/opkoeb/priser`

- Sorterbar tabel med tilføj / rediger / slet per række.
- **CSV/paste-boks**: admin indsætter rækker (`type, brand, model, storage, pris`)
  fra regneark for at fylde hurtigt. Pris i kroner i input, konverteres til øre.
- Fradrags-procenterne redigeres i én settings-sektion på samme side.

### Lær-efterhånden (populate fra bud)

Når admin håndprissætter en enhed der ikke er i tabellen, vises knappen
**"Gem som basispris"**. Den skriver det beløb (baglæns-justeret? nej — se note)
til `buyback_prices` for den model.

> Note: knappen gemmer det **indtastede beløb som base_price for den matchede
> stand**. For at undgå at gemme en allerede-nedskrevet pris som "perfekt"-pris,
> gemmer v1 beløbet som base_price **kun når enheden er i perfekt/topstand**;
> ellers gemmes en opjusteret base ud fra de kendte fradrag (`beløb ÷
> (1 − samlet fradrag)`). Implementeringsplanen bekræfter formlen.

## Afvisning + email

- På både detaljesiden og i kø-tilstand: knap **"Afvis lead"** → vælg årsag fra
  listen → dansk email sendes straks til kunden.
- Ny template `src/lib/email/decline-email.ts`, stylet som `offer-email.ts`.
  Ingen token (der er intet for kunden at klikke — det er terminalt). Én
  email-variant per årsagskode, alle på dansk, i PhoneSpot-tone (ingen emojis).
- Ny route `POST /api/trade-in/decline` (admin-vendt): opretter
  `buyback_declines`-række, sender email via Resend, logger til `mail_log`,
  sætter `contact_inquiries.status = 'lukket'`, logger `inquiry_messages`.
- **Kendt risiko:** emailen sendes fra samme Resend-opsætning og arver derfor
  ordre@/info@-suppression-problemet hvis det stadig er uløst (se
  `reference_resend_suppressions`). Afsender bør være en ikke-suppresset adresse.

## Kø-tilstand

Rute: `/admin/opkoeb/ko`, åbnes fra en **"Behandl kø"**-knap på listen.

- Loader de ubehandlede leads (status udledt `ny`) én gang, viser én ad gangen.
- **Kompakt oversigt** øverst: enhed + stand som farvekodede chips i stedet for de
  spredte kort på nuværende detaljeside. Butiksnavn (`preferredStore`) vises som
  info.
- **Prisforslag forudfyldt** i beløbsfeltet med breakdown nedenunder.
- Tastaturdrevet:
  - `Enter` → send tilbud med det viste beløb (skriv over først hvis uenig).
  - `A` → afvis → årsagsliste → email sendes ved valg.
  - `Esc` → forlad kø til listen.
- Begge handlinger (bud/afvis) → næste lead loader straks.
- Ved tomt forslag (ingen match): felt tomt, admin taster manuelt, "Gem som
  basispris"-knap tilgængelig.

## Byggerækkefølge

Hvert trin er nyttigt alene:

1. **Pristabel + fradrag** — tabeller, migration, `/admin/opkoeb/priser`,
   CSV-import, `suggestPrice()`-funktion + tests.
2. **Forslag på eksisterende detaljeside** — forudfyld beløb + breakdown + "Gem
   som basispris".
3. **Afvisning** — `buyback_declines`, `decline-email.ts`, `/api/trade-in/decline`,
   knap på detaljeside, `deriveTradeInStatus()`-gren.
4. **Kø-tilstand** — `/admin/opkoeb/ko` som skal omkring de tre foregående.

## Test

- `suggestPrice()`: enhedstests for match, ingen-match, hver fradragstype,
  multi-enhed-sum, iCloud-afvisnings-flag, gulv ved 0.
- CSV-parsing: gyldige/ugyldige rækker, kr→øre-konvertering.
- `deriveTradeInStatus()`: afvist-gren før og efter tilbud; låst efter accept.
- Decline-route: opretter række, logger mail, sætter status.
- Kø-navigation: bud/afvis avancerer, Esc forlader, tom kø-tilstand.

## Åbne beslutninger (defaults valgt)

- Fradrags-procenter er startgæt, redigerbare i admin. Justeres efter praksis.
- Afvisning tilladt når som helst før accept (inkl. efter tilbud). Låst efter
  accept.
- "Gem som basispris"-formel bekræftes i implementeringsplanen.
