import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSkuProductBySlug } from "@/lib/supabase/product-queries";
import { getAccessoryBySlug } from "@/lib/supabase/accessories";
import { createServerClient } from "@/lib/supabase/client";
import type { SkuProduct } from "@/lib/supabase/platform-types";
import { getCategoryConfig } from "@/lib/tilbehoer-config";
import { AccessoryDetail, type CrossSellProduct } from "@/components/product/accessory-detail";
import { JsonLd } from "@/components/seo/json-ld";
import { TrustBar } from "@/components/ui/trust-bar";
import { TrustpilotReviews } from "@/components/trustpilot/trustpilot-reviews";

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
    .select("template_id, product_templates(display_name)")
    .eq("sku_product_id", product.id)
    .limit(3);
  const compatibleDevices: string[] = (templateLinks ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((l: any) => l.product_templates?.display_name)
    .filter(Boolean);

  const title = product.meta_title ?? `${product.title} | PhoneSpot`;
  const deviceSuffix =
    compatibleDevices.length > 0
      ? ` Passer til: ${compatibleDevices.slice(0, 3).join(", ")}.`
      : "";

  const description =
    product.meta_description ??
    product.short_description ??
    `Koeb ${product.title} hos PhoneSpot.${deviceSuffix} ${
      catConfig?.description ?? "Hurtig levering og skarpe priser."
    } 36 mdr. garanti og 14 dages returret.`;

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
    .select("template_id, product_templates(display_name, slug, category)")
    .eq("sku_product_id", product.id);

  const compatibleDevices: string[] = (templateLinks ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((l: any) => l.product_templates?.display_name)
    .filter(Boolean);

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
        // Try to match the opposite category, but fall through if none found
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
  // 4. JSON-LD structured data
  // ----------------------------------------------------------------
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
      { "@type": "ListItem", position: 2, name: "Tilbehør", item: "https://phonespot.dk/tilbehoer" },
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
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? product.short_description ?? undefined,
    image: product.images,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    ...(compatibleDevices.length > 0 && {
      isCompatibleWith: compatibleDevices,
    }),
    offers: {
      "@type": "Offer",
      priceCurrency: "DKK",
      price: (price / 100).toFixed(0),
      availability:
        stockQuantity === null || stockQuantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "PhoneSpot" },
      url: `https://phonespot.dk/tilbehoer/${category}/${slug}`,
      warranty: "36 maneders garanti",
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
            Tilbehør
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
