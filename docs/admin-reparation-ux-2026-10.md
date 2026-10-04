# Admin: reparation, henvendelser og opkøb — UX-plan (okt 2026)

Kilde: UX-audit af koden, debug af opkøbslisten og research i C1ST (2026-10-02). Kodebaseret, men ikke observeret i butikkerne endnu. Skal bekræftes ved skranken og i ejerens C1ST.

## Hvorfor personalet bruger C1ST i dag (hypoteser)

1. Indleveringen er en backoffice-guide: 4 skærme og 12-14 klik, og brand og model er fritekst.
2. Der er ingen "hvad skal jeg nu"-kø pr. butik. Listen viser alle sager i kronologisk rækkefølge.
3. Man kan ikke betale for en reparation i butikken på sagen, og POS er ikke koblet til sager.
4. Der er døde knapper på sagen:
   - "Hastesag" kalder en `PATCH /api/repairs/[id]`, som ikke findes.
   - "Bero" og "Reklamation" bliver afvist af status-ruten og af CHECK-reglen i databasen.
5. Sagsnummeret `PS-2026-0001` vises ingen steder. Der vises kun de første 8 tegn af UUID'et.
6. Tjeklisten er forudfyldt med OK, også for "Find My" og vandskade. Det er en reklamationsrisiko.
7. Webbookinger og indleverede sager blandes. Når kunden kommer, laves der en dublet-sag.
8. "Færdig"-SMS'en bruger altid Slagelse-adressen.

## Opkøb: "accepteret bud forsvinder"

- **Årsag 1:** `contact_inquiries.manual_status` vinder over kundens accept (`opkoeb/page.tsx:208-224`), og accept-ruten rydder den ikke (`api/trade-in/accept/route.ts:57-69`). Sagen skifter derfor mappe eller fase uden at vise "Accepteret".
- **Årsag 2 (ikke verificeret):** fejl i listens `.in()`-forespørgsler ignoreres, og så falder alle sager tilbage til "Ny".
- **Andre mangler:** listen er sorteret efter oprettelse, ikke aktivitet. Den viser ingen dage i fasen, ingen udbetalingsstatus og intet accepteret-tidspunkt. Personalet kan ikke registrere en mundtlig accept.

## Faseplan

- **Fase 0 (1-2 dage):**
  - Få de døde knapper til at virke, og vis sagsnummeret overalt.
  - Tjeklisten skal starte som "ikke vurderet".
  - SMS skal bruge butikkens egen adresse.
  - Accept skal rydde manuel status, og fejl i forespørgsler skal vises.
  - Ret ASCII-dansk ("Naeste", "Faerdig").
- **Fase 1 (1-1,5 uge):**
  - Butiksvælger i topbaren.
  - "I dag"-kø med sektionerne Ny (web), Klar til afhentning, Venter på kunde, Venter på del, I gang og Forfaldne.
  - Indlevering på 60 sekunder i ét skærmbillede: telefon, navn, model fra prislisten, ydelser som knapper, kode, tilstand, lovet dato og "Opret og udskriv".
  - Søgning på telefon, sagsnummer og IMEI.
- **Fase 2 (1 uge):**
  - Etiket med stregkode, hvor en scanning åbner sagen.
  - Kundens underskrift på skærmen.
  - "Registrér betaling" (kontant, MobilePay, kort, link) og "Betal og afhent".
  - Godkend-link til tilbud.
- **Fase 3 (1 uge):**
  - Henvendelser: telefonhenvendelse med 4 felter, og "Opret sag" eller "Opret opkøb" fra en henvendelse.
  - Ejer på hver henvendelse og notifikationer.
- **Fase 4:** kanban, teknikere, reservation af reservedele og "Modtag booking".

## Det vi kopierer fra C1ST

- "Marker klar" med to valg: "Klar til kunde" sender SMS, "Færdig" går til betaling.
- Check-in-SMS som standard.
- Dele lagt på en sag reserverer lageret.
- Gemte faner og filtre.
- Redigerbare skabeloner til SMS og mail.

## Det vi gør bedre end C1ST

- IMEI, kode og tjekliste udfyldes ved disken.
- Underskrift ved oprettelse.
- Ingen loft på antal sager.
- Statusser for "venter på del" og "venter på godkendelse".
- Et ægte opkøbsflow.
