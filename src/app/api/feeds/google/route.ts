import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { isNewGrade, merchantCondition } from "@/lib/grades";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";

/**
 * GET /api/feeds/google
 * Google Merchant Center product XML feed.
 *
 * Strategy:
 *  - One item per (template, grade) combination — NOT per physical device.
 *    Google rejects duplicate items that share the same landing page.
 *  - Links always point to a valid /refurbished/{slug} page. Devices without
 *    a resolved template are skipped (they would 404).
 *  - Foxway barcodes are NOT real GTINs, so we set identifier_exists=no and
 *    use template.slug + grade as MPN (unique, stable).
 *  - Availability comes from actual device count per (template, grade).
 *  - Shipping is inlined per-item (Merchant requires shipping to be set).
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Fetch listed devices with explicit FK hint so template is always resolved
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

    // Fetch active SKU products
    const { data: skuProducts } = await supabase
      .from("sku_products")
      .select(
        "id, title, description, short_description, ean, product_number, selling_price, sale_price, brand, category, slug, images",
      )
      .eq("status", "published");

    // ------------------------------------------------------------
    // Group devices by (template, grade) — emit one feed item per group
    // ------------------------------------------------------------
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
      if (!template || !template.slug) continue; // skip devices that would 404
      if (!template.images?.length) continue; // Google requires an image
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

    // ------------------------------------------------------------
    // Build XML
    // ------------------------------------------------------------
    const shippingBlock = `<g:shipping>
    <g:country>DK</g:country>
    <g:service>Standard</g:service>
    <g:price>49.00 DKK</g:price>
  </g:shipping>`;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
<title>PhoneSpot</title>
<link>${SITE_URL}</link>
<description>Refurbished elektronik med 36 måneders garanti</description>
`;

    // Refurbished device items — grouped
    for (const group of groups.values()) {
      const { template, grade, minPrice, count } = group;
      const isNew = isNewGrade(grade);
      const title = isNew
        ? `${template.display_name} - Fabriksny`
        : `${template.display_name} - Grade ${grade} Refurbished`;
      const link = `${SITE_URL}/refurbished/${template.slug}`;
      const image = template.images[0];
      const price = (minPrice / 100).toFixed(2);
      const description =
        template.description ??
        template.short_description ??
        (isNew
          ? `${template.display_name} — fabriksny, forseglet i original emballage. 36 måneders garanti, 14 dages returret.`
          : `${template.display_name} refurbished i Grade ${grade}. 36 måneders garanti, 30+ kontroller, 14 dages returret.`);
      const googleCategory = getGoogleCategory(template.category);

      xml += `
<item>
  <g:id>${escapeXml(template.slug)}-${grade.toLowerCase()}</g:id>
  <g:title><![CDATA[${title}]]></g:title>
  <g:description><![CDATA[${description}]]></g:description>
  <g:link>${link}</g:link>
  <g:image_link>${escapeXml(image)}</g:image_link>
  <g:price>${price} DKK</g:price>
  <g:condition>${merchantCondition(grade)}</g:condition>
  <g:availability>${count > 0 ? "in_stock" : "out_of_stock"}</g:availability>
  <g:brand>${escapeXml(template.brand)}</g:brand>
  <g:mpn>${escapeXml(template.slug)}-${grade.toLowerCase()}</g:mpn>
  <g:identifier_exists>no</g:identifier_exists>
  <g:item_group_id>${escapeXml(template.slug)}</g:item_group_id>
  <g:google_product_category>${googleCategory}</g:google_product_category>
  <g:product_type>Refurbished &gt; ${escapeXml(template.brand)} &gt; ${escapeXml(template.display_name)}</g:product_type>
  ${shippingBlock}
</item>`;
    }

    // Accessory SKU items — one per product
    for (const sku of skuProducts ?? []) {
      if (!sku.slug) continue;
      if (!sku.images?.length) continue;

      const effectivePrice =
        sku.sale_price && sku.sale_price < sku.selling_price
          ? sku.sale_price
          : sku.selling_price;
      const price = (effectivePrice / 100).toFixed(2);
      const image = sku.images[0];
      const description =
        sku.description ?? sku.short_description ?? sku.title;
      const link = `${SITE_URL}/tilbehoer/${sku.category ?? "accessory"}/${sku.slug}`;
      const hasEan = sku.ean && /^\d{8,14}$/.test(sku.ean);

      xml += `
<item>
  <g:id>sku-${escapeXml(sku.id)}</g:id>
  <g:title><![CDATA[${sku.title}]]></g:title>
  <g:description><![CDATA[${description}]]></g:description>
  <g:link>${link}</g:link>
  <g:image_link>${escapeXml(image)}</g:image_link>
  <g:price>${(sku.selling_price / 100).toFixed(2)} DKK</g:price>
  ${sku.sale_price && sku.sale_price < sku.selling_price ? `<g:sale_price>${price} DKK</g:sale_price>` : ""}
  <g:condition>new</g:condition>
  <g:availability>in_stock</g:availability>
  ${sku.brand ? `<g:brand>${escapeXml(sku.brand)}</g:brand>` : "<g:brand>PhoneSpot</g:brand>"}
  ${hasEan ? `<g:gtin>${sku.ean}</g:gtin>` : "<g:identifier_exists>no</g:identifier_exists>"}
  ${sku.product_number ? `<g:mpn>${escapeXml(sku.product_number)}</g:mpn>` : `<g:mpn>sku-${escapeXml(sku.id)}</g:mpn>`}
  <g:google_product_category>267</g:google_product_category>
  <g:product_type>Tilbehør &gt; ${escapeXml(sku.category ?? "Andet")}</g:product_type>
  ${shippingBlock}
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

// Google product category IDs — https://support.google.com/merchants/answer/6324436
function getGoogleCategory(category: string): string {
  switch (category) {
    case "iphone":
    case "smartphone":
      return "267"; // Electronics > Communications > Telephony > Mobile Phones > Smartphones
    case "ipad":
      return "4745"; // Electronics > Computers > Tablet Computers
    case "laptop":
      return "328"; // Electronics > Computers > Laptops
    case "smartwatch":
      return "2271"; // Electronics > Electronics Accessories > Wearable Technology > Smartwatches
    default:
      return "222"; // Electronics
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
