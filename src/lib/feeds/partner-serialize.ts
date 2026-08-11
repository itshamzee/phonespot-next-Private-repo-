// Serialisation for the partner feed — kept separate from partner-data.ts so
// a partner-specific format (once their exact spec is known) can be added
// here without touching the query/grouping logic.

import type { PartnerFeedRow } from "./partner-data";

export interface PartnerFeedJson {
  generatedAt: string;
  count: number;
  rows: PartnerFeedRow[];
}

/** JSON body for the partner feed. */
export function toPartnerFeedJson(rows: PartnerFeedRow[], now: Date = new Date()): PartnerFeedJson {
  return {
    generatedAt: now.toISOString(),
    count: rows.length,
    rows,
  };
}

const CSV_COLUMNS: Array<{ key: keyof PartnerFeedRow; header: string }> = [
  { key: "variantKey", header: "variant_key" },
  { key: "barcodes", header: "barcodes" },
  { key: "gtin", header: "gtin" },
  { key: "brand", header: "brand" },
  { key: "displayName", header: "display_name" },
  { key: "category", header: "category" },
  { key: "storage", header: "storage" },
  { key: "colour", header: "colour" },
  { key: "grade", header: "grade" },
  { key: "gradeLabel", header: "grade_label" },
  { key: "productUrl", header: "product_url" },
  { key: "imageUrl", header: "image_url" },
  { key: "priceDkk", header: "price_dkk" },
  { key: "currency", header: "currency" },
  { key: "vatScheme", header: "vat_scheme" },
  { key: "quantity", header: "quantity" },
  { key: "batteryHealth", header: "battery_health" },
  { key: "conditionNotes", header: "condition_notes" },
  { key: "warrantyMonths", header: "warranty_months" },
];

/**
 * CSV with a header row. Array-valued fields (`barcodes`, `conditionNotes`)
 * join on "|". Fields are quoted per RFC 4180 when they contain a comma,
 * quote or newline; embedded quotes are doubled.
 */
export function toPartnerFeedCsv(rows: PartnerFeedRow[]): string {
  const header = CSV_COLUMNS.map((c) => c.header).join(",");
  const lines = rows.map((row) => CSV_COLUMNS.map((c) => csvCell(row[c.key])).join(","));
  return [header, ...lines].join("\r\n") + "\r\n";
}

function csvCell(value: unknown): string {
  if (value == null) return "";
  const str = Array.isArray(value) ? value.join("|") : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
