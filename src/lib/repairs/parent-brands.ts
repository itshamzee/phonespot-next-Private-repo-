/**
 * Forældermærker i reparationskataloget: iPhone, iPad, MacBook og Apple Watch
 * hører alle under "Apple" osv. Delt mellem hjemmesidens mærkevælger
 * (src/app/reparation/brand-picker.tsx) og admin-kataloget
 * (/api/admin/repair-catalog/tree), så grupperingen aldrig kan skille.
 */

/** repair_brands.slug -> forælder. Ukendte mærker er deres eget forælder (slug). */
export const PARENT_BRAND_MAP: Record<string, string> = {
  iphone: "apple",
  ipad: "apple",
  macbook: "apple",
  "apple-watch": "apple",
  samsung: "samsung",
  "google-pixel": "google",
  oneplus: "oneplus",
  huawei: "huawei",
  sony: "sony",
  xiaomi: "xiaomi",
  motorola: "motorola",
};

export const PARENT_BRAND_META: Record<string, { name: string; logo: string }> = {
  apple: { name: "Apple", logo: "/images/brands/apple.svg" },
  samsung: { name: "Samsung", logo: "/images/brands/samsung.svg" },
  google: { name: "Google", logo: "/images/brands/google.svg" },
  oneplus: { name: "OnePlus", logo: "/images/brands/oneplus.svg" },
  huawei: { name: "Huawei", logo: "/images/brands/huawei.svg" },
  sony: { name: "Sony", logo: "/images/brands/sony.svg" },
  xiaomi: { name: "Xiaomi", logo: "/images/brands/xiaomi.svg" },
  motorola: { name: "Motorola", logo: "/images/brands/motorola.svg" },
};

export const PARENT_BRAND_ORDER = [
  "apple",
  "samsung",
  "google",
  "oneplus",
  "huawei",
  "xiaomi",
  "sony",
  "motorola",
];

export function parentBrandKey(brandSlug: string): string {
  return PARENT_BRAND_MAP[brandSlug] ?? brandSlug;
}
