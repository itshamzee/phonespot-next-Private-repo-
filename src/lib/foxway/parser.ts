import Papa from "papaparse";
import type { DeviceGrade } from "@/lib/supabase/platform-types";
import type {
  FoxwayParsedItem,
  FoxwayParseResult,
  FoxwayRawRow,
} from "./types";

// CSV column order (no header row in file)
const COLUMN_NAMES: (keyof FoxwayRawRow)[] = [
  "ITEMNO",
  "MODEL",
  "DESCIPTION",
  "ONSTOCK",
  "PRICE",
  "COND",
  "PROD",
  "ITEMGROUP",
  "WARRANTY",
  "WARRANTYDESC",
  "SW",
  "KB",
  "CATAGORY",
  "PRODID",
  "EAN",
  "BLUETOOTH",
  "RESOLUTION",
  "SCREENSIZE",
  "HDD01",
  "HDD02",
  "MEMORYTOTAL",
  "GRAPHICS01",
  "GRAPHICS02",
  "PROCESSOR",
  "OS",
  "WIRELESS",
  "DISPLAYTYPE",
  "COLOR",
  "DCCURL",
  "ETAQUANTITY",
  "ETADATE",
  "WIN11READY",
  "REMOTESTOCK",
];

const VALID_KEYBOARDS = new Set(["nordics", "dk", "no"]);

/**
 * Map Foxway condition codes to our DeviceGrade.
 * Returns null for conditions we skip (BULK, unknown).
 */
export function mapFoxwayGrade(cond: string): DeviceGrade | null {
  const upper = cond.trim().toUpperCase();
  switch (upper) {
    case "NEW":
      return "N";
    case "SILVER":
    case "GOLD":
    case "PREMIUM+":
    case "CHP-PREMIUM+":
    case "CHP-PREMIUM":
      return "P";
    case "PREMIUM":
    case "PRO":
    case "GRADE A":
    case "CHP-A":
    case "DEMO":
      return "A";
    case "CHP-B":
    case "GRADE B":
    case "BRONZE":
      return "B";
    case "GRADE C":
      return "C";
    case "BULK":
      return null;
    default:
      return null;
  }
}

/**
 * Extract CPU, RAM, and storage from a Foxway description string.
 * Example: "T14s G2 i5-1135G7/16GB/256M2/FHD/4U/F/C/W11P"
 */
export function parseSpecsFromDescription(desc: string): {
  cpu: string;
  ram: string;
  storage: string;
} {
  const cpu = desc.match(/[iIrR][3579]-\w+/)?.[0] ?? "";
  const ram = desc.match(/(\d+)GB/)?.[0] ?? "";

  let storage = "";
  const m2Match = desc.match(/(\d+)M2/);
  const ssdMatch = desc.match(/(\d+)SSD/);
  if (m2Match || ssdMatch) {
    const rawSize = parseInt((m2Match ?? ssdMatch)![1], 10);
    storage = normalizeStorageSize(rawSize);
  }

  return { cpu, ram, storage };
}

function normalizeStorageSize(sizeInGB: number): string {
  if (sizeInGB >= 1000) {
    return `${sizeInGB / 1000}TB SSD`;
  }
  return `${sizeInGB}GB SSD`;
}

function isNA(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === "" || v === "n/a";
}

function normalizeMemory(raw: string): string {
  if (isNA(raw)) return "";
  // Extract number and ensure "GB" suffix
  const match = raw.match(/(\d+)/);
  if (!match) return raw.trim();
  return `${match[1]}GB`;
}

function normalizeStorage(raw: string): string {
  if (isNA(raw)) return "";
  const trimmed = raw.trim();
  // Already has sensible format
  if (/\d+\s*(GB|TB)\s*SSD/i.test(trimmed)) return trimmed;
  // Try to extract a number
  const match = trimmed.match(/(\d+)/);
  if (!match) return trimmed;
  const size = parseInt(match[1], 10);
  return normalizeStorageSize(size);
}

function normalizeScreenSize(raw: string): string {
  // Strip extra quotes and whitespace, e.g. `14"` → `14"`
  return raw.replace(/[""]/g, '"').trim();
}

function normalizeFoxwayUrl(raw: string): string {
  if (isNA(raw)) return "";
  // Convert "EN.FOXWAY.DK/ITEM/XXX" → "https://en.foxway.dk/item/XXX"
  return `https://${raw.trim().toLowerCase()}`;
}

function rowToRaw(values: string[]): FoxwayRawRow {
  const row = {} as Record<string, string>;
  for (let i = 0; i < COLUMN_NAMES.length; i++) {
    row[COLUMN_NAMES[i]] = (values[i] ?? "").trim();
  }
  return row as unknown as FoxwayRawRow;
}

/**
 * Parse a full Foxway CSV text into filtered, normalized laptop items.
 */
export function parseFoxwayCSV(csvText: string): FoxwayParseResult {
  const parsed = Papa.parse<string[]>(csvText, {
    delimiter: ";",
    header: false,
    skipEmptyLines: true,
  });

  const items: FoxwayParsedItem[] = [];
  const errors: { row: number; reason: string }[] = [];
  let skipped = 0;
  const totalRows = parsed.data.length;

  for (let i = 0; i < parsed.data.length; i++) {
    const values = parsed.data[i];
    if (!values || values.length < COLUMN_NAMES.length) {
      errors.push({ row: i + 1, reason: "Incomplete row" });
      continue;
    }

    const raw = rowToRaw(values);

    // Filter: NOTEBOOK only
    if (raw.ITEMGROUP.toUpperCase() !== "NOTEBOOK") {
      skipped++;
      continue;
    }

    // Filter: Nordic keyboards
    if (!VALID_KEYBOARDS.has(raw.KB.trim().toLowerCase())) {
      skipped++;
      continue;
    }

    // Filter: Must be in stock
    const stock = parseInt(raw.ONSTOCK, 10);
    if (isNaN(stock) || stock <= 0) {
      skipped++;
      continue;
    }

    // Filter: Must have valid price
    const price = parseInt(raw.PRICE, 10);
    if (isNaN(price) || price <= 0) {
      skipped++;
      continue;
    }

    // Filter: Grade mapping (skip BULK and unknown)
    const grade = mapFoxwayGrade(raw.COND);
    if (!grade) {
      skipped++;
      continue;
    }

    // Filter: No remote stock
    const remoteStock = raw.REMOTESTOCK.trim().toLowerCase();
    if (remoteStock !== "" && remoteStock !== "n/a") {
      skipped++;
      continue;
    }

    // Parse specs from description as fallback
    const descSpecs = parseSpecsFromDescription(raw.DESCIPTION);

    const processor = isNA(raw.PROCESSOR) ? descSpecs.cpu : raw.PROCESSOR.trim();
    const ram = isNA(raw.MEMORYTOTAL)
      ? descSpecs.ram
      : normalizeMemory(raw.MEMORYTOTAL);
    const storage = isNA(raw.HDD01)
      ? descSpecs.storage
      : normalizeStorage(raw.HDD01);

    const item: FoxwayParsedItem = {
      sourceSku: raw.ITEMNO,
      model: raw.MODEL,
      brand: raw.PROD,
      description: raw.DESCIPTION,
      stock,
      buyPrice: price * 100, // DKK to ore
      grade,
      processor,
      ram,
      storage,
      screenSize: normalizeScreenSize(raw.SCREENSIZE),
      resolution: isNA(raw.RESOLUTION) ? "" : raw.RESOLUTION.trim(),
      graphics: isNA(raw.GRAPHICS01) ? "" : raw.GRAPHICS01.trim(),
      color: isNA(raw.COLOR) ? "Sort" : raw.COLOR.trim(),
      os: isNA(raw.OS) ? "" : raw.OS.trim(),
      displayType: isNA(raw.DISPLAYTYPE) ? "" : raw.DISPLAYTYPE.trim(),
      ean: isNA(raw.EAN) ? "" : raw.EAN.trim(),
      warranty: isNA(raw.WARRANTY) ? "" : raw.WARRANTY.trim(),
      foxwayUrl: normalizeFoxwayUrl(raw.DCCURL),
    };

    items.push(item);
  }

  return { items, skipped, errors, totalRows };
}
