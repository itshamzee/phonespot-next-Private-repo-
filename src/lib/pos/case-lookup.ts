/**
 * Pure helpers for finding a repair case from what the cashier types or scans
 * in the Kasse search field. No server imports: used by the UI and the API.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CaseQuery =
  | { kind: "id"; value: string }
  /** Full case number as printed, e.g. PS-2026-0123 (also the QR/barcode content). */
  | { kind: "number"; value: string }
  /** Just the running number, e.g. "123" or "#1189": matches PS-<any year>-0123. */
  | { kind: "digits"; value: string };

/** Null when the text cannot be a case reference (so it is a product search instead). */
export function parseCaseQuery(raw: string): CaseQuery | null {
  const q = raw.trim().replace(/^#/, "").replace(/^sag\s*/i, "").trim();
  if (!q) return null;
  if (UUID.test(q)) return { kind: "id", value: q.toLowerCase() };
  const m = /^PS-(\d{4})-(\d{1,6})$/i.exec(q);
  if (m) return { kind: "number", value: `PS-${m[1]}-${m[2].padStart(4, "0")}` };
  return null;
}

/**
 * "#1189" or "sag 1189" is unambiguous as a case reference; a bare number is not
 * (it may be an EAN fragment), so it only counts when written with # or "sag".
 */
export function parseCaseDigits(raw: string): CaseQuery | null {
  const m = /^(?:#|sag\s*#?\s*)(\d{1,6})$/i.exec(raw.trim());
  if (!m) return null;
  return { kind: "digits", value: m[1].padStart(4, "0") };
}

/** Parses either form; the cashier typing "PS-2026-0123", "#1189" or scanning the case label. */
export function parseCaseReference(raw: string): CaseQuery | null {
  return parseCaseQuery(raw) ?? parseCaseDigits(raw);
}
