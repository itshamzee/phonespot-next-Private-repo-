import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";

export const dynamic = "force-dynamic";

function escapeXml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function categoryPath(category: string): string {
  switch (category) {
    case "iphone":
      return "Mobiltelefoner > iPhone";
    case "smartphone":
      return "Mobiltelefoner > Android";
    case "ipad":
      return "Tablets > iPad";
    case "laptop":
      return "Computere > Bærbare";
    case "smartwatch":
      return "Smartwatches";
    default:
      return "Elektronik";
  }
}

/**
 * GET /api/feeds/pricerunner
 *
 * Pricerunner product feed.
 *
 * Granularity: one item per (template × color × storage × grade) variant of
 * in-stock devices. This matches how Pricerunner users search ("iPhone 15
 * Pro 256GB Sort") so price-comparison works correctly.
 *
 * Image priority for devices:
 *  1. template.default_attributes.images_by_color[color][0] (color-specific)
 *  2. template.images[0] (fallback)
 *
 * EAN/GTIN resolution for devices (highest specificity first):
 *  1. template.default_attributes.gtins_by_variant["<storage>|<color>"]
 *     — per-variant GTIN, e.g. "256GB|Sort": "0194253430797"
 *  2. template.default_attributes.gtin
 *     — single GTIN that applies to all variants of the template
 *  3. (omitted — feed still emits the row with MPN as the only identifier)
 *
 * Refurbished iPhones share the manufacturer's GTIN — Pricerunner matches
 * on this for catalog grouping. Per-unit serial numbers are not GTINs.
 *
 * Accessories: pull EAN from sku_products.ean directly.
 *
 * Shipping: 0.00 DKK (gratis fragt).
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: devices } = await supabase
      .from("devices")
      .select(
        `
        id, grade, storage, color, selling_price,
        template:product_templates!template_id (
          id, display_name, brand, category, slug,
          description, short_description, images, default_attributes
        )
        `,
      )
      .eq("status", "listed")
      .not("selling_price", "is", null);

    const { data: skuProducts } = await supabase
      .from("sku_products")
      .select(
        "id, title, description, short_description, ean, product_number, selling_price, sale_price, brand, category, slug, images",
      )
      .eq("status", "published");

    type Template = {
      id: string;
      display_name: string;
      brand: string;
      category: string;
      slug: string;
      description: string | null;
      short_description: string | null;
      images: string[];
      default_attributes: Record<string, unknown> | null;
    };

    type Variant = {
      template: Template;
      color: string;
      storage: string;
      grade: string;
      minPrice: number;
      count: number;
    };

    // Group devices by (template, color, storage, grade) so each variant gets
    // its own Pricerunner entry with correct image and identifiers.
    const variants = new Map<string, Variant>();
    for (const dev of devices ?? []) {
      const template = dev.template as unknown as Template | null;
      if (!template || !template.slug) continue;
      if (dev.selling_price == null) continue;

      const color = dev.color ?? "";
      const storage = dev.storage ?? "";
      const grade = dev.grade as string;
      const price = dev.selling_price as number;

      const key = `${template.id}|${color}|${storage}|${grade}`;
      const existing = variants.get(key);
      if (existing) {
        existing.count += 1;
        if (price < existing.minPrice) existing.minPrice = price;
      } else {
        variants.set(key, {
          template,
          color,
          storage,
          grade,
          minPrice: price,
          count: 1,
        });
      }
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<products>\n`;

    // Refurbished devices — one entry per variant
    for (const v of variants.values()) {
      const { template, color, storage, grade, minPrice } = v;

      // Resolve image: prefer color-specific from images_by_color
      const ibc = (template.default_attributes?.images_by_color ?? null) as
        | Record<string, string[]>
        | null;
      const colorImages = color && ibc?.[color]?.length ? ibc[color] : null;
      const imageUrl = colorImages?.[0] ?? template.images?.[0] ?? "";
      if (!imageUrl) continue; // skip items without any image

      const storageSlug = (storage || "default").toLowerCase().replace(/\s+/g, "");
      const colorSlug = slugify(color || "default");
      const sku = `${template.slug}-${storageSlug}-${colorSlug}-${grade.toLowerCase()}`;

      const titleParts = [template.display_name];
      if (storage) titleParts.push(storage);
      if (color) titleParts.push(color);
      titleParts.push(`Grade ${grade}`);
      titleParts.push("Refurbished");
      const title = titleParts.join(" ");

      const productUrl = `${SITE_URL}/refurbished/${template.slug}`;
      const price = (minPrice / 100).toFixed(2);

      const shortDesc = template.short_description?.trim() || null;
      const longDesc = template.description?.trim() || null;
      const description =
        shortDesc ??
        longDesc ??
        `${title} — refurbished hos PhoneSpot. 36 mdr. garanti, gratis fragt, 14 dages returret, testet i 30+ punkter.`;

      // Resolve EAN: per-variant first, then template-wide fallback.
      const gtinsByVariant = (template.default_attributes?.gtins_by_variant ?? null) as
        | Record<string, string>
        | null;
      const fallbackGtin = (template.default_attributes?.gtin ?? null) as string | null;
      const variantKey = `${storage}|${color}`;
      const rawGtin =
        gtinsByVariant?.[variantKey] ??
        (color && storage ? gtinsByVariant?.[`${storage}|${color}`] : null) ??
        fallbackGtin ??
        null;
      const hasGtin = rawGtin && /^\d{8,14}$/.test(rawGtin);

      xml += `  <product>\n`;
      xml += `    <SKU>${escapeXml(sku)}</SKU>\n`;
      xml += `    <ProductName>${escapeXml(title)}</ProductName>\n`;
      xml += `    <Description>${escapeXml(description)}</Description>\n`;
      xml += `    <Price>${price}</Price>\n`;
      xml += `    <Currency>DKK</Currency>\n`;
      xml += `    <ProductUrl>${escapeXml(productUrl)}</ProductUrl>\n`;
      xml += `    <ImageUrl>${escapeXml(imageUrl)}</ImageUrl>\n`;
      xml += `    <Category>${escapeXml(categoryPath(template.category))}</Category>\n`;
      xml += `    <Manufacturer>${escapeXml(template.brand)}</Manufacturer>\n`;
      if (hasGtin) xml += `    <Ean>${escapeXml(rawGtin)}</Ean>\n`;
      xml += `    <MPN>${escapeXml(sku)}</MPN>\n`;
      if (color) xml += `    <Color>${escapeXml(color)}</Color>\n`;
      if (storage) xml += `    <Capacity>${escapeXml(storage)}</Capacity>\n`;
      xml += `    <ShippingCost>0.00</ShippingCost>\n`;
      xml += `    <DeliveryTime>1-2 dage</DeliveryTime>\n`;
      xml += `    <StockStatus>in stock</StockStatus>\n`;
      xml += `    <Condition>Refurbished</Condition>\n`;
      xml += `  </product>\n`;
    }

    // Accessories — one item per SKU
    for (const sku of skuProducts ?? []) {
      if (!sku.slug) continue;
      if (!sku.images?.length) continue;

      const effectivePrice =
        sku.sale_price && sku.sale_price < sku.selling_price
          ? sku.sale_price
          : sku.selling_price;
      const price = (effectivePrice / 100).toFixed(2);
      const url = `${SITE_URL}/tilbehoer/${sku.category ?? "accessory"}/${sku.slug}`;
      const shortDesc = sku.short_description?.trim() || null;
      const longDesc = sku.description?.trim() || null;
      const description = shortDesc ?? longDesc ?? sku.title;
      const hasEan = sku.ean && /^\d{8,14}$/.test(sku.ean);

      xml += `  <product>\n`;
      xml += `    <SKU>sku-${escapeXml(sku.id)}</SKU>\n`;
      xml += `    <ProductName>${escapeXml(sku.title)}</ProductName>\n`;
      xml += `    <Description>${escapeXml(description)}</Description>\n`;
      xml += `    <Price>${price}</Price>\n`;
      xml += `    <Currency>DKK</Currency>\n`;
      xml += `    <ProductUrl>${escapeXml(url)}</ProductUrl>\n`;
      xml += `    <ImageUrl>${escapeXml(sku.images[0])}</ImageUrl>\n`;
      xml += `    <Category>Mobiltilbehør &gt; ${escapeXml(sku.category ?? "Andet")}</Category>\n`;
      xml += `    <Manufacturer>${escapeXml(sku.brand ?? "PhoneSpot")}</Manufacturer>\n`;
      if (hasEan) xml += `    <Ean>${escapeXml(sku.ean)}</Ean>\n`;
      if (sku.product_number) xml += `    <MPN>${escapeXml(sku.product_number)}</MPN>\n`;
      xml += `    <ShippingCost>0.00</ShippingCost>\n`;
      xml += `    <DeliveryTime>1-2 dage</DeliveryTime>\n`;
      xml += `    <StockStatus>in stock</StockStatus>\n`;
      xml += `    <Condition>New</Condition>\n`;
      xml += `  </product>\n`;
    }

    xml += `</products>\n`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("PriceRunner feed error:", err);
    return NextResponse.json({ error: "Feed error" }, { status: 500 });
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
