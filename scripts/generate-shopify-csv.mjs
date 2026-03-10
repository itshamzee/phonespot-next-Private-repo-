#!/usr/bin/env node
/**
 * Generate Shopify product import CSV for Apple Watches.
 *
 * Usage:
 *   node scripts/generate-shopify-csv.mjs
 *
 * Output:
 *   scripts/apple-watches-import.csv
 *
 * Then import in Shopify Admin → Products → Import
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Product data
// ---------------------------------------------------------------------------

const WATCHES = [
  {
    title: "Apple Watch Series 3",
    handle: "apple-watch-series-3",
    desc: "Apple Watch Series 3 — den perfekte start på dit Apple Watch-eventyr. GPS, pulsmåler og vandtæt til svømning. S3-chip med dual-core processor. Ideel til fitness-tracking og daglig brug.",
    sizes: ["38mm", "42mm"],
    colors: ["Space Gray", "Silver"],
    price: 799,
    ean: "190199312067",
    mpn: "MTF02DH/A",
    seoTitle: "Apple Watch Series 3 Refurbished | PhoneSpot",
    seoDesc: "Køb refurbished Apple Watch Series 3 med 36 måneders garanti. GPS, pulsmåler og vandtæt. Fra 543 kr.",
  },
  {
    title: "Apple Watch Series 4",
    handle: "apple-watch-series-4",
    desc: "Apple Watch Series 4 med 30% større display og ECG-funktion. Falddetektion, optisk pulssensor og elektrisk pulssensor. S4 64-bit dual-core processor. Et stort spring i sundhedsfunktioner.",
    sizes: ["40mm", "44mm"],
    colors: ["Space Gray", "Silver", "Gold"],
    price: 999,
    ean: "190198842848",
    mpn: "MU6D2DH/A",
    seoTitle: "Apple Watch Series 4 Refurbished | PhoneSpot",
    seoDesc: "Køb refurbished Apple Watch Series 4 med ECG og 36 måneders garanti. Fra 679 kr.",
  },
  {
    title: "Apple Watch Series 5",
    handle: "apple-watch-series-5",
    desc: "Apple Watch Series 5 med Always-On Retina-display. Indbygget kompas, ECG og international nødopkald. S5-chip. Holdt trit med din daglige træning og sundhed.",
    sizes: ["40mm", "44mm"],
    colors: ["Space Gray", "Silver", "Gold"],
    price: 1199,
    ean: "190199264465",
    mpn: "MWVF2DH/A",
    seoTitle: "Apple Watch Series 5 Refurbished | PhoneSpot",
    seoDesc: "Køb refurbished Apple Watch Series 5 med Always-On display og 36 måneders garanti. Fra 815 kr.",
  },
  {
    title: "Apple Watch Series 6",
    handle: "apple-watch-series-6",
    desc: "Apple Watch Series 6 med blodiltmåler (SpO2) og Always-On Retina-display. S6-chip med 20% hurtigere processor. Den ultimative sundheds- og fitnesspartner.",
    sizes: ["40mm", "44mm"],
    colors: ["Space Gray", "Silver", "Gold", "(PRODUCT)RED", "Blue"],
    price: 1399,
    ean: "194252076910",
    mpn: "MG133DH/A",
    seoTitle: "Apple Watch Series 6 Refurbished | PhoneSpot",
    seoDesc: "Køb refurbished Apple Watch Series 6 med SpO2 og 36 måneders garanti. Fra 951 kr.",
  },
  {
    title: "Apple Watch SE (1. gen)",
    handle: "apple-watch-se-1st-gen",
    desc: "Apple Watch SE — alle de vigtigste funktioner til en fantastisk pris. Stor Retina-display, pulsmåler, GPS og vandtæt. S5-chip. Perfekt til dem der vil starte med Apple Watch.",
    sizes: ["40mm", "44mm"],
    colors: ["Space Gray", "Silver", "Gold"],
    price: 1099,
    ean: "194252077078",
    mpn: "MYDT2DH/A",
    seoTitle: "Apple Watch SE 1. gen Refurbished | PhoneSpot",
    seoDesc: "Køb refurbished Apple Watch SE med 36 måneders garanti. Fra 747 kr.",
  },
  {
    title: "Apple Watch SE (2. gen)",
    handle: "apple-watch-se-2nd-gen",
    desc: "Apple Watch SE 2. generation med S8-chip, kollisionsdetektion og forbedret træningstracking. Op til 18 timers batteritid. Alt hvad du har brug for — uden at bryde budgettet.",
    sizes: ["40mm", "44mm"],
    colors: ["Midnight", "Starlight", "Silver"],
    price: 1499,
    ean: "194253120766",
    mpn: "MNPX3DH/A",
    seoTitle: "Apple Watch SE 2. gen Refurbished | PhoneSpot",
    seoDesc: "Køb refurbished Apple Watch SE 2. gen med S8-chip og 36 måneders garanti. Fra 1.019 kr.",
  },
  {
    title: "Apple Watch Series 7",
    handle: "apple-watch-series-7",
    desc: "Apple Watch Series 7 med det hidtil største og mest holdbare display. 33% hurtigere opladning, IP6X-støvtæthed og WR50-vandtæthed. S7-chip. Krystalklart Always-On display.",
    sizes: ["41mm", "45mm"],
    colors: ["Midnight", "Starlight", "Green", "Blue", "(PRODUCT)RED"],
    price: 1599,
    ean: "194252528952",
    mpn: "MKHE3DH/A",
    seoTitle: "Apple Watch Series 7 Refurbished | PhoneSpot",
    seoDesc: "Køb refurbished Apple Watch Series 7 med stort display og 36 måneders garanti. Fra 1.087 kr.",
  },
  {
    title: "Apple Watch Series 8",
    handle: "apple-watch-series-8",
    desc: "Apple Watch Series 8 med temperatursensor, kollisionsdetektion og avanceret træningsmåling. S8-chip og Always-On Retina display. Din mest avancerede sundhedskammerat.",
    sizes: ["41mm", "45mm"],
    colors: ["Midnight", "Starlight", "Silver", "(PRODUCT)RED"],
    price: 1899,
    ean: "194253150657",
    mpn: "MNP13DH/A",
    seoTitle: "Apple Watch Series 8 Refurbished | PhoneSpot",
    seoDesc: "Køb refurbished Apple Watch Series 8 med temperatursensor og 36 måneders garanti. Fra 1.291 kr.",
  },
  {
    title: "Apple Watch Series 9",
    handle: "apple-watch-series-9",
    desc: "Apple Watch Series 9 med S9-chip, dobbeltknips-gestus og 2000 nits Always-On display. Præcis dobbelfrekvens-GPS og avancerede sundhedssensorer.",
    sizes: ["41mm", "45mm"],
    colors: ["Midnight", "Starlight", "Silver", "(PRODUCT)RED", "Pink"],
    price: 2299,
    ean: "194253937999",
    mpn: "MR8X3DH/A",
    seoTitle: "Apple Watch Series 9 Refurbished | PhoneSpot",
    seoDesc: "Køb refurbished Apple Watch Series 9 med S9-chip og 36 måneders garanti. Fra 1.563 kr.",
  },
  {
    title: "Apple Watch Ultra",
    handle: "apple-watch-ultra",
    desc: "Apple Watch Ultra — designet til ekstreme eventyr. 49mm titaniumkabinet, 100m vandtæt, dobbelfrekvens-GPS og op til 36 timers batteri. Til dem der kræver det allerbedste.",
    sizes: ["49mm"],
    colors: ["Natural"],
    price: 3499,
    ean: "194253151760",
    mpn: "MQDY3DH/A",
    seoTitle: "Apple Watch Ultra Refurbished | PhoneSpot",
    seoDesc: "Køb refurbished Apple Watch Ultra i titanium med 36 måneders garanti. Fra 2.379 kr.",
  },
  {
    title: "Apple Watch Ultra 2",
    handle: "apple-watch-ultra-2",
    desc: "Apple Watch Ultra 2 med S9-chip, 3000 nits display og dobbeltknips-gestus. Præcis dobbelfrekvens-GPS, 100m vandtæt og 72 timers batteri med strømsparetilstand.",
    sizes: ["49mm"],
    colors: ["Natural"],
    price: 4299,
    ean: "194253945406",
    mpn: "MQDY3DH/B",
    seoTitle: "Apple Watch Ultra 2 Refurbished | PhoneSpot",
    seoDesc: "Køb refurbished Apple Watch Ultra 2 med S9-chip og 36 måneders garanti. Fra 2.923 kr.",
  },
];

const GRADES = [
  { label: "Som ny", discount: 0, compareMultiplier: 1.6 },
  { label: "God stand", discount: 0.16, compareMultiplier: 1.6 },
  { label: "Okay stand", discount: 0.32, compareMultiplier: 1.6 },
];

const SIZE_PREMIUM = {
  "38mm": 0, "40mm": 0, "41mm": 0,
  "42mm": 100, "44mm": 100, "45mm": 100, "49mm": 0,
};

// ---------------------------------------------------------------------------
// CSV generation
// ---------------------------------------------------------------------------

const HEADERS = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Product Category",
  "Type",
  "Tags",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Option2 Name",
  "Option2 Value",
  "Option3 Name",
  "Option3 Value",
  "Variant SKU",
  "Variant Grams",
  "Variant Inventory Tracker",
  "Variant Inventory Qty",
  "Variant Inventory Policy",
  "Variant Fulfillment Service",
  "Variant Price",
  "Variant Compare At Price",
  "Variant Requires Shipping",
  "Variant Taxable",
  "Variant Barcode",
  "Image Src",
  "Image Position",
  "Image Alt Text",
  "SEO Title",
  "SEO Description",
  "Status",
];

function escapeCsv(val) {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildRows() {
  const rows = [];

  for (const w of WATCHES) {
    const tags = [
      "refurbished",
      "apple",
      "apple-watch",
      "smartwatch",
      `ean:${w.ean}`,
      `mpn:${w.mpn}`,
    ].join(", ");

    let isFirstVariant = true;

    for (const size of w.sizes) {
      for (const color of w.colors) {
        for (const grade of GRADES) {
          const basePrice = w.price + (SIZE_PREMIUM[size] || 0);
          const price = Math.round(basePrice * (1 - grade.discount));
          const compareAt = Math.round(basePrice * grade.compareMultiplier);
          const sku = `${w.handle}-${size}-${color.toLowerCase().replace(/[^a-z0-9]/g, "")}-${grade.label.toLowerCase().replace(/\s/g, "-")}`;

          const row = {
            Handle: w.handle,
            Title: isFirstVariant ? w.title : "",
            "Body (HTML)": isFirstVariant ? `<p>${w.desc}</p>` : "",
            Vendor: isFirstVariant ? "Apple" : "",
            "Product Category": isFirstVariant ? "Electronics > Smartwatches" : "",
            Type: isFirstVariant ? "Apple Watch" : "",
            Tags: isFirstVariant ? tags : "",
            Published: isFirstVariant ? "TRUE" : "",
            "Option1 Name": "Size",
            "Option1 Value": size,
            "Option2 Name": "Farve",
            "Option2 Value": color,
            "Option3 Name": "Stand",
            "Option3 Value": grade.label,
            "Variant SKU": sku,
            "Variant Grams": "40",
            "Variant Inventory Tracker": "shopify",
            "Variant Inventory Qty": "10",
            "Variant Inventory Policy": "deny",
            "Variant Fulfillment Service": "manual",
            "Variant Price": price.toFixed(2),
            "Variant Compare At Price": compareAt.toFixed(2),
            "Variant Requires Shipping": "TRUE",
            "Variant Taxable": "TRUE",
            "Variant Barcode": w.ean,
            "Image Src": "",
            "Image Position": "",
            "Image Alt Text": isFirstVariant ? w.title : "",
            "SEO Title": isFirstVariant ? w.seoTitle : "",
            "SEO Description": isFirstVariant ? w.seoDesc : "",
            Status: isFirstVariant ? "active" : "",
          };

          rows.push(row);
          isFirstVariant = false;
        }
      }
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const rows = buildRows();

let csv = HEADERS.map(escapeCsv).join(",") + "\n";
for (const row of rows) {
  csv += HEADERS.map((h) => escapeCsv(row[h])).join(",") + "\n";
}

const outPath = join(__dirname, "apple-watches-import.csv");
writeFileSync(outPath, csv, "utf-8");

// Stats
let totalVariants = 0;
for (const w of WATCHES) {
  totalVariants += w.sizes.length * w.colors.length * GRADES.length;
}

console.log("\nApple Watch Shopify CSV Generator");
console.log("==================================\n");
console.log(`  Products:  ${WATCHES.length}`);
console.log(`  Variants:  ${totalVariants}`);
console.log(`  Output:    ${outPath}`);
console.log(`\n  Import in Shopify Admin → Products → Import\n`);

// Print product summary
for (const w of WATCHES) {
  const variants = w.sizes.length * w.colors.length * GRADES.length;
  const minPrice = Math.round(w.price * (1 - 0.32));
  const maxPrice = w.price + Math.max(...w.sizes.map((s) => SIZE_PREMIUM[s] || 0));
  console.log(`  ${w.title.padEnd(30)} ${variants} variants  ${minPrice}–${maxPrice} kr`);
}
console.log("");
