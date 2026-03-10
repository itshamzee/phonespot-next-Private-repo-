// ---------------------------------------------------------------------------
// Spare parts configuration — maps URL slugs to Shopify collections
// ---------------------------------------------------------------------------

export interface SparePartModel {
  label: string;
  slug: string;
  shopifyHandle: string;
  /** Generation grouping for category page (e.g. "15-serien") */
  generation?: string;
}

export interface SparePartCategory {
  label: string;
  slug: string;
  description: string;
  /** Parent Shopify collection (optional, for fetching all parts in category) */
  shopifyHandle?: string;
  /** SVG icon path data for the category card */
  iconPath: string;
  models: SparePartModel[];
}

export interface SparePartType {
  label: string;
  slug: string;
  /** Image path in /public/spare-parts/ */
  image: string;
  /** SVG icon path data */
  iconPath: string;
  /** Shopify product tag used for filtering */
  shopifyTag: string;
}

export interface SparePartFAQ {
  question: string;
  answer: string;
}

export interface PopularSparePartModel {
  label: string;
  href: string;
}

// ---------------------------------------------------------------------------
// Spare part types (6)
// ---------------------------------------------------------------------------

export const SPARE_PART_TYPES: SparePartType[] = [
  {
    label: "Skærme",
    slug: "skaerme",
    image: "/spare-parts/skaerme.png",
    iconPath: "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm4 16h10",
    shopifyTag: "skaerm",
  },
  {
    label: "Batterier",
    slug: "batterier",
    image: "/spare-parts/batterier.png",
    iconPath: "M6 7h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm14 4h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1",
    shopifyTag: "batteri",
  },
  {
    label: "Ladestik",
    slug: "ladestik",
    image: "/spare-parts/ladestik.png",
    iconPath: "M12 2v6m0 8v6M8 8h8l-1 8H9L8 8zm-2 0h12",
    shopifyTag: "ladestik",
  },
  {
    label: "Bagcover",
    slug: "bagcover",
    image: "/spare-parts/bagcover.png",
    iconPath: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
    shopifyTag: "bagcover",
  },
  {
    label: "Kameraer",
    slug: "kameraer",
    image: "/spare-parts/kameraer.png",
    iconPath: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zm-11-3a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    shopifyTag: "kamera",
  },
  {
    label: "Højttalere",
    slug: "hojttalere",
    image: "/spare-parts/hojttalere.png",
    iconPath: "M11 5 6 9H2v6h4l5 4V5zm8 0a9 9 0 0 1 0 14M15.54 8.46a5 5 0 0 1 0 7.07",
    shopifyTag: "hoejtaler",
  },
];

// ---------------------------------------------------------------------------
// iPhone models (with generation grouping)
// ---------------------------------------------------------------------------

const IPHONE_MODELS: SparePartModel[] = [
  { label: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", shopifyHandle: "iphone-15-pro-max-reservedele", generation: "15-serien" },
  { label: "iPhone 15 Pro", slug: "iphone-15-pro", shopifyHandle: "iphone-15-pro-reservedele", generation: "15-serien" },
  { label: "iPhone 15 Plus", slug: "iphone-15-plus", shopifyHandle: "iphone-15-plus-reservedele", generation: "15-serien" },
  { label: "iPhone 15", slug: "iphone-15", shopifyHandle: "iphone-15-reservedele", generation: "15-serien" },
  { label: "iPhone 14 Pro Max", slug: "iphone-14-pro-max", shopifyHandle: "iphone-14-pro-max-reservedele", generation: "14-serien" },
  { label: "iPhone 14 Pro", slug: "iphone-14-pro", shopifyHandle: "iphone-14-pro-reservedel", generation: "14-serien" },
  { label: "iPhone 14 Plus", slug: "iphone-14-plus", shopifyHandle: "iphone-14-plus-reservedele", generation: "14-serien" },
  { label: "iPhone 14", slug: "iphone-14", shopifyHandle: "iphone-14-reservedele", generation: "14-serien" },
  { label: "iPhone 13 Pro Max", slug: "iphone-13-pro-max", shopifyHandle: "iphone-13-pro-max", generation: "13-serien" },
  { label: "iPhone 13 Pro", slug: "iphone-13-pro", shopifyHandle: "iphone-13-pro-reservedele", generation: "13-serien" },
  { label: "iPhone 13", slug: "iphone-13", shopifyHandle: "iphone-13-reservedele", generation: "13-serien" },
  { label: "iPhone 13 Mini", slug: "iphone-13-mini", shopifyHandle: "iphone-13-mini-reservedele", generation: "13-serien" },
  { label: "iPhone 12 Pro Max", slug: "iphone-12-pro-max", shopifyHandle: "iphone-12-pro-max-reservedele", generation: "12-serien" },
  { label: "iPhone 12 Pro", slug: "iphone-12-pro", shopifyHandle: "iphone-12-pro-reservedele", generation: "12-serien" },
  { label: "iPhone 12", slug: "iphone-12", shopifyHandle: "iphone-12-reservedele", generation: "12-serien" },
  { label: "iPhone 12 Mini", slug: "iphone-12-mini", shopifyHandle: "iphone-12-mini-reservedele", generation: "12-serien" },
  { label: "iPhone 11 Pro Max", slug: "iphone-11-pro-max", shopifyHandle: "iphone-11-pro-max-reservedele", generation: "11-serien" },
  { label: "iPhone 11 Pro", slug: "iphone-11-pro", shopifyHandle: "iphone-11-pro", generation: "11-serien" },
  { label: "iPhone 11", slug: "iphone-11", shopifyHandle: "iphone-11-reservedele", generation: "11-serien" },
  { label: "iPhone XS Max", slug: "iphone-xs-max", shopifyHandle: "iphone-xs-max-reservedele", generation: "X-serien" },
  { label: "iPhone XS", slug: "iphone-xs", shopifyHandle: "iphone-xs-reservedele", generation: "X-serien" },
  { label: "iPhone XR", slug: "iphone-xr", shopifyHandle: "iphone-xr-reservedele", generation: "X-serien" },
  { label: "iPhone X", slug: "iphone-x", shopifyHandle: "iphone-x-reservedele", generation: "X-serien" },
  { label: "iPhone SE (2022)", slug: "iphone-se-2022", shopifyHandle: "iphone-se-2022-reservedele", generation: "SE & Ældre" },
  { label: "iPhone SE (2020)", slug: "iphone-se-2020", shopifyHandle: "iphone-se-2020-reservedele", generation: "SE & Ældre" },
  { label: "iPhone 8 Plus", slug: "iphone-8-plus", shopifyHandle: "iphone-8-plus-reservedele", generation: "SE & Ældre" },
  { label: "iPhone 8", slug: "iphone-8", shopifyHandle: "iphone-8-reservedele", generation: "SE & Ældre" },
];

// ---------------------------------------------------------------------------
// iPad models
// ---------------------------------------------------------------------------

const IPAD_MODELS: SparePartModel[] = [
  { label: "iPad 7/8/9 (10.2\")", slug: "ipad-7-8-9", shopifyHandle: "ipad-7-8-9-10-2-reservedele" },
  { label: "iPad 6 (2018) 9.7\"", slug: "ipad-6", shopifyHandle: "ipad-6-reservedele" },
];

// ---------------------------------------------------------------------------
// MacBook models
// ---------------------------------------------------------------------------

const MACBOOK_MODELS: SparePartModel[] = [
  { label: "Alle MacBook reservedele", slug: "alle", shopifyHandle: "macbook-reservedele" },
];

// ---------------------------------------------------------------------------
// Samsung models
// ---------------------------------------------------------------------------

const SAMSUNG_MODELS: SparePartModel[] = [
  { label: "Alle Samsung Galaxy reservedele", slug: "alle", shopifyHandle: "samsung-galaxy-reservedele" },
];

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const SPARE_PART_CATEGORIES: SparePartCategory[] = [
  {
    label: "iPhone Reservedele",
    slug: "iphone",
    description: "Skærme, batterier, kameraer og mere til alle iPhone-modeller",
    shopifyHandle: "iphone-reservedele",
    iconPath: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm5 18h.01",
    models: IPHONE_MODELS,
  },
  {
    label: "iPad Reservedele",
    slug: "ipad",
    description: "Skærme, batterier og reservedele til iPad",
    shopifyHandle: "ipad-reservedele",
    iconPath: "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm6 18h.01",
    models: IPAD_MODELS,
  },
  {
    label: "MacBook Reservedele",
    slug: "macbook",
    description: "Batterier, tastaturer og reservedele til MacBook",
    shopifyHandle: "macbook-reservedele",
    iconPath: "M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM2 18h20",
    models: MACBOOK_MODELS,
  },
  {
    label: "Samsung Reservedele",
    slug: "samsung",
    description: "Skærme og reservedele til Samsung Galaxy",
    shopifyHandle: "samsung-galaxy-reservedele",
    iconPath: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm5 18h.01",
    models: SAMSUNG_MODELS,
  },
];

// ---------------------------------------------------------------------------
// Popular spare part models (top 10 quick-links)
// ---------------------------------------------------------------------------

export const POPULAR_SPARE_PART_MODELS: PopularSparePartModel[] = [
  { label: "iPhone 15 Pro Max", href: "/reservedele/iphone/iphone-15-pro-max" },
  { label: "iPhone 15 Pro", href: "/reservedele/iphone/iphone-15-pro" },
  { label: "iPhone 14 Pro Max", href: "/reservedele/iphone/iphone-14-pro-max" },
  { label: "iPhone 14 Pro", href: "/reservedele/iphone/iphone-14-pro" },
  { label: "iPhone 13 Pro Max", href: "/reservedele/iphone/iphone-13-pro-max" },
  { label: "iPhone 13", href: "/reservedele/iphone/iphone-13" },
  { label: "iPhone 12 Pro", href: "/reservedele/iphone/iphone-12-pro" },
  { label: "iPhone 12", href: "/reservedele/iphone/iphone-12" },
  { label: "iPhone 11", href: "/reservedele/iphone/iphone-11" },
  { label: "iPad 7/8/9", href: "/reservedele/ipad/ipad-7-8-9" },
];

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export const SPARE_PARTS_FAQ: SparePartFAQ[] = [
  {
    question: "Er jeres reservedele originale?",
    answer: "Vi fører både originale (OEM) og højkvalitets-aftermarket reservedele. Alle dele er testet og kvalitetskontrolleret inden afsendelse, og leveres med 36 måneders garanti.",
  },
  {
    question: "Hvor lang tid tager levering?",
    answer: "Bestillinger afgivet før kl. 16:00 på hverdage sendes samme dag. De fleste ordrer leveres inden for 1–2 hverdage med GLS eller PostNord.",
  },
  {
    question: "Kan jeg returnere en reservedel?",
    answer: "Ja, du har 14 dages fuld returret på alle reservedele, så længe delen er ubrugt og i original emballage. Kontakt os, så sender vi en returlabel.",
  },
  {
    question: "Tilbyder I montering af reservedele?",
    answer: "Ja! Vi tilbyder professionel reparation i vores værksted. Du kan sende din enhed til os eller besøge os personligt. Se vores reparationsside for mere info.",
  },
  {
    question: "Hvad hvis reservedelen ikke passer til min enhed?",
    answer: "Alle vores reservedele er modelspecifikke og testet for kompatibilitet. Hvis du er i tvivl om hvilken del du skal bruge, er du velkommen til at kontakte os — vi hjælper gerne.",
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getSparePartCategory(slug: string): SparePartCategory | null {
  return SPARE_PART_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function getSparePartModel(
  categorySlug: string,
  modelSlug: string,
): { category: SparePartCategory; model: SparePartModel } | null {
  const category = getSparePartCategory(categorySlug);
  if (!category) return null;

  const model = category.models.find((m) => m.slug === modelSlug);
  if (!model) return null;

  return { category, model };
}

export function getAllSparePartPaths(): { category: string; model: string }[] {
  return SPARE_PART_CATEGORIES.flatMap((cat) =>
    cat.models.map((model) => ({
      category: cat.slug,
      model: model.slug,
    })),
  );
}

/** Get all models across all categories (for search autocomplete) */
export function getAllModels(): (SparePartModel & { categorySlug: string; categoryLabel: string })[] {
  return SPARE_PART_CATEGORIES.flatMap((cat) =>
    cat.models.map((model) => ({
      ...model,
      categorySlug: cat.slug,
      categoryLabel: cat.label,
    })),
  );
}

/** Group models by generation for a given category */
export function getModelsByGeneration(categorySlug: string): { generation: string; models: SparePartModel[] }[] {
  const category = getSparePartCategory(categorySlug);
  if (!category) return [];

  const groups = new Map<string, SparePartModel[]>();
  for (const model of category.models) {
    const gen = model.generation ?? "Alle";
    if (!groups.has(gen)) groups.set(gen, []);
    groups.get(gen)!.push(model);
  }

  return Array.from(groups.entries()).map(([generation, models]) => ({
    generation,
    models,
  }));
}
