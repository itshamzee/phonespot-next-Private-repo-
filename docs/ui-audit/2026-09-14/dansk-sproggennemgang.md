# Dansk sprog – gennemgang 14. september 2026

## Omfang

Alle 113 offentlige TSX-sidefiler er gennemgået, herunder layouts, formularer og dynamiske sideskabeloner. Desuden er alle 28 blogartikler, model- og sammenligningsdata og de fælles kundevendte komponenter gennemgået. Filinventaret står i `dansk-gennemgaaede-filer.json`.

Der er rettet stavning, æ/ø/å, bøjning, sammensatte ord, kommaer og unaturlige oversættelser. Eksempler: »Fulde navn« → »Fuldt navn«, »fabriksgennemstilling« → »fabriksnulstilling«, »ventilationsholere« → »ventilationsholdere«, »Kontoplysninger« → »Kontooplysninger«. E-mail, stand A/B/C og danske filtertekster er gjort mere ensartede.

Gennemgangen omfatter kildekodens kundetekster. Produktnavne og beskrivelser, som senere tilføjes eller ændres i varekataloget, tredjepartsindhold, transaktionsmails, API-beskeder og administrative arbejdsgange kræver deres egen gennemgang. Kontosiderne er læst i koden; private kundekonti er ikke åbnet.

## Bevarelse af funktion og SEO

- Slugs, links, kanoniske adresser, SEO-keywords, priser og modelidentifikatorer er bevaret.
- Reparationens formular viser rettede labels uden at ændre de værdier, der sendes til systemet. Det samme gælder salgsguidens valg og tilbehørets filterværdier.
- Eksisterende tests er opdateret til de nye synlige ord. Testenes kontroller af payloads, lager, priser og kunderejser er bevaret. En supplerende test kontrollerer, at en rettet visningstekst stadig indsender den oprindelige formularværdi.
- Fire emojis i genoptagelse af checkout er fjernet i overensstemmelse med AGENTS.md.

## Indhold, der skal afklares før implementering

Dette er fund i de eksisterende tekster, ikke nye løfter eller en juridisk vurdering. Betydningen er bevaret under korrekturen, så beslutninger om vilkår og produktfakta kan tages særskilt.

1. **Returret og garantier er ikke ens beskrevet.** Trusmi-siderne siger »24 måneders fuld returret«, Vejle-landingssiderne siger 30 dage, mens standardteksterne siger 14 dage. Kassen omtaler gratis returnering, mens fortrydelsessiden angiver, at køber betaler returomkostninger. Flere blogindlæg fremsætter andre garanti- og reklamationsløfter. Sammenhold med de godkendte vilkår.
2. **Nogle ældre produktartikler kræver faktatjek.** Især `iphone-16-vs-iphone-15-sammenligning.mdx` indeholder mange konkrete chip-, skærm-, kamera-, Apple Intelligence- og Find-påstande, som bør verificeres. Modeldata, iPhone 18-siden og coverguidens MagSafe-forklaring bør også kontrolleres. Ingen specifikationer er opfundet eller rettet som led i korrekturen.
3. **Kontaktoplysninger skal samles om den fælles kilde.** Den gamle reservationskomponent og enkelte artikler har andre telefonnumre/adresser end `store-config.ts`. Bærbare-Vejle indeholder både 3A og 3B. B2B-overblikket har et særskilt eksempelnummer. Undersøg, hvilke gamle komponenter der stadig benyttes.
4. **Juridiske og finansielle beskrivelser bør harmoniseres.** Handelsbetingelsernes transport-/ODR-afsnit, bloggens forsikringsløfter, delbetalingsudsagn og cookiepolitik har punkter til særskilt kontrol. Garantiens batterigrænser er beskrevet som forringelse i garantiperioden; de må ikke omskrives til batteriløfter ved køb.
5. **Ældre service- og SEO-indhold har interne forskelle.** Vejles reparationsside har forskelle mellem synlig FAQ og JSON-LD. Flere gamle tekster lover bestemte reparationstider, livstidsgaranti eller fuld datasikkerhed. Afklar og dokumentér den fælles praksis frem for at lade korrekturen skabe nye vilkår.

## Kontrol

Kildegennemgang og en separat kontrol af ændrede links, identifikatorer og formularværdier er udført. Typekontrol og build af 292 sider består. Den lokale browser er kontrolleret på konto- og erhvervsregistreringssiderne.

Den samlede testpakke omfattede 746 tests: 744 bestod, én blev sprunget over, fordi den kræver produktionsdata, og én overskred tidsgrænsen under samtidig build. Den berørte salgsguide blev derefter kørt alene; alle dens tests bestod. Der er ikke ændret på testenes tidsgrænser.

Alt arbejde er lokalt på featurebranchen. Ingen ændring er sendt til produktion.
