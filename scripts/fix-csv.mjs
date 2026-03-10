#!/usr/bin/env node
/**
 * Fix Shopify product CSV export:
 *   1. Fix vendor names (Apple - Iphone → Apple, etc.)
 *   2. Add compare-at prices where missing
 *   3. Add ean:/mpn: tags for known models
 *   4. Add "refurbished" tag to phones/tablets/watches
 *   5. Fix product type
 *
 * Usage:
 *   node scripts/fix-csv.mjs <input.csv> [output.csv]
 */

import { readFileSync, writeFileSync } from "fs";
import { parse } from "path";

const inputPath = process.argv[2];
const outputPath = process.argv[3] || inputPath.replace(".csv", "_fixed.csv");

if (!inputPath) {
  console.error("\n  Usage: node scripts/fix-csv.mjs <input.csv> [output.csv]\n");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Model lookup: title keyword → { ean, mpn, vendor, type }
// ---------------------------------------------------------------------------

const MODEL_DATA = {
  "iphone 14 pro max": { ean: "194253401377", mpn: "MQ9T3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 14 pro": { ean: "194253401155", mpn: "MQ1E3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 14 plus": { ean: "194253374770", mpn: "MQ4D3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 14": { ean: "194253374503", mpn: "MPUF3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 13 pro max": { ean: "194252698822", mpn: "MLKN3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 13 pro": { ean: "194252698563", mpn: "MLVF3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 13 mini": { ean: "194252697276", mpn: "MLK53DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 13": { ean: "194252697009", mpn: "MLPF3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 12 pro max": { ean: "194252021972", mpn: "MGDA3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 12 pro": { ean: "194252021521", mpn: "MGMN3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 12 mini": { ean: "194252015537", mpn: "MGDX3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 12": { ean: "194252031001", mpn: "MGJ53DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 11 pro max": { ean: "190199380356", mpn: "MWHK2DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 11 pro": { ean: "190199380080", mpn: "MWC22DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 11": { ean: "190199220218", mpn: "MHDH3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone xs max": { ean: "190198783066", mpn: "MT502DH/A", vendor: "Apple", type: "iPhone" },
  "iphone xs": { ean: "190198791030", mpn: "MT9E2DH/A", vendor: "Apple", type: "iPhone" },
  "iphone x": { ean: "190198457684", mpn: "MQAC2DH/A", vendor: "Apple", type: "iPhone" },
  "iphone xr": { ean: "190198776433", mpn: "MRY42DH/A", vendor: "Apple", type: "iPhone" },
  "iphone se 2022": { ean: "194253013150", mpn: "MMXL3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone se 2020": { ean: "190199505117", mpn: "MX9R2DH/A", vendor: "Apple", type: "iPhone" },
  "ipad 7": { ean: "190199602038", mpn: "MW742DH/A", vendor: "Apple", type: "iPad" },
  "ipad 8": { ean: "190199741386", mpn: "MYMH2DH/A", vendor: "Apple", type: "iPad" },
  "ipad 6": { ean: "190198647313", mpn: "MR7J2DH/A", vendor: "Apple", type: "iPad" },
  "ipad air 2": { ean: "888462068758", mpn: "MGTX2DH/A", vendor: "Apple", type: "iPad" },
  "ipad pro": { ean: "190198470874", mpn: "MPDY2DH/A", vendor: "Apple", type: "iPad" },
  "airpods 3": { ean: "194252818527", mpn: "MME73DH/A", vendor: "Apple", type: "AirPods" },
  "galaxy a40": { ean: "8801643698645", mpn: "SM-A405FZKDXEF", vendor: "Samsung", type: "Smartphone" },
  "oneplus 10t": { ean: "6921815621577", mpn: "5011102071", vendor: "OnePlus", type: "Smartphone" },
  "huawei p40 lite": { ean: "6901443375776", mpn: "JNY-LX1", vendor: "Huawei", type: "Smartphone" },
  "redmi note 13 pro": { ean: "6941812762257", mpn: "MZB0G7HEU", vendor: "Xiaomi", type: "Smartphone" },
  "motorola moto g04": { ean: "0840023254383", mpn: "PB130007SE", vendor: "Motorola", type: "Smartphone" },
  "thinkpad t490s": { ean: "0193386072683", mpn: "20NX003NUS", vendor: "Lenovo", type: "Bærbar" },
  "thinkpad x1 carbon": { ean: "0195235784938", mpn: "21CB00BPUS", vendor: "Lenovo", type: "Bærbar" },
  "thinkpad x285": { ean: "0192940958777", mpn: "20NF0011US", vendor: "Lenovo", type: "Bærbar" },
  "thinkpad a285": { ean: "0192940958770", mpn: "20MW000JUS", vendor: "Lenovo", type: "Bærbar" },
  "thinkpad x13": { ean: "0197532216389", mpn: "21LSCTO1WW", vendor: "Lenovo", type: "Bærbar" },
  "thinkpad t14": { ean: "0196802483292", mpn: "21HDCTO1WW", vendor: "Lenovo", type: "Bærbar" },
};

function findModelData(title) {
  const t = title.toLowerCase();
  const keys = Object.keys(MODEL_DATA).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (t.includes(key)) return MODEL_DATA[key];
  }
  return null;
}

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields with commas and newlines)
// ---------------------------------------------------------------------------

function parseCSV(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current);
        current = "";
      } else if (char === "\n" || (char === "\r" && next === "\n")) {
        row.push(current);
        current = "";
        rows.push(row);
        row = [];
        if (char === "\r") i++; // skip \n after \r
      } else {
        current += char;
      }
    }
  }

  // Last field/row
  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function escapeCSV(val) {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("\n  PhoneSpot CSV Fixer");
console.log("  ===================\n");

const raw = readFileSync(inputPath, "utf-8");
const rows = parseCSV(raw);
const headers = rows[0];
const dataRows = rows.slice(1);

// Find column indices
const col = {};
for (const name of [
  "Handle", "Title", "Vendor", "Type", "Tags", "Published",
  "Variant Price", "Variant Compare At Price", "Variant Barcode",
  "Variant SKU", "Google Shopping / MPN", "Google Shopping / Condition",
  "SEO Title", "SEO Description",
]) {
  col[name] = headers.indexOf(name);
}

console.log(`  Input:    ${inputPath}`);
console.log(`  Rows:     ${dataRows.length}`);
console.log(`  Columns:  ${headers.length}\n`);

let vendorFixes = 0;
let compareAtFixes = 0;
let tagFixes = 0;
let typeFixes = 0;
let barcodeFixes = 0;
let conditionFixes = 0;

// Group rows by handle to find highest price per product
const handleGroups = new Map();
for (const row of dataRows) {
  const handle = row[col["Handle"]];
  if (!handleGroups.has(handle)) handleGroups.set(handle, []);
  handleGroups.get(handle).push(row);
}

// Process each product group
for (const [handle, productRows] of handleGroups) {
  const firstRow = productRows[0];
  const title = firstRow[col["Title"]] || "";
  const model = findModelData(title);

  // Find highest variant price for compare-at calculation
  const prices = productRows
    .map((r) => parseFloat(r[col["Variant Price"]]) || 0)
    .filter((p) => p > 0);
  const highestPrice = Math.max(...prices, 0);
  const compareAtBase = Math.round(highestPrice * 1.5);

  for (let i = 0; i < productRows.length; i++) {
    const row = productRows[i];
    const isFirstRow = i === 0;

    // Only fix product-level fields on first row
    if (isFirstRow) {
      // 1. Fix vendor
      const currentVendor = row[col["Vendor"]];
      if (model?.vendor && currentVendor !== model.vendor) {
        row[col["Vendor"]] = model.vendor;
        vendorFixes++;
      } else if (currentVendor.toLowerCase().includes("apple") && currentVendor !== "Apple") {
        row[col["Vendor"]] = "Apple";
        vendorFixes++;
      }

      // 2. Fix product type
      if (model?.type && row[col["Type"]] !== model.type) {
        row[col["Type"]] = model.type;
        typeFixes++;
      }

      // 3. Add tags
      let tags = row[col["Tags"]] || "";
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      let tagsChanged = false;

      if (model?.ean && !tagList.some((t) => t.startsWith("ean:"))) {
        tagList.push(`ean:${model.ean}`);
        tagsChanged = true;
      }
      if (model?.mpn && !tagList.some((t) => t.startsWith("mpn:"))) {
        tagList.push(`mpn:${model.mpn}`);
        tagsChanged = true;
      }

      // Add "refurbished" tag to devices (not accessories)
      const isDevice = title.toLowerCase().match(/iphone|ipad|galaxy|oneplus|huawei|xiaomi|motorola|thinkpad|airpods/);
      if (isDevice && !tagList.some((t) => t.toLowerCase() === "refurbished")) {
        tagList.push("refurbished");
        tagsChanged = true;
      }

      if (tagsChanged) {
        row[col["Tags"]] = tagList.join(", ");
        tagFixes++;
      }

      // 4. Set Google Shopping condition
      if (isDevice && col["Google Shopping / Condition"] >= 0) {
        row[col["Google Shopping / Condition"]] = "refurbished";
        conditionFixes++;
      }

      // 5. Set Google Shopping MPN
      if (model?.mpn && col["Google Shopping / MPN"] >= 0 && !row[col["Google Shopping / MPN"]]) {
        row[col["Google Shopping / MPN"]] = model.mpn;
      }
    }

    // 6. Add compare-at price (all variant rows)
    const currentCompareAt = row[col["Variant Compare At Price"]];
    const currentPrice = parseFloat(row[col["Variant Price"]]) || 0;
    if (!currentCompareAt && currentPrice > 0 && compareAtBase > currentPrice) {
      row[col["Variant Compare At Price"]] = compareAtBase.toFixed(2);
      compareAtFixes++;
    }

    // 7. Add barcode (EAN) to variants
    if (model?.ean && !row[col["Variant Barcode"]]) {
      row[col["Variant Barcode"]] = model.ean;
      barcodeFixes++;
    }
  }
}

// Write output
const outputRows = [headers, ...dataRows];
const csv = outputRows.map((row) => row.map(escapeCSV).join(",")).join("\n");
writeFileSync(outputPath, csv, "utf-8");

console.log("  Fixes applied:");
console.log(`    Vendor fixes:       ${vendorFixes}`);
console.log(`    Compare-at prices:  ${compareAtFixes}`);
console.log(`    Tag additions:      ${tagFixes}`);
console.log(`    Type fixes:         ${typeFixes}`);
console.log(`    Barcode additions:  ${barcodeFixes}`);
console.log(`    Condition flags:    ${conditionFixes}`);
console.log(`\n  Output: ${outputPath}`);
console.log(`\n  Import in Shopify Admin → Products → Import → "Overwrite existing products"\n`);
