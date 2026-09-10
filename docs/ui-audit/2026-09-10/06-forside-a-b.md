# Første implementering: forside A+B

Ejeren valgte A+B efter [beslutningsoplægget i PR #1](https://github.com/itshamzee/phonespot-next-Private-repo-/pull/1). Dette er en separat, afgrænset implementering af hero og den umiddelbare overgang. Tilbehørsflow og resten af forsiden følger som særskilte opgaver.

## Resultatet

- A: selvstændig displayoverskrift, bredt fotografi til venstre og smallere købsindgang til højre. På mobil kommer forklaring og køb før fotografiet.
- B: butiksfortælling med et eksisterende interiørfoto og link til Vejle/Slagelse. En ny scene med medarbejder/kunde er stadig ønsket.
- De otte tidligere kategori-/servicekort bliver enkel tekstnavigation med de samme destinationer. Ingen statiske fra-priser eller “bestseller”-mærker i den nye topsektion.
- DM Sans til tekst/links, Barlow Condensed til displayoverskrifter. Skrifttyperne afgrænses til den nye komponent: `src/lib/fonts.ts` eksporterer ellers Plus Jakarta Sans under navnene `barlowCondensed`/`dmSans`. En global skrifttypeændring er ikke medtaget.
- Eksisterende farvetokens genbruges. Der er ingen ny animation, klienttilstand, datahentning eller tracking.

Forsidens canonical og de efterfølgende produkt-, opkøbs-, anmeldelses- og FAQ-sektioner er uændrede. Eksisterende globale indholdsuoverensstemmelser, herunder Trustpilot 4.8 mod AGENTS.md's 4,7, er fortsat separate auditfund; den nye komponent indfører ingen rating.

## Fotografi før lancering

Den første version genbruger `public/blog/covers/iphone-pro-dark.jpg` (1200 × 1800) og `public/images/store/butik-indvendig.jpg` (1600 × 1200). De er visuelt gennemgået. Heroen er et nærfoto med fotografisk dybdeskarphed, ikke den eksisterende telefonillustration eller et genereret banner. Butiksfotoet bruges allerede som PhoneSpot-interiør på reparationssiden.

Billedernes originale kilder og rettighedsdokumentation følger ikke med i filerne. Bekræft dem før lancering. Blogfotoet dokumenterer hverken et bestemt lagereksemplar, dets stand eller batteri; derfor knyttes ingen modelpris, grad eller lagerpåstand til billedet. Det er ikke det endelige produktvalg for det kommende katalog.

Ønskede erstatninger:

1. En blivende iPhone-model, tæt for-/bagside eller 3/4-vinkel på mat neutral baggrund. Blødt sidelys, naturlig skygge, mindst 3000 px på lang led. Lever både vandret 3:2 og mobil 4:3 uden tekst, priser eller emballage. Gem model og fotografisk kilde.
2. En medarbejder, der viser en konkret enheds stand til en kunde ved PhoneSpots disk. Vandret 4:3, ingen persondata på skærme, afklaret samtykke. Billedteksten skal beskrive den faktiske handling/lokation.

PR'en er et udkast til visuel gennemgang, ikke en ordre om lancering. Ingen merge eller push til main.

## Validering

- `npm run test:run`: 80 testfiler bestod; 601 tests bestod og én eksisterende test blev sprunget over. Samme resultat før og efter ændringen.
- ESLint på begge ændrede kildefiler: bestod. `git diff --check`: bestod.
- `npm run build`: kompilering, typekontrol og 287 statiske sider bestod med lokale, ugyldige testværdier til Resend/Supabase. Bygning uden dem stopper ved eksisterende integrationers initialisering. Ingen produktionsnøgler eller `.env.local` blev læst; databaseafhængige sider har derfor ingen rigtig katalogdækning i denne kontrol. Forventede fetch-fejl med den lokale testadresse blev logget.
- Browser: 1440 × 1000, 390 × 844 og 320 × 740. Én H1, korrekt faktisk Barlow-font, ingen vandret overflow i heroen, synlig købsknap før billedet på mobil og tydelig 2 px fokusmarkering på kvalitetslinket.
- “Find din butik” og “Sådan vurderer vi standen” åbner de relevante sider. “Se iPhones” navigerer til `/iphones`, men destinationssiden kræver den manglende databasekonfiguration; køb med rigtige varer er ikke testet.
- Separat kodegennemgang fandt ingen introducerede fejl, der kræver rettelse.

Visningen er undersøgt med ændret browservindue, ikke en fysisk iPhone/Safari. Der er endnu ingen målt konverteringseffekt.
