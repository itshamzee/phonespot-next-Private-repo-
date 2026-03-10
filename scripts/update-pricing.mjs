#!/usr/bin/env node
/**
 * Update Shopify product pricing to match Danish competitors.
 * Uses Phonetrade/Green.dk pricing as baseline, slightly undercut.
 *
 * Usage:
 *   node scripts/update-pricing.mjs [--dry-run]
 */

const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
if (!TOKEN) { console.error("Set SHOPIFY_ADMIN_API_TOKEN env var"); process.exit(1); }
const SHOP = "c47a26-4.myshopify.com";
const API = `https://${SHOP}/admin/api/2024-01`;
const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Competitor pricing (Phonetrade/Green.dk, March 2026)
// Format: { "model_key": { "storage": { A: price, B: price, C: price } } }
// Grade A = Som ny, Grade B = Rigtig god/God stand, Grade C = Brugt/Okay
// ---------------------------------------------------------------------------

const COMPETITOR_PRICES = {
  // iPhone 15 Series
  "iphone 15 pro max": {
    "256": { A: 5397, B: 5142, C: 4802 },
    "512": { A: 6200, B: 5900, C: 5500 },
    "1024": { A: 7200, B: 6800, C: 6400 },
  },
  "iphone 15 pro": {
    "128": { A: 4814, B: 4544, C: 4094 },
    "256": { A: 5200, B: 4900, C: 4500 },
    "512": { A: 5800, B: 5500, C: 5100 },
    "1024": { A: 6500, B: 6200, C: 5800 },
  },
  "iphone 15 plus": {
    "128": { A: 4322, B: 4037, C: 3752 },
    "256": { A: 4700, B: 4400, C: 4100 },
    "512": { A: 5200, B: 4900, C: 4500 },
  },
  "iphone 15": {
    "128": { A: 4149, B: 3949, C: 3549 },
    "256": { A: 4500, B: 4300, C: 3900 },
    "512": { A: 5000, B: 4700, C: 4300 },
  },
  // iPhone 14 Series
  "iphone 14 pro max": {
    "128": { A: 4207, B: 3952, C: 3697 },
    "256": { A: 4600, B: 4300, C: 4000 },
    "512": { A: 5200, B: 4900, C: 4500 },
    "1024": { A: 5800, B: 5500, C: 5100 },
  },
  "iphone 14 pro": {
    "128": { A: 3752, B: 3467, C: 3182 },
    "256": { A: 4100, B: 3800, C: 3500 },
    "512": { A: 4700, B: 4400, C: 4000 },
    "1024": { A: 5200, B: 4900, C: 4500 },
  },
  "iphone 14 plus": {
    "128": { A: 3194, B: 3014, C: 2834 },
    "256": { A: 3500, B: 3300, C: 3100 },
    "512": { A: 3900, B: 3700, C: 3400 },
  },
  "iphone 14": {
    "128": { A: 3104, B: 2834, C: 2564 },
    "256": { A: 3400, B: 3100, C: 2800 },
    "512": { A: 3800, B: 3500, C: 3200 },
  },
  // iPhone 13 Series
  "iphone 13 pro max": {
    "128": { A: 3464, B: 3014, C: 2834 },
    "256": { A: 3800, B: 3400, C: 3100 },
    "512": { A: 4200, B: 3800, C: 3400 },
    "1024": { A: 4800, B: 4400, C: 3900 },
  },
  "iphone 13 pro": {
    "128": { A: 3104, B: 2834, C: 2654 },
    "256": { A: 3400, B: 3100, C: 2900 },
    "512": { A: 3800, B: 3500, C: 3200 },
    "1024": { A: 4200, B: 3900, C: 3600 },
  },
  "iphone 13 mini": {
    "128": { A: 2449, B: 2249, C: 2149 },
    "256": { A: 2700, B: 2500, C: 2400 },
    "512": { A: 3000, B: 2800, C: 2600 },
  },
  "iphone 13": {
    "128": { A: 2564, B: 2384, C: 2204 },
    "256": { A: 2800, B: 2600, C: 2400 },
    "512": { A: 3200, B: 3000, C: 2800 },
  },
  // iPhone 12 Series
  "iphone 12 pro max": {
    "128": { A: 2654, B: 2474, C: 2204 },
    "256": { A: 2900, B: 2700, C: 2400 },
    "512": { A: 3200, B: 3000, C: 2700 },
  },
  "iphone 12 pro": {
    "128": { A: 2327, B: 2137, C: 1947 },
    "256": { A: 2600, B: 2400, C: 2200 },
    "512": { A: 2900, B: 2700, C: 2500 },
  },
  "iphone 12 mini": {
    "64": { A: 1649, B: 1449, C: 1349 },
    "128": { A: 1800, B: 1600, C: 1500 },
    "256": { A: 2000, B: 1800, C: 1700 },
  },
  "iphone 12": {
    "64": { A: 1754, B: 1574, C: 1484 },
    "128": { A: 1900, B: 1700, C: 1600 },
    "256": { A: 2100, B: 1900, C: 1800 },
  },
  // iPhone 11 Series
  "iphone 11 pro max": {
    "64": { A: 1947, B: 1757, C: 1567 },
    "256": { A: 2200, B: 2000, C: 1800 },
    "512": { A: 2500, B: 2300, C: 2100 },
  },
  "iphone 11 pro": {
    "64": { A: 1754, B: 1574, C: 1394 },
    "256": { A: 2000, B: 1800, C: 1600 },
    "512": { A: 2300, B: 2100, C: 1900 },
  },
  "iphone 11": {
    "64": { A: 1549, B: 1449, C: 1249 },
    "128": { A: 1700, B: 1600, C: 1400 },
    "256": { A: 1900, B: 1800, C: 1600 },
  },
  // iPhone X/XS/XR Series
  "iphone xs max": {
    "64": { A: 1749, B: 1549, C: 1349 },
    "256": { A: 1900, B: 1700, C: 1500 },
    "512": { A: 2100, B: 1900, C: 1700 },
  },
  "iphone xs": {
    "64": { A: 1349, B: 1249, C: 1049 },
    "256": { A: 1500, B: 1400, C: 1200 },
    "512": { A: 1700, B: 1600, C: 1400 },
  },
  "iphone xr": {
    "64": { A: 1249, B: 1149, C: 949 },
    "128": { A: 1400, B: 1300, C: 1100 },
    "256": { A: 1600, B: 1500, C: 1300 },
  },
  "iphone x": {
    "64": { A: 1249, B: 1149, C: 949 },
    "256": { A: 1400, B: 1300, C: 1100 },
  },
  "iphone se 2022": {
    "64": { A: 1649, B: 1449, C: 1349 },
    "128": { A: 1800, B: 1600, C: 1500 },
    "256": { A: 2000, B: 1800, C: 1700 },
  },
  "iphone se 2020": {
    "64": { A: 1149, B: 949, C: 849 },
    "128": { A: 1300, B: 1100, C: 1000 },
    "256": { A: 1500, B: 1300, C: 1200 },
  },
  // iPhone 8/7 Series
  "iphone 8 plus": {
    "64": { A: 1100, B: 999, C: 899 },
    "128": { A: 1200, B: 1099, C: 999 },
    "256": { A: 1400, B: 1299, C: 1199 },
  },
  "iphone 8": {
    "64": { A: 899, B: 799, C: 699 },
    "128": { A: 999, B: 899, C: 799 },
    "256": { A: 1100, B: 999, C: 899 },
  },
  "iphone 7 plus": {
    "32": { A: 899, B: 799, C: 699 },
    "128": { A: 999, B: 899, C: 799 },
    "256": { A: 1100, B: 999, C: 899 },
  },
  "iphone 7": {
    "32": { A: 699, B: 599, C: 499 },
    "128": { A: 799, B: 699, C: 599 },
    "256": { A: 899, B: 799, C: 699 },
  },
  // iPads
  "ipad 7": {
    "32": { A: 1599, B: 1519, C: 1399 },
    "128": { A: 2100, B: 1995, C: 1800 },
  },
  "ipad 8": {
    "32": { A: 1899, B: 1809, C: 1700 },
    "128": { A: 2500, B: 2395, C: 2200 },
  },
  "ipad 6": {
    "32": { A: 1200, B: 975, C: 900 },
    "128": { A: 1400, B: 1195, C: 1100 },
  },
  "ipad air 2": {
    "16": { A: 899, B: 799, C: 699 },
    "32": { A: 999, B: 899, C: 799 },
    "64": { A: 1100, B: 999, C: 899 },
    "128": { A: 1300, B: 1199, C: 1099 },
  },
  "ipad pro": {
    "64": { A: 2200, B: 2000, C: 1800 },
    "256": { A: 2800, B: 2600, C: 2400 },
    "512": { A: 3200, B: 3000, C: 2800 },
  },
  // Apple Watch
  "apple watch se 44": {
    default: { A: 1569, B: 1389, C: 1200 },
  },
  "apple watch se 40": {
    default: { A: 1349, B: 1189, C: 999 },
  },
  // Laptops
  "thinkpad t490s": {
    default: { A: 2800, B: 2195, C: 1895 },
  },
  "thinkpad x1 carbon g7": {
    default: { A: 3200, B: 2795, C: 2400 },
  },
  "thinkpad x1 carbon g9": {
    default: { A: 4500, B: 3995, C: 3500 },
  },
  "thinkpad x1 carbon g10": {
    default: { A: 5500, B: 4995, C: 4500 },
  },
  "thinkpad x13": {
    default: { A: 5000, B: 4500, C: 4000 },
  },
  "thinkpad t14": {
    default: { A: 4500, B: 3995, C: 3500 },
  },
  "thinkpad x285": {
    default: { A: 1599, B: 1399, C: 1199 },
  },
  "thinkpad a285": {
    default: { A: 1599, B: 1399, C: 1199 },
  },
  // Other phones
  "samsung galaxy a40": {
    default: { A: 799, B: 649, C: 549 },
  },
  "oneplus 10t": {
    default: { A: 2049, B: 1849, C: 1649 },
  },
  "oneplus 10 pro": {
    default: { A: 2499, B: 2249, C: 1999 },
  },
  "huawei p40 lite": {
    default: { A: 1299, B: 1099, C: 899 },
  },
  "redmi note 13 pro": {
    default: { A: 2499, B: 2249, C: 1999 },
  },
  "motorola moto g04": {
    default: { A: 799, B: 699, C: 599 },
  },
  "motorola moto g24": {
    default: { A: 799, B: 699, C: 599 },
  },
  "airpods 3": {
    default: { A: 799, B: 699, C: 599 },
  },
};

// ---------------------------------------------------------------------------
// Grade normalization (same as frontend)
// ---------------------------------------------------------------------------

function normalizeGrade(value) {
  const v = value.toLowerCase().trim();
  if (v === "som ny" || v === "som new" || v === "som ny (asis)") return "A";
  if (v === "god" || v === "god stand") return "B";
  if (v === "okay" || v === "ok" || v === "okay stand" || v === "ok stand") return "C";
  if (v.includes("grade a") || (v.includes("ny") && v.includes("pakke"))) return "A";
  if (v.includes("grade c")) return "C";
  if (v.includes("grade b")) return "B";
  if (v.includes("som ny")) return "A";
  if (v.includes("god")) return "B";
  if (v.includes("okay") || v.includes("ok ")) return "C";
  return null;
}

function extractStorage(optionValue) {
  if (!optionValue) return null;
  const v = optionValue.toLowerCase().trim();
  // Match patterns like "128GB", "256 GB", "512gb", "1TB", "1 TB"
  const tbMatch = v.match(/(\d+)\s*tb/i);
  if (tbMatch) return String(parseInt(tbMatch[1]) * 1024);
  const gbMatch = v.match(/(\d+)\s*gb/i);
  if (gbMatch) return gbMatch[1];
  // Plain numbers
  const numMatch = v.match(/^(\d+)$/);
  if (numMatch) return numMatch[1];
  return null;
}

function findModelKey(title) {
  const t = title.toLowerCase();
  const keys = Object.keys(COMPETITOR_PRICES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (t.includes(key)) return key;
  }
  return null;
}

const SIZE_NAMES = ["size", "størrelse", "gb", "lagerplads", "lager plads"];
const GRADE_NAMES = ["stand"];

function isSizeOption(name) {
  return SIZE_NAMES.includes(name.toLowerCase());
}
function isGradeOption(name) {
  return GRADE_NAMES.includes(name.toLowerCase());
}

// ---------------------------------------------------------------------------
// Shopify Admin API helpers
// ---------------------------------------------------------------------------

async function fetchAllProducts() {
  let products = [];
  let url = `${API}/products.json?limit=250`;
  while (url) {
    const res = await fetch(url, { headers: { "X-Shopify-Access-Token": TOKEN } });
    const link = res.headers.get("link");
    const data = await res.json();
    products.push(...data.products);
    url = null;
    if (link) {
      const next = link.match(/<([^>]+)>;\s*rel="next"/);
      if (next) url = next[1];
    }
  }
  return products;
}

async function updateVariant(variantId, data) {
  const res = await fetch(`${API}/variants/${variantId}.json`, {
    method: "PUT",
    headers: {
      "X-Shopify-Access-Token": TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ variant: data }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update variant ${variantId}: ${res.status} ${err}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n  PhoneSpot Pricing Updater");
  console.log("  ========================");
  if (DRY_RUN) console.log("  MODE: DRY RUN (no changes will be made)\n");
  else console.log("  MODE: LIVE (updating Shopify)\n");

  const products = await fetchAllProducts();
  console.log(`  Products loaded: ${products.length}\n`);

  let updated = 0;
  let skipped = 0;
  let noMatch = 0;
  let errors = 0;

  // Only update device products (not spare parts, accessories, etc.)
  const deviceProducts = products.filter((p) => {
    const t = p.title.toLowerCase();
    const isDevice =
      t.match(/^apple iphone \d/) ||
      t.match(/^iphone \d/) ||
      t.match(/^apple ipad/) ||
      t.match(/^ipad air/) ||
      t.match(/^apple watch/) ||
      t.match(/^lenovo thinkpad/) ||
      t.match(/^samsung galaxy a/) ||
      t.match(/^oneplus/) ||
      t.match(/^huawei/) ||
      t.match(/^xiaomi redmi/) ||
      t.match(/^motorola/);
    // Exclude spare parts (skærm, display, batteri, camera lens, etc.)
    const isSparePart = t.match(
      /skærm|display|batteri|camera lens|charge connector|bagglas|rear glass|flex kabel|reservedel|digitizer/i
    );
    return isDevice && !isSparePart;
  });

  console.log(`  Device products to update: ${deviceProducts.length}\n`);

  for (const product of deviceProducts) {
    const modelKey = findModelKey(product.title);
    if (!modelKey) {
      console.log(`  SKIP (no pricing data): ${product.title}`);
      noMatch++;
      continue;
    }

    const pricingData = COMPETITOR_PRICES[modelKey];
    console.log(`  ${product.title} → ${modelKey}`);

    // Find option positions
    let sizeOptIdx = -1;
    let gradeOptIdx = -1;
    for (let i = 0; i < product.options.length; i++) {
      if (isSizeOption(product.options[i].name)) sizeOptIdx = i;
      if (isGradeOption(product.options[i].name)) gradeOptIdx = i;
    }

    for (const variant of product.variants) {
      // Determine storage and grade from variant options
      let storage = null;
      let grade = null;

      for (let i = 0; i < 3; i++) {
        const optVal = variant[`option${i + 1}`];
        if (!optVal) continue;

        if (i === sizeOptIdx) {
          storage = extractStorage(optVal);
        } else if (i === gradeOptIdx) {
          grade = normalizeGrade(optVal);
        }
      }

      // Use 'default' if no storage options
      const storageKey = storage || "default";
      const gradeKey = grade || "A"; // Default to A if no grade

      const storagePricing = pricingData[storageKey] || pricingData["default"];
      if (!storagePricing) {
        console.log(`    SKIP variant ${variant.id}: no pricing for storage="${storageKey}"`);
        skipped++;
        continue;
      }

      const competitorPrice = storagePricing[gradeKey];
      if (!competitorPrice) {
        console.log(`    SKIP variant ${variant.id}: no pricing for grade="${gradeKey}"`);
        skipped++;
        continue;
      }

      // Set our price 2-5% below competitor
      const ourPrice = Math.round(competitorPrice * 0.97 / 10) * 10 - 1; // Round to nearest 10, subtract 1
      const compareAt = Math.round(competitorPrice * 1.3 / 10) * 10 - 1; // 30% above competitor as "was" price

      const currentPrice = parseFloat(variant.price);
      const currentCompareAt = parseFloat(variant.compare_at_price) || 0;

      if (Math.abs(currentPrice - ourPrice) < 5 && Math.abs(currentCompareAt - compareAt) < 5) {
        skipped++;
        continue;
      }

      const optInfo = [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" / ");
      console.log(
        `    ${optInfo}: ${currentPrice} → ${ourPrice} DKK (compare-at: ${currentCompareAt || "-"} → ${compareAt})`
      );

      if (!DRY_RUN) {
        try {
          await updateVariant(variant.id, {
            price: ourPrice.toFixed(2),
            compare_at_price: compareAt.toFixed(2),
          });
          updated++;
          // Rate limiting: max 2 requests per second
          await new Promise((r) => setTimeout(r, 500));
        } catch (e) {
          console.log(`    ERROR: ${e.message}`);
          errors++;
        }
      } else {
        updated++;
      }
    }
  }

  console.log("\n  Summary:");
  console.log(`    Variants updated:  ${updated}`);
  console.log(`    Variants skipped:  ${skipped}`);
  console.log(`    No pricing match:  ${noMatch} products`);
  console.log(`    Errors:            ${errors}`);
  if (DRY_RUN) console.log("\n  This was a DRY RUN. Run without --dry-run to apply changes.");
  console.log("");
}

main().catch((e) => console.error(e));
