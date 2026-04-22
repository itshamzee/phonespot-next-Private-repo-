// src/lib/tilbehoer-config.ts

// ---------------------------------------------------------------------------
// Tilbehør route configuration — single source of truth
// ---------------------------------------------------------------------------

export interface TilbehoerCategory {
  slug: string;
  label: string;
  description: string;
  deviceSpecific: boolean;
  heroDescription: string; // 1-2 sentence hero subtext
  faq: { q: string; a: string }[]; // 3 FAQ items
}

export type DeviceBrand = "apple" | "samsung" | "oneplus" | "huawei" | "google" | "xiaomi";

export interface TilbehoerDevice {
  slug: string;
  label: string;
  brand: DeviceBrand;
}

export const DEVICE_BRANDS: { slug: DeviceBrand; label: string }[] = [
  { slug: "apple", label: "Apple" },
  { slug: "samsung", label: "Samsung" },
  { slug: "oneplus", label: "OnePlus" },
  { slug: "google", label: "Google" },
  { slug: "xiaomi", label: "Xiaomi" },
  { slug: "huawei", label: "Huawei" }, // kept for legacy data; not featured for Spot
];

export interface TilbehoerRoute {
  category: string;
  device?: string;
  categoryLabel: string;
  deviceLabel?: string;
  brand?: string;
}

export const TILBEHOER_CATEGORIES: TilbehoerCategory[] = [
  {
    slug: "covers",
    label: "Covers & Cases",
    description: "Beskyt din enhed med stilfulde covers og cases.",
    deviceSpecific: true,
    heroDescription: "Find det perfekte cover til din model — TPU, hardcase og MagSafe-kompatible varianter til alle populære telefoner.",
    faq: [
      {
        q: "Hvad er forskellen på TPU og hardcase?",
        a: "TPU covers er bløde og absorberer stød bedre. Hardcases er stivere og giver mere kantbeskyttelse. Vi anbefaler TPU til daglig brug og hybrid-cases til maksimal beskyttelse.",
      },
      {
        q: "Passer et cover til iPhone 15 på iPhone 15 Pro?",
        a: "Nej — iPhone 15 og 15 Pro har forskellig kamerahul-placering og knap-layout. Vælg altid cover der er specifikt til din model.",
      },
      {
        q: "Understøtter coverene MagSafe?",
        a: "Vores MagSafe-kompatible covers er mærket med 'MagSafe' og har den nødvendige magnet-ring. Tjek produktbeskrivelsen for din model.",
      },
    ],
  },
  {
    slug: "skaermbeskyttelse",
    label: "Skærmbeskyttelse",
    description: "Panserglas og screen protectors til alle enheder.",
    deviceSpecific: true,
    heroDescription: "Hærdet panserglas og plastfolie til din skærm — monteret rigtigt første gang, ellers bytter vi det.",
    faq: [
      {
        q: "Hvad er forskellen på hærdet glas og plastfolie?",
        a: "Hærdet glas (panserglas) er hårdere, skraber ikke og giver en skarpere touchfornemmelse. Plastfolie er tyndere og billigere men slides hurtigere.",
      },
      {
        q: "Dækker skærmbeskyttelsen hele skærmen?",
        a: "Edge-to-edge modeller dækker hele skærmen inkl. kanter. Tjek om din model er kompatibel med edge-to-edge eller flat-skærm-variant.",
      },
      {
        q: "Kan jeg sætte panserglas på med cover på?",
        a: "Ja, de fleste panserglas-modeller er designet til at fungere med tynde covers. Tjek produktets kompatibilitets-noter.",
      },
    ],
  },
  {
    slug: "beskyttelsesglas",
    label: "Beskyttelsesglas",
    description: "Spot beskyttelsesglas til alle telefoner og tablets.",
    deviceSpecific: true,
    heroDescription: "Hærdet 9H glas med perfekt pasform. Gratis professionel montering i Vejle og Slagelse på 60 sekunder.",
    faq: [
      {
        q: "Holder Spot beskyttelsesglas virkelig mod fald?",
        a: "Ja. Glasset er 9H hærdet — samme hårdhed som safirglas. Det tager stødet så din skærm ikke gør det. Udskift glasset, ikke skærmen.",
      },
      {
        q: "Kan jeg få det monteret gratis?",
        a: "Kom forbi PhoneSpot i Vejle eller Slagelse — vi monterer glasset gratis på under 60 sekunder, perfekt hver gang.",
      },
      {
        q: "Er det samme glas til alle iPhones?",
        a: "Nej. Nogle modeller deler samme dimensioner (f.eks. iPhone 13/14/15) og bruger samme glas. Vores produktsider viser altid hvilke modeller et specifikt glas passer til.",
      },
    ],
  },
  {
    slug: "opladere",
    label: "Kabler & Opladere",
    description: "Lightning, USB-C, trådløs opladning og kabler.",
    deviceSpecific: false,
    heroDescription: "Hurtigopladere, USB-C kabler og trådløse opladere til iPhone, Samsung og alle Android-modeller.",
    faq: [
      {
        q: "Hvad er forskellen på USB-C og Lightning?",
        a: "iPhone 15 og nyere bruger USB-C. Ældre iPhones (14 og tidligere) bruger Lightning. Samsung og de fleste Android-telefoner bruger USB-C.",
      },
      {
        q: "Hvad er hurtigopladning og har jeg brug for det?",
        a: "Hurtigopladning (f.eks. 20W, 45W eller 65W) lader din telefon markant hurtigere end standard 5W. Din telefon skal understøtte hurtigopladning for at drage nytte af det.",
      },
      {
        q: "Virker trådløs opladning med alle telefoner?",
        a: "Trådløs opladning (Qi-standard) virker med alle iPhones fra iPhone 8 og frem samt de fleste Samsung Galaxy-modeller fra 2018 og frem.",
      },
    ],
  },
  {
    slug: "lyd",
    label: "Lyd & Høretelefoner",
    description: "Earbuds, headsets og højttalere til alle enheder.",
    deviceSpecific: false,
    heroDescription: "Trådløse earbuds, over-ear headphones og Bluetooth højttalere — til hjemmet, kontoret og på farten.",
    faq: [
      {
        q: "Hvad er forskellen på in-ear og on-ear høretelefoner?",
        a: "In-ear (earbuds) sidder i øregangen og er kompakte til sport og pendling. On-ear/over-ear giver typisk bedre lydkvalitet og er bedre til hjemmebrug og kontoret.",
      },
      {
        q: "Understøtter alle earbuds noise cancelling?",
        a: "Nej — aktiv støjreduktion (ANC) er en premium-funktion. Tjek produktspecifikationerne for ANC hvis det er vigtigt for dig.",
      },
      {
        q: "Virker trådløse earbuds med alle telefoner?",
        a: "Ja, alle Bluetooth earbuds virker med iPhone, Samsung og Android-telefoner. Apple AirPods giver dog ekstra funktioner (Siri, automatisk pausering) med iPhone.",
      },
    ],
  },
  {
    slug: "holdere",
    label: "Holdere & Mounts",
    description: "Bilholdere, stander og mounts til din enhed.",
    deviceSpecific: false,
    heroDescription: "Bilholdere, skrivebords-standere og MagSafe mounts — hold din telefon stabilt og tilgængeligt.",
    faq: [
      {
        q: "Hvad er den bedste bilholder til min telefon?",
        a: "Det afhænger af din bil. Ventilationsholere passer til de fleste biler og er nemme at montere. Magnetiske holdere kræver en metalplate bag coverret men er hurtige at sætte telefonen i.",
      },
      {
        q: "Er MagSafe bilholdere bedre end klips-holdere?",
        a: "MagSafe-holdere (til iPhone 12 og nyere) sidder solidt og er meget nemme at bruge med én hånd. Klips-holdere virker med alle telefoner uanset model.",
      },
      {
        q: "Virker skrivebords-standere med alle telefoner?",
        a: "Ja, justerbare standere passer til alle telefonstørrelser fra 4\" til 7\". Tjek at stativets bredde passer til din telefons bredde.",
      },
    ],
  },
  {
    slug: "outlet",
    label: "Outlet",
    description: "Ekstra skarpe priser på udvalgte tilbehør. Begrænset antal.",
    deviceSpecific: false,
    heroDescription: "Overskydende lager og kampagnevarer til ekstra skarpe priser. Begrænset antal — køb mens lager haves.",
    faq: [
      {
        q: "Hvad er outlet-varer?",
        a: "Outlet-varer er nye produkter fra overskydende lager eller kampagner. De er i perfekt stand og leveres med samme garanti som resten af vores sortiment.",
      },
      {
        q: "Kan jeg returnere outlet-varer?",
        a: "Ja — alle vores produkter inkl. outlet-varer er dækket af 14 dages returret i henhold til dansk forbrugerret.",
      },
      {
        q: "Skiftes outlet-sortimentet?",
        a: "Ja, vi opdaterer løbende outlet-sortimentet. Tilmeld dig vores nyhedsbrev for at få besked når nye tilbud er tilgængelige.",
      },
    ],
  },
];

export const TILBEHOER_DEVICES: TilbehoerDevice[] = [
  // Apple - iPhone 17 series
  { slug: "iphone-17-pro-max", label: "iPhone 17 Pro Max", brand: "apple" },
  { slug: "iphone-17-pro", label: "iPhone 17 Pro", brand: "apple" },
  { slug: "iphone-17-air", label: "iPhone 17 Air", brand: "apple" },
  { slug: "iphone-17", label: "iPhone 17", brand: "apple" },
  { slug: "iphone-17e", label: "iPhone 17e/16e", brand: "apple" },
  // Apple - iPhones
  { slug: "iphone-16-pro-max", label: "iPhone 16 Pro Max", brand: "apple" },
  { slug: "iphone-16-pro", label: "iPhone 16 Pro", brand: "apple" },
  { slug: "iphone-16", label: "iPhone 16", brand: "apple" },
  { slug: "iphone-15-pro-max", label: "iPhone 15 Pro Max", brand: "apple" },
  { slug: "iphone-15-pro", label: "iPhone 15 Pro", brand: "apple" },
  { slug: "iphone-15", label: "iPhone 15", brand: "apple" },
  { slug: "iphone-14-pro-max", label: "iPhone 14 Pro Max", brand: "apple" },
  { slug: "iphone-14-pro", label: "iPhone 14 Pro", brand: "apple" },
  { slug: "iphone-14", label: "iPhone 14", brand: "apple" },
  { slug: "iphone-13", label: "iPhone 13", brand: "apple" },
  { slug: "iphone-12", label: "iPhone 12", brand: "apple" },
  { slug: "iphone-11", label: "iPhone 11", brand: "apple" },
  { slug: "iphone-se", label: "iPhone SE", brand: "apple" },
  // Apple - iPads
  { slug: "ipad-pro-13", label: "iPad Pro 13\"", brand: "apple" },
  { slug: "ipad-pro-11", label: "iPad Pro 11\"", brand: "apple" },
  { slug: "ipad-air-m2", label: "iPad Air M2", brand: "apple" },
  { slug: "ipad-air-m1", label: "iPad Air M1", brand: "apple" },
  { slug: "ipad-10", label: "iPad 10. gen", brand: "apple" },
  { slug: "ipad-9", label: "iPad 9. gen", brand: "apple" },
  { slug: "ipad-mini-6", label: "iPad Mini 6", brand: "apple" },
  // Samsung - S-serie
  { slug: "samsung-s25-ultra", label: "Galaxy S25 Ultra", brand: "samsung" },
  { slug: "samsung-s25-plus", label: "Galaxy S25+", brand: "samsung" },
  { slug: "samsung-s25", label: "Galaxy S25", brand: "samsung" },
  { slug: "samsung-s24-ultra", label: "Galaxy S24 Ultra", brand: "samsung" },
  { slug: "samsung-s24-plus", label: "Galaxy S24+", brand: "samsung" },
  { slug: "samsung-s24", label: "Galaxy S24", brand: "samsung" },
  { slug: "samsung-s23-ultra", label: "Galaxy S23 Ultra", brand: "samsung" },
  { slug: "samsung-s23", label: "Galaxy S23", brand: "samsung" },
  // Samsung - A-serie
  { slug: "samsung-a55", label: "Galaxy A55", brand: "samsung" },
  { slug: "samsung-a54", label: "Galaxy A54", brand: "samsung" },
  { slug: "samsung-a35", label: "Galaxy A35", brand: "samsung" },
  { slug: "samsung-a25", label: "Galaxy A25", brand: "samsung" },
  { slug: "samsung-a15", label: "Galaxy A15", brand: "samsung" },
  // Samsung - Tabs
  { slug: "samsung-tab-s9", label: "Galaxy Tab S9", brand: "samsung" },
  { slug: "samsung-tab-s8", label: "Galaxy Tab S8", brand: "samsung" },
  // OnePlus
  { slug: "oneplus-13", label: "OnePlus 13", brand: "oneplus" },
  { slug: "oneplus-12", label: "OnePlus 12", brand: "oneplus" },
  { slug: "oneplus-nord-4", label: "OnePlus Nord 4", brand: "oneplus" },
  { slug: "oneplus-nord-3", label: "OnePlus Nord 3", brand: "oneplus" },
  // Huawei
  { slug: "huawei-p60-pro", label: "Huawei P60 Pro", brand: "huawei" },
  { slug: "huawei-p50-pro", label: "Huawei P50 Pro", brand: "huawei" },
  { slug: "huawei-nova-12", label: "Huawei Nova 12", brand: "huawei" },
  { slug: "huawei-matepad-11", label: "Huawei MatePad 11", brand: "huawei" },
  // Google
  { slug: "google-pixel-9-pro", label: "Pixel 9 Pro", brand: "google" },
  { slug: "google-pixel-9", label: "Pixel 9", brand: "google" },
  { slug: "google-pixel-8-pro", label: "Pixel 8 Pro", brand: "google" },
  { slug: "google-pixel-8", label: "Pixel 8", brand: "google" },
];

export const TILBEHOER_ROUTES: TilbehoerRoute[] = [
  ...TILBEHOER_CATEGORIES.map((cat) => ({
    category: cat.slug,
    categoryLabel: cat.label,
  })),
  ...TILBEHOER_DEVICES.map((device) => ({
    category: "covers",
    device: device.slug,
    categoryLabel: "Covers & Cases",
    deviceLabel: device.label,
    brand: device.brand,
  })),
];

export function getCategoryConfig(slug: string): TilbehoerCategory | null {
  return TILBEHOER_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function getDeviceConfig(slug: string): TilbehoerDevice | null {
  return TILBEHOER_DEVICES.find((d) => d.slug === slug) ?? null;
}

export function getRouteConfig(
  category: string,
  device?: string,
): TilbehoerRoute | null {
  return (
    TILBEHOER_ROUTES.find(
      (r) => r.category === category && r.device === device,
    ) ?? null
  );
}

export function getCategoryDevices(category: string): TilbehoerDevice[] {
  const deviceSlugs = TILBEHOER_ROUTES
    .filter((r) => r.category === category && r.device)
    .map((r) => r.device!);
  return TILBEHOER_DEVICES.filter((d) => deviceSlugs.includes(d.slug));
}

export function getDevicesByBrand(brand: DeviceBrand): TilbehoerDevice[] {
  return TILBEHOER_DEVICES.filter((d) => d.brand === brand);
}

export function getAllCategoryParams(): { category: string }[] {
  return TILBEHOER_CATEGORIES.map((c) => ({ category: c.slug }));
}

export function getAllDeviceParams(): { category: string; device: string }[] {
  return TILBEHOER_ROUTES
    .filter((r) => r.device)
    .map((r) => ({ category: r.category, device: r.device! }));
}

/** Maps accessories.category DB values to tilbehoer URL slugs */
export const ACCESSORY_CATEGORY_TO_SLUG: Record<string, string> = {
  cover: "covers",
  screen_protector: "skaermbeskyttelse",
  charger: "opladere",
  cable: "opladere",
  audio: "lyd",
  other: "holdere",
};

export const SLUG_TO_ACCESSORY_CATEGORIES: Record<string, string[]> = {
  covers: ["cover"],
  skaermbeskyttelse: ["screen_protector"],
  beskyttelsesglas: ["screen_protector"],
  opladere: ["charger", "cable"],
  lyd: ["audio"],
  holdere: ["other"],
  outlet: ["cover", "screen_protector", "charger", "cable", "audio", "other"],
};

export interface SpotHubTile {
  readonly id: string;
  readonly label: string;
  readonly brand: DeviceBrand;
  readonly modelPrefix: string;
}

// Tiles shown on /beskyttelsesglas hub (Huawei excluded per product brief).
// iPad is merchandised separately from iPhone even though both are Apple.
// Used to filter TILBEHOER_DEVICES by slug prefix; modelPrefix === "" means
// match every device for the brand.
export const SPOT_HUB_TILES: readonly SpotHubTile[] = [
  { id: "iphone",  label: "iPhone",         brand: "apple",   modelPrefix: "iphone-" },
  { id: "ipad",    label: "iPad",           brand: "apple",   modelPrefix: "ipad-"   },
  { id: "samsung", label: "Samsung Galaxy", brand: "samsung", modelPrefix: ""        },
  { id: "pixel",   label: "Google Pixel",   brand: "google",  modelPrefix: ""        },
  { id: "xiaomi",  label: "Xiaomi",         brand: "xiaomi",  modelPrefix: ""        },
  { id: "oneplus", label: "OnePlus",        brand: "oneplus", modelPrefix: ""        },
];
