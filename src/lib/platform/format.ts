// src/lib/platform/format.ts
// Shared formatting utilities for the platform

/** Format øre (integer cents) to DKK string, e.g. 199900 → "1.999,00 kr." */
export function formatDKK(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
  }).format(oere / 100);
}

/** Format øre to plain number string, e.g. 199900 → "1.999,00" */
export function formatPrice(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(oere / 100);
}

/** Parse a DKK input string to øre, e.g. "1999" → 199900, "1999,50" → 199950 */
export function parseDKKToOere(input: string): number | null {
  const cleaned = input.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

/** Format a date as Danish locale string */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format a date for document use (DD-MM-YYYY) */
export function formatDocumentDate(date: string | Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}
