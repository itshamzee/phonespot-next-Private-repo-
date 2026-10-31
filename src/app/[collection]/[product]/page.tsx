import { notFound, permanentRedirect } from "next/navigation";
import { deviceCanonicalPath } from "@/lib/seo/device-meta";
import { isPublicAttribute } from "@/lib/product/internal-attributes";
import type { Metadata } from "next";
import Link from "next/link";
import { getCollectionConfig, isDeviceCategory } from "@/lib/collections";
import {
  getSkuProductBySlug,
  getPublishedSkuProducts,
  getTemplateBySlug,
} from "@/lib/supabase/product-queries";
import { skuProductToProduct } from "@/lib/supabase/product-adapter";

export const revalidate = 60;
import type { Product } from "@/lib/shopify/types";
import { ImageGalleryWithGrade } from "@/components/product/image-gallery-with-grade";
import { ProductInfo } from "@/components/product/product-info";
import { ProductDetails } from "@/components/product/product-details";
import { UpsellWrapper } from "@/components/product/upsell-wrapper";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ProductCard } from "@/components/product/product-card";
import { JsonLd } from "@/components/seo/json-ld";
import { ITEM_CONDITION } from "@/lib/seo/item-condition";
import { getDeviceFaq, getAccessoryFaq } from "@/lib/product/device-faq";

// Allow any product handle to be rendered on-demand (not just pre-built ones)
export const dynamicParams = true;

/* ------------------------------------------------------------------ */
/*  Device type helper                                                 */
/* ------------------------------------------------------------------ */

type DeviceType = "phone" | "watch" | "ipad" | "laptop";

function getDeviceTypeFromSlug(slug: string): DeviceType {
  if (slug.includes("watch") || slug.includes("smartwatch")) return "watch";
  if (slug.includes("ipad")) return "ipad";
  if (slug.includes("baerbar") || slug.includes("laptop")) return "laptop";
  return "phone";
}

/** Truncate to `max` chars without cutting a word in half (used for the
 *  meta-description fallback so it doesn't end mid-word). */
function truncateAtWord(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

// Danish labels for sku_products.attributes keys, shown in the accessory
// spec table (mirrors the map in components/product/accessory-detail.tsx).
// Keys below are every key found live in sku_products.attributes (queried
// 2026-08 across all statuses, not just published) — watt/charger_type/
// length/connector_type/case_type are in published SKUs today;
// protector_type/service_type are on draft SKUs (screen protectors, the
// battery-install service line) that publish without a code change.
const ACCESSORY_ATTRIBUTE_LABELS: Record<string, string> = {
  connector_type: "Stiktype",
  case_type: "Type",
  charger_type: "Type",
  protector_type: "Type",
  service_type: "Type",
  length: "Længde",
  width: "Bredde",
  material: "Materiale",
  color: "Farve",
  wattage: "Watt",
  watt: "Watt",
  compatibility: "Kompatibel med",
  weight: "Vægt",
  dimensions: "Mål",
  cable_length: "Kabellængde",
  screen_size: "Skærmstørrelse",
  protection_level: "Beskyttelsesniveau",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build Product JSON-LD for SEO / PriceRunner for a SKU product (accessory,
 * spare part, etc.). These have no `grade` column at all — they are new
 * goods, so they are always NewCondition. (Previously this hardcoded
 * RefurbishedCondition, which was wrong for every accessory in the catalog.)
 */
function getProductJsonLd(product: Product, url: string): Record<string, unknown> {
  const price = product.priceRange.minVariantPrice;
  const condition = ITEM_CONDITION.NEW;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.map((img) => img.url),
    brand: {
      "@type": "Brand",
      name: product.vendor || "PhoneSpot",
    },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: parseFloat(product.priceRange.minVariantPrice.amount),
      highPrice: parseFloat(product.priceRange.maxVariantPrice.amount),
      priceCurrency: price.currencyCode,
      availability: product.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: condition,
      seller: {
        "@type": "Organization",
        name: "PhoneSpot",
      },
      url,
    },
    ...(product.tags.find((t) => t.startsWith("ean:"))
      ? { gtin13: product.tags.find((t) => t.startsWith("ean:"))!.slice(4) }
      : {}),
    ...(product.tags.find((t) => t.startsWith("mpn:"))
      ? { mpn: product.tags.find((t) => t.startsWith("mpn:"))!.slice(4) }
      : {}),
  };
}


// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string; product: string }>;
}): Promise<Metadata> {
  const { collection: collectionSlug, product: productHandle } = await params;

  // Try product template first (devices: phones, watches, iPads, laptops)
  const template = await getTemplateBySlug(productHandle);
  if (template) {
    // Device templates redirect to /refurbished/<slug>; point metadata there.
    return {
      alternates: { canonical: `https://phonespot.dk${deviceCanonicalPath(productHandle)}` },
    };
  }

  // Fall back to SKU product
  const skuProduct = await getSkuProductBySlug(productHandle);
  if (!skuProduct) {
    return { title: "Produkt ikke fundet - PhoneSpot" };
  }
  const productData = skuProductToProduct(skuProduct);

  // `??` only catches null/undefined — but meta_title/meta_description in
  // sku_products come back as "" (empty string, not null) for most SKUs,
  // which `??` happily passes through. Next.js then omits the <title> tag
  // and <meta name="description"> entirely for an empty string, which is
  // exactly what shipped: this page had NO <title> and NO meta description
  // in production. `||` treats "" the same as missing and falls through to
  // the generated fallback.
  //
  // Most sku_products are accessories/spare parts (no 36-month device
  // warranty), but a handful — e.g. oneplus-10-pro-5g-256gb-12gb-rom
  // (category: "smartphone") — are genuine graded devices, which DO get
  // the 36-month warranty. See getAccessoryFaq / getDeviceFaq and
  // ProductDetails/ProductInfo/TrustBar `variant` below for the same
  // category-based split applied to on-page copy.
  const isDeviceSku = isDeviceCategory(skuProduct.category);
  // Don't prefix the brand if the product title already starts with it
  // (e.g. "Apple Smart Folio iPad Air 11\" Denim" already says "Apple" —
  // prefixing again would render "Apple Apple Smart Folio...").
  const brandPrefix =
    productData.vendor &&
    productData.vendor !== "PhoneSpot" &&
    !productData.title.toLowerCase().startsWith(productData.vendor.toLowerCase())
      ? `${productData.vendor} `
      : "";
  const title =
    productData.seo.title || `${brandPrefix}${productData.title} | PhoneSpot`;
  const description =
    productData.seo.description ||
    (skuProduct.short_description?.trim()
      ? skuProduct.short_description.trim()
      : `Køb ${productData.title} hos PhoneSpot. ${
          truncateAtWord(productData.description, 140) ||
          (isDeviceSku
            ? "Testet og klar til brug med 36 måneders garanti."
            : "Hurtig levering og 2 års reklamationsret.")
        }`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: productData.images[0]
        ? [{ url: productData.images[0].url }]
        : undefined,
      siteName: "PhoneSpot",
      locale: "da_DK",
      type: "website",
    },
    alternates: {
      canonical: `https://phonespot.dk/${collectionSlug}/${productHandle}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProductPage({
  params,
}: {
  params: Promise<{ collection: string; product: string }>;
}) {
  const { collection: collectionSlug, product: productHandle } = await params;

  // Look up collection config (may be null for spare-parts etc.)
  const config = getCollectionConfig(collectionSlug);

  // Device templates have ONE canonical URL: /refurbished/<slug>. Any other
  // collection prefix (/iphones/, /smartphones/, legacy nonsense) is a duplicate
  // that splits ranking signals, so it 308s. SKU products (accessories) stay.
  // Query strings are not forwarded: reading searchParams here would make every
  // accessory page dynamic. The feed links straight to /refurbished/.
  const template = await getTemplateBySlug(productHandle);
  if (template) {
    permanentRedirect(deviceCanonicalPath(productHandle));
  }

  // ---------------------------------------------------------------------------
  // Fall back to SKU product (accessories, parts, etc.)
  // ---------------------------------------------------------------------------
  const skuProduct = await getSkuProductBySlug(productHandle);
  if (!skuProduct) notFound();
  const product = skuProductToProduct(skuProduct);

  // Most published sku_products are accessories/spare parts, but a handful
  // — e.g. oneplus-10-pro-5g-256gb-12gb-rom (category: "smartphone") — are
  // genuine graded devices. Those get the 36-month device warranty
  // treatment (ImageGalleryWithGrade, ProductInfo, ProductDetails, FAQ,
  // TrustBar below); accessories/spare parts keep the statutory 2-year
  // reklamationsret treatment. Do not assume every sku_product is an
  // accessory — check skuProduct.category instead.
  const skuVariant: "device" | "accessory" = isDeviceCategory(skuProduct.category)
    ? "device"
    : "accessory";

  // The accessory's OWN specs (material, connector type, dimensions, etc.),
  // straight from its sku_products.attributes column — never a device
  // template's spec table matched by title keyword. Internal/bookkeeping
  // keys are hidden; everything else gets a Danish label where we have one.
  const accessorySpecs = Object.entries(skuProduct.attributes ?? {})
    .filter(
      ([key, value]) =>
        isPublicAttribute(key) && value !== null && value !== undefined && value !== "",
    )
    .map(([key, value]) => ({
      label: ACCESSORY_ATTRIBUTE_LABELS[key] ?? key.replace(/_/g, " "),
      value: String(value),
    }));

  // Fetch related products from same category
  const accessories: Product[] = [];
  let relatedProducts: Product[] = [];
  try {
    const related = await getPublishedSkuProducts(skuProduct.category ?? undefined);
    relatedProducts = related
      .filter((p) => p.slug !== productHandle)
      .slice(0, 4)
      .map(skuProductToProduct);
  } catch {
    relatedProducts = [];
  }

  const deviceType = getDeviceTypeFromSlug(collectionSlug);

  return (
    <>
      {/* Product JSON-LD for SEO / PriceRunner */}
      <JsonLd data={getProductJsonLd(product, `https://phonespot.dk/${collectionSlug}/${productHandle}`)} />

      {/* ── 1. Breadcrumbs ── */}
      <nav
        aria-label="Brødkrumme"
        className="mx-auto max-w-7xl px-4 pt-2 pb-1 md:pt-4 md:pb-2"
      >
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray">
          <li>
            <Link href="/" className="transition-colors hover:text-charcoal">
              Hjem
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/${collectionSlug}`}
              className="transition-colors hover:text-charcoal"
            >
              {config?.title ?? collectionSlug}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-charcoal font-medium truncate max-w-[200px] md:max-w-none">
            {product.title}
          </li>
        </ol>
      </nav>

      {/* ── 2. Product hero (two-column) ── */}
      <section className="mx-auto max-w-7xl px-4 py-4 md:py-12">
        <div className="grid gap-4 md:grid-cols-2 md:gap-12">
          <ImageGalleryWithGrade
            images={product.images}
            title={product.title}
            deviceType={deviceType}
            variant={skuVariant}
          />
          <div className="flex flex-col gap-4">
            <ProductInfo product={product} collectionSlug={collectionSlug} variant={skuVariant} />
          </div>
        </div>
      </section>

      {/*
        NOTE: the device-only "Hvad betyder standen?" (grade explainer) and
        "Med i pakken" (charger/warranty-cert box contents) sections
        that used to render unconditionally here were removed for the
        accessory branch. sku_products have no grade column at all — even
        the device-category ones (see skuVariant above) — so there's no A/B/C
        cosmetic grade to explain and no data to back a "ships with a
        charger + 36-month warranty cert" box-contents claim. That was false
        for e.g. a leather iPad case, and there's still no grade data for a
        device-category SKU like the OnePlus 10 Pro. See ProductDetails
        variant={skuVariant} below for the accurate replacement — it still
        makes the 36-month warranty claim for device-category SKUs, just
        without an invented box-contents/grade section.
      */}

      {/* ── 3. Om dette produkt ── */}
      <SectionWrapper background="cream">
        <Heading as="h2" size="md" className="mb-8 text-center">
          Om dette produkt
        </Heading>
        <ProductDetails product={product} variant={skuVariant} accessorySpecs={accessorySpecs} />
      </SectionWrapper>

      {/* ── 5. Accessory upsell (phones/smartphones only) ── */}
      {accessories.length > 0 && (deviceType === "phone") && (
        <SectionWrapper background="default">
          <Heading as="h2" size="md" className="mb-8 text-center">
            Beskyt din enhed
          </Heading>
          <UpsellWrapper accessories={accessories} />
        </SectionWrapper>
      )}

      {/* ── 6. Relaterede produkter ── */}
      {relatedProducts.length > 0 && (
        <SectionWrapper background="sand">
          <Heading as="h2" size="md" className="mb-10 text-center">
            Andre kunder kiggede også på
          </Heading>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                collectionHandle={collectionSlug}
              />
            ))}
          </div>
        </SectionWrapper>
      )}

      {/* ── 7. Produktspecifik FAQ ── */}
      <SectionWrapper background="default">
        <Heading as="h2" size="md" className="mb-8 text-center">
          Spørgsmål om dette produkt
        </Heading>
        <div className="mx-auto max-w-2xl divide-y divide-sand rounded-2xl border border-sand bg-white shadow-sm">
          {(skuVariant === "device" ? getDeviceFaq(product.title) : getAccessoryFaq(product.title)).map((faq) => (
            <details key={faq.q} className="group">
              <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-semibold text-charcoal transition-colors hover:text-green-eco">
                <span>{faq.q}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <div className="px-6 pb-5 text-sm leading-relaxed text-charcoal/70">{faq.a}</div>
            </details>
          ))}
        </div>
      </SectionWrapper>

      {/* ── 8. Trust bar — variant="accessory" swaps the 36-month device
             warranty claim for the statutory 2-year reklamationsret that
             applies to sku_products that AREN'T graded refurbished devices.
             Device-category SKUs (skuVariant === "device") keep the
             36-month claim, same as the template branch above. ── */}
      <SectionWrapper background="sand">
        <TrustBar variant={skuVariant} />
      </SectionWrapper>
    </>
  );
}
