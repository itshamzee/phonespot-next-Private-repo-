import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";

export const dynamic = "force-dynamic";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * GET /api/feeds/pricerunner
 * PriceRunner XML product feed — uses platform data (Supabase).
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Fetch listed devices
    const { data: devices } = await supabase
      .from("devices")
      .select(`
        id, barcode, grade, storage, color, selling_price, photos,
        product_templates ( display_name, brand, model, category, slug, images )
      `)
      .eq("status", "listed")
      .not("selling_price", "is", null);

    // Fetch active SKU products
    const { data: skuProducts } = await supabase
      .from("sku_products")
      .select("id, title, ean, selling_price, sale_price, brand, category, images")
      .eq("status", "published");

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<products>\n`;

    for (const dev of devices ?? []) {
      const template = dev.product_templates as unknown as {
        display_name: string;
        brand: string;
        model: string;
        category: string;
        slug: string;
        images: string[];
      } | null;

      const title = `${template?.display_name ?? "Enhed"} - Grade ${dev.grade}${dev.storage ? ` ${dev.storage}` : ""}`;
      const price = ((dev.selling_price ?? 0) / 100).toFixed(2);
      const imageUrl = dev.photos?.[0] ?? template?.images?.[0] ?? "";
      const productUrl = `${SITE_URL}/produkt/${template?.slug ?? dev.id}`;

      xml += `  <product>\n`;
      xml += `    <ProductName>${escapeXml(title)}</ProductName>\n`;
      xml += `    <Price>${price}</Price>\n`;
      xml += `    <Currency>DKK</Currency>\n`;
      xml += `    <ProductUrl>${escapeXml(productUrl)}</ProductUrl>\n`;
      xml += `    <ImageUrl>${escapeXml(imageUrl)}</ImageUrl>\n`;
      xml += `    <Category>${escapeXml(template?.category ?? "Elektronik")}</Category>\n`;
      xml += `    <Manufacturer>${escapeXml(template?.brand ?? "")}</Manufacturer>\n`;
      xml += `    <ShippingCost>0.00</ShippingCost>\n`;
      xml += `    <StockStatus>in stock</StockStatus>\n`;
      xml += `    <Condition>refurbished</Condition>\n`;
      xml += `    <SKU>device-${dev.id}</SKU>\n`;
      xml += `    <Ean>${escapeXml(dev.barcode)}</Ean>\n`;
      xml += `  </product>\n`;
    }

    for (const sku of skuProducts ?? []) {
      const effectivePrice = sku.sale_price && sku.sale_price < sku.selling_price
        ? sku.sale_price
        : sku.selling_price;
      const price = (effectivePrice / 100).toFixed(2);

      xml += `  <product>\n`;
      xml += `    <ProductName>${escapeXml(sku.title)}</ProductName>\n`;
      xml += `    <Price>${price}</Price>\n`;
      xml += `    <Currency>DKK</Currency>\n`;
      xml += `    <ProductUrl>${escapeXml(`${SITE_URL}/tilbehoer/${sku.id}`)}</ProductUrl>\n`;
      xml += `    <ImageUrl>${escapeXml(sku.images?.[0] ?? "")}</ImageUrl>\n`;
      xml += `    <Category>${escapeXml(sku.category ?? "Tilbehor")}</Category>\n`;
      xml += `    <Manufacturer>${escapeXml(sku.brand ?? "")}</Manufacturer>\n`;
      xml += `    <ShippingCost>0.00</ShippingCost>\n`;
      xml += `    <StockStatus>in stock</StockStatus>\n`;
      xml += `    <Condition>new</Condition>\n`;
      xml += `    <SKU>sku-${sku.id}</SKU>\n`;
      if (sku.ean) xml += `    <Ean>${escapeXml(sku.ean)}</Ean>\n`;
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
