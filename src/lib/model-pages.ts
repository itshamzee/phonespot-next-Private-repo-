// ---------------------------------------------------------------------------
// Model-specific landing page data
// ---------------------------------------------------------------------------

export type ModelSpec = {
  label: string;
  value: string;
};

export type ModelFaq = {
  question: string;
  answer: string;
};

export type ModelPage = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroHeading: string;
  collectionHandle: string;
  filterTag: string;
  specs: ModelSpec[];
  whyBuy: string;
  gradeExplanation: string;
  faq: ModelFaq[];
  relatedModels: string[];
};

export const MODEL_PAGES: ModelPage[] = [
  // ── 1. iPhone 15 Pro ────────────────────────────────────────────────
  {
    slug: "iphone-15-pro",
    title: "iPhone 15 Pro",
    metaTitle: "Refurbished iPhone 15 Pro | Spar Op Til 40% | PhoneSpot",
    metaDescription:
      "Køb refurbished iPhone 15 Pro med 36 mdr. garanti. Titanium-design, A17 Pro-chip, 48MP kamera. Testet med 30+ kontroller.",
    heroHeading: "Refurbished iPhone 15 Pro",
    collectionHandle: "iphones",
    filterTag: "iphone 15 pro",
    specs: [
      { label: "Chip", value: "A17 Pro" },
      { label: "Skærm", value: '6,1" Super Retina XDR, 120Hz' },
      { label: "Kamera", value: "48MP + 12MP + 12MP" },
      { label: "Batteri", value: "Op til 23 timers video" },
      { label: "Materiale", value: "Titanium" },
      { label: "5G", value: "Ja" },
      { label: "Face ID", value: "Ja" },
    ],
    whyBuy:
      "iPhone 15 Pro er Apples mest avancerede smartphone til dato og et fremragende valg som refurbished. Med det nye titanium-design er telefonen både lettere og mere holdbar end forgængerne i rustfrit stål, hvilket gør den ideel til daglig brug. A17 Pro-chippen leverer en ydelse i absolut topklasse — ikke blot til hverdagsopgaver som sociale medier, streaming og multitasking, men også til krævende spil og professionel videoredigering direkte på telefonen. Det avancerede 48MP tredobbelte kamerasystem med 5x optisk zoom giver dig fotografiske muligheder, der tidligere kun var forbeholdt dedikerede kameraer. Du kan optage video i ProRes-format og tage detaljerede natbilleder uden stativ. Med overgangen til USB-C er det slut med at jonglere forskellige kabler — du kan bruge det samme kabel til din MacBook, iPad og iPhone. Batteriet holder komfortabelt en fuld dag, selv ved intensiv brug. Når du køber refurbished hos PhoneSpot, får du præcis den samme oplevelse som med en ny iPhone 15 Pro, men til en markant lavere pris. Alle enheder gennemgår vores grundige 30+ punkts kvalitetskontrol, og du er dækket af 36 måneders garanti. Besøg vores kvalitetsside for at læse mere om vores testproces.",
    gradeExplanation:
      "iPhone 15 Pro har et titanium-ramme, som er mere modstandsdygtigt end rustfrit stål, men stadig kan vise brugstegn. Grade A betyder, at enheden er i næsten ny stand med minimale kosmetiske mærker — titaniumen ser praktisk talt uberørt ud. Grade B kan have lette ridser eller små mærker på kanterne, men skærmen er i fin stand. Grade C kan have synlige ridser og brugsspor på rammen og bagsiden, men enheden er 100% funktionel med fuld garanti. Uanset grade får du den fulde iPhone 15 Pro-oplevelse.",
    faq: [
      {
        question: "Er en refurbished iPhone 15 Pro lige så hurtig som en ny?",
        answer:
          "Ja, absolut. Ydelsen på en refurbished iPhone 15 Pro er identisk med en ny. Vi nulstiller enheden til fabriksindstillinger og opdaterer til den nyeste iOS-version, så du får præcis den samme A17 Pro-hastighed og alle funktioner.",
      },
      {
        question: "Virker alle kamerafunktioner på en refurbished iPhone 15 Pro?",
        answer:
          "Ja. Alle kamerafunktioner inklusiv 48MP hovedkamera, 5x optisk zoom, natmode, portrætmode, ProRes-video og Cinematic Mode fungerer fejlfrit. Vi tester alle kameraer grundigt som del af vores 30+ kontroller.",
      },
      {
        question: "Kan jeg bruge USB-C tilbehør med min refurbished iPhone 15 Pro?",
        answer:
          "Ja. iPhone 15 Pro bruger USB-C, så du kan tilslutte eksterne diske, skærme og opladere via USB-C. Alle porte testes og verificeres inden afsendelse.",
      },
      {
        question: "Hvor længe vil iPhone 15 Pro modtage iOS-opdateringer?",
        answer:
          "Apple understøtter typisk iPhones i 5-6 år med iOS-opdateringer. iPhone 15 Pro vil modtage opdateringer i mange år endnu, hvilket gør den til en fremtidssikret investering.",
      },
      {
        question: "Hvad er forskellen på iPhone 15 Pro og iPhone 15 Pro Max?",
        answer:
          "iPhone 15 Pro har en 6,1\" skærm, mens Pro Max har en 6,7\" skærm. Pro Max har desuden lidt bedre batteritid. Begge modeller deler den samme A17 Pro-chip, kamerasystem og titanium-design. Valget afhænger primært af din præference for skærmstørrelse.",
      },
    ],
    relatedModels: ["iphone-14-pro", "iphone-15"],
  },

  // ── 2. iPhone 14 Pro ────────────────────────────────────────────────
  {
    slug: "iphone-14-pro",
    title: "iPhone 14 Pro",
    metaTitle: "Refurbished iPhone 14 Pro | Spar Op Til 40% | PhoneSpot",
    metaDescription:
      "Køb refurbished iPhone 14 Pro med 36 mdr. garanti. Dynamic Island, 48MP kamera, A16 Bionic-chip. Testet med 30+ kontroller.",
    heroHeading: "Refurbished iPhone 14 Pro",
    collectionHandle: "iphones",
    filterTag: "iphone 14 pro",
    specs: [
      { label: "Chip", value: "A16 Bionic" },
      { label: "Skærm", value: '6,1" Super Retina XDR, 120Hz, Dynamic Island' },
      { label: "Kamera", value: "48MP + 12MP + 12MP" },
      { label: "Batteri", value: "Op til 23 timers video" },
      { label: "Materiale", value: "Rustfrit stål" },
      { label: "5G", value: "Ja" },
      { label: "Face ID", value: "Ja" },
    ],
    whyBuy:
      "iPhone 14 Pro var den første iPhone med Dynamic Island — Apples innovative måde at integrere kameraet i brugerfladen og vise notifikationer, musik og navigation i realtid. Denne funktion alene gør den til et markant spring fremad fra tidligere modeller. Med A16 Bionic-chippen får du fremragende ydelse til alt fra daglig brug til krævende opgaver som videoredigering og gaming. Det 48MP hovedkamera var en revolution da det blev lanceret, og det leverer stadig billeder i en kvalitet, der matcher langt dyrere kameraer. Du kan optage i 4K Cinematic Mode og tage fantastiske natbilleder. Skærmen med Always-On Display viser altid tid, widgets og notifikationer uden at dræne batteriet, takket være den energieffektive 120Hz ProMotion-teknologi. Rustfrit stål-rammen giver en premium følelse og er mere modstandsdygtig end aluminium. Med 5G-understøttelse er du klar til fremtidens mobilnetværk. Hos PhoneSpot kan du spare op til 40% sammenlignet med nyprisen på en iPhone 14 Pro, samtidig med at du får vores branchens bedste 36 måneders garanti og 14 dages fuld returret. Alle enheder gennemgår 30+ individuelle kvalitetstests, så du kan handle med ro i sindet.",
    gradeExplanation:
      "iPhone 14 Pro har en ramme i rustfrit stål, som er holdbar men kan samle synlige mærker over tid. Grade A er i næsten ny stand med kun meget svage kosmetiske mærker — rammen skinner stadig. Grade B kan have lette ridser på rammen og minimal slitage på bagsiden, men skærmen er uden synlige mærker. Grade C har mere synlige brugsspor og ridser, men alle funktioner virker perfekt, og du er dækket af vores fulde 36 måneders garanti.",
    faq: [
      {
        question: "Virker Dynamic Island på en refurbished iPhone 14 Pro?",
        answer:
          "Ja, Dynamic Island fungerer præcis som på en ny enhed. Det er en softwarefunktion kombineret med hardware-designet, så den viser live-aktiviteter, musik, opkald og navigation som forventet.",
      },
      {
        question: "Hvordan er batteriet på en refurbished iPhone 14 Pro?",
        answer:
          "Vi tester alle batterier med professionelt udstyr. Grade A enheder har minimum 85% batterikapacitet, Grade B minimum 80% og Grade C minimum 75%. Du får altid oplyst den præcise batterikapacitet.",
      },
      {
        question: "Er Always-On Display inkluderet?",
        answer:
          "Ja. Always-On Display er en native funktion i iPhone 14 Pro, som fungerer fuldt ud på alle refurbished enheder. Du kan naturligvis slå det til og fra i indstillingerne.",
      },
      {
        question: "Kan jeg bruge MagSafe-tilbehør med iPhone 14 Pro?",
        answer:
          "Ja, iPhone 14 Pro understøtter MagSafe fuldt ud. Du kan bruge MagSafe-opladere, covers, kortholdere og andet magnetisk tilbehør lige som på en ny enhed.",
      },
      {
        question: "Er iPhone 14 Pro stadig et godt køb i 2026?",
        answer:
          "Absolut. iPhone 14 Pro har stadig en af de bedste chips og kamerasystemer på markedet. Med iOS-opdateringer i mange år fremover og den markante besparelse på refurbished er den et fremragende køb.",
      },
    ],
    relatedModels: ["iphone-15-pro", "iphone-13-pro"],
  },

  // ── 3. iPhone 13 Pro ────────────────────────────────────────────────
  {
    slug: "iphone-13-pro",
    title: "iPhone 13 Pro",
    metaTitle: "Refurbished iPhone 13 Pro | Spar Op Til 40% | PhoneSpot",
    metaDescription:
      "Køb refurbished iPhone 13 Pro med 36 mdr. garanti. A15 Bionic-chip, 120Hz ProMotion, tredobbelt 12MP kamera. Testet med 30+ kontroller.",
    heroHeading: "Refurbished iPhone 13 Pro",
    collectionHandle: "iphones",
    filterTag: "iphone 13 pro",
    specs: [
      { label: "Chip", value: "A15 Bionic" },
      { label: "Skærm", value: '6,1" Super Retina XDR, 120Hz ProMotion' },
      { label: "Kamera", value: "12MP + 12MP + 12MP (tredobbelt)" },
      { label: "Batteri", value: "Op til 22 timers video" },
      { label: "Materiale", value: "Rustfrit stål" },
      { label: "5G", value: "Ja" },
      { label: "Face ID", value: "Ja" },
    ],
    whyBuy:
      "iPhone 13 Pro er en af de bedste værdi-for-pengene Pro-modeller, du kan finde som refurbished. Den var den første iPhone med 120Hz ProMotion-skærm, hvilket giver en mærkbart mere flydende og behagelig oplevelse, når du scroller, spiller eller bare navigerer rundt i iOS. A15 Bionic-chippen er stadig utroligt kraftfuld og håndterer alle moderne apps, spil og multitasking uden problemer. Det tredobbelte 12MP kamerasystem med ultravid, vidvinkel og tele (3x optisk zoom) tager fremragende billeder i alle lysforhold. Cinematic Mode til video var en banebrydende funktion, der lader dig optage video med automatisk fokusskift — perfekt til familievideoer og kreativt indhold. Med 5G-understøttelse og op til 1TB lagerplads er iPhone 13 Pro en telefon, der kan følge med i mange år endnu. Rammen i rustfrit stål giver premium kvalitet, og Ceramic Shield-fronten beskytter skærmen mod stød og ridser. Som refurbished hos PhoneSpot sparer du op til 40% i forhold til nyprisen, og du er dækket af 36 måneders garanti. Det er simpelthen et smart køb for dig, der vil have Pro-funktioner uden at betale Pro-pris. Alle vores iPhones testes med 30+ kontroller og leveres klar til brug med nyeste iOS.",
    gradeExplanation:
      "iPhone 13 Pro har en rustfrit stål-ramme og glasbagside. Grade A enheder er i næsten ny stand med minimale mærker — rammen og glasset ser stort set uberørte ud. Grade B kan have lette ridser på stålrammen og bagsiden, men skærmen er i god stand. Grade C kan have mere tydelige brugsspor og ridser på ramme og bagside, men enheden er fuldt funktionel og dækket af 36 måneders garanti.",
    faq: [
      {
        question: "Hvor længe vil iPhone 13 Pro modtage opdateringer?",
        answer:
          "Apple er kendt for at understøtte iPhones i 5-6 år med iOS-opdateringer. iPhone 13 Pro, lanceret i 2021, forventes at modtage opdateringer i flere år endnu, hvilket gør den til et sikkert valg.",
      },
      {
        question: "Er 120Hz ProMotion-skærmen en mærkbar forbedring?",
        answer:
          "Ja, meget. Forskellen mellem 60Hz og 120Hz er tydeligt synlig i daglig brug — scrolling er mere flydende, animationer er glattere, og den generelle oplevelse føles markant hurtigere og mere responsiv.",
      },
      {
        question: "Hvordan er kameraet på iPhone 13 Pro sammenlignet med nyere modeller?",
        answer:
          "iPhone 13 Pro har et fremragende 12MP tredobbelt kamerasystem med optisk zoom, natmode på alle objektiver og Cinematic Mode. Selvom iPhone 14/15 Pro har 48MP, er 13 Pro stadig i topklasse og mere end rigeligt til de fleste brugere.",
      },
      {
        question: "Kan jeg bruge min iPhone 13 Pro med alle danske operatører?",
        answer:
          "Ja. Alle vores iPhones er factory unlocked og virker med alle danske mobiloperatører — TDC, Telenor, Telia, 3, Lebara og alle andre. Du indsætter bare dit SIM-kort eller bruger eSIM.",
      },
      {
        question: "Hvad er forskellen på iPhone 13 Pro og iPhone 13?",
        answer:
          "iPhone 13 Pro har 120Hz ProMotion-skærm (vs. 60Hz), tredobbelt kamerasystem med tele-objektiv (vs. dobbelt), rustfrit stål-ramme (vs. aluminium) og op til 1TB lagerplads. Pro-modellen er det klare valg for foto-entusiaster og power-brugere.",
      },
    ],
    relatedModels: ["iphone-14-pro", "iphone-13"],
  },

  // ── 4. MacBook Air M2 ──────────────────────────────────────────────
  {
    slug: "macbook-air-m2",
    title: "MacBook Air M2",
    metaTitle: "Refurbished MacBook Air M2 | Spar Op Til 40% | PhoneSpot",
    metaDescription:
      "Køb refurbished MacBook Air M2 med 36 mdr. garanti. Apple M2-chip, 13,6\" Liquid Retina, op til 18 timers batteri. Testet med 30+ kontroller.",
    heroHeading: "Refurbished MacBook Air M2",
    collectionHandle: "computere",
    filterTag: "macbook air m2",
    specs: [
      { label: "Chip", value: "Apple M2" },
      { label: "Skærm", value: '13,6" Liquid Retina' },
      { label: "RAM", value: "8-24 GB" },
      { label: "Lager", value: "256 GB - 2 TB SSD" },
      { label: "Batteri", value: "Op til 18 timer" },
      { label: "Vægt", value: "1,24 kg" },
      { label: "Porte", value: "2x Thunderbolt/USB-C, MagSafe, 3,5mm" },
    ],
    whyBuy:
      "MacBook Air M2 er den ultimative bærbare computer til studerende, professionelle og alle, der vil have en kraftfuld, lydløs og ultralang bærbar. Med Apple M2-chippen får du en ydelse, der overgår mange ældre MacBook Pro-modeller — og det helt uden blæser, så computeren er fuldstændig lydløs under brug. Det nye design med flad kant og det større 13,6\" Liquid Retina-display er en markant opgradering fra den ældre kileformede Air. Skærmen er fantastisk til alt fra dokumentarbejde til billedredigering med understøttelse af P3 bredt farverum og 500 nits lysstyrke. Batteritiden på op til 18 timer betyder, at du kan arbejde en hel dag uden at lede efter en stikkontakt. Med kun 1,24 kg er den let nok til at tage med overalt. MagSafe-opladning er tilbage, hvilket frigør begge Thunderbolt-porte til tilbehør og eksterne skærme. Webcam er opgraderet til 1080p, og højttalersystemet med fire højttalere og Spatial Audio giver overraskende god lyd til en så tynd computer. Når du køber refurbished MacBook Air M2 hos PhoneSpot, sparer du op til 40% sammenlignet med nyprisen og får 36 måneders garanti. Alle bærbare gennemgår vores grundige kvalitetskontrol med 30+ tests af tastatur, skærm, batteri, porte og mere. Det er den smarte måde at få en premium-bærbar på.",
    gradeExplanation:
      "MacBook Air M2 har et anodiseret aluminiumschassis, som er holdbart men kan vise brugsspor. Grade A er i næsten ny stand med minimale kosmetiske mærker — chassiset og skærmen ser praktisk talt nye ud. Grade B kan have lette ridser eller små mærker på låget og bunden, men skærmen og tastaturet er i fin stand. Grade C kan have synlige brugsspor og mærker på chassiset, men alle funktioner inklusiv tastatur, trackpad, porte og batteri virker perfekt.",
    faq: [
      {
        question: "Er en refurbished MacBook Air M2 lige så hurtig som en ny?",
        answer:
          "Ja, præcis. M2-chippen yder identisk uanset om computeren er ny eller refurbished. Vi nulstiller til fabriksindstillinger og installerer den nyeste macOS, så du får den fulde M2-oplevelse fra dag et.",
      },
      {
        question: "Hvordan er batteriet på en refurbished MacBook Air M2?",
        answer:
          "Vi tester alle batterier grundigt med professionelt udstyr. MacBook Air M2 har op til 18 timers batteritid som ny. Vores refurbished enheder leveres med et batteri i god stand, og du er dækket af 36 måneders garanti, som også omfatter batteriet.",
      },
      {
        question: "Kan MacBook Air M2 køre professionelle programmer?",
        answer:
          "Ja. M2-chippen håndterer uden problemer programmer som Adobe Photoshop, Lightroom, Final Cut Pro, Xcode og Microsoft Office. Til tung videoredigering i 4K eller softwareudvikling anbefaler vi modellen med 16 GB RAM.",
      },
      {
        question: "Kan jeg tilslutte en ekstern skærm?",
        answer:
          "MacBook Air M2 understøtter én ekstern skærm op til 6K via Thunderbolt/USB-C. Du kan bruge en USB-C til HDMI-adapter eller tilslutte direkte til en USB-C-skærm. Med en dock kan du også tilslutte flere perifere enheder.",
      },
      {
        question: "Er MacBook Air M2 god til studerende?",
        answer:
          "MacBook Air M2 er en af de allerbedste bærbare til studerende. Den er let (1,24 kg), har fantastisk batteritid (op til 18 timer), er helt lydløs, og yder mere end rigeligt til alt fra Word-dokumenter til statistikprogrammer og kreative projekter.",
      },
    ],
    relatedModels: ["iphone-15-pro", "iphone-14-pro"],
  },

  // ── 5. iPad Air ─────────────────────────────────────────────────────
  {
    slug: "ipad-air",
    title: "iPad Air",
    metaTitle: "Refurbished iPad Air | Spar Op Til 40% | PhoneSpot",
    metaDescription:
      "Køb refurbished iPad Air med 36 mdr. garanti. M1/M2-chip, 10,9\" Liquid Retina, Apple Pencil-understøttelse. Testet med 30+ kontroller.",
    heroHeading: "Refurbished iPad Air",
    collectionHandle: "ipads",
    filterTag: "ipad air",
    specs: [
      { label: "Chip", value: "A14 Bionic / M1 / M2 (afhængig af generation)" },
      { label: "Skærm", value: '10,9" Liquid Retina' },
      { label: "Kamera", value: "12MP bagkamera, 12MP ultravidvinkel front" },
      { label: "Batteri", value: "Op til 10 timers surfing" },
      { label: "Tilslutning", value: "USB-C (4./5. gen) / USB-C med Thunderbolt (6. gen)" },
      { label: "Apple Pencil", value: "Ja (2. generation)" },
      { label: "Magic Keyboard", value: "Ja" },
    ],
    whyBuy:
      "iPad Air er det perfekte mellemvalg for dig, der vil have mere end en basis-iPad, men ikke nødvendigvis har brug for en iPad Pro. Med det elegante design, den kraftfulde chip og den fantastiske 10,9\" Liquid Retina-skærm er iPad Air ideel til alt fra streaming og web-browsing til kreativt arbejde og produktivitet. 4. generation (A14 Bionic) og 5. generation (M1-chip) leverer begge imponerende ydelse til multitasking, billedredigering og let videoproduktion. Med understøttelse af Apple Pencil 2. generation kan du tegne, skrive noter og annotere dokumenter med naturlig præcision. Tilslut et Magic Keyboard, og du har en komplet arbejdsstation, der kan erstatte en bærbar til mange opgaver. Touch ID i tænd/sluk-knappen giver hurtig og sikker oplåsning. USB-C-porten muliggør tilslutning af eksterne diske, kameraer og skærme. iPad Air er også fremragende til underholdning — den store skærm med True Tone og P3 bredt farverum gør film, spil og streaming til en fornøjelse. Som refurbished hos PhoneSpot kan du spare op til 40% på en iPad Air og stadig få 36 måneders garanti samt vores grundige 30+ punkts kvalitetskontrol. Det er den intelligente vej til en premium-tablet uden at betale fuld pris.",
    gradeExplanation:
      "iPad Air har et anodiseret aluminiumschassis og en stor glasskærm. Grade A er i næsten ny stand med minimale mærker — chassiset og skærmen ser praktisk talt nye ud. Grade B kan have lette ridser på bagsiden eller kanterne, men skærmen er i god stand uden dybe ridser. Grade C kan have mere synlige brugsspor på chassiset, men touchskærmen, Apple Pencil-understøttelse og alle andre funktioner virker fejlfrit.",
    faq: [
      {
        question: "Hvilken iPad Air-generation skal jeg vælge?",
        answer:
          "iPad Air 4. gen (A14 Bionic) er perfekt til basale behov som streaming, web og noter. iPad Air 5. gen (M1) er bedre til krævende opgaver som billedredigering og multitasking. Begge understøtter Apple Pencil 2 og Magic Keyboard.",
      },
      {
        question: "Kan jeg bruge Apple Pencil med en refurbished iPad Air?",
        answer:
          "Ja, iPad Air (4. og 5. generation) understøtter Apple Pencil 2. generation fuldt ud. Pencil parres magnetisk med siden af iPad'en, og der er ingen forskel i funktionalitet mellem ny og refurbished.",
      },
      {
        question: "Er iPad Air god nok til at erstatte en bærbar?",
        answer:
          "Til mange opgaver, ja. Med Magic Keyboard og iPadOS' multitasking-funktioner kan iPad Air håndtere e-mails, dokumenter, præsentationer og web-browsing. Til tung softwareudvikling eller specialiserede desktop-programmer er en bærbar dog stadig bedre.",
      },
      {
        question: "Hvordan er skærmen på en refurbished iPad Air?",
        answer:
          "iPad Air har en fantastisk 10,9\" Liquid Retina-skærm med True Tone og P3 bredt farverum. Vi kontrollerer alle skærme grundigt for dead pixels, touch-respons og lysstyrke som del af vores kvalitetstest.",
      },
      {
        question: "Kan jeg bruge mobildata med en refurbished iPad Air?",
        answer:
          "Det afhænger af modellen. Vi sælger både Wi-Fi og Wi-Fi + Cellular modeller. Cellular-modellen har en nano-SIM-slot og/eller eSIM-understøttelse, så du kan bruge mobildata med et dansk abonnement.",
      },
    ],
    relatedModels: ["iphone-15-pro", "macbook-air-m2"],
  },

  // ── 6. Apple Watch SE ─────────────────────────────────────────────
  {
    slug: "apple-watch-se",
    title: "Apple Watch SE",
    metaTitle: "Refurbished Apple Watch SE | Fra 1.099 kr | PhoneSpot",
    metaDescription:
      "Køb refurbished Apple Watch SE med 36 mdr. garanti. Retina OLED-skærm, pulsmåler, vandtæt til 50m, GPS. Testet med 30+ kontroller. Spar op til 49%.",
    heroHeading: "Refurbished Apple Watch SE",
    collectionHandle: "smartwatches",
    filterTag: "apple watch se",
    specs: [
      { label: "Skærm", value: "Retina OLED (40mm / 44mm)" },
      { label: "Chip", value: "S8 SiP (2. gen) / S5 SiP (1. gen)" },
      { label: "Sensorer", value: "Pulsmåler, accelerometer, gyroskop, kompas" },
      { label: "Vandtæthed", value: "WR50 (50 meter)" },
      { label: "GPS", value: "Ja (GPS / GPS + Cellular)" },
      { label: "Batteri", value: "Op til 18 timer" },
      { label: "Kompatibilitet", value: "iPhone 8 eller nyere" },
    ],
    whyBuy:
      "Apple Watch SE er den smarteste vej ind i Apple Watch-verdenen. Den giver dig alle de vigtigste funktioner — fitness-tracking, pulsovervågning, notifikationer, Apple Pay og GPS — til en markant lavere pris end flagskibsmodellerne. 2. generation (2022) har den samme S8-chip som Series 8, hvilket betyder identisk ydelse til de fleste daglige opgaver. Skærmen er stor nok til komfortabel aflæsning, og med watchOS får du adgang til alle apps i App Store. Faldregistrering og nødopkald gør uret til en sikkerhedsfunktion for hele familien. Med vandtæthed til 50 meter kan du svømme, bade og træne i regnvejr uden bekymringer. Batteriet holder en fuld dag, og opladning tager kun ca. 1,5 timer. Hos PhoneSpot kan du spare op til 49% på en Apple Watch SE sammenlignet med nyprisen — og du får 36 måneders garanti og 14 dages fuld returret. Det er det perfekte smartwatch for dig, der vil have Apple-kvalitet uden at betale Premium-pris.",
    gradeExplanation:
      "Apple Watch SE har et aluminiumschassis, som er let og holdbart. Grade A er i næsten ny stand med minimale kosmetiske mærker — kassen og glasset ser praktisk talt nye ud. Grade B kan have lette ridser på kassen eller glasset, men skærmen er i god stand og touch fungerer perfekt. Grade C kan have synlige brugsspor på kassen, men alle funktioner inklusiv pulsmåler, GPS og vandtæthed er testet og verificeret.",
    faq: [
      {
        question: "Hvad er forskellen på Apple Watch SE 1. og 2. generation?",
        answer:
          "2. generation (2022) har den nyere S8-chip, som er hurtigere og mere energieffektiv end S5-chippen i 1. generation. Den har også faldregistrering og et redesignet bagcover. Begge generationer kører den nyeste watchOS og har de samme kernefunktioner.",
      },
      {
        question: "Kan Apple Watch SE måle blodiltmætning (SpO2)?",
        answer:
          "Nej, SpO2-måling er forbeholdt Apple Watch Series 6 og nyere. Apple Watch SE har pulsmåler, men ikke blodiltmåler eller EKG. Til de fleste fitness- og sundhedsbehov er pulsmåleren rigeligt.",
      },
      {
        question: "Er Apple Watch SE god til fitness og løb?",
        answer:
          "Ja, absolut. Apple Watch SE har GPS, pulsmåler, accelerometer og gyroskop. Du kan tracke løb, cykling, svømning og over 100 andre træningstyper. Med Fitness-appen og Apple Health får du detaljeret indsigt i din træning.",
      },
      {
        question: "Virker Apple Watch SE med alle iPhone-modeller?",
        answer:
          "Apple Watch SE kræver minimum en iPhone 8 eller nyere med den seneste iOS. Alle vores Apple Watches er ulåste og klar til parring med din iPhone fra dag ét.",
      },
      {
        question: "Kan jeg svømme med en refurbished Apple Watch SE?",
        answer:
          "Ja. Apple Watch SE er vandtæt til 50 meter (WR50). Vi tester vandtætheden som del af vores 30+ kvalitetskontroller, så du kan trygt svømme, bade og træne i våde omgivelser.",
      },
    ],
    relatedModels: ["apple-watch-series-8", "apple-watch-series-7"],
  },

  // ── 7. Apple Watch Series 7 ──────────────────────────────────────
  {
    slug: "apple-watch-series-7",
    title: "Apple Watch Series 7",
    metaTitle: "Refurbished Apple Watch Series 7 | Spar Op Til 40% | PhoneSpot",
    metaDescription:
      "Køb refurbished Apple Watch Series 7 med 36 mdr. garanti. Altid-tændt Retina-skærm, blodiltmåler, EKG, vandtæt. Testet med 30+ kontroller.",
    heroHeading: "Refurbished Apple Watch Series 7",
    collectionHandle: "smartwatches",
    filterTag: "apple watch series 7",
    specs: [
      { label: "Skærm", value: "Altid-tændt Retina OLED (41mm / 45mm)" },
      { label: "Chip", value: "S7 SiP" },
      { label: "Sensorer", value: "Puls, SpO2, EKG, accelerometer, gyroskop, kompas" },
      { label: "Vandtæthed", value: "WR50 (50 meter) + IP6X støvtæt" },
      { label: "GPS", value: "Ja (GPS / GPS + Cellular)" },
      { label: "Batteri", value: "Op til 18 timer" },
      { label: "Opladning", value: "Hurtigopladning (33% hurtigere)" },
    ],
    whyBuy:
      "Apple Watch Series 7 var et stort designspring med næsten 20% større skærmområde end Series 6 takket være de tyndere kanter. Det giver mere plads til tekst, knapper og komplikationer, og gør uret markant nemmere at betjene. Den altid-tændte Retina-skærm viser tid og komplikationer selv når håndleddet er sænket, og med op til 1.000 nits lysstyrke kan du aflæse skærmen selv i direkte sollys. Du får avanceret sundhedsmonitorering med EKG, blodiltmåler (SpO2) og kontinuerlig pulsmåling — funktioner der kan give tidlig advarsel om hjerteproblemer. IP6X-certificeringen gør Series 7 til det mest støvresistente Apple Watch til dato, perfekt til udendørs aktiviteter. Hurtigopladningen er en gamechanger — 45 minutters opladning giver 80% batteri, og 8 minutters opladning er nok til 8 timers søvnregistrering. Med refurbished fra PhoneSpot sparer du op til 40% og får 36 måneders garanti.",
    gradeExplanation:
      "Apple Watch Series 7 har aluminiums- eller rustfrit stålchassis afhængig af model. Grade A er i næsten ny stand med minimale mærker. Grade B kan have lette ridser på kassen, men skærmen er i fin stand. Grade C kan have synlige brugsspor, men alle funktioner inklusiv EKG, SpO2, GPS og vandtæthed virker perfekt.",
    faq: [
      {
        question: "Har Series 7 altid-tændt skærm?",
        answer:
          "Ja. Apple Watch Series 7 har en altid-tændt Retina-skærm, der viser tid og komplikationer selv når håndleddet er sænket. Du kan slå funktionen til og fra i indstillingerne.",
      },
      {
        question: "Kan Series 7 tage EKG?",
        answer:
          "Ja. Apple Watch Series 7 har en EKG-app, der kan registrere hjerterytme og identificere tegn på atrieflimren. EKG-funktionen er godkendt til brug i Danmark.",
      },
      {
        question: "Hvad er forskellen på Series 7 og Series 8?",
        answer:
          "Series 8 har en nyere S8-chip (en smule hurtigere), temperaturmåler og crashregistrering. Ellers er de meget ens i design og funktioner. Series 7 er et fremragende køb til en lavere pris.",
      },
      {
        question: "Er hurtigopladning inkluderet?",
        answer:
          "Ja, hurtigopladning er en hardwarefunktion i Series 7. Du skal bruge et USB-C-opladerkabel (Apple Watch magnetisk) for at udnytte hurtigopladningen. Vi leverer oplader med alle ure.",
      },
      {
        question: "Får Series 7 de nyeste watchOS-opdateringer?",
        answer:
          "Ja. Apple Watch Series 7 understøtter den nyeste watchOS og vil modtage opdateringer i flere år endnu, hvilket gør den til en fremtidssikret investering.",
      },
    ],
    relatedModels: ["apple-watch-series-8", "apple-watch-se"],
  },

  // ── 8. Apple Watch Series 8 ──────────────────────────────────────
  {
    slug: "apple-watch-series-8",
    title: "Apple Watch Series 8",
    metaTitle: "Refurbished Apple Watch Series 8 | Spar Op Til 40% | PhoneSpot",
    metaDescription:
      "Køb refurbished Apple Watch Series 8 med 36 mdr. garanti. Temperaturmåler, crashregistrering, EKG, altid-tændt skærm. Testet med 30+ kontroller.",
    heroHeading: "Refurbished Apple Watch Series 8",
    collectionHandle: "smartwatches",
    filterTag: "apple watch series 8",
    specs: [
      { label: "Skærm", value: "Altid-tændt Retina OLED (41mm / 45mm)" },
      { label: "Chip", value: "S8 SiP" },
      { label: "Sensorer", value: "Puls, SpO2, EKG, temperatur, accelerometer, gyroskop" },
      { label: "Sikkerhed", value: "Crashregistrering + faldregistrering" },
      { label: "Vandtæthed", value: "WR50 (50 meter) + IP6X støvtæt" },
      { label: "GPS", value: "Ja (GPS / GPS + Cellular)" },
      { label: "Batteri", value: "Op til 18 timer (36 timer i strømsparetilstand)" },
    ],
    whyBuy:
      "Apple Watch Series 8 er det komplette smartwatch med alle de funktioner, de fleste mennesker har brug for. Den nye temperaturmåler giver indsigt i kroppens temperatur over natten og kan hjælpe med at tracke ægløsning — en funktion der er unik for Series 8 og nyere. Crashregistrering bruger avancerede bevægelsessensorer til automatisk at ringe efter hjælp i tilfælde af en alvorlig bilulykke. S8-chippen leverer hurtig og responsiv ydelse til alle apps og workouts. Den altid-tændte skærm med op til 1.000 nits lysstyrke er fremragende i alle lysforhold. Strømsparetilstanden fordobler batteritiden til op til 36 timer — perfekt til weekendture. Med EKG, SpO2 og kontinuerlig pulsmåling har du et komplet sundhedscenter på håndleddet. Hos PhoneSpot sparer du op til 40% sammenlignet med nyprisen og får 36 måneders garanti plus 14 dages returret.",
    gradeExplanation:
      "Apple Watch Series 8 fås i aluminium eller rustfrit stål. Grade A er i næsten ny stand med kun minimale mærker. Grade B kan have lette ridser på kassen eller glasset, men alle funktioner virker perfekt. Grade C har mere tydelige brugsspor men er fuldt funktionel med garanti.",
    faq: [
      {
        question: "Hvad gør temperaturmåleren i Series 8?",
        answer:
          "Temperaturmåleren registrerer din håndledstemperatur om natten og kan vise ændringer over tid. Den bruges til retroaktiv ægløsningsestimat i Cycle Tracking-appen. Den er ikke et medicinsk termometer, men giver værdifuld indsigt i kroppens mønstre.",
      },
      {
        question: "Hvad er crashregistrering?",
        answer:
          "Crashregistrering bruger en ny gyro- og accelerometer-sensor til at registrere alvorlige bilulykker. Hvis en ulykke registreres, og du ikke reagerer, ringer Apple Watch automatisk alarmcentralen og deler din GPS-position.",
      },
      {
        question: "Er Series 8 værd at vælge over Series 7?",
        answer:
          "Hvis temperaturmåler og crashregistrering er vigtige for dig, ja. Ellers er forskellen minimal — begge har EKG, SpO2, altid-tændt skærm og hurtigopladning. Series 7 kan være et bedre køb prismæssigt.",
      },
      {
        question: "Hvor lang batteritid har Series 8?",
        answer:
          "Op til 18 timer ved normal brug. Med strømsparetilstand (slår altid-tændt skærm og baggrundsmålinger fra) kan den holde op til 36 timer. Hurtigopladning giver 80% på ca. 45 minutter.",
      },
      {
        question: "Kan jeg bruge Series 8 til svømning?",
        answer:
          "Ja. Series 8 er vandtæt til 50 meter (WR50) og IP6X støvtæt. Du kan svømme, snorkle og bade med den. Vi tester vandtætheden som del af vores 30+ kvalitetskontroller.",
      },
    ],
    relatedModels: ["apple-watch-series-9", "apple-watch-series-7"],
  },

  // ── 9. Apple Watch Series 9 ──────────────────────────────────────
  {
    slug: "apple-watch-series-9",
    title: "Apple Watch Series 9",
    metaTitle: "Refurbished Apple Watch Series 9 | Spar Op Til 35% | PhoneSpot",
    metaDescription:
      "Køb refurbished Apple Watch Series 9 med 36 mdr. garanti. S9 SiP-chip, dobbelt tap-gesture, 2000 nits skærm, EKG. Testet med 30+ kontroller.",
    heroHeading: "Refurbished Apple Watch Series 9",
    collectionHandle: "smartwatches",
    filterTag: "apple watch series 9",
    specs: [
      { label: "Skærm", value: "Altid-tændt Retina OLED, 2000 nits (41mm / 45mm)" },
      { label: "Chip", value: "S9 SiP med Neural Engine" },
      { label: "Nyt", value: "Dobbelt tap-gesture, on-device Siri" },
      { label: "Sensorer", value: "Puls, SpO2, EKG, temperatur, kompas" },
      { label: "Vandtæthed", value: "WR50 (50 meter) + IP6X støvtæt" },
      { label: "GPS", value: "Præcis dual-frequency GPS (L1 + L5)" },
      { label: "Batteri", value: "Op til 18 timer (36 timer strømspare)" },
    ],
    whyBuy:
      "Apple Watch Series 9 er det nyeste og mest avancerede standard Apple Watch. S9 SiP-chippen med Neural Engine er op til 30% hurtigere end S8 og muliggør on-device Siri-forespørgsler, så dine sundhedsdata aldrig forlader uret. Dobbelt tap-gestusen er revolutionerende — du kan besvare opkald, stoppe timere og scrolle med blot et tryk af pegefinger og tommelfinger, selv når din anden hånd er optaget. Skærmen er dobbelt så lys som Series 8 med op til 2.000 nits, hvilket gør den aflæselig selv i det stærkeste sollys. Præcis dual-frequency GPS giver mere nøjagtig rutetracking til løb og cykling. Du får alle sundhedsfunktioner: EKG, SpO2, temperaturmåler, crashregistrering og faldregistrering. Med refurbished fra PhoneSpot sparer du op til 35% og får Danmarks bedste 36 måneders garanti.",
    gradeExplanation:
      "Apple Watch Series 9 har aluminiums- eller rustfrit stålchassis. Grade A er i næsten ny stand og ligner en helt ny enhed. Grade B kan have lette brugsmærker på kassen, men skærmen er perfekt. Grade C har synlige brugsspor men fuld funktionalitet og garanti.",
    faq: [
      {
        question: "Hvad er dobbelt tap-gestusen?",
        answer:
          "Dobbelt tap lader dig styre dit Apple Watch ved at tappe pegefinger og tommelfinger sammen to gange. Du kan besvare opkald, stoppe timere, skippe musik og mere — perfekt når din anden hånd er optaget med en indkøbspose eller kaffekop.",
      },
      {
        question: "Er S9-chippen en mærkbar forbedring?",
        answer:
          "Ja. S9 er op til 30% hurtigere end S8, og Neural Engine muliggør on-device Siri og hurtigere app-lancering. Du mærker det især ved Siri-forespørgsler, der nu besvares direkte på uret uden internetforbindelse.",
      },
      {
        question: "Hvorfor er 2000 nits skærm vigtigt?",
        answer:
          "Med 2.000 nits er skærmen dobbelt så lys som Series 8. Det gør en kæmpe forskel udendørs — du kan altid aflæse tid, notifikationer og træningsdata, selv i direkte sollys.",
      },
      {
        question: "Har Series 9 alle sundhedsfunktioner?",
        answer:
          "Ja. Series 9 har EKG, blodiltmåler (SpO2), temperaturmåler, kontinuerlig pulsmåling, crashregistrering og faldregistrering. Det er det mest komplette sundhedscenter på et Apple Watch.",
      },
      {
        question: "Hvad er dual-frequency GPS?",
        answer:
          "Dual-frequency GPS bruger to GPS-signaler (L1 + L5) for mere præcis positionsbestemmelse. Det giver mere nøjagtige rutemålinger til løb og cykling, især i byer med høje bygninger.",
      },
    ],
    relatedModels: ["apple-watch-ultra", "apple-watch-series-8"],
  },

  // ── 10. Apple Watch Ultra ────────────────────────────────────────
  {
    slug: "apple-watch-ultra",
    title: "Apple Watch Ultra",
    metaTitle: "Refurbished Apple Watch Ultra | Spar Op Til 35% | PhoneSpot",
    metaDescription:
      "Køb refurbished Apple Watch Ultra med 36 mdr. garanti. 49mm titaniumkasse, 2000 nits, 36 timers batteri, dykkercertificeret. Testet med 30+ kontroller.",
    heroHeading: "Refurbished Apple Watch Ultra",
    collectionHandle: "smartwatches",
    filterTag: "apple watch ultra",
    specs: [
      { label: "Skærm", value: '49mm altid-tændt Retina OLED, 2000 nits, fladt safir-krystal' },
      { label: "Chip", value: "S8 SiP (Ultra 1) / S9 SiP (Ultra 2)" },
      { label: "Materiale", value: "Titaniumkasse" },
      { label: "Vandtæthed", value: "WR100 (100m) + EN13319 (dykning)" },
      { label: "GPS", value: "Præcis dual-frequency GPS (L1 + L5)" },
      { label: "Batteri", value: "Op til 36 timer (60 timer strømspare)" },
      { label: "Ekstra", value: "Action-knap, sirene (86 dB), dybdemåler" },
    ],
    whyBuy:
      "Apple Watch Ultra er det mest robuste og kapable Apple Watch nogensinde. Designet til ekstreme sportsgrene, udendørs eventyr og professionel dykning er Ultra bygget til at tåle alt, du kan udsætte det for. Den 49mm titaniumkasse er utroligt holdbar og beskytter det flade safir-krystal mod stød og ridser. Med WR100-vandtæthed og EN13319-dykkercertificering kan du dykke ned til 40 meter med den indbyggede dybdemåler. Batteritiden på op til 36 timer (60 timer med strømsparetilstand) betyder, at du kan gennemføre et ultramaraton eller en weekendtur uden at oplade. Den programmérbare Action-knap giver hurtig adgang til workout, waypoints eller lommelygte. Sirenen på 86 dB kan høres op til 180 meter væk — en sikkerhedsfunktion for bjergvandrere og eventyrere. Med dual-frequency GPS får du den mest præcise positionsbestemmelse Apple kan tilbyde. Hos PhoneSpot sparer du op til 35% på et Apple Watch Ultra og får 36 måneders garanti.",
    gradeExplanation:
      "Apple Watch Ultra har en titaniumkasse, som er ekstremt holdbar. Grade A er i næsten ny stand med minimale mærker på titaniumet. Grade B kan have lette ridser eller mærker, men safir-krystalglasset er modstandsdygtigt og typisk ridse-frit. Grade C kan have mere synlige brugsspor på kassen, men alle funktioner inklusiv dybdemåler, GPS og vandtæthed er testet og verificeret.",
    faq: [
      {
        question: "Er Apple Watch Ultra for stort?",
        answer:
          "Med 49mm er Ultra det største Apple Watch. Det passer bedst til håndled over 16cm i omkreds. Mange oplever, at den føles behagelig efter en dag eller to. Den flade bagside og afrundede kanter hjælper med komforten.",
      },
      {
        question: "Kan jeg dykke med Apple Watch Ultra?",
        answer:
          "Ja. Apple Watch Ultra er certificeret til EN13319 og vandtæt til 100 meter. Den har en indbygget dybdemåler og Oceanic+ dykkerkomputer-app til rekreativt dyk. Vi tester vandtætheden grundigt.",
      },
      {
        question: "Hvad er forskellen på Ultra 1 og Ultra 2?",
        answer:
          "Ultra 2 har S9-chippen (hurtigere), dobbelt tap-gesture, 3000 nits skærm (vs. 2000) og on-device Siri. Begge har titanium, 36 timers batteri, Action-knap og dykkerfunktioner. Ultra 1 er et fremragende køb til en lavere pris.",
      },
      {
        question: "Kan jeg bruge Ultra til daglig brug?",
        answer:
          "Absolut. Ultra er ikke kun til ekstremsport. Den lange batteritid, store lyse skærm og Action-knap gør den fantastisk til daglig brug. Mange vælger Ultra netop for batteritiden og den robuste bygning.",
      },
      {
        question: "Hvad kan Action-knappen bruges til?",
        answer:
          "Action-knappen kan tilpasses til at starte en workout, sætte et waypoint, aktivere lommelygte, starte en dykkerlog eller aktivere genveje. Du kan programmere den til præcis den funktion, du bruger mest.",
      },
    ],
    relatedModels: ["apple-watch-series-9", "apple-watch-series-8"],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getModelPage(slug: string): ModelPage | null {
  return MODEL_PAGES.find((m) => m.slug === slug) ?? null;
}

export function getAllModelSlugs(): { model: string }[] {
  return MODEL_PAGES.map((m) => ({ model: m.slug }));
}
