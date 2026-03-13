import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";

/**
 * GET /api/feeds/google
 * Google Merchant Center product XML feed.
 * Lists all active devices and SKU products.
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
      .select("id, title, description, ean, selling_price, sale_price, brand, category, images")
      .eq("is_active", true);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
<title>PhoneSpot</title>
<link>${SITE_URL}</link>
<description>Refurbished elektronik med garanti</description>
`;

    // Device items
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
      const link = `${SITE_URL}/produkt/${template?.slug ?? dev.id}`;
      const image = dev.photos?.[0] ?? template?.images?.[0] ?? "";
      const price = ((dev.selling_price ?? 0) / 100).toFixed(2);

      xml += `
<item>
  <g:id>device-${dev.id}</g:id>
  <g:title><![CDATA[${title}]]></g:title>
  <g:link>${link}</g:link>
  <g:image_link>${image}</g:image_link>
  <g:price>${price} DKK</g:price>
  <g:condition>refurbished</g:condition>
  <g:availability>in_stock</g:availability>
  <g:brand>${template?.brand ?? "PhoneSpot"}</g:brand>
  <g:gtin>${dev.barcode}</g:gtin>
  <g:google_product_category>Electronics</g:google_product_category>
</item>`;
    }

    // SKU product items
    for (const sku of skuProducts ?? []) {
      const effectivePrice = sku.sale_price && sku.sale_price < sku.selling_price
        ? sku.sale_price
        : sku.selling_price;
      const price = (effectivePrice / 100).toFixed(2);
      const image = sku.images?.[0] ?? "";

      xml += `
<item>
  <g:id>sku-${sku.id}</g:id>
  <g:title><![CDATA[${sku.title}]]></g:title>
  <g:link>${SITE_URL}/tilbehoer/${sku.id}</g:link>
  <g:image_link>${image}</g:image_link>
  <g:price>${price} DKK</g:price>
  ${sku.sale_price && sku.sale_price < sku.selling_price ? `<g:sale_price>${(sku.sale_price / 100).toFixed(2)} DKK</g:sale_price>` : ""}
  <g:condition>new</g:condition>
  <g:availability>in_stock</g:availability>
  ${sku.brand ? `<g:brand>${sku.brand}</g:brand>` : ""}
  ${sku.ean ? `<g:gtin>${sku.ean}</g:gtin>` : ""}
  <g:google_product_category>Electronics > Phone Accessories</g:google_product_category>
</item>`;
    }

    xml += `
</channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Google feed error:", err);
    return NextResponse.json({ error: "Feed error" }, { status: 500 });
  }
}
