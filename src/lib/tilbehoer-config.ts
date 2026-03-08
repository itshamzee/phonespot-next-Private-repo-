// src/lib/tilbehoer-config.ts

// ---------------------------------------------------------------------------
// Tilbehør route configuration — single source of truth
// ---------------------------------------------------------------------------

export interface TilbehoerCategory {
  slug: string;
  label: string;
  shopifyHandle: string;
  description: string;
}

export interface TilbehoerDevice {
  slug: string;
  label: string;
  brand: "apple" | "samsung";
}

export interface TilbehoerRoute {
  category: string;
  device?: string;
  shopifyHandle: string;
  categoryLabel: string;
  deviceLabel?: string;
  brand?: string;
}

export const TILBEHOER_CATEGORIES: TilbehoerCategory[] = [
  {
    slug: "covers",
    label: "Covers & Cases",
    shopifyHandle: "covers-1",
    description: "Beskyt din enhed med stilfulde covers og cases.",
  },
  {
    slug: "skaermbeskyttelse",
    label: "Skærmbeskyttelse",
    shopifyHandle: "tilbehor",
    description: "Panserglas og screen protectors til alle enheder.",
  },
  {
    slug: "opladere",
    label: "Kabler & Opladere",
    shopifyHandle: "opladere",
    description: "Lightning, USB-C, trådløs opladning og kabler.",
  },
  {
    slug: "lyd",
    label: "Lyd & Høretelefoner",
    shopifyHandle: "lyd",
    description: "Earbuds, headsets og højttalere til alle enheder.",
  },
  {
    slug: "outlet",
    label: "Outlet",
    shopifyHandle: "restsalg",
    description: "Ekstra skarpe priser på udvalgte tilbehør. Begrænset antal.",
  },
];

export const TILBEHOER_DEVICES: TilbehoerDevice[] = [
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
  { slug: "ipad-pro-13", label: "iPad Pro 13\"", brand: "apple" },
  { slug: "ipad-air-m2", label: "iPad Air M2", brand: "apple" },
  { slug: "ipad-10", label: "iPad 10. gen", brand: "apple" },
  { slug: "samsung-s25-ultra", label: "Samsung S25 Ultra", brand: "samsung" },
  { slug: "samsung-s25", label: "Samsung S25", brand: "samsung" },
  { slug: "samsung-s24-ultra", label: "Samsung S24 Ultra", brand: "samsung" },
  { slug: "samsung-s24", label: "Samsung S24", brand: "samsung" },
  { slug: "samsung-s23", label: "Samsung S23", brand: "samsung" },
  { slug: "samsung-a55", label: "Samsung A55", brand: "samsung" },
  { slug: "samsung-a54", label: "Samsung A54", brand: "samsung" },
];

export const TILBEHOER_ROUTES: TilbehoerRoute[] = [
  ...TILBEHOER_CATEGORIES.map((cat) => ({
    category: cat.slug,
    shopifyHandle: cat.shopifyHandle,
    categoryLabel: cat.label,
  })),
  ...TILBEHOER_DEVICES.map((device) => ({
    category: "covers",
    device: device.slug,
    shopifyHandle: `${device.slug}-covers`,
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

export function getDevicesByBrand(brand: "apple" | "samsung"): TilbehoerDevice[] {
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
