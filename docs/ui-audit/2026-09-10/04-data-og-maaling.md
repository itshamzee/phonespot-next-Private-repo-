# Databestilling og måleplan

## Det ved vi, og det ved vi ikke

Vi har kildekode og browserobservationer. Vi har ikke trafikfordeling, konverteringsrater, dækningsbidrag, lagerkvalitet eller rapporter fra GA4. “Mest trafik er mobil” og “tilbehør har god avance” er oplysninger fra ejeren, ikke verificerede måleresultater. Psykologiske principper giver hypoteser; de er ikke PhoneSpot-specifikke beviser for omsætning.

Kataloget er under væsentlig revision. Bed om ændringsdato og en markering af udgåede/nye SKU'er. Før/efter-tal kan ellers forveksle design med pris, lager, kampagner og sortiment. Start en ny stabil baseline efter katalogskiftet, eller sammenlign samtidige varianter på samme tilgængelige varer.

## Bestilling til ejeren

Eksporter CSV fra GA4 med Europe/Copenhagen, DKK og **seneste 28 afsluttede døgn**, samt **90 afsluttede døgn** for lavtrafiksider og sæsonkontekst. Medsend faktiske datointervaller, datakvalitetsadvarsler, filtre, eventnavne og om beløb inkluderer fragt/moms/refusioner. Ingen navne, emails, telefonnumre, adresser, bank-/betalingsoplysninger eller tilbudstokens.

| Prioritet | Rapport/eksport | Dimensioner | Tal og beslutning |
|---|---|---|---|
| 1 | Funnel Exploration: produkt → kurv → checkout → fragt → køb | Mobil/desktop/tablet; browser/OS; kanal; ny/tilbagevendende; enhed/tilbehør/blandet | Brugere ved hvert trin, frafald, tid mellem trin. Både åben funnel for direkte landinger og lukket funnel fra produkt. Hvor tabes reelle køb? |
| 2 | Landing page-rapport | Landing path uden følsomme queryparametre; device category; source/medium/campaign | Sessions, engagement rate, bounce rate, engagement time, købsrate, transaktioner og omsætning. Top 20 indgange + deres andel af trafik. Hvilke sider fortjener første indsats? |
| 3 | Ecommerce purchases/item-eksport | Stabilt item-ID, model-ID, kategori, brand, variant/grade hvis tilgængelig | Visninger, kurvtilføjelser, køb, antal, omsætning og refusioner. Hvilke modeller har efterspørgsel frem for blot stort lager? |
| 4 | Pages and screens + Path Exploration | Enhedsmodel-/kategoriside; mobil/desktop; indgangskilde | Produkttrafik, næste/forrige side, gentagne filter-/søgeomveje og exit. Hvad mangler før valg? |
| 5 | Intern søgning | Renset søgeterm eller kategoriseret term, model, side, nulresultat | Antal søgninger, resultatklik, efterfølgende kurv/køb. Kun termer uden persondata. Afklar eventuelle manglende søgeevents. |
| 6 | Events/key events samt konfiguration | Eventnavn, dato, device; eventparametre og custom dimensions | Antal, brugere, aktiveringstidspunkt, dubletter og coverage. Er `purchase` reelt en betalt ordre? |
| 7 | Reparations-/opkøbsfunnel | Trin, enhedstype/model, butik, kanal, device | Starter, gennemførte trin, kvalificerede henvendelser, bekræftelser, gennemførte reparationer eller modtagne opkøbsenheder. Et lead er ikke indtjening. |
| 8 | Aggregeret drift/katalog/POS-udtræk | Uge, model/SKU, ordretype, butik, returårsag; dato for katalogskift | Tilbehørsandel i enhedsordrer, indkøbspris, faktisk rabat, fragt-/monteringsomkostning, annulleringer, returer og lagerdækning. Grundlag for kommerciel prioritering. |

Hvis GA4-funnelen mangler events, lever eventinventaret og de eksisterende rapporter først. Vi udfylder ikke tomme trin med skønnede tal. Har ejeren allerede BigQuery-eksport, kan et minimalt pseudonymt eventsæt bruges til rækkefølge og deduplikering; ny eksport antages ikke at indeholde historiske data. Bed kun om de nødvendige felter og en aftalt retention/adgang.

Supplér med fem korte, frivillige brugersessioner med førstegangskøbere: find en passende telefon, forklar stand/batteri, vælg kompatibelt tilbehør, forklar samlet pris og start en reparations-/opkøbsopgave. Mål opgavesucces, tid og tvivl; fem interviews giver indsigter, ikke en statistisk konverteringsprocent. Ingen optagelse af betaling eller persondata.

## Den eksisterende tracking er ikke et komplet GA4-købsflow

`src/app/layout.tsx` indlæser `GoogleAnalytics`, hvis ID er konfigureret, og sætter Consent Mode-defaults. Der findes Meta-events i `src/lib/tracking/fbq.ts`. `trackInitiateCheckout` kaldes ved indsendelse af checkoutformularen, ikke ved indgang til kassen. `src/lib/tracking/gtag-ads.ts` sender `manual_event_PURCHASE` til Ads; det navn er ikke standardeventet `purchase` i GA4.

Den læste kode viser ikke et komplet standardiseret GA4-ecommerceflow. Det beviser ikke, at eksterne tags eller GA4-konfiguration ikke supplerer det. Bekræft med ejerens eventinventar, DebugView og Tag Assistant før implementering, så der ikke opstår dobbelttælling. Bevar eksisterende samtykkeadfærd; afvist samtykke og manglende tracking er ikke det samme som manglende køb.

## Forslag til én lille målings-PR — efter valg

Første PR kan dække produktvisning, kurv, checkoutindgang og centrale valg via eksisterende GA4-opsætning. Betalingsbekræftelse/serverevents er en særskilt opgave med eksplicit godkendelse, da betalingskode ikke er frit frontend-scope. Ingen events er implementeret i dette oplæg.

| Event | Præcist tidspunkt | Centrale parametre |
|---|---|---|
| `view_item_list` | En identificeret liste bliver synlig, én gang pr. listevisning | `item_list_id`, `item_list_name`, `items`, `source_section` |
| `select_item` | Klik på vare fra liste | Samme liste-ID, `items`, position, `source_section` |
| `view_item` | Gyldigt produkt og aktuel variant er vist | `currency: DKK`, `value`, `items`; stabilt model-/variant-ID |
| `add_to_cart` / `remove_from_cart` | Bekræftet kurvændring, ikke blot klik | Faktisk ændret antal/pris, `items`, `source_section`; intet succes-event ved reservationsfejl |
| `view_cart` | Kurven åbnes/ses | `currency`, `value`, `items`, kurvtype |
| `begin_checkout` | Ikke-tom checkout vises | `currency`, `value`, `items`; definer deduplikering ved genrender |
| `add_shipping_info` | Gyldigt fragtvalg er accepteret, pakkeshop inkl. hvor påkrævet | `shipping_tier`, `currency`, `value`, `items`; ingen adresse |
| `purchase` | Verificeret betalt ordre | `transaction_id`, `currency`, `value`, `tax`, `shipping`, `items`; deduplikering med samme transaktions-ID, afstemning med betalte ordrer |
| `grade_select` | Brugeren ændrer grade | `model_id`, `from_grade`, `to_grade`, prisforskel, `change_reason` = user/availability; automatisk skift adskilt |
| `accessory_model_select` | Model bekræftes i vælger | `model_id`, `source_section`, resultatantal; ikke rå inputtekst |
| `accessory_set_view` / `accessory_set_select` | Sættet ses / tilvalg ændres | Model, SKU'er, til/fra, kilde; køb måles med almindelige ecommerceevents |
| `repair_step_view` / `repair_step_complete` | Trin vises / valideret Næste | `step_id`, `device_type`, `device_count`, evt. model og butik; ingen kontakt- eller fejlbeskrivelse |
| `buyback_step_view` / `buyback_step_complete` | Samme definition for opkøb | `step_id`, type, kendt/ukendt model, antal enheder; ingen serial/IMEI |
| `form_validation_error` | En valideringsfejl faktisk vises | `flow`, `step_id`, tilladt `field_id`, standardiseret `error_code`; aldrig feltværdi eller fri fejltekst |
| `generate_lead` | Serveren har accepteret en henvendelse | `lead_type`: repair/buyback/insurance, `source_section`; forsikring forbliver en Storstrøm-interessehenvendelse |

Standardnavne og itemstruktur følger [Googles ecommercevejledning](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce) og [eventreference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events). Detaljer som `source_section` og grade/flow-events er PhoneSpot-specifikke forslag, ikke eksisterende måling.

Tilladte `source_section`-værdier kan være `home_hero`, `home_shop_tabs`, `home_bestsellers`, `collection_grid`, `pdp_accessories`, `cart_upsell`, `glass_picker`. Bevar stabil attribution fra listen; opfind ikke en kilde ved checkout. Brug centrale SKU-ID'er frem for produktnavn som joinnøgle, så katalogrettelser ikke splitter samme vare.

GA4-beløb skal være i kroner, ikke interne øre, med ens dokumenteret håndtering af rabat, antal, moms og fragt. Afstem `purchase` efter Googles definitioner med backend-beløb. Undgå dobbeltsending fra genrender, tilbage-navigation og genindlæst bekræftelse. Eksisterende Ads-/Meta-signaler er separate systemer og skal fortsat kunne afstemmes.

Frafald beregnes som gennemført trin uden næste trin/afslutning inden et defineret tidsvindue. Et `beforeunload`-event er ikke pålideligt bevis for opgivelse, især på mobil. Brug både sessionbaseret funnel og en længere opfølgningsperiode for opkøb/reparation. Se [Googles forklaring af ecommerce-funnels](https://support.google.com/analytics/answer/12216232?hl=en).

## Definitioner og beslutningsregler

- **Betalt købsrate:** sessions med verificeret betalt ordre / relevante sessions. Hold dette adskilt fra event counts og GA4's eventbaserede key-event rate.
- **Tilbehørsandel:** betalte enhedsordrer med mindst ét tilbehør / alle betalte enhedsordrer; refusioner følges separat.
- **Dækningsbidrag:** omsætning efter aftalt moms-/rabatbehandling minus indkøb, variable fragt-/betalings-/monteringsomkostninger og relevante returer. Ejeren fastlægger regnskabsdefinitionen; AOV alene er utilstrækkelig.
- **Kompatibilitet:** returer/henvendelser med verificeret forkert pasform pr. relevant solgt tilbehør; ikke alle returer.
- **Service:** kvalificeret lead, accepteret tilbud, faktisk gennemført reparation/modtaget enhed er forskellige hændelser og må ikke blandes.

Fastlæg baseline og én primær metric før et forsøg. Aftal mindste relevant effekt, stikprøvestørrelse, varighed i hele uger og stopregler ud fra faktisk trafik; opfind ikke “+20 %”. Hold variantfordeling stabil og samtidig. Segmentér mobil/desktop og dokumentér kampagner, lager og katalogskift. Rapporter usikkerhedsinterval og kontrolmål, ikke blot et grønt procenttal.

Ved utilstrækkelig trafik: brug opgavebaseret brugertest, valider korrekte beløb/match og rul begrænset ud med monitorering. Kald ikke et støjende før/efter-resultat en kausal designgevinst. Fejl i beløb, lagergrundlag og dokumentation skal ikke opretholdes som eksperimentkontrol.

Før godkendelse af målings-PR: demonstrér hvert event i DebugView med samtykke til/fra, mobil/desktop, fejl/succes, genindlæsning og tilbage-navigation. Afstem kendte testforløb med backend uden rigtige køb. Kontroller at URL'er for tilbud/status ikke sender tokens til analytics, og at ingen persondata indgår i parametre.
