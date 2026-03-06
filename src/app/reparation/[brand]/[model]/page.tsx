import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { FadeIn } from "@/components/ui/fade-in";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import {
  getBrandBySlug,
  getModelBySlug,
  getServicesByModel,
  getAllModelSlugs,
} from "@/lib/supabase/repairs";

export const revalidate = 3600;

type Props = {
  params: Promise<{ brand: string; model: string }>;
};

/* ---------- Static params ---------- */

export async function generateStaticParams() {
  const slugs = await getAllModelSlugs();
  return slugs.map(({ brand, model }) => ({ brand, model }));
}

/* ---------- Metadata ---------- */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand: brandSlug, model: modelSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return {};
  const model = await getModelBySlug(brand.id, modelSlug);
  if (!model) return {};
  return {
    title: `${model.name} Reparation Slagelse | PhoneSpot`,
    description: `Få din ${model.name} repareret i Slagelse. Se priser på skærmskift, batteriskift og mere. Garanti på alle reparationer.`,
    alternates: {
      canonical: `https://phonespot.dk/reparation/${brand.slug}/${model.slug}`,
    },
  };
}

/* ---------- Page ---------- */

export default async function ModelPricePage({ params }: Props) {
  const { brand: brandSlug, model: modelSlug } = await params;

  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const model = await getModelBySlug(brand.id, modelSlug);
  if (!model) notFound();

  const services = await getServicesByModel(model.id);

  /* ---------- JSON-LD ---------- */

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: STORE.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: STORE.street,
      addressLocality: STORE.city,
      postalCode: STORE.zip,
      addressCountry: STORE.countryCode,
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${model.name} Reparation`,
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name },
        price: s.price_dkk,
        priceCurrency: "DKK",
      })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Hero / Header */}
      <SectionWrapper background="default" className="!pb-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-1.5 text-sm text-gray">
            <li>
              <Link
                href="/reparation"
                className="text-green-eco hover:underline"
              >
                Reparation
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/reparation/${brand.slug}`}
                className="text-green-eco hover:underline"
              >
                {brand.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-charcoal font-medium">{model.name}</li>
          </ol>
        </nav>

        <FadeIn>
          <Heading as="h1" size="lg">
            {model.name} Reparation Slagelse
          </Heading>
          <p className="mt-4 max-w-2xl text-lg text-gray">
            Se priser og book din reparation. Garanti på alle reparationer.
          </p>
        </FadeIn>
      </SectionWrapper>

      {/* Price table */}
      <SectionWrapper background="sand" className="!pt-0">
        <FadeIn>
          <div className="mx-auto max-w-3xl rounded-2xl bg-white shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-soft-grey px-6 py-4 text-sm font-semibold uppercase tracking-wide text-charcoal">
              <span>Reparation</span>
              <span className="text-right">Pris</span>
              <span className="sr-only">Handling</span>
            </div>

            {/* Rows */}
            {services.length === 0 && (
              <div className="px-6 py-10 text-center text-gray">
                Ingen reparationer tilgængelige for denne model endnu.
              </div>
            )}

            {services.map((service, i) => (
              <div
                key={service.id}
                className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-sand/50 ${
                  i % 2 === 1 ? "bg-warm-white" : ""
                } ${i < services.length - 1 ? "border-b border-soft-grey/50" : ""}`}
              >
                <span className="text-sm font-medium text-charcoal md:text-base">
                  {service.name}
                </span>
                <span className="whitespace-nowrap text-sm font-semibold text-charcoal md:text-base">
                  {service.price_dkk === 0
                    ? "Gratis"
                    : `${service.price_dkk} DKK`}
                </span>
                <Link
                  href={`/reparation/booking?brand=${brand.slug}&model=${model.slug}&service=${service.slug}`}
                  className="inline-flex items-center justify-center rounded-full bg-green-eco px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-eco/90"
                >
                  Book reparation
                </Link>
              </div>
            ))}
          </div>
        </FadeIn>
      </SectionWrapper>

      {/* Trust section */}
      <SectionWrapper background="default">
        <FadeIn>
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {/* Garanti */}
            <div className="rounded-xl border border-soft-grey bg-white p-5 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center text-green-eco">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-7 w-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-charcoal">
                Garanti på alle reparationer
              </p>
            </div>

            {/* Hurtig service */}
            <div className="rounded-xl border border-soft-grey bg-white p-5 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center text-green-eco">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-7 w-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-charcoal">
                Hurtig service — 1-3 hverdage
              </p>
            </div>

            {/* Faste priser */}
            <div className="rounded-xl border border-soft-grey bg-white p-5 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center text-green-eco">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-7 w-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 6h.008v.008H6V6Z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-charcoal">
                Faste priser — ingen overraskelser
              </p>
            </div>
          </div>
        </FadeIn>
      </SectionWrapper>

      {/* SEO content */}
      <SectionWrapper background="sand">
        <FadeIn>
          <div className="mx-auto max-w-3xl">
            <Heading as="h2" size="sm" className="mb-4">
              {model.name} reparation hos PhoneSpot i Slagelse
            </Heading>
            <p className="text-base leading-relaxed text-gray">
              Har din {model.name} brug for en reparation? Hos PhoneSpot i{" "}
              {STORE.mall}, {STORE.city}, tilbyder vi professionel reparation af
              din {model.name} til faste priser. Alle reparationer udføres af
              erfarne teknikere, og du får garanti på arbejdet. Vi bruger
              kvalitetsdele og sikrer, at din enhed fungerer som ny efter
              reparationen. Se priserne ovenfor, og book din reparation med det
              samme.
            </p>
          </div>
        </FadeIn>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper background="default">
        <FadeIn>
          <div className="text-center">
            <Heading as="h2" size="sm" className="mb-4">
              Har du spørgsmål?
            </Heading>
            <p className="mb-6 text-gray">
              Kontakt os, og vi hjælper dig med din {model.name} reparation.
            </p>
            <Link
              href="/kontakt"
              className="inline-flex items-center justify-center rounded-full bg-charcoal px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-charcoal/90"
            >
              Kontakt os
            </Link>
          </div>
        </FadeIn>
      </SectionWrapper>
    </>
  );
}
