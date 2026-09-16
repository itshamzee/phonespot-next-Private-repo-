# Aflevering af det godkendte PhoneSpot-design

Status: de syv sideområder er implementeret og hver især gennemgået. Den samlede slutgennemgang og alle 12 rettelser er godkendt. Forsiden er i draft PR #3; øvrige ændringer er lokale. Main og produktionen er ikke ændret.

## Omfang

- Forside, fælles navigation og footer: godkendt hero, kategorier, reparation og enhedssalg, butikker og søgeindgang.
- Enhedskategorier: iPhones, iPads, bærbare, smartphones, smartwatches og bærbares prisgrupper.
- Enhedsprodukter: galleri, stand, lagerplads, farve, batteri, lagerstatus, tilvalg og kurvhandling.
- Reparation: forside, mærke/model, servicevalg, inline booking, flere enheder og bekræftelsesside.
- Sælg din enhed: model og egen model, flere enheders stand, kontakt/butik samt private tilbudssider.
- Tilbehør og beskyttelsesglas: kategori, filtre, kompatibilitet, varianter, lagerstatus, kurv og lokale glassider.
- Butikker, kvalitet, garanti, kontakt, FAQ og søgning.

## Kontrol og begrænsninger

Hvert område har separat spec- og kvalitetsreview. Browserkontrollen omfatter desktop 1195/1440 og mobil 390/320, hvor relevant: læsbarhed, hele billeder, ens kort, tastatur, fokus, dialoger, fejl/tomt udvalg, links og metadata. Ingen rigtige ordrer, bookinger, vurderinger eller tilbudsaccepter er sendt.

Den lokale forhåndsvisning anvender en læsebeskyttet datavisning med offentligt katalogudsnit og tydelige syntetiske testscenarier. Testvarer, priser og billedvalg fastlægger ikke det endelige katalog og indgår ikke som fixtures i produktionskoden. Det lokale søgematch erstatter ikke PostgreSQLs søgefunktion.

Før offentlig release skal faktisk lager, SKU-attributter, reservationer og øvrige integrationer kontrolleres i staging. Apple-kampagnebilledets brugsret skal afklares. Et verificeret eget foto af Vejle mangler; generiske billeder er ikke fremstillet som dokumentation for butikken.

Den første fulde kørsel efter Task 7 havde én tidsoverskridelse under parallel belastning. Uændret formularfil bestod isoleret, og uændret samlet kode bestod med to samtidige testarbejdere: 104 filer, 712 tests, én forventet lager-/credential-afhængig udeladelse. Efter slutrettelserne bestod 105 testfiler med 720 tests og én forventet udeladelse. Produktionsbygningen bestod inklusive TypeScript og 292 statiske sider. Slutrettelsens 42 fokuserede tests, typecheck og lint bestod, og en separat kontrol godkendte alle 12 fund uden nye fejl. Se slutkontrol.md for evidens.

## Sider med eksisterende særskilt layout

Fælles navigation og footer er ændret bredt, men følgende er ikke individuelt redesignet i denne leverance: Om os/Hvorfor PhoneSpot, blog og artikler, sammenligninger, øvrige model-/kampagne-/lokale SEO-sider, iPhone 18-tilbehør, restsalg/prismatch, juridiske sider, delbetaling/forsikring, konto/ordrer/reklamation, B2B og reservedele. Enkelte generiske SKU-detaljer fra søgeresultater beholder også deres eksisterende layout. Admin, checkout, betalings- og fragtlogik er ikke ændret.

## Review og integration

Forside: https://github.com/itshamzee/phonespot-next-Private-repo-/pull/3 (draft).

De øvrige sider er opdelt i lokale branches, dokumenteret i status.md. De er afhængige af hinanden og skal gennemgås som en samlet kæde inden release. Ingen merge eller deployment er udført. Den automatiske eksportkontrol kræver særskilt godkendelse af de senere ændringer; den hidtidige godkendelse omfattede kun forsiden.

## Beslutninger under arbejdet

1. Arbejdsnoter og reviewpakker oprettes med PowerShell, fordi skillens Bash-hjælpere ikke virker i dette Windows-miljø. Det ændrer ikke webshoppen; risikoen er uens dokumentation, som modvirkes med eksplicitte commitreferencer.
2. De gamle skrifttypealiaser indlæste andre fonte end navnene angav. De indlæser nu faktisk DM Sans og Barlow Condensed. Det kan ændre tekstmål på eksisterende sider; derfor kontrolleres hovedsiderne ved flere skærmbredder.
3. Visuel kontrol bruger en lokal læsebeskyttet datavisning med tydeligt markerede testscenarier. Ingen testvarer indgår i produktionskoden. Det muliggør kontrol uden hemmeligheder, men erstatter ikke kontrol mod rigtige stagingdata.
4. Forsidens MacBook-link beholder den godkendte destination /baerbare?brand=apple. Kategorisiden skal derfor forstå og kunne nulstille det eksisterende queryfilter. En ny URL-struktur ville kræve unødvendige ændringer i routing og SEO.
5. Den inaktive nyhedsbrevstilmelding er fjernet fra popup og footer: den ene loggede kun email, den anden pegede på en manglende API-route. Øvrige providers er bevaret. Hvis der senere tilsluttes et rigtigt tilmeldingssystem, skal formularen bygges ind igen.
6. Opdigtede fallbackanmeldelser er fjernet. Uden indlæste anmeldelser vises den korrekte rating og link. Det giver færre anmeldelseskort, men ingen ukorrekt præsentation af fiktive citater som kunders erfaringer.
7. Tilbehørets offentlige feltprojektion og lagerstatus er gjort ensartet på tværs af produktliste og butiksfilter. Lagerkontrakten skal fortsat kontrolleres i staging; interne tabeller og administrative flows ændres ikke.
8. Søgehjælperens eksisterende fejl må kastes videre til søgeresultatsiden, så teknisk fejl og tomt resultat kan skelnes. Queries og søgealgoritme bevares. Berørte kaldere skal håndtere fejlen korrekt.
9. Kategorier får eksplicit enhedstype til standforklaring og FAQ, også ved tomt udvalg. Det forhindrer telefonforklaringer på laptops og ure. En forkert kategorimapping vil være synlig i den pågældende vejledning og skal rettes dér.
10. Offentlige produktvisninger bruger udtrykkelige feltlister. Hvis et nødvendigt UI-felt mangler, kan det tilføjes til den relevante offentlige liste; interne queries og typer bevares.
11. Laptopproduktet må vise grundpris, valgte opgraderinger og samlet pris med den eksisterende kurvkontrakt. Klarna-visningen skal klart angive, hvis den vedrører grundprisen. Beregningen af ordre eller finansiering ændres ikke; beløbene kontrolleres mod de eksisterende valgte tilvalg.
12. Reparationslinks med queryvalg må kun vælge en service med positiv angivet pris. Nulpris henviser til kontakt. Hvis en faktisk gratis reparation skal tilbydes, kræver det en udtrykkelig understøttet betydning af gratis frem for at fortolke manglende pris som nul kroner.
13. Linket fra inline booking til den separate flerenhedsbooking hedder nu “Start en booking med flere enheder”, fordi det starter et nyt forløb. Det lover dermed ikke, at den aktuelle kurv flyttes med. Destinationens opførsel ændres ikke.
14. “Tilføj enhed” i booking går tilbage til modelvalget og aktiverer den nye enhed, mens tidligere valg bevares. Det giver et ekstra modeltrin, som er nødvendigt for at kunne vælge en anden enhed korrekt.
15. Samme enhed kan vælge én kvalitet af samme reparationskategori; valg af Premium erstatter eksempelvis Standard på samme skærm. Andre reparationer og andre enheder bevares. To alternative skærmkvaliteter på én enhed kan ikke længere lægges sammen som to reparationer.
16. Et mistænkt telefon-/emailproblem blev korrigeret som fejldiagnose: browserkontrollen skjulte inputværdier, men den afsluttende oversigt viste de bevarede data. Synkron aflæsning af inputevent blev beholdt som en lille robusthedsændring. Der hævdes ikke en rettet nulstillingsfejl.
17. Vejles eksisterende bookinglink med store=vejle bevares på butikssiden. Ellers kan en kunde starte med den anden butik valgt. Kun allerede understøttede queryparametre bruges.
18. Et generisk værkstedsbillede med uafklaret sted/proveniens bruges ikke som dokumentation for en bestemt butik. Den godkendte butiksfotografi og verificerbare adresseoplysninger prioriteres. Vejle kan derfor vises uden et eget foto, indtil et korrekt foto foreligger.
19. Kurvens tre udokumenterede reklameudsagn om popularitet, fast startpris og 30 minutters reparation må ændres til neutral tekst med samme links. Kurv, betaling, fragt og forsikringsflow bevares. Det koster noget reklamespecifik formulering, men ændrer ingen handel.

Ejerens godkendte symmetri er fulgt på de nye flader. Main og produktionen ændres ikke. Apple-kampagnebilledets offentlige brugsret skal afklares inden udgivelse.

20. Slutkontrollen køres med to samtidige testarbejdere efter den reproducerede belastningsforskel. Ingen timeout eller tests er gjort svagere. Hvis årsagen alligevel er en sjælden race, kræver den yderligere diagnose ved et nyt reproducerbart udfald.
21. Lokale reviewbranches følger de gennemgåede sidegrænser og er afhængige af hinanden. Det holder reviewene overskuelige; forkert integrationsrækkefølge kan dog give manglende fælles funktioner. Kæden skal derfor vurderes samlet inden release.

22. Slutrettelserne omfatter også arvede fejl i de gennemgåede forløb: bærbare templates får deres eksisterende refurbished-destination, uventede tekniske fejl får sikker dansk hjælpetekst, og den dobbelte Klarna-beregning fjernes fra visningen. Eksisterende routing, payloads og finansieringsberegninger bevares. Risikoen er mindre specifik fejlhjælp, hvis en nyttig serverbesked ikke er på den kendte liste; den kan tilføjes eksplicit senere.

Da main automatisk udgiver produktionen, er reviewkæden ikke en instruktion om at udgive én del ad gangen. En senere godkendt release skal omfatte den kontrollerede samlede slutbranch; separate tidlige merges til main kan ellers udgive en ufuldstændig mellemversion. Ingen sådan integration er udført eller planlagt uden ny instruktion.

23. Den ignorerede lokale kontrolmappe beholdes, mens forhåndsvisning og godkendelse af de øvrige draft PR'er afventer. Ellers forsvinder grundlaget for den lokale datavisning og de forberedte beskrivelser. Beslutningerne er samtidig bevaret i denne rapport. Ulempen er midlertidigt lokalt diskforbrug; testdata eksporteres ikke.
