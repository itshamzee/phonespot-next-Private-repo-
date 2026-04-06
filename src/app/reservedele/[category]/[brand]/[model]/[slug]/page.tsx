import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getSparePartBySlug,
  getSparePartCategoryBySlug,
  getQualityAlternatives,
  getEffectiveWarranty,
} from "@/lib/supabase/spare-parts";
import { QualityBadge } from "@/components/spare-parts/quality-badge";
import { QualityAlternativesWrapper } from "./quality-alternatives-wrapper";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import { ImageGalleryClient } from "./image-gallery-client";
import { AddToCartSection } from "./add-to-cart-section";

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalise(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function modelFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; brand: string; model: string; slug: string }>;
}): Promise<Metadata> {
  const { category: categorySlug, brand: brandSlug, model: modelSlug, slug } = await params;
  const product = await getSparePartBySlug(slug);
  if (!product) return { title: "Ikke fundet — PhoneSpot" };

  const price = Math.round((product.sale_price ?? product.selling_price) / 100);
  const qualityName = product.quality_tier?.name ?? "";
  const titleParts = [
    product.title,
    qualityName ? `(${qualityName})` : null,
    `— ${price} kr`,
    "| PhoneSpot",
  ].filter(Boolean);
  const titleStr = titleParts.join(" ");

  return {
    title: titleStr,
    description:
      product.meta_description ??
      product.short_description ??
      `Køb ${product.title} hos PhoneSpot. Leveret med garanti og gratis fragt i Danmark.`,
    alternates: {
      canonical: `https://phonespot.dk/reservedele/${categorySlug}/${brandSlug}/${modelSlug}/${slug}`,
    },
    openGraph: {
      title: titleStr,
      images: product.images[0] ? [{ url: product.images[0] }] : [],
    },
  };
}

// ---------------------------------------------------------------------------
// Image gallery (server shell — delegates interactivity to client component)
// ---------------------------------------------------------------------------

function ImageGallery({ images, title }: { images: string[]; title: string }) {
  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
          className="h-16 w-16 text-[#E5E5EA]"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
      </div>
    );
  }

  return <ImageGalleryClient images={images} title={title} />;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SparePartDetailPage({
  params,
}: {
  params: Promise<{ category: string; brand: string; model: string; slug: string }>;
}) {
  const { category: categorySlug, brand: brandSlug, model: modelSlug, slug } = await params;

  const [product, category] = await Promise.all([
    getSparePartBySlug(slug),
    getSparePartCategoryBySlug(categorySlug),
  ]);

  if (!product || !category) notFound();

  const alternatives =
    product.part_category_id && product.device_model
      ? await getQualityAlternatives(product.part_category_id, product.device_model, product.id)
      : [];

  const warrantyMonths = getEffectiveWarranty(product);
  const displayPrice = product.sale_price ?? product.selling_price;
  const brandName = capitalise(brandSlug);
  const modelName = modelFromSlug(modelSlug);

  const availability = product.always_in_stock
    ? "https://schema.org/InStock"
    : "https://schema.org/PreOrder";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.short_description ?? product.description ?? undefined,
    sku: product.product_number ?? product.id,
    brand: {
      "@type": "Brand",
      name: product.device_brand ?? brandName,
    },
    image: product.images,
    offers: {
      "@type": "Offer",
      url: `https://phonespot.dk/reservedele/${categorySlug}/${brandSlug}/${modelSlug}/${slug}`,
      priceCurrency: "DKK",
      price: (displayPrice / 100).toFixed(2),
      availability,
      seller: {
        "@type": "Organization",
        name: STORE.name,
      },
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div className="border-b border-[#E5E5EA] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav
            aria-label="Brødkrumme"
            className="flex flex-wrap items-center gap-1.5 text-sm text-[#86868B]"
          >
            <Link href="/reservedele" className="transition-colors hover:text-[#111111]">
              Reservedele
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href={`/reservedele/${categorySlug}`}
              className="transition-colors hover:text-[#111111]"
            >
              {category.name}
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href={`/reservedele/${categorySlug}/${brandSlug}`}
              className="transition-colors hover:text-[#111111]"
            >
              {brandName}
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href={`/reservedele/${categorySlug}/${brandSlug}/${modelSlug}`}
              className="transition-colors hover:text-[#111111]"
            >
              {modelName}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="max-w-[200px] truncate font-medium text-[#111111]">
              {product.title}
            </span>
          </nav>
        </div>
      </div>

      {/* ── Main product layout ─────────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">

            {/* Left: image gallery */}
            <ImageGallery images={product.images} title={product.title} />

            {/* Right: product details */}
            <div className="flex flex-col gap-5">

              {/* Quality badge */}
              {product.quality_tier && (
                <div>
                  <QualityBadge
                    name={product.quality_tier.name}
                    badgeColor={product.quality_tier.badge_color}
                    badgeTextColor={product.quality_tier.badge_text_color}
                    description={product.quality_tier.description}
                    size="md"
                  />
                </div>
              )}

              {/* H1 title */}
              <h1 className="font-display text-2xl font-bold leading-tight text-[#111111] sm:text-3xl">
                {product.title}
              </h1>

              {/* Device compatibility */}
              {product.device_model && (
                <p className="text-sm text-[#86868B]">
                  <span className="font-medium text-[#111111]">Kompatibel med:</span>{" "}
                  {[product.device_brand, product.device_model].filter(Boolean).join(" ")}
                </p>
              )}

              {/* Model codes */}
              {product.device_model_codes && product.device_model_codes.length > 0 && (
                <p className="text-sm text-[#86868B]">
                  <span className="font-medium text-[#111111]">Modelkoder:</span>{" "}
                  {product.device_model_codes.join(", ")}
                </p>
              )}

              {/* Product number / SKU */}
              {product.product_number && (
                <p className="text-sm text-[#86868B]">
                  <span className="font-medium text-[#111111]">Varenr.:</span>{" "}
                  {product.product_number}
                </p>
              )}

              {/* Warranty */}
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5 shrink-0 text-[#1A3D2E]"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
                <span className="text-sm font-medium text-[#111111]">
                  {warrantyMonths}{" "}
                  {warrantyMonths === 1 ? "måneds" : "måneders"} garanti
                </span>
              </div>

              {/* Stock status */}
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    product.always_in_stock ? "bg-green-500" : "bg-amber-400"
                  }`}
                  aria-hidden="true"
                />
                <span className="text-sm text-[#86868B]">
                  {product.always_in_stock
                    ? "På lager — sendes inden for 1-2 hverdage"
                    : "Bestillingsvare — leveringstid 3-7 hverdage"}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-[#E5E5EA]" />

              {/* Add to cart (client) — handles both with/without color variants */}
              <AddToCartSection
                product={{
                  id: product.id,
                  title: product.title,
                  images: product.images,
                  selling_price: product.selling_price,
                  sale_price: product.sale_price,
                  is_inquiry_only: product.is_inquiry_only,
                  color_variants: product.color_variants ?? [],
                }}
                warrantyMonths={warrantyMonths}
                withColorPicker={(product.color_variants ?? []).length > 0}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Quality alternatives ─────────────────────────────────────────────── */}
      {alternatives.length > 0 && (
        <section className="border-t border-[#E5E5EA] bg-[#F7F7F8]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <QualityAlternativesWrapper
              alternatives={alternatives}
              currentProductId={product.id}
              categorySlug={categorySlug}
              brandSlug={brandSlug}
              modelSlug={modelSlug}
            />
          </div>
        </section>
      )}

      {/* ── Product specifications ───────────────────────────────────────────── */}
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <section className="border-t border-[#E5E5EA] bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <h2 className="mb-6 font-display text-lg font-bold text-[#111111]">
              Produktinformation
            </h2>
            <div className="overflow-hidden rounded-xl border border-[#E5E5EA]">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-[#E5E5EA]">
                  {Object.entries(product.specifications).map(([key, value], i) => (
                    <tr key={key} className={i % 2 === 0 ? "bg-[#F7F7F8]" : "bg-white"}>
                      <td className="w-2/5 px-5 py-3 font-medium text-[#111111]">{key}</td>
                      <td className="px-5 py-3 text-[#86868B]">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── Quality guide ────────────────────────────────────────────────────── */}
      {product.quality_tier && (
        <section className="border-t border-[#E5E5EA] bg-[#F7F7F8]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <h2 className="mb-4 font-display text-lg font-bold text-[#111111]">
              Kvalitetsguide
            </h2>
            <div className="rounded-xl border border-[#E5E5EA] bg-white p-6">
              <div className="mb-3 flex items-center gap-3">
                <QualityBadge
                  name={product.quality_tier.name}
                  badgeColor={product.quality_tier.badge_color}
                  badgeTextColor={product.quality_tier.badge_text_color}
                  size="md"
                />
                <span className="font-semibold text-[#111111]">
                  {product.quality_tier.name}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[#111111]/70">
                {product.quality_tier.description}
              </p>
              {product.quality_tier.specifications &&
                Object.keys(product.quality_tier.specifications).length > 0 && (
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Object.entries(product.quality_tier.specifications).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#1A3D2E]"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                        <span>
                          <span className="font-medium text-[#111111]">{key}:</span>{" "}
                          <span className="text-[#86868B]">{value}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </section>
      )}

      {/* ── Warranty + trust ─────────────────────────────────────────────────── */}
      <section className="border-t border-[#E5E5EA] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="mb-6 font-display text-lg font-bold text-[#111111]">Garanti</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

            {/* Warranty */}
            <div className="rounded-xl border border-[#E5E5EA] p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#1A3D2E]/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5 text-[#1A3D2E]"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
              </div>
              <p className="font-semibold text-[#111111]">
                {warrantyMonths}{" "}
                {warrantyMonths === 1 ? "måneds" : "måneders"} garanti
              </p>
              <p className="mt-1 text-xs text-[#86868B]">
                Dækker fabriksfejl og defekter ved normal brug.
              </p>
            </div>

            {/* Shipping */}
            <div className="rounded-xl border border-[#E5E5EA] p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#1A3D2E]/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5 text-[#1A3D2E]"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                  />
                </svg>
              </div>
              <p className="font-semibold text-[#111111]">Gratis fragt</p>
              <p className="mt-1 text-xs text-[#86868B]">
                Gratis levering i hele Danmark ved køb over 500 kr.
              </p>
            </div>

            {/* Returns */}
            <div className="rounded-xl border border-[#E5E5EA] p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#1A3D2E]/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5 text-[#1A3D2E]"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3"
                  />
                </svg>
              </div>
              <p className="font-semibold text-[#111111]">14 dages returret</p>
              <p className="mt-1 text-xs text-[#86868B]">
                Fuld returret inden for 14 dage fra levering.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
