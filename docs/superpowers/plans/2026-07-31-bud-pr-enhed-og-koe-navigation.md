# Bud pr. enhed og kø-navigation — implementeringsplan

Spec: `docs/superpowers/specs/2026-07-31-bud-pr-enhed-og-koe-navigation-design.md`

Rækkefølgen er valgt så hvert trin kan verificeres for sig: datamodel og ren
logik først, så serveren, så mailen, og til sidst UI'et der bruger det hele.

## Trin 1 — Migration

`supabase/migrations/20260731_offer_lines.sql`

```sql
ALTER TABLE trade_in_offers
  ADD COLUMN IF NOT EXISTS offer_lines jsonb;
```

Ingen backfill. `null` betyder "tilbud fra før linjerne fandtes" og renderes som
et enkelt beløb.

Typen i `src/lib/supabase/trade-in-types.ts` (`TradeInOffer`) udvides med
`offer_lines: OfferLine[] | null`.

## Trin 2 — `src/lib/buyback/offer-lines.ts` + tests

Rent modul, ingen I/O. Eksporterer `OfferLine`, `buildOfferLines`,
`singleLine`, `readOfferLines` som beskrevet i spec §2.

Tests i `src/lib/buyback/__tests__/offer-lines.test.ts` — dæk hele listen fra
spec'ens testafsnit. Skriv testene først; de definerer valideringsreglerne.

Verifikation: `npx vitest run src/lib/buyback/__tests__/offer-lines.test.ts`

## Trin 3 — `POST /api/trade-in/offers`

- Tag `lines` fra body.
- Hent henvendelsen **før** insert (i dag hentes den først bagefter, i trin 3 af
  routen) — enhederne skal bruges til validering.
- Med `lines`: `buildOfferLines(devices, lines)`; ved fejl 400 med teksten.
  `offer_amount` sættes til den udregnede total.
- Uden `lines`: som i dag, plus `singleLine` når leadet har præcis én enhed.
- Skriv `offer_lines` med i insert.

Bemærk: udløbet af tidligere pending-tilbud skal blive stående **før** insert,
så en valideringsfejl ikke når at udløbe et gyldigt tilbud. Flyt derfor
valideringen op før det trin.

## Trin 4 — Tilbudsmailen

`src/lib/email/offer-email.ts`:

- `OfferEmailParams` får valgfrit `lines: { included, excluded }`.
- Ved flere medtagne enheder: linjetabel + total. Fravalgte enheder som afsnit
  under tabellen med `DECLINE_REASONS[].body`.
- Ved én enhed eller uden `lines`: nuværende layout uændret.
- `buildOfferEmailSubject` får en flere-enheders-variant.
- Alt kundetekst gennem `escapeHtml`.

`offers/route.ts` bygger `lines`-argumentet ud fra de gemte `offer_lines`.

Udvid `__tests__/email-escaping.test.ts` med linjetabellen.

## Trin 5 — Køen

`src/app/(admin)/admin/opkoeb/ko/page.tsx`. Den er 474 linjer i forvejen og
vokser her, så del den op undervejs:

- `src/components/admin/buyback/LeadCard.tsx` — ét lead, nu uden egen
  kladdestate (den kommer ind som props).
- `src/components/admin/buyback/DeviceLines.tsx` — rækkerne pr. enhed.
- `ko/page.tsx` — indlæsning, kladder, navigation, tastatur.

Kladdetype på kø-niveau, nøglet på inquiry-id:

```ts
interface LeadDraft {
  lines: { amountKr: string; excluded: boolean; reasonCode: DeclineReasonCode | null }[];
  suggestion: SuggestionResponse | null;
  outcome: { kind: "offer"; amountKr: number } | { kind: "declined"; reasonLabel: string } | null;
}
```

`outcome !== null` giver read-only-kortet. Navigation: `Alt+←/→` og `‹ ›`.
Efter en handling: næste lead med `outcome === null`, søgt fremad og derefter
forfra. Tæller: `"{index+1} af {total} · {behandlet} behandlet"`.

Prisforslag hentes én gang pr. lead og gemmes i kladden, så et spring tilbage
ikke rammer API'et igen.

## Trin 6 — Slutseddel + auto-bud

- `opkoeb/[id]/slutseddel/page.tsx`: `readLeadDevices` i stedet for
  `metadata.device`; seed én vare pr. medtaget `offer_lines`-linje med prisen,
  ellers én pr. enhed uden pris.
- `src/lib/buyback/dispatch.ts`: `offer_lines: singleLine(leadDevices, amountOre)`
  på det automatiske bud.

## Trin 7 — Verifikation og udrulning

- `npx vitest run`
- `npm run lint`
- `npm run build`
- Kør `20260731_offer_lines.sql` mod Supabase.
- Commit og push submodulets `main`.
