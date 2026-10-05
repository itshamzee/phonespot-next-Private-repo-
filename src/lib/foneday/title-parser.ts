/**
 * TS-spejl af SQL-parserne i supabase/migrations/20261005190000_repair_part_costs_by_title.sql
 * (repair_parts_title_models / _category / _tiers). Hold de to i takt.
 */

const COLOR_STOP =
  "black|white|blue|red|green|gold|silver|gr[ae]y|space|pink|purple|yellow|midnight|starlight|graphite|titanium|natural|desert|orange|coral|rose|jet|refurbished|original|oem|genuine|with|without";

const MODEL_RE = new RegExp(`\\bFor\\s+(.+?)(?:\\s*\\||\\s+(?:${COLOR_STOP})\\b|\\s*$)`, "i");

/** Model-noegler i prioriteret raekkefolge: foerst med parentes, derefter uden. Lowercase. */
export function parseTitleModels(title: string): string[] {
  const t = (title ?? "").replace(/\s+/g, " ");
  const m = MODEL_RE.exec(t);
  if (!m) return [];
  const a = m[1].replace(/[\s,;-]+$/, "").trim().toLowerCase();
  if (!a) return [];
  const b = a.replace(/\s*\(.*$/, "").trim();
  return !b || b === a ? [a] : [a, b];
}

export type PartCategorySlug = "skaerme" | "batterier" | "bagcovers" | "opladningsstik" | "kameraer";

export function parseTitleCategory(title: string): PartCategorySlug | null {
  const t = (title ?? "").replace(/\s+/g, " ");
  const head = /^(.*?)\bFor\b/i.exec(t);
  const pre = (head ? head[1] : t).replace(/\([^)]*\)/g, " ").toLowerCase();
  if (/(adhesive|tape|sticker|protector|tool|tester|cleaner|\bkit\b|screw|gasket|bracket|lens)/.test(pre)) return null;
  if (/(back\s*cover|back\s*glass|rear\s*glass|battery\s*cover|battery\s*door|back\s*housing|rear\s*housing)/.test(pre)) return "bagcovers";
  if (/(charging\s*port|charge\s*port|dock\s*connector|charging\s*connector|usb\s*connector)/.test(pre)) return "opladningsstik";
  if (/\bcamera\b/.test(pre) && !/flex/.test(pre)) return "kameraer";
  if (/\b(display|lcd|screen)\b/.test(pre) && !/flex/.test(pre)) return "skaerme";
  if (/\bbattery\b/.test(pre) && !/(connector|flex|holder)/.test(pre)) return "batterier";
  return null;
}

/** Kandidat-kvalitetstrin (spare_part_quality_tiers.slug). hasHardOledTier=false giver premium-soft-oled. */
export function parseTitleTiers(
  title: string,
  quality: string | null,
  category: PartCategorySlug | null,
  hasHardOledTier = true,
): string[] {
  const s = `${title ?? ""} ${quality ?? ""}`.toLowerCase();
  if (/\bservice\s*pack\b/.test(s)) return ["service-pack"];
  if (/\bpulled\b/.test(s)) return ["original-pulled"];
  if (category === "skaerme") {
    if (/(soft\s*oled|fdx\s+ultra)/.test(s)) return ["premium-soft-oled"];
    if (/(hard\s*oled|fdx\s+pro\b)/.test(s)) return [hasHardOledTier ? "premium-hard-oled" : "premium-soft-oled"];
    if (/(in-?cell|fdx\s+(lite|prime|elite)\b|\blcd\b)/.test(s)) return ["standard-incell"];
    if (/\brefurbished\b/.test(s)) return ["refurbished", "original-pulled"];
    return [];
  }
  return ["oem-equivalent"];
}

export function parseFonedayTitle(title: string, quality: string | null = null) {
  const category = parseTitleCategory(title);
  return { models: parseTitleModels(title), category, tiers: parseTitleTiers(title, quality, category) };
}

/** Eksakt (case-insensitive) match mod modelnavn: "iPhone 15" matcher aldrig "iPhone 15 Pro". */
export function titleMatchesModel(title: string, modelName: string): boolean {
  const key = modelName.replace(/\s+/g, " ").trim().toLowerCase();
  return parseTitleModels(title).includes(key);
}
