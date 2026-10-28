# AI-tilbehørsoptagelse (hurtig-cover v2) — design

Dato: 2026-10-28. Ejer: PhoneSpot-ejeren. Bygger videre på `/admin/produkter/hurtig-cover` (live 28/10, commits 753d806…970c5b9).

## Hvorfor

På kontoret i Vejle står der kasser og 20+ poser med tilbehør, formentlig tusindvis af stk. Intet af det er oprettet i systemet. Ejeren vil have det solgt hurtigt og billigt, og margen betyder ikke noget. En praktikant gør arbejdet med en telefon.

Det nuværende hurtig-flow går ud fra, at en kasse er ens covers, og at praktikanten selv ved modellen og vælger den i en lang liste. Virkeligheden er anderledes (se ejerens foto 28/10):

- **Blandet indhold.** Mest covers, men også flip- og pung-covers, beskyttelsesglas og Apple Watch-remme.
- **Mange mærker.** Ægte Apple Silicone Case (ældre modeller), ægte Samsung Silicone Cover, NovaNL, Rixus, Celly, Swissten, Shield, Din Certco og no-name.
- **Pakket og løst blandet.** Pakkede varer har modellen trykt på forsiden ("iPhone 13 mini Silicone Case", "For iPhone X/XS", "Galaxy A23"). Løse covers har ingen tekst og ingen stregkode.
- **Flere modeller på én pakke**, fx "iPhone 12/12 Pro".
- **Mange ældre modeller**, der ikke er i `TILBEHOER_DEVICES` (fx Galaxy S8, S20 Ultra, iPhone 11 Pro Max).
- **Bunker af ens varer**, også fordelt over flere poser. Praktikanten opretter 20 stk. og finder senere 10 mere.
- **Gamle butiksprismærker** sidder på pakkerne.

## Mål

1. Praktikanten klarer en vare eller bunke på under 30 sekunder: ét foto, tjek, antal, gem.
2. AI læser fotoet og udfylder varetype, mærke, model(ler), farve, titel og beskrivelse.
3. Genkendelse af allerede oprettede varer, også uden stregkode. Ejerens eksempel: "hov, den har du allerede oprettet, vil du tilføje flere på lager?"
4. Professionelt produktbillede, der altid viser selve varen uden emballage.
5. Rixus og NovaNL bruger vores eksisterende vare (billede og tekst), når stregkode eller varekode matcher.

## Ikke-mål

- Ingen opslag på leverandørsider (EMC/NovaNL) i denne omgang. Ejeren valgte det fra.
- Ingen "3 for 129 kr." eller bundter.
- Ingen ny kategori eller side til urremme.
- Ingen ændring af checkout, betaling, fragt eller migrationer, der kræver ejerens aftale.

## Anti-mål (ville være en fiasko, selvom det teknisk virker)

- **AI finder på egenskaber**, fx MagSafe, stødsikring eller "militærgodkendt", som ikke står på pakken eller kan ses. Det bryder markedsføringsloven og giver returneringer.
- **AI-billedet ændrer produktet** (farve, print, kamerahul, logo), så kunden får noget andet end billedet viser.
- **Lager lægges på en forkert eksisterende vare** uden at praktikanten har bekræftet det.
- **Gamle prismærker bliver vist som førpris.** 30-dages-reglen: der må ikke være nogen førpris.
- **Brud på AGENTS.md** i genereret tekst:
  - aldrig "Panserglas"
  - tilbehør har 2 års reklamationsret, aldrig 36 måneders garanti
  - ingen emojis
  - aldrig "Foxway" eller "dropship"
  - aldrig "original kasse"

## Ejerens beslutninger

- Apple-logo-coverne er **ægte Apple** og sælges som det, de er (ældre modeller).
- Produktbilledet viser **altid selve varen uden pakke**. Pakkede covers tages ud til produktfotoet.
- **Rixus og NovaNL** bruger vores eksisterende produktbilleder, når varen findes.
- **AI laver et professionelt produktbillede** ud fra praktikantens foto.
- **Antal tastes** pr. vare/bunke. Dubletter uden stregkode genkendes på foto, og praktikanten tilføjer lager.
- Hvis modellen ikke kan læses (løse covers), skal flowet stadig virke.

## Flow pr. vare/bunke

1. **Butik** vælges øverst (Vejle) som i dag.
2. **Scan stregkode** (kamera eller USB/Bluetooth-scanner) eller tryk "Ingen stregkode".
   - **Kendt kode** (`ean` eller `barcode` på en accessory) viser kortet "Den har du allerede oprettet": billede, titel, nuværende lager i butikken, felt til antal og knappen "Læg på lager".
     - Hvis varen er en kladde eller ikke er på udsalg (fx Rixus/NovaNL-kladder), viser kortet også "Sæt på udsalg til X kr.". Det publicerer varen, sætter `attributes.udsalg = "Ja"`, sætter pris og lægger antal på lager i ét tryk.
   - **Ukendt kode** gemmes som varens EAN/barcode, og flowet fortsætter til trin 3.
3. **Foto til aflæsning.** Pakkens forside, eller selve coveret hvis det er løst.
4. **AI-aflæsning** (server). Returnerer struktureret JSON:
   - `productType`: cover, flip_cover, screen_protector eller other
   - `brand`
   - `isGenuineBrandProduct`: fx ægte Apple
   - `models[]`: slugs fra modellisten, kan være flere
   - `modelConfidence`
   - `caseType`, `color`
   - `features[]`: kun synlige eller trykte
   - `titleDa`, `descriptionDa`
   - `readText`: den tekst, AI'en kunne læse
5. **Dubletsøgning** (server) på `brand`, `models`, `productType`, `caseType` og `color` blandt eksisterende accessories med `udsalg = Ja` samt Rixus/NovaNL-kladder.
   - Viser op til 3 kandidater med billede: "Er det denne?", hver med antal-felt og "Læg på lager".
   - "Nej, ny vare" fortsætter.
6. **Ny vare, bekræft:** forudfyldt formular.
   - Model vælges via søgefelt med flere valg. Lav sikkerhed markeres tydeligt, og modellen skal da bekræftes aktivt.
   - Type- og farvechips.
   - Pris med forslag, kan ændres (se Pris).
   - Titel og beskrivelse kan redigeres.
   - Antal.
7. **Produktfoto:** praktikanten tager et foto af selve varen uden pakke.
   - Systemet laver to versioner:
     - (a) fritlagt studio som i dag (`removeBackgroundFromBlob` + `composeStudioPhoto`)
     - (b) AI-studiofoto
   - Praktikanten vælger én. (a) er standard, hvis (b) fejler eller er langsom.
   - Hvis aflæsningsfotoet allerede viser en løs vare, kan det genbruges som produktfoto ("Brug samme foto").
8. **Gem** opretter varen som i dag:
   - POST `/api/admin/products`, `status: published`, `udsalg: Ja`, butikslager
   - ved "Ingen stregkode" en intern EAN-200 og etiketprint
   - "Næste" beholder butik.

For `productType = other` (urremme m.m.) oprettes varen som **kladde** med billede og tekst, men kommer ikke på udsalgssiden. Ejeren tager stilling senere.

## Pris (mit valg, kan ændres)

Pris foreslås ud fra mærke og type. Praktikanten kan altid vælge en anden chip (49/59/79/99/129).

| Gruppe | Forslag |
|---|---|
| Ægte Apple / ægte Samsung cover | 99 kr. |
| Kendt mærke (NovaNL, Rixus, Celly, Swissten, Shield m.fl.) | 79 kr. |
| Flip- og pung-cover, kendt mærke | 99 kr. |
| No-name / løst cover | 59 kr. |
| Beskyttelsesglas | 49 kr. |

Ingen førpris, og gamle prismærker ignoreres. AI'en bliver eksplicit bedt om ikke at returnere priser.

## Teknik

### AI-aflæsning

- Ny route `POST /api/admin/accessories/identify`, kun for personale (under `/api/admin`, middleware dækker).
- Tager et nedskaleret JPEG (ca. 1280 px) som base64.
- Kalder Claude vision med `@anthropic-ai/sdk`. Det er samme `ANTHROPIC_API_KEY` som mail-agenten, og den findes i Vercel prod.
- Model: `claude-sonnet-5-5` (hurtig og billig nok, ca. 1-2 øre pr. kald). Mit valg.
- Bruger tool use / JSON-schema til struktureret svar.
- Modellisten (slug + label) sendes med, så AI'en kun vælger eksisterende slugs. Kan den ikke matche, returnerer den `unknownModelText` med det læste navn.
- Systemprompten indeholder:
  - kun synligt eller trykt indhold
  - ingen priser
  - AGENTS.md-ordregler
  - dansk sprog
  - tilbehør = 2 års reklamationsret
  - titelformat "{Mærke} {type} til {model(ler)}, {farve}", fx "Apple Silicone Case til iPhone 13 mini, grøn"
  - "Apple"/"Samsung" må kun stå i titlen, hvis varen er det mærkes eget produkt; ellers "til iPhone …"
- Efterfiltrering i koden:
  - forbudte ord ("Panserglas", "garanti" med 36 måneder, emojis)
  - ukendte slugs fjernes
- Timeout 20 s. Fejler kaldet, kører flowet videre som i dag med manuelt valg og skabelontekst.

### AI-studiofoto

- Ny route `POST /api/admin/accessories/studio-photo`, kun for personale.
- Sender det fritlagte PNG til OpenAI Images edit (`gpt-image-1`, `input_fidelity: high`, `quality: medium`, 1024×1024).
- Prompt: samme produkt uændret (farve, print, logo, huller, form), professionel e-handelsfoto, lys baggrund #f5f5f2, blød skygge, centreret, ingen tekst, ingen ekstra genstande.
- Returnerer WebP, som klienten uploader med den eksisterende `uploadImageBlob`.
- Pris ca. 30-50 øre pr. billede.
- `OPENAI_API_KEY` ligger i `.env.local`, men ikke i Vercel prod. Den skal tilføjes til Vercel production (ejeren har givet lov til infra-trin).
- Mangler nøglen, eller fejler kaldet, vises kun version (a).

### Dubletsøgning

- Ny route `POST /api/admin/accessories/match` (eller del af identify-svaret). Mit valg: del af identify-svaret, så det er ét kald.
- Query på `sku_products`, hvor `category = 'accessory'` og (`attributes->>'udsalg' = 'Ja'` eller `brand in (Rixus, NovaNL)`), med `compatible_models` overlap og samme `subcategory`.
- Scoring i kode: mærke, case_type og farve matcher.
- Top 3 med billede og butikslager.
- Ingen billed-embeddings i denne omgang. Praktikanten bekræfter altid.

### Data

- `attributes`: eksisterende `case_type`, `color`, `udsalg` plus `genuine` ("Ja" for ægte mærkevare) og `ai_read_text` (det læste, til fejlsøgning). Kun attributter i JSON, ingen migration.
- `subcategory`: cover, screen_protector eller other.
- Flip/pung = cover med `case_type` Flip/Wallet.
- `compatible_models`: alle valgte slugs.

### Modelliste

Udvid `TILBEHOER_DEVICES` med ældre modeller, der typisk ligger i kasserne:

- iPhone 6/6s, 6/6s Plus, SE (2016), 11 Pro Max hvis den mangler
- Galaxy S8, S8+, S9, S9+, S10, S10+, S10e, S20, S20+, S20 Ultra, S20 FE, S21, S21+, S21 Ultra, Note 10/20
- A12, A13, A14, A22, A23, A32, A33, A34, A52, A53, A54

Tjek først, hvilke der allerede findes. Udsalgssidens modelsider bruger samme liste og bliver først indekseret ved mindst 3 covers.

### UI

- Mobile-first som i dag, i `quick-cover.tsx`. Kan deles i underkomponenter, filen er 565 linjer.
- Model-søgefelt med flere valg erstatter `<Select>`.
- AI-felter markeres diskret ("Udfyldt af AI, tjek"). Lav sikkerhed på model kræver aktivt valg, før Gem kan trykkes.
- Billedvalg: to thumbnails side om side. Den valgte har ramme.
- Navnet i menuen ændres fra "Hurtig cover-optagelse" til "Hurtig tilbehørsoptagelse". URL'en beholdes.

## Test

- Unit:
  - efterfiltrering af AI-tekst (forbudte ord, ukendte slugs)
  - prisforslag
  - dublet-scoring
  - titelbygger-fallback
- Route-tests med mocket Anthropic/OpenAI.
- Live-test i Chrome med ejerens admin-session:
  - ét pakket cover (foto af ejerens billede eller syntetisk)
  - ét løst cover
  - dublet-genkendelse
  - Rixus-kladde via kode
  - Til sidst slettes testvarerne igen som ved første test.

## Afklaringer efter builder-check (mine valg, markeret)

- **Beskyttelsesglas (mit valg, ejeren bad om at gå i gang straks).** Glas fra kasserne oprettes som `screen_protector`, publiceret til 49 kr. på den almindelige `/beskyttelsesglas`-side med `udsalg: Ja` i attributterne. `/covers-udsalg` ændres ikke og viser fortsat kun covers. Det kan ændres senere uden dataændring.

- **Trykte varekoder (mit valg).** Identify returnerer også `supplierCodes[]` (fx "RIX02646"), læst fra pakken. Der matches eksakt mod `ean`/`barcode` FØR dublet-scoringen. Et eksakt match vises som "Den har du allerede oprettet" (samme kort som ved scanning).
- **Rixus/NovaNL-kladder (mit valg):**
  - En **cover-kladde** får "Sæt på udsalg til X kr.", hvor X er prisforslaget fra tabellen (79 kr.).
  - **Andre kladder** (oplader, kabel, glas) får "Udgiv og læg på lager" til den eksisterende `selling_price` uden `udsalg`.
  - En **allerede publiceret vare til fuld pris** får kun lager lagt til, aldrig ny pris fra praktikantens tryk.
- **Ældre modeller (mit valg).** De tilføjes med flaget `legacy: true` i `TILBEHOER_DEVICES`. Legacy-modeller vises i admin og på `/covers-udsalg` (kun hvis der er covers). De filtreres fra i de offentlige filtre, BrandGrid, SmartSearch, brand-karrusel og sitemap, undtagen udsalgs-modelsider med mindst 3 covers.
- **Attributter.** `udsalg`, `genuine` og `ai_read_text` tilføjes til `TYPE_ATTRIBUTES` for de typer, der bruges (cover og evt. screen_protector), fordi `cleanAttributes` afviser ukendte nøgler.

## Overladt til den der bygger

- Komponentopdeling og præcis prompttekst.
- Hvordan "Brug samme foto" præsenteres.
- Om identify og match er ét eller to kald, så længe praktikanten venter højst én gang.
