/**
 * Devices Fiks shows as cards under a reply. No server imports: the chat
 * widget validates what the API sends with the same rules.
 */

export const MAX_FIKS_PRODUCTS = 4;

export interface FiksProduct {
  /** Product name as the site shows it. */
  name: string;
  /** https://phonespot.dk/refurbished/<slug>, with ?grade=<stand> when a stand was asked for. */
  url: string;
  image: string | null;
  /** Whole kroner, from the tool's data (the site's "fra" price or the cheapest unit that fits the request). */
  priceFrom: number;
  /** Set when the visitor asked for one stand. */
  grade?: string;
  /** "Stand B · God stand", "Fabriksny" or a short list of the stands in stock. */
  gradeLabel?: string;
  storage?: string;
  /** "Vejle", "Slagelse" or "Vejle og Slagelse" when a unit is in a store. */
  inStore?: string;
}

const SITE = "https://phonespot.dk/";

/** Only our own pages: an absolute https://phonespot.dk/ URL or a root-relative path (not "//host"). */
export function isSafeProductUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 500) return false;
  if (url.startsWith(SITE)) return true;
  return url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\");
}

/** Images go in an <img src>; only https URLs or our own paths. */
function safeImage(src: unknown): string | null {
  if (typeof src !== "string" || src.length > 1000) return null;
  if (src.startsWith("https://")) return src;
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  return null;
}

const optText = (v: unknown, max = 80): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

/** Well-formed products with a safe link, at most MAX_FIKS_PRODUCTS. Anything else is dropped. */
export function sanitizeProducts(raw: unknown): FiksProduct[] {
  if (!Array.isArray(raw)) return [];
  const out: FiksProduct[] = [];
  for (const r of raw) {
    if (out.length >= MAX_FIKS_PRODUCTS) break;
    const p = r as Partial<FiksProduct> | null;
    if (!p || typeof p !== "object") continue;
    const name = optText(p.name, 120);
    if (!name || !isSafeProductUrl(p.url)) continue;
    if (typeof p.priceFrom !== "number" || !Number.isFinite(p.priceFrom) || p.priceFrom <= 0) continue;
    const grade = optText(p.grade, 2);
    const gradeLabel = optText(p.gradeLabel);
    const storage = optText(p.storage, 40);
    const inStore = optText(p.inStore, 40);
    out.push({
      name,
      url: p.url,
      image: safeImage(p.image),
      priceFrom: p.priceFrom,
      ...(grade ? { grade } : {}),
      ...(gradeLabel ? { gradeLabel } : {}),
      ...(storage ? { storage } : {}),
      ...(inStore ? { inStore } : {}),
    });
  }
  return out;
}
