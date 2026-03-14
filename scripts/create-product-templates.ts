// scripts/create-product-templates.ts
// Create product_templates from Shopify device products (phones/tablets with grade variants).
// Run: npx tsx scripts/create-product-templates.ts

import { createAdminClient } from "../src/lib/supabase/admin";
import { readFileSync } from "fs";

interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
}

interface ShopifyOption {
  name: string;
  values: string[];
}

interface ShopifyImage {
  src: string;
  position: number;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  handle: string;
  tags: string;
  status: string;
  variants: ShopifyVariant[];
  options: ShopifyOption[];
  images: ShopifyImage[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/\|/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function dkkToOere(price: string): number {
  return Math.round(parseFloat(price) * 100);
}

function detectCategory(product: ShopifyProduct): string {
  const title = product.title.toLowerCase();
  const tags = (product.tags || "").toLowerCase();
  if (tags.includes("ipad") || title.includes("ipad")) return "ipad";
  if (tags.includes("iphone") || title.includes("iphone")) return "iphone";
  if (title.includes("samsung")) return "smartphone";
  return "other";
}

function extractModel(title: string): string {
  // Clean up model name from title
  return title
    .replace(/Apple\s*/i, "")
    .replace(/\|.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStorageOptions(product: ShopifyProduct): string[] {
  // Check "Lagerplads" option first, then "GB" option
  const storageOpt =
    product.options.find((o) => o.name.toLowerCase().includes("lager")) ||
    product.options.find((o) => o.name.toLowerCase() === "gb");
  if (storageOpt) return storageOpt.values;
  return [];
}

function extractColors(product: ShopifyProduct): string[] {
  const colorOpt = product.options.find(
    (o) => o.name.toLowerCase().includes("farve") || o.name.toLowerCase() === "color"
  );
  if (colorOpt) return colorOpt.values;
  return [];
}

function getGradePrices(
  product: ShopifyProduct
): { a: number | null; b: number | null; c: number | null } {
  // "Stand" option maps: "Som ny Stand" = A, "God Stand" = B, "Okay Stand" = C
  const gradeOpt = product.options.find((o) =>
    o.name.toLowerCase().includes("stand")
  );
  if (!gradeOpt) {
    const price = dkkToOere(product.variants[0].price);
    return { a: price, b: null, c: null };
  }

  // Find the option index (1, 2, or 3) for the grade
  const gradeOptIdx = product.options.indexOf(gradeOpt);
  const optionKey = `option${gradeOptIdx + 1}` as "option1" | "option2" | "option3";

  let priceA: number | null = null;
  let priceB: number | null = null;
  let priceC: number | null = null;

  for (const v of product.variants) {
    const grade = (v[optionKey] || "").toLowerCase();
    const price = dkkToOere(v.price);

    if (grade.includes("som ny")) {
      if (priceA === null || price < priceA) priceA = price;
    } else if (grade.includes("god")) {
      if (priceB === null || price < priceB) priceB = price;
    } else if (grade.includes("okay")) {
      if (priceC === null || price < priceC) priceC = price;
    }
  }

  return { a: priceA, b: priceB, c: priceC };
}

async function main() {
  const supabase = createAdminClient();
  const allProducts = JSON.parse(
    readFileSync("scripts/shopify-products-dump.json", "utf8")
  ) as ShopifyProduct[];

  // Filter for device products (phones/tablets with grade variants)
  const deviceProducts = allProducts.filter((p) => {
    const hasGradeVariants = p.options.some(
      (o) =>
        o.name.toLowerCase().includes("stand") ||
        o.name.toLowerCase().includes("lager") ||
        o.name.toLowerCase() === "gb"
    );
    const isDevice =
      p.variants.length > 1 &&
      hasGradeVariants &&
      detectCategory(p) !== "other";
    return isDevice;
  });

  console.log(`Found ${deviceProducts.length} device products to create templates for`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of deviceProducts) {
    try {
      const slug = slugify(product.handle || product.title);

      // Check if template already exists
      const { data: existing } = await supabase
        .from("product_templates")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const category = detectCategory(product);
      const model = extractModel(product.title);
      const storageOptions = extractStorageOptions(product);
      const colors = extractColors(product);
      const images = product.images
        .sort((a, b) => a.position - b.position)
        .map((img) => img.src);
      const description = stripHtml(product.body_html);
      const gradePrices = getGradePrices(product);

      // Extract brand
      const brand = product.title.toLowerCase().includes("samsung")
        ? "Samsung"
        : "Apple";

      const { error: insertError } = await supabase
        .from("product_templates")
        .insert({
          brand,
          model,
          category,
          display_name: product.title,
          slug,
          description,
          images,
          storage_options: storageOptions.length > 0 ? storageOptions : null,
          colors: colors.length > 0 ? colors : null,
          status: product.status === "active" ? "published" : "draft",
          base_price_a: gradePrices.a,
          base_price_b: gradePrices.b,
          base_price_c: gradePrices.c,
          short_description: description.slice(0, 160),
          meta_title: `${product.title} - Refurbished | PhoneSpot`,
          meta_description: `Køb refurbished ${model} med 36 måneders garanti. Kvalitetstestet og klar til brug fra PhoneSpot.`,
        });

      if (insertError) {
        console.error(`  Failed: ${product.title} — ${insertError.message}`);
        errors++;
        continue;
      }

      inserted++;
      console.log(`  Created: ${product.title} (${category})`);
    } catch (err) {
      console.error(`  Error: ${product.title}:`, err);
      errors++;
    }
  }

  console.log(
    `\nTemplate creation complete: ${inserted} created, ${skipped} skipped, ${errors} errors.`
  );
}

main().catch(console.error);
