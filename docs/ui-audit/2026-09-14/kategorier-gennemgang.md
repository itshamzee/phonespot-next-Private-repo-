# Kategorier – gennemgang 14. september 2026

Omfatter /iphones, /ipads, /baerbare, /smartwatches og /smartphones. Ændringerne er lokale på featurebranchen; implementering og frigivelse drøftes efter brugerens gennemgang.

## Det ændrede udtryk

- Fælles, kompakt kategoriintro med et ægte produktfoto. iPhones har en lys grøn tone, iPads lys lavendel, bærbare blågrå, ure varm sand og Android en afdæmpet grøn. Den mørkegrønne typografi og DM Sans følger det godkendte udtryk.
- På mobil står billedet ved overskriften, så introen ikke skubber udvalget unødigt langt ned. Særskilt tilpasning til 320 px og lange kategorinavne.
- Produktbilledfelter, kanter, standvejledning og FAQ følger kategoriens lyse tone. Butiksvejledningen har et eksisterende foto fra en PhoneSpot-butik.
- Garanti og tilbehør står i samme grid og har samme mål som produkterne på iPhones og iPads. Garanti står normalt efter to modeller og tilbehør efter fem; i korte kataloger flyttes senere felter til slutningen. Ved nul eller én filtreret model vises ingen indholdsfelter. Antal og sortering omfatter kun produkter.
- Garantifeltet omtaler udtrykkeligt 36 måneder på enheden. Tilbehørsfeltet indeholder ingen garanti, pris, rabat eller lagerpåstand. Links fører til /garanti og /tilbehoer. Tidligere ubrugte tilbudsbudskaber i PromoCard er fjernet.
- Smartphones er synlige i headeren, mobilmenuen og forsidens kategorioversigt. Mærkefilteret vises nu for alle kategorier med flere mærker, herunder Android. Samsung og OnePlus er forklaret i tekst og FAQ; filtrene dannes ud fra det aktuelle udvalg.

## Billeder og reference

Layoutreference: [den nuværende iPhone-kategori](https://phonespot.dk/iphones), især placeringen af garanti og tilbehør mellem modeller. Gamle pris- og kvalitetsudsagn er ikke kopieret.

Alle billeder genbruger eksisterende PhoneSpot-aktiver bortset fra en lokal kopi af [PhoneSpots offentlige iPad Air-produktfoto](https://xfcadewtpmjrvuzfwkku.supabase.co/storage/v1/object/public/product-images/apple-ipad-air-10-9-4th-gen-2020-256gb-wifi-cellular/1787177290315-t49wjn.jpg), gemt som public/images/devices/ipad-air-color.jpg (46.974 bytes). Hero-billeder illustrerer kategorier; de angiver ikke et bestemt produkt som lagerført.

## Kontrol

- 37 relevante tests består: produktfiltre, korte/tomme resultater, redaktionelle felter, produktpriser, kategorier, header og forsideoversigt. De to nye regressionstests fejlede før ændringen og består efter den.
- Typecheck og lint af ændrede komponenter og sider består. Afsluttende Next-build med lokale testdata består, inklusive det endelige billedvalg.
- Alle fem kategorier gennemgået på desktop (1249 px) og mobil. Desuden kontrolleret 320 px med det lange smartwatch-navn. Ingen vandret sideoverløb eller fundne ødelagte billeder.
- Ved desktopmålingen: alle iPhone-felter 289 × 481 px og alle iPad-felter 289 × 487 px. På iPad-mobilvisningen: alle fire felter 173 × 384 px. Også sidste række får samme højde.
- Alle fem sider har én H1 og egen korrekt canonical. Synlige FAQ og JSON-LD stemmer: fire spørgsmål på hver af de første fire kategorier, fem på smartphones.
- Samsung-filteret afprøvet i mobilskuffen med de to offentlige Android-eksempler i den lokale testserver. Filtrering viser kun Samsung og ændrer tælleren til én model. Automatiske tests dækker også OnePlus, nulstilling, tastatur og fokus.
- Filterknappen er flyttet fri af den flydende kontaktknap på mobil. Filterpanelet lukker efter valg, og fokus vender tilbage til knappen. Garanti, tilbehør, kvalitet, butikker og begge butikssider svarer med HTTP 200.
- Uafhængig kodegennemgang: ingen kritiske eller væsentlige fund. Ét mindre fund om billedstørrelser i produktdetaljernes relaterede varer er rettet med en separat imageSizes-prop; kategoriens billedstørrelser er nu afgrænset til FilteredGrid.

## Afgrænsning ved implementering

Visningen bruger den eksisterende lokale testdataserver med offentlige katalogeksempler og syntetisk testlager. De to Android-modeller er aflæst på den offentlige smartphones-side. .superpowers-filer er lokale QA-filer og indgår ikke i leverancen. Det endelige katalog og lager skal kontrolleres særskilt ved implementering. Ingen produktionsdata, betaling, fragt, migrationer eller publicering er ændret.
