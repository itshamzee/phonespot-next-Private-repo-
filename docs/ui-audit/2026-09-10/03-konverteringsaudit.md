# Konverteringsaudit — top 10

## Metode og prioritering

**Observation** er det, der blev set live 10. september 2026. **Kodefund** beskriver implementeringen ved `1a2a18b`. **Hypotese** er en mulig adfærdseffekt, som ikke er målt. Dagens katalog bliver ændret; konkrete varer/priser er reproduktionseksempler, ikke anbefalinger til sortimentet. Der er ingen GA4-adgang og ingen dokumenteret uplift.

Den supplerende [Mobbin-gennemgang med 17 referencer](05-mobbin-referencer.md) konkretiserer mulige løsninger: Depop/Airbnb til pris-/ordresammendrag, On til variantvalg, IKEA/Best Buy til kurv og Etsy til præcis trinbeskrivelse. Referencerne ændrer ikke fundenes evidensstatus eller prioritet. De er arkiverede skærme, ikke PhoneSpot-data eller bevis for kausal konverteringsgevinst.

Score = forventet påvirkning (1–5) × gennemførlighed (1–5, hvor 5 er lille indsats). Dermed prioriteres høj påvirkning/lav indsats; vi belønner ikke dyrere arbejde ved at multiplicere direkte med timer. Indsatserne er relative, omfatter nødvendige dataafklaringer og er ikke tilbud i dage. Ved samme score kommer stærkere evidens og kortere vej til købet først. Faktuel pris-/tillidskorrekthed skal løses uanset A/B-resultat; designforsøg kræver måling.

| # | Problem | Påvirkning | Gennemførlighed | Score | Evidens |
|---|---|---:|---:|---:|---|
| 1 | Valgt fragt afspejles ikke i synlig total | 5 | 4 | 20 | Live + kode |
| 2 | Mobilbetaling kommer før ordresammendrag | 5 | 4 | 20 | Live + kode |
| 3 | Tillidstal/anbefalingsetiketter mangler ensartet grundlag | 4 | 4 | 16 | Live + kode |
| 4 | Modelforbindelsen tabes på tværs af tilbehørsflow | 4 | 3 | 12 | Live + kode; effekt hypotese |
| 5 | Katalogvisning har skjult grænse og lagerfallback | 4 | 3 | 12 | Live + kode |
| 6 | Afbrydelser konkurrerer med køb på mobil | 3 | 4 | 12 | Live + kode; effekt hypotese |
| 7 | Modstridende pris-/ratevisning | 3 | 4 | 12 | Live + kode |
| 8 | Opkøb lover forskellige svartider og betalingstidspunkter | 3 | 4 | 12 | Live + kode |
| 9 | Stand og batteri mangler konkret bevis ved nogle valg | 4 | 2 | 8 | Live + kode; effekt hypotese |
| 10 | Reparation kræver gentagen forklaring og uklart datoløfte | 3 | 2 | 6 | Live + kode; effekt hypotese |

## 1. Kunden kan ikke stole på den viste leveringssum

**Princip:** Synlig systemstatus, konsistens og forebyggelse af prisoverraskelser ([NN/g: heuristikker](https://www.nngroup.com/articles/ten-usability-heuristics/)).

**Evidens:** Med én iPhone 12 til 1.900 kr. i `/kasse` blev hjemmelevering til 39 kr. valgt. Ordresammendraget viste stadig “Fragt Gratis” og i alt 1.900 kr. `checkout-form.tsx` gemmer `shippingCost` lokalt, mens `checkout-summary.tsx` læser kurvens totals. Der blev ikke oprettet betalingssession; dette dokumenterer en UI-uoverensstemmelse, ikke det faktisk opkrævede beløb.

**Konkret forslag:** Samme autoritative fragtvalg og beregning til radiosvar, sammendrag og betal-knap. Før valg: “Vælg levering for at se den samlede pris”. For den observerede kombination skal 39 kr. indgå, hvis det er den gældende fragtregel; ingen særskilt hardcodet UI-regel. Brug samme leveringsinterval ved valgt metode og i tillidstekst.

**Mål:** Nul afvigelser mellem vist og godkendt beløb i validerede scenarier; derefter frafald mellem `add_shipping_info` og betalt ordre, opdelt på fragtmetode. Test også tilbehørskurv, rabat, afhentning og fri-fragt-grænse. **Kræver særskilt aftale om betalings-/fragtområdet; ikke en implementeringstilladelse i denne audit.**

## 2. På mobil ligger beslutningsgrundlaget efter betal-knappen

**Princip:** Genkendelse frem for hukommelse og lavere formulararbejde ([NN/g](https://www.nngroup.com/articles/recognition-and-recall/), [Baymard](https://baymard.com/blog/checkout-flow-average-form-fields)).

**Evidens:** `src/app/kasse/page.tsx` placerer hele `CheckoutForm`, inklusive “Gå til sikker betaling”, før `CheckoutSummary` i mobilrækkefølgen. Desktop har et sammendrag i sidekolonnen. Formularen har `noValidate`; obligatoriske kontaktfelter får ikke browserens almindelige validering, og nogle fejl opdages først ved indsendelse/API-svar.

**Konkret forslag:** Vis et kompakt, redigerbart sammendrag øverst og korrekt total ved CTA. Bevar fulde aftale-/returoplysninger og typekorrekt garanti tæt på beslutningen. Gør valgfri adresselinje og rabatkode til tydelige valgfrie åbninger. Valider feltet konkret uden at slette input; fokusér første fejl. Bevar gæstekøb og eksisterende autocomplete. Skjul ikke leveringspris i et lukket panel.

**Hypotese/mål:** Højere andel af checkoutstarter, der når bekræftet betaling; lavere fejlrate pr. felt og mindre gentagen indtastning. Afkræft, hvis den nye rækkefølge blot giver længere tid uden bedre fuldførelse. Fjern ikke nødvendige felter eller oplysninger alene for et mindre tal.

## 3. Social dokumentation skal kunne efterprøves

**Princip:** Troværdig social dokumentation og sammenhæng mellem udsagn og virkelighed; flere badges er ikke i sig selv mere tillid.

**Evidens:** AGENTS.md siger 4,7, mens `src/lib/trustpilot/constants.ts` og live header/footer viser 4.8. `trustpilot-reviews.tsx` har tre navngivne fallback-anmeldelser, som vises, når der ikke er hentede anmeldelser; de samme tekster blev set live under en verificeringspåstand. Oprindelsen er ikke dokumenteret i det læste materiale — de kaldes ikke falske her. `api/homepage-products/route.ts` sorterer “bestsellers” efter `deviceCount` og pris, ikke salg. “Se alle” fra denne sektion fører til smartphones, selv når den viser bærbare. Footerens e-mærket-link går til organisationens forside, ikke en PhoneSpot-verifikation.

**Konkret forslag:** Én godkendt ratingkilde og dansk formatering efter AGENTS.md, indtil ejeren afklarer kilden. Kun anmeldelser med dokumenteret oprindelse; ved fejl et neutralt link til Trustpilot. “Udvalgte enheder” med reelt udvælgelseskriterium, eller ægte salgsbaseret liste med periode. Match “Se alle” til udvalget. Link e-mærket til faktisk virksomhedsverifikation, når denne er bekræftet.

**Mål:** Ingen udokumenterede påstande i indholdskontrol; mål dernæst tillidsklik, køb og brugerens forklaring af, hvorfor de stoler på siden. En bedre købsrate berettiger aldrig urigtige udsagn.

## 4. Kunden skal huske og genfinde sin telefonmodel

**Princip:** Genkendelse frem for hukommelse ([NN/g](https://www.nngroup.com/articles/recognition-and-recall/)).

**Evidens:** Modelvalg ligger i kategorifiltre, skjult bag mobilfilter. Link fra enheds-PDP til hele tilbehørshubben taber den konkrete model. Live NovaNL-cover havde flere covers under overskriften “Skærmbeskyttelse”; kategoriens PDP-kode har fallback til søskendeprodukter. Lange produktnavne afkortes på kort, hvor det vigtigste kompatibilitetsled kan forsvinde.

**Konkret forslag:** Synlig modelkontekst hele vejen, entydige relationer, modeltekst der ikke afkortes, og kun korrekt kategorimatch i krydssalg. Ved ukendt match: hjælp/afklaring frem for “passer”. Modelvælgeren på glassiden er et eksisterende godt mønster. Se [tilbehørsoplæg](02-tilbehoer.md).

**Hypotese/mål:** Flere kompatible produktvalg/tilføjelser pr. modelbesøg; færre søgeomveje og returer pga. pasform. Det midlertidige katalog må ikke bruges som baseline for et helt ændret udvalg uden segmentering.

## 5. Et nyt katalog skal kunne vises komplet og ærligt

**Princip:** Konsistens og pålidelig systemstatus ([NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/)).

**Evidens:** Covers skiftede fra 397 til 200 efter indlæsning. API'et har `.limit(200)`; klientens sortering kan dermed kun rangere et udsnit. `online_stock` sættes til 99 som fallback, også ved ikke-positiv fundet lagerbeholdning. Det er kodefund, ikke en konklusion om hvilke varer ejeren reelt har.

**Konkret forslag:** Én samlet filtreret total, serverbaseret sortering og paginering/“Vis flere”. Lagerstatus skal komme fra en aftalt faktisk kilde; ukendt må ikke omdannes til “på lager”. Tomtilstand giver relevant hjælp eller modelskift. Afklar dette sammen med katalogoprydningen, ikke med manuel rettelse af dagens tal.

**Mål:** Andel publicerede relevante SKU'er, der kan findes, overensstemmelse mellem lagerstatus og kilde, nulresultater og sorteringskonsistens; sekundært kategori → PDP → køb. Hvis det nye katalog er under 200, er risikoen ved grænsen mindre, men lagerfallback skal stadig afklares.

## 6. Nye tilbud afbryder en allerede truffet købsbeslutning

**Princip:** Brugerens kontrol og fokuseret opgaveforløb ([NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/)).

**Evidens:** Tilføjelse af en enhed åbnede en hel mobilflade med glas før kurven. “Nej tak” findes, så tilkøb er ikke obligatorisk, men kræver et ekstra valg. Nyhedsbrev kan åbne efter omkring 30 sekunder. Kurvens ekstra salg og kontaktfelt konkurrerer om den faste højde i `cart-drawer.tsx`.

**Konkret forslag:** Prøv ét roligt valgfrit tilbehørsafsnit i den eksisterende købsflade. Gør telefon, samlet pris og checkout synlige og undgå gentaget opsalg. Udsæt automatisk nyhedsbrevsafbrydelse på købstrin; behold en frivillig indgang. Den eksisterende reservationsperiode må kun beskrives som den reelle reservation, aldrig som opdigtet knaphed.

**Hypotese/mål:** Færre frafald fra `add_to_cart` til `begin_checkout` og højere betalt konvertering uden lavere dækningsbidrag pr. enhedsbesøg. Mål tilbehørsandel som kontrolmål; højere opsalg alene er ikke et tilstrækkeligt resultat.

## 7. Pris og delbetaling fortæller ikke helt samme historie

**Princip:** Forståelig prisforankring og intern konsistens.

**Evidens:** Den samme telefon til 1.900 kr. viste 633 kr./md. ét sted og 634 kr. i tre rater et andet. Afrunding er fordelt på komponenter. Nogle kollektionsafsnit bruger statiske fra-priser. På PDP uden en faktisk nypris blev der derimod ikke opfundet en overstreget pris — det er godt. Glaspriser på dedikeret side og opsalg er forskellige; det er ikke dokumenteret, at de er samme SKU, så det kaldes ikke en prisfejl.

**Konkret forslag:** Fuld pris primær. Én godkendt ratevisning med korrekt total/rest og link til de faktiske vilkår. Nypris/besparelse kun med gyldigt sammenligningsgrundlag for samme model/konfiguration; ingen grade A-pris brugt som “nypris”. Fra-pris afspejler købbar vare eller udelades. Afklar glasvariant og montering, før priser sammenlignes.

**Mål:** Nul modstridende prisvisninger; forståelse af samlet betaling i brugertest; senere checkoutfuldførelse og henvendelser om pris. Prisregler og finansieringsvilkår skal afklares med ejeren, ikke opfindes som copy.

## 8. Opkøb blander formularens varighed, tilbud og udbetaling

**Princip:** Forudsigelighed og præcise forventninger.

**Evidens:** `/saelg-din-enhed` siger tilbud inden 24 timer og flere steder straksbetaling/penge inden 24 timer; andre tekster kobler betaling til modtagelse og kontrol. PDP-teaser lover pris på 30 sekunder, mens wizardens afsluttende tekst siger svar inden 24 timer. “Åben nu” står statisk ved butikkerne og blev set efter de anførte lukketider. Formularen ligger efter lange introduktions-/kategorisektioner på mobil.

**Konkret forslag:** Skeln mellem udfyldningstid, svartid på tilbud og udbetaling efter kontrol. Brug ejerens bekræftede tider, konsekvent på alle indgange. En direkte “Få et tilbud”-CTA før den lange introduktion. Vis åbningstider eller beregnet åben-status fra den fælles butikskilde. Bevar “Ved ikke” i standsspørgsmål og den eksisterende vej for en ukendt model.

**Hypotese/mål:** Kvalificerede henvendelser pr. start, faktisk tid til tilbud, tilbudsaccept og modtagne enheder. En højere formularrate med flere misforståelser er ikke succes. Aktuelle modelvalg bliver revideret med kataloget; flowet må fortsat håndtere modeller uden for listen.

## 9. Generiske modelbilleder besvarer ikke “hvordan ser min enhed ud?”

**Princip:** Risikoreduktion ved beslutningen og konkret dokumentation.

**Evidens:** PDP har allerede gradeforklaring, tilgængelige varianter og garanti ved køb. Batterispecifik visning afhænger korrekt af kendt `battery_health`; den observerede telefon viste ingen individuel batteriprocent. Generel tekst siger samtidig, at batteriet måles/vises. Packshots og de gentagne testfotos viser ikke kosmetisk forskel på A/B/C. Det er ikke dokumentation for manglende test af enheden.

**Konkret forslag:** Ved gradevalg: kort forklaring + faktiske repræsentative gradefotos tydeligt mærket som eksempler, eller den konkrete enheds fotos hvis tilgængelige. Kendt batteriværdi ved pris/valg; ukendt må ikke erstattes med opdigtet minimum. Beskriv præcist, hvilke fotos/data kunden ser. Bevar lagerbevidste defaults, men forklar automatisk variantskift og den nye pris.

**Hypotese/mål:** PDP → kurv → betalt køb, grade-skift og efterfølgende exit, supportspørgsmål om stand/batteri og standrelaterede returer. Effekten kræver faktiske foto-/batteridata, så indsatsen er større end en ny komponent.

## 10. Reparation kræver forklaring efter et konkret servicevalg

**Princip:** Lavere formulararbejde og sprog, der svarer til kundens opgave ([Baymard](https://baymard.com/blog/checkout-flow-average-form-fields)).

**Evidens:** Efter iPhone 12 → batteriskift er “Beskriv problemet” stadig obligatorisk sammen med navn, telefon og email. Skærmvalget skelner Original/OEM/Budget uden en tydelig forklaring i det observerede valg. Fem trin slutter med “Betal”, men betaling i butik er mulig. Koden kræver butik og ønsket dato, ikke et klokkeslæt eller en verificeret ledig tid. Datoer starter i morgen og udelader søndag, mens butikkerne viser søndagsåbent; reparationskapaciteten er ukendt.

**Konkret forslag:** Valgfri ekstra beskrivelse ved entydig service, påkrævet ved ukendt fejl/diagnostik efter værkstedets behov. Forklar skærmkvaliteters faktiske forskelle. Vis tydeligt “ønsket dato” og hvornår butikken bekræfter, hvis systemet ikke reserverer et tidspunkt. Afklar servicetider med butikkerne før søndage åbnes. Bevar kontaktfelter, som driften dokumenterer behov for.

**Hypotese/mål:** Frafald pr. trin, udfyldningstid og kvalificerede bookinger; kontrolmål er opklarende opkald, ombookinger og faktisk gennemførte reparationer. Fire trin er ikke automatisk bedre end fem, hvis arbejdet inde i dem er uændret.

## Friktionskort: optælling

Talt som synlige tekstfelter, beslutningsgrupper og skærmtrin — ikke som præcise klik for alle mulige kunder. Feltantal alene beviser ikke omsætning. Forvalgte gyldige varianter kan mindske klik, men ikke behovet for at forstå valget.

| Flow | Skærme og handlinger | Tekstfelter | Beslutninger/forbehold |
|---|---|---|---|
| Enhed til betaling | PDP → glas-opsalg → kurv → `/kasse` → hosted betaling → bekræftelse. Observeret kort vej fra PDP: tilføj, afvis glas, gå til kasse, derefter indsendelse til betaling (ikke udført). | Kasse: 7 kontakt-/adressefelter, heraf 6 påkrævede og adresselinje 2 valgfri; plus valgfri rabatkode = 8 synlige tekstfelter. Kurvens emailtilbud er ekstra/valgfrit. Hosted felter er ikke live optalt. | Grade, lagerplads, farve (kan være forvalgt); glas til/fra; fragtmetode; pakkeshop betinget; betalingsmetode hos udbyder. Guest checkout findes. |
| Reparation, én enhed | Enhed → Reparation → Detaljer → Aflevering → Betal; 4 Næste-overgange + afsluttende valg/indsendelse. | 4 påkrævede tekstfelter: navn, email, telefon, problembeskrivelse. | Mærke, model, mindst én service, butik, ønsket dato, betalingsvej = mindst 6 grupper. Farve og glas ekstra/valgfrie; flere enheder tilføjer gentagelser. Live trin 1–3, resten kode. |
| Opkøb, kendt telefon | Enheder → Stand → Levering & kontakt; 2 Næste-overgange + send; efterfølgende tilbud/accept uden for første formular. | 3 påkrævede kontaktfelter + valgfri kommentar. Ukendt model giver 2 ekstra tekstfelter. | Type, mærke, model = 3; stand har 5 grupper inkl. kontolås; levering = 1: mindst 9 krævede grupper. Lagerplads valgfri i valideringen; kontaktpræference og butik har defaults/betingelser. Fejl og flere enheder giver flere valg. |
| Opkøb efter tilbud | Link til accept → oplysninger/aftale → forsendelse/aflevering → kontrol/udbetaling. Kodekontrol, intet personligt tilbud åbnet. | Acceptformularen indsamler navn, adresse, postnummer, by, registreringsnummer og kontonummer samt aftalebekræftelse. | Dette arbejde skal medregnes i samlet kunderejse; første lead er ikke et færdigt opkøb. |

## Dækning og yderligere kontroller

| Område | Browser | Kildekontrol/grænse |
|---|---|---|
| Forside | Desktop + mobil | Sektioner, billeder, CTA'er, trust og produktudvalg |
| `/iphones` | Desktop + mobil | Kollektion, filtrering, lager, pris/grade |
| `/refurbished/apple-iphone-12` | Desktop + mobil | Valg, pris, foto, batteri, garanti, krydssalg |
| Kurv og `/kasse` | Desktop + mobil | Én testkurv; fjernet igen. Ingen ordre/betaling |
| `/tilbehoer`, covers, glas, tilbehørs-PDP | Desktop + mobil | Modelvalg, count, pris, sammenligning, lager og krydssalg |
| `/reparation`, `/reparation/booking` | Desktop + mobil | Første tre bookingtrin live; sidste to, betaling og bekræftelse kode |
| `/saelg-din-enhed` | Desktop + mobil; alle tre formulartrin | Ingen indsendelse; tokenbaseret accept/afvisning kun kode |
| Kvalitet, garanti, butikker, delbetaling, forsikring, kontakt, øvrige indholdsskabeloner | Kildegennemgang; ikke alle skærme live | Forsikring er eksisterende Storstrøm-leadflow. Private kontosider og hvert enkelt katalog-/blog-URL er ikke gennemklikket |

Dette er en audit af de centrale kunderejser og fælles skabeloner, ikke en påstand om udtømmende test af alle offentlige URL'er. Manglende livekontrol af hosted betaling og fysisk mobil skal lukkes før godkendelse af senere implementeringer. Ingen målt hastighed, Core Web Vitals eller fuld WCAG-konformitet påstås.

Yderligere ejerafklaringer: certificeret datasletning, miljøprocenter og “markedets bedste priser” på opkøbssiden skal have belæg eller præciseres; de er ikke gentaget som fakta i ny copy. Kontroller faktisk e-mærket-status og returpolitik før nye formuleringer. Tjek menufokus, dialogfokus, zoom, trykflader og synlig mobilkøbsknap på fysisk Safari/Chrome. Bevar egne canonicals, sitemap og eksisterende JSON-LD ved senere ændringer af offentlige sider.

## Direkte kildespor til review

- Pris/kasse: [sidens rækkefølge](../../../src/app/kasse/page.tsx), [formular og fragtstate](../../../src/components/checkout/checkout-form.tsx), [sammendrag](../../../src/components/checkout/checkout-summary.tsx).
- Tillid: [ratingkonstant](../../../src/lib/trustpilot/constants.ts), [fallback-anmeldelser](../../../src/components/trustpilot/trustpilot-reviews.tsx), [produktudvalgets sortering](../../../src/app/api/homepage-products/route.ts).
- Tilbehør: [API og lagerfallback](../../../src/app/api/accessories/route.ts), [layout/filtre](../../../src/components/tilbehoer/tilbehoer-layout.tsx), [produkt og krydssalg](../../../src/app/tilbehoer/[category]/[slug]/page.tsx).
- Valg og afbrydelser: [enheds-PDP](../../../src/components/product/device-detail.tsx), [kurv](../../../src/components/cart/cart-drawer.tsx), [opsalg](../../../src/components/cart/upsell-modal.tsx).
- Service: [reparationswizard](../../../src/components/repair/booking-wizard.tsx), [opkøbswizard](../../../src/components/sell-device/sell-device-wizard.tsx), [opkøbsside](../../../src/app/saelg-din-enhed/page.tsx), [accept efter tilbud](../../../src/app/saelg-din-enhed/accepter/page.tsx).
