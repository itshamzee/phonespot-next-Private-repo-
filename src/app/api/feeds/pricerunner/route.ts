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
 * Pricerunner product feed. One item per (template, grade) group so the
 * feed has stable SKUs, no duplicates, and links always land on a valid
 * /refurbished/{slug} page.
 *
 * Previous bugs fixed:
 *  - Old link was /produkt/{slug} (route does not exist → 404).
 *  - Old feed emitted one item per physical device (duplicates with same URL).
 *  - Used Foxway internal barcode as EAN (not a real EAN → rejected).
 *  - Fell back to /produkt/{dev.id} (UUID) when template join returned null.
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
          id, display_name, brand, category, slug, description, short_description, images
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
    };
    type Group = {
      template: Template;
      grade: string;
      minPrice: number;
      count: number;
    };

    const groups = new Map<string, Group>();
    for (const dev of devices ?? []) {
      const template = dev.template as unknown as Template | null;
      if (!template || !template.slug) continue;
      if (!template.images?.length) continue;
      if (dev.selling_price == null) continue;

      const key = `${template.id}:${dev.grade}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
        if (dev.selling_price < existing.minPrice) existing.minPrice = dev.selling_price;
      } else {
        groups.set(key, {
          template,
          grade: dev.grade as string,
          minPrice: dev.selling_price,
          count: 1,
        });
      }
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<products>\n`;

    // Refurbished devices — grouped by (template, grade)
    for (const group of groups.values()) {
      const { template, grade, minPrice, count } = group;
      const title = `${template.display_name} - Grade ${grade} Refurbished`;
      const productUrl = `${SITE_URL}/refurbished/${template.slug}`;
      const imageUrl = template.images[0] ?? "";
      const price = (minPrice / 100).toFixed(2);
      const description =
        template.description ??
        template.short_description ??
        `${template.display_name} refurbished i Grade ${grade}. 36 måneders garanti, 30+ kontroller, 14 dages returret.`;
      const sku = `${template.slug}-${grade.toLowerCase()}`;

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
      xml += `    <MPN>${escapeXml(sku)}</MPN>\n`;
      xml += `    <ShippingCost>49.00</ShippingCost>\n`;
      xml += `    <DeliveryTime>1-2 dage</DeliveryTime>\n`;
      xml += `    <StockStatus>${count > 0 ? "in stock" : "out of stock"}</StockStatus>\n`;
      xml += `    <Condition>Refurbished</Condition>\n`;
      xml += `  </product>\n`;
    }

    // Accessories
    for (const sku of skuProducts ?? []) {
      if (!sku.slug) continue;
      if (!sku.images?.length) continue;

      const effectivePrice =
        sku.sale_price && sku.sale_price < sku.selling_price
          ? sku.sale_price
          : sku.selling_price;
      const price = (effectivePrice / 100).toFixed(2);
      const url = `${SITE_URL}/tilbehoer/${sku.category ?? "accessory"}/${sku.slug}`;
      const description =
        sku.description ?? sku.short_description ?? sku.title;
      const hasEan = sku.ean && /^\d{8,14}$/.test(sku.ean);

      xml += `  <product>\n`;
      xml += `    <SKU>sku-${escapeXml(sku.id)}</SKU>\n`;
      xml += `    <ProductName>${escapeXml(sku.title)}</ProductName>\n`;
      xml += `    <Description>${escapeXml(description)}</Description>\n`;
      xml += `    <Price>${price}</Price>\n`;
      xml += `    <Currency>DKK</Currency>\n`;
      xml += `    <ProductUrl>${escapeXml(url)}</ProductUrl>\n`;
      xml += `    <ImageUrl>${escapeXml(sku.images[0])}</ImageUrl>\n`;
      xml += `    <Category>Mobiltilbehør > ${escapeXml(sku.category ?? "Andet")}</Category>\n`;
      xml += `    <Manufacturer>${escapeXml(sku.brand ?? "PhoneSpot")}</Manufacturer>\n`;
      if (hasEan) xml += `    <Ean>${escapeXml(sku.ean)}</Ean>\n`;
      if (sku.product_number) xml += `    <MPN>${escapeXml(sku.product_number)}</MPN>\n`;
      xml += `    <ShippingCost>49.00</ShippingCost>\n`;
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
