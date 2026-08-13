import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";
import { FilteredGrid } from "@/components/product/filtered-grid";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Refurbished Apple Watch - Spar op til 50% | PhoneSpot",
  description:
    "Køb kvalitetstestede refurbished Apple Watch med 36 måneders garanti. Apple Watch SE, Series 7, 8, 9 og Ultra — alle testet med 30+ kontroller.",
  alternates: { canonical: "https://phonespot.dk/smartwatches" },
  openGraph: {
    title: "Refurbished Apple Watch - Spar op til 50% | PhoneSpot",
    description:
      "Køb kvalitetstestede refurbished Apple Watch med 36 måneders garanti. Apple Watch SE, Series 7, 8, 9 og Ultra — alle testet med 30+ kontroller.",
    url: "https://phonespot.dk/smartwatches",
  },
};

const SMARTWATCH_FAQ = [
  {
    question: "Hvilken Apple Watch skal jeg vælge?",
    answer:
      "Det afhænger af dit budget og behov. Apple Watch SE er perfekt til fitness-tracking og notifikationer til en skarp pris. Series 7-8 giver dig altid-tændt skærm og avanceret sundhedsmonitorering. Series 9 og Ultra er det ultimative for sportsudøvere og tech-entusiaster.",
  },
  {
    question: "Er en refurbished Apple Watch vandtæt?",
    answer:
      "Ja. Alle Apple Watch-modeller fra Series 2 og nyere har en vandtæthed på WR50 (50 meter). Vi tester vandtætheden som en del af vores 30+ kvalitetskontroller, så du kan trygt bruge dit ur til svømning og i regnvejr.",
  },
  {
    question: "Kan jeg bruge den med min iPhone?",
    answer:
      "Ja — Apple Watch kræver en iPhone 8 eller nyere for opsætning og daglig brug. Alle vores Apple Watches er ulåste og klar til parring med din iPhone fra dag ét.",
  },
  {
    question: "Hvad med batteriet?",
    answer:
      "Vi tester alle batterier med professionelt værktøj. Grade A får altid isat et nyt batteri, så du får 100% kapacitet. Grade B kræver min. 80%, Grade C min. 75%. De fleste Apple Watches holder en hel dag på en opladning, og vi oplyser altid batterikapaciteten.",
  },
  {
    question: "Får jeg den nyeste watchOS?",
    answer:
      "Vi opdaterer alle Apple Watches til den nyeste kompatible watchOS-version før afsendelse. Apple Watch Series 4 og nyere kører den seneste watchOS.",
  },
  {
    question: "Kommer der tilbehør med?",
    answer:
      "Alle Apple Watches leveres med magnetisk oplader. Remmen der sidder på uret følger med. Du kan altid tilkøbe ekstra remme i andre farver og materialer.",
  },
];

const COMPARISON = [
  { feature: "Pris", new: "2.149-6.399 kr", refurbished: "1.099-4.500 kr" },
  { feature: "Garanti", new: "24 mdr. (Apple)", refurbished: "36 mdr. (PhoneSpot)" },
  { feature: "Test", new: "Fabrikskontrol", refurbished: "30+ individuelle tests" },
  { feature: "Batteri", new: "100% kapacitet", refurbished: "75-100% (Grade A: nyt batteri)" },
  { feature: "watchOS", new: "Nyeste version", refurbished: "Nyeste version" },
  { feature: "Bæredygtighed", new: "Ny produktion", refurbished: "80% mindre CO₂" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SmartwatchesPage() {
  const templates = await getPublishedTemplates("smartwatch", { inStock: true });

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
            { "@type": "ListItem", position: 2, name: "Refurbished Smartwatches", item: "https://phonespot.dk/smartwatches" },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: SMARTWATCH_FAQ.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />

      {/* ── Compact hero ── */}
      <section className="bg-[#F7F7F8] border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 pt-3 pb-4 sm:pt-6 sm:pb-7">
          <nav className="mb-2 flex items-center gap-2 text-xs text-[#86868B]" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#111111] transition-colors">Forside</Link>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
            <span className="text-[#111111] font-medium">Refurbished Apple Watch</span>
          </nav>

          <h1 className="font-display text-[26px] sm:text-3xl font-bold tracking-tight text-[#111111] leading-tight">
            Refurbished Apple Watch
          </h1>
          <p className="mt-1 text-[13px] sm:text-sm text-[#6E6E73]">
            {templates.length} {templates.length === 1 ? "model" : "modeller"} · Apple-original · 36 mdr. garanti
          </p>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="bg-white border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:py-4">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-4 sm:gap-x-4 sm:gap-y-3 text-sm">
            {[
              {
                label: "100% Apple-original",
                sub: "Aldrig kopier eller B-ware",
                icon: <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />,
              },
              {
                label: "Vandtæt WR50",
                sub: "Testet til svømning og regn",
                icon: <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />,
              },
              {
                label: "30+ tests pr enhed",
                sub: "Skærm, batteri, sensorer mv.",
                icon: <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />,
              },
              {
                label: "36 mdr. garanti",
                sub: "+ 14 dages fortrydelsesret",
                icon: <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 1.998-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />,
              },
            ].map((item) => (
              <li key={item.label} className="flex items-start gap-2 sm:gap-2.5">
                <span className="mt-0.5 flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-[#1A3D2E]/10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#1A3D2E]" aria-hidden="true">
                    {item.icon}
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] sm:text-sm font-semibold text-[#111111] leading-tight">{item.label}</span>
                  <span className="hidden sm:block text-xs text-[#86868B] leading-tight mt-0.5">{item.sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── All Apple Watches grid with sidebar filters ── */}
      <section className="bg-white py-4 sm:py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4">
          <FilteredGrid
            templates={templates}
            heading="Alle Apple Watch på lager"
            promos={[{ position: 4, variant: "trust", href: "/kvalitet" }]}
          />
        </div>
      </section>

      {/* ── "Vi er her for dig" — contact strip ── */}
      <section className="bg-[#F7F7F8] border-t border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
          <div className="mx-auto max-w-3xl rounded-2xl border border-[#E5E5EA] bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-6 sm:text-left">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1A3D2E]/10">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-[#1A3D2E]" aria-hidden="true">
                  <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
                </svg>
              </span>
              <div className="flex-1">
                <h3 className="font-display text-xl font-bold tracking-tight text-[#111111]">Vi er her for dig</h3>
                <p className="mt-1.5 text-sm text-[#6E6E73] leading-relaxed">
                  Spørgsmål om en bestemt model, størrelse eller GPS vs Cellular?
                  Ring eller skriv — vi svarer typisk inden for 1 time i åbningstiden.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <a href="tel:+4561100048" className="inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#14301F]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
                  </svg>
                  61 10 00 48
                </a>
                <a href="mailto:info@phonespot.dk" className="text-xs text-[#6E6E73] hover:text-[#1A3D2E] transition-colors sm:text-right">info@phonespot.dk</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Condition walkthrough ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">Hvad betyder standen?</Heading>
          <p className="mt-4 text-[#86868B]">
            Alle Apple Watches er 100% funktionelle. Forskellen mellem
            graderne er udelukkende kosmetisk.
          </p>
        </div>
        <div className="mt-10">
          <ConditionExplainer />
        </div>
        <div className="mt-6 text-center">
          <Link href="/kvalitet" className="text-sm font-semibold text-[#1A3D2E] hover:underline">
            Læs mere om vores graderingssystem &rarr;
          </Link>
        </div>
      </SectionWrapper>

      {/* ── Hvorfor refurbished Apple Watch ── */}
      <SectionWrapper background="cream">
        <div className="grid items-center gap-6 sm:gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">Smart valg</p>
            <Heading as="h2" size="md">Hvorfor købe en refurbished Apple Watch?</Heading>
            <p className="mt-4 text-[#86868B] leading-relaxed">
              En ny Apple Watch koster fra 2.149 kr — den samme model fås fra
              langt mindre hos PhoneSpot, testet med 30+ kontroller og med 36
              måneders garanti.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Spar 30-50% sammenlignet med ny pris",
                "Samme watchOS, samme apps, samme sensorer",
                "80% mindre CO₂ end ny produktion",
                "36 måneders garanti og 14 dages returret",
                "Vandtæt WR50 — testet før forsendelse",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-[#111111]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-[#1A3D2E]" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-8 shadow-sm border border-[#E5E5EA]">
            <h3 className="mb-6 font-display text-lg font-bold text-[#111111]">Ny vs. PhoneSpot</h3>
            <div className="divide-y divide-[#E5E5EA]">
              {COMPARISON.map((row) => (
                <div key={row.feature} className="flex items-start gap-4 py-3">
                  <span className="w-24 shrink-0 text-sm font-semibold text-[#111111]">{row.feature}</span>
                  <span className="flex-1 text-sm text-[#86868B]">{row.new}</span>
                  <span className="flex-1 text-sm font-medium text-[#1A3D2E]">{row.refurbished}</span>
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
              { value: "30+", label: "Tests per enhed" },
              { value: "1.099 kr", label: "Billigste Apple Watch" },
              { value: "36", label: "Måneders garanti" },
              { value: "1-2", label: "Dages levering" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white border border-[#E5E5EA] p-6 text-center shadow-sm">
                <p className="font-display text-3xl font-bold text-[#1A3D2E] md:text-4xl">{stat.value}</p>
                <p className="mt-2 text-sm text-[#86868B]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">Spørgsmål om refurbished Apple Watch</Heading>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-[#E5E5EA]">
          {SMARTWATCH_FAQ.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer items-center justify-between font-display text-base font-semibold text-[#111111]">
                {item.question}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-[#86868B] transition-transform group-open:rotate-180" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#86868B]">{item.answer}</p>
            </details>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Trust ── */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>

      {/* ── CTA ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-2xl text-center">
          <Heading as="h2" size="md">Klar til at finde din Apple Watch?</Heading>
          <p className="mt-4 text-[#86868B]">
            Scroll op og udforsk vores udvalg — eller se vores tilbehør for at
            forny dit ur med en ny rem.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/tilbehoer" className="inline-block rounded-full bg-[#1A3D2E] px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90">
              Se tilbehør &amp; remme &rarr;
            </Link>
            <Link href="/kvalitet" className="inline-block rounded-full border-2 border-[#111111] px-8 py-3 font-semibold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white">
              Læs om vores kvalitet &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
