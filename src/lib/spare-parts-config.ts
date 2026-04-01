// ============================================================
// Spare Parts Configuration
// Pre-defined device models for quick selection in admin.
// NOT hardcoded limits — admin can add any model freely.
// ============================================================

export interface DeviceModel {
  brand: string;
  series: string;
  model: string;
  model_codes?: string[];
}

export const DEVICE_BRANDS = [
  "Apple",
  "Samsung",
  "Huawei",
  "Google",
  "OnePlus",
  "Sony",
  "Xiaomi",
  "LG",
  "Nokia",
  "Motorola",
  "Honor",
  "Oppo",
  "Realme",
  "Vivo",
] as const;

export const DEVICE_MODELS: DeviceModel[] = [
  // ── Apple — iPhone ──
  { brand: "Apple", series: "iPhone 16", model: "iPhone 16 Pro Max", model_codes: ["A3295", "A2894"] },
  { brand: "Apple", series: "iPhone 16", model: "iPhone 16 Pro", model_codes: ["A3293", "A2892"] },
  { brand: "Apple", series: "iPhone 16", model: "iPhone 16 Plus", model_codes: ["A3294", "A2893"] },
  { brand: "Apple", series: "iPhone 16", model: "iPhone 16", model_codes: ["A3292", "A2891"] },
  { brand: "Apple", series: "iPhone 15", model: "iPhone 15 Pro Max", model_codes: ["A2849", "A3105"] },
  { brand: "Apple", series: "iPhone 15", model: "iPhone 15 Pro", model_codes: ["A2848", "A3104"] },
  { brand: "Apple", series: "iPhone 15", model: "iPhone 15 Plus", model_codes: ["A2847", "A3093"] },
  { brand: "Apple", series: "iPhone 15", model: "iPhone 15", model_codes: ["A2846", "A3092"] },
  { brand: "Apple", series: "iPhone 14", model: "iPhone 14 Pro Max", model_codes: ["A2651", "A2893"] },
  { brand: "Apple", series: "iPhone 14", model: "iPhone 14 Pro", model_codes: ["A2650", "A2892"] },
  { brand: "Apple", series: "iPhone 14", model: "iPhone 14 Plus", model_codes: ["A2632", "A2886"] },
  { brand: "Apple", series: "iPhone 14", model: "iPhone 14", model_codes: ["A2649", "A2882"] },
  { brand: "Apple", series: "iPhone 13", model: "iPhone 13 Pro Max", model_codes: ["A2643", "A2484"] },
  { brand: "Apple", series: "iPhone 13", model: "iPhone 13 Pro", model_codes: ["A2638", "A2483"] },
  { brand: "Apple", series: "iPhone 13", model: "iPhone 13 Mini", model_codes: ["A2628", "A2481"] },
  { brand: "Apple", series: "iPhone 13", model: "iPhone 13", model_codes: ["A2633", "A2482"] },
  { brand: "Apple", series: "iPhone 12", model: "iPhone 12 Pro Max", model_codes: ["A2342", "A2410"] },
  { brand: "Apple", series: "iPhone 12", model: "iPhone 12 Pro", model_codes: ["A2341", "A2407"] },
  { brand: "Apple", series: "iPhone 12", model: "iPhone 12 Mini", model_codes: ["A2176", "A2398"] },
  { brand: "Apple", series: "iPhone 12", model: "iPhone 12", model_codes: ["A2172", "A2402"] },
  { brand: "Apple", series: "iPhone 11", model: "iPhone 11 Pro Max", model_codes: ["A2161", "A2220"] },
  { brand: "Apple", series: "iPhone 11", model: "iPhone 11 Pro", model_codes: ["A2160", "A2215"] },
  { brand: "Apple", series: "iPhone 11", model: "iPhone 11", model_codes: ["A2111", "A2221"] },
  { brand: "Apple", series: "iPhone X", model: "iPhone XS Max", model_codes: ["A1921", "A2101"] },
  { brand: "Apple", series: "iPhone X", model: "iPhone XS", model_codes: ["A1920", "A2097"] },
  { brand: "Apple", series: "iPhone X", model: "iPhone XR", model_codes: ["A1984", "A2105"] },
  { brand: "Apple", series: "iPhone X", model: "iPhone X", model_codes: ["A1865", "A1901"] },
  { brand: "Apple", series: "iPhone SE", model: "iPhone SE (3. gen)", model_codes: ["A2595", "A2783"] },
  { brand: "Apple", series: "iPhone SE", model: "iPhone SE (2. gen)", model_codes: ["A2275", "A2296"] },
  { brand: "Apple", series: "iPhone SE", model: "iPhone SE (1. gen)", model_codes: ["A1662", "A1723"] },
  { brand: "Apple", series: "iPhone 8", model: "iPhone 8 Plus", model_codes: ["A1864", "A1897"] },
  { brand: "Apple", series: "iPhone 8", model: "iPhone 8", model_codes: ["A1863", "A1905"] },
  { brand: "Apple", series: "iPhone 7", model: "iPhone 7 Plus", model_codes: ["A1661", "A1784"] },
  { brand: "Apple", series: "iPhone 7", model: "iPhone 7", model_codes: ["A1660", "A1778"] },
  { brand: "Apple", series: "iPhone 6s", model: "iPhone 6s Plus", model_codes: ["A1634", "A1687"] },
  { brand: "Apple", series: "iPhone 6s", model: "iPhone 6s", model_codes: ["A1633", "A1688"] },

  // ── Apple — iPad ──
  { brand: "Apple", series: "iPad Pro", model: "iPad Pro 13\" (M4)" },
  { brand: "Apple", series: "iPad Pro", model: "iPad Pro 11\" (M4)" },
  { brand: "Apple", series: "iPad Pro", model: "iPad Pro 12.9\" (6. gen)" },
  { brand: "Apple", series: "iPad Pro", model: "iPad Pro 12.9\" (5. gen)" },
  { brand: "Apple", series: "iPad Pro", model: "iPad Pro 12.9\" (4. gen)" },
  { brand: "Apple", series: "iPad Pro", model: "iPad Pro 12.9\" (3. gen)" },
  { brand: "Apple", series: "iPad Pro", model: "iPad Pro 11\" (4. gen)" },
  { brand: "Apple", series: "iPad Pro", model: "iPad Pro 11\" (3. gen)" },
  { brand: "Apple", series: "iPad Pro", model: "iPad Pro 11\" (2. gen)" },
  { brand: "Apple", series: "iPad Pro", model: "iPad Pro 11\" (1. gen)" },
  { brand: "Apple", series: "iPad Air", model: "iPad Air (M2)" },
  { brand: "Apple", series: "iPad Air", model: "iPad Air (5. gen)" },
  { brand: "Apple", series: "iPad Air", model: "iPad Air (4. gen)" },
  { brand: "Apple", series: "iPad Air", model: "iPad Air (3. gen)" },
  { brand: "Apple", series: "iPad Mini", model: "iPad Mini (6. gen)" },
  { brand: "Apple", series: "iPad Mini", model: "iPad Mini (5. gen)" },
  { brand: "Apple", series: "iPad", model: "iPad (10. gen)" },
  { brand: "Apple", series: "iPad", model: "iPad (9. gen)" },
  { brand: "Apple", series: "iPad", model: "iPad (8. gen)" },
  { brand: "Apple", series: "iPad", model: "iPad (7. gen)" },
  { brand: "Apple", series: "iPad", model: "iPad (6. gen)" },

  // ── Apple — MacBook ──
  { brand: "Apple", series: "MacBook Pro 16\"", model: "MacBook Pro 16\" (M4 Pro/Max)" },
  { brand: "Apple", series: "MacBook Pro 16\"", model: "MacBook Pro 16\" (M3 Pro/Max)" },
  { brand: "Apple", series: "MacBook Pro 16\"", model: "MacBook Pro 16\" (M2 Pro/Max)" },
  { brand: "Apple", series: "MacBook Pro 16\"", model: "MacBook Pro 16\" (M1 Pro/Max)" },
  { brand: "Apple", series: "MacBook Pro 14\"", model: "MacBook Pro 14\" (M4 Pro/Max)" },
  { brand: "Apple", series: "MacBook Pro 14\"", model: "MacBook Pro 14\" (M3 Pro/Max)" },
  { brand: "Apple", series: "MacBook Pro 14\"", model: "MacBook Pro 14\" (M2 Pro/Max)" },
  { brand: "Apple", series: "MacBook Pro 14\"", model: "MacBook Pro 14\" (M1 Pro/Max)" },
  { brand: "Apple", series: "MacBook Pro 13\"", model: "MacBook Pro 13\" (M2)" },
  { brand: "Apple", series: "MacBook Pro 13\"", model: "MacBook Pro 13\" (M1)" },
  { brand: "Apple", series: "MacBook Air 15\"", model: "MacBook Air 15\" (M4)" },
  { brand: "Apple", series: "MacBook Air 15\"", model: "MacBook Air 15\" (M3)" },
  { brand: "Apple", series: "MacBook Air 15\"", model: "MacBook Air 15\" (M2)" },
  { brand: "Apple", series: "MacBook Air 13\"", model: "MacBook Air 13\" (M4)" },
  { brand: "Apple", series: "MacBook Air 13\"", model: "MacBook Air 13\" (M3)" },
  { brand: "Apple", series: "MacBook Air 13\"", model: "MacBook Air 13\" (M2)" },
  { brand: "Apple", series: "MacBook Air 13\"", model: "MacBook Air 13\" (M1)" },

  // ── Apple — Apple Watch ──
  { brand: "Apple", series: "Apple Watch Ultra", model: "Apple Watch Ultra 2" },
  { brand: "Apple", series: "Apple Watch Ultra", model: "Apple Watch Ultra" },
  { brand: "Apple", series: "Apple Watch", model: "Apple Watch Series 10" },
  { brand: "Apple", series: "Apple Watch", model: "Apple Watch Series 9" },
  { brand: "Apple", series: "Apple Watch", model: "Apple Watch Series 8" },
  { brand: "Apple", series: "Apple Watch", model: "Apple Watch Series 7" },
  { brand: "Apple", series: "Apple Watch", model: "Apple Watch Series 6" },
  { brand: "Apple", series: "Apple Watch", model: "Apple Watch Series 5" },
  { brand: "Apple", series: "Apple Watch", model: "Apple Watch Series 4" },
  { brand: "Apple", series: "Apple Watch", model: "Apple Watch Series 3" },
  { brand: "Apple", series: "Apple Watch SE", model: "Apple Watch SE (2. gen)" },
  { brand: "Apple", series: "Apple Watch SE", model: "Apple Watch SE (1. gen)" },

  // ── Samsung — Galaxy S ──
  { brand: "Samsung", series: "Galaxy S25", model: "Galaxy S25 Ultra", model_codes: ["SM-S938"] },
  { brand: "Samsung", series: "Galaxy S25", model: "Galaxy S25+", model_codes: ["SM-S936"] },
  { brand: "Samsung", series: "Galaxy S25", model: "Galaxy S25", model_codes: ["SM-S931"] },
  { brand: "Samsung", series: "Galaxy S24", model: "Galaxy S24 Ultra", model_codes: ["SM-S928"] },
  { brand: "Samsung", series: "Galaxy S24", model: "Galaxy S24+", model_codes: ["SM-S926"] },
  { brand: "Samsung", series: "Galaxy S24", model: "Galaxy S24", model_codes: ["SM-S921"] },
  { brand: "Samsung", series: "Galaxy S24", model: "Galaxy S24 FE", model_codes: ["SM-S721"] },
  { brand: "Samsung", series: "Galaxy S23", model: "Galaxy S23 Ultra", model_codes: ["SM-S918"] },
  { brand: "Samsung", series: "Galaxy S23", model: "Galaxy S23+", model_codes: ["SM-S916"] },
  { brand: "Samsung", series: "Galaxy S23", model: "Galaxy S23", model_codes: ["SM-S911"] },
  { brand: "Samsung", series: "Galaxy S23", model: "Galaxy S23 FE", model_codes: ["SM-S711"] },
  { brand: "Samsung", series: "Galaxy S22", model: "Galaxy S22 Ultra", model_codes: ["SM-S908"] },
  { brand: "Samsung", series: "Galaxy S22", model: "Galaxy S22+", model_codes: ["SM-S906"] },
  { brand: "Samsung", series: "Galaxy S22", model: "Galaxy S22", model_codes: ["SM-S901"] },
  { brand: "Samsung", series: "Galaxy S21", model: "Galaxy S21 Ultra", model_codes: ["SM-G998"] },
  { brand: "Samsung", series: "Galaxy S21", model: "Galaxy S21+", model_codes: ["SM-G996"] },
  { brand: "Samsung", series: "Galaxy S21", model: "Galaxy S21", model_codes: ["SM-G991"] },
  { brand: "Samsung", series: "Galaxy S21", model: "Galaxy S21 FE", model_codes: ["SM-G990"] },
  { brand: "Samsung", series: "Galaxy S20", model: "Galaxy S20 Ultra", model_codes: ["SM-G988"] },
  { brand: "Samsung", series: "Galaxy S20", model: "Galaxy S20+", model_codes: ["SM-G986"] },
  { brand: "Samsung", series: "Galaxy S20", model: "Galaxy S20", model_codes: ["SM-G981"] },
  { brand: "Samsung", series: "Galaxy S20", model: "Galaxy S20 FE", model_codes: ["SM-G780"] },
  { brand: "Samsung", series: "Galaxy S10", model: "Galaxy S10+", model_codes: ["SM-G975"] },
  { brand: "Samsung", series: "Galaxy S10", model: "Galaxy S10", model_codes: ["SM-G973"] },
  { brand: "Samsung", series: "Galaxy S10", model: "Galaxy S10e", model_codes: ["SM-G970"] },
  { brand: "Samsung", series: "Galaxy S10", model: "Galaxy S10 Lite", model_codes: ["SM-G770"] },

  // ── Samsung — Galaxy A ──
  { brand: "Samsung", series: "Galaxy A5x", model: "Galaxy A55", model_codes: ["SM-A556"] },
  { brand: "Samsung", series: "Galaxy A5x", model: "Galaxy A54", model_codes: ["SM-A546"] },
  { brand: "Samsung", series: "Galaxy A5x", model: "Galaxy A53", model_codes: ["SM-A536"] },
  { brand: "Samsung", series: "Galaxy A5x", model: "Galaxy A52", model_codes: ["SM-A525"] },
  { brand: "Samsung", series: "Galaxy A5x", model: "Galaxy A52s", model_codes: ["SM-A528"] },
  { brand: "Samsung", series: "Galaxy A3x", model: "Galaxy A35", model_codes: ["SM-A356"] },
  { brand: "Samsung", series: "Galaxy A3x", model: "Galaxy A34", model_codes: ["SM-A346"] },
  { brand: "Samsung", series: "Galaxy A3x", model: "Galaxy A33", model_codes: ["SM-A336"] },
  { brand: "Samsung", series: "Galaxy A2x", model: "Galaxy A25", model_codes: ["SM-A256"] },
  { brand: "Samsung", series: "Galaxy A2x", model: "Galaxy A24", model_codes: ["SM-A245"] },
  { brand: "Samsung", series: "Galaxy A2x", model: "Galaxy A23", model_codes: ["SM-A235"] },
  { brand: "Samsung", series: "Galaxy A1x", model: "Galaxy A16", model_codes: ["SM-A166"] },
  { brand: "Samsung", series: "Galaxy A1x", model: "Galaxy A15", model_codes: ["SM-A156"] },
  { brand: "Samsung", series: "Galaxy A1x", model: "Galaxy A14", model_codes: ["SM-A145"] },
  { brand: "Samsung", series: "Galaxy A1x", model: "Galaxy A13", model_codes: ["SM-A135"] },
  { brand: "Samsung", series: "Galaxy A0x", model: "Galaxy A06", model_codes: ["SM-A065"] },
  { brand: "Samsung", series: "Galaxy A0x", model: "Galaxy A05", model_codes: ["SM-A055"] },
  { brand: "Samsung", series: "Galaxy A0x", model: "Galaxy A05s", model_codes: ["SM-A057"] },
  { brand: "Samsung", series: "Galaxy A0x", model: "Galaxy A04", model_codes: ["SM-A045"] },
  { brand: "Samsung", series: "Galaxy A0x", model: "Galaxy A03", model_codes: ["SM-A035"] },

  // ── Samsung — Galaxy Z ──
  { brand: "Samsung", series: "Galaxy Z Fold", model: "Galaxy Z Fold 6", model_codes: ["SM-F956"] },
  { brand: "Samsung", series: "Galaxy Z Fold", model: "Galaxy Z Fold 5", model_codes: ["SM-F946"] },
  { brand: "Samsung", series: "Galaxy Z Fold", model: "Galaxy Z Fold 4", model_codes: ["SM-F936"] },
  { brand: "Samsung", series: "Galaxy Z Fold", model: "Galaxy Z Fold 3", model_codes: ["SM-F926"] },
  { brand: "Samsung", series: "Galaxy Z Flip", model: "Galaxy Z Flip 6", model_codes: ["SM-F741"] },
  { brand: "Samsung", series: "Galaxy Z Flip", model: "Galaxy Z Flip 5", model_codes: ["SM-F731"] },
  { brand: "Samsung", series: "Galaxy Z Flip", model: "Galaxy Z Flip 4", model_codes: ["SM-F721"] },
  { brand: "Samsung", series: "Galaxy Z Flip", model: "Galaxy Z Flip 3", model_codes: ["SM-F711"] },

  // ── Samsung — Galaxy Tab ──
  { brand: "Samsung", series: "Galaxy Tab S10", model: "Galaxy Tab S10 Ultra", model_codes: ["SM-X928"] },
  { brand: "Samsung", series: "Galaxy Tab S10", model: "Galaxy Tab S10+", model_codes: ["SM-X826"] },
  { brand: "Samsung", series: "Galaxy Tab S10", model: "Galaxy Tab S10", model_codes: ["SM-X720"] },
  { brand: "Samsung", series: "Galaxy Tab S9", model: "Galaxy Tab S9 Ultra", model_codes: ["SM-X916"] },
  { brand: "Samsung", series: "Galaxy Tab S9", model: "Galaxy Tab S9+", model_codes: ["SM-X816"] },
  { brand: "Samsung", series: "Galaxy Tab S9", model: "Galaxy Tab S9", model_codes: ["SM-X710"] },
  { brand: "Samsung", series: "Galaxy Tab S9", model: "Galaxy Tab S9 FE", model_codes: ["SM-X510"] },
  { brand: "Samsung", series: "Galaxy Tab A", model: "Galaxy Tab A9+", model_codes: ["SM-X216"] },
  { brand: "Samsung", series: "Galaxy Tab A", model: "Galaxy Tab A9", model_codes: ["SM-X116"] },
  { brand: "Samsung", series: "Galaxy Tab A", model: "Galaxy Tab A8", model_codes: ["SM-X205"] },

  // ── Huawei ──
  { brand: "Huawei", series: "P-serien", model: "P60 Pro" },
  { brand: "Huawei", series: "P-serien", model: "P50 Pro" },
  { brand: "Huawei", series: "P-serien", model: "P40 Pro" },
  { brand: "Huawei", series: "P-serien", model: "P40" },
  { brand: "Huawei", series: "P-serien", model: "P30 Pro" },
  { brand: "Huawei", series: "P-serien", model: "P30" },
  { brand: "Huawei", series: "P-serien", model: "P30 Lite" },
  { brand: "Huawei", series: "Mate", model: "Mate 60 Pro" },
  { brand: "Huawei", series: "Mate", model: "Mate 50 Pro" },
  { brand: "Huawei", series: "Mate", model: "Mate 40 Pro" },
  { brand: "Huawei", series: "Nova", model: "Nova 12" },
  { brand: "Huawei", series: "Nova", model: "Nova 11" },
  { brand: "Huawei", series: "Nova", model: "Nova 10" },

  // ── Google ──
  { brand: "Google", series: "Pixel 9", model: "Pixel 9 Pro XL" },
  { brand: "Google", series: "Pixel 9", model: "Pixel 9 Pro" },
  { brand: "Google", series: "Pixel 9", model: "Pixel 9" },
  { brand: "Google", series: "Pixel 9", model: "Pixel 9a" },
  { brand: "Google", series: "Pixel 8", model: "Pixel 8 Pro" },
  { brand: "Google", series: "Pixel 8", model: "Pixel 8" },
  { brand: "Google", series: "Pixel 8", model: "Pixel 8a" },
  { brand: "Google", series: "Pixel 7", model: "Pixel 7 Pro" },
  { brand: "Google", series: "Pixel 7", model: "Pixel 7" },
  { brand: "Google", series: "Pixel 7", model: "Pixel 7a" },
  { brand: "Google", series: "Pixel 6", model: "Pixel 6 Pro" },
  { brand: "Google", series: "Pixel 6", model: "Pixel 6" },
  { brand: "Google", series: "Pixel 6", model: "Pixel 6a" },

  // ── OnePlus ──
  { brand: "OnePlus", series: "OnePlus", model: "OnePlus 13" },
  { brand: "OnePlus", series: "OnePlus", model: "OnePlus 12" },
  { brand: "OnePlus", series: "OnePlus", model: "OnePlus 11" },
  { brand: "OnePlus", series: "Nord", model: "OnePlus Nord 4" },
  { brand: "OnePlus", series: "Nord", model: "OnePlus Nord 3" },
  { brand: "OnePlus", series: "Nord", model: "OnePlus Nord CE 3" },

  // ── Sony ──
  { brand: "Sony", series: "Xperia", model: "Xperia 1 VI" },
  { brand: "Sony", series: "Xperia", model: "Xperia 1 V" },
  { brand: "Sony", series: "Xperia", model: "Xperia 5 V" },
  { brand: "Sony", series: "Xperia", model: "Xperia 10 VI" },

  // ── Xiaomi ──
  { brand: "Xiaomi", series: "Xiaomi", model: "Xiaomi 14 Ultra" },
  { brand: "Xiaomi", series: "Xiaomi", model: "Xiaomi 14" },
  { brand: "Xiaomi", series: "Xiaomi", model: "Xiaomi 13 Pro" },
  { brand: "Xiaomi", series: "Xiaomi", model: "Xiaomi 13" },
  { brand: "Xiaomi", series: "Redmi Note 13", model: "Redmi Note 13 Pro+" },
  { brand: "Xiaomi", series: "Redmi Note 13", model: "Redmi Note 13 Pro" },
  { brand: "Xiaomi", series: "Redmi Note 13", model: "Redmi Note 13" },
  { brand: "Xiaomi", series: "Redmi Note 12", model: "Redmi Note 12 Pro+" },
  { brand: "Xiaomi", series: "Redmi Note 12", model: "Redmi Note 12 Pro" },
  { brand: "Xiaomi", series: "Redmi Note 12", model: "Redmi Note 12" },
  { brand: "Xiaomi", series: "POCO", model: "POCO X6 Pro" },
  { brand: "Xiaomi", series: "POCO", model: "POCO X5 Pro" },
  { brand: "Xiaomi", series: "POCO", model: "POCO F5" },
];

/** Get unique brands from device models */
export function getDeviceBrands(): string[] {
  return [...new Set(DEVICE_MODELS.map((m) => m.brand))];
}

/** Get series for a brand */
export function getSeriesForBrand(brand: string): string[] {
  return [...new Set(DEVICE_MODELS.filter((m) => m.brand === brand).map((m) => m.series))];
}

/** Get models for a brand+series combo */
export function getModelsForSeries(brand: string, series: string): DeviceModel[] {
  return DEVICE_MODELS.filter((m) => m.brand === brand && m.series === series);
}

/** Slugify helper */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
