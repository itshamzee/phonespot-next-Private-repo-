/**
 * Rene regler for kataloghåndteringen: prisvalidering, aktiveringsvagt og bulk-prisregning.
 * Ingen I/O, så både API'et og UI'ets forhåndsvisning bruger præcis samme regnestykke.
 */

export const MAX_PRICE_DKK = 99_999;

/** Hele kroner, over 0. Hjemmesiden og Ny sag viser ikke en reparation uden pris. */
export function isValidPrice(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && v <= MAX_PRICE_DKK;
}

/**
 * Må reparationen aktiveres (vises på hjemmesiden)? Kun med en gyldig pris.
 * `price` er den pris reparationen får efter ændringen (ny pris, ellers den nuværende).
 */
export function activationGuard(price: number | null | undefined): { ok: true } | { ok: false; message: string } {
  if (!isValidPrice(price ?? null)) return { ok: false, message: "Sæt en pris over 0 kr., før reparationen kan vises på hjemmesiden" };
  return { ok: true };
}

export type BulkPriceOp = { mode: "delta" | "percent"; amount: number };

export type BulkPricePreviewRow = { id: string; from: number; to: number; valid: boolean };

/** Ny pris for en række. Hele kroner, afrundet til nærmeste. */
export function applyPriceOp(price: number, op: BulkPriceOp): number {
  const next = op.mode === "percent" ? price * (1 + op.amount / 100) : price + op.amount;
  return Math.round(next);
}

export function previewBulkPrice(rows: Array<{ id: string; price_dkk: number }>, op: BulkPriceOp): BulkPricePreviewRow[] {
  return rows.map((r) => {
    const to = applyPriceOp(r.price_dkk, op);
    return { id: r.id, from: r.price_dkk, to, valid: isValidPrice(to) };
  });
}

export function bulkPriceSummary(preview: BulkPricePreviewRow[]): { changed: number; invalid: number; unchanged: number } {
  let changed = 0;
  let invalid = 0;
  let unchanged = 0;
  for (const p of preview) {
    if (!p.valid) invalid += 1;
    else if (p.to === p.from) unchanged += 1;
    else changed += 1;
  }
  return { changed, invalid, unchanged };
}

/** Url-venligt navn: "iPhone 18 Pro" -> "iphone-18-pro". */
export function slugifyModel(name: string): string {
  return name
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Første ledige slug: "iphone-18-pro", ellers "iphone-18-pro-2", ... */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let i = 2; ; i += 1) {
    const candidate = `${base}-${i}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** Første fejlbesked fra en zod-validering (beskederne er på dansk i skemaerne). */
export function firstIssue(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message || "Ugyldig forespørgsel";
}

/** "+50", "-10", "12,5" -> tal. Tomt eller ugyldigt giver null. */
export function parseAmount(input: string): number | null {
  const s = input.trim().replace(/\s/g, "").replace(",", ".").replace(/^\+/, "").replace("−", "-");
  if (s === "" || s === "-" || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Hele kroner til visning: 1299 -> "1.299 kr." */
export function formatKr(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return `${v.toLocaleString("da-DK")} kr.`;
}
