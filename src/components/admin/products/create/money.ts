/** Parser dansk prisinput ("1.299", "1299,50", "299 kr") til øre. Tom eller ugyldig → null. */
export function parseKrToOere(value: string): number | null {
  const cleaned = value.replace(/kr\.?/i, "").replace(/\s/g, "");
  if (!cleaned) return null;
  // Dansk: punktum er tusindtal, komma er decimal. Tillad også "1299.50" fra regneark.
  const normalised =
    cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/\.(?=\d{3}(\D|$))/g, "");
  const n = Number(normalised);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function formatOere(oere: number | null | undefined): string {
  if (oere == null) return "";
  return new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", maximumFractionDigits: 0 }).format(oere / 100);
}
