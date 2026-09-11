# Status for sidearbejdet

Mandat: implementér ejerens godkendte revision 3 side for side. Ingen merge eller deployment.

Arbejdsmappe: `C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-hero`
Branch: `codex/godkendt-design`, fra `origin/main` (`1a2a18b`).
Plan: `docs/superpowers/plans/2026-09-11-godkendt-design.md`.
Den godkendte selvstændige designreference er bevaret uændret.

## Fremdrift

- Task 1: færdig og godkendt. Commits 729c6a2 + 0469fb3, dokumenteret i 21fa954. Desktop 1195/1440 og mobil 390/320 kontrolleret. Efter ejerens udtrykkelige eksportgodkendelse er forsiden sendt som draft PR #3: https://github.com/itshamzee/phonespot-next-Private-repo-/pull/3 . Ingen merge.
- Task 2: færdig og godkendt. Commits 1a48f1d, a651198 og f4716c5. iPhones, iPads, bærbare, smartphones, smartwatches, fælles filtre/kort og bærbare prisniveauer. Filterdialogens breakpoint, fulde baggrundslås, fokusstyring og brandquery er rettet og genkontrolleret.
- Task 3: færdig og godkendt i 836cca0, 1cd8eef og 635bf4f. Telefon- og laptopprodukt, variantvalg, galleri, batteri, køb, udsolgt, kategori-FAQ og korrekte standbilleder. Laptop viser nu grundpris, tilvalg og samlet pris med uændret kurvkontrakt. Opdigtede fallbackanmeldelser er fjernet.
- Task 4: færdig og godkendt i 5ff8ff9, 54b0d3f, 4816886 og 4a972d9. Reparationsforside, mærker/modeller, servicevalg, inline booking og booking med flere enheder. Task 5: næste side er Sælg din enhed. Task 6-8 er forberedt.
- Ændringer efter forsiden er fortsat lokale. Main og produktionen er uændrede.

## Kontrol

- Task 1: fokuserede interaktionstests, typecheck, lint og side-review bestået. Inaktiv nyhedsbrevstilmelding fjernet: popup loggede kun email, og footer pegede på et manglende endpoint. Øvrige providers og cookie-/kontakt-/forsikringslinks bevaret.
- Fuld test på a651198: 84 filer, 613 bestået, 1 sprunget over. Build bestået. Den udeladte test kræver rigtigt lager.
- Task 2 fixrunde på f4716c5: 59/59 produktkomponenttests, typecheck og målrettet lint bestået; spec- og kvalitetsreview godkendt.
- Root: 390 til 1195 px filtervalg bevaret, fokus omslutter dialogen, header/footer er inaktive, desktopskift rydder scroll-lås. 320 px: panelet passer, Escape returnerer fokus. Apple-query viser 1 MacBook; reset viser alle 4 testmodeller og neutral titel. Budgetside med tomt udvalg har korrekt antal, vejledning, butikker og FAQ. Desktopkort har ens størrelse og DM Sans.
- Browserens skærmbilleder med viewport-override kan blive beskåret forkert; derfor suppleres de med DOM-mål og faktiske interaktioner. Slutkontrollen skal bruge konsistente viewport-optagelser.
- Lokal forhåndsvisning på 3107 bruger isolerede læsedata på 3112. Lager/batterivariationer er delvist syntetiske QA-data; de indgår ikke i webshopkoden og er ikke live lager. Ingen rigtige ordrer eller formularer er indsendt.
- Ingen hemmeligheder eller `.env.local` er læst. Admin, migrationer, betaling og fragt er uændrede.
- Apple-kampagnebilledets offentlige brugsret skal afklares før release.

## Beslutninger og begrænsninger

- Godkendelsen af udtrykket og mandatet til sidevis arbejde er implementeringsmandat. Arbejdet foregår isoleret og kan gennemgås før udgivelse.
- Hovedkunderejser og fælles templates prioriteres før individuelle blog- og indholdssider. Afleveringen skal nævne resterende sider ærligt.
- Browserkontrollen gik i stå i flere timer natten til 11. september. Lokale forhåndsvisninger er genstartet. Nattens automation er sat på pause ved morgenfristen; det aktive autoriserede arbejde fortsætter.
- Automatisk kontrol krævede udtrykkelig godkendelse af eksport til GitHub. Ejerens svar omfattede forsiden i 21fa954; senere lokale sider er ikke sendt endnu.

## Produktsidens kontrol

- Task 3: 18 testfiler, 115 bestået og 1 forventet credential-afhængig skip. Typecheck og målrettet lint bestået. Separat spec- og kvalitetsreview godkendt uden fund.
- Browser: telefon og laptop på desktop samt mobil 390/320, variantpris/batteri, udsolgt vare og alternativer, rigtige kategori-standfotos, metadata og tilvalgssum kontrolleret. Eksempel fra lokale QA-data: 5.199 + 400 + 300 = 5.899 kr.; Klarna-visningen er tydeligt afgrænset til grundprisen.
- Eksisterende kort SSR-overgang til korrekt lagervariant er bevaret. Fuld suite/build køres igen på den færdige integration før næste eksport.
- Den offentlige SKU-projektion for tilbehør undersøges og afgrænses i Task 6: indkøbspris og leverandør-id skal ikke serialiseres til klienten. Det er en snæver præsentationsgrænse; interne queries/admin og økonomiske beregninger bevares.


## Reparationssidernes kontrol

- 34/34 fokuserede tests, typecheck og målrettet lint bestået. Separat spec- og kvalitetsreview godkendt uden kritiske eller vigtige fund.
- Browser:1195/390/320, søgning med tastatur, tomt modeludvalg, kvalitetsvalg, total, tilbage, flere enheder, butik og dato. Ingen rigtig booking eller betaling sendt.
- Samme enhed kan vælge én kvalitet af samme reparation; andre reparationer og enheder bevares. Tilføj enhed går til modelvalg og aktiverer den nye enhed. Prisløse services henviser til kontakt.
- Payload- og indsendelsesfunktionerne i begge bookingflows er uændrede; kun lokale valg, præsentation og navigation er rettet.
- Et mistænkt inputproblem viste sig at være kontrolværktøjets skjulte telefon-/emailværdier. Den afsluttende oversigt bekræftede, at oplysningerne var bevaret. Der hævdes ikke en rettet inputfejl.
- Mindre punkter til slutpolering: lys fokusmarkering på den grønne reparationshero og gentaget mærke/modelnavn i bookingoversigten.

## Salgssidens kontrol

- Task 5 er færdig i 4af0146 og 9361d33. Separat spec- og kvalitetsreview godkendt; 13/13 tests, typecheck og lint bestået.
- Desktop 1195 og mobil 390/320: kort introduktion, tidlig formular, tastaturvalg, egen model, to enheders særskilte stand og bevaret tilbage-navigation. Butiksvalg og kontakt gør afsendelse tilgængelig. Intet er indsendt.
- Private tilbudssider viser hjælp ved manglende token og har egne canonical/noindex. Accept-/afvisningskontrakter er bevaret.
- Mindre punkt til slutpolering: undgå en ugyldig aktiv valgreference ved pil op i en tom søgeresultatliste.
- Task 6 er næste: tilbehør, kompatibilitet og beskyttelsesglas. Task 7-8 er forberedt.

## Tilbehør og beskyttelsesglas

- Task 6 er færdig i 63bc352, 51f404f, f75f0a9, e8a767e, 14e3bb7 og 5257ba6. Separat spec- og kvalitetsreview godkendt efter rettelse af dansk fejlhjælp og kortvarig kurvbekræftelse.
- 51/51 fokuserede tests; fixrundens grid/kort 5/5, typecheck og målrettet lint bestået. Fuld suite/build afventer færdig integration.
- Desktop og mobil: ens kort, hele produktbilleder, URL-filtre, dialogfokus og baggrundslås, butikslager, udsolgt, variant i kurv, glassets model-/variantvalg og lokale Vejle/Slagelse-sider kontrolleret. Ingen ordrer eller henvendelser indsendt.
- Offentlig tilbehørs-API skelner faktisk butikslager, bestillingsvarer, ukendt status og udsolgt. Indkøbspris og leverandør-id udelades ved tre server/client-grænser. Produktionslager og faktiske attributdata kræver kontrol i staging før release.
- Task 7 er næste: butikker, kvalitet, garanti, kontakt, FAQ og søgeindgang. Task 8 samler slutkontrollen. Ændringer efter forsiden er fortsat lokale.
