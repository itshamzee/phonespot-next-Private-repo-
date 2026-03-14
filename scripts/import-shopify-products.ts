// scripts/import-shopify-products.ts
// Import products from shopify-products-dump.json into Supabase sku_products.
// Run: npx tsx scripts/import-shopify-products.ts

import { createAdminClient } from "../src/lib/supabase/admin";
import products from "./shopify-products-dump.json";

interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  sku: string;
  barcode: string;
  inventory_quantity: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
}

interface ShopifyImage {
  src: string;
  alt: string | null;
  position: number;
}

interface ShopifyOption {
  name: string;
  values: string[];
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

function dkkToOere(dkkString: string): number {
  return Math.round(parseFloat(dkkString) * 100);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function detectCategory(product: ShopifyProduct): string {
  const title = product.title.toLowerCase();
  const tags = (product.tags || "").toLowerCase();

  if (tags.includes("ipad") || title.includes("ipad")) return "ipad";
  if (tags.includes("iphone") || title.includes("iphone")) {
    // Check if it's a spare part / accessory
    if (
      title.includes("batteri") ||
      title.includes("camera lens") ||
      title.includes("charge connector") ||
      title.includes("screen") ||
      title.includes("flex kabel") ||
      title.includes("lcd") ||
      title.includes("oled")
    )
      return "accessory";
    return "iphone";
  }
  if (title.includes("samsung")) {
    if (
      title.includes("batteri") ||
      title.includes("camera lens") ||
      title.includes("screen")
    )
      return "accessory";
    return "smartphone";
  }
  if (title.includes("macbook") || title.includes("laptop")) return "laptop";
  if (title.includes("apple watch") || title.includes("smartwatch"))
    return "smartwatch";
  if (title.includes("airpods") || title.includes("cover") || title.includes("kabel"))
    return "accessory";

  return "other";
}

function detectBrand(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("apple") || t.includes("iphone") || t.includes("ipad") || t.includes("airpods"))
    return "Apple";
  if (t.includes("samsung")) return "Samsung";
  if (t.includes("huawei")) return "Huawei";
  if (t.includes("oneplus")) return "OnePlus";
  if (t.includes("google") || t.includes("pixel")) return "Google";
  return "PhoneSpot";
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

async function main() {
  const supabase = createAdminClient();
  const allProducts = products as unknown as ShopifyProduct[];

  console.log(`Starting product import: ${allProducts.length} products from Shopify dump`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of allProducts) {
    try {
      const slug = slugify(product.handle || product.title);

      // Check if already imported
      const { data: existing } = await supabase
        .from("sku_products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const category = detectCategory(product);
      const brand = detectBrand(product.title);
      const images = product.images
        .sort((a, b) => a.position - b.position)
        .map((img) => img.src);

      // Parse tags for EAN
      const tags = product.tags ? product.tags.split(",").map((t) => t.trim()) : [];
      const eanTag = tags.find((t) => t.startsWith("ean:"));
      const ean = eanTag ? eanTag.replace("ean:", "").trim() : null;

      // Use first variant as base price
      const baseVariant = product.variants[0];
      const sellingPrice = dkkToOere(baseVariant.price);
      const salePrice = baseVariant.compare_at_price
        ? dkkToOere(baseVariant.compare_at_price)
        : null;

      // Build variants array for multi-variant products
      const hasRealVariants =
        product.variants.length > 1 ||
        (product.variants.length === 1 && product.variants[0].title !== "Default Title");

      const variants = hasRealVariants
        ? product.variants.map((v) => ({
            title: v.title,
            price: dkkToOere(v.price),
            compare_at_price: v.compare_at_price ? dkkToOere(v.compare_at_price) : null,
            sku: v.sku || null,
            barcode: v.barcode || null,
            inventory_quantity: v.inventory_quantity,
            options: {
              option1: v.option1,
              option2: v.option2,
              option3: v.option3,
            },
          }))
        : [];

      const description = stripHtml(product.body_html);

      const { error: insertError } = await supabase.from("sku_products").insert({
        title: product.title,
        description,
        slug,
        ean,
        brand,
        category,
        subcategory: category === "accessory" ? "spare-part" : null,
        selling_price: sellingPrice,
        sale_price: salePrice,
        images,
        is_active: product.status === "active",
        status: product.status === "active" ? "published" : "draft",
        variants,
        barcode: baseVariant.barcode || null,
      });

      if (insertError) {
        console.error(`  Failed: ${product.title} — ${insertError.message}`);
        errors++;
        continue;
      }

      inserted++;
      if (inserted % 25 === 0) {
        console.log(`  Inserted ${inserted} products so far...`);
      }
    } catch (err) {
      console.error(`  Error: ${product.title}:`, err);
      errors++;
    }
  }

  console.log(
    `\nProduct import complete: ${inserted} inserted, ${skipped} skipped, ${errors} errors.`,
  );
}

main().catch(console.error);
