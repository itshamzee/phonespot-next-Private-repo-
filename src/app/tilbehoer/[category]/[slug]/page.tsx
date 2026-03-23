import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSkuProductBySlug } from "@/lib/supabase/product-queries";
import { getAccessoryBySlug } from "@/lib/supabase/accessories";
import { createServerClient } from "@/lib/supabase/client";
import type { SkuProduct } from "@/lib/supabase/platform-types";
import { getCategoryConfig } from "@/lib/tilbehoer-config";
import { AccessoryDetail, type CrossSellProduct, type CompatibleDevice } from "@/components/product/accessory-detail";
import { JsonLd } from "@/components/seo/json-ld";
import { TrustBar } from "@/components/ui/trust-bar";
import { TrustpilotReviews } from "@/components/trustpilot/trustpilot-reviews";
import { extractColor, getColorLabel, getColorCss, type ColorSibling } from "@/lib/product-color-siblings";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

async function resolveProduct(slug: string): Promise<SkuProduct | null> {
  const sku = await getSkuProductBySlug(slug);
  if (sku) return sku;

  // Fallback: accessories table (old system)
  const acc = await getAccessoryBySlug(slug);
  if (!acc) return null;

  // Map Accessory → SkuProduct shape
  return {
    id: acc.id,
    title: acc.name,
    description: acc.description,
    ean: acc.ean,
    product_number: acc.sku,
    cost_price: acc.cost_price,
    selling_price: acc.price,
    sale_price: null,
    brand: acc.brand,
    category: "accessory",
    subcategory: null,
    supplier_id: null,
    images: acc.image_url ? [acc.image_url] : [],
    is_active: acc.status === "published",
    short_description: null,
    meta_title: null,
    meta_description: null,
    slug: acc.slug,
    variants: [],
    barcode: null,
    status: acc.status === "archived" ? "draft" : acc.status,
    always_in_stock: false,
    created_at: acc.created_at,
    updated_at: acc.updated_at,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, category } = await params;
  const product = await resolveProduct(slug);
  if (!product) return { title: "Produkt ikke fundet" };

  const catConfig = getCategoryConfig(category);

  // Fetch compatible devices for the meta description
  const supabase = createServerClient();
  const { data: templateLinks } = await supabase
    .from("sku_product_templates")
    .select("template_id, product_templates(display_name, brand)")
    .eq("sku_product_id", product.id)
    .limit(3);

  const compatibleDeviceNames: string[] = (templateLinks ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((l: any) => l.product_templates?.display_name)
    .filter(Boolean);

  const title = product.meta_title ?? `${product.title} | PhoneSpot`;

  let description: string;
  if (product.meta_description) {
    description = product.meta_description;
  } else {
    const brandSegment = product.brand ? ` fra ${product.brand}` : "";
    const deviceSegment =
      compatibleDeviceNames.length > 0
        ? ` til ${compatibleDeviceNames.slice(0, 2).join(" og ")}`
        : "";
    const bodyText =
      product.short_description ??
      catConfig?.description ??
      "Hurtig levering og skarpe priser.";
    description = `Koeb ${product.title}${brandSegment}${deviceSegment} hos PhoneSpot. ${bodyText} Fri fragt over 499 kr. 36 mdr. garanti.`;
  }

  return {
    title,
    description,
    alternates: { canonical: `https://phonespot.dk/tilbehoer/${category}/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://phonespot.dk/tilbehoer/${category}/${slug}`,
      images: product.images[0] ? [{ url: product.images[0] }] : [],
      type: "website",
    },
  };
}

export default async function AccessoryDetailPage({ params }: Props) {
  const { category, slug } = await params;

  const product = await resolveProduct(slug);
  if (!product) notFound();

  const catConfig = getCategoryConfig(category);
  const supabase = createServerClient();

  // ----------------------------------------------------------------
  // 1. Compatible devices
  // ----------------------------------------------------------------
  const { data: templateLinks } = await supabase
    .from("sku_product_templates")
    .select("template_id, product_templates(display_name, slug, category, brand)")
    .eq("sku_product_id", product.id);

  const compatibleDevices: CompatibleDevice[] = (templateLinks ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((l: any) => ({
      name: l.product_templates?.display_name as string,
      brand: (l.product_templates?.brand as string) ?? "",
    }))
    .filter((d: CompatibleDevice) => Boolean(d.name));

  // Template IDs this product is linked to
  const templateIds: string[] = (templateLinks ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((l: any) => l.template_id)
    .filter(Boolean);

  // ----------------------------------------------------------------
  // 2. Stock quantity
  // ----------------------------------------------------------------
  const { data: stockRows } = await supabase
    .from("sku_stock")
    .select("quantity")
    .eq("product_id", product.id);

  const stockQuantity: number | null =
    stockRows && stockRows.length > 0
      ? stockRows.reduce((sum: number, row: { quantity: number }) => sum + (row.quantity ?? 0), 0)
      : null;

  // ----------------------------------------------------------------
  // 3. Cross-sell products — share at least one template, different category
  // ----------------------------------------------------------------
  let crossSellProducts: CrossSellProduct[] = [];

  if (templateIds.length > 0) {
    // Determine opposite category for cross-sell
    const isCover =
      category === "covers" ||
      product.category === "cover" ||
      product.subcategory === "cover";

    const crossSellCategory = isCover ? "screen_protector" : "cover";

    // Find sku_product_ids linked to the same templates
    const { data: siblingLinks } = await supabase
      .from("sku_product_templates")
      .select("sku_product_id")
      .in("template_id", templateIds)
      .neq("sku_product_id", product.id)
      .limit(20);

    const siblingIds = [...new Set(
      (siblingLinks ?? []).map((l: { sku_product_id: string }) => l.sku_product_id),
    )];

    if (siblingIds.length > 0) {
      const { data: siblingProducts } = await supabase
        .from("sku_products")
        .select("id, title, slug, selling_price, sale_price, images, category, subcategory, status")
        .in("id", siblingIds)
        .eq("status", "published")
        .limit(6);

      if (siblingProducts) {
        // Prefer opposite category, then any sibling
        const filtered = (siblingProducts as CrossSellProduct[]).filter(
          (p) => p.subcategory === crossSellCategory,
        );
        crossSellProducts = (filtered.length > 0 ? filtered : siblingProducts as CrossSellProduct[]).slice(0, 3);
      }
    }
  }

  // ----------------------------------------------------------------
  // 4. Color siblings — auto-detect related products by title matching
  // ----------------------------------------------------------------
  let colorSiblings: ColorSibling[] = [];
  const colorInfo = extractColor(product.title);

  if (colorInfo) {
    // Search for products with similar base title (same product, different color)
    const { data: siblingRows } = await supabase
      .from("sku_products")
      .select("id, title, slug, images")
      .eq("status", "published")
      .eq("is_active", true)
      .eq("category", "accessory")
      .ilike("title", `${colorInfo.baseTitle}%`)
      .neq("id", product.id)
      .limit(10);

    if (siblingRows && siblingRows.length > 0) {
      // Current product as first swatch
      colorSiblings.push({
        id: product.id,
        title: product.title,
        slug: slug,
        color: colorInfo.color,
        colorLabel: getColorLabel(colorInfo.color),
        colorCss: getColorCss(colorInfo.color),
        image: product.images[0] ?? null,
        isCurrent: true,
      });

      // Add siblings that also have a detectable color
      for (const sib of siblingRows) {
        const sibColor = extractColor(sib.title);
        if (sibColor) {
          // Find the correct category slug for the sibling's URL
          const sibCatSlug = category; // same category since we're matching within accessories
          colorSiblings.push({
            id: sib.id,
            title: sib.title,
            slug: sib.slug,
            color: sibColor.color,
            colorLabel: getColorLabel(sibColor.color),
            colorCss: getColorCss(sibColor.color),
            image: Array.isArray(sib.images) && sib.images.length > 0 ? sib.images[0] : null,
            isCurrent: false,
          });
        }
      }

      // If only the current product was found (no real siblings), clear the array
      if (colorSiblings.length <= 1) {
        colorSiblings = [];
      }
    }
  }

  // ----------------------------------------------------------------
  // 5. JSON-LD structured data
  // ----------------------------------------------------------------
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
      { "@type": "ListItem", position: 2, name: "Tilbehoer", item: "https://phonespot.dk/tilbehoer" },
      {
        "@type": "ListItem",
        position: 3,
        name: catConfig?.label ?? category,
        item: `https://phonespot.dk/tilbehoer/${category}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.title,
        item: `https://phonespot.dk/tilbehoer/${category}/${slug}`,
      },
    ],
  };

  const price = product.sale_price ?? product.selling_price;
  const compatibleDeviceNames = compatibleDevices.map((d) => d.name);

  // Build SKU from barcode or ean
  const skuValue = product.barcode ?? product.ean ?? undefined;

  // gtin13: ean if exactly 13 digits
  const gtin13Value =
    product.ean && /^\d{13}$/.test(product.ean) ? product.ean : undefined;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? product.short_description ?? undefined,
    image: product.images,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    ...(skuValue && { sku: skuValue }),
    ...(gtin13Value && { gtin13: gtin13Value }),
    ...(compatibleDeviceNames.length > 0 && {
      isCompatibleWith: compatibleDeviceNames,
    }),
    offers: {
      "@type": "Offer",
      priceCurrency: "DKK",
      price: (price / 100).toFixed(2),
      availability:
        stockQuantity === null || stockQuantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "PhoneSpot" },
      url: `https://phonespot.dk/tilbehoer/${category}/${slug}`,
      warranty: "36 maneders garanti",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0",
          currency: "DKK",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "DK",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 2,
            unitCode: "DAY",
          },
        },
      },
    },
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={productJsonLd} />

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-charcoal/50" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-charcoal transition-colors">
            Forside
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/tilbehoer" className="hover:text-charcoal transition-colors">
            Tilbehoer
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/tilbehoer/${category}`} className="hover:text-charcoal transition-colors">
            {catConfig?.label ?? category}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-charcoal truncate max-w-[200px] sm:max-w-none">
            {product.title}
          </span>
        </nav>

        {/* Product detail */}
        <AccessoryDetail
          product={product}
          compatibleDevices={compatibleDevices}
          crossSellProducts={crossSellProducts}
          stockQuantity={stockQuantity}
          category={category}
          colorSiblings={colorSiblings}
        />

        {/* Trustpilot reviews — async server component via Suspense */}
        <div className="mt-12">
          <h2 className="mb-6 font-display text-xl font-bold text-charcoal">
            Anmeldelser fra vores kunder
          </h2>
          <Suspense
            fallback={
              <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-40 rounded-2xl border border-sand bg-white animate-pulse"
                  />
                ))}
              </div>
            }
          >
            <TrustpilotReviews />
          </Suspense>
        </div>

        {/* Trust bar */}
        <div className="mt-16">
          <TrustBar />
        </div>
      </div>
    </>
  );
}
