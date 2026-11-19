# Animationer på phonespot.dk: analyse og plan

19. november 2026. Anden runde. Første runde gav produktkort, vælgere, læg i kurv, menuer, FAQ og formularer små, hurtige bevægelser. Denne runde dækker resten af den offentlige side, plus to nye ønsker fra ejeren: bløde sideskift og en mere levende hero.

Vigtigt: alt herunder er vurderet ud fra koden. Intet er set i en browser eller på en telefon i denne runde. Alt er derfor ubekræftet, indtil nogen har klikket det igennem (se tjeklisten nederst i rapporten til ejeren og afsnit 5).

## 1. Kort fortalt

**Hvor står siden nu?** Efter de to runder reagerer næsten alt, man trykker på: knapper giver en anelse efter, kort løfter billedet, paneler glider ind fra den kant, de hører til, og tal, der skifter (pris, lager, total), toner kort ind i stedet for at blinke. Hele siden bruger de samme to kurver og de samme få varigheder, så det føles som ét sted og ikke som en samling effekter.

**De 5 ændringer, kunden vil mærke mest**

1. Bløde sideskift: når man klikker rundt på sitet, toner den nye side frem på ca. 0,2 sekunder. Menu, kurv og chat står stille.
2. Forsidens hero: slides glider ind fra den side, man bladrer mod, og den grønne fanemarkering glider med til den valgte fane.
3. Produktsiden: hovedbilledet toner over, når man vælger et andet billede eller en anden farve, og prisen og lagerlinjen toner ind, når man vælger stand eller lagerplads.
4. Kurven: en ny vare glider ind, og antal, linjepris og total toner kort ind, når man trykker plus eller minus.
5. Kassen: leveringskort giver efter ved tryk, valg af pakkeshop folder sig blødt ud, og fejlbeskeder glider ind i stedet for at dukke op med et ryk.

**Det, vi bevidst ikke animerer**

- Tekst og billeder, der først bliver synlige, når man ruller (fade-in ved scroll). Google og langsomme telefoner kan se en tom side. Den gamle FadeIn-komponent gjorde netop det på om-os, delbetaling, forsikring og prismatch; den er nu lavet om, så indholdet altid er synligt.
- Hero-billedet ved indlæsning. Det er det største element på siden og afgør, hvor hurtig siden føles (LCP, se afsnit 5). Det står helt stille.
- Priser, der "tæller op". Det forsinker den information, kunden leder efter.
- Noget, der kører i ring af sig selv (karrusel, der skifter selv, pulserende prikker, løbende tekst). Det stjæler opmærksomhed og er svært for folk med bevægelsesfølsomhed.
- Parallakse, effekter der følger musen, konfetti og hop.

## 2. Principperne

- **Først formålet.** Hver bevægelse skal enten bekræfte et tryk, vise hvor noget kom fra, gøre en ændring tydelig eller fjerne et ryk. "Det ser fedt ud" er ikke en grund.
- **Hurtigt.** Tryk 150 ms, små paneler og værdier 160 til 220 ms, ark og skuffer 240 til 260 ms. Intet over 300 ms. Kurven starter hurtigt og lander blødt, så det føles svarende med det samme.
- **Kun billige egenskaber.** Vi flytter, skalerer og toner (transform og opacity, det browseren kan gøre uden at regne siden om) og skifter farver. Vi ændrer aldrig størrelser eller marginer, så intet på siden skubbes.
- **Mus og touch er forskellige.** Hover-effekter (når musen holdes over) virker kun med mus. På telefon bruges tryk-feedback i stedet, så intet hænger fast efter et tryk.
- **Reduceret bevægelse.** Har kunden slået "reducer bevægelse" til på sin telefon eller computer, er alle nye bevægelser slået fra.
- **Intet skjules for Google.** Indhold er synligt i HTML'en og fra første billede. Animationer starter aldrig fra usynlig ved indlæsning.
- **Intet over folden ved indlæsning.** Eneste undtagelse er ejerens ønske om hero-indgangen: overskrift, tekst og knapper glider 6 px op, uden at blive gennemsigtige, og hero-billedet står stille.

## 3. Område for område

Forklaring på kolonnerne: **Indsats** S = under en time, M = en halv dag, L = mere. **Risiko** gælder SEO og hastighed. **Status**: `lavet nu` (i denne runde), `lavet før` (første runde), `foreslået`, `frarådes`.

### 3.1 Hele sitet

| Element | I dag | Forslag | Hvorfor det hjælper kunden | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Sideskift ved klik på links | Ny side står der bare | Indholdet toner frem på 220 ms; menu, footer, kurv, cookiebanner og chat står stille. Kun ved klik inde på sitet, aldrig ved første indlæsning, aldrig ved filter, sortering eller ankre | Kunden ser, at klikket "landede", og skiftet føles mindre hårdt | M | Lav: første indlæsning er uændret, så Google og LCP er ikke berørt | `lavet nu` |
| Pil i knapper ("Se vores iPhones →") | Står stille | Pilen rykker 3 px frem ved hover og tastaturfokus | Viser at knappen fører videre | S | Ingen | `lavet nu` (hero-knapper) |
| Tryk-feedback på knapper | Mange knapper havde ingen | Fælles `press`-klasse (giver 3 % efter) | Bekræfter trykket på telefonen | S | Ingen | `lavet før`, udvidet nu (kurv, kasse, kontaktbjælke, cookie, 404, butiksside, login, kvittering) |
| FadeIn på om-os, delbetaling, forsikring, prismatch, samlingssider | Gjorde indhold usynligt efter indlæsning og tonede det frem igen; tekst under folden var usynlig, til man rullede | Indholdet er altid synligt; kun et 8 px glid for sektioner under folden; intet ved reduceret bevægelse | Ingen blink øverst på siden, intet tomt indhold | S | Lavere end før: fjerner en reel risiko | `lavet nu` |
| Pulserende "på lager"-prik og indlæsningsfelter | Pulserer altid | Står stille ved reduceret bevægelse | Respekterer kundens indstilling | S | Ingen | `lavet nu` |
| Fokusring ved tastatur | Skifter med det samme | Lad ringen tone ind på 100 ms | Lidt roligere for tastaturbrugere | S | Ingen | `foreslået` (lav værdi) |
| Global besked ("toast") | Findes ikke; "Lagt i kurven" vises på knappen | Lille besked nederst, der glider op og ned samme vej | Bekræftelse, der også ses, når knappen er rullet væk | M | Ingen | `foreslået` |
| Glidende rul til ankre (fx "Se udvalget", "Find model og pris") | Hopper | Blødt rul på ankerlinks | Kunden ser, hvor på siden hun lander | S | Lav: skal sættes op, så Next.js' egne sideskift ikke rulles langsomt | `foreslået`, kræver ejerens ja |
| Header, der gemmer sig ved scroll | Findes ikke | | Flytter menuen væk, når man leder efter den | M | Lav | `frarådes` |

### 3.2 Forside

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Hero-tekst og knapper | Stod stille | Glider 6 px op ved indlæsning, lidt forskudt (0, 40, 80, 120 ms) | Ejerens ønske: siden føles levende fra start | S | Lav: kun forskydning, teksten er synlig fra første billede og tæller ikke som layoutskift | `lavet nu` |
| Slideskift (1 / 4 · iPhones) | Indholdet blev byttet på stedet | Tekst og billede glider 12 px ind fra den side, man bladrer mod, og toner ind (240 ms) | Kunden kan se, at noget nyt kom ind, og fra hvilken retning | S | Ingen: første slide animeres ikke | `lavet nu` |
| Fanebladene under karrusellen | Grøn baggrund sprang | Grøn markering glider til den valgte fane (260 ms), tekstfarven toner | Viser sammenhæng mellem fane og slide | S | Ingen | `lavet nu` |
| Forrige/næste-knapper | Ingen tryk-feedback | Giver efter ved tryk, baggrund toner | Bekræfter trykket | S | Ingen | `lavet nu` |
| Hero-billedet | Stod stille | Løfter sig 2 % ved hover (kun mus); aldrig ved indlæsning | Lille svar, når musen er på produktet | S | Ingen: billedets prioritet er uændret | `lavet nu` |
| Reparation- og sælg-kort | Knapper havde tryk men ingen pil-bevægelse | Pil rykker ved hover | Samme opførsel som hero-knappen | S | Ingen | `lavet nu` |
| Karrusel, der skifter selv | Skifter ikke selv | | Kunden mister det, hun læste | S | Lav | `frarådes`, ejerens beslutning |
| Produktfaner og produktkort | | | | | | `lavet før` |

### 3.3 Kategori- og samlingssider

Gælder iPhones, smartphones, iPads, bærbare, smartwatches, samlingssider (`[collection]`), refurbished, tilbehør, covers, beskyttelsesglas, lagersalg, restsalg, Black November og de lokale købssider.

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Kategori-hero (iPhones, iPads, bærbare, smartwatches, smartphones) | Stod stille | Tekst og knap glider 6 px op ved indlæsning; pil rykker; knap giver efter; billede løfter sig 2 % ved hover | Ejerens ønske om mere levende hero | S | Lav: billedet animeres ikke ved indlæsning | `lavet nu` |
| Hero på samlingssider (`[collection]`) | Overskrift blinkede ud og ind efter indlæsning (FadeIn) | Står fast, glider 6 px op | Fjerner blinket | S | Lavere end før | `lavet nu` |
| Tilbehørs-hero og Black November-hero | Stod stille | Tekst glider 6 px op; kampagneknap giver efter | Samme opførsel overalt | S | Lav | `lavet nu` |
| Lokale købssider (Vejle, Slagelse) | Stod stille | Sidehoved glider 6 px op | Samme opførsel | S | Lav | `lavet nu` |
| Filtre, filterskuffe, produktkort | | | | | | `lavet før` |
| Produktgitter efter filtrering | Skifter på stedet | Kort fade af gitteret ved nyt filter | Kunden ser, at listen er opdateret | M | Lav | `foreslået` |
| Covers-produktside, indlæsningsfelt | Stor grå boks pulserer | Står stille ved reduceret bevægelse | | S | Ingen | `lavet nu` (via fælles regel) |
| Lagersalg- og restsalg-bjælker | | Ingen ændring | Fungerer som de er | | | |

### 3.4 Produktside for enheder (`enhed`, `refurbished/...`)

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Hovedbillede ved klik på miniaturebillede, farve eller stand | Billedet blev skiftet med et ryk | Det nye billede toner ind på 220 ms med en lille skalering | Kunden ser, at valget virkede, uden et blink | S | Ingen: ved indlæsning er alt som før, og billedets prioritet (LCP) er uændret | `lavet nu` |
| Markering af valgt miniaturebillede | Kant skifter farve blødt | | | | | `lavet før` |
| Pris ved valg af stand eller lagerplads | Tallet sprang | Prisen toner kort ind (200 ms) | Øjet opdager, at prisen ændrede sig | S | Ingen | `lavet nu` |
| "X på lager i den valgte variant" | Sprang | Toner kort ind ved ændring | Samme | S | Ingen | `lavet nu` |
| Zoom-visning | Åbnede med et ryk | Toner ind, Luk giver efter | Roligere overgang til fuld skærm | S | Ingen | `lavet nu` |
| Vælgere, læg i kurv, bekræftelse | | | | | | `lavet før` |
| Købsbjælke i bunden på mobil | Glider ind ved scroll | | | | | `lavet før` (fandtes) |
| Prisen "tæller op" | | | Forsinker info | | | `frarådes` |

### 3.5 Produktside for tilbehør

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Billeder i gitter | Løfter sig ved hover | | | | | `lavet før` (fandtes) |
| Fuldskærmsvisning (lightbox) | Åbnede med et ryk; billeder sprang | Toner ind; skift mellem billeder toner; knapper giver efter | Mindre hårdt, kunden mister ikke overblikket | S | Ingen | `lavet nu` |
| Strimmel på mobil (swipe) | Browserens egen snap | | Allerede native | | | |

### 3.6 Søgning

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Søgefeltet i headeren | Ingen reaktion ved fokus | Kant og baggrund toner ved fokus; søgeknap giver efter | Tydeligt, hvor man skriver | S | Ingen | `lavet nu` |
| Søgeforslag mens man skriver | Findes ikke (søgning sker på /soeg) | Liste under feltet, der toner ind (160 ms), med indlæsningsfelter i stedet for et hop | Kunden finder modellen hurtigere | L | Lav, hvis listen kun er en tilføjelse | `foreslået`, kræver ejerens ja (ny funktion) |
| /soeg sidehoved | Stod stille | Glider 6 px op | Samme opførsel | S | Lav | `lavet nu` |
| Resultatkort | | | | | | `lavet før` (produktkort) |

### 3.7 Kurv-skuffe

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Ny vare i kurven | Dukkede op | Linjen glider 8 px ind og toner | Kunden ser, hvad der lige kom i kurven | S | Ingen | `lavet nu` |
| Antal (plus og minus) | Tallet sprang | Tallet og linjeprisen toner kort ind | Bekræfter ændringen | S | Ingen | `lavet nu` |
| Total ("I alt") | Sprang | Toner kort ind ved ændring | Samme | S | Ingen | `lavet nu` |
| Tom kurv | Dukkede op | Toner ind | Mindre ryk, når den sidste vare fjernes | S | Ingen | `lavet nu` |
| Luk, fjern, Gå til kassen | Kun farveskift | Giver efter ved tryk | Bekræfter trykket | S | Ingen | `lavet nu` |
| Fjernet vare | Forsvinder med det samme | Linjen glider ud, og listen lukker sig | Kunden ser, hvad der forsvandt | M | Ingen | `foreslået` |
| Mersalgsvindue (upsell) | Åbner hårdt | Toner ind, glider op på mobil | Roligere | S | Ingen | `foreslået` |

### 3.8 Kassen (`checkout` / `kasse`)

Kun udseende er ændret. Betaling, priser, validering og indsendelse er ikke rørt.

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Leveringskort | Farveskift | Giver efter ved tryk | Bekræfter valget på telefonen | S | Ingen | `lavet nu` |
| Pakkeshop-panel | Dukkede op | Toner ind, når kunden selv vælger pakkeshop | Viser, hvor det nye felt kom fra | S | Ingen | `lavet nu` |
| Liste over pakkeshops | Dukkede op efter indlæsning | Toner ind; hvert kort giver efter ved tryk | Mindre hop | S | Ingen | `lavet nu` |
| Fejlbeskeder (rabatkode, betaling) | Dukkede op | Glider 3 px og toner ind | Mærkes som svar, ikke som fejl i siden | S | Ingen | `lavet nu` |
| Gå til betaling | Alle egenskaber animeret (`transition-all`) | Giver efter ved tryk; kun farver og skygge toner | Mere præcis feedback | S | Ingen | `lavet nu` |
| Fragt og total i oversigten | Sprang | Toner kort ind ved ændring | Kunden ser, at fragten ændrede totalen | S | Ingen | `lavet nu` |
| Sideskift ind i kassen | | Kassen har sin egen ramme og er bevidst uden sideskift-animation, så intet kan forstyrre betalingsfeltet | | | | `frarådes` |
| "Henter pakkeshops..." | Tekst | Tre grå felter i stedet for tekst | Mindre hop, når listen kommer | S | Ingen | `foreslået` |

### 3.9 Ordre og kvittering

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Knapper på kvitteringen | Farveskift | Giver efter ved tryk | | S | Ingen | `lavet nu` |
| Flueben ved gennemført køb | Står stille | Fluebenet tegner sig én gang (300 ms) | Et sjældent, glad øjeblik; her må der være lidt mere | S | Ingen | `foreslået` |

### 3.10 Reparation

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| /reparation hero | Stod stille | Tekst glider 6 px op; "Find model og pris" giver efter, pil rykker | Ejerens ønske | S | Lav | `lavet nu` |
| Mærke- og modelfliser | Farveskift uden overgang | Giver efter ved tryk, kant og baggrund toner; modelbilledet løfter sig 3 % ved hover | Bekræfter valget; tydeligt hvad man peger på | S | Ingen | `lavet nu` |
| Søgeresultater i modelvælgeren | Baggrund sprang | Baggrund toner | Roligere ved piletaster og mus | S | Ingen | `lavet nu` |
| Prisliste på modelside | Ingen hover | Rækken under musen får en svag baggrund | Øjet kan følge rækken fra reparation til pris | S | Ingen | `lavet nu` |
| Kvalitetskort (Budget, OEM, Original) | | | | | | `lavet før` (fandtes) |
| Find nærmeste butik | Farveskift | Toner og giver efter; besked glider ind | | S | Ingen | `lavet nu` |
| Info-boble ("i") | Dukkede op | Toner ind fra knappen | Viser, hvad boblen hører til | S | Ingen | `lavet nu` |
| Kontaktbjælke på mobil (Ring, Book tid) | Ingen feedback | Giver efter ved tryk | | S | Ingen | `lavet nu` |
| Bysider (Vejle, Slagelse, Kolding m.fl.) | Stod stille | Sidehoved glider 6 px op; knapper giver efter | Samme opførsel | S | Lav | `lavet nu` |
| Bookingflow | | | | | | `lavet før` |
| Video-afspilningsknap | Farveskift | Giver efter ved tryk | | S | Ingen | `foreslået` |

### 3.11 Sælg din enhed

Denne del ejes af et andet spor og er ikke rørt i denne runde.

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Trin i guiden | Skifter på stedet | Næste trin glider 12 px ind fra højre, forrige fra venstre (240 ms) | Kunden kan mærke, at hun går frem og tilbage | S | Ingen | `foreslået` |
| Prisen i tilbuddet | Dukker op | Toner ind, ingen optælling | | S | Ingen | `foreslået` |
| Hero på sælg-siden | Stod stille | Samme 6 px-indgang som de andre heroes | | S | Lav | `foreslået` |
| Spinner på accepter og afvis | Drejer | Behold; stå stille ved reduceret bevægelse | | S | Ingen | `foreslået` |

### 3.12 Min konto

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Menu på mobil | Dukkede op | Glider ind fra venstre med tonet baggrund | Samme som hovedmenuen | S | Ingen | `lavet nu` |
| Login: fejl og knap | Fejl dukkede op | Fejl glider ind; knap giver efter | | S | Ingen | `lavet nu` |
| Login-felter på iPhone | 14 px tekst, så iPhone zoomede ind | 16 px på mobil | Ingen zoom, når man trykker i feltet (ikke en animation, men samme følelse af ro) | S | Ingen | `lavet nu` |
| Indlæsning af ordrer, adresser m.m. | Spinner midt på siden | Grå felter i sidens form | Siden hopper ikke, når data kommer | M | Ingen (kontoen er ikke indekseret) | `foreslået` |

### 3.13 Blog og artikler

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Blogkort | Billede løftede sig over 500 ms | Samme 300 ms og kurve som produktkort; stille ved reduceret bevægelse | Ens tempo på hele sitet | S | Ingen | `lavet nu` |
| Indholdsfortegnelse | Kant ved hover | Markér det afsnit, man læser lige nu | Kunden ved, hvor i artiklen hun er | M | Ingen | `foreslået` |
| "I denne artikel" på mobil | `details` toner | | | | | `lavet før` |

### 3.14 Informationssider

FAQ, garanti, kvalitet, om os, hvorfor PhoneSpot, butik og besøg-sider, kontakt, erhverv og B2B, forsikring, delbetaling, sammenlign, prismatch, reklamation og fortryd.

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Sidehoved på FAQ, garanti, kvalitet, kontakt, søg, butikker, butiksside | Stod stille | Glider 6 px op ved indlæsning | Samme opførsel som heroes | S | Lav | `lavet nu` |
| Besøg-sider (Vejle, Slagelse) | Knapper uden feedback | Sidehoved glider op; Find vej, telefon og CTA giver efter | | S | Lav | `lavet nu` |
| Om os, delbetaling, forsikring, prismatch | Sektioner forsvandt og tonede frem (FadeIn) | Altid synlige, kun 8 px glid under folden | Intet tomt indhold | S | Lavere end før | `lavet nu` |
| FAQ-svar, `details` | | | | | | `lavet før` |
| Kontaktformular | | | | | | `lavet før` |
| Åbningstider | Statisk liste | Ingen ændring | Information, der skal læses | | | `frarådes` |
| Sammenligningstabeller | Statiske | Svag fremhævning af rækken under musen | Lettere at følge en række | S | Ingen | `foreslået` |
| Erhverv, B2B, reklamation, fortryd | Formularer og tekst | Ingen ændring ud over fælles knapper | | | | |

### 3.15 Cookiebanner, 404, fejl og indlæsning

| Element | I dag | Forslag | Hvorfor | Indsats | Risiko | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Cookiebanner | Dukkede op i bunden | Glider 8 px op og toner ind; knapper giver efter | Mindre forstyrrende første indtryk | S | Ingen: det ligger fast i bunden og skubber intet | `lavet nu` |
| 404 og fejlside | `transition-all` på knapper | Giver efter ved tryk | | S | Ingen | `lavet nu` |
| Indlæsning mellem sider | Tynd grøn streg på linket (fandtes) | Beholdes; sideskiftet tager over, når siden er klar | | | | `lavet før` (fandtes) |
| `loading.tsx`-filer | Findes ikke (fjernet med vilje, fordi de ødelagde 404-statuskoder) | Lad være | Siden ville svare "200 OK" på sider, der ikke findes | | Medium | `frarådes` |
| Grå indlæsningsfelter (forsiden, covers, upsell) | Pulserer | Står stille ved reduceret bevægelse | | S | Ingen | `lavet nu` |

## 4. Det, der er tilbage

### Rækkefølge

1. **Søgeforslag i headeren** (L). Den største gevinst for kunder, der ved, hvad de vil have. Ny funktion; ejeren skal sige ja.
2. **Grå indlæsningsfelter i stedet for spinnere** i Min konto og ved pakkeshops (M). Fjerner hop.
3. **Trin i Sælg din enhed** glider frem og tilbage (S). Ejes af et andet spor.
4. **Fjernet vare i kurven** glider ud (M).
5. **Flueben på kvitteringen** tegner sig én gang (S).
6. **Aktivt afsnit i blogartiklers indholdsfortegnelse** (M).
7. **Mersalgsvindue og en fælles besked nederst ("toast")** (M).
8. **Produktgitter toner ved nyt filter** (M).
9. Glidende rul til ankre (S, kræver ja).
10. Fokusring toner ind, video-knap og sammenligningstabeller (S hver).

### Beslutninger, der kræver ejeren

- **Sideskift**: besluttet (ja, altid). Lavet som en ren toning af indholdet. Hvis det føles for langsomt, kan det gøres kortere eller slås fra med én linje.
- **Hero-indgang ved indlæsning**: besluttet (ja). Kun forskydning, ingen toning. Billedet står stille.
- **Skal forsidens karrusel skifte af sig selv?** Anbefaling: nej.
- **Glidende rul til ankerlinks** ("Se udvalget", "Find model og pris"): ændrer hvordan siden opfører sig. Anbefaling: ja, men test på iPhone først.
- **Søgeforslag i headeren**: ny funktion, ikke kun bevægelse.
- **Header, der gemmer sig ved scroll**: anbefaling nej.
- **Animation, når man forlader en side** (den gamle side toner ud, før den nye kommer): anbefaling nej, det gør hvert klik langsommere.

### Hvorfor ikke browserens egne sideskift (View Transitions)?

Sitet kører Next.js 16.1 og React 19.2. React's indbyggede sideskift findes kun i testudgaven af React, og Next.js' tilsvarende indstilling er eksperimentel. Det er ikke lav risiko på en butik, der tager imod betalinger. Løsningen her er en lille stump kode, der kun sætter en markering på sidens indhold, når stien skifter. Den kan senere byttes ud, uden at noget andet skal ændres.

Sideskiftet toner kun (ingen forskydning). En forskydning af hele indholdet ville i det korte øjeblik få faste bjælker inde på siden (kontaktbjælken på reparationssider, købsbjælken på produktsider, filterskuffer) til at hoppe.

## 5. Sådan måler vi, at det ikke skader

Tre tal fra Google afgør, om siden føles hurtig:

- **LCP** (hvor hurtigt det største element, typisk hero-billedet, er tegnet). Kan påvirkes af: hero-indgangen (tekst glider, men er tegnet fra første billede), billedskift på produktsiden (kun efter klik). Hero-billederne er ikke rørt, og deres prioritet er uændret. Forventet effekt: ingen.
- **CLS** (om ting hopper rundt, mens siden indlæses). Kan påvirkes af: intet. Alle bevægelser er forskydninger og toninger, som Google ikke tæller med. FadeIn er nu mere sikker end før. Forventet effekt: ingen eller lidt bedre.
- **INP** (hvor hurtigt siden svarer på et tryk). Kan påvirkes af: sideskiftet (læser layoutet én gang pr. sideskift for at starte animationen forfra), pris- og totaltoning (en ekstra lille opdatering pr. valg), forsidens slideskift (bygger tekst og billede op på ny). Forventet effekt: under et millisekund pr. handling.

Sådan tjekker vi:

1. **PageSpeed Insights** (pagespeed.web.dev) på forsiden, /iphones, en produktside og /reparation før og efter udrulning. Se på "Core Web Vitals" for mobil.
2. **Search Console, rapporten Core Web Vitals.** Den bygger på rigtige besøg over 28 dage, så sammenlign 2 til 4 uger efter udrulning.
3. **Chrome DevTools, fanen Performance**, med "CPU 4x slowdown": optag et klik på et produktkort og en farvevælger. Der må ikke være røde "long tasks" over 50 ms, der skyldes animationer.
4. **Reduceret bevægelse**: I DevTools under Rendering, "Emulate prefers-reduced-motion: reduce". Intet nyt må bevæge sig.
5. **En rigtig telefon** (helst en iPhone og en ældre Android): hover må ikke hænge fast, tryk skal føles øjeblikkelige, cookiebanneret må ikke dække knapper, mens det glider.

Brugt som inspiration: Mobbin (ét opslag på produktsider med variantvalg). Skærmbillederne er stillbilleder, så de bekræftede kun mønstre (valgt kort med tydelig kant, antalsvælger ved siden af købsknappen, beskeder samlet nederst), ikke selve bevægelserne.

## For udvikleren

Fælles klasser og tokens ligger i `src/app/globals.css` (sektionerne Sideskift, Hero-indgang, `nudge`, `value-change`, `swap-in`, `pop-in`, `rise-in`, reduced motion). Ny hook: `src/components/ui/use-has-changed.ts` (true efter første ændring; bruges sammen med en ny `key`, så animationen spiller ved hvert skift, men aldrig ved indlæsning).

| `lavet nu` | Filer |
| --- | --- |
| Sideskift | `src/components/layout/page-transition.tsx`, `src/components/layout/public-shell.tsx`, `src/app/globals.css`, test `src/components/layout/__tests__/page-transition.test.tsx` |
| Forsidens hero (indgang, slideskift, fanemarkering, knapper, billed-hover) | `src/components/home/storefront-hero.tsx`, `src/components/home/storefront.module.css`, test `src/components/home/__tests__/storefront-hero.test.tsx` |
| Søgefelt i header | `src/components/home/storefront.module.css` |
| Kategori-hero | `src/components/product/device-collection-hero.tsx`, `src/components/product/device-collection.module.css` |
| Samlingsside-hero | `src/components/collection/category-hero.tsx` |
| /reparation hero | `src/app/reparation/page.tsx`, `src/components/repair/repair-landing.module.css` |
| FadeIn uden skjult indhold | `src/components/ui/fade-in.tsx`, test `src/components/ui/__tests__/fade-in.test.tsx` |
| Lagerprik og pulserende felter ved reduced motion | `src/components/product/category-hero.tsx`, `src/app/globals.css` |
| Produktside: billede, pris, lager | `src/components/product/device-detail.tsx`, `src/components/ui/use-has-changed.ts`, test `src/components/ui/__tests__/use-has-changed.test.tsx` |
| Zoom og lightbox | `src/components/product/zoom-image.tsx`, `src/components/product/accessory-media.tsx` |
| Kurv | `src/components/cart/cart-drawer.tsx`, `src/components/cart/cart-line-item.tsx` |
| Kassen (kun udseende) | `src/components/checkout/shipping-selector.tsx`, `src/components/checkout/pickup-point-picker.tsx`, `src/components/checkout/checkout-form.tsx`, `src/components/checkout/checkout-summary.tsx` |
| Reparationsfliser, søgeresultater, prisliste, butiksfinder, info-boble, kontaktbjælke | `src/components/repair/repair.module.css`, `src/components/repair/model-sections.module.css`, `src/components/repair/repair-store-finder.tsx`, `src/components/repair/service-info-tooltip.tsx`, `src/components/repair/mobile-contact-bar.tsx` |
| Bysider for reparation | `src/components/repair/local-repair-page.tsx` |
| Cookiebanner | `src/components/ui/cookie-consent.tsx` |
| Blogkort | `src/components/blog/blog-cover.tsx` |
| Sidehoveder på infosider og butikker | `src/app/faq/page.tsx`, `src/app/garanti/page.tsx`, `src/app/kvalitet/page.tsx`, `src/app/kontakt/page.tsx`, `src/app/soeg/page.tsx`, `src/app/butik/page.tsx`, `src/app/butik/[slug]/page.tsx`, `src/app/butik/[slug]/upcoming-store-page.tsx`, `src/components/local/local-buy-page.tsx` |
| Besøg-sider | `src/components/besoeg/besoeg-page.tsx` |
| Tilbehørs- og Black November-hero | `src/components/tilbehoer/tilbehoer-category-hero.tsx`, `src/components/campaign/black-november-hero.tsx` |
| Min konto (menu, login) | `src/app/konto/layout.tsx` |
| 404, fejlside, kvittering | `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/ordre/bekraeftelse/page.tsx` |

Noter:

- `hero-rise` animerer egenskaben `translate` (ikke `transform`), så den aldrig overskriver elementers egne transforms; `backwards` fylder kun før start.
- `@starting-style`-klasser (`pop-in`, `rise-in`, `reveal-in`) må kun sidde på elementer, der monteres efter en brugerhandling eller efter hydrering; ellers spiller de ved indlæsning.
- Slideskiftet på forsiden ligger på `<img>` og ikke på forælderen, fordi en transform eller opacity på forælderen isolerer `mix-blend-mode: multiply` og ville vise billedets hvide baggrund i 240 ms.
- Sideskiftet bruger `usePathname`, så query og hash aldrig udløser det, og hæftes direkte på `<main>` (ingen ekstra wrapper i HTML'en). Kassens ramme (`/kasse`) og admin får det ikke.
