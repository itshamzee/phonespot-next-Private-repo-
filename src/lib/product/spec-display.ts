/**
 * Normalises `product_templates.specifications` — a free-form jsonb blob that
 * carries THREE incompatible key vocabularies depending on how the row was
 * created:
 *
 *   1. Danish Title-Case from insert scripts        — Model, Processor, RAM, SSD, Skærm, Farve, Grafik, OS, Vægt, Chip, Lager, Batteri
 *   2. snake_case English from the Foxway importer   — processor, ram, storage, screen_size, resolution, graphics, display_type, os
 *   3. the admin whitelist (device-spec-fields.ts)   — størrelse, connectivity, skærm, ram, processor, chip, lagertype, + arbitrary free-form pairs
 *
 * `selectDisplaySpecs` maps all of the above to a small, stable set of Danish
 * display labels for the above-the-fold spec table. Unknown keys are never
 * dropped — they pass through with their original key as the label so
 * nothing silently disappears from the page.
 */

export type DisplaySpec = { label: string; value: string };

/** Canonical display labels, in priority order for the above-the-fold table. */
const CANONICAL_ORDER = [
  "Chip",
  "Processor",
  "Grafik",
  "Hukommelse",
  "Lager",
  "Skærm",
  "Batteri",
  "Farve",
  "Styresystem",
  "Vægt",
] as const;

type CanonicalLabel = (typeof CANONICAL_ORDER)[number];

/** Lowercased/trimmed source key → canonical Danish display label. */
const KEY_TO_LABEL: Record<string, CanonicalLabel> = {
  chip: "Chip",

  processor: "Processor",
  cpu: "Processor",

  grafik: "Grafik",
  graphics: "Grafik",
  gpu: "Grafik",

  ram: "Hukommelse",
  hukommelse: "Hukommelse",
  memory: "Hukommelse",

  ssd: "Lager",
  lager: "Lager",
  storage: "Lager",
  lagertype: "Lager",

  "skærm": "Skærm",
  skaerm: "Skærm",
  screen: "Skærm",
  screen_size: "Skærm",
  display_type: "Skærm",
  "størrelse": "Skærm",

  batteri: "Batteri",
  battery: "Batteri",

  farve: "Farve",
  colour: "Farve",
  color: "Farve",

  os: "Styresystem",
  styresystem: "Styresystem",

  "vægt": "Vægt",
  vaegt: "Vægt",
  weight: "Vægt",
};

/** Keys excluded from the row list — they're rendered separately (model number). */
const MODEL_KEYS = new Set(["model"]);

const DEFAULT_LIMIT = 8;

function normaliseKey(key: string): string {
  return key.trim().toLowerCase();
}

/**
 * Selects and orders specs for the scannable above-the-fold table.
 * Never throws on null/undefined/empty input.
 */
export function selectDisplaySpecs(
  specifications: Record<string, string>,
  opts?: { limit?: number },
): DisplaySpec[] {
  if (!specifications || typeof specifications !== "object") return [];

  const limit = opts?.limit ?? DEFAULT_LIMIT;

  const known = new Map<CanonicalLabel, string>();
  const unknown: DisplaySpec[] = [];

  for (const [rawKey, rawValue] of Object.entries(specifications)) {
    if (rawValue == null || rawValue === "") continue;

    const key = normaliseKey(rawKey);
    if (MODEL_KEYS.has(key)) continue;

    const canonicalLabel = KEY_TO_LABEL[key];
    if (canonicalLabel) {
      // First value wins if a template somehow carries both vocabularies for
      // the same concept (e.g. both `RAM` and `ram`).
      if (!known.has(canonicalLabel)) known.set(canonicalLabel, String(rawValue));
    } else {
      unknown.push({ label: rawKey, value: String(rawValue) });
    }
  }

  const ordered: DisplaySpec[] = CANONICAL_ORDER.filter((label) => known.has(label)).map(
    (label) => ({ label, value: known.get(label)! }),
  );

  return [...ordered, ...unknown].slice(0, limit);
}

/**
 * Extracts a device model number (e.g. "A3241") from the `Model` spec key,
 * which on Apple products typically looks like `"A3241 (Mac16,13)"`.
 * Returns null when no model number is present.
 */
export function findModelNumber(specifications: Record<string, string> | null | undefined): string | null {
  if (!specifications || typeof specifications !== "object") return null;

  for (const [rawKey, rawValue] of Object.entries(specifications)) {
    if (normaliseKey(rawKey) !== "model") continue;
    if (!rawValue) return null;

    const match = String(rawValue).match(/\bA\d{4}[A-Z]?\b/);
    if (match) return match[0];

    // Fall back to the leading token if it doesn't look like an Apple "A####" code.
    const leading = String(rawValue).trim().split(/\s+/)[0];
    return leading || null;
  }

  return null;
}
