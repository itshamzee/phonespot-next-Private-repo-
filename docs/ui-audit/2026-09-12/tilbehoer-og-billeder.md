# Tilbehør og flere billeder — 12. september 2026

Lokal opfølgning på ejerens ønske om flere produkt- og reparationsbilleder, en nytænkt tilbehørsside og beskyttelsesglas som almindelige produkter. Bygger videre på den godkendte retning; featurebranch `codex/tilbehoer-og-produktbilleder`, udgangspunkt `549ee72`. Intet sendt til GitHub eller produktion i denne opfølgning.

## Ændringen

- Tilbehør får en billedbåret indledning, fem kategoriindgange, samlet katalog og en sektion om skærmreparation. Kategoriillustrationerne bruger billeder fra udgivne varer, med eksisterende cover-/opladerfoto eller ikon som fallback. Det endelige katalog er stadig ejerens kommende arbejde.
- Beskyttelsesglas indgår i det almindelige tilbehørskatalog. `/beskyttelsesglas` viser produktkort med pris, kompatible modeller, lagerstatus og købsknap. Produkterne åbner på `/tilbehoer/beskyttelsesglas/[slug]`. Søgning og sitemap bruger samme mapping. Dobbelte indgange til skærmbeskyttelse/glas er fjernet fra filtrene.
- Model er et valgfrit filter. Både template-relationer og `compatible_models` bruges, og fulde modelnavne matches præcist (Pro må ikke matche Pro Max). Eksisterende modelparametre som slug understøttes. Lageroplysninger og priser stammer stadig fra SKU-data.
- Spot-typen følger varen i kurven, så de eksisterende prisregler bevares. Ingen ændringer i betalings- eller rabatmotoren. Testkøb i lokal kurv: 1 glas = 199 kr.; 3 stk. giver eksisterende 3-for-2, varer i alt 398 kr. Testkurven blev tømt igen.
- Mobil: vandret kategorirække, to produktkort pr. række fra 360 px og synligt reparationsfoto. Produktsidens overskrift og pris placeres tættere sammen på desktop.
- Ældre brand-/model-SEO-sider for glas er bevaret. Hovedindgangen kræver ikke længere den særlige glasvælger. Ingen ændringer i produktdata eller database.

## Billedkilde

Det nye foto `public/images/repair/telefon-med-smadret-skaerm.jpg` er [Wrecked iPhone af ClickerHappy, Pexels](https://www.pexels.com/photo/wrecked-iphone-1388947/). Kilden markerer fotoet som CC0; [Pexels' licensside](https://www.pexels.com/license/) blev også læst 12. september 2026. Billedet anvendes som illustration af en skade, ikke som dokumentation for PhoneSpots eget værksted. Downloadet som komprimeret JPEG (66.888 bytes), ingen AI-redigering. Det vises på forsiden, reparationssiden og i tilbehørssidens reparationssektion.

Coverfotoet `/images/products/tilbehoer-case.webp` og opladerfotoet `/blog/covers/apple-oplader.jpg` er genbrugt fra det eksisterende bibliotek. Glas- og øvrige produktbilleder kommer fra kataloget; der er ikke oprettet erstatningsbilleder for manglende varefotos.

## Kontrol

- Build bestået: Next.js 16.1.6, TypeScript og 292 statiske sider, lokale testdata.
- Lint af alle ændrede TypeScript-filer bestået. Diff kontrolleret med Windows-linjeskift.
- 45 fokuserede tests bestået for katalog, modelvalg, mobilfiltre, kurv, eksisterende mængderabat og offentlig SKU-projektion.
- Samlet test: 106 filer bestået, 728 tests bestået, 1 eksisterende credential-afhængig test sprunget over (99,72 sekunder). Første fulde kørsel havde én forventet forældet test af glas som en umappet kategori. Den generiske fallback-test er bevaret med en faktisk umappet kategori; en særskilt test bekræfter den nye produktvej for glas.
- Browser: 1280 px og 390 px; produktlinks, modelfilter, almindelig glasdetalje, kurv og mængderabat afprøvet. Ingen vandret sideoverløb på mobil. Ingen ordrer, leads eller bookinger indsendt.

Visuel prøvevisning bruger det eksisterende lokale datasæt, ikke produktionens lager. Kendte manglende varefotos/ufærdige produktnavne er ikke ændret eller skjult. Den tidligere GitHub-tilladelse dækkede kun forside-PR #3; denne opfølgning er ikke omfattet af den gamle eksportoversigt.
