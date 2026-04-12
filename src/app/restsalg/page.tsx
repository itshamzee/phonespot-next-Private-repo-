import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";
import { FilteredGrid } from "@/components/product/filtered-grid";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Restsalg - Skarpe priser på refurbished enheder | PhoneSpot",
  description:
    "Restsalg hos PhoneSpot. Find iPhones, iPads, bærbare og smartwatches til ekstra skarpe priser. Alle enheder er kvalitetstestede med 36 måneders garanti.",
  alternates: { canonical: "https://phonespot.dk/restsalg" },
  openGraph: {
    title: "Restsalg - Skarpe priser på refurbished enheder | PhoneSpot",
    description:
      "Restsalg hos PhoneSpot. Find iPhones, iPads, bærbare og smartwatches til ekstra skarpe priser.",
    url: "https://phonespot.dk/restsalg",
  },
};

export default async function RestsalgPage() {
  const templates = await getPublishedTemplates(undefined, { inStock: true });

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
            { "@type": "ListItem", position: 2, name: "Restsalg", item: "https://phonespot.dk/restsalg" },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-[#F7F7F8] border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:py-12 md:py-16">
          <nav className="mb-6 flex items-center gap-2 text-sm text-[#86868B]" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#111111] transition-colors">Forside</Link>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
            <span className="text-[#111111] font-medium">Restsalg</span>
          </nav>

          <div className="max-w-2xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Restsalg
            </span>

            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#111111] md:text-5xl">
              Restsalg
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#86868B] md:text-lg">
              Alle vores enheder på lager til skarpe priser. Brug filtrene til at finde
              den rigtige enhed efter mærke, pris, stand og kategori.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <span className="flex items-center gap-2 text-[#111111]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
                <strong className="font-semibold">{templates.length} enheder på lager</strong>
              </span>
              <span className="text-[#E5E5EA]">|</span>
              <span className="flex items-center gap-2 text-[#111111]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
                <strong className="font-semibold">36 mdr. garanti</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* All devices with sidebar filters */}
      <SectionWrapper>
        <FilteredGrid templates={templates} heading="Alle enheder på lager" />
      </SectionWrapper>

      {/* Trust */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
