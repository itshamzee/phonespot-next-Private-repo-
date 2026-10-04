# C1ST-gennemgang (PhoneSpots egen konto, 2026-10-02)

Gennemgået i ejerens loggede session uden at gemme eller ændre noget. Formål: alt, hvad vores admin skal kunne, før C1ST kan slukkes. Ingen kundedata er skrevet ned.

## Konto og forbrug

- **Abonnement:** Professional, 999 kr./md. Nogle måneder koster 1.479 kr. med tilkøb, så det bliver ca. 15.000 kr. om året. SMS koster 0,48 kr. stk.
- **Kasser:** 2 af 2 er i brug, "Standard" og "Faktura".
- **Brugere:** 2. Alle salg står på "PhoneSpot ApS", så der er ingen personlige logins.
- **Admin-mail:** Vestsjællandscentret. **Skal afklares:** bruger Vejle C1ST?
- **Denne uge:** 84 salg, ca. 54.000 kr. og 21 sager.
- **Kapacitet:** 20 af 300 sager brugt denne måned, og 966 varer.
- **Dinero-integration:** ikke aktiv. Den koster 250 kr./md. og bogfører dagsopgørelser automatisk.

## Sagsstyring

- **Liste:** faner med antal (Igangværende, Klar til kunde, Afventer, Alle), grupperet efter afhentningsdato.
  - Rækker: ikoner (reparation, betaling), ansvarlig, nr., opgave ("Model – opgave"), kunde og telefon, afhentning, "Meld klar".
  - Søgning: navn, telefon, beskrivelse, serienr.
  - Filtre: ansvarlig, tags.
- **Ny sag (én skærm):**
  - Kunde eller kundeenhed.
  - Opgaveskabeloner i faner (Computer, Tablet, Telefon, egen kategori).
  - Beskrivelse, tags og intern aftalt pris.
  - Ansvarlig, status og afhentningstidspunkt (påkrævet, forudfyldt).
  - Varelinjer med moms og total.
- **Sagsvisning:**
  - "Sag #1189" øverst med handlingsbjælken SMS, E-mail, Print, PDF, Betal og Meld klar.
  - Detaljer: status, betalt (delvist med depositum), ansvarlig, oprettet af, indleveret, planlagt afhentning.
  - Kunde: anden betaler, tilføj kundeenhed.
  - Varelinjer: lagerstatus, avance og %, depositum.
  - SMS-tråd som chat. Indleverings-SMS sendes automatisk, og kvitteringslink følger med.
  - Filer og underskrift.
- **Indstillinger:**
  - Nummerkort, faste produktlinjer på alle sager (f.eks. værkstedsløn) og kalender med arbejdstider.
  - Sagskapacitet pr. ugedag, lukkedage og egne faner.
  - Skabeloner til salg og sag ("Garanti 2 år", "Klargøring", "Installering af officepakke") og tags (kan gøres påkrævede).

## SMS og e-mail

- **Grænser og afsender:** daglig grænse på 1.000 SMS, virtuelt nummer så kunden kan svare, og afsendernavn.
- **Automatiske SMS'er:** indleverings-SMS og afhentnings-SMS er slået til som standard og kan vælges til eller fra pr. sag.
- **Serviceindkaldelser:** 6 trin efter et salg (1 md., 8 md., 1 år 3 md., 1 år 10 md., 2 år 5 md., 4 år 1 md.).
- **SMS-skabeloner med variabler** ([customer_name], [task_pickup], [store_phone], [task_no], [store_title], [receipt_url], [payment_link]):
  - Indlevering
  - Afhentning
  - Kvittering
  - Betalingslink
  - 10 egne skabeloner
- **E-mailskabeloner:** kassekvittering, betalingslink, sagskvittering og indkøbsordre.

## Kasse

- **Opbygning:** gitter af faste knapper (Diverse salg, iPhone reparation, Depositum, tilbehør), søgning og kategorier. Kurven har kunde, rabat og moms.
- **Faner:** Kasse, Salgshistorik og Dagsopgørelser.
- **Betalingstyper:** Kontant, MobilePay (manuel), Klarna, Faktura og **C1ST Pay-terminal (Adyen, terminal-id AMS1-…)**. Der er også et felt til "Integreret Worldline terminal".
  - Salgshistorikken viser korttypen (Visa, Mastercard), så terminalen er integreret.
  - **Skal afklares:** hvilken terminal står fysisk i butikkerne?
- **Salgshistorik:** bon-nr., klokkeslæt, ekspedient, betalingstype (eller "Afbrudt"), kunde, antal varer, sum.
- **Dagsopgørelse:** dato, kasse, omsætning, startbeholdning, optalt kontant, kontantjustering, difference, bruger.
- **Retur og gavekort:** byttemærker (dage, fast byttedato), gavekort med udløb, tilgodebevis med bonus-%, rabatkategorier (kan gøres påkrævede), returårsager.
- **Andre indstillinger:** valuta, sortering af varer, varianter grupperet, blokér salg uden lager, faner i kassen.
- **Bogføringskonti:** brugt-salg, lager, gavekort, C1ST Pay, omsætning, kassebeholdning, kontantafrunding, bank/pengeskab, kassedifference, dagens udlæg og kortbetalinger (pr. korttype).

## Varer, lager og indkøb

- **Vareliste:** titel, produkt-nr., pris (og før-pris), leverandør, mærke, varianter (størrelse, farve, batteri %), lager og "Vis kostpris".
  - Lager kan stå i minus.
  - Mange varer er "Uden lagerstyring".
- **Vare:**
  - Faner: Vareoplysninger, Transaktioner, Varianter, Billede, Følgevarer og Statistik.
  - Felter: EAN, pris, **kostpris**, tilbudspris.
  - Lagertype: Med lagerstyring, **Serievare** eller Uden.
  - Lagertal, min og maks, leverandører, mærke og kategorier.
- **Indstillinger for varer:**
  - **Moms: Standard 25 % eller Brugtmoms** (brugtmoms er den rigtige ordning for brugte enheder).
  - Alternativ stregkode, auto-indkøbsliste, CSV-import, årsag til lagerregulering og ekstra felter på produkter og kundeenheder.
- **Indkøb:**
  - Indkøbsliste, som også fyldes fra arbejdskort ("Se arbejdskort #…"), med kostpris pr. stk., leverandør og "Bestil".
  - Faner for igangværende og gennemførte indkøb.
- **Lager:** lagerbevægelser og varemodtagelser med fakturanr. og dato (kladde eller gennemført), import.

## Statistik

- **Kasse:** omsætning, antal salg, **profit**, rabat, gns. varer og kurv, profit pr. salg og retur. Kan filtreres på dag, bruger og kasse og downloades.
- **Faner:** Kasse, Sagsstyring, Lager og Udtræk.

## API

- REST-API med API-brugere og REST hooks med signatur. Kan bruges til at flytte kunder, varer og sager ved skiftet.

## Konsekvenser for vores admin (før C1ST kan slukkes)

1. **Kasse:** salg, depositum, betaling på sag, kontant, MobilePay, Klarna, faktura og kortterminal (integreret), retur, byttemærker, tilgodebevis og dagsopgørelse med kassedifference.
2. **Moms:** brugtmoms og standardmoms pr. vare, og bogføringskonti. Eksport til Dinero. Vi bygger selv, og den betalte C1ST-integration er ikke aktiv.
3. **Varer:** kostpris, serievare (IMEI pr. enhed), min/maks, indkøbsliste fra sager og varemodtagelse.
4. **Sager:** faste produktlinjer, skabeloner, tags, depositum, SMS-tråd, serviceindkaldelser og kapacitet pr. dag.
5. **Overblik:** profit pr. salg, butik og periode. Super admin ser alle butikker samlet.
