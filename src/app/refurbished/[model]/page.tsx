import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

import {
  getModelPage,
  getAllModelSlugs,
  MODEL_PAGES,
} from "@/lib/model-pages";
import { getCollectionProducts } from "@/lib/shopify/client";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductCard } from "@/components/product/product-card";
import { TrustBar } from "@/components/ui/trust-bar";
import { FaqAccordion } from "@/components/ui/faq-accordion";

/* ------------------------------------------------------------------ */
/*  Static params                                                      */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return getAllModelSlugs();
}

/* ------------------------------------------------------------------ */
/*  Dynamic metadata                                                   */
/* ------------------------------------------------------------------ */

type PageProps = { params: Promise<{ model: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { model } = await params;
  const page = getModelPage(model);
  if (!page) return {};

  return {
    title: page.metaTitle,
    description: page.metaDescription,
  };
}

/* ------------------------------------------------------------------ */
/*  Collection handle → store slug mapping                             */
/* ------------------------------------------------------------------ */

const COLLECTION_SLUG_MAP: Record<string, string> = {
  iphones: "iphones",
  ipads: "ipads",
  computere: "baerbare",
  baerbare: "baerbare",
  smartphones: "smartphones",
  smartwatches: "smartwatches",
  "apple-watch": "smartwatches",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function ModelLandingPage({ params }: PageProps) {
  const { model } = await params;
  const page = getModelPage(model);
  if (!page) notFound();

  // Fetch products from Shopify and filter by model
  let filteredProducts: Awaited<
    ReturnType<typeof getCollectionProducts>
  > extends infer C
    ? C extends { products: infer P }
      ? P extends Array<infer T>
        ? T[]
        : never
      : never
    : never = [];

  try {
    const collection = await getCollectionProducts(page.collectionHandle);
    if (collection) {
      filteredProducts = collection.products.filter((p) =>
        p.title.toLowerCase().includes(page.filterTag.toLowerCase()),
      );
    }
  } catch {
    filteredProducts = [];
  }

  const collectionSlug =
    COLLECTION_SLUG_MAP[page.collectionHandle] ?? page.collectionHandle;

  // Build price range for JSON-LD
  const prices = filteredProducts
    .map((p) => parseFloat(p.priceRange.minVariantPrice.amount))
    .filter((n) => !isNaN(n) && n > 0);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;
  const highPrice = prices.length > 0 ? Math.max(...prices) : null;

  // Pick 3-4 highlighted specs for hero badges
  const highlightSpecs = page.specs.slice(0, 4);

  return (
    <>
      {/* ── JSON-LD: BreadcrumbList ── */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Forside",
              item: "https://phonespot.dk",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Refurbished",
              item: `https://phonespot.dk/${collectionSlug}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: page.title,
              item: `https://phonespot.dk/refurbished/${page.slug}`,
            },
          ],
        }}
      />

      {/* ── JSON-LD: FAQPage ── */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: page.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }}
      />

      {/* ── JSON-LD: Product ── */}
      {lowPrice !== null && highPrice !== null && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Product",
            name: `Refurbished ${page.title}`,
            description: page.metaDescription,
            brand: {
              "@type": "Brand",
              name: "Apple",
            },
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "DKK",
              lowPrice: lowPrice.toFixed(2),
              highPrice: highPrice.toFixed(2),
              offerCount: filteredProducts.length,
              availability: "https://schema.org/InStock",
              seller: {
                "@type": "Organization",
                name: "PhoneSpot",
              },
            },
          }}
        />
      )}

      {/* ── 1. Hero (charcoal bg) ── */}
      <SectionWrapper background="charcoal" className="!py-16 md:!py-20">
        <div className="mx-auto max-w-3xl">
          {/* Breadcrumb nav */}
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-white/50">
            <Link href="/" className="transition-colors hover:text-white">
              Forside
            </Link>
            <span>/</span>
            <Link
              href={`/${collectionSlug}`}
              className="transition-colors hover:text-white"
            >
              Refurbished
            </Link>
            <span>/</span>
            <span className="text-white/70">{page.title}</span>
          </nav>

          <Heading as="h1" size="xl" className="!text-white">
            {page.heroHeading}
          </Heading>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            {page.metaDescription}
          </p>

          {/* Key specs badges */}
          <div className="mt-8 flex flex-wrap gap-3">
            {highlightSpecs.map((spec) => (
              <span
                key={spec.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80"
              >
                <span className="font-semibold text-green-eco">
                  {spec.label}:
                </span>
                {spec.value}
              </span>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ── 2. Specs grid (white bg) ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-4xl">
          <Heading as="h2" size="md" className="mb-10 text-center">
            Specifikationer for {page.title}
          </Heading>
          <div className="grid gap-4 sm:grid-cols-2">
            {page.specs.map((spec) => (
              <div
                key={spec.label}
                className="flex items-start gap-4 rounded-2xl border border-sand bg-white p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-eco/10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-5 w-5 text-green-eco"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-display text-sm font-bold uppercase tracking-wider text-charcoal">
                    {spec.label}
                  </p>
                  <p className="mt-1 text-sm text-gray">{spec.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ── 3. Products ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            {page.title} p&aring; lager
          </Heading>
          <p className="mt-4 text-gray">
            {filteredProducts.length > 0
              ? `${filteredProducts.length} ${page.title}-enheder klar med 36 måneders garanti.`
              : `Vi har desværre ingen ${page.title} på lager lige nu.`}
          </p>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                collectionHandle={collectionSlug}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 text-center">
            <p className="text-gray">
              Ingen produkter i &oslash;jeblikket.{" "}
              <Link
                href={`/${collectionSlug}`}
                className="font-semibold text-green-eco hover:underline"
              >
                Se hele udvalget &rarr;
              </Link>
            </p>
          </div>
        )}
      </SectionWrapper>

      {/* ── 4. Grade explanation (sand bg) ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl">
          <Heading as="h2" size="md" className="mb-6 text-center">
            Hvad betyder graderingen?
          </Heading>
          <p className="font-body leading-relaxed text-charcoal/80">
            {page.gradeExplanation}
          </p>
          <div className="mt-6 text-center">
            <Link
              href="/kvalitet"
              className="text-sm font-semibold text-green-eco hover:underline"
            >
              L&aelig;s mere om vores kvalitetsproces &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>

      {/* ── 5. Why buy (white bg) ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-4xl">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <Heading as="h2" size="md" className="mb-6">
                Hvorfor k&oslash;be refurbished {page.title}?
              </Heading>
              <p className="font-body leading-relaxed text-charcoal/80">
                {page.whyBuy}
              </p>
            </div>
            <div className="rounded-2xl border border-sand bg-white p-8">
              <h3 className="mb-6 font-display text-lg font-bold text-charcoal">
                PhoneSpot-fordele
              </h3>
              <ul className="space-y-4">
                {[
                  {
                    title: "36 mdr. garanti",
                    desc: "Branchens bedste garanti på refurbished elektronik",
                  },
                  {
                    title: "Prismatch-garanti",
                    desc: "Find du den billigere? Vi matcher prisen",
                  },
                  {
                    title: "30+ kvalitetstests",
                    desc: "Grundig kontrol af alle funktioner og komponenter",
                  },
                  {
                    title: "14 dages returret",
                    desc: "Fuld returret — ingen spørgsmål stillet",
                  },
                ].map((usp) => (
                  <li
                    key={usp.title}
                    className="flex items-start gap-3"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="mt-0.5 h-5 w-5 shrink-0 text-green-eco"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="font-display text-sm font-bold text-charcoal">
                        {usp.title}
                      </p>
                      <p className="text-sm text-gray">{usp.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── 6. FAQ (sand bg) ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl">
          <Heading as="h2" size="md" className="mb-10 text-center">
            Ofte stillede sp&oslash;rgsm&aring;l om {page.title}
          </Heading>
          <FaqAccordion items={page.faq} />
        </div>
      </SectionWrapper>

      {/* ── 7. Related models (white bg) ── */}
      {page.relatedModels.length > 0 && (
        <SectionWrapper>
          <div className="mx-auto max-w-4xl">
            <Heading as="h2" size="md" className="mb-10 text-center">
              Relaterede modeller
            </Heading>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {page.relatedModels.map((relSlug) => {
                const related = MODEL_PAGES.find(
                  (m) => m.slug === relSlug,
                );
                if (!related) return null;

                return (
                  <Link
                    key={relSlug}
                    href={`/refurbished/${relSlug}`}
                    className="group rounded-2xl border border-sand bg-white p-6 transition-shadow hover:shadow-md"
                  >
                    <p className="font-display text-lg font-bold text-charcoal group-hover:text-green-eco">
                      {related.title}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-gray">
                      {related.metaDescription}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-green-eco">
                      Se model
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                        />
                      </svg>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ── 8. Trust bar (sand bg) ── */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>

      {/* ── 9. CTA ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-2xl text-center">
          <Heading as="h2" size="md">
            Udforsk hele vores udvalg
          </Heading>
          <p className="mt-4 text-gray">
            Se alle vores kvalitetstestede refurbished produkter med 36
            m&aring;neders garanti og prismatch.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={`/${collectionSlug}`}
              className="inline-flex items-center gap-2 rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se alle{" "}
              {collectionSlug === "iphones"
                ? "iPhones"
                : collectionSlug === "ipads"
                  ? "iPads"
                  : collectionSlug === "computere"
                    ? "computere"
                    : collectionSlug === "smartwatches"
                      ? "smartwatches"
                      : "produkter"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
            <Link
              href="/kvalitet"
              className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
            >
              L&aelig;s om vores kvalitet &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
