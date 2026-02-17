// ---------------------------------------------------------------------------
// Spare parts configuration — maps URL slugs to Shopify collections
// ---------------------------------------------------------------------------

export interface SparePartModel {
  label: string;
  slug: string;
  shopifyHandle: string;
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

// ---------------------------------------------------------------------------
// iPhone models
// ---------------------------------------------------------------------------

const IPHONE_MODELS: SparePartModel[] = [
  { label: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", shopifyHandle: "iphone-15-pro-max-reservedele" },
  { label: "iPhone 15 Pro", slug: "iphone-15-pro", shopifyHandle: "iphone-15-pro-reservedele" },
  { label: "iPhone 15 Plus", slug: "iphone-15-plus", shopifyHandle: "iphone-15-plus-reservedele" },
  { label: "iPhone 15", slug: "iphone-15", shopifyHandle: "iphone-15-reservedele" },
  { label: "iPhone 14 Pro Max", slug: "iphone-14-pro-max", shopifyHandle: "iphone-14-pro-max-reservedele" },
  { label: "iPhone 14 Pro", slug: "iphone-14-pro", shopifyHandle: "iphone-14-pro-reservedel" },
  { label: "iPhone 14 Plus", slug: "iphone-14-plus", shopifyHandle: "iphone-14-plus-reservedele" },
  { label: "iPhone 14", slug: "iphone-14", shopifyHandle: "iphone-14-reservedele" },
  { label: "iPhone 13 Pro Max", slug: "iphone-13-pro-max", shopifyHandle: "iphone-13-pro-max" },
  { label: "iPhone 13 Pro", slug: "iphone-13-pro", shopifyHandle: "iphone-13-pro-reservedele" },
  { label: "iPhone 13", slug: "iphone-13", shopifyHandle: "iphone-13-reservedele" },
  { label: "iPhone 13 Mini", slug: "iphone-13-mini", shopifyHandle: "iphone-13-mini-reservedele" },
  { label: "iPhone 12 Pro Max", slug: "iphone-12-pro-max", shopifyHandle: "iphone-12-pro-max-reservedeaee" },
  { label: "iPhone 12 Pro", slug: "iphone-12-pro", shopifyHandle: "iphone-12-pro-reservedele" },
  { label: "iPhone 12", slug: "iphone-12", shopifyHandle: "iphone-12-reservedele" },
  { label: "iPhone 12 Mini", slug: "iphone-12-mini", shopifyHandle: "iphone-12-mini-reservedele" },
  { label: "iPhone 11 Pro Max", slug: "iphone-11-pro-max", shopifyHandle: "iphone-11-pro-max-reservedele" },
  { label: "iPhone 11 Pro", slug: "iphone-11-pro", shopifyHandle: "iphone-11-pro" },
  { label: "iPhone 11", slug: "iphone-11", shopifyHandle: "iphone-11-reservedele" },
  { label: "iPhone XS Max", slug: "iphone-xs-max", shopifyHandle: "iphone-xs-max-reservedele" },
  { label: "iPhone XS", slug: "iphone-xs", shopifyHandle: "iphone-xs-reservedele" },
  { label: "iPhone XR", slug: "iphone-xr", shopifyHandle: "iphone-xr-reservedele" },
  { label: "iPhone X", slug: "iphone-x", shopifyHandle: "iphone-x-reservedele" },
  { label: "iPhone SE (2022)", slug: "iphone-se-2022", shopifyHandle: "iphone-se-2022-reservedele" },
  { label: "iPhone SE (2020)", slug: "iphone-se-2020", shopifyHandle: "iphone-se-2020-reservedele" },
  { label: "iPhone 8 Plus", slug: "iphone-8-plus", shopifyHandle: "iphone-8-plus-reservedele" },
  { label: "iPhone 8", slug: "iphone-8", shopifyHandle: "iphone-8-reservedele" },
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
