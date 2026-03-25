import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { ProductGridCard } from "@/components/product/product-grid-card";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Refurbished Apple Watch - Spar op til 50% | PhoneSpot",
  description:
    "Køb kvalitetstestede refurbished Apple Watch med 36 måneders garanti. Apple Watch SE, Series 7, 8, 9 og Ultra — alle testet med 30+ kontroller. Kæmpe tilbud lige nu!",
  alternates: { canonical: "https://phonespot.dk/smartwatches" },
  openGraph: {
    title: "Refurbished Apple Watch - Spar op til 50% | PhoneSpot",
    description: "Køb kvalitetstestede refurbished Apple Watch med 36 måneders garanti. Apple Watch SE, Series 7, 8, 9 og Ultra — alle testet med 30+ kontroller.",
    url: "https://phonespot.dk/smartwatches",
  },
};

const MODEL_TIERS = [
  {
    tier: "Budget",
    tagline: "Perfekt til basale behov",
    cardBg: "bg-white",
    cardBorder: "border border-[#E5E5EA]",
    badgeBg: "bg-[#E5E5EA]",
    badgeText: "text-[#111111]",
    taglineColor: "text-[#86868B]",
    iconColor: "text-[#86868B]",
    patterns: ["apple watch se", "apple watch series 3", "apple watch series 4", "galaxy watch 4"],
  },
  {
    tier: "Populær",
    tagline: "Bedste værdi for pengene",
    cardBg: "bg-[#F7F7F8]",
    cardBorder: "border-2 border-[#1A3D2E]/20",
    badgeBg: "bg-[#1A3D2E]",
    badgeText: "text-white",
    taglineColor: "text-[#1A3D2E]",
    iconColor: "text-[#1A3D2E]",
    patterns: ["apple watch series 5", "apple watch series 6", "apple watch series 7", "galaxy watch 5"],
  },
  {
    tier: "Premium",
    tagline: "Det bedste inden for smartwatches",
    cardBg: "bg-white",
    cardBorder: "border-2 border-[#111111]",
    badgeBg: "bg-[#111111]",
    badgeText: "text-white",
    taglineColor: "text-[#86868B]",
    iconColor: "text-[#111111]",
    patterns: ["apple watch series 8", "apple watch series 9", "apple watch ultra", "galaxy watch 6"],
  },
];

function TierIcon({ tier, className }: { tier: string; className?: string }) {
  if (tier === "Budget") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  if (tier === "Populær") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12l4.5 6-10.5 12L1.5 9 6 3Zm0 0 3 6m6-6-3 6m-6 0h12" />
    </svg>
  );
}

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
      "Vi tester alle batterier med professionelt værktøj. Grade A kræver min. 85% kapacitet, Grade B min. 80%, Grade C min. 75%. De fleste Apple Watches holder en hel dag på en opladning, og vi oplyser altid batterikapaciteten.",
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
  { feature: "Batteri", new: "100% kapacitet", refurbished: "Min. 80% (gradafhængig)" },
  { feature: "watchOS", new: "Nyeste version", refurbished: "Nyeste version" },
  { feature: "Bæredygtighed", new: "Ny produktion", refurbished: "80% mindre CO₂" },
];

export default async function SmartwatchesPage() {
  const templates = await getPublishedTemplates("smartwatch");

  const tierGroups = new Map<number, typeof templates>();
  for (const t of templates) {
    const name = t.display_name.toLowerCase();
    let matched = false;
    for (let i = MODEL_TIERS.length - 1; i >= 0; i--) {
      if (MODEL_TIERS[i].patterns.some((p) => name.includes(p))) {
        if (!tierGroups.has(i)) tierGroups.set(i, []);
        tierGroups.get(i)!.push(t);
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (!tierGroups.has(0)) tierGroups.set(0, []);
      tierGroups.get(0)!.push(t);
    }
  }

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

      {/* ── Hero ── */}
      <section className="bg-[#F7F7F8] border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-[#86868B]" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#111111] transition-colors">Forside</Link>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
            <span className="text-[#111111] font-medium">Refurbished Apple Watch</span>
          </nav>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              {/* Category badge */}
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#1A3D2E]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1A3D2E]" />
                Apple Watch
              </span>

              <h1 className="font-display text-4xl font-bold tracking-tight text-[#111111] md:text-5xl lg:text-6xl">
                Refurbished Apple Watch
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#86868B] md:text-lg">
                Kvalitetstestede Apple Watches med op til 50% besparelse. Alle enheder gennemgår 30+ kontroller, leveres med 36 måneders garanti og er klar til brug fra dag ét.
              </p>

              {/* Quick stats */}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <span className="flex items-center gap-2 text-[#111111]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                  <strong className="font-semibold">Fra 1.099 DKK</strong>
                </span>
                <span className="text-[#E5E5EA]">|</span>
                <span className="flex items-center gap-2 text-[#111111]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.157 2.176a1.5 1.5 0 0 0-1.147 0l-4.084 1.69A1.5 1.5 0 0 0 2 5.25v10.877a1.5 1.5 0 0 0 2.074 1.386l3.51-1.453 4.26 1.763a1.5 1.5 0 0 0 1.146 0l4.083-1.69A1.5 1.5 0 0 0 18 14.75V3.873a1.5 1.5 0 0 0-2.073-1.386l-3.51 1.452-4.26-1.763Z" clipRule="evenodd" />
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

          </div>
        </div>
      </section>

      {/* ── Model tiers ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Find det rigtige Apple Watch til dig
          </Heading>
          <p className="mt-4 text-lg text-[#86868B]">
            Vi har delt vores udvalg op i tre prisgrupper, så det er nemt at
            finde det watch der passer til dit budget og behov.
          </p>
        </div>

        <div className="mt-12 space-y-8">
          {MODEL_TIERS.map((tier, tierIndex) => {
            const tierTemplates = tierGroups.get(tierIndex) ?? [];
            if (tierTemplates.length === 0) return null;

            return (
              <div
                key={tier.tier}
                className={`rounded-3xl ${tier.cardBg} ${tier.cardBorder} p-5 md:p-8`}
              >
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <TierIcon tier={tier.tier} className={`h-6 w-6 ${tier.iconColor}`} />
                  <div>
                    <span className={`inline-block rounded-full ${tier.badgeBg} ${tier.badgeText} px-4 py-1 text-xs font-bold uppercase tracking-wide`}>
                      {tier.tier}
                    </span>
                    <p className={`mt-1 text-sm ${tier.taglineColor}`}>
                      {tier.tagline}
                    </p>
                  </div>
                  <span className="ml-auto text-sm font-semibold text-[#1A3D2E]">
                    {tierTemplates.length} {tierTemplates.length === 1 ? "model" : "modeller"}
                  </span>
                </div>

                <div className="-mx-5 px-5 md:-mx-8 md:px-8">
                  <div className="flex gap-4 overflow-x-auto overscroll-x-contain pb-4 scrollbar-hide md:gap-5">
                    {tierTemplates.slice(0, 10).map((t) => (
                      <div key={t.id} className="w-[45%] shrink-0 sm:w-[32%] md:w-[24%] lg:w-[20%]">
                        <ProductGridCard
                          slug={t.slug}
                          image={t.images[0]}
                          title={t.display_name}
                          minPrice={t.min_price}
                          deviceCount={t.device_count}
                          locations={t.locations}
                          brand={t.brand}
                          category={t.category}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionWrapper>

      {/* ── Condition walkthrough ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            Hvad betyder standen?
          </Heading>
          <p className="mt-4 text-[#86868B]">
            Alle smartwatches er 100% funktionelle. Forskellen mellem graderne er
            udelukkende kosmetisk. Swipe mellem forside og bagside.
          </p>
        </div>
        <div className="mt-10">
          <ConditionExplainer deviceType="watch" />
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

      {/* ── All smartwatches grid ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Alle Smartwatches
          </Heading>
          <p className="mt-4 text-[#86868B]">
            {templates.length} smartwatches på lager lige nu. Alle testet og klar
            med 36 måneders garanti.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {templates.map((t) => (
            <ProductGridCard
              key={t.id}
              slug={t.slug}
              image={t.images[0]}
              title={t.display_name}
              minPrice={t.min_price}
              deviceCount={t.device_count}
              locations={t.locations}
              brand={t.brand}
              category={t.category}
            />
          ))}
        </div>
      </SectionWrapper>

      {/* ── Hvorfor refurbished Apple Watch ── */}
      <SectionWrapper background="cream">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
              Smart valg
            </p>
            <Heading as="h2" size="md">
              Hvorfor købe et refurbished Apple Watch?
            </Heading>
            <p className="mt-4 text-[#86868B] leading-relaxed">
              Et nyt Apple Watch SE koster 2.149 kr. Hos PhoneSpot får du det
              samme ur fra 1.099 kr — testet med 30+ kontroller og med 36
              måneders garanti. Du sparer op til 50% og får præcis samme
              oplevelse.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Spar op til 50% sammenlignet med ny pris",
                "Samme watchOS, samme apps, samme funktioner",
                "80% mindre CO₂ end ny produktion",
                "36 måneders garanti og 14 dages returret",
                "Alle smartwatches er testet for vandtæthed",
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
            <h3 className="mb-6 font-display text-lg font-bold text-[#111111]">
              Ny vs. PhoneSpot
            </h3>
            <div className="divide-y divide-[#E5E5EA]">
              {COMPARISON.map((row) => (
                <div key={row.feature} className="flex items-start gap-4 py-3">
                  <span className="w-24 shrink-0 text-sm font-semibold text-[#111111]">
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
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 lg:grid-cols-4">
            {[
              { value: "30+", label: "Tests per enhed" },
              { value: "1.099 kr", label: "Billigste watch" },
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
            Spørgsmål om refurbished Apple Watch
          </Heading>
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
          <Heading as="h2" size="md">
            Klar til at finde dit Apple Watch?
          </Heading>
          <p className="mt-4 text-[#86868B]">
            Scroll op og udforsk vores udvalg — eller se vores iPhones for
            den perfekte kombination.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/iphones"
              className="inline-block rounded-full bg-[#1A3D2E] px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se iPhones &rarr;
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
