/**
 * Søgeforslag til headerens søgefelt (GET /api/search?suggest=1).
 *
 * Produkterne kommer fra samme forespørgsel og samme adapter som /soeg
 * (searchProducts + templateToProduct/skuProductToProduct), så pris og link er
 * de samme som på søgesiden. Genvejene matches deterministisk mod statiske
 * data uden ekstra forespørgsler. Svaret bygges felt for felt, så interne
 * leverandørfelter fra rækkerne aldrig kommer med.
 */
import { templateToProduct, skuProductToProduct } from "@/lib/supabase/product-adapter";
import type { ProductTemplate, SkuProduct } from "@/lib/supabase/platform-types";
import { ACCESSORY_CATEGORY_TO_SLUG } from "@/lib/tilbehoer-config";
import { sellLinkForRepairModel } from "@/lib/sell-links";
import { getIphoneSellPage } from "@/app/saelg-din-enhed/iphone/[model]/models";

export const SUGGEST_MAX_QUERY = 100;
export const SUGGEST_DEFAULT_LIMIT = 5;
export const SUGGEST_MAX_LIMIT = 8;
export const SUGGEST_MAX_SHORTCUTS = 3;

export type SuggestProduct = {
  type: "product";
  kind: "device" | "accessory";
  title: string;
  href: string;
  image: string | null;
  /** Laveste pris i øre, som på søgesidens kort; null når der ingen pris er. */
  priceOere: number | null;
};

export type SuggestShortcut = {
  type: "category" | "sell";
  label: string;
  href: string;
};

export type SuggestResponse = { products: SuggestProduct[]; shortcuts: SuggestShortcut[] };

/**
 * Trimmer, afkorter og fjerner tegn, der kan virke som jokertegn eller
 * operatorer i et PostgREST-filter (`*`, `%`, `_`, `\`). Søgningen er
 * fuldtekst, så tegnene bærer ingen betydning for resultatet.
 */
export function sanitizeSuggestQuery(raw: string | null | undefined): string {
  return (raw ?? "")
    .slice(0, SUGGEST_MAX_QUERY * 2)
    .replace(/[*%_\\]/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SUGGEST_MAX_QUERY)
    .trim();
}

export function parseSuggestLimit(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return SUGGEST_DEFAULT_LIMIT;
  return Math.min(n, SUGGEST_MAX_LIMIT);
}

// Samme linkregel som søgesiden (/soeg): enheds-SKU'er under deres kollektion,
// tilbehør under /tilbehoer/<kategori>/<slug>.
const DEVICE_COLLECTIONS: Record<string, string> = {
  iphone: "iphones", ipad: "ipads", tablet: "ipads", smartphone: "smartphones", laptop: "baerbare", smartwatch: "smartwatches",
};

function skuHref(sku: SkuProduct): string | null {
  if (!sku.slug) return null;
  const deviceCollection = DEVICE_COLLECTIONS[sku.category ?? ""];
  if (deviceCollection) return `/${deviceCollection}/${sku.slug}`;
  const category = ACCESSORY_CATEGORY_TO_SLUG[sku.subcategory ?? sku.category ?? "other"];
  return `/tilbehoer/${category ?? "andet"}/${sku.slug}`;
}

function priceToOere(amount: string | undefined): number | null {
  const value = Number.parseFloat(amount ?? "");
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}

function firstImage(images: unknown): string | null {
  return Array.isArray(images) && typeof images[0] === "string" && images[0] ? images[0] : null;
}

export function buildSuggestProducts(templates: ProductTemplate[], skuProducts: SkuProduct[], limit: number): SuggestProduct[] {
  const out: SuggestProduct[] = [];
  for (const template of templates) {
    if (out.length >= limit) break;
    if (!template.slug) continue;
    const product = templateToProduct(template);
    out.push({
      type: "product",
      kind: "device",
      title: template.display_name,
      href: `/refurbished/${template.slug}`,
      image: firstImage(template.images),
      priceOere: priceToOere(product.priceRange.minVariantPrice.amount),
    });
  }
  for (const sku of skuProducts) {
    if (out.length >= limit) break;
    const href = skuHref(sku);
    if (!href) continue;
    const product = skuProductToProduct(sku);
    out.push({
      type: "product",
      kind: DEVICE_COLLECTIONS[sku.category ?? ""] ? "device" : "accessory",
      title: sku.title,
      href,
      image: firstImage(sku.images),
      priceOere: priceToOere(product.priceRange.minVariantPrice.amount),
    });
  }
  return out;
}

// ── Genveje ──────────────────────────────────────────────────────────────
// Faste sider fra hovedmenuen. Et ord i søgningen matcher, når det er
// begyndelsen af et af nøgleordene (mindst 3 tegn) eller selv starter med et.

const CATEGORY_SHORTCUTS: { label: string; href: string; words: string[] }[] = [
  { label: "iPhones", href: "/iphones", words: ["iphone", "iphones"] },
  { label: "iPads", href: "/ipads", words: ["ipad", "ipads"] },
  { label: "Bærbare", href: "/baerbare", words: ["baerbar", "baerbare", "bærbar", "bærbare", "macbook", "laptop", "computer"] },
  { label: "Smartphones", href: "/smartphones", words: ["smartphone", "smartphones", "samsung", "galaxy", "android"] },
  { label: "Ure", href: "/smartwatches", words: ["smartwatch", "smartwatches", "watch"] },
  { label: "Beskyttelsesglas", href: "/beskyttelsesglas", words: ["beskyttelsesglas", "skærmbeskyttelse", "skaermbeskyttelse", "glas"] },
  { label: "Tilbehør", href: "/tilbehoer", words: ["tilbehør", "tilbehoer", "cover", "covers", "etui", "oplader", "kabel", "høretelefoner"] },
  { label: "Reparation", href: "/reparation", words: ["reparation", "reparer", "reparere", "skærmskift", "batteriskift"] },
  { label: "Sælg din enhed", href: "/saelg-din-enhed", words: ["sælg", "saelg", "sælge", "saelge"] },
];

const SELL_WORDS = new Set(["sælg", "saelg", "sælge", "saelge", "salg"]);

function tokens(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/iphone(\d)/g, "iphone $1")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function wordMatches(token: string, word: string): boolean {
  return token === word || (token.length >= 3 && word.startsWith(token)) || (word.length >= 4 && token.startsWith(word));
}

function prettyIphoneName(parts: string[]): string {
  const rest = parts.slice(1).map((part) => (/^(x|xr|xs|se)$/.test(part) ? part.toUpperCase() : part === "mini" ? part : part.charAt(0).toUpperCase() + part.slice(1)));
  return ["iPhone", ...rest].join(" ");
}

/** "sælg iphone 13 pro 128 gb" → Sælg iPhone 13 Pro (længste kendte model først). */
function sellShortcut(words: string[]): SuggestShortcut | null {
  const start = words.indexOf("iphone");
  if (start === -1) return null;
  const model = words.slice(start);
  for (let end = model.length; end >= 2; end -= 1) {
    const parts = model.slice(0, end);
    const slug = parts.join("-");
    const page = getIphoneSellPage(slug);
    const name = page && page.slug !== "defekt" ? page.linkLabel : prettyIphoneName(parts);
    const link = sellLinkForRepairModel("iphone", slug, name);
    if (link) return { type: "sell", label: link.label, href: link.href };
  }
  return null;
}

export function buildSuggestShortcuts(query: string): SuggestShortcut[] {
  const words = tokens(query);
  if (!words.length) return [];
  const sell = sellShortcut(words);
  const categories = CATEGORY_SHORTCUTS.filter((shortcut) => words.some((token) => shortcut.words.some((word) => wordMatches(token, word))))
    .map<SuggestShortcut>((shortcut) => ({ type: "category", label: shortcut.label, href: shortcut.href }));
  const wantsToSell = words.some((token) => SELL_WORDS.has(token));
  const ordered = wantsToSell && sell ? [sell, ...categories] : sell ? [...categories, sell] : categories;
  const seen = new Set<string>();
  return ordered.filter((shortcut) => (seen.has(shortcut.href) ? false : (seen.add(shortcut.href), true))).slice(0, SUGGEST_MAX_SHORTCUTS);
}
