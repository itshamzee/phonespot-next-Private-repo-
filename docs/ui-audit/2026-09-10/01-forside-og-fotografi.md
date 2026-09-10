# Forside og fotografi

## Den konkrete diagnose

| Fund | Sted i koden | Hvorfor udtrykket bliver generisk |
|---|---|---|
| Fire ens hovedkategorikort | `src/app/page.tsx`: `HERO_CATEGORIES`, `sm:grid-cols-2 lg:grid-cols-4`, ens afrundede rammer og billedhøjder | iPhone, iPad, laptop og ur får samme visuelle vægt; der er ingen redaktionel prioritering. |
| Fire mindre støttekort gentager formen | Samme side, sektionen efter hovedkategorierne | Nye opgaver præsenteres med samme rytme i stedet for at få en tydelig rolle. |
| Varer gentages | `ShopTabs`, `Bestsellers` og deres fælles produkt-API | I den observerede visning gentages bærbare i begge sektioner. To næsten ens udstillinger udvander forskellen mellem at navigere og at få en anbefaling. Sortimentet er midlertidigt; komponenternes overlappende roller er det varige problem. |
| Løsrevne billeder med forskellig skala | `iphone-lineup.jpg`, `ipad-air-new.png`, `thinkpad-clean.webp`, `apple-watch.png` i hovedkort | Forskellige vinkler, luft og størrelser ligner en samling katalogudklip. `iphone-lineup.jpg` viser én model for/bag, ikke en samlet produktserie. |
| Introduktion uden direkte primær købsindgang | `src/components/home/intro-strip.tsx`, brugt før kategorierne | Den store tekstflade leder til “Hvorfor PhoneSpot?”; selve valget af varer kommer senere, især på mobil. |
| Udskiftelig sektionsrytme | `src/app/page.tsx`: kort, produktgrids, køb-af-enhed-flade, centrerede anmeldelser, FAQ og afsluttende CTA | Mange selvstændige blokke konkurrerer om at genstarte fortællingen. |
| Typografien følger ikke reglerne | `src/lib/fonts.ts` og `src/app/layout.tsx` | Både `dmSans` og `barlowCondensed` eksporterer faktisk Plus Jakarta Sans. Navnene skjuler forskellen mellem dokumenteret og indlæst designsystem. |

Der er **ikke en dekorativ gradient i selve forsidesheroen**. Det konkrete gradienteksempel er `src/app/beskyttelsesglas/page.tsx`: grøn gradient, dekorativt gitter, sløret lyskugle og stor “9H”-vandmærketekst. Det optager plads, hvor et ægte glas, en kantdetalje eller montering kunne forklare produktet.

## Fælles ramme for et nyt udtryk

DM Sans til navigation, priser, brødtekst og knapper; Barlow Condensed kun til enkelte store displayoverskrifter. Sentence-case, mørkegrøn #1A3D2E, charcoal #111111 og eksisterende varme hvide/cremefarver. Skarpt hierarki via størrelse, placering og luft; ikke flere badges. Priser/tilgængelighed kommer fra det kommende katalog, aldrig indbrændt i fotos.

Skitserne beskriver komposition, ikke færdige skærme. Foto-felter betyder nye eller godkendte eksisterende fotografier. Ingen CSS/SVG-telefoner, genererede produktfotos eller opdigtede anmeldelser. Mobil har samme primære opgave som desktop; ingen karrusel som nødvendig vej til et produkt. Synlig fokusmarkering, læsbar tekst, minimum 44 px som designmål for trykflader, reduceret bevægelse og ingen tekst oven på urolig fotografi. Kontrolleres senere med tastatur, zoom og fysisk mobil.

## A — Den redaktionelle produktbutik (anbefalet)

**Karakter:** rolig, præcis og produktorienteret. Stor asymmetrisk komposition på creme, én fotograferet enhed fylder billedfeltet. En tydelig typografisk venstrekant og kategorier som tekstnavigation frem for indrammede kort. Et reelt nyt udtryk med kort vej til købsopgaven.

Eksempeltekst: “Din næste iPhone. Grundigt testet.” / “Refurbished iPhones med 36 måneders garanti.” / **“Se iPhones”**. Sekundært tekstlink: “Sådan vurderer vi standen”. Hvis heroens produktkategori ændres, ændres tekst og destination samlet.

```text
DESKTOP
Logo     Produkter   Reparation   Sælg din enhed     Søg / Kurv
─────────────────────────────────────────────────────────────
Din næste iPhone.        [ÆGTE FOTO: enhed for/bag i 3/4-vinkel]
Grundigt testet.         [stor, tæt komposition, naturlig skygge]
Kort forklaring.         [ingen flydende badges]
[Se iPhones]
Sådan vurderer vi standen
36 måneders garanti på enheder · Butikker i Vejle og Slagelse
─────────────────────────────────────────────────────────────
iPhones →     iPads →     Bærbare →     Ure →
Udvalgte enheder           kompakt, databegrundet produktudvalg
[Detaljefoto af stand]     Hvad betyder A, B og C?
Tilbehør der passer       [Vælg din model]
[Butikkens eget foto]      Kom ind og se din næste enhed
```

```text
MOBIL
Logo                       Søg / Kurv
Din næste iPhone.
Grundigt testet.
Kort forklaring
[Se iPhones                     ]
[ÆGTE FOTO, separat 4:3-beskæring]
36 måneders garanti på enheder
iPhones → / iPads → / Bærbare → / Ure →
Udvalgte enheder: enkel, læsbar produktliste
Stand forklaret med detaljefoto
Tilbehør: vælg model
Butik + FAQ
```

Rytmen skifter mellem produktudstilling, dokumentation og service. Én kurateret produktsektion erstatter overlap i ShopTabs/Bestsellers i en senere PR. Ingen “mest solgte”-mærkning uden salgsdata. Fotos: P1 og P2 nedenfor. Eksisterende 400 px packshots er ikke store nok til hovedfotoet. Risiko: fotoet skal kunne bære fladen; dårlig billedkvalitet kan ikke kompenseres med mere dekoration.

## B — Butikken og håndværket

**Karakter:** et troværdigt, lokalt værksted og en rigtig butik. En dokumentarisk scene er det primære billede; tekst står separat. Fotografiet viser medarbejderens hænder og den konkrete enhed, ikke en anonym person med en telefon. Grøn bruges som en enkel bundflade under et stort foto, ikke gradient.

Eksempeltekst: “Se den. Prøv den. Tag den med.” / “Refurbished elektronik online og i vores butikker i Vejle og Slagelse.” / **“Se enheder”**. Sekundært: “Find din butik”. Garantitekst specificerer enheder.

```text
DESKTOP
Logo / navigation
[STORT DOKUMENTARISK BUTIKSFOTO, ca. 2/3]   Se den. Prøv den.
[medarbejder viser konkret enhed]          Tag den med.
                                           [Se enheder]
                                           Find din butik
─────────────────────────────────────────────────────────────
Hvad leder du efter?      iPhone / iPad / Bærbar / Ur
Udvalgte enheder          produktliste med pris og stand
Vi tester før vi sælger   [to konkrete procesdetaljer]
Beskyttelsesglas          [montering i butikken + modelvalg]
Vejle                    Slagelse: foto, adresse, faktiske tider
```

```text
MOBIL
Logo / navigation
Se den. Prøv den. Tag den med.
[Se enheder]
[DOKUMENTARISK FOTO, stående beskæring]
Vejle og Slagelse · Find din butik
Hvad leder du efter? [enkel kategoriliste]
Enheder → Test og stand → Montering → Butikker
```

Fotos: P3, P4 og P5. De eksisterende billeder af disk og kundeoverdragelse giver et udgangspunkt efter rettighedstjek; nyt foto skal vise begge butikkers virkelighed. Risiko: lokal historie må ikke få kunder i resten af Danmark til at tro, at køb kræver fremmøde. Online-CTA kommer derfor før butikshistorien. Hypotese: øget tillid hos førstegangskunder; vurder købsrate og kvalitative tvivlsspørgsmål, ikke blot klik på butikssiden.

## C — Den enkle købsguide

**Karakter:** en fokuseret handelsflade med stor typografi, én åben liste og et fotograferet produktsæt i siden. Opgavevalg bliver hovedindgangen; billeder og produktudstilling understøtter valget. Ingen spørgeskemawizard på forsiden og ingen fire ens kort.

Eksempeltekst: “Hvad skal din næste enhed kunne?” / **“Find en iPhone”** / “Find en bærbar” / “Find tilbehør til min telefon”. En vedvarende “Se alle enheder” giver direkte adgang til kunder, der allerede kender modellen.

```text
DESKTOP
Logo / navigation
Hvad skal din næste       [ÆGTE FOTO: telefon og laptop,
enhed kunne?               forskudt på samme bordflade]
Find en iPhone         →
Find en bærbar         →
Find tilbehør          →
Se alle enheder
─────────────────────────────────────────────────────────────
Valgt opgave: få tydelige muligheder med forskelle og fuld pris
Stand og garanti forklaret ved produkterne
[Virkelig testdetalje]   Kom ind i Vejle eller Slagelse
```

```text
MOBIL
Logo / navigation
Hvad skal din næste enhed kunne?
Find en iPhone                →
Find en bærbar                →
Find tilbehør                 →
Se alle enheder
[ÆGTE FOTO, kompakt udsnit]
Udvalg med synlige forskelle
Stand / garanti / butik
```

Fotos: P6. Ingen “bedst til studie” eller budgetgrænser uden afklarede kriterier og varer. Første version linker til relevante kollektioner; behovsbaseret filtrering er en separat hypotese med datakrav. Risiko: ét ekstra valg for modelbevidste kunder. Vælg C, hvis data og brugertest viser, at valg af kategori/model er den største barriere.

## Hvilken retning vælges?

| | A | B | C |
|---|---|---|---|
| Primær opgave | Direkte produktkøb | Køb med lokal dokumentation | Hjælp til at finde kategori |
| Største styrke | Produktfokus og let skanbarhed | PhoneSpots konkrete særkende | Tydelig vej gennem et skiftende sortiment |
| Afhængighed | Et fremragende produktfoto | Egne butiks-/procesfotos | Klar opgaveinddeling og matchende udvalg |
| Første måling | Hero → relevant produkt → køb | Førstegangskøb og tvivl i brugertest | Tid til relevant produkt, søgeomveje |

Anbefaling A er en designvurdering, ikke resultatet af en A/B-test. B's dokumentation passer som senere sektion under A; de tre heroer skal ikke blandes til en ny overfyldt flade.

## Mobbin-referencegennemgang — afventer adgang

Ejeren har efterspurgt Mobbin som konkret inspirationskilde. Integrationen stillede ingen Mobbin-værktøjer til rådighed i denne samtale. Browserforsøget på [Mobbin](https://mobbin.com/) og Explore viste den offentlige introduktionsside, ikke det søgbare skærmbibliotek. Der er derfor **ingen påståede Mobbin-skærmreferencer i disse forslag**. Retningerne skal udfordres med en referencegennemgang, når adgang er tilgængelig, inden det visuelle valg låses.

Gennemgangen skal udvælge 6–9 konkrete skærme/flows med direkte kilde, app/site, platform og registreringsdato: produktfotografi og hero-hierarki til A/B; søgning/model-/variantvalg til C og tilbehør; kurv/checkout med total og valgfrie tilkøb på mobil. Mobbin beskriver netop skærme og sammenhængende flows i sit [offentlige overblik](https://mobbin.com/mcp).

For hver reference noteres: hvilket problem den løser, hvad der kan overføres til PhoneSpot, hvad der er brandspecifikt og ikke skal kopieres, samt hvilken hypotese der skal testes. Et mønster på Mobbin er inspiration fra et eksisterende produkt, ikke dokumentation for højere konvertering. Vi kopierer hverken andres billeder, tekster eller samlede identitet.

## Audit af eksisterende billeder

Alle 35 filer i `public/images/devices/` blev inventeret; de 33 rasterbilleder blev visuelt gennemgået som kontaktark. Opløsning og genkendelighed er forskellige kriterier: en 400 × 400-fil med et lille motiv har endnu færre brugbare produktpixels. Filnavnet dokumenterer hverken motivets model, fotografisk oprindelse eller brugsret.

| Filer/grupper i devices | Observeret | Anvendelse efter kontrol |
|---|---|---|
| `iphone-18-black.webp`, `iphone-18-pro.webp`, `iphone-18-pro-max.webp` | 900 × 900, tydelige packshotlignende motiver, ca. 290–441 KiB | Mulige mindre produktfelter, ca. 450 CSS-px ved 2×. Ikke automatisk brede hero-fotos. Bekræft præcis model, billedkilde og rettigheder med ejeren. Kataloget er under revision. |
| `iphone-12.png`, `iphone-17.png` | 400 × 400, relativt stort motiv | Små kategorifelter; ikke ny stor hero. |
| `iphone-13.png`, `iphone-14-pro.png`, `iphone-15-pro.png`, `iphone-16-pro.png`, `iphone-16.png`, `iphone-se.png` | 400 × 400, meget luft omkring lille motiv | Uens skala skal normaliseres; kilde med højere opløsning foretrækkes. |
| `ipad-air.png`, `ipad-mini.png`, `macbook-air.png`, `macbook-pro.png` | 400 × 400, større produktfylde | Brugbare små oversigter efter modeltjek. |
| `ipad-basic.png`, `ipad-pro.png`, `apple-watch.png` | 400 × 400, små motiver | Svage store kategoribilleder; erstat eller indhent original. |
| `samsung-galaxy-s.png`, `samsung-s23.png`, `samsung-s24.png`, `samsung-s25.png` | Ca. 330 × 330; flere ligner samme lilla motiv | Modelidentitet skal verificeres før modelmærkning; undgå at bruge dem som bevis for bestemte modeller. |
| `samsung-galaxy-a.png`, `samsung-flip.png`, `samsung-fold.png`, `samsung-tab.png` | Ca. 330 × 330 | Små kategorifelter, ikke hero. |
| `pixel.png` | 240 × 240 | For lav opløsning til et nyt større format. |
| `huawei.png`, `oneplus.png`, `xiaomi.png` | Højere, ujævne formater, ca. 507–747 px | Beskæres konsekvent; kræver model-/kildetjek. |
| `iphone-duo.webp` | 412 × 371, foldbart motiv | Oprindelse/model skal afklares; ikke beslutningsgrundlag for sortiment. |
| `nintendo-switch.png`, `playstation.png` | Større rasterfiler | Kun hvis disse varer indgår i det blivende sortiment. |
| `motorola.svg`, `sony-xperia.svg` | Vektorillustrationer | Ikke hero-/produktfotografi. |

Supplerende visuel kontrol: `store/butik-indvendig.jpg`, `butik-disk.jpg`, `butik-produkter.jpg`, `kunde-afleverer.jpg`, `kunde-afhenter.jpg` og `vestsjællandscentret.jpg` viser konkret butik/overdragelse. De er mere stedsspecifikke end packshots; personer, lokation og rettigheder skal bekræftes. `quality/quality-grading.jpg` og `quality-testing.jpg` viser tilsyneladende samme reparationsscene; de dokumenterer ikke forskellen mellem kosmetiske grades. `repair/tekniker-reparerer.jpg` viser en åben tablet, ikke en iPhone-test. Ingen af disse får automatisk status som dokumentation for PhoneSpots egne processer.

## Fotodag: konkret indkøbsliste

Før optagelse vælger ejeren de modeller/SKU'er, der bliver i kataloget. Gem original, model/SKU, fotograf, rettigheder/samtykke, dato og tiltænkt brug. Lever originaler i mindst 3000 px på lang led; eksportstørrelse fastlægges til den konkrete visning. Ingen indbrændt tekst, priser eller emballageløfter.

| Prioritet | Motiv og optagelse | Baggrund, lys og leverance | Brug |
|---|---|---|---|
| P1 | Blivende hovedmodel: forside, bagside og 3/4; både skærm og kant læsbar | Mat varm hvid/creme, blødt sidelys, naturlig kontaktskygge. Vandret 3:2 med fri venstreside samt separat mobil 4:3 | A-hero, enheder |
| P2 | Samme model i A/B/C: hele enheden og makro af faktisk slid | Identisk afstand/lys/vinkel; ærlige ridser, ingen retouchering af stand. Seks eller flere fotos med præcis grade | Risikoreduktion ved produktvalg |
| P3 | Medarbejder overdrager/vurderer konkret enhed ved disken | Begge butikker; naturligt lys suppleret med stor diffus lyskilde; vandret og stående. Skærme uden persondata | B-hero, lokal troværdighed |
| P4 | Rigtig test: kamera, stik og batterivisning | Tæt udsnit + bredt procesfoto; vis den test, teksten faktisk beskriver | Kvalitet og PDP |
| P5 | Beskyttelsesglas monteres: rengøring, placering, færdig kant | Begge butikker; lys skråt hen over glas for at vise finish; 3-fotos sekvens, evt. kort tekstet video | Glas og montering |
| P6 | Blivende telefon og laptop på samme arbejdsflade | Neutral creme; forskudt placering, realistisk skala, ingen kunstig svæven. Desktop og mobil optages særskilt | C-hero |
| P7 | Udvalgte covers, glas, kabel og oplader fra Swissten/Rexus/NovaNL | Ens målestok og lys; monteret cover fra side/bag, greb/magnet, stik tæt på, læsbar effektmærkning | Tilbehørsvalg og kompatibilitet |

P1–P2 prioriteres ved A; P3–P5 ved B. Ingen fotodag behøver dække det nuværende midlertidige katalog. Afvent manglende hero-foto frem for at fylde pladsen med en telefonillustration.
