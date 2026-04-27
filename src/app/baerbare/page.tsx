import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";
import { FilteredGrid } from "@/components/product/filtered-grid";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Refurbished Bærbare - Fra 1.359 kr med 36 mdr. garanti | PhoneSpot",
  description:
    "Kvalitetstestede bærbare med 36 måneders garanti. Spar op til 40% og få en computer der er testet, rengjort og klar til brug.",
  alternates: { canonical: "https://phonespot.dk/baerbare" },
  openGraph: {
    title: "Refurbished Bærbare - Fra 1.359 kr med 36 mdr. garanti | PhoneSpot",
    description:
      "Kvalitetstestede bærbare med 36 måneders garanti. Spar op til 40% og få en computer der er testet, rengjort og klar til brug.",
    url: "https://phonespot.dk/baerbare",
  },
};

const LAPTOP_FAQ = [
  {
    question: "Hvilken bærbar skal jeg vælge til studiet?",
    answer:
      "Til studiet anbefaler vi en budget-bærbar med min. 8 GB RAM og SSD. De er robuste, har gode tastaturer og holder hele dagen på en opladning. Se vores budget-udvalg for modeller fra 1.359 kr.",
  },
  {
    question: "Hvad er forskellen på budget, mellem og premium?",
    answer:
      "Budget (under 2.000 kr) er perfekt til studiet og daglig brug. Mellem (2.000-4.000 kr) giver mere kraft til multitasking og kontor. Premium (over 4.000 kr) har de nyeste processorer og mest RAM til krævende opgaver. Alle er 100% testet med 36 måneders garanti.",
  },
  {
    question: "Hvor lang tid holder batteriet?",
    answer:
      "Alle vores bærbare har minimum 4 timers batterilevetid under realistisk brug. Mange modeller holder 6-8 timer. Vi oplyser altid batterisundhed, så du ved præcis hvad du får.",
  },
  {
    question: "Kan jeg opgradere RAM eller SSD bagefter?",
    answer:
      "De fleste af vores Lenovo ThinkPads tillader opgradering af RAM og SSD. Spørger du os, hjælper vi gerne med at finde de rigtige komponenter.",
  },
  {
    question: "Hvilken oplader følger med?",
    answer:
      "Alle bærbare leveres med en kompatibel oplader. Det er altid en funktionel oplader — enten original eller certificeret kompatibel.",
  },
  {
    question: "Hvad med garanti på en refurbished laptop?",
    answer:
      "Du får 36 måneders garanti fra PhoneSpot. Det dækker fabrikationsfejl og funktionelle mangler. Har du problemer, kontakt os — vi reparerer, bytter eller refunderer.",
  },
];

const COMPARISON = [
  { feature: "Pris (typisk)", new: "8.000-15.000 kr", refurbished: "1.359-5.339 kr" },
  { feature: "Garanti", new: "24 mdr. (producent)", refurbished: "36 mdr. (PhoneSpot)" },
  { feature: "Test", new: "Fabrikskontrol", refurbished: "30+ individuelle tests" },
  { feature: "Software", new: "Forinstalleret", refurbished: "Ren installation" },
  { feature: "Bæredygtighed", new: "Ny produktion", refurbished: "80% mindre CO2" },
  { feature: "Levering", new: "3-5 hverdage", refurbished: "1-2 hverdage" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BaerbarePage() {
  const templates = await getPublishedTemplates("laptop");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
            { "@type": "ListItem", position: 2, name: "Refurbished Bærbare", item: "https://phonespot.dk/baerbare" },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: LAPTOP_FAQ.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />

      {/* ── Compact hero ── */}
      <section className="bg-[#F7F7F8] border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10 md:py-12">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-2 text-sm text-[#86868B]" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#111111] transition-colors">Forside</Link>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
            <span className="text-[#111111] font-medium">Refurbished Bærbare</span>
          </nav>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] md:text-4xl lg:text-5xl">
            Refurbished Bærbare
          </h1>

          <p className="mt-3 max-w-xl text-base leading-relaxed text-[#86868B]">
            Kvalitetstestede laptops med 36 måneders garanti. Testet med 30+ kontroller og klar til brug.
          </p>

          {/* Quick stats */}
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2 text-[#111111]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              <strong className="font-semibold">Fra 1.359 DKK</strong>
            </span>
            <span className="text-[#E5E5EA]">|</span>
            <span className="flex items-center gap-2 text-[#111111]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]" aria-hidden="true">
                <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
              <strong className="font-semibold">{templates.length} modeller</strong>
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
      </section>

      {/* ── Featured products (Green.dk-inspired) ── */}
      {(() => {
        const sorted = [...templates].sort((a, b) => b.device_count - a.device_count);
        const featured = sorted[0];
        // Pick highlighted from different brands when possible
        const highlighted: typeof sorted = [];
        const usedBrands = new Set<string>();
        if (featured) usedBrands.add(featured.brand);
        for (const t of sorted.slice(1)) {
          if (highlighted.length >= 4) break;
          if (!usedBrands.has(t.brand) || sorted.filter(s => !usedBrands.has(s.brand) && s !== featured).length === 0) {
            highlighted.push(t);
            usedBrands.add(t.brand);
          }
        }
        // Fill remaining slots if we didn't get 4 unique brands
        if (highlighted.length < 4) {
          for (const t of sorted.slice(1)) {
            if (highlighted.length >= 4) break;
            if (!highlighted.includes(t)) highlighted.push(t);
          }
        }

        const formatPrice = (price: number) =>
          new Intl.NumberFormat("da-DK").format(price / 100);

        const getSpecLine = (t: typeof featured) => {
          const specs = t.specifications as Record<string, string> | null;
          if (!specs) return "";
          return [specs.processor, specs.ram, specs.storage, specs.screen_size]
            .filter(Boolean)
            .join(" · ");
        };

        if (!featured) return null;

        return (
          <section className="bg-white border-b border-[#E5E5EA]">
            <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
              {/* Section header */}
              <div className="mb-8">
                <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] md:text-3xl">
                  Bærbare du kan stole på
                </h2>
                <p className="mt-2 text-sm text-[#86868B]">
                  Altid 36 måneders garanti
                </p>
              </div>

              {/* Featured grid: large card + small cards */}
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
                {/* Large featured card */}
                <Link
                  href={`/refurbished/${featured.slug}`}
                  className="group lg:col-span-3 rounded-2xl bg-white border border-[#E5E5EA] shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="flex flex-col h-full">
                    <div className="relative aspect-[4/3] bg-[#F7F7F8] flex items-center justify-center overflow-hidden">
                      {featured.images?.[0] ? (
                        <Image
                          src={featured.images[0]}
                          alt={featured.display_name}
                          fill
                          className="object-contain p-6 group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 1024px) 100vw, 60vw"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full text-[#86868B]">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-16 w-16">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
                          </svg>
                        </div>
                      )}
                      {featured.device_count > 0 && (
                        <span className="absolute top-4 left-4 rounded-full bg-[#1A3D2E] px-3 py-1 text-xs font-semibold text-white">
                          {featured.device_count} på lager
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 p-4 sm:p-6">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#86868B]">
                        {featured.brand}
                      </p>
                      <h3 className="mt-1 font-display text-xl font-bold text-[#111111] md:text-2xl">
                        {featured.display_name}
                      </h3>
                      {getSpecLine(featured) && (
                        <p className="mt-2 text-sm text-[#86868B]">
                          {getSpecLine(featured)}
                        </p>
                      )}
                      <div className="mt-auto pt-4 flex items-end justify-between">
                        <div>
                          <p className="text-xs text-[#86868B]">fra</p>
                          <p className="font-display text-2xl font-bold text-[#111111]">
                            {featured.min_price
                              ? `${formatPrice(featured.min_price)} kr.`
                              : "Se pris"}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#1A3D2E] px-5 py-2.5 text-sm font-semibold text-white group-hover:opacity-90 transition-opacity">
                          Se mere
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Small highlighted cards — 2x2 grid */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
                  {highlighted.slice(0, 4).map((t) => (
                    <Link
                      key={t.id}
                      href={`/refurbished/${t.slug}`}
                      className="group flex flex-col rounded-xl bg-white border border-[#E5E5EA] hover:shadow-md transition-shadow overflow-hidden"
                    >
                      <div className="relative aspect-square bg-[#F7F7F8] flex items-center justify-center overflow-hidden">
                        {t.images?.[0] ? (
                          <Image
                            src={t.images[0]}
                            alt={t.display_name}
                            fill
                            className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 1024px) 50vw, 20vw"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full w-full text-[#86868B]">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-8 w-8">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col flex-1 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#86868B]">
                          {t.brand}
                        </p>
                        <h3 className="mt-0.5 text-sm font-semibold text-[#111111] line-clamp-2 leading-tight">
                          {t.display_name}
                        </h3>
                        <div className="mt-auto pt-2">
                          <p className="font-display text-base font-bold text-[#111111]">
                            {t.min_price
                              ? `fra ${formatPrice(t.min_price)} kr.`
                              : "Se pris"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── Trust strip ── */}
      <section className="bg-[#F7F7F8] border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4 md:gap-6">
            {[
              {
                label: "36 mdr. garanti",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                ),
              },
              {
                label: "30+ kvalitetstests",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                ),
              },
              {
                label: "1-3 dages levering",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                ),
              },
              {
                label: "14 dages returret",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl bg-white border border-[#E5E5EA] px-4 py-3"
              >
                <span className="shrink-0 text-[#1A3D2E]">{item.icon}</span>
                <span className="text-sm font-medium text-[#111111]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── All laptops grid with filters — immediately visible ── */}
      <SectionWrapper>
        <FilteredGrid templates={templates} heading="Alle bærbare" />
      </SectionWrapper>

      {/* ── Condition walkthrough ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            Hvad betyder standen?
          </Heading>
          <p className="mt-4 text-[#86868B]">
            Alle bærbare er 100% funktionelle. Forskellen mellem graderne er
            udelukkende kosmetisk.
          </p>
        </div>
        <div className="mt-10">
          <ConditionExplainer />
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/kvalitet"
            className="text-sm font-semibold text-[#1A3D2E] hover:underline"
          >
            Læs mere om vores graderingssystem &rarr;
          </Link>
        </div>
      </SectionWrapper>

      {/* ── Hvorfor refurbished laptop? ── */}
      <SectionWrapper background="cream">
        <div className="grid items-center gap-6 sm:gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
              Bæredygtigt valg
            </p>
            <Heading as="h2" size="md">
              Hvorfor købe en refurbished laptop?
            </Heading>
            <p className="mt-4 text-[#86868B] leading-relaxed">
              En ny laptop kræver råstoffer, energi og transport. Ved at
              vælge refurbished forlænger du enhedens levetid og reducerer
              e-affald med op til 80%.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Spar 20-40% sammenlignet med ny pris",
                "80% mindre CO2-aftryk end ny produktion",
                "Grundigere testet end en fabriksny enhed",
                "36 måneders garanti og 14 dages returret",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-[#111111]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#1A3D2E]"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-8 shadow-sm border border-[#E5E5EA]">
            <h3 className="mb-6 font-display text-lg font-bold text-[#111111]">
              Ny vs. PhoneSpot Refurbished
            </h3>
            <div className="divide-y divide-[#E5E5EA]">
              {COMPARISON.map((row) => (
                <div key={row.feature} className="flex items-start gap-4 py-3">
                  <span className="w-28 shrink-0 text-sm font-semibold text-[#111111]">
                    {row.feature}
                  </span>
                  <span className="flex-1 text-sm text-[#86868B]">{row.new}</span>
                  <span className="flex-1 text-sm font-medium text-[#1A3D2E]">
                    {row.refurbished}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Stats ── */}
      <section className="bg-[#F7F7F8] border-y border-[#E5E5EA] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {[
              { value: "30+", label: "Tests per computer" },
              { value: "4+", label: "Timers min. batteri" },
              { value: "36", label: "Måneders garanti" },
              { value: "1-2", label: "Dages levering" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white border border-[#E5E5EA] p-6 text-center shadow-sm">
                <p className="font-display text-3xl font-bold text-[#1A3D2E] md:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-[#86868B]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            Ofte stillede spørgsmål om bærbare
          </Heading>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-[#E5E5EA]">
          {LAPTOP_FAQ.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer items-center justify-between font-display text-base font-semibold text-[#111111]">
                {item.question}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 shrink-0 text-[#86868B] transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#86868B]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </SectionWrapper>

      {/* MacBook Reparation Cross-Link */}
      <SectionWrapper>
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-8 text-center">
            <h3 className="font-display text-xl font-bold text-[#111111]">
              Har du brug for MacBook reparation?
            </h3>
            <p className="mt-2 text-sm text-[#86868B]">
              Vi reparerer alle MacBook Air og MacBook Pro modeller. Skærmskift, batteriskift og mere — samme dag, uden tidsbestilling.
            </p>
            <div className="mt-4">
              <Link
                href="/reparation/macbook"
                className="inline-block rounded-full bg-[#1A3D2E] px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Se MacBook reparation &rarr;
              </Link>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Trust ── */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>

      {/* ── CTA ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-2xl text-center">
          <Heading as="h2" size="md">
            Find din næste bærbare
          </Heading>
          <p className="mt-4 text-[#86868B]">
            Alle computere er testet, rengjort og klar med 36 måneders garanti
            og 14 dages fortrydelsesret.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/baerbare"
              className="inline-block rounded-full bg-[#1A3D2E] px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se alle bærbare &rarr;
            </Link>
            <Link
              href="/kvalitet"
              className="inline-block rounded-full border-2 border-[#111111] px-8 py-3 font-semibold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
            >
              Læs om vores kvalitet &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
