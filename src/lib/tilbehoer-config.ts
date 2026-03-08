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

export type DeviceBrand = "apple" | "samsung" | "oneplus" | "huawei" | "google";

export interface TilbehoerDevice {
  slug: string;
  label: string;
  brand: DeviceBrand;
}

export const DEVICE_BRANDS: { slug: DeviceBrand; label: string }[] = [
  { slug: "apple", label: "Apple" },
  { slug: "samsung", label: "Samsung" },
  { slug: "oneplus", label: "OnePlus" },
  { slug: "huawei", label: "Huawei" },
  { slug: "google", label: "Google" },
];

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
