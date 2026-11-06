# Kassesystem, opkøb, lager og regnskab under Fixon ApS — design

Dato: 2026-11-06. Ejer: PhoneSpot-ejeren. Bogføring: direktøren for Fixon ApS (bruger Dinero).

## Hvorfor

PhoneSpot flytter over til Fixon ApS og til Flatpay. Fixon driver webshoppen, Vejle, Vejle Gågade og Esbjerg. Forretningen sælger brugt elektronik under brugtmomsordningen. Ordningen holder kun, hvis hvert indkøb har et bilag med IMEI, og hvert salg kan føres tilbage til sit indkøb.

I dag laves opkøb i butikken som en straksoverførsel uden nogen registrering. Der er ingen IMEI, ingen kundeoplysninger og ingen slutseddel. Det er den største risiko, både for momsen og for hælervarer. Ejeren vil derudover have:
- et kassesystem, der er 100 % lovligt
- et lager pr. butik, der stemmer
- grundige rapporter, der kan eksporteres
- en Dinero-forbindelse, så regnskabet stemmer
- et system, der føles hurtigt

## Allerede gjort (2026-11-06)

- **CVR-skiftet** er live (main dcc12b9). Fixon ApS og CVR 46079019 står overalt på siden og i dokumenter og mails. Navn og CVR kommer fra `src/lib/company.ts` (`LEGAL_ENTITY`). PhoneGo nævnes ingen steder. Der er ingen meddelelse om skiftet.
- **Sikkerhedshul lukket** (main a6268d5). Slutseddel-ruterne krævede ikke login og afslørede bl.a. sælgers bankkonto. Nu kræver de personale-login.

## Mål

1. Et opkøb i butikken kan oprettes på under 2 minutter. Det giver en lovlig slutseddel og lægger enheden direkte på lager med indkøbspris, IMEI og momsordning.
2. Hver brugtmoms-enhed kan følges fra indkøb (bilag) til salg (bon) via IMEI.
3. Lageret er korrekt pr. butik. Alle ændringer kan spores, flytninger giver en intern afregning, og der kan laves en optælling pr. butik.
4. Kassen overholder bogføringsloven. Registreringer kan ikke ændres, kun modposteres, og dagsopgørelsen låses ved lukning.
5. Dagsopgørelser sendes automatisk til Dinero. Direktøren får et pænt og grundigt overblik over brugtmoms.
6. Ejeren får fuld statistik med interaktive grafer, historik for alle dage og år, og eksport.
7. Klik i admin og i kassen føles øjeblikkelige.

## Ikke-mål

- Ingen direkte integration med Flatpay-terminalen. Flatpay tilbyder det ikke; terminalen er ekstern.
- Ingen CPR-numre gemmes.
- Ingen meddelelse om skiftet til Fixon. Ingen nævnelse af PhoneGo på siden.
- Ingen PhoneSpot-brandet forsikring.
- Ingen ny kasse-app. Kassen forbliver en webside i browseren på Mac og Windows.

## Anti-mål (det ville være fejl, selvom det virker)

- Enhver vej, hvor en bogført registrering kan ændres eller slettes uden spor.
- Et opkøbs- eller salgsflow, der bliver langsommere ved disken, end det er i dag.
- Ansatte, der ser tal, de ikke har fået lov til at se.
- Kundevendt tekst med "Foxway", "dropship", "Panserglas", Trustpilot-stjerner eller PhoneGo.

## Status i koden i dag (kortlagt 2026-11-06)

Det, der virker og skal bygges videre på:
- **Kassen** (`admin/kasse`, `POST /api/pos/sale` → RPC `pos_create_sale`):
  - Salget beregner brugtmoms som avance × 25/125 og 0 ved negativ avance. Resultatet gemmes i `orders.brugtmoms_total`.
  - Betaling kan deles på flere midler. Retur laves som kreditnota.
  - Bonnumre er løbende pr. kasse uden huller. Kassesessioner låses ved lukning med triggeren `pos_guard_locked_session`.
  - Bekræftede ordrer kan ikke ændres (`20260312_006`).
- **Lager:**
  - `devices` har `location_id`, `vat_scheme`, `purchase_price` og `imei`. `sku_stock` holder lager pr. butik.
  - `stock_movements` er en log, der kun kan tilføjes til.
  - Flytninger mellem butikker kører med RPC'erne `transfer_request/send/receive/cancel`.
- **Opkøb:** `trade_in_receipts` og `trade_in_receipt_items` (slutseddel med nummer SS-ÅÅÅÅ-NNNN). PDF'en laves af `lib/pdf/slutseddel`. Indkøbsbilag ligger i `purchase_documents`.
- **Dagsopgørelse:** `GET /api/pos/daily-summary` kan levere JSON, CSV og PDF. Opgørelsen beregnes hver gang; den gemmes ikke.

Huller, som designet skal lukke:
- **Opkøb:**
  - Der kan ikke oprettes et opkøb i butikken uden en web-henvendelse.
  - Et opkøb bliver aldrig til en enhed i `devices`.
  - `trade_in_receipts.store_location_id` peger på den gamle `store_locations`-tabel.
- **IMEI og bilag:**
  - IMEI gemmes ikke på `order_items`.
  - En enhed kan slettes eller rettes (IMEI, status, butik) via `PATCH /api/platform/devices/[id]`.
- **Lager:** `PATCH /api/platform/sku-stock` sætter antal direkte uden at skrive en lagerbevægelse.
- **Kassen:**
  - Ordrer kan gå fra `confirmed` til `cancelled`.
  - Kassen tager `locationId` og `registerId` fra browseren, og der tjekkes ikke, om medarbejderen hører til butikken.
- **Login og butikker:**
  - Der er ingen pinkode og ingen tilladelser pr. medarbejder; der findes kun rollerne employee, manager, owner og intern.
  - Butikkerne er hårdkodet til `vejle | slagelse | webshop` (`lib/auth/store-scope.ts` og `store-config.ts`). Esbjerg og Vejle Gågade findes ikke.
- **Rapporter og regnskab:**
  - Der er ingen brugtmoms-rapport, ingen grafer og ingen Dinero-API. Der er kun en kassekladde som CSV med pladsholder-konti.
  - SAF-T-eksporten har stadig det forkerte CVR (44588819) og kender ikke POS-kreditnotaer.
- **Hardware:** Der er ingen styring af bonprinter eller kasseskuffe. Der printes kun PDF via `window.print`.
- **Hastighed:**
  - Hvert API-kald slår login op to gange: én gang i middleware og én gang i `requireStaff`.
  - Der findes ingen `loading.tsx`.
  - Menutallene (`/api/admin/nav-counts`, 7 tællinger) hentes ved hver navigation.
  - "Betal" venter på garantier og bon-PDF, før kassen svarer.

## Delprojekter og rækkefølge

Hvert delprojekt får sin egen plan og bygges og går live for sig. Rækkefølgen er valgt, så fundamentet kommer først. Hastigheds-hurtigvindere (D0) kan laves først, fordi de er små og mærkes hver dag.

### D0. Hastighed, hurtigvindere

Ejerens ord: "klikkene føles ikke så smooth".
- **Ét login-opslag pr. kald.** Middleware giver medarbejderen videre til routen, eller `requireStaff` genbruger resultatet inden for samme kald.
- **`loading.tsx`** på alle server-renderede admin-sider, så der kommer et skelet med det samme.
- **Menutal** hentes kun ved fokus og med et interval, ikke ved hver navigation. Ét kald i stedet for 7 tællinger.
- **Betal i kassen:** svar, så snart salget er bogført. Garantier og bon-PDF laves bagefter (efter-svar eller i baggrunden), og bonen hentes separat.
- **Lister uden grænse** (fx opkøb `select("*")`) får grænser og paginering.
- **Mål:** synlig reaktion på et klik under 100 ms og navigation mellem admin-sider under 500 ms på butikkens net. Builderen måler før og efter på de 5 mest brugte sider.

### D1. Fundament: butikker, firma og medarbejdere

- **Butikker som data.** Butikkerne er Webshop, Vejle, Vejle Gågade, Esbjerg og Slagelse. Hver butik har firma (juridisk enhed), kasser og adresse. Esbjergs adresse må ikke vises offentligt, før ejeren melder den ud; kun "Esbjerg". `store-scope.ts`, `store-config.ts` og `StoreId` skal ikke længere hårdkode listen.
- **Juridisk enhed pr. butik.** Hver butik har en juridisk enhed:
  - Webshop, Vejle, Vejle Gågade og Esbjerg: Fixon ApS (CVR 46079019).
  - **Slagelse: PhoneGo ApS** (ejerens svar 2026-11-06).

  Hjemmesiden viser kun Fixon (ejerens beslutning). Bilag, der udstedes i en butik, viser butikkens egen enhed, fordi sælger på en bon og køber på en slutseddel juridisk skal være det firma, der handler. Det gælder bon, faktura, slutseddel og reparationskvittering. Dagsopgørelser, brugtmomsrapport og Dinero holdes adskilt pr. enhed. Slagelse indgår ikke i Fixons regnskab.
- **Medarbejdere:** hver medarbejder har sit eget login og sin egen pinkode.
  - Kassen kan skifte medarbejder med pinkode uden at logge browseren ud. Det gør det muligt at dele en kasse-pc.
  - Pinkoden er 4–6 cifre og gemmes som hash. Kassen låses efter flere forkerte forsøg.
- **Tilladelser pr. medarbejder** sættes af ejeren. Ejerens ord: "de må gerne, hvis vi giver dem lov". Tilladelserne er:
  - se indkøbspris og avance
  - se andre butikkers omsætning
  - godkende opkøb over et beløb (beløbet kan indstilles)
  - rette priser
  - give rabat over en grænse
  - lave retur
  - lukke dagen
  - se statistik
  - eksportere
- **Standardrettigheder:** ansatte ser alt i egen butik og lageret i alle andre butikker, men ikke indkøbspris og avance, medmindre de har fået lov.
- **Serveren afgør butik og kasse** ud fra medarbejderen og den valgte kasse. Alle `/api/pos/*` tjekker, at medarbejderen må bruge butikken.

### D2. Opkøb i butikken og brugtmomskæden

Det vigtigste delprojekt for ejeren. Beskrivelsen er godkendt af ejeren i samtalen.

- **Nyt opkøb fra disken.** Det kan oprettes uden web-henvendelse, af alle ansatte i alle butikker.
- **Flere enheder på én seddel.** Hver enhed har:
  - IMEI eller serienummer, med scanning og kontrol af IMEI-format
  - model, stand og batteriprocent
  - et prisforslag og den endelige pris
  - en note i fritekst
- **Prisforslag** kommer fra den eksisterende opkøbspris-motor (`buyback_prices`). Ved siden af vises "Green.dk giver" til sammenligning. Ejeren vil have prisen hentet automatisk, "hvis det ikke er for besværligt". Builderen tjekker først Green.dk's vilkår, og om prisen kan hentes stabilt, f.eks. med et cachet opslag pr. model og stand. Hvis ikke, bruges et link, der åbner Green.dk med modellen.
- **Sælger:**
  - Privatperson: navn, adresse, telefon, e-mail og ID-type (pas, kørekort, sundhedskort). Ikke CPR-nummer.
  - Firma: CVR-opslag (`/api/customers/cvr` findes i forvejen) og vedhæftet købsfaktura.
- **Spærre-tjek.** To påkrævede flueben:
  - "Find My/iCloud er slået fra"
  - "enheden er ikke spærret eller meldt stjålet"
  - Tidspunkt og medarbejder gemmes.
- **Ingen godkendelse.** Medarbejderen i butikken godkender selv sine opkøb (ejerens svar). Det logges, hvem der lavede opkøbet og til hvilken pris. Statistikken viser opkøb pr. medarbejder, så ejeren kan følge med.
- **Slutseddel:**
  - Den printes på A4 og underskrives med kuglepen.
  - Medarbejderen tager et billede eller scanner af den underskrevne seddel og lægger det på opkøbet.
  - Opkøbet kan først markeres "udbetalt", når billedet er lagt op.
  - Slutsedlen sendes også på mail til sælgeren, hvis der er en e-mail.
- **Udbetaling.** Sker som bankoverførsel (2–3 dage). Medarbejderen registrerer reg.nr. og kontonummer og markerer manuelt "udbetalt" med dato. Udbetalingen går ikke gennem kasseskuffen.
- **Byttehandel.** Et opkøb kan modregnes i et køb i samme handel.
  - Kassen viser opkøbet som en modregning med henvisning til slutsedlen.
  - Salget og opkøbet bogføres hver for sig som salg og køb. De nettes ikke ud i bogføringen.
  - Kun et eventuelt restbeløb betales eller udbetales.
- **Opkøb bliver til lagerenhed.** Når slutsedlen er bekræftet, oprettes én `devices`-række pr. enhed med:
  - IMEI og indkøbspris
  - `vat_scheme` (`brugtmoms` ved køb fra privat; `regular` ved køb på faktura med moms)
  - butik
  - en kobling til slutsedlen eller fakturaen i `purchase_documents`
- **IMEI er låst efter salg:**
  - Ved salg gemmes IMEI, indkøbspris og momsordning som et snapshot på `order_items`.
  - En solgt enhed kan ikke slettes, og dens IMEI og indkøbspris kan ikke ændres.
  - Rettelser før salg logges.
- **Salg uden registreret indkøb er tilladt** (ejerens beslutning). Kassen viser en advarsel, og salget markeres "mangler indkøbsbilag" i brugtmomsrapporten.
- **Eksisterende lager.** De enheder, PhoneGo har købt ind, flyttes til Fixon via første optælling (D3). Indkøbspris og bilag registreres, hvor de findes, og resten markeres "mangler bilag". Se åbent spørgsmål 2.
- **Datakilde.** `trade_in_receipts` skal pege på `locations` og ikke på `store_locations`. `staff_initials` som fritekst erstattes af medarbejder-ID.

### D3. Lager pr. butik

- **Én lagerplacering pr. enhed og antal pr. butik for tilbehør.** Al ændring sker via lagerbevægelser. Hullerne lukkes:
  - `PATCH /api/platform/sku-stock` skriver en lagerbevægelse.
  - Device-PATCH må ikke flytte butik eller ændre status uden om flytningsflowet.
- **Flytning mellem butikker** bruger de eksisterende transfer-RPC'er. Kostprisen følger med. Den interne afregning mellem Fixon-butikker er **kun et ledelsestal i statistikken** (ejerens svar). Den bogføres ikke i Dinero. **Flytning til eller fra Slagelse er et salg mellem Fixon og PhoneGo** og kræver en faktura mellem firmaerne. Det samme gælder, når webshoppen sælger en enhed fra Slagelses lager. Fakturaens pris (kostpris eller kostpris plus avance) bestemmer direktøren.
- **Webshoppen sælger fra alle butikkers lager.** Ordren viser, hvilken butik der skal sende eller udlevere.
- **Optælling pr. butik:**
  - Der startes en optællingssession, og medarbejderen scanner IMEI eller EAN.
  - Systemet viser mangler og overskud. Hver forskel skal forklares, før sessionen lukkes. Lukningen bogføres som reguleringer.
  - Den første optælling under Fixon er startbalancen. I har aldrig talt op før.

### D4. Lovlig kasse

- **Først et researchtrin.** Builderen finder de præcise krav i bogføringsloven og bekendtgørelsen om digitale bogføringssystemer, der gælder for et specialudviklet kassesystem. Det gælder bl.a.:
  - registrering eller anmeldelse hos Erhvervsstyrelsen og tidsfrister
  - krav til uforanderlige registreringer og logning
  - backup og 5 års opbevaring
  - bilag og bonens indhold
  - hvad kassen skal kunne ved lukning

  Kravene skrives ind i planen, og direktøren bekræfter dem, før der bygges.
- **Huller, der lukkes uanset hvad researchen viser:**
  - Ingen `confirmed → cancelled`. Annullering sker kun som kreditnota.
  - Dagsopgørelsen (Z-rapport) gemmes og låses ved lukning med et løbenummer pr. kasse. Rettelser bagefter laves som nye poster med henvisning.
  - Server-afgjort butik og kasse og tjek af medarbejder (fra D1).
  - IMEI-snapshot og sletteforbud (fra D2).
- **Flatpay-terminalen** er ekstern.
  - Medarbejderen taster beløbet på terminalen og trykker bagefter "Kort (Flatpay)" i kassen. Ejeren har godkendt dette flow.
  - Kassen viser beløbet stort, så det tastes rigtigt.
  - Ved dagens lukning afstemmes kortbeløbet mod Flatpays opgørelse. Kortafstemningen findes allerede i `20261006130000`.
  - Betalingsmetoden `kort_terminal` omdøbes eller udvides til Flatpay.
- **Bonprinter og kasseskuffe:**
  - **Fremgangsmåde: netværksprinter, der henter bonner fra vores server.** Printeren sættes på butikkens netværk med kabel og henter selv printjobs fra phonespot.dk over HTTPS. Det kan Star CloudPRNT og Epson Server Direct Print. Der skal ikke installeres noget på kasse-pc'erne, og det virker ens på Mac, Windows og iPad. Kasseskuffen sættes i printerens skuffe-stik (RJ12, det stik der ligner et netværksstik), og printeren åbner skuffen ved kontant betaling.
  - **Anbefalede modeller:** Star mC-Print3 (MCP31L/MCP30, USB+LAN, CloudPRNT, cirka 310–400 € inkl. moms hos europæiske forhandlere) eller Epson TM-m30III (LAN, Server Direct Print, skuffe-stik). Builderen køber eller låner én printer til test, før der bestilles til alle butikker.
  - **De nuværende USB-printere** kan bruges med et lille hjælpeprogram på kasse-pc'en (fx QZ Tray), som ejeren har sagt ja til. Det er reserveløsningen, hvis de nye printere ikke købes. PDF-print forbliver nødløsningen.

### D5. Rapporter og statistik

- **Dagsopgørelse pr. butik pr. dag. Den viser:**
  - omsætning delt på almindelig moms, brugtmoms og reparationer
  - betalinger pr. betalingsmiddel
  - optælling af kasseskuffen og forskel
  - opkøb udbetalt den dag
  - retur og rabatter med årsag
  - Den gemmes ved lukning (D4) og kan åbnes og eksporteres som PDF/CSV for alle tidligere dage.
- **Brugtmomsrapport til direktøren** for en valgt periode:
  - hver solgt brugtmoms-enhed med IMEI, købsdato og købspris, salgsdato og salgspris, avance og moms af avancen, og et link til bilaget
  - lagerliste over usolgte brugtmoms-enheder med købspris og kilde (privat, firma eller udland)
  - afvigelser: salg uden indkøbsbilag, indkøb uden underskrevet slutseddel, negativ avance
  - totaler til momsangivelsen
  - eksport til Excel og PDF
  - Reglerne for samlet opgørelse og negativ avance kan indstilles og bekræftes af direktøren.
- **Statistik** ("det hele"):
  - **Tal:** omsætning, avance, forbrug, opkøb og reparationer.
  - **Opdeling:** pr. butik, medarbejder, kategori og betalingsmiddel.
  - **Grafer:** interaktive, med sammenligning mod forrige periode og samme periode sidste år.
  - **Historik og eksport:** alle dage og år kan åbnes, og alt kan eksporteres til Excel/CSV/PDF.
  - **Adgang** styres af tilladelser (D1).
- **Rettelse af eksisterende eksport.** Transaktions-eksporten trækker linjerabat fra i avancen. SAF-T bruger enheden for perioden (før 2026-11-06 det gamle firma, derefter Fixon) og kender POS-kreditnotaer.

### D6. Dinero

- Dagsopgørelsen sendes som ét bilag pr. butik pr. dag (direktørens ønske) til Dinero via Dineros API. PDF'en er vedhæftet, og der er posteringslinjer pr. konto.
- Kontoplanen mappes af direktøren på en indstillingsside og erstatter pladsholderne i `lib/pos/dinero-mapping.ts`.
- Opkøb sendes som købsbilag med slutsedlen vedhæftet. Det er builderens forslag, og direktøren bekræfter.
- Afsendelse kan genprøves uden dubletter (idempotent på butik+dato). Status pr. dag vises: sendt, fejlet eller afventer.

## Overladt til builderen

- Datamodel og migrationer i detaljer, inden for reglen om at der kun tilføjes og aldrig ændres.
- Graf-bibliotek og eksportbiblioteker.
- Hvordan pinkode-skift implementeres i sessionen.
- Hvordan "efter svar"-arbejde i kassen udføres (`after()` i Next eller en kø).
- UI-layout, så længe det følger designreglerne i `docs/` (DM Sans, sentence case, ingen emojis, ikke "AI-generisk").

## Mine valg undervejs (ejeren kan ændre dem)

- Underskrift på papir med billede eller scanning, og "udbetalt" kræver billedet.
- Byttehandel bogføres som et separat salg og køb, ikke som et nettobeløb.
- Salg uden indkøbsbilag giver advarsel og markering, ikke blokering.
- D0 (hastighed) laves først.
- **Lovresearch før D2.** Researchtrinnet fra D4 dækker også reglerne for erhvervsmæssig handel med brugte genstande: politiets krav, protokol og hvilke ID-oplysninger der skal registreres om sælger. Researchen laves før D2, så opkøbsskemaet ikke skal bygges om. Felterne for ID-oplysninger designes, så de kan udvides.
- **Momsordning ved indkøb** sættes efter denne tabel, som direktøren bekræfter:

  | Køb fra | Momsordning |
  |---|---|
  | privatperson (slutseddel) | brugtmoms |
  | firma på faktura med moms | almindelig moms, købsmomsen trækkes fra |
  | firma eller EU-leverandør, der selv sælger med brugtmoms (faktura uden moms, fx Foxway) | brugtmoms |

  Den ansatte vælger kun, om sælgeren er "privat" eller "firma". Ordningen udledes af svaret og fakturatypen.
- **Opkøb via hjemmesiden** følger samme kæde som opkøb i butikken. Når enheden er modtaget, bliver den en lagerenhed med IMEI, indkøbspris, momsordning og en kobling til slutsedlen. Online godkendelse af tilbuddet erstatter underskriften.
- **Webshoppen får sin egen dagsopgørelse og sit eget Dinero-bilag.** De bygges af webshop-ordrer og online reparationsbetalinger og afstemmes mod udbetalingerne fra Stripe/Flatpay. Omsætningen bogføres på webshoppen, der solgte. Enhedens kostpris kommer fra den butik, der sendte enheden.
- **Ny nummerserie for Fixon.** Bon- og opgørelsesnumre starter forfra under Fixon den dag, Flatpay går live. Indtil D4/D6 er færdige, kan direktøren hente dagsopgørelsen som CSV og PDF fra den eksisterende `GET /api/pos/daily-summary`. Låsningen af Z-rapporten (D4) rykkes frem, så den ligger lige efter D1.
- Dagsopgørelse og Z-rapport gemmes og låses i stedet for at blive beregnet hver gang.
- Opkøb sendes til Dinero som købsbilag.

## Åbne spørgsmål

1. **Slagelse = PhoneGo ApS (afklaret).** Åbent: Hvilket Dinero-regnskab bruger PhoneGo? Skal Slagelses dagsopgørelser også sendes til Dinero?
2. **Overtagelse af PhoneGos lager:** Hvordan skal direktøren have lageret overdraget fra PhoneGo til Fixon? Som en faktura mellem firmaerne, og til hvilken pris? Kan enheder uden kendt indkøbspris sælges med brugtmoms?
3. **Green.dk-priser (afklaret):** Prisen hentes automatisk, hvis det er muligt. Ellers bruges et link.
4. **Printere (afklaret):** Ejeren vil have forslag. Se D4. Ejeren vælger model og antal, før der bestilles.
5. **Dinero-adgang:** Direktøren skal oprette API-adgang (klient-ID og nøgle) til Fixons Dinero-konto.
