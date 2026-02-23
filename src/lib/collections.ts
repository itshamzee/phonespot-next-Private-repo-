export const COLLECTION_MAP: Record<string, {
  shopifyHandle: string;
  title: string;
  description: string;
  badge?: string;
  showConditionWalkthrough?: boolean;
}> = {
  iphones: {
    shopifyHandle: "iphones",
    title: "Refurbished iPhones",
    description: "Kvalitetstestede iPhones med op til 40% rabat. Alle enheder er funktionelt perfekte med minimum 36 måneders garanti.",
    badge: "Spar op til 40%",
    showConditionWalkthrough: true,
  },
  ipads: {
    shopifyHandle: "ipads",
    title: "Refurbished iPads",
    description: "Find din næste iPad til en brøkdel af nyprisen. Testet og klar til brug.",
    badge: "Fra 1.499 kr",
    showConditionWalkthrough: true,
  },
  smartphones: {
    shopifyHandle: "smartphones",
    title: "Smartphones",
    description: "Samsung, Google og andre topmodeller — kvalitetstestet med garanti.",
    showConditionWalkthrough: true,
  },
  computere: {
    shopifyHandle: "computere",
    title: "Computere",
    description: "Bærbare og stationære computere klar til arbejde og studie.",
  },
  covers: {
    shopifyHandle: "covers",
    title: "Covers & Beskyttelse",
    description: "Beskyt din enhed med kvalitetscovers og panserglas.",
  },
  tilbehor: {
    shopifyHandle: "tilbehor",
    title: "Tilbehør",
    description: "Opladere, kabler og andet tilbehør til dine enheder.",
  },
  smartwatches: {
    shopifyHandle: "smartwatches",
    title: "Smartwatches",
    description: "Refurbished Apple Watch og Samsung Galaxy Watch med 36 måneders garanti.",
    badge: "Fra 999 kr",
    showConditionWalkthrough: true,
  },
  outlet: {
    shopifyHandle: "outlet",
    title: "Outlet",
    description: "Ekstra skarpe priser på udvalgte produkter. Begrænset antal.",
    badge: "Ekstra tilbud",
  },
};

export function getCollectionConfig(slug: string) {
  return COLLECTION_MAP[slug] ?? null;
}

export function getAllCollectionSlugs() {
  return Object.keys(COLLECTION_MAP);
}
