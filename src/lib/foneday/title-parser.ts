/**
 * TS-spejl af SQL-parserne i supabase/migrations/20261006100000_repair_part_title_match_v2.sql
 * (repair_parts_title_models / _model_match / _category / _tiers). Hold de to i takt.
 */

const BRAND_PREFIX = /^(samsung|apple|google|huawei|xiaomi|oneplus|motorola|nokia|sony|oppo|realme|honor|lg|asus|vivo) /;
const VARIANT_WORDS = new Set(["pro", "max", "mini", "plus", "ultra", "fe", "lite", "edge", "neo", "xl"]);

/** Lowercase, "+" -> " plus", ét mellemrum. Bruges på både titler og modelnavne. */
export function normalizeModelName(name: string): string {
  return (name ?? "").toLowerCase().replace(/\+/g, " plus ").replace(/\s+/g, " ").trim();
}

/** Haler efter "For ": selve halen og halen uden førende mærkenavn ("samsung galaxy s23" -> "galaxy s23"). */
export function parseTitleModels(title: string): string[] {
  const t = ` ${(title ?? "").replace(/\s+/g, " ")} `;
  const pos = t.toLowerCase().indexOf(" for ");
  if (pos < 0) return [];
  const tail = normalizeModelName(t.slice(pos + 5));
  if (!tail) return [];
  const stripped = tail.replace(BRAND_PREFIX, "");
  return stripped === tail ? [tail] : [tail, stripped];
}

/** 0 = præcis modellen, 1 = halen starter med modellen (fx "galaxy a35 5g"), null = intet match. */
export function titleModelMatch(tails: string[], modelName: string): 0 | 1 | null {
  const n = normalizeModelName(modelName);
  if (!n) return null;
  let best: 1 | null = null;
  for (const t of tails) {
    if (t === n) return 0;
    if (t.startsWith(`${n} `)) {
      const next = t.slice(n.length + 1).split(" ")[0];
      if (!VARIANT_WORDS.has(next) && !/^\(\d{4}\)$/.test(next)) best = 1;
    }
  }
  return best;
}

export type PartCategorySlug = "skaerme" | "batterier" | "bagcovers" | "opladningsstik" | "kameraer";

export function parseTitleCategory(title: string): PartCategorySlug | null {
  const t = (title ?? "").replace(/\s+/g, " ");
  const head = /^(.*?)\bFor\b/i.exec(t);
  const raw = (head ? head[1] : t).toLowerCase();
  // Chips, FPC-stik på bundkortet og flerpak ("(3 pieces)") er ikke den del, reparationen bruger.
  if (/(\bchip\b|\bfpc\b|\bpieces?\b|\bpcs\b)/.test(raw)) return null;
  const pre = raw.replace(/\([^)]*\)/g, " ");
  if (/(\bic\b|adhesive|tape|sticker|protector|tool|tester|cleaner|\bkit\b|screw|gasket|bracket|lens)/.test(pre)) return null;
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
  if (/\brefurbished\b/.test(s)) return ["refurbished", "original-pulled"];
  return ["oem-equivalent"];
}

export function parseFonedayTitle(title: string, quality: string | null = null) {
  const category = parseTitleCategory(title);
  return { models: parseTitleModels(title), category, tiers: parseTitleTiers(title, quality, category) };
}

/** "iPhone 15" matcher aldrig "iPhone 15 Pro"; "Galaxy A35" matcher "Galaxy A35 5G (SM-A356B)". */
export function titleMatchesModel(title: string, modelName: string): boolean {
  return titleModelMatch(parseTitleModels(title), modelName) !== null;
}
