# Erhverv og forhandlerregistrering

## Ændringer

- `/b2b/registrer` følger nu det godkendte udtryk med DM Sans, lys grøn baggrund, butiksfoto, tydelige formularfelter og en separat indgang til erhvervsreparation. Registrering bruger fortsat `/api/b2b/register` og de eksisterende feltnavne.
- `/erhverv` beskriver reparation på virksomhedens adresse på hele Sjælland og i hele Jylland ved flere enheder, som bekræftet af ejeren. Der er ikke tilføjet et bestemt minimumsantal, priser, leveringstider eller garantiløfter.
- Erhvervsformularen sender en forespørgsel gennem den eksisterende kontaktfunktion. Virksomhed, sted, antal og problem står i selve beskeden til personalet. Sjælland går til Slagelse, Jylland til Vejle. Besøget er først aftalt efter dialog om omfang, tidspunkt og pris.
- Links fra reparation, forhandleroverblikket og sidefoden gør siden tilgængelig. Erhvervssiden har egen canonical, sitemap-post samt Service- og FAQ-data. FAQ-teksten og de strukturerede data bruger samme kilde. Registreringssiden har egen metadata og er fortsat uden for indeksering.

## Kontrol

- Begge formularers 11 tests består: eksisterende API-kontrakt, korrekte kontaktbeskeder og regionsvalg, validering, netværks-/serverfejl, bevarede oplysninger og beskyttelse mod dobbelt indsendelse.
- Registreringens fem tests er kørt igen efter den sidste rettelse til fokus ved gentagne valideringsfejl; alle består.
- Fokuseret lint består. Byggekontrol genererede 293 sider med lokale testdata. Den sidste fokusrettelse er dækket af den efterfølgende formular- og typekontrol.
- Begge sider er gennemgået visuelt på computer og mobil. Felter og overskrifter er kontrolleret ved 390 og 320 pixels uden vandret overløb. Formularfelterne bruger 16 px skrift. Billeder og canonical er kontrolleret i browseren.
- Ingen rigtige ansøgninger eller forespørgsler er sendt under kontrollen. Betaling, fragt, databasemigrationer og produktionsmiljø er ikke ændret.

## Til implementeringsfasen

Sprogkorrekturens separate indholdsfund står i `../2026-09-14/dansk-sproggennemgang.md`. De eksisterende erhvervstekster andre steder på sitet har forskellige garantier og leveringstider. Registreringen gentager derfor ikke den gamle generelle påstand om 12 måneders reservedelsgaranti, automatisk godkendelse inden for 24 timer eller en separat frist kl. 14. Godkendelse er fortsat manuel.

Visningen og kontrollerne er lokale. Der er ikke foretaget en produktionsudrulning.
