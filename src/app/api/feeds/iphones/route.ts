import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";

export const dynamic = "force-dynamic";

/**
 * GET /api/feeds/iphones
 *
 * iPhone-only product feed for Meta Catalog (Advantage+/DPA) and Pricerunner.
 *
 * Format: Google Shopping RSS 2.0 (g: namespace) — accepted by both Meta and
 * Pricerunner.
 *
 * Granularity: one item per (template × color × storage × grade) combination.
 * That gives Meta the variant resolution it needs to ad-target by colour while
 * still pricing each grade separately.
 *
 * Image priority:
 *  1. template.default_attributes.images_by_color[color][0] (color-specific)
 *  2. template.images[0] (fallback)
 *
 * Identifier strategy: refurbished iPhones have no meaningful per-unit GTIN,
 * so we set identifier_exists=no and use a stable MPN built from
 * slug-storage-color-grade. This is what Meta + Pricerunner accept for
 * refurbished electronics.
 *
 * Shipping: 0.00 DKK (gratis fragt).
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: devices, error } = await supabase
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

    if (error) {
      console.error("iPhone feed query error:", error);
      return new NextResponse(`Feed error: ${error.message}`, { status: 500 });
    }

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

    // Filter: iPhone templates only.
    // category='iphone' OR (brand='Apple' AND category='smartphone')
    const iphoneDevices = (devices ?? []).filter((d) => {
      const t = d.template as unknown as Template | null;
      if (!t || !t.slug) return false;
      const isIphone =
        t.category === "iphone" ||
        (t.brand === "Apple" && t.category === "smartphone");
      return isIphone;
    });

    // Group by (template, color, storage, grade)
    const variants = new Map<string, Variant>();
    for (const dev of iphoneDevices) {
      const template = dev.template as unknown as Template;
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

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
<title>PhoneSpot — iPhone Refurbished</title>
<link>${SITE_URL}</link>
<description>Refurbished iPhones med 36 måneders garanti og gratis fragt</description>
`;

    let itemCount = 0;

    for (const v of variants.values()) {
      const { template, color, storage, grade, minPrice } = v;

      // Resolve image
      const ibc = (template.default_attributes?.images_by_color ?? null) as
        | Record<string, string[]>
        | null;
      const colorImages = color && ibc?.[color]?.length ? ibc[color] : null;
      const primaryImage = colorImages?.[0] ?? template.images?.[0] ?? null;
      if (!primaryImage) continue; // Meta rejects items without an image

      const additionalImages =
        colorImages && colorImages.length > 1
          ? colorImages.slice(1, 11) // Meta caps at 10 additional
          : (template.images ?? []).slice(1, 11);

      // Build IDs
      const storageSlug = (storage || "default").toLowerCase().replace(/\s+/g, "");
      const colorSlug = slugify(color || "default");
      const itemId = `${template.slug}-${storageSlug}-${colorSlug}-${grade.toLowerCase()}`;

      // Title
      const titleParts = [template.display_name];
      if (storage) titleParts.push(storage);
      if (color) titleParts.push(color);
      titleParts.push(`Grade ${grade}`);
      const title = titleParts.join(" ");

      // Description (prefer short, fall back to long, fall back to generated).
      // Treat empty strings as missing too — some templates carry "" not null.
      const shortDesc = template.short_description?.trim() || null;
      const longDesc = template.description?.trim() || null;
      const description =
        shortDesc ??
        longDesc ??
        `${title} — refurbished iPhone hos PhoneSpot. 36 mdr. garanti, gratis fragt, 14 dages returret, testet i 30+ punkter.`;

      // Link to template page (color/storage/grade selection happens in UI)
      const link = `${SITE_URL}/refurbished/${template.slug}`;

      const priceStr = (minPrice / 100).toFixed(2);

      xml += `
<item>
  <g:id>${escapeXml(itemId)}</g:id>
  <g:title><![CDATA[${title}]]></g:title>
  <g:description><![CDATA[${description}]]></g:description>
  <g:link>${link}</g:link>
  <g:image_link>${escapeXml(primaryImage)}</g:image_link>`;

      for (const img of additionalImages) {
        xml += `
  <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`;
      }

      // Resolve GTIN: per-variant > template-wide fallback > omit (and signal
      // identifier_exists=no so Meta accepts the item without one).
      const gtinsByVariant = (template.default_attributes?.gtins_by_variant ?? null) as
        | Record<string, string>
        | null;
      const fallbackGtin = (template.default_attributes?.gtin ?? null) as string | null;
      const variantKey = `${storage}|${color}`;
      const rawGtin = gtinsByVariant?.[variantKey] ?? fallbackGtin ?? null;
      const hasGtin = !!rawGtin && /^\d{8,14}$/.test(rawGtin);

      xml += `
  <g:price>${priceStr} DKK</g:price>
  <g:condition>refurbished</g:condition>
  <g:availability>in_stock</g:availability>
  <g:brand>Apple</g:brand>
  <g:item_group_id>${escapeXml(template.slug)}</g:item_group_id>`;
      if (hasGtin) {
        xml += `
  <g:gtin>${escapeXml(rawGtin!)}</g:gtin>`;
      } else {
        xml += `
  <g:identifier_exists>no</g:identifier_exists>`;
      }
      xml += `
  <g:mpn>${escapeXml(itemId)}</g:mpn>
  <g:google_product_category>267</g:google_product_category>
  <g:product_type>Refurbished &gt; Apple &gt; iPhone</g:product_type>`;

      if (color) {
        xml += `
  <g:color>${escapeXml(color)}</g:color>`;
      }
      if (storage) {
        xml += `
  <g:capacity>${escapeXml(storage)}</g:capacity>
  <g:size>${escapeXml(storage)}</g:size>`;
      }

      xml += `
  <g:custom_label_0>${escapeXml(template.display_name)}</g:custom_label_0>
  <g:custom_label_1>Grade ${escapeXml(grade)}</g:custom_label_1>`;
      if (storage) {
        xml += `
  <g:custom_label_2>${escapeXml(storage)}</g:custom_label_2>`;
      }
      if (color) {
        xml += `
  <g:custom_label_3>${escapeXml(color)}</g:custom_label_3>`;
      }
      xml += `
  <g:custom_label_4>${escapeXml(priceBand(minPrice))}</g:custom_label_4>
  <g:shipping>
    <g:country>DK</g:country>
    <g:service>Standard</g:service>
    <g:price>0.00 DKK</g:price>
  </g:shipping>
</item>`;

      itemCount += 1;
    }

    xml += `
</channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-Item-Count": String(itemCount),
      },
    });
  } catch (err) {
    console.error("iPhone feed error:", err);
    return NextResponse.json({ error: "Feed error" }, { status: 500 });
  }
}

function escapeXml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

/** Price-band custom label for Meta Advantage+ targeting. */
function priceBand(oere: number): string {
  const dkk = oere / 100;
  if (dkk < 2000) return "<2k";
  if (dkk < 4000) return "2k-4k";
  if (dkk < 6000) return "4k-6k";
  if (dkk < 8000) return "6k-8k";
  if (dkk < 10000) return "8k-10k";
  return "10k+";
}
