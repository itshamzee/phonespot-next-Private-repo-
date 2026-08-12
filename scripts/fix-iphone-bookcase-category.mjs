// One-off data fix: `iphone-bookcase` (a 150 kr leather book-style case) was
// miscategorised in sku_products as category: "iphone". Because
// isDeviceCategory("iphone") is true, that made the product register as a
// graded refurbished DEVICE everywhere category drives the 36-month
// commercial guarantee vs. the statutory 2-year reklamationsret (email USP
// bars, TrustBar variant on the [collection]/[product] route, FAQ block,
// meta description). The product's own canonical PDP route
// (/tilbehoer/[category]/[slug]) already ignored sku_products.category for
// this decision and hardcoded variant="accessory", so the page itself was
// already showing the correct 2-year wording — only the email path and the
// (unlinked, but technically reachable) /iphones/iphone-bookcase route were
// wrong. This script corrects the source-of-truth category field.
//
// Reachability check performed before running this (see conversation/report
// for detail): this row is NOT listed on /iphones (that page queries
// product_templates, a different table, entirely unaffected by
// sku_products.category), and is NOT listed on any /tilbehoer/[category]
// accessory listing either way (those hard-filter category="accessory" AND
// this row's subcategory is null, so it doesn't appear in a subcategory
// listing before or after this fix). Its only current inbound link is via
// site search (/api/search -> /tilbehoer/{category}/{slug}), and that
// detail route resolves the product by slug independent of the category
// segment's validity, so the page keeps rendering after the category
// changes from "iphone" to "accessory" (only the cosmetic breadcrumb slug
// text changes, from "iphone" to "accessory" — neither is a real
// tilbehoer-config category, so neither ever produced a nice label).
//
// Run: node scripts/fix-iphone-bookcase-category.mjs
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envPath = new URL("../.env.local", import.meta.url);
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

const SLUG = "iphone-bookcase";

const { data: before, error: beforeError } = await supabase
  .from("sku_products")
  .select("id, slug, title, category, status")
  .eq("slug", SLUG)
  .single();

if (beforeError || !before) {
  console.error("Could not find sku_products row for slug:", SLUG, beforeError);
  process.exit(1);
}

console.log("Before:", before);

if (before.category === "accessory") {
  console.log("Already category='accessory' — nothing to do.");
  process.exit(0);
}

const { data: after, error: updateError } = await supabase
  .from("sku_products")
  .update({ category: "accessory", updated_at: new Date().toISOString() })
  .eq("id", before.id)
  .select("id, slug, title, category, status")
  .single();

if (updateError) {
  console.error("Update failed:", updateError);
  process.exit(1);
}

console.log("After:", after);
