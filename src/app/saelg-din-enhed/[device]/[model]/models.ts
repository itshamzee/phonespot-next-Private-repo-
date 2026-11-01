/**
 * Sider pr. model under /saelg-din-enhed/[device]/[model].
 *
 * Ingen priser her, med vilje: se kommentaren i ../devices.ts. Vi køber både
 * virkende og defekte enheder, og fejlen skal oplyses i formularen på forhånd.
 */
import type { SellLandingContent } from "@/components/sell-device/sell-landing-page";

export type SellModelPage = SellLandingContent & {
  device: string;
  slug: string;
  name: string;
  title: string;
  metaDescription: string;
  linkLabel: string;
};

type Category = {
  device: string;
  /** Navn i tekst, fx "spillekonsol". */
  label: string;
  crumb: string;
  preset: { deviceType: string; brand?: string };
  /** "din" eller "dine". */
  owner?: string;
  /** Afsnit, der gælder hele kategorien. */
  checks: string;
  prepare: string;
  /** Fejl, vi ofte ser, i klar tekst. */
  faults: string;
  faultExample: string;
  models: { slug: string; name: string; intro: string; defectPage?: boolean }[];
};

const CATEGORIES: Category[] = [
  {
    device: "spillekonsol",
    label: "spillekonsol",
    crumb: "Spillekonsol",
    preset: { deviceType: "Konsol" },
    checks: "Tjek, at konsollen tænder, sender billede og ikke larmer usædvanligt. Skriv, om controller, kabler og strømforsyning følger med.",
    prepare: "Tag backup af gemte spil, log ud af din konto, og nulstil konsollen under indstillingerne. Kan den ikke starte, så skriv det i formularen.",
    faults: "Typiske fejl er HDMI-porten, diskdrevet, overophedning og en konsol, der ikke tænder.",
    faultExample: "Tænder ikke, Diskdrev eller HDMI",
    models: [
      { slug: "playstation-5", name: "PlayStation 5", defectPage: true, intro: "Den oprindelige PlayStation 5 fra 2020 har diskdrev og 825 GB lagerplads. Modellen er stor, så pak den godt ind, hvis du sender den." },
      { slug: "playstation-5-digital", name: "PlayStation 5 Digital Edition", intro: "Digital Edition har intet diskdrev, så dine spil ligger på konsollen og på din konto. Vælg den rigtige udgave i formularen." },
      { slug: "playstation-5-slim", name: "PlayStation 5 Slim", defectPage: true, intro: "PlayStation 5 Slim er den mindre udgave fra 2023 med 1 TB lagerplads, og den findes med og uden diskdrev. Skriv, hvilken du har." },
      { slug: "playstation-5-pro", name: "PlayStation 5 Pro", defectPage: true, intro: "PlayStation 5 Pro fra 2024 har 2 TB lagerplads og intet indbygget diskdrev. Har du købt diskdrevet til, så skriv det." },
      { slug: "playstation-4", name: "PlayStation 4", defectPage: true, intro: "PlayStation 4 findes som original og Slim, ofte med 500 GB eller 1 TB. Vælg den rigtige, og fortæl, om blæseren larmer." },
      { slug: "playstation-4-pro", name: "PlayStation 4 Pro", intro: "PlayStation 4 Pro har 1 TB og kan vise spil i højere opløsning end den almindelige PS4. Blæserstøj er det, de fleste skal tjekke." },
      { slug: "xbox-series-x", name: "Xbox Series X", defectPage: true, intro: "Xbox Series X har diskdrev og findes med 1 eller 2 TB lagerplads. Prøv diskdrevet med et spil, før du udfylder formularen." },
      { slug: "xbox-series-s", name: "Xbox Series S", defectPage: true, intro: "Xbox Series S er den lille konsol uden diskdrev med 512 GB eller 1 TB lagerplads." },
      { slug: "xbox-one", name: "Xbox One", intro: "Xbox One findes som original, S og X. Se modelnavnet på konsollen, og skriv, om strømforsyningen følger med." },
      { slug: "nintendo-switch-2", name: "Nintendo Switch 2", defectPage: true, intro: "Nintendo Switch 2 har 256 GB lagerplads og større skærm end den første Switch. Skriv, om dock og Joy-Con følger med." },
      { slug: "nintendo-switch-oled", name: "Nintendo Switch OLED", defectPage: true, intro: "Nintendo Switch OLED har 64 GB lagerplads og OLED-skærm. Se efter ridser på skærmen, og tjek, at Joy-Con sidder fast." },
      { slug: "nintendo-switch", name: "Nintendo Switch", defectPage: true, intro: "Den almindelige Nintendo Switch har 32 GB lagerplads. Skriv, om dock, Joy-Con og oplader følger med, for de tæller med." },
      { slug: "nintendo-switch-lite", name: "Nintendo Switch Lite", intro: "Nintendo Switch Lite kan ikke tilsluttes et TV, og styringen er bygget fast på. Tjek derfor sticks og knapper grundigt." },
      { slug: "steam-deck", name: "Steam Deck", defectPage: true, intro: "Steam Deck findes med LCD- eller OLED-skærm og op til 1 TB lagerplads. Vælg den rigtige, og tjek skærm og sticks." },
    ],
  },
  {
    device: "controller",
    label: "controller",
    crumb: "Controller",
    preset: { deviceType: "Controller" },
    checks: "Tjek sticks, knapper og triggere, og sæt controlleren til opladning. Skriv, om kabel eller opladestation følger med.",
    prepare: "Fjern parringen fra din konsol, og tør controlleren af, før du afleverer den.",
    faults: "Typiske fejl er stick drift, slidte knapper og et batteri, der ikke holder.",
    faultExample: "Stick drift eller Knapper",
    models: [
      { slug: "dualsense", name: "DualSense", intro: "DualSense er controlleren til PlayStation 5. Stick drift og slidte triggere er det, du særligt skal tjekke." },
      { slug: "dualsense-edge", name: "DualSense Edge", intro: "DualSense Edge har udskiftelige stick-moduler og ekstra knapper. Skriv, om etui og ekstra dele følger med." },
      { slug: "xbox-controller", name: "Xbox-controller", intro: "Xbox Wireless Controller findes i mange farver. Skriv, om den bruger batterier eller opladepakke." },
      { slug: "joy-con", name: "Joy-Con", intro: "Joy-Con sælges tit som par. Skriv, om du har venstre, højre eller begge, og tjek for stick drift." },
    ],
  },
  {
    device: "hoeretelefoner",
    label: "høretelefoner",
    crumb: "Høretelefoner",
    preset: { deviceType: "Høretelefoner" },
    owner: "dine",
    checks: "Test lyden i begge sider, mikrofonen og batteriet. Skriv, hvad der følger med, fx etui, kabel eller taske.",
    prepare: "Fjern dem fra din konto og dine enheder, og rens dem, før du afleverer dem.",
    faults: "Typiske fejl er lyd i kun én side, svag støjreduktion og et batteri, der ikke holder.",
    faultExample: "Lyd i én side eller Batteri",
    models: [
      { slug: "airpods-pro", name: "AirPods Pro", intro: "AirPods Pro findes i flere generationer. Generationen kan du se under Bluetooth på din iPhone, og begge ørestykker og etuiet skal være med." },
      { slug: "airpods-max", name: "AirPods Max", intro: "AirPods Max er over-ear-høretelefoner, hvor ørepuderne kan skiftes. Tjek for fugt inde i ørekopperne, og skriv, om etuiet følger med." },
      { slug: "airpods", name: "AirPods", intro: "AirPods findes i flere generationer. Begge ørestykker og etuiet skal være med." },
      { slug: "sony-wh-1000xm5", name: "Sony WH-1000XM5", intro: "Sony WH-1000XM5 er trådløse over-ear-høretelefoner med støjreduktion. Tjek ørepuderne, og skriv, om tasken følger med." },
      { slug: "bose-quietcomfort", name: "Bose QuietComfort", intro: "Bose QuietComfort er kendt for støjreduktion. Prøv den, og se, om ørepuderne er slidte." },
    ],
  },
  {
    device: "dyson",
    label: "Dyson",
    crumb: "Dyson",
    preset: { deviceType: "Dyson", brand: "Dyson" },
    checks: "Test alle varmetrin og blæserstyrker, se på ledningen, og skriv præcist, hvilke mundstykker der følger med.",
    prepare: "Rens filteret, og fjern hår, før du afleverer enheden.",
    faults: "Typiske fejl er svag luft, manglende varme og en slidt ledning.",
    faultExample: "Varmer ikke eller Ledning",
    models: [
      { slug: "supersonic", name: "Dyson Supersonic", intro: "Dyson Supersonic er hårtørreren med motoren i håndtaget. Serienummeret står på enheden, og mundstykkerne tæller med." },
      { slug: "airwrap", name: "Dyson Airwrap", intro: "Dyson Airwrap er et stylingsæt, hvor tilbehøret er en stor del af værdien. Skriv, hvilke dele du har." },
      { slug: "corrale", name: "Dyson Corrale", intro: "Dyson Corrale er et fladjern, der kan bruges uden ledning. Tjek batteri, plader og opladning." },
      { slug: "airstrait", name: "Dyson Airstrait", intro: "Dyson Airstrait glatter håret med luft. Test varmen på alle indstillinger, og se efter skader på armene." },
    ],
  },
  {
    device: "samsung",
    label: "Samsung",
    crumb: "Samsung Galaxy",
    preset: { deviceType: "Telefon", brand: "Samsung" },
    checks: "Tjek skærm, kanter, batteri og kameraer, og find modelnavnet under Indstillinger, Om telefonen.",
    prepare: "Tag backup, fjern din Google- og Samsung-konto, og nulstil telefonen.",
    faults: "Typiske fejl er revnet skærm, skærmstreger og opladeporten.",
    faultExample: "Opladning eller Kamera",
    models: [
      { slug: "galaxy-s25", name: "Samsung Galaxy S25", intro: "Galaxy S25-serien fra 2025 består af S25, S25+ og S25 Ultra. Vælg den rigtige i formularen." },
      { slug: "galaxy-s24", name: "Samsung Galaxy S24", intro: "Galaxy S24-serien består af S24, S24+ og S24 Ultra, hvor Ultra har ramme i titanium." },
      { slug: "galaxy-s23", name: "Samsung Galaxy S23", intro: "Galaxy S23-serien består af S23, S23+ og S23 Ultra. Skærmen og batteriet er det, vi ser mest på." },
      { slug: "galaxy-s22", name: "Samsung Galaxy S22", intro: "Galaxy S22-serien fra 2022 er efterhånden nogle år gammel, så batteriet betyder meget." },
      { slug: "galaxy-s21", name: "Samsung Galaxy S21", intro: "Galaxy S21-serien fra 2021 er den ældste S-serie i formularen. Skriv, om telefonen er repareret." },
      { slug: "galaxy-z-fold", name: "Samsung Galaxy Z Fold", intro: "På Galaxy Z Fold er den indvendige skærm, folden og hængslet det vigtigste. Beskriv dem nøje." },
      { slug: "galaxy-z-flip", name: "Samsung Galaxy Z Flip", intro: "På Galaxy Z Flip skal du særligt se på folden, hængslet og den lille ydre skærm." },
      { slug: "galaxy-a", name: "Samsung Galaxy A", intro: "Galaxy A-serien findes med flere hukommelsesstørrelser under samme navn, så find den præcise variant." },
    ],
  },
  {
    device: "ipad",
    label: "iPad",
    crumb: "iPad",
    preset: { deviceType: "Tablet", brand: "Apple" },
    checks: "Tjek skærmen for streger og pletter, og oplys, om det er en Wi-Fi-model eller har mobilforbindelse.",
    prepare: "Log ud af din Apple-konto, slå Find min iPad fra, og slet alt indhold.",
    faults: "Typiske fejl er revnet glas, opladeporten og et slidt batteri.",
    faultExample: "Opladning eller Knapper",
    models: [
      { slug: "ipad-pro", name: "iPad Pro", intro: "iPad Pro findes i 11 og 13 tommer med M-chip. Chippen står under Indstillinger, Generelt, Om." },
      { slug: "ipad-air", name: "iPad Air", intro: "iPad Air findes i flere generationer, nu også i 13 tommer. Vælg den rigtige størrelse og chip." },
      { slug: "ipad-mini", name: "iPad mini", intro: "iPad mini er den lille model. 6. og 7. generation står i formularen, og bøjninger i rammen skal med i beskrivelsen." },
      { slug: "ipad-almindelig", name: "iPad (almindelig)", intro: "Den almindelige iPad findes i mange generationer. Se generationen under Indstillinger, Generelt, Om." },
    ],
  },
  {
    device: "macbook",
    label: "MacBook",
    crumb: "MacBook",
    preset: { deviceType: "Laptop", brand: "Apple" },
    checks: "Find model, chip, RAM og SSD under Om denne Mac, og tjek skærm, tastatur og batteri.",
    prepare: "Tag backup, log ud af Apple-kontoen, slå Find min Mac fra, og vælg Slet alt indhold og alle indstillinger.",
    faults: "Typiske fejl er knækket skærm, væske i tastaturet og en computer, der ikke tænder.",
    faultExample: "Tastatur eller Trackpad",
    models: [
      { slug: "macbook-air-m1", name: "MacBook Air M1", intro: "MacBook Air M1 fra 2020 er stadig en populær computer. Oplys RAM og SSD, for de kan ikke opgraderes." },
      { slug: "macbook-air-m2", name: "MacBook Air M2", intro: "MacBook Air M2 findes i 13 og 15 tommer. Vælg den rigtige størrelse i formularen." },
      { slug: "macbook-air-m3", name: "MacBook Air M3", intro: "MacBook Air M3 findes i 13 og 15 tommer. Oplys RAM og SSD, for det flytter vurderingen." },
      { slug: "macbook-pro-m1", name: "MacBook Pro M1", intro: "MacBook Pro M1 findes i 13, 14 og 16 tommer og med M1, Pro eller Max. Find den præcise chip." },
      { slug: "macbook-pro-m2", name: "MacBook Pro M2", intro: "MacBook Pro M2 findes i 13, 14 og 16 tommer. Skriv, om det er M2, M2 Pro eller M2 Max." },
      { slug: "macbook-pro-m3", name: "MacBook Pro M3", intro: "MacBook Pro M3 findes i 14 og 16 tommer. Skriv, om det er M3, M3 Pro eller M3 Max." },
      { slug: "macbook-pro-m4", name: "MacBook Pro M4", intro: "MacBook Pro M4 findes i 14 og 16 tommer. Så ny en computer gør det vigtigt at gemme kvitteringen." },
    ],
  },
  {
    device: "laptop",
    label: "bærbar",
    crumb: "Bærbar",
    preset: { deviceType: "Laptop" },
    checks: "Find processor, RAM og lagerplads under Indstillinger, System, Om, og tjek skærm, tastatur og batteri.",
    prepare: "Tag backup, og nulstil computeren under Indstillinger, System, Gendannelse. Vælg Fjern alt.",
    faults: "Typiske fejl er knækket skærm, løse hængsler og en computer, der ikke tænder.",
    faultExample: "Tastatur eller Trackpad",
    models: [
      { slug: "lenovo-thinkpad", name: "Lenovo ThinkPad", intro: "ThinkPad er populær blandt erhverv. Modelnavnet, fx T14s eller X1 Carbon, står på computeren." },
      { slug: "dell-xps", name: "Dell XPS", intro: "Dell XPS findes i flere størrelser. Skriv årgang og processor." },
      { slug: "hp-elitebook", name: "HP EliteBook", intro: "HP EliteBook sidder ofte i firmaer. Sørg for, at computeren ikke længere er låst til firmaets systemer." },
      { slug: "microsoft-surface", name: "Microsoft Surface", intro: "Surface findes som Laptop og Pro. Skriv, om tastatur og pen følger med." },
      { slug: "asus-rog", name: "ASUS ROG", intro: "ASUS ROG er gaming-computere. Skriv grafikkortet i kommentarfeltet, for det betyder meget." },
    ],
  },
];

const PREPARE_DEFECT_FAQ = [
  {
    question: "Køber I alle defekte enheder?",
    answer: "Nej, er skaden for stor, får du et afslag. Du binder dig ikke til noget ved at spørge.",
  },
  {
    question: "Hvad hvis jeg ikke ved, hvad der er galt?",
    answer: "Vælg Andet, og beskriv, hvad enheden gør eller ikke gør, så ser vi på det.",
  },
  {
    question: "Hvad hvis der er flere fejl, end jeg troede?",
    answer: "Finder vi noget, der afviger fra din beskrivelse, får du et nyt tilbud, før vi køber enheden. Siger du nej, sender vi den gratis retur.",
  },
  {
    question: "Hvordan sletter jeg mine data, hvis enheden ikke virker?",
    answer: "Skriv det i formularen, så aftaler vi, hvad vi gør, før du afleverer enheden.",
  },
];

const AFTER_SUBMIT =
  "Vi gennemgår oplysningerne og vender tilbage med et tilbud. Afviger enheden fra din beskrivelse, får du et nyt tilbud eller får den gratis retur.";

function faultBody(cat: Category): string {
  return `${cat.faults} Svar Nej ved Fungerer alt?, og markér fejlen, fx ${cat.faultExample}. Passer intet, vælger du Andet og forklarer det i kommentarfeltet.`;
}

function buildPages(cat: Category): SellModelPage[] {
  const owner = cat.owner ?? "din";
  const pages: SellModelPage[] = [];
  for (const model of cat.models) {
    const { name, slug, intro } = model;
    pages.push({
      device: cat.device,
      wizardPreset: cat.preset,
      blogSlugs: [],
      slug,
      name,
      title: `Sælg ${name}: virkende eller defekt | PhoneSpot`,
      metaDescription: `Sælg ${owner} ${name} til PhoneSpot. Vi køber både virkende og defekte. Beskriv standen, og få et tilbud. Aflever i Vejle eller Slagelse.`,
      eyebrow: `Sælg ${name}`,
      h1: `Sælg ${owner} ${name}`,
      answer: `Du sælger ${owner} ${name} ved at vælge den i formularen og beskrive standen. Vi køber både virkende og defekte, og du får et tilbud efter vores gennemgang. Aflever i Vejle eller Slagelse, eller send efter aftale.`,
      bodyHeading: `Det afgør, hvad ${owner} ${name} er værd`,
      body: [intro, cat.checks, cat.faults, cat.prepare],
      coverageHeading: `Find ${owner} ${name} i formularen`,
      coverage: "Vælg modellen på listen. Står den ikke der, kan du trykke på Min enhed findes ikke på listen og skrive den selv. Fejler noget, markerer du det, så vi kender fejlen på forhånd.",
      faqHeading: `Spørgsmål om at sælge ${name}`,
      faq: [
        {
          question: `Hvad er ${owner} ${name} værd?`,
          answer: `Det afhænger af variant, stand, og hvad der følger med. ${cat.checks} Du får et konkret tilbud efter vores gennemgang, og siger du ja, holder prisen, medmindre enheden afviger fra din beskrivelse.`,
        },
        {
          question: `Køber I en defekt ${name}?`,
          answer: `Ja, vi køber både virkende og defekte. ${faultBody(cat)} Vi kan ikke love at købe alle.`,
        },
        { question: `Hvordan gør jeg ${owner} ${name} klar?`, answer: cat.prepare },
        {
          question: `Hvordan afleverer jeg ${owner} ${name}?`,
          answer: "Vælg i formularen, om du vil aflevere i Vejle eller Slagelse eller sende enheden. Sender du, får du en gratis label, når du har sagt ja til tilbuddet.",
        },
      ],
      linkLabel: name,
    });
    if (model.defectPage) {
      pages.push({
        device: cat.device,
        wizardPreset: cat.preset,
        blogSlugs: [],
        slug: `defekt-${slug}`,
        name: `defekt ${name}`,
        title: `Sælg defekt ${name}: oplys fejlen | PhoneSpot`,
        metaDescription: `Sælg din defekte ${name} til PhoneSpot. Oplys fejlen i formularen, og få et tilbud efter vores gennemgang. Aflever i Vejle eller Slagelse.`,
        eyebrow: `Sælg defekt ${name}`,
        h1: `Sælg din defekte ${name}`,
        answer: `Vi køber også defekte ${name}, så længe vi kender fejlen på forhånd. Markér, hvad der ikke virker, i formularen. Du får et tilbud efter vores gennemgang, eller et afslag, hvis skaden er for stor.`,
        bodyHeading: `Sådan beskriver du fejlen på din ${name}`,
        body: [
          faultBody(cat),
          "Fortæl også, hvad der skete, og om enheden har været repareret eller åbnet før. Det hjælper os med at give et præcist tilbud.",
          intro,
        ],
        coverageHeading: "Det sker, når du har sendt formularen",
        coverage: AFTER_SUBMIT,
        faqHeading: `Spørgsmål om at sælge en defekt ${name}`,
        faq: PREPARE_DEFECT_FAQ,
        linkLabel: `defekt ${name}`,
      });
    }
  }
  return pages;
}

function defectHub(cat: Category): SellModelPage {
  const defectName = cat.owner === "dine" ? `defekte ${cat.label}` : `defekt ${cat.label}`;
  return {
    device: cat.device,
    slug: "defekt",
    name: defectName,
    title: `Sælg ${defectName}: oplys fejlen | PhoneSpot`,
    metaDescription: `Sælg ${defectName} til PhoneSpot. Oplys fejlen i formularen, og få et tilbud efter vores gennemgang. Aflever i Vejle eller Slagelse.`,
    eyebrow: `Sælg ${defectName}`,
    h1: `Sælg ${defectName}`,
    answer: `Vi køber også ${defectName}, så længe vi kender fejlen på forhånd. Markér, hvad der ikke virker, i formularen. Du får et tilbud efter vores gennemgang, eller et afslag, hvis skaden er for stor.`,
    wizardPreset: cat.preset,
    bodyHeading: "Sådan beskriver du fejlen",
    body: [
      faultBody(cat),
      "Fortæl også, hvad der skete, og om enheden har været repareret eller åbnet før. Jo mere vi ved, jo mere præcist bliver tilbuddet.",
      cat.prepare,
    ],
    coverageHeading: "Det sker, når du har sendt formularen",
    coverage: AFTER_SUBMIT,
    faqHeading: `Spørgsmål om at sælge ${defectName}`,
    faq: PREPARE_DEFECT_FAQ,
    blogSlugs: [],
    linkLabel: defectName,
  };
}

export const SELL_MODEL_PAGES: SellModelPage[] = CATEGORIES.flatMap((cat) => [...buildPages(cat), defectHub(cat)]);

export function getModelPages(device: string): SellModelPage[] {
  return SELL_MODEL_PAGES.filter((page) => page.device === device);
}

export function getModelPage(device: string, slug: string): SellModelPage | undefined {
  return SELL_MODEL_PAGES.find((page) => page.device === device && page.slug === slug);
}

export function getCategoryCrumb(device: string): string {
  return CATEGORIES.find((cat) => cat.device === device)?.crumb ?? device;
}
