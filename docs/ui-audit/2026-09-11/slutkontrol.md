# Task 8 — samlet afsluttende rettelsesbølge

## Status

DONE. Alle 12 fund fra `final-review-report.md` er rettet i tre små kildekodecommits oven på `d8ecc4d`. Ingen API'er, payloads, tokens, statusser, prisalgoritmer, betalings-, fragt-, admin- eller migrationskode er ændret.

## Commits

- `47cf2a8 fix: ret bærbares produktruter`
- `374abbf fix: vis sikre fejlbeskeder`
- `61827e7 fix: finpuds kundevendte detaljer`

## TDD-evidens

### RED

Kommando:

```text
npx vitest run src/app/baerbare/__tests__/laptop-card-routes.test.tsx src/components/product/__tests__/device-detail-interactions.test.tsx src/components/sell-device/__tests__/sell-device-wizard.test.tsx src/components/sell-device/__tests__/offer-response.test.tsx src/app/kvalitet/__tests__/quality-faq.test.tsx --maxWorkers=2
```

Resultat før produktionsrettelser: exit 1; 5 testfiler, 28 tests i alt, 7 fejlede og 21 bestod. De forventede fejl var:

- begge laptop-skabelonkort havde `/baerbare/lenovo-thinkpad-t14-g1` i stedet for `/refurbished/lenovo-thinkpad-t14-g1`;
- DeviceDetail viste `Failed to fetch`;
- salgsguiden viste `Failed to fetch`;
- accept- og afvissiderne viste hver `Failed to fetch`;
- ArrowUp i et tomt søgeresultat satte `aria-activedescendant="brand-0-option-0"`;
- den skærpede kvalitets-FAQ-test bestod allerede og dokumenterede, at den aktuelle side opfylder den nu reelle kontrakt.

### GREEN

Samme 5-fils kommando efter minimal implementering: exit 0; 5/5 testfiler og 28/28 tests bestod.

Afsluttende fokuseret kommando efter selvreview:

```text
npx vitest run src/app/baerbare/__tests__/laptop-card-routes.test.tsx src/components/product/__tests__/device-detail-interactions.test.tsx src/components/sell-device/__tests__/sell-device-wizard.test.tsx src/components/sell-device/__tests__/offer-response.test.tsx src/app/kvalitet/__tests__/quality-faq.test.tsx src/components/repair/__tests__/booking-wizard.test.tsx src/components/product/__tests__/condition-explainer.test.tsx src/app/beskyttelsesglas/_components/__tests__/spot-picker.test.tsx --maxWorkers=2
```

Resultat: exit 0; 8/8 testfiler og 42/42 tests bestod. Output indeholdt ingen advarsler eller fejl.

Yderligere verifikation:

```text
npx tsc --noEmit
```

Resultat: exit 0, intet output.

```text
npx eslint "src/app/baerbare/[brand]/page.tsx" src/app/baerbare/__tests__/laptop-card-routes.test.tsx src/app/beskyttelsesglas/_components/__tests__/spot-picker.test.tsx src/app/kvalitet/__tests__/quality-faq.test.tsx src/app/saelg-din-enhed/accepter/page.tsx src/app/saelg-din-enhed/afvis/page.tsx src/components/cart/cart-upsell.tsx src/components/product/__tests__/device-detail-interactions.test.tsx src/components/product/condition-explainer.tsx src/components/product/device-detail.tsx src/components/repair/booking-wizard.tsx src/components/sell-device/__tests__/offer-response.test.tsx src/components/sell-device/__tests__/sell-device-wizard.test.tsx src/components/sell-device/sell-device-wizard.tsx src/lib/customer-facing-error.ts src/lib/laptop-tiers.ts src/lib/tilbehoer-config.ts
```

Resultat: exit 0, intet output. `git diff --check` rapporterede ingen whitespace-fejl.

## Kortlægning af alle 12 fund

1. `src/app/baerbare/[brand]/page.tsx`: begge ProductCard-kald bruger det eksisterende `href`-prop. Produkter med `templateId` går til `/refurbished/<handle>`, SKU'er beholder `/baerbare/<handle>`, og relaterede skabeloner på SKU-siden går til `/refurbished/<handle>`. `src/app/baerbare/__tests__/laptop-card-routes.test.tsx` dækker alle tre korttyper.
2. `src/lib/customer-facing-error.ts` indfører en lille præcis allowlist-politik uden sprogheuristik. DeviceDetail, salgsguiden, accept og afvis viser kun kendte sikre drifts-/valideringsbeskeder; TypeError, vilkårlige fejl, den engelske reservationsfallback og rå databasefejl får handlingsspecifik dansk tekst. Tests dækker TypeError på alle fire flader, retry/formbevarelse i de eksisterende flows samt kendte `Udsolgt`, kontakt- og tilbudskonflikter.
3. `src/components/repair/repair.module.css`: links i `heroActions` får en scoped hvid `focus-visible`-outline mod den mørkegrønne hero.
4. `src/components/cart/cart-upsell.tsx`: de tre visningstekster er nu `Tilvalg`, `Covers og beskyttelsesglas` og `Se reparationer til din model`; destinationer og øvrig kurveadfærd er uændret.
5. `src/components/product/device-detail.tsx`: den dobbelte inline Klarna-månedspris er fjernet. Den eksisterende bannerberegning og teksten om grundpris ved opgraderinger er bevaret.
6. `src/lib/laptop-tiers.ts`: budget-taglinen er neutraliseret til `Til studie og daglig brug`.
7. `src/components/repair/booking-wizard.tsx`: en display-only formatter undgår gentaget brandprefix som `iPhone iPhone 17 Pro`; alle navngivne bookingcaptions har mistet `uppercase`. ID'er, model-/brandværdier, servicevalg, beløb og payloads er uændrede; de eksisterende 8 bookingtests bestod.
8. `src/components/sell-device/sell-device-wizard.tsx`: tomme resultater beholder indeks `-1`; triggeren beskytter tomme options; `aria-activedescendant` udsendes kun for et eksisterende resultat; en ny søgning kan igen vælge en gyldig mulighed med piletast og Enter.
9. `src/components/product/condition-explainer.tsx`: de to delte billedskift har ikke længere `uppercase`; labels og billedskift er bevaret.
10. `src/app/kvalitet/__tests__/quality-faq.test.tsx`: testen kræver knappen, klikker den, følger `aria-controls` og kræver en synlig tilknyttet region med schema-svaret.
11. `src/lib/tilbehoer-config.ts`: outlet-FAQ'en bevarer informationen om skiftende sortiment og fjerner instruktionen om det fjernede nyhedsbrev.
12. `src/app/beskyttelsesglas/_components/__tests__/spot-picker.test.tsx`: den ekstra tomme EOF-linje er fjernet.

## Ændrede filer

- Laptop: `src/app/baerbare/[brand]/page.tsx`, `src/app/baerbare/__tests__/laptop-card-routes.test.tsx`, `src/lib/laptop-tiers.ts`.
- Fejl og salg: `src/lib/customer-facing-error.ts`, `src/components/product/device-detail.tsx`, `src/components/product/__tests__/device-detail-interactions.test.tsx`, `src/components/sell-device/sell-device-wizard.tsx`, `src/components/sell-device/__tests__/sell-device-wizard.test.tsx`, `src/components/sell-device/__tests__/offer-response.test.tsx`, `src/app/saelg-din-enhed/accepter/page.tsx`, `src/app/saelg-din-enhed/afvis/page.tsx`.
- Præsentation/testkontrakter: `src/components/repair/repair.module.css`, `src/components/cart/cart-upsell.tsx`, `src/components/repair/booking-wizard.tsx`, `src/components/product/condition-explainer.tsx`, `src/app/kvalitet/__tests__/quality-faq.test.tsx`, `src/lib/tilbehoer-config.ts`, `src/app/beskyttelsesglas/_components/__tests__/spot-picker.test.tsx`.

## Selvreview og begrænsninger

Selvreview af hele `d8ecc4d..61827e7`-området fandt én utilsigtet typografisk ændring i en åbningstidslabel; den blev gendannet før den afsluttende test/typecheck/lint-kørsel. Ingen andre scopeafvigelser blev fundet. Rootens tre dokumentændringer blev hverken staged eller ændret af denne implementering.

Som aftalt er fuld suite, produktionsbuild og CUA/browser-QA ikke kørt her; root ejer de gates. Verifikationen brugte kun mocks/lokale komponenttests: ingen rigtige requests blev sendt, og intet tilbud blev accepteret eller afvist. De tidligere beskrevne eksterne forhold om billedrettigheder og live stagingdata er ikke ændret af denne rettelsesbølge.

## Uafhængig kontrol af slutrettelser

Den afgrænsede kontrol af d8ecc4d..61827e7 godkendte samtlige 12 fund som rettet. Ingen nye fejl eller observationer uden for rettelsen. Spec og kvalitet godkendt: routing, API-payloads, statusser og økonomiske beregninger er bevaret.

Rootens efterfølgende fulde suite: `npx vitest run --maxWorkers=2`, exit 0, 105 testfiler, 720 bestået og én forventet credential-afhængig udeladelse; 81,88 sekunder. Ingen testgrænser eller tests er svækket.

Målrettet browserkontrol efter rettelserne: bærbart produkt åbner korrekt fra udfyldt prisgruppe; 320 px uden horisontalt overløb; begge reparationslinks har synligt hvidt tastaturfokus; tomt modelvalg skaber ingen ugyldig aktiv reference og kan derefter vælge Apple; iPhone til 9.199 kr. viser kun den eksisterende Klarna-rate på 3.067 kr.; kurvtekster er neutrale og testkurven tømt; bookingnavnet viser iPhone 17 Pro uden gentaget mærke. Ingen rigtige indsendelser.

Endelig produktionsbygning på den samme kildekode: `npm run build`, exit 0. Kompilering 26,8 sekunder, TypeScript bestået, 292/292 statiske sider genereret. Ingen udgivelse udført. Kendte eksisterende byggeadvarsler: flere lockfiler og den udfasede middleware-navnekonvention.

Rootens særskilte `npx tsc --noEmit` efter bygningen sluttede også med exit 0 og intet output. Ingen kildekode blev ændret mellem den fulde suite, reviewet, bygningen og den afsluttende typekontrol.
