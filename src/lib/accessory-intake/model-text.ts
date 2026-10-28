import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";

/**
 * Normaliserer et modelnavn, så "Samsung Galaxy A32 5G", "A32" og "Galaxy A32"
 * bliver ens: små bogstaver, uden mærke-/seriepræfiks, netværk og tegn.
 */
function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/\b(samsung|galaxy|apple|for|til|case|cover)\b/g, " ")
    .replace(/\b[45]g\b|\blte\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}

const INDEX: { slug: string; keys: string[] }[] = TILBEHOER_DEVICES.map((d) => ({
  slug: d.slug,
  // "iPhone X/XS" → nøgler for både "iphonex" og "iphonexs"
  keys: d.label.split("/").map((part, i, parts) => {
    if (i === 0) return norm(part);
    const prefix = parts[0].replace(/[A-Za-z0-9]+$/, "");
    return norm(prefix + part);
  }),
}));

/**
 * Model-slugs for den tekst, AI'en læste på pakken (fx "A32 5G" eller
 * "iPhone 12/12 Pro"). Bruges, når AI'en ikke selv kunne vælge en slug.
 */
export function matchModelText(text: string): string[] {
  const parts = text.split("/").map((p) => p.trim()).filter(Boolean);
  const first = parts[0] ?? "";
  const candidates = parts.map((part, i) => {
    if (i === 0 || /[a-z]/i.test(part.replace(/pro|max|plus|mini|ultra/gi, ""))) return norm(part);
    // "12 Pro" efter "iPhone 12" → "iPhone 12 Pro"
    const prefix = first.replace(/\s*[A-Za-z]?\d+.*$/, "");
    return norm(`${prefix} ${part}`);
  });
  const out: string[] = [];
  for (const c of candidates) {
    if (!c) continue;
    const hit = INDEX.find((d) => d.keys.includes(c));
    if (hit && !out.includes(hit.slug)) out.push(hit.slug);
  }
  return out;
}
