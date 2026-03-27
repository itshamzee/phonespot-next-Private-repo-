import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SkuProduct, ProductTemplate, Device } from "@/lib/supabase/platform-types";

const BASE_URL = "https://phonespot.dk";

// ---------------------------------------------------------------------------
// Category mappings
// ---------------------------------------------------------------------------

interface CategoryMapping {
  googleCategory: string;
  productType: string;
  urlSlug: string;
}

const ACCESSORY_CATEGORY_MAP: Record<string, CategoryMapping> = {
  cover: {
    googleCategory:
      "Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases",
    productType: "Tilbehoer > Covers & Cases",
    urlSlug: "covers",
  },
  screen_protector: {
    googleCategory:
      "Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Screen Protectors",
    productType: "Tilbehoer > Skaermbeskyttelse",
    urlSlug: "skaermbeskyttelse",
  },
  charger: {
    googleCategory:
      "Electronics > Electronics Accessories > Power > Power Adapters & Chargers",
    productType: "Tilbehoer > Opladere",
    urlSlug: "opladere",
  },
  cable: {
    googleCategory:
      "Electronics > Electronics Accessories > Cables > USB Cables",
    productType: "Tilbehoer > Kabler",
    urlSlug: "opladere",
  },
  audio: {
    googleCategory: "Electronics > Audio > Headphones & Earbuds",
    productType: "Tilbehoer > Lyd",
    urlSlug: "lyd",
  },
  other: {
    googleCategory:
      "Electronics > Communications > Telephony > Mobile Phone Accessories",
    productType: "Tilbehoer > Holdere",
    urlSlug: "holdere",
  },
};

const DEVICE_CATEGORY_MAP: Record<string, string> = {
  iphone: "iphones",
  smartphone: "smartphones",
  tablet: "ipads",
  laptop: "baerbare",
  smartwatch: "smartwatches",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatPrice(oreAmount: number): string {
  return (oreAmount / 100).toFixed(2) + " DKK";
}

function isValidGtin(ean: string | null): boolean {
  if (!ean) return false;
  // Accept 8, 12, 13, or 14 digit GTINs
  return /^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(ean.trim());
}

function buildAccessoryItem(product: SkuProduct): string | null {
  // Require at least one image
  if (!product.images || product.images.length === 0) return null;
  // Require published and active
  if (product.status !== "published" || !product.is_active) return null;
  // Require a slug for the URL
  if (!product.slug) return null;

  const subcategory = product.subcategory ?? "other";
  const mapping =
    ACCESSORY_CATEGORY_MAP[subcategory] ?? ACCESSORY_CATEGORY_MAP["other"];

  const title = escapeXml(product.title);
  const description = escapeXml(
    product.short_description ?? product.description ?? product.title
  );
  const imageUrl = product.images[0];
  const productUrl = `${BASE_URL}/tilbehoer/${mapping.urlSlug}/${product.slug}`;

  const lines: string[] = [
    "    <item>",
    `      <g:id>${escapeXml(product.id)}</g:id>`,
    `      <g:title>${title}</g:title>`,
    `      <g:description>${description}</g:description>`,
    `      <g:link>${productUrl}</g:link>`,
    `      <g:image_link>${escapeXml(imageUrl)}</g:image_link>`,
    `      <g:condition>new</g:condition>`,
    `      <g:availability>in_stock</g:availability>`,
    `      <g:price>${formatPrice(product.selling_price)}</g:price>`,
  ];

  if (product.sale_price != null) {
    lines.push(
      `      <g:sale_price>${formatPrice(product.sale_price)}</g:sale_price>`
    );
  }

  if (product.brand) {
    lines.push(`      <g:brand>${escapeXml(product.brand)}</g:brand>`);
  }

  if (isValidGtin(product.ean)) {
    lines.push(`      <g:gtin>${escapeXml(product.ean!.trim())}</g:gtin>`);
  }

  if (product.product_number) {
    lines.push(
      `      <g:mpn>${escapeXml(product.product_number)}</g:mpn>`
    );
  }

  lines.push(
    `      <g:google_product_category>${escapeXml(mapping.googleCategory)}</g:google_product_category>`,
    `      <g:product_type>${escapeXml(mapping.productType)}</g:product_type>`,
    `      <g:shipping>`,
    `        <g:country>DK</g:country>`,
    `        <g:price>0.00 DKK</g:price>`,
    `      </g:shipping>`,
    `    </item>`
  );

  return lines.join("\n");
}

interface DeviceWithTemplate extends Device {
  template: ProductTemplate;
}

function buildDeviceItem(device: DeviceWithTemplate): string | null {
  const template = device.template;

  // Require a selling price
  if (!device.selling_price) return null;

  // Require at least one image (prefer device photos, fall back to template images)
  const images =
    device.photos && device.photos.length > 0
      ? device.photos
      : template.images ?? [];
  if (images.length === 0) return null;

  // Determine URL path from template category
  const categoryLower = template.category?.toLowerCase() ?? "";
  let urlBase = "smartphones";
  for (const [key, path] of Object.entries(DEVICE_CATEGORY_MAP)) {
    if (categoryLower.includes(key)) {
      urlBase = path;
      break;
    }
  }

  const gradeLabel = `Grade ${device.grade}`;
  const storagePart = device.storage ? ` ${device.storage}` : "";
  const rawTitle = `${template.display_name}${storagePart} - ${gradeLabel}`;
  const title = escapeXml(rawTitle);

  const rawDescription =
    template.short_description ??
    template.description ??
    `${rawTitle} — Refurbished hos PhoneSpot.dk`;
  const description = escapeXml(rawDescription);

  const productUrl = `${BASE_URL}/refurbished/${template.slug}`;
  const imageUrl = images[0];

  const lines: string[] = [
    "    <item>",
    `      <g:id>${escapeXml(device.id)}</g:id>`,
    `      <g:title>${title}</g:title>`,
    `      <g:description>${description}</g:description>`,
    `      <g:link>${productUrl}</g:link>`,
    `      <g:image_link>${escapeXml(imageUrl)}</g:image_link>`,
    `      <g:condition>refurbished</g:condition>`,
    `      <g:availability>in_stock</g:availability>`,
    `      <g:price>${formatPrice(device.selling_price)}</g:price>`,
    `      <g:brand>${escapeXml(template.brand)}</g:brand>`,
    `      <g:google_product_category>Electronics &gt; Communications &gt; Telephony &gt; Mobile Phones</g:google_product_category>`,
    `      <g:shipping>`,
    `        <g:country>DK</g:country>`,
    `        <g:price>0.00 DKK</g:price>`,
    `      </g:shipping>`,
    `    </item>`,
  ];

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = createAdminClient();

  // Fetch accessories (sku_products with category='accessory', not spare-parts)
  const { data: skuProducts, error: skuError } = await supabase
    .from("sku_products")
    .select(
      "id, title, slug, subcategory, brand, selling_price, sale_price, images, ean, product_number, description, short_description, status, is_active, always_in_stock, created_at, updated_at"
    )
    .eq("status", "published")
    .eq("is_active", true)
    .eq("category", "accessory")
    .neq("subcategory", "spare-part")
    .order("created_at", { ascending: false });

  if (skuError) {
    return new NextResponse(`Feed error: ${skuError.message}`, { status: 500 });
  }

  // Fetch all listed devices joined with their published templates
  const { data: devices, error: deviceError } = await supabase
    .from("devices")
    .select(
      "id, template_id, grade, storage, color, selling_price, photos, status"
    )
    .eq("status", "listed");

  if (deviceError) {
    return new NextResponse(`Feed error: ${deviceError.message}`, {
      status: 500,
    });
  }

  // Fetch published templates for those devices
  const templateIds = [
    ...new Set((devices ?? []).map((d) => d.template_id)),
  ];

  let templateMap = new Map<string, ProductTemplate>();
  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from("product_templates")
      .select("*")
      .eq("status", "published")
      .in("id", templateIds);

    for (const t of templates ?? []) {
      templateMap.set(t.id, t as ProductTemplate);
    }
  }

  // Build accessory items
  const accessoryItems: string[] = [];
  for (const product of skuProducts ?? []) {
    const item = buildAccessoryItem(product as unknown as SkuProduct);
    if (item) accessoryItems.push(item);
  }

  // Build device items
  const deviceItems: string[] = [];
  for (const device of devices ?? []) {
    const template = templateMap.get(device.template_id);
    if (!template) continue;
    const item = buildDeviceItem({
      ...(device as unknown as Device),
      template,
    });
    if (item) deviceItems.push(item);
  }

  const allItems = [...accessoryItems, ...deviceItems];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>PhoneSpot</title>
    <link>${BASE_URL}</link>
    <description>Refurbished telefoner, reparation og tilbehoer</description>
${allItems.join("\n")}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
