# Spørgsmål til Worldline: integration af kortterminal i vores kasse

PhoneSpot (PhoneGo ApS) har to butikker, Vejle og Slagelse, med hver sin Worldline-terminal. I dag slår vi beløbet ind på terminalen i hånden og bekræfter i vores egen kasse (webbaseret, kører i browseren på en pc i butikken). Vi vil gerne have, at kassen sender beløbet direkte til terminalen og får svaret tilbage automatisk.

Kan I svare på nedenstående, gerne med links til dokumentation?

## 1. Terminal og integrationsform

- Hvilken terminalmodel har vi i hver butik (model, software, terminal-id)?
- Understøtter vores terminaler integration, eller skal de skiftes?
- Hvilke integrationsformer tilbyder I til en webkasse uden lokal software?
  - Cloud / "semi-integrated" (vores server kalder jeres API, terminalen får beløbet over internettet)
  - Lokalt netværks-API (kassen taler direkte med terminalen på butikkens netværk)
- Hvilken anbefaler I til os, og kræver nogen af dem en lokal app eller driver på pc'en?

## 2. Test og dokumentation

- Kan vi få et sandbox-/testmiljø og en testterminal (eller simulator)?
- Link til API-dokumentation, autentificering (API-nøgler, certifikater) og eventuelle SDK'er.
- Testkort til godkendt, afvist og afbrudt betaling.

## 3. Hvilke handlinger understøttes via API

- Køb (beløb i DKK, med vores egen reference/idempotensnøgle)
- Annullér en betaling, der står og venter på kunden
- Annullér/void en gennemført betaling samme dag
- Refusion, også delvis refusion, og om den kan ske uden at kortet er til stede
- Kan drikkepenge (tip) slås fra på terminalen?

## 4. Svar og transaktions-id

- Hvordan får vi resultatet: webhook, polling af status, eller begge?
- Hvad hedder transaktions-id'et, vi skal gemme, og hvor langt kan det være?
- Hvilke statusser kan en betaling have (godkendt, afvist, afbrudt, timeout)?
- Hvor lang tid må vi vente, før en betaling regnes som tabt, og hvordan afklarer vi en betaling med ukendt status?

## 5. Kvittering

- Printer terminalen selv kortkvitteringen, eller får vi kvitteringsteksten, så vi kan sætte den på vores egen kvittering?
- Kan terminalens print slås fra, hvis vi selv printer?

## 6. Dankort og co-badgede kort

- Hvordan håndteres Visa/Dankort og Mastercard-co-badgede kort? Vælger terminalen Dankort automatisk, eller vælger kunden?
- Får vi at vide, hvilket kortnetværk der blev brugt (til afstemning og gebyrer)?

## 7. Afregning og afstemning

- Findes der en daglig afregnings-/settlement-rapport via API eller fil (SFTP, CSV)?
- Indeholder den vores reference og transaktions-id, så vi kan matche med kassens dagsopgørelse?
- Hvordan vises refusioner og chargebacks i rapporten?

## 8. Certificering og krav

- Skal vores integration certificeres hos jer, og hvad indebærer det (testcases, tidsforbrug, pris)?
- PCI-krav for os: vi rører aldrig kortdata selv, kun beløb og transaktions-id. Bekræft, at det holder os uden for PCI-scope ud over SAQ for terminalen.

## 9. Aftale og gebyrer

- Kræver integreret brug en ny aftale, et andet abonnement eller andre transaktionsgebyrer?
- Er der engangsomkostninger (opsætning, certificering, terminal-udskiftning)?

## 10. Tidsplan

- Hvor hurtigt kan vi få testadgang?
- Hvad er en realistisk tid fra test til drift for en løsning som vores?
- Hvem er vores tekniske kontaktperson?

---

## Hvad vi allerede har klar

- Kassen har et fast punkt, hvor kortbetaling sker. I dag er det en manuel bekræftelse ("Kortet er godkendt"); integrationen sættes ind samme sted, uden at resten af kassen ændres.
- Et salg gemmes først, når terminalen har godkendt betalingen. En afvist, afbrudt eller fejlet betaling opretter intet salg. Fejler salget efter en godkendt betaling, forsøger vi at føre betalingen tilbage automatisk.
- Hver kortbetaling får vores egen reference (idempotensnøgle) og gemmer jeres transaktions-id på betalingslinjen, så hvert salg kan afstemmes mod jeres rapport.
- Returneringer laves som kreditnota. Ved kortrefusion sender vi den oprindelige transaktions-id med, når salget havde én kortbetaling.
- Ekspedienten kan annullere en betaling, der står og venter på terminalen.
- Delt betaling (fx kontant + kort) og depositum på reparationer understøttes allerede.
- Vi gemmer aldrig kortdata, kun beløb, reference og transaktions-id.
- Integrationen kan slås til og fra pr. miljø. Indtil den er sat op og testet, kører butikkerne videre med den manuelle bekræftelse som i dag.
