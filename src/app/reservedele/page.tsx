import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import { getSparePartCategories } from "@/lib/supabase/spare-parts";
import { SparePartsHero } from "@/components/spare-parts/spare-parts-hero";
import { SparePartsFilters } from "@/components/spare-parts/spare-parts-filters";
import { SparePartsGrid } from "@/components/spare-parts/spare-parts-grid";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Reservedele til iPhone, Samsung & MacBook — Gratis Fragt | PhoneSpot",
  description:
    "Køb originale og premium reservedele til alle enheder. Skærme, batterier, bagcovers og mere med op til 2 års garanti. Levering i hele Danmark.",
  alternates: { canonical: "https://phonespot.dk/reservedele" },
};

export default async function ReservedelePage() {
  const categories = await getSparePartCategories();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Reservedele",
    description: "Originale og premium reservedele til alle enheder",
    url: "https://phonespot.dk/reservedele",
    provider: {
      "@type": "LocalBusiness",
      name: STORE.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: STORE.street,
        addressLocality: STORE.city,
        postalCode: STORE.zip,
        addressCountry: "DK",
      },
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <SparePartsHero
        title="Reservedele til alle enheder"
        subtitle="Originale og premium reservedele med op til 2 års garanti. Levering i hele Danmark."
        showSearch
      />

      {/* Category grid */}
      <section className="bg-white border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="font-display text-xl font-bold text-[#111111] mb-6">
            Kategorier
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.slice(0, 12).map((cat) => (
              <Link
                key={cat.id}
                href={`/reservedele/${cat.slug}`}
                className="group flex flex-col items-center gap-2 rounded-xl border border-[#E5E5EA] bg-[#F7F7F8] p-4 text-center transition-all hover:border-[#1A3D2E] hover:bg-white"
              >
                <span className="text-sm font-medium text-[#111111] group-hover:text-[#1A3D2E]">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
          {categories.length > 12 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.slice(12).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/reservedele/${cat.slug}`}
                  className="rounded-full border border-[#E5E5EA] px-3 py-1 text-xs text-[#86868B] transition-colors hover:border-[#1A3D2E] hover:text-[#1A3D2E]"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Filter + Product grid */}
      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex gap-8">
            <SparePartsFilters />
            <div className="flex-1 min-w-0">
              <SparePartsGrid />
            </div>
          </div>
        </div>
      </section>

      {/* SEO text */}
      <section className="border-t border-[#E5E5EA] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold text-[#111111]">
            Reservedele til alle enheder
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#111111]/70">
            <p>
              Hos PhoneSpot tilbyder vi et bredt udvalg af reservedele til iPhone, Samsung, MacBook og mange
              flere mærker. Alle reservedele leveres med op til 2 års garanti og gratis fragt i hele Danmark.
            </p>
            <p>
              Vi fører reservedele i forskellige kvalitetsniveauer — fra budgetvenlige Standard In-Cell skærme
              til originale Service Pack dele direkte fra producenten. Uanset om du er professionel tekniker
              eller gør-det-selv reparatør, finder du den rigtige del til den rigtige pris.
            </p>
            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Kvalitet du kan stole på
            </h3>
            <p>
              Alle vores reservedele gennemgår kvalitetskontrol og leveres med garanti. Skærme og de fleste
              dele har op til 2 års garanti, mens batterier dækkes af 3 måneders garanti. Vi tilbyder
              Service Pack, Original, Premium OLED, Refurbished og Standard kvaliteter.
            </p>
            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Levering i hele Danmark
            </h3>
            <p>
              Vi leverer reservedele til hele Danmark. Du kan også afhente din bestilling gratis i vores
              butik i {STORE.mall}, {STORE.city}.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
