import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLaptopBrand, getAllLaptopBrandSlugs } from "@/lib/laptop-brands";
import { searchProducts } from "@/lib/shopify/client";
import { BrandHero } from "@/components/collection/brand-hero";
import { ProductGrid } from "@/components/collection/product-grid";
import { TrustBar } from "@/components/ui/trust-bar";
import { FadeIn } from "@/components/ui/fade-in";

// ---------------------------------------------------------------------------
// Static generation
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return getAllLaptopBrandSlugs().map((slug) => ({ brand: slug }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand: slug } = await params;
  const brand = getLaptopBrand(slug);

  if (!brand) {
    return { title: "Ikke fundet - PhoneSpot" };
  }

  return {
    title: `${brand.title} - Refurbished Laptops | PhoneSpot`,
    description: brand.description,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function LaptopBrandPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: slug } = await params;
  const brand = getLaptopBrand(slug);

  if (!brand) {
    notFound();
  }

  let products: Awaited<ReturnType<typeof searchProducts>> = [];
  try {
    products = await searchProducts(brand.shopifyTag);
  } catch {
    // Shopify API not configured or unreachable
    products = [];
  }

  return (
    <>
      {/* Brand Hero */}
      <BrandHero title={brand.title} description={brand.description} />

      {/* Quality callouts */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {brand.qualityPoints.map((point, index) => (
            <FadeIn key={point} delay={index * 0.1}>
              <div className="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="mt-0.5 h-5 w-5 shrink-0 text-green-eco"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
                <span className="text-charcoal">{point}</span>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Product Grid */}
      <section className="mx-auto max-w-7xl px-4 pb-12 md:pb-16">
        <ProductGrid products={products} collectionHandle={brand.shopifyTag} />
      </section>

      {/* Trust Bar */}
      <TrustBar />
    </>
  );
}
