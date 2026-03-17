// src/lib/foneday/mapper.ts
// Maps Foneday product data to PhoneSpot internal values

import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FonedayCategoryMapRow } from "./types";

// Cache category maps in memory for the duration of a sync run
let categoryMapCache: FonedayCategoryMapRow[] | null = null;

export async function loadCategoryMaps(): Promise<FonedayCategoryMapRow[]> {
  if (categoryMapCache) return categoryMapCache;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("foneday_category_map")
    .select("*");
  if (error) throw new Error(`Failed to load category maps: ${error.message}`);
  categoryMapCache = (data ?? []) as FonedayCategoryMapRow[];
  return categoryMapCache;
}

export function clearMapCache(): void {
  categoryMapCache = null;
}

/**
 * Map a Foneday category to a PhoneSpot accessories category.
 * Returns null if the category maps to '_repair_part_' (not retail).
 */
export async function mapCategory(fonedayCategory: string | null): Promise<string | null> {
  if (!fonedayCategory) return "other";
  const maps = await loadCategoryMaps();
  const match = maps.find(
    (m) => m.map_type === "category" && m.foneday_value === fonedayCategory
  );
  if (!match) return "other";
  if (match.phonespot_value === "_repair_part_") return null;
  return match.phonespot_value;
}

/**
 * Map a Foneday quality name to a PhoneSpot quality value.
 */
export async function mapQuality(fonedayQuality: string | null): Promise<string | null> {
  if (!fonedayQuality) return null;
  const maps = await loadCategoryMaps();
  const match = maps.find(
    (m) => m.map_type === "quality" && m.foneday_value === fonedayQuality
  );
  return match?.phonespot_value ?? fonedayQuality.toLowerCase();
}

/**
 * Parse Foneday `suitable_for` into compatible_models entries
 * that match TILBEHOER_DEVICES labels.
 *
 * Examples:
 *   "For Apple iPhone 15" → ["iPhone 15"]
 *   "Samsung Galaxy S24 Ultra" → ["Galaxy S24 Ultra"]
 *   "Universal" or null → []
 */
export function parseCompatibleModels(suitableFor: string | null): string[] {
  if (!suitableFor) return [];

  // Normalize: strip "Compatible For", "For", leading brand prefixes
  let cleaned = suitableFor
    .replace(/^Compatible\s+For\s+/i, "")
    .replace(/^For\s+/i, "")
    .trim();

  // Try exact match against TILBEHOER_DEVICES labels
  const exactMatch = TILBEHOER_DEVICES.find(
    (d) => d.label.toLowerCase() === cleaned.toLowerCase()
  );
  if (exactMatch) return [exactMatch.label];

  // Try removing brand prefix (e.g. "Apple iPhone 15" → "iPhone 15")
  const brandPrefixes = ["Apple", "Samsung", "OnePlus", "Huawei", "Google", "Xiaomi", "Motorola", "Honor"];
  for (const prefix of brandPrefixes) {
    if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
      const withoutBrand = cleaned.slice(prefix.length).trim();
      const match = TILBEHOER_DEVICES.find(
        (d) => d.label.toLowerCase() === withoutBrand.toLowerCase()
      );
      if (match) return [match.label];
    }
  }

  // Try partial/contains match — find devices whose label is contained in suitableFor
  const partialMatches = TILBEHOER_DEVICES.filter((d) =>
    cleaned.toLowerCase().includes(d.label.toLowerCase())
  );
  if (partialMatches.length > 0) {
    // Return the longest match (most specific)
    partialMatches.sort((a, b) => b.label.length - a.label.length);
    return [partialMatches[0].label];
  }

  // No match — return empty (universal or unknown device)
  return [];
}

/**
 * Clean up a Foneday product title for display on PhoneSpot.
 * Removes "Compatible For" prefix and other boilerplate.
 */
export function cleanTitle(title: string): string {
  return title
    .replace(/\s*Compatible\s+For\s+/gi, " for ")
    .replace(/\s*Compatible\s+for\s+/gi, " for ")
    .replace(/^\s+/, "")
    .trim();
}
