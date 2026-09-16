# Forside: lysere første indtryk og samlet gennemgang

Ejerens seneste feedback: indgangen er for mørk. Hele forsiden skal gennemgås som sidste designtrin før en drøftelse af implementeringen.

## Den gennemgåede ændring

- Heroen bruger creme `#f0f1e9`, mørkegrøn tekst og det eksisterende fritlagte produktfoto `/images/devices/iphone-17.png`. Det sorte Apple-nærfoto er fjernet fra heroen. Karrusellens fire kategorier, links og manuelle betjening er bevaret. Fotoet er allerede i projektet; ingen ny kampagnefotografering er produceret.
- Karruselknapper er 44 × 44 px. Dobbelt billedtekst skjules på mobil, så den ikke møder knapper og kategoritæller.
- Reparation og opkøb står stadig umiddelbart efter heroen. Teknikerfotoet, som ejeren tidligere bad om at beholde, er bevaret. Tekst og foto har adskilte områder, også ved 320 px. Opkøb forklarer vurdering og muligheden for et nyt liv.
- Produktkort har mere læsbare oplysninger om valg og garanti. Den eksisterende API, prisvisning, vareudvælgelse, fejlvisning og tomme tilstand er bevaret. Kategorimenuen følger produkternes højde.
- En kompakt tilbehørssektion genbruger de fritlagte billeder fra tilbehørssiden. Covers, beskyttelsesglas og kabler/opladere linker til de eksisterende kategorier. Beskyttelsesglas præsenteres sammen med almindeligt tilbehør.
- Butikkerne viser adresser fra den fælles butikskonfiguration og linker individuelt til Vejle og Slagelse.
- Afslutningen beskriver refurbished elektronik, test, længere brug og muligheder for reparation/opkøb. Fem spørgsmål dækker refurbished, kosmetisk stand, batteri, garanti og prismatch. Synlig tekst og FAQ-strukturerede data bruger samme datakilde.
- Forsiden har en eksplicit titel, beskrivelse og Open Graph-oplysninger. Canonical er bevaret. Den arvede, generelle besparelsespåstand erstattes på forsiden af konkret information om sortiment og service.

## Kontrol

- Forsidens 9 eksisterende tests bestået: karrusel, kategorivalg, fokus, indlæsning, fejl, genforsøg, forældede svar og korrekt tilbehørsgaranti.
- TypeScript og målrettet lint bestået.
- Den afsluttende produktionsbygning bestået med 292 statiske sider efter de sidste CSS-rettelser. Forhåndsvisningen forblev tilgængelig under bygningen.
- En eksisterende tilbehørstest brugte `exact`, som ikke findes i Testing Librarys `ByRoleOptions`. Indstillingen er fjernet; strengmatch er allerede standard. Testens forventning er uændret, og filens 4 tests består.
- Desktop og mobil ved 390 og 320 px gennemgået visuelt. Ingen horisontal sideoverløb. Ved 320 px blev der målt 12 px mellem reparationskortets tekstområde og foto.
- Alle fire hero-kategorier skifter billede, overskrift og link sammen. Karrusellen vender tilbage til iPhone efter sidste kategori.
- Browserkontrol: én H1, korrekt canonical og beskrivelse, fem FAQ-elementer med identisk synlig svartekst, ingen færdigindlæste billeder med fejl.
- Tilbehør, beskyttelsesglas, opladere, kvalitet, prismatch og begge butikssider svarer HTTP 200.

## Afgrænsning før implementering

Ændringerne er lokale på featurebranchen. Produktionsdata, betaling, fragt, booking, database og fælles navigation/footer er ikke ændret i denne gennemgang. Den lokale datavisning er fortsat et katalogudsnit med særskilte testscenarier og fastlægger ikke det endelige sortiment. Det endelige katalog og brugsrettigheder til øvrige billedaktiver skal indgå i den senere implementeringsdrøftelse.
