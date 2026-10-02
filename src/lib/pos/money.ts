/** Parsing/formatting of kroner input for the POS UI. Amounts are integer oere everywhere else. */

/** "1.234,50", "1234,5", "1234.50" -> 123450. Returns null for empty/invalid input. */
export function parseKr(input: string): number | null {
  const trimmed = input.trim().replace(/\s/g, "");
  if (!trimmed) return null;
  // "1.234,50" (Danish thousands) -> "1234.50"; a lone "." with <=2 decimals is a decimal point.
  let normalised = trimmed;
  if (trimmed.includes(",")) normalised = trimmed.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) normalised = trimmed.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return null;
  return Math.round(parseFloat(normalised) * 100);
}

/** 123450 -> "1234,50" (no thousands separator, suitable for an input field). */
export function oereToInput(oere: number): string {
  const sign = oere < 0 ? "-" : "";
  const abs = Math.abs(oere);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}
