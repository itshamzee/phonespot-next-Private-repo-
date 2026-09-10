# Tilbehør: sælg en løsning, der passer

Ejeren vurderer tilbehør som en god indtjeningsmulighed. Avancer er ikke verificeret i denne audit. Sortimentet bliver udskiftet og opdateret; nedenstående er en model for det kommende katalog, ikke en anbefaling om at bevare bestemte varer.

## Det findes allerede

- `/tilbehoer` og kategorisider har søgning, sortering og filtre. Modelvalg findes i relevante kategorier, men ligger i sidepanelet og bag “Filtre” på mobil. Det er ikke hubbens primære indgang.
- `/beskyttelsesglas` har allerede en modelvælger og et totrinsvalg i `SpotPicker`: model, derefter Normal/Privacy samt valgfrie linse-/rammetilvalg. Der findes også prissætning for glasbundter. Det skal genbruges, ikke genopfindes som et parallelt system.
- Enhedsproduktsiden viser kompatibelt tilbehør. Tilføjelse af en telefon kan åbne en særskilt glas-opsalgsflade før kurven. Tilbehørs-PDP har allerede mobilkøbsknap og tekst om **2 års reklamationsret**.
- Montering i Slagelse og Vejle er allerede en del af glasfortællingen. Muligheden er at gøre service konkret og tilgængelig ved det relevante valg.

Kildespor: `src/app/tilbehoer/page.tsx`, `[category]/page.tsx`, `[category]/[slug]/page.tsx`, `src/components/tilbehoer/tilbehoer-layout.tsx`, `src/app/beskyttelsesglas/page.tsx`, `src/components/cart/upsell-modal.tsx`, `src/lib/spot/`.

## Første forudsætning: et pålideligt katalog

`src/app/api/accessories/route.ts` begrænser svaret til 200 varer uden tilsvarende komplet paginering. Live viste covers først 397 og derefter 200. Det præcise antal er midlertidigt; en skjult grænse vil også påvirke et nyt katalog, hvis det bliver stort nok. Sortering må omfatte hele resultatet, og tal skal beskrive samme udvalg før/efter indlæsning.

Samme endpoint matcher model via delstreng i `display_name`, returnerer tomme `compatible_models` og bruger `99` som fallback for online-lager, også når den fundne sum ikke er positiv. Dette er ikke bevis for en konkret fejllevering; det er utilstrækkeligt grundlag for ubetingede “passer til”-/lagerløfter. Et navn som iPhone 12 kan også matche 12 mini eller 12 Pro. Bevar eksisterende relationer i `sku_product_templates`, men brug entydige model-ID'er og validerede relationer i visningen.

Det fremtidige katalog bør have: stabilt SKU/model-ID, aktiv/publiceret status, kategori, produktbrand adskilt fra telefonbrand, præcis kompatibilitet, validerede lagerkilder pr. butik/online, stiktype, effekt/PD-understøttelse, materialer, funktioner, fotos og rettigheder. `attrs`, `sku_product_templates`, `product_templates` og `sku_stock` giver et udgangspunkt; udfyldningsgraden er ukendt. Ingen migration er foreslået som automatisk tilladt arbejde.

## 1. “Hvad passer til min telefon?” som hovedindgang

**UI:** Hubben starter med en søgbar modelvælger og hjælp til at finde modelnavnet. Kendt model fra enheds-PDP følger med i URL'en, hvor den kan ændres. Først derefter vises cover, glas og opladning. Kunden kan stadig gå direkte til en kategori. Valget bevares gennem kategori, produkt, tilbage-navigation og kurv; ingen tvungen gentagelse. Ved ukendt kompatibilitet vises hjælp frem for et grønt løfte.

```text
Tilbehør der passer til din telefon
[Søg efter din model                         ]
Sådan finder du modelnavnet

Din model: [valgt model] · Skift
Cover                 Beskyttelsesglas          Opladning
Synlig egenskab        Normal / Privacy         Rigtigt stik + effekt
Fuld pris             Fuld pris                 Fuld pris
```

På mobil kommer model og skift-link før produktlisten; kategori er enkel navigation, ikke en lang række badgefiltre. Modellen må aldrig være skjult af titlens afkortning.

**Data:** Entydig kompatibilitet pr. SKU, alternative modelnavne, stik og opladningskrav. Telefonbrand og tilbehørsbrand skal være separate filtre. Pilot på et lille udvalg af de modeller, ejeren beholder.

**Hypotese og mål:** Andel af modelvælgerstarter der finder et kompatibelt produkt og lægger det i kurv; tid til første relevant produkt; nulresultater; fejlkompatibilitetsreturer. Hypotesen svækkes, hvis modelvalget blot giver flere afbrudte søgninger uden bedre køb/returer. Sammenlign samme modeller og lagerstatus, ikke gammelt vs. nyt katalog ukorrigeret.

**PR-afgrænsning:** Hub først; derefter modelkontekst i kategori. Datavalidering er en særskilt forudsætning, ikke en skjult del af et visuelt redesign.

## 2. Et valgfrit, kompatibelt sæt ved enhedskøbet

**UI:** Efter valgt telefon vises et roligt “Gør din telefon klar”-afsnit med højst ét kurateret forslag pr. behov: cover, glas og opladning. Ingen tilvalg er forhåndsvalgt. Hver vare har selvstændig pris/fjern-funktion; en fælles total opdateres med valget. Kunden kan fortsætte med telefonen alene. Brug samme tilvalg i PDP og kurv uden to gentagne popups. Kurven bevarer læsbar enhed, total og betaling på mobil.

**Data:** Præcis modelmatch, eksisterende medfølgende indhold, stik/effekt, lager på alle dele, indkøbspris og dækningsbidrag efter fragt, rabat, montering og retur. Genbrug Spot-bundleregler hvor de gælder; lov ikke en ny rabat uden godkendt beregning. Et manglende tilbehør må ikke forhindre køb af en tilgængelig telefon.

**Hypotese og mål:** Tilbehørsandel blandt betalte enhedsordrer og dækningsbidrag pr. enhedsordre. Kontrolmål: betalt købsrate, tid til betaling, annulleringer og returer. Højere kurvværdi alene er ikke succes, hvis rabatter eller frafald gør handlen mindre rentabel.

**PR-afgrænsning:** Enheds-PDP efter hub/katalogafklaring; kurv særskilt. Ændring af betalingsberegning eller reservationer kræver eksplicit aftale.

## 3. Montering som konkret lokal service

**UI:** På glasvalg og glas-PDP vises et ægte foto af monteringen, adresse og aktuelle servicemuligheder for begge butikker. Eksempeltekst: “Få beskyttelsesglasset monteret i Vejle eller Slagelse.” Vis pris/inklusion og praktisk fremgangsmåde, når ejeren har bekræftet dem. En kort trinvis fotoserie viser rengøring, placering og resultat. Undgå et generisk “perfekt hver gang”-løfte uden dokumenteret politik.

**Data:** Hvilke glas kan monteres, om service er inkluderet, monteringstid/kapacitet, lager pr. butik, åbningstider og afhjælpningspolitik. Brug eksisterende butikskilder. Ingen ny bookingmotor uden behovsafklaring.

**Hypotese og mål:** Klik på relevant butik efter glasvalg, verificerede monteringer via POS/servicekode, dækningsbidrag efter arbejdstid og genmonteringsrate. Et butiksklik er en interessehandling, ikke dokumentation for en gennemført montering.

**PR-afgrænsning:** `/beskyttelsesglas` først; detaljer på relevante produktsider senere. Bevar modelvælgeren, byt den dekorative hero ud med konkret dokumentation.

## 4. Færre, forklarlige forskelle i hver kategori

**UI:** Efter modelvalg vises et lille sammenligneligt udvalg med de egenskaber, der faktisk afgør købet: coverets greb/magnet/beskyttelseskant, glassets indsyn eller opladerens stik/effekt. Hver række har foto, én begrundelse, kompatibilitet og fuld pris. “Se alle” er stadig tilgængelig. På mobil læses én mulighed ad gangen med de samme egenskaber i samme rækkefølge.

Swissten, Rexus og NovaNL bliver synlige afsendere, ikke en opdigtet rangorden. “God/bedre/bedst” må kun bruges, hvis dokumenterede SKU-forskelle understøtter det. Normal og Privacy løser forskellige behov; det dyreste er ikke automatisk bedst. “Mest valgt” kræver faktiske salg, angivet periode og tilstrækkeligt grundlag. Ellers brug en sand egenskab eller klart markeret faglig anbefaling med kriterium.

**Data:** Komplette egenskaber, faktiske fotos, kompatibilitet og priser for det blivende katalog; indkøberens dokumenterede udvælgelseskriterier. Brand alene er ikke et kvalitetsbevis.

**Hypotese og mål:** Produktvalg og køb pr. kategori-/modelbesøg; færre tilbagehop, færre kompatibilitetsspørgsmål; returårsager. Afkræft, hvis det kuraterede udvalg skjuler relevante produkter og reducerer køb. Et lille udvalg må ikke blot være de første 200 produkter fra API'et.

**PR-afgrænsning:** Én kategoriside som pilot, derefter PDP. På observeret NovaNL-PDP stod “Skærmbeskyttelse” over flere covers: `[category]/[slug]/page.tsx` falder tilbage til andre søskendeprodukter. Vis kun den lovede kategori eller brug en korrekt generel overskrift. Det er en logikfejl, som et nyt katalog ikke i sig selv løser.

## Regler ved alle fire greb

Tilbehør: **2 års reklamationsret**. Enhedens **36 måneders garanti** må ikke brede sig til et samlet sæt uden tydelig opdeling. Brug “beskyttelsesglas”/“hærdet glas”. Hele prisen er primær; tilvalg og rabat skal kunne gennemskues og fravælges. Ingen falsk knaphed, opfundne salgstal eller tilbehør lagt i kurven uden et aktivt valg.
