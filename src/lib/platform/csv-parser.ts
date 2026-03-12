// src/lib/platform/csv-parser.ts
// Parse and validate device CSV import files

import Papa from "papaparse";
import { deviceImportRowSchema, type DeviceImportRow } from "./device-schema";

export interface ParseResult {
  valid: DeviceImportRow[];
  errors: { row: number; message: string }[];
  totalRows: number;
}

/** Expected CSV columns (header names) */
export const CSV_COLUMNS = [
  "serial_number",
  "imei",
  "template_id",
  "grade",
  "battery_health",
  "storage",
  "color",
  "condition_notes",
  "purchase_price",
  "selling_price",
  "vat_scheme",
  "supplier_id",
  "location_id",
  "status",
] as const;

export function parseDeviceCSV(csvText: string): ParseResult {
  const { data, errors: parseErrors } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  const valid: DeviceImportRow[] = [];
  const errors: { row: number; message: string }[] = [];

  parseErrors.forEach((e) => {
    errors.push({ row: e.row ?? 0, message: e.message });
  });

  data.forEach((row, i) => {
    const rowNum = i + 2; // +2 for header row + 0-index
    const processed = { ...row };
    if (processed.purchase_price && processed.purchase_price.includes(",")) {
      processed.purchase_price = String(
        Math.round(parseFloat(processed.purchase_price.replace(",", ".")) * 100),
      );
    }
    if (processed.selling_price && processed.selling_price.includes(",")) {
      processed.selling_price = String(
        Math.round(parseFloat(processed.selling_price.replace(",", ".")) * 100),
      );
    }

    const result = deviceImportRowSchema.safeParse(processed);
    if (result.success) {
      valid.push(result.data);
    } else {
      const msgs = Object.entries(result.error.flatten().fieldErrors)
        .map(([field, errs]) => `${field}: ${(errs ?? []).join(", ")}`)
        .join("; ");
      errors.push({ row: rowNum, message: msgs });
    }
  });

  return { valid, errors, totalRows: data.length };
}
