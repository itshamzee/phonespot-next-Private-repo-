// phonespot-next/scripts/audit-tpu-coverage.ts
// Verify every active iPhone product_template has a corresponding clear TPU cover sku_product.
// Run: npx tsx --env-file=.env.local scripts/audit-tpu-coverage.ts
//  or: npx tsx scripts/audit-tpu-coverage.ts  (loads .env.local automatically below)
//
// NOTE on matching strategy: Clear TPU SKUs do not carry a `compatible_model`
// attribute — the model is embedded in the title (e.g. "NOVANL Clear TPU Case
// For iPhone 13 Pro Max"). We match by extracting the iPhone model token from
// the SKU title and checking whether it contains the template's `.model` field
// as a substring.  Special cases handled:
//   - "iPhone 14 Pro Max (eSIM Only)"  →  strip the "(eSIM Only)" suffix
//   - "iPhone X/XS" combined SKU       →  covered by "iphone x" substring match
//   - "iPhone 17e/16e" combined SKU    →  covered by "16e" substring match

import { readFileSync } from "fs";
import { resolve } from "path";
import { createAdminClient } from "../src/lib/supabase/admin";

// Load .env.local so the script works outside Next.js context
const envPath = resolve(__dirname, "../.env.local");
const env = readFileSync(envPath, "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

/**
 * Normalise a model string for comparison:
 * - Strip parenthetical suffixes like "(eSIM Only)", "(2020)"
 * - Lowercase
 * Returns the core model token, e.g. "iphone 14 pro max"
 */
function normaliseModel(model: string): string {
  return model
    .replace(/\s*\(.*?\)/g, "")  // remove parenthetical suffixes
    .trim()
    .toLowerCase();
}

/**
 * Check whether an SKU title contains the given model as a word-boundary match.
 * This prevents "iPhone 12" from matching "iPhone 12 Pro",
 * and "iPhone 13 Pro" from matching "iPhone 13 Pro Max".
 *
 * The SKU title format is:
 *   "NOVANL Clear TPU Case For iPhone <MODEL>"
 * where <MODEL> may be a slash-delimited pair like "17e/16e" or "X/XS".
 *
 * Strategy: extract everything after "iphone " in the title,
 * split by "/" for combined-model entries, and check each part
 * for an exact match against normModel.
 */
function titleMatchesModel(skuTitle: string, normModel: string): boolean {
  const lower = skuTitle.toLowerCase();
  const iphoneIdx = lower.indexOf("iphone ");
  if (iphoneIdx === -1) return false;

  // Everything after "iphone " is the model token (may be "17e/16e" or "x/xs")
  const modelPart = lower.slice(iphoneIdx); // e.g. "iphone 17e/16e" or "iphone 14 pro max"

  // For slash-combined entries (e.g. "iphone 17e/16e"), split and test each
  const variants = modelPart.split("/").map((v, i) => {
    if (i === 0) return v.trim(); // "iphone 17e" — first part already includes "iphone"
    // Subsequent parts after "/" are bare model suffixes; prepend "iphone " context
    // e.g. "16e" from "17e/16e" → we just test "iphone 16e"
    return `iphone ${v.trim()}`;
  });

  return variants.some((v) => v === normModel);
}

async function main() {
  const supabase = createAdminClient();

  // category is "iphone" in this DB (not "phone")
  const { data: iphoneTemplates, error: tplErr } = await supabase
    .from("product_templates")
    .select("id, display_name, brand, model, category")
    .eq("category", "iphone")
    .eq("brand", "Apple")
    .order("display_name");

  if (tplErr) throw tplErr;
  if (!iphoneTemplates) throw new Error("No iPhone templates returned");

  // Clear TPU cases have attributes.case_type = "Clear"
  // (The ilike "%TPU%cover%clear%" pattern in the spec didn't match any rows
  //  because actual titles are "NOVANL Clear TPU Case For iPhone X" and there
  //  is no `compatible_model` attribute — model is embedded in the title.)
  const { data: tpuCases, error: skuErr } = await supabase
    .from("sku_products")
    .select("id, title, attributes")
    .eq("attributes->>case_type", "Clear");

  if (skuErr) throw skuErr;

  // Only keep iPhone clear cases (filter out Samsung etc.)
  const iphoneTpuCases = (tpuCases ?? []).filter((sku) =>
    sku.title.toLowerCase().includes("iphone")
  );

  console.log(
    `Found ${iphoneTemplates.length} iPhone templates, ${iphoneTpuCases.length} iPhone clear TPU SKUs.`
  );

  const missing: Array<{ template_id: string; display_name: string }> = [];
  const mapped: Array<{ template_id: string; display_name: string; sku_id: string; sku_title: string }> = [];

  for (const tpl of iphoneTemplates) {
    const normModel = normaliseModel(tpl.model);

    const match = iphoneTpuCases.find((sku) => titleMatchesModel(sku.title, normModel));

    if (match) {
      mapped.push({
        template_id: tpl.id,
        display_name: tpl.display_name,
        sku_id: match.id,
        sku_title: match.title,
      });
    } else {
      missing.push({ template_id: tpl.id, display_name: tpl.display_name });
    }
  }

  console.log("\n=== MAPPED ===");
  console.table(mapped);
  console.log("\n=== MISSING (must create SKUs) ===");
  console.table(missing);

  console.log("\n=== TYPESCRIPT MAP FOR campaigns/sommer-bundle.ts ===");
  for (const m of mapped) {
    console.log(`  "${m.template_id}": "${m.sku_id}", // ${m.display_name}`);
  }

  if (missing.length > 0) {
    console.log(`\n${missing.length} iPhones still need a TPU clear-case SKU.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
