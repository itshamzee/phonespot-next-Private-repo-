import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { COMPARISONS } from "@/lib/comparisons";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { JsonLd } from "@/components/seo/json-ld";

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "Sammenligninger | PhoneSpot",
  description:
    "Sammenlign refurbished, brugt og ny elektronik. Se forskelle i garanti, priser, kvalitet og miljøpåvirkning.",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ComparisonIndexPage() {
  return (
    <>
      {/* Breadcrumb JSON-LD */}
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
              name: "Sammenligninger",
              item: "https://phonespot.dk/sammenlign",
            },
          ],
        }}
      />

      {/* Hero */}
      <SectionWrapper background="charcoal" className="!py-16 md:!py-20">
        <div className="text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[4px] text-green-eco">
            Sammenligninger
          </p>
          <Heading as="h1" size="lg" className="!text-white">
            Hvad skal du vaelge?
          </Heading>
          <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-white/70">
            Forstaa forskellen mellem refurbished, brugt og ny elektronik — og
            find ud af hvad der passer bedst til dig.
          </p>
        </div>
      </SectionWrapper>

      {/* Comparison cards */}
      <SectionWrapper>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {COMPARISONS.map((comparison) => (
            <Link
              key={comparison.slug}
              href={`/sammenlign/${comparison.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-sand/50 bg-white transition-shadow hover:shadow-lg"
            >
              {/* Card image */}
              <div className="relative aspect-[16/10] bg-cream">
                <Image
                  src={comparison.image}
                  alt={comparison.title}
                  fill
                  className="object-contain object-center p-8 transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {/* Overlay badge */}
                <div className="absolute left-4 top-4 rounded-full bg-charcoal/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {comparison.rows.length} sammenligninger
                </div>
              </div>

              {/* Card content */}
              <div className="flex flex-1 flex-col p-6">
                <Heading
                  as="h2"
                  size="sm"
                  className="transition-colors group-hover:text-green-eco"
                >
                  {comparison.title}
                </Heading>

                <p className="mt-3 line-clamp-3 flex-1 font-body text-sm leading-relaxed text-charcoal/60">
                  {comparison.metaDescription}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {comparison.rows.slice(0, 3).map((row) => (
                    <span
                      key={row.feature}
                      className="rounded-full bg-warm-white px-3 py-1 text-xs font-medium text-charcoal/60"
                    >
                      {row.feature}
                    </span>
                  ))}
                  {comparison.rows.length > 3 && (
                    <span className="rounded-full bg-warm-white px-3 py-1 text-xs font-medium text-charcoal/40">
                      +{comparison.rows.length - 3} mere
                    </span>
                  )}
                </div>

                <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-green-eco">
                  Se sammenligning
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </SectionWrapper>
    </>
  );
}
