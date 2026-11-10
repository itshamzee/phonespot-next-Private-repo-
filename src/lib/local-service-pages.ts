import type { Metadata } from "next";
import type { ServicePriceColumn } from "@/lib/supabase/repairs";
import { SITE_URL } from "@/lib/local-repair-towns";

/**
 * Lokale ydelsessider: én side pr. by og ydelse, fx /reparation-vejle/ipad.
 *
 * Bygget 2026-11-10 ud fra Search Console: telefonreparation ligger nr. 1-3
 * lokalt, men computer-/pc-reparation i Vejle og Slagelse ligger på plads
 * 13-24, iPad-reparation på 17, og PS5-reparation har efterspørgsel uden en
 * lokal side. Hver side har egen tekst og FAQ, live priser fra databasen og
 * butikkens egne oplysninger, så de ikke er tynde kopier af hinanden.
 *
 * Kun butikker, der er åbne (Vejle, Slagelse). Esbjerg får sider, når den
 * flytter fra UPCOMING_STORES til STORES.
 */

export type LocalServiceStore = "vejle" | "slagelse";
export type LocalServiceKey = "ipad" | "playstation" | "computer";

export type LocalServiceFaq = { question: string; answer: string };

/** Fælles for ydelsen, uanset by. */
type ServiceDefinition = {
  key: LocalServiceKey;
  /** Kort navn til brødkrumme og links, fx "iPad". */
  shortName: string;
  /** Navn på ydelsen i schema, fx "iPad-reparation". */
  serviceName: string;
  eyebrow: string;
  priceModels: { brand: string; model: string }[];
  priceColumns: ServicePriceColumn[];
  priceIntro: string;
  /** Link under pristabellen til alle modeller. */
  allModelsHref: string;
  allModelsLabel: string;
  /** Typiske fejl: overskrift + forklaring. */
  problems: { title: string; text: string }[];
  steps: { title: string; text: string }[];
  /** Garanti-linje på siden. Følger warranty-copy.ts; konsolpakken har egne vilkår. */
  warrantyLine: string;
  mailInText: string;
  guides: { href: string; label: string }[];
};

/** Byspecifik tekst. */
type CityCopy = {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  heroLead: string;
  /** Svar først: de første 40-60 ord, adresse og nøglefakta. */
  answerFirst: string;
  intro: string[];
  tiles: { title: string; desc: string }[];
  faqs: LocalServiceFaq[];
};

export type LocalServicePage = ServiceDefinition &
  CityCopy & {
    store: LocalServiceStore;
    city: string;
    path: string;
    hubPath: string;
  };

const IPAD_MODELS = [
  { brand: "ipad", model: "ipad-7-gen-2019" },
  { brand: "ipad", model: "ipad-8-gen-2020" },
  { brand: "ipad", model: "ipad-9-gen-2021" },
  { brand: "ipad", model: "ipad-10-gen-2022" },
  { brand: "ipad", model: "ipad-mini-6-gen-2021" },
  { brand: "ipad", model: "ipad-air-5-gen-2022" },
  { brand: "ipad", model: "ipad-air-11-m2-2024" },
  { brand: "ipad", model: "ipad-pro-11-4-gen-2022" },
  { brand: "ipad", model: "ipad-pro-129-6-gen-2022" },
];

const CONSOLE_MODELS = [
  { brand: "playstation", model: "playstation-5" },
  { brand: "playstation", model: "playstation-5-digital" },
  { brand: "playstation", model: "playstation-5-pro" },
  { brand: "playstation", model: "playstation-4" },
  { brand: "playstation", model: "playstation-4-pro" },
  { brand: "xbox", model: "xbox-series-x" },
  { brand: "xbox", model: "xbox-series-s" },
  { brand: "nintendo", model: "nintendo-switch-oled" },
];

const MACBOOK_MODELS = [
  { brand: "macbook", model: "macbook-air-13-m1" },
  { brand: "macbook", model: "macbook-air-13-m2" },
  { brand: "macbook", model: "macbook-air-13-m3" },
  { brand: "macbook", model: "macbook-air-13-m4" },
  { brand: "macbook", model: "macbook-air-15-m3" },
  { brand: "macbook", model: "macbook-pro-13-m1" },
  { brand: "macbook", model: "macbook-pro-13-m2" },
  { brand: "macbook", model: "macbook-pro-14-m3" },
  { brand: "macbook", model: "macbook-pro-14-m4" },
];

const SERVICES: Record<LocalServiceKey, ServiceDefinition> = {
  ipad: {
    key: "ipad",
    shortName: "iPad",
    serviceName: "iPad-reparation",
    eyebrow: "iPad-reparation",
    priceModels: IPAD_MODELS,
    priceColumns: [
      { key: "port", label: "Ladestik", names: ["Opladerstik"], categories: ["Ladestik"] },
      { key: "screen", label: "Skærm/glas fra", categories: ["Skærmskift"], names: ["Skærmskift", "Glas/touch-skift"] },
      { key: "battery", label: "Batteri", categories: ["Batteriskift"] },
    ],
    priceIntro:
      "Faste priser inklusive moms, reservedel og garanti. Ladestikket er den reparation, vi laver oftest på iPads, og det koster 899 kr. uanset model.",
    allModelsHref: "/reparation/ipad",
    allModelsLabel: "Se priser på alle iPad-modeller",
    problems: [
      {
        title: "iPaden lader ikke, eller kablet sidder løst",
        text: "Oftest er ladestikket slidt eller knækket indvendigt. På de fleste nyere iPads sidder stikket loddet på bundkortet, så det skal skiftes med mikrolodning. Det koster 899 kr. på alle modeller og tager 2-3 hverdage.",
      },
      {
        title: "Knust glas eller touch, der ikke reagerer",
        text: "Vi skifter glas og skærm på iPad, iPad Air, iPad mini og iPad Pro. Du får en fast pris, før vi går i gang.",
      },
      {
        title: "Batteriet holder ikke dagen",
        text: "Et nyt batteri giver iPaden fuld kapacitet igen. Det er ofte en billig løsning i forhold til en ny iPad.",
      },
      {
        title: "Ingen lyd eller dårlig lyd",
        text: "Vi skifter højttalere og renser porte og højttalergitre for snavs, der dæmper lyden.",
      },
    ],
    steps: [
      { title: "Kom forbi eller book", text: "Ingen tidsbestilling nødvendig. Vi kigger på iPaden ved disken." },
      { title: "Fast pris", text: "Du får prisen, før vi går i gang. Hurtigt tjek ved disken er gratis." },
      { title: "Reparation", text: "Ladestik tager 2-3 hverdage. Du får besked, når iPaden er klar." },
      { title: "Test", text: "Vi tester opladning, touch, lyd og kamera, før du får den igen." },
    ],
    warrantyLine:
      "Livstidsgaranti på arbejde og dele (6 måneder på batteriskift, 3 måneder på vandskade). Garantien dækker ikke nye fald eller væske.",
    mailInText:
      "Kan du ikke komme forbi, så send iPaden ind med en gratis fragtlabel. Vi reparerer den og sender den retur med samme garanti som i butikken.",
    guides: [
      { href: "/blog/ipad-lader-ikke-ladestik-reparation", label: "iPad lader ikke? Sådan reparerer vi ladestikket" },
      { href: "/blog/refurbished-ipad-guide", label: "Guide til refurbished iPad" },
    ],
  },
  playstation: {
    key: "playstation",
    shortName: "PlayStation og konsol",
    serviceName: "PS5- og konsolreparation",
    eyebrow: "Konsolreparation",
    priceModels: CONSOLE_MODELS,
    priceColumns: [
      { key: "bundle", label: "HDMI + rengøring", names: ["HDMI-port + rengøring"] },
      { key: "hdmi", label: "HDMI-port", names: ["HDMI-port"] },
      { key: "fan", label: "Blæser", names: ["Blæser"] },
      { key: "paste", label: "Termisk pasta", names: ["Termisk pasta"] },
    ],
    priceIntro:
      "Faste priser inklusive moms og reservedel. På PS5 er HDMI-port og indvendig rengøring samlet i én pakke, som er billigere end porten alene.",
    allModelsHref: "/reparation/playstation",
    allModelsLabel: "Se alle PlayStation-priser",
    problems: [
      {
        title: "Sort skærm eller intet signal",
        text: "Lampen lyser, men tv'et er sort. Den hyppigste årsag er en knækket eller bøjet HDMI-port. Porten sidder loddet på bundkortet og skiftes med mikrolodning.",
      },
      {
        title: "Konsollen larmer eller bliver varm",
        text: "Støv i blæser og køleprofil får konsollen til at larme og slukke af varme. Vi renser den indvendigt og skifter termisk pasta eller blæser, hvis det er nødvendigt.",
      },
      {
        title: "Controller med stick-drift eller dødt batteri",
        text: "Vi reparerer DualSense, DualSense Edge og Xbox-controllere: stick-drift, USB-C-port og batteri.",
      },
      {
        title: "Xbox og Nintendo Switch",
        text: "Vi skifter også HDMI-port, blæser og termisk pasta på Xbox Series X og S og Nintendo Switch.",
      },
    ],
    steps: [
      { title: "Aflever konsollen", text: "Tag kun selve konsollen med. Controller og kabler kan blive hjemme." },
      { title: "Fejlfinding", text: "Vi bekræfter fejlen og giver dig en fast pris, før vi går i gang." },
      { title: "Reparation", text: "HDMI-port og rengøring tager 2-3 hverdage." },
      { title: "Test", text: "Vi tester billede, lyd og temperatur, før du får konsollen igen." },
    ],
    warrantyLine:
      "PS5-pakken med HDMI-port og rengøring har 2 års garanti. Garantien dækker ikke nye skader, fx hvis kablet bliver revet ud igen.",
    mailInText:
      "Bor du længere væk, kan du sende konsollen ind. Pak den godt ind, gerne i den originale æske, så sender vi den retur, når den er klar.",
    guides: [
      { href: "/blog/ps5-sort-skaerm-hdmi-reparation", label: "Sort skærm på PS5? Så er det ofte HDMI-porten" },
      { href: "/reparation/xbox", label: "Xbox-reparation" },
      { href: "/reparation/nintendo", label: "Nintendo Switch-reparation" },
    ],
  },
  computer: {
    key: "computer",
    shortName: "Computer og MacBook",
    serviceName: "Computer- og MacBook-reparation",
    eyebrow: "Computerreparation",
    priceModels: MACBOOK_MODELS,
    priceColumns: [
      { key: "battery", label: "Batteri", categories: ["Batteriskift"] },
      { key: "screen", label: "Skærm", names: ["Skærmskift"], categories: ["Skærmskift"] },
      { key: "keyboard", label: "Tastatur", names: ["Tastatur"] },
      { key: "fan", label: "Blæser", names: ["Blæser"] },
    ],
    priceIntro:
      "Faste priser på MacBook inklusive moms og reservedel. Har du en anden bærbar, vurderer vi den ved disken og giver dig en pris, før vi går i gang.",
    allModelsHref: "/reparation/macbook",
    allModelsLabel: "Se priser på alle MacBook-modeller",
    problems: [
      {
        title: "Batteriet holder ikke, eller computeren slukker",
        text: "Et nyt batteri er den mest almindelige reparation på MacBook. Den gamle computer kører som før, uden at du skal købe ny.",
      },
      {
        title: "Computeren er langsom, varm eller larmer",
        text: "Støv i blæseren og udtørret termisk pasta får computeren til at køre varm og skrue ned for farten. Vi renser den og skifter pasta eller blæser.",
      },
      {
        title: "Knust skærm eller streger i billedet",
        text: "Vi skifter skærm på MacBook Air og MacBook Pro. Prisen afhænger af model og størrelse.",
      },
      {
        title: "Taster, der ikke virker, eller væske på tastaturet",
        text: "Vi skifter tastatur og topcase og behandler vandskade. Sluk computeren med det samme, og kom forbi så hurtigt som muligt.",
      },
    ],
    steps: [
      { title: "Kom forbi", text: "Tag computer og oplader med. Vi kigger på den ved disken." },
      { title: "Fast pris", text: "Du får prisen og en tidsramme, før vi går i gang." },
      { title: "Reparation", text: "Vi reparerer på eget værksted og rører ikke dine data." },
      { title: "Test", text: "Vi tester batteri, skærm, tastatur og opladning, før du henter den." },
    ],
    warrantyLine:
      "Garantien på computerreparation aftaler vi ved den enkelte reparation, og den står på din kvittering. Behandling af vandskade har 3 måneders garanti.",
    mailInText:
      "Du kan også sende computeren ind. Tag en sikkerhedskopi først, og læg opladeren med i pakken.",
    guides: [
      { href: "/blog/hvad-koster-macbook-reparation", label: "Hvad koster MacBook-reparation?" },
      { href: "/blog/macbook-batteriskift-guide", label: "Guide til batteriskift på MacBook" },
      { href: "/blog/macbook-gaar-langsomt", label: "MacBook går langsomt? Det kan du gøre" },
    ],
  },
};

const CITY_COPY: Record<LocalServiceStore, Record<LocalServiceKey, CityCopy>> = {
  vejle: {
    ipad: {
      metaTitle: "iPad-reparation i Vejle: ladestik og skærm | PhoneSpot",
      metaDescription:
        "iPad lader ikke eller knust skærm? Vi reparerer iPad på Løversysselvej 3B i Vejle. Nyt ladestik 899 kr. på alle modeller, 2-3 hverdage, livstidsgaranti. Gratis parkering.",
      h1: "iPad-reparation i Vejle",
      heroLead:
        "Lader din iPad ikke, eller er glasset knust? Aflever den på værkstedet på Løversysselvej 3B uden tidsbestilling. Et nyt ladestik koster 899 kr. på alle modeller og er klar på 2-3 hverdage.",
      answerFirst:
        "PhoneSpot Vejle, Løversysselvej 3B, 7100 Vejle, reparerer iPad, iPad Air, iPad mini og iPad Pro. Ladestikket er den fejl, vi ser oftest. Det skiftes med mikrolodning, koster 899 kr. uanset model og tager 2-3 hverdage. Du får livstidsgaranti på arbejde og dele, og der er gratis parkering ved butikken.",
      intro: [
        "Mange af de iPads, vi får ind i Vejle, fejler det samme: De lader pludselig ikke, eller kablet skal holdes i en bestemt vinkel. Det skyldes næsten altid ladestikket. En iPad bliver brugt i sofaen og af børn, mens den lader, og det slider på stikket.",
        "På nyere iPads sidder ladestikket loddet fast på bundkortet. Det kræver mikrolodning at skifte det, og det har vi specialister til på værkstedet. Du afleverer iPaden og får besked, når den er klar, typisk efter 2-3 hverdage.",
      ],
      tiles: [
        { title: "899 kr.", desc: "Nyt ladestik, alle iPad-modeller" },
        { title: "2-3 hverdage", desc: "Mikrolodning på eget værksted" },
        { title: "Livstidsgaranti", desc: "Arbejde og dele, batteri 6 mdr." },
        { title: "Gratis parkering", desc: "Ved butikken i Vejle" },
      ],
      faqs: [
        {
          question: "Hvor kan jeg få repareret min iPad i Vejle?",
          answer:
            "Hos PhoneSpot på Løversysselvej 3B, 7100 Vejle. Kom forbi uden tidsbestilling i åbningstiden. Der er gratis parkering ved butikken.",
        },
        {
          question: "Hvor lang tid tager det at skifte ladestik på en iPad?",
          answer:
            "2-3 hverdage fra aflevering. Du får besked, når iPaden er klar til afhentning.",
        },
        {
          question: "Hvad koster et nyt ladestik til iPad i Vejle?",
          answer:
            "899 kr. på alle iPad-modeller, inklusive moms, reservedel og livstidsgaranti. Prisen er den samme i alle vores butikker og ved indsendelse.",
        },
        {
          question: "Kan I reparere iPads fra Horsens, Kolding og Fredericia?",
          answer:
            "Ja. Aflever iPaden i Vejle, eller send den ind med en gratis fragtlabel, så sender vi den retur, når den er klar.",
        },
      ],
    },
    playstation: {
      metaTitle: "PS5-reparation i Vejle: HDMI-port og rengøring | PhoneSpot",
      metaDescription:
        "Sort skærm på din PS5? Vi skifter HDMI-porten og renser konsollen for 1.300 kr. med 2 års garanti. Aflever på Løversysselvej 3B i Vejle, eller send den ind.",
      h1: "PS5- og konsolreparation i Vejle",
      heroLead:
        "Sort skærm, intet signal eller en konsol, der larmer? Aflever din PlayStation, Xbox eller Nintendo Switch på Løversysselvej 3B i Vejle. På PS5 skifter vi HDMI-porten og renser konsollen indvendigt i én pakke til 1.300 kr.",
      answerFirst:
        "PhoneSpot Vejle, Løversysselvej 3B, 7100 Vejle, reparerer PS5, PS4, Xbox og Nintendo Switch. Den hyppigste fejl er en defekt HDMI-port, som giver sort skærm. HDMI-port og rengøring på PS5 koster 1.300 kr., tager 2-3 hverdage og har 2 års garanti.",
      intro: [
        "En PS5 med sort skærm er en af de reparationer, vi oftest får ind i Vejle. Typisk er HDMI-kablet blevet trukket eller presset skævt, og porten er knækket indvendigt. Konsollen tænder, men tv'et får intet signal.",
        "HDMI-porten sidder loddet på bundkortet og har mange små ben. Vi skifter den med mikrolodning og renser samtidig blæser og køleprofil, fordi konsollen alligevel er åben. Det giver en køligere og mere stille konsol.",
      ],
      tiles: [
        { title: "1.300 kr.", desc: "PS5 HDMI-port + rengøring" },
        { title: "2-3 hverdage", desc: "Fra aflevering til klar" },
        { title: "2 års garanti", desc: "På PS5-pakken" },
        { title: "Gratis parkering", desc: "Ved butikken i Vejle" },
      ],
      faqs: [
        {
          question: "Hvor kan jeg få repareret min PS5 i Vejle?",
          answer:
            "Hos PhoneSpot på Løversysselvej 3B, 7100 Vejle. Aflever konsollen i åbningstiden, eller send den ind, hvis du bor længere væk.",
        },
        {
          question: "Hvad koster det at skifte HDMI-port på en PS5?",
          answer:
            "1.300 kr. for HDMI-port og indvendig rengøring i én pakke. Porten alene koster 1.599 kr. Prisen gælder PS5, PS5 Digital og PS5 Pro.",
        },
        {
          question: "Hvor lang tid tager en PS5-reparation?",
          answer: "HDMI-port og rengøring tager 2-3 hverdage.",
        },
        {
          question: "Mister jeg mine spil og gemte data?",
          answer:
            "Normalt ikke. Vi rører ikke lagringen, når vi skifter HDMI-porten. Har du PS Plus, ligger dine gemte spil også i skyen.",
        },
      ],
    },
    computer: {
      metaTitle: "Computer- og MacBook-reparation i Vejle | PhoneSpot",
      metaDescription:
        "Computerreparation i Vejle: batteri, skærm, tastatur og rensning af MacBook og bærbare. Faste priser på Løversysselvej 3B. Gratis parkering, eller send ind.",
      h1: "Computer- og MacBook-reparation i Vejle",
      heroLead:
        "Batteri, der ikke holder, en computer, der larmer, eller en knust skærm? Vi reparerer MacBook Air, MacBook Pro og andre bærbare på værkstedet på Løversysselvej 3B i Vejle. Du får prisen, før vi går i gang.",
      answerFirst:
        "PhoneSpot Vejle, Løversysselvej 3B, 7100 Vejle, reparerer MacBook og bærbare computere: batteri, skærm, tastatur, ladestik og rensning af computere, der bliver varme. Priserne på MacBook står på siden, og andre bærbare vurderer vi ved disken. Der er gratis parkering ved butikken.",
      intro: [
        "De fleste computere, vi får ind i Vejle, er MacBooks med et træt batteri eller en blæser fuld af støv. Begge dele kan løses for en brøkdel af prisen på en ny computer. Har du en bærbar fra et andet mærke, så tag den med, så kigger vi på den ved disken.",
        "Vi reparerer på eget værksted og rører ikke dine data. Tag alligevel en sikkerhedskopi, før du afleverer, og husk opladeren, så vi kan teste opladningen bagefter.",
      ],
      tiles: [
        { title: "Faste priser", desc: "På MacBook, før vi går i gang" },
        { title: "Eget værksted", desc: "Vi rører ikke dine data" },
        { title: "Alle mærker", desc: "Andre bærbare vurderes ved disken" },
        { title: "Gratis parkering", desc: "Ved butikken i Vejle" },
      ],
      faqs: [
        {
          question: "Hvor kan jeg få repareret min computer i Vejle?",
          answer:
            "Hos PhoneSpot på Løversysselvej 3B, 7100 Vejle. Kom forbi med computeren og opladeren i åbningstiden. Der er gratis parkering ved butikken.",
        },
        {
          question: "Reparerer I andre bærbare end MacBook?",
          answer:
            "Ja, vi kigger på bærbare fra andre mærker ved disken og giver dig en pris, før vi går i gang. Faste priser på siden gælder MacBook.",
        },
        {
          question: "Hvad koster et nyt batteri til MacBook?",
          answer:
            "Det afhænger af modellen. Se tabellen på siden for de mest almindelige MacBook Air- og Pro-modeller.",
        },
        {
          question: "Mister jeg mine data ved en reparation?",
          answer:
            "Vi rører ikke dine data ved batteri-, skærm- eller tastaturskift. Tag alligevel en sikkerhedskopi, før du afleverer computeren.",
        },
      ],
    },
  },
  slagelse: {
    ipad: {
      metaTitle: "iPad-reparation i Slagelse: ladestik og skærm | PhoneSpot",
      metaDescription:
        "iPad lader ikke eller knust skærm? Vi reparerer iPad i VestsjællandsCentret i Slagelse. Nyt ladestik 899 kr. på alle modeller, 2-3 hverdage og livstidsgaranti.",
      h1: "iPad-reparation i Slagelse",
      heroLead:
        "Lader din iPad ikke, eller er skærmen knust? Aflever den i butikken i VestsjællandsCentret uden tidsbestilling. Et nyt ladestik koster 899 kr. på alle modeller og er klar på 2-3 hverdage.",
      answerFirst:
        "PhoneSpot Slagelse i VestsjællandsCentret 10A, 103, 4200 Slagelse, reparerer iPad, iPad Air, iPad mini og iPad Pro. Et defekt ladestik er den fejl, vi ser oftest. Det skiftes med mikrolodning, koster 899 kr. uanset model og tager 2-3 hverdage. Du får livstidsgaranti på arbejde og dele, og vi har åbent alle ugens dage.",
      intro: [
        "I Slagelse får vi mange iPads ind, der pludselig er holdt op med at lade. Det er sjældent batteriet. Oftest er det ladestikket, der er slidt eller knækket, fordi iPaden bliver brugt, mens den lader.",
        "Ladestikket sidder loddet fast på bundkortet på de fleste nyere iPads, så det skal skiftes med mikrolodning. Reparationen tager 2-3 hverdage. Du afleverer iPaden i VestsjællandsCentret og henter den, når vi har givet besked.",
      ],
      tiles: [
        { title: "899 kr.", desc: "Nyt ladestik, alle iPad-modeller" },
        { title: "2-3 hverdage", desc: "Mikrolodning på værkstedet" },
        { title: "Livstidsgaranti", desc: "Arbejde og dele, batteri 6 mdr." },
        { title: "Åbent hver dag", desc: "I VestsjællandsCentret" },
      ],
      faqs: [
        {
          question: "Hvor kan jeg få repareret min iPad i Slagelse?",
          answer:
            "Hos PhoneSpot i VestsjællandsCentret 10A, 103, 4200 Slagelse. Kom forbi uden tidsbestilling. Vi har åbent alle ugens dage.",
        },
        {
          question: "Hvor lang tid tager det at skifte ladestik på en iPad?",
          answer:
            "2-3 hverdage fra aflevering. Du får besked, når iPaden er klar til afhentning.",
        },
        {
          question: "Kan I reparere iPads fra Næstved, Korsør og Sorø?",
          answer:
            "Ja. Kom forbi butikken i Slagelse, eller send iPaden ind med en gratis fragtlabel.",
        },
        {
          question: "Reparerer I også porte på andre enheder?",
          answer:
            "Ja. Vi skifter ladestik på iPad, iPhone og Samsung, og HDMI-port på PlayStation, Xbox og Nintendo Switch.",
        },
      ],
    },
    playstation: {
      metaTitle: "PS5-reparation i Slagelse: HDMI og rengøring | PhoneSpot",
      metaDescription:
        "Sort skærm på din PS5? Vi skifter HDMI-porten og renser konsollen for 1.300 kr. med 2 års garanti. Aflever i VestsjællandsCentret i Slagelse, eller send den ind.",
      h1: "PS5- og konsolreparation i Slagelse",
      heroLead:
        "Sort skærm på PS5, en Xbox der larmer, eller en Switch der ikke vil vise billede på tv'et? Aflever konsollen i VestsjællandsCentret. På PS5 skifter vi HDMI-porten og renser konsollen i én pakke til 1.300 kr.",
      answerFirst:
        "PhoneSpot Slagelse i VestsjællandsCentret 10A, 103, 4200 Slagelse, reparerer porte og konsoller: HDMI-port på PS5, PS4, Xbox og Nintendo Switch, blæsere og controllere. HDMI-port og rengøring på PS5 koster 1.300 kr., tager 2-3 hverdage og har 2 års garanti.",
      intro: [
        "Reparation af porte er noget af det, vi oftest bliver spurgt om i Slagelse. På konsoller er det næsten altid HDMI-porten: Kablet er blevet trukket ud skævt, og porten er knækket indvendigt. Konsollen tænder, men skærmen er sort.",
        "Porten sidder loddet på bundkortet og skiftes med mikrolodning. Når konsollen er åben, renser vi også blæser og køleprofil. Du afleverer konsollen i VestsjællandsCentret og får besked, når den er klar.",
      ],
      tiles: [
        { title: "1.300 kr.", desc: "PS5 HDMI-port + rengøring" },
        { title: "2-3 hverdage", desc: "Fra aflevering til klar" },
        { title: "2 års garanti", desc: "På PS5-pakken" },
        { title: "Åbent hver dag", desc: "I VestsjællandsCentret" },
      ],
      faqs: [
        {
          question: "Hvor kan jeg få repareret min PS5 i Slagelse?",
          answer:
            "Hos PhoneSpot i VestsjællandsCentret 10A, 103, 4200 Slagelse. Aflever konsollen alle ugens dage, eller send den ind.",
        },
        {
          question: "Hvad koster det at skifte HDMI-port på en PS5?",
          answer:
            "1.300 kr. for HDMI-port og indvendig rengøring i én pakke. Porten alene koster 1.599 kr. Prisen gælder PS5, PS5 Digital og PS5 Pro.",
        },
        {
          question: "Reparerer I porte på andre konsoller?",
          answer:
            "Ja. Vi skifter HDMI-port på PS4, Xbox Series X og S og Nintendo Switch. Se priserne i tabellen.",
        },
        {
          question: "Hvor lang tid tager det?",
          answer: "HDMI-port og rengøring på PS5 tager 2-3 hverdage.",
        },
      ],
    },
    computer: {
      metaTitle: "Computer- og MacBook-reparation i Slagelse | PhoneSpot",
      metaDescription:
        "Computerreparation i Slagelse: batteri, skærm, tastatur og rensning af MacBook og bærbare. Faste priser i VestsjællandsCentret. Åbent alle ugens dage.",
      h1: "Computer- og MacBook-reparation i Slagelse",
      heroLead:
        "Computeren er langsom, varm eller holder ikke strøm? Vi reparerer MacBook og andre bærbare i butikken i VestsjællandsCentret. Du får prisen, før vi går i gang.",
      answerFirst:
        "PhoneSpot Slagelse i VestsjællandsCentret 10A, 103, 4200 Slagelse, reparerer MacBook og bærbare computere: batteri, skærm, tastatur, ladestik og rensning af computere, der bliver varme eller larmer. Priserne på MacBook står på siden, og andre bærbare vurderer vi ved disken.",
      intro: [
        "I Slagelse kommer mange med en bærbar, der er blevet langsom og varm. Ofte er blæseren fyldt med støv, og den termiske pasta er tørret ud. En rensning kan give computeren et nyt liv for en lille pris.",
        "Vi reparerer MacBook Air og MacBook Pro til faste priser og kigger på bærbare fra andre mærker ved disken. Tag opladeren med, så vi kan teste opladningen, og tag en sikkerhedskopi, før du afleverer.",
      ],
      tiles: [
        { title: "Faste priser", desc: "På MacBook, før vi går i gang" },
        { title: "Eget værksted", desc: "Vi rører ikke dine data" },
        { title: "Alle mærker", desc: "Andre bærbare vurderes ved disken" },
        { title: "Åbent hver dag", desc: "I VestsjællandsCentret" },
      ],
      faqs: [
        {
          question: "Hvor kan jeg få repareret min computer i Slagelse?",
          answer:
            "Hos PhoneSpot i VestsjællandsCentret 10A, 103, 4200 Slagelse. Kom forbi med computeren og opladeren. Vi har åbent alle ugens dage.",
        },
        {
          question: "Reparerer I andre bærbare end MacBook?",
          answer:
            "Ja, vi vurderer bærbare fra andre mærker ved disken og giver dig en pris, før vi går i gang. Faste priser på siden gælder MacBook.",
        },
        {
          question: "Min computer er langsom og varm. Hvad kan I gøre?",
          answer:
            "Vi renser blæser og køleprofil og skifter termisk pasta. Det løser ofte både varme, støj og en computer, der skruer ned for farten.",
        },
        {
          question: "Kan jeg sende computeren ind?",
          answer:
            "Ja. Pak den godt ind med opladeren, og send den med en gratis fragtlabel.",
        },
      ],
    },
  },
};

const CITY_NAME: Record<LocalServiceStore, string> = { vejle: "Vejle", slagelse: "Slagelse" };

export const LOCAL_SERVICE_KEYS: LocalServiceKey[] = ["ipad", "playstation", "computer"];
export const LOCAL_SERVICE_STORES: LocalServiceStore[] = ["vejle", "slagelse"];

export function getLocalServicePage(
  store: LocalServiceStore,
  key: string,
): LocalServicePage | null {
  if (!LOCAL_SERVICE_KEYS.includes(key as LocalServiceKey)) return null;
  const service = SERVICES[key as LocalServiceKey];
  return {
    ...service,
    ...CITY_COPY[store][key as LocalServiceKey],
    store,
    city: CITY_NAME[store],
    path: `/reparation-${store}/${key}`,
    hubPath: `/reparation-${store}`,
  };
}

/** Hvilken lokal ydelsesside et reparationsmærke hører til (til brand-hubbens bylinks). */
export function localServiceKeyForBrand(brandSlug: string): LocalServiceKey | null {
  if (brandSlug === "ipad") return "ipad";
  if (brandSlug === "macbook") return "computer";
  if (["playstation", "xbox", "nintendo"].includes(brandSlug)) return "playstation";
  return null;
}

/** Alle sider, fx til sitemap og llms.txt. */
export function getAllLocalServicePages(): LocalServicePage[] {
  return LOCAL_SERVICE_STORES.flatMap((store) =>
    LOCAL_SERVICE_KEYS.map((key) => getLocalServicePage(store, key)!),
  );
}

export function buildLocalServiceMetadata(page: LocalServicePage): Metadata {
  const url = `${SITE_URL}${page.path}`;
  return {
    title: { absolute: page.metaTitle },
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url,
      type: "website",
    },
  };
}
