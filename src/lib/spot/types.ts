export interface SpotSku {
  id: string;
  slug: string;
  title: string;
  subcategory: string;          // always "spot-glass" for this line
  selling_price: number;        // in øre
  sale_price: number | null;    // in øre
  compatible_models: string[];  // e.g. ["iphone-13","iphone-14","iphone-15"]
  images: string[];
  variant_group: string | null;
  variant_label: string | null; // "Normal" | "Privacy" | color name | ...
  variant_sort: number;
  is_active: boolean;
}

export type SpotVariantKind = "glass" | "privacy" | "lens" | "plateau";

export const SPOT_VARIANT_DEFAULTS: Record<SpotVariantKind, { label: string; priceOere: number }> = {
  glass:   { label: "Normal",  priceOere: 19900 },
  privacy: { label: "Privacy", priceOere: 24900 },
  lens:    { label: "Lens",    priceOere: 12900 },
  plateau: { label: "Plateau", priceOere: 29900 },
};

export const PLATEAU_LAUNCH_COLORS = ["Dark Blue", "Orange", "Silver"] as const;
export type PlateauColor = typeof PLATEAU_LAUNCH_COLORS[number];
