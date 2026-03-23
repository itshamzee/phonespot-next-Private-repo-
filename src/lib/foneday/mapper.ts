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
 * Infer product attributes from Foneday category and title.
 * Returns JSONB-compatible attributes object with case_type, protector_type,
 * connector_type, charger_type, audio_type when detectable.
 */
export function inferAttributes(
  fonedayCategory: string | null,
  title: string,
): Record<string, string> {
  const attrs: Record<string, string> = {};

  if (!fonedayCategory) return attrs;

  const cat = fonedayCategory.toLowerCase();
  const titleLower = title.toLowerCase();

  // Case type detection from Foneday category
  if (cat === "booktypes case" || cat.includes("book")) {
    attrs.case_type = "Book";
  } else if (cat === "softcase" || cat.includes("soft")) {
    attrs.case_type = "Slim";
  } else if (cat === "hardcase" || cat.includes("hard")) {
    attrs.case_type = "Rugged";
  } else if (cat === "bumper") {
    attrs.case_type = "Bumper";
  } else if (cat === "flipcase" || cat.includes("flip")) {
    attrs.case_type = "Flip";
  } else if (cat === "back cover") {
    attrs.case_type = "Slim";
  } else if (cat === "case") {
    // Generic "Case" — try to detect from title
    if (titleLower.includes("wallet")) attrs.case_type = "Wallet";
    else if (titleLower.includes("book")) attrs.case_type = "Book";
    else if (titleLower.includes("clear") || titleLower.includes("transparent")) attrs.case_type = "Clear";
    else if (titleLower.includes("rugged") || titleLower.includes("armor") || titleLower.includes("tough")) attrs.case_type = "Rugged";
    else if (titleLower.includes("flip")) attrs.case_type = "Flip";
    else if (titleLower.includes("bumper")) attrs.case_type = "Bumper";
    else if (titleLower.includes("slim") || titleLower.includes("thin") || titleLower.includes("ultra")) attrs.case_type = "Slim";
  }

  // Screen protector type detection
  if (cat === "tempered glass" || cat.includes("tempered")) {
    attrs.protector_type = "H\u00E6rdet glas";
  } else if (cat === "screen protector") {
    if (titleLower.includes("privacy")) attrs.protector_type = "Privacy";
    else if (titleLower.includes("edge to edge") || titleLower.includes("edge-to-edge")) attrs.protector_type = "Edge to Edge";
    else if (titleLower.includes("film") || titleLower.includes("folie")) attrs.protector_type = "Film";
    else attrs.protector_type = "H\u00E6rdet glas";
  } else if (cat === "edge to edge") {
    attrs.protector_type = "Edge to Edge";
  }

  // Cable connector type detection
  if (cat === "cables" || cat === "cable") {
    if (titleLower.includes("usb-c") || titleLower.includes("usb c")) {
      if (titleLower.includes("lightning")) attrs.connector_type = "USB-C til Lightning";
      else attrs.connector_type = "USB-C";
    } else if (titleLower.includes("lightning")) {
      attrs.connector_type = "Lightning";
    } else if (titleLower.includes("micro")) {
      attrs.connector_type = "Micro-USB";
    }
  }

  // Charger type detection
  if (cat.includes("charger") || cat === "wireless charger") {
    if (cat.includes("wireless") || cat.includes("tr\u00E5dl\u00F8s") || titleLower.includes("wireless") || titleLower.includes("qi")) {
      attrs.charger_type = "Tr\u00E5dl\u00F8s";
    } else if (cat.includes("car") || titleLower.includes("car") || titleLower.includes("bil")) {
      attrs.charger_type = "Biloplader";
    } else if (cat.includes("magsafe") || titleLower.includes("magsafe")) {
      attrs.charger_type = "MagSafe";
    } else {
      attrs.charger_type = "V\u00E6goplader";
    }
  }

  // Audio type detection
  if (cat === "audio" || cat === "headset" || cat === "speaker" || cat === "earbuds") {
    if (cat === "earbuds" || titleLower.includes("earbuds") || titleLower.includes("in-ear")) {
      attrs.audio_type = "In-ear";
    } else if (cat === "headset" || titleLower.includes("headset") || titleLower.includes("over-ear")) {
      attrs.audio_type = "Over-ear";
    } else if (cat === "speaker" || titleLower.includes("speaker") || titleLower.includes("h\u00F8jttaler")) {
      attrs.audio_type = "H\u00F8jttaler";
    }
  }

  return attrs;
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
