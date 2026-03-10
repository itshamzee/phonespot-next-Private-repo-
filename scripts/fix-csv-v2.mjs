#!/usr/bin/env node
/**
 * Fix Shopify product CSV export using proper CSV parsing.
 *
 * Usage:
 *   node scripts/fix-csv-v2.mjs <input.csv> [output.csv]
 */

import { readFileSync, writeFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const inputPath = process.argv[2];
const outputPath = process.argv[3] || inputPath.replace(".csv", "_fixed.csv");

if (!inputPath) {
  console.error("\n  Usage: node scripts/fix-csv-v2.mjs <input.csv> [output.csv]\n");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Model lookup
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
// Main
// ---------------------------------------------------------------------------

console.log("\n  PhoneSpot CSV Fixer v2");
console.log("  ======================\n");

const raw = readFileSync(inputPath, "utf-8");
const records = parse(raw, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  bom: true,
});

console.log(`  Input:    ${inputPath}`);
console.log(`  Records:  ${records.length}\n`);

let vendorFixes = 0;
let compareAtFixes = 0;
let tagFixes = 0;
let typeFixes = 0;
let barcodeFixes = 0;
let conditionFixes = 0;
let optionFixes = 0;

// Group records by handle
const handleGroups = new Map();
for (const rec of records) {
  const handle = rec["Handle"];
  if (!handleGroups.has(handle)) handleGroups.set(handle, []);
  handleGroups.get(handle).push(rec);
}

for (const [handle, productRows] of handleGroups) {
  const firstRow = productRows[0];
  const title = firstRow["Title"] || "";
  const model = findModelData(title);

  // Find highest variant price for compare-at calculation
  const prices = productRows
    .map((r) => parseFloat(r["Variant Price"]) || 0)
    .filter((p) => p > 0);
  const highestPrice = Math.max(...prices, 0);
  const compareAtBase = Math.round(highestPrice * 1.5);

  // Fix missing option values: image-only rows need option values from first row
  const opt1Name = firstRow["Option1 Name"] || "";
  const opt1Value = firstRow["Option1 Value"] || "";
  const opt2Name = firstRow["Option2 Name"] || "";
  const opt2Value = firstRow["Option2 Value"] || "";
  const opt3Name = firstRow["Option3 Name"] || "";
  const opt3Value = firstRow["Option3 Value"] || "";

  for (let i = 0; i < productRows.length; i++) {
    const row = productRows[i];
    const isFirstRow = i === 0;

    // Fill in missing fields on non-first rows (image rows, etc.)
    if (!isFirstRow) {
      let fixed = false;
      if (opt1Name && !row["Option1 Value"]) {
        row["Option1 Value"] = opt1Value;
        fixed = true;
      }
      if (opt2Name && !row["Option2 Value"]) {
        row["Option2 Value"] = opt2Value;
        fixed = true;
      }
      if (opt3Name && !row["Option3 Value"]) {
        row["Option3 Value"] = opt3Value;
        fixed = true;
      }
      // Fill required variant fields from first row
      if (!row["Variant Fulfillment Service"]) {
        row["Variant Fulfillment Service"] = firstRow["Variant Fulfillment Service"] || "manual";
        fixed = true;
      }
      if (!row["Variant Inventory Policy"]) {
        row["Variant Inventory Policy"] = firstRow["Variant Inventory Policy"] || "deny";
        fixed = true;
      }
      if (fixed) optionFixes++;
    }

    if (isFirstRow) {
      // 1. Fix vendor
      const currentVendor = row["Vendor"] || "";
      if (model?.vendor && currentVendor !== model.vendor) {
        row["Vendor"] = model.vendor;
        vendorFixes++;
      } else if (currentVendor.toLowerCase().includes("apple") && currentVendor !== "Apple") {
        row["Vendor"] = "Apple";
        vendorFixes++;
      }

      // 2. Fix product type
      if (model?.type && row["Type"] !== model.type) {
        row["Type"] = model.type;
        typeFixes++;
      }

      // 3. Add tags
      const tags = row["Tags"] || "";
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

      const isDevice = title.toLowerCase().match(/iphone|ipad|galaxy|oneplus|huawei|xiaomi|motorola|thinkpad|airpods/);
      if (isDevice && !tagList.some((t) => t.toLowerCase() === "refurbished")) {
        tagList.push("refurbished");
        tagsChanged = true;
      }

      if (tagsChanged) {
        row["Tags"] = tagList.join(", ");
        tagFixes++;
      }

      // 4. Google Shopping condition
      if (isDevice && "Google Shopping / Condition" in row) {
        row["Google Shopping / Condition"] = "refurbished";
        conditionFixes++;
      }

      // 5. Google Shopping MPN
      if (model?.mpn && "Google Shopping / MPN" in row && !row["Google Shopping / MPN"]) {
        row["Google Shopping / MPN"] = model.mpn;
      }
    }

    // 6. Compare-at price (all rows)
    const currentCompareAt = row["Variant Compare At Price"];
    const currentPrice = parseFloat(row["Variant Price"]) || 0;
    if (!currentCompareAt && currentPrice > 0 && compareAtBase > currentPrice) {
      row["Variant Compare At Price"] = compareAtBase.toFixed(2);
      compareAtFixes++;
    }

    // 7. Barcode
    if (model?.ean && !row["Variant Barcode"]) {
      row["Variant Barcode"] = model.ean;
      barcodeFixes++;
    }
  }
}

// Write output using csv-stringify to ensure correct format
const columns = Object.keys(records[0]);
const output = stringify(records, {
  header: true,
  columns,
  quoted_string: true,
});

writeFileSync(outputPath, output, "utf-8");

console.log("  Fixes applied:");
console.log(`    Vendor fixes:       ${vendorFixes}`);
console.log(`    Compare-at prices:  ${compareAtFixes}`);
console.log(`    Tag additions:      ${tagFixes}`);
console.log(`    Type fixes:         ${typeFixes}`);
console.log(`    Barcode additions:  ${barcodeFixes}`);
console.log(`    Condition flags:    ${conditionFixes}`);
console.log(`    Option value fixes: ${optionFixes}`);
console.log(`\n  Output: ${outputPath}`);
console.log(`\n  Import in Shopify Admin → Products → Import → "Overwrite existing products"\n`);
