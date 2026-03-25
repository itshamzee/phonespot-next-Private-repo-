import type { Metadata } from "next";
import Image from "next/image";
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
  title: "Refurbished iPads - Spar op til 40% | PhoneSpot",
  description:
    "Køb kvalitetstestede refurbished iPads med 36 måneders garanti. Fra iPad Air 2 til iPad Pro — alle testet med 30+ kontroller og klar til brug.",
  alternates: { canonical: "https://phonespot.dk/ipads" },
  openGraph: {
    title: "Refurbished iPads - Spar op til 40% | PhoneSpot",
    description: "Køb kvalitetstestede refurbished iPads med 36 måneders garanti. Fra iPad Air 2 til iPad Pro — alle testet med 30+ kontroller og klar til brug.",
    url: "https://phonespot.dk/ipads",
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
    patterns: ["ipad air 2", "ipad 5", "ipad 6"],
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
    patterns: ["ipad 7", "ipad 8", "ipad 9", "ipad air"],
  },
  {
    tier: "Premium",
    tagline: "Det bedste Apple tilbyder",
    cardBg: "bg-white",
    cardBorder: "border-2 border-[#111111]",
    badgeBg: "bg-[#111111]",
    badgeText: "text-white",
    taglineColor: "text-[#86868B]",
    iconColor: "text-[#111111]",
    patterns: ["ipad pro", "ipad mini"],
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

const IPAD_FAQ = [
  {
    question: "Hvilken iPad skal jeg vælge?",
    answer:
      "Det afhænger af dit budget og behov. Til basalt brug som web, e-mail og streaming er iPad Air 2 eller iPad 6. generation perfekt. Har du brug for mere kraft til studie eller kreativt arbejde, så gå efter iPad 7. eller 8. generation. Vil du have det bedste med ProMotion-skærm, så er iPad Pro 10,5\" det rette valg.",
  },
  {
    question: "Er en refurbished iPad lige så hurtig som en ny?",
    answer:
      "Ja, 100%. Ydelsen er identisk — vi nulstiller til fabriksindstillinger og opdaterer til nyeste iPadOS. Du får præcis samme hastighed og funktioner som en ny enhed.",
  },
  {
    question: "Får jeg den nyeste iPadOS-version?",
    answer:
      "Alle iPads fra iPad 5. generation og nyere kører den seneste iPadOS-version. Vi opdaterer enheden før afsendelse, så du er klar fra dag ét.",
  },
  {
    question: "Hvad med batteriet på en refurbished iPad?",
    answer:
      "Vi tester alle batterier med professionelt værktøj. Grade A kræver min. 85% kapacitet, Grade B min. 80%, Grade C min. 75%. Du får altid oplyst batterikapaciteten, så du ved præcis hvad du køber.",
  },
  {
    question: "Kan jeg bruge Apple Pencil med en refurbished iPad?",
    answer:
      "Det afhænger af modellen. iPad 6., 7. og 8. generation understøtter Apple Pencil 1. generation. iPad Pro 10,5\" understøtter også Apple Pencil 1. generation. iPad Air 2 understøtter desværre ikke Apple Pencil.",
  },
  {
    question: "Kommer der tilbehør med?",
    answer:
      "Alle iPads leveres med oplader-kabel. Vi anbefaler at tilkøbe et cover for at beskytte din nye enhed — se vores tilbehør.",
  },
];

const COMPARISON = [
  { feature: "Pris", new: "3.000-12.000 kr", refurbished: "899-2.000 kr" },
  { feature: "Garanti", new: "24 mdr. (Apple)", refurbished: "36 mdr. (PhoneSpot)" },
  { feature: "Test", new: "Fabrikskontrol", refurbished: "30+ individuelle tests" },
  { feature: "Batteri", new: "100% kapacitet", refurbished: "Min. 75-85% (gradafhængig)" },
  { feature: "iPadOS", new: "Nyeste version", refurbished: "Nyeste version" },
  { feature: "Bæredygtighed", new: "Ny produktion", refurbished: "80% mindre CO₂" },
];

export default async function IpadsPage() {
  const templates = await getPublishedTemplates("ipad");

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
            { "@type": "ListItem", position: 2, name: "Refurbished iPads", item: "https://phonespot.dk/ipads" },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: IPAD_FAQ.map((item) => ({
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
            <span className="text-[#111111] font-medium">Refurbished iPads</span>
          </nav>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              {/* Category badge */}
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#1A3D2E]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1A3D2E]" />
                Apple iPad
              </span>

              <h1 className="font-display text-4xl font-bold tracking-tight text-[#111111] md:text-5xl lg:text-6xl">
                Refurbished iPads
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#86868B] md:text-lg">
                Kvalitetstestede iPads fra 899 kr. Alle enheder gennemgår 30+ kontroller, leveres med 36 måneders garanti og er klar til brug fra dag ét.
              </p>

              {/* Quick stats */}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <span className="flex items-center gap-2 text-[#111111]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                  <strong className="font-semibold">Fra 899 DKK</strong>
                </span>
                <span className="text-[#E5E5EA]">|</span>
                <span className="flex items-center gap-2 text-[#111111]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]" aria-hidden="true">
                    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Z" clipRule="evenodd" />
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

            {/* Product image */}
            <div className="hidden lg:flex lg:shrink-0 lg:items-center lg:justify-center">
              <div className="relative">
                <div className="absolute -inset-8 rounded-full bg-[#1A3D2E]/5" />
                <Image
                  src="/images/products/ipad-category.jpg"
                  alt="iPad lineup"
                  width={320}
                  height={280}
                  className="relative h-56 w-auto object-contain drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Model tiers ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Find den rigtige iPad til dig
          </Heading>
          <p className="mt-4 text-lg text-[#86868B]">
            Vi har delt vores udvalg op i tre prisgrupper, så det er nemt at
            finde den iPad der passer til dit budget og behov.
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
            Alle iPads er 100% funktionelle. Forskellen mellem graderne er
            udelukkende kosmetisk. Swipe mellem forside og bagside.
          </p>
        </div>
        <div className="mt-10">
          <ConditionExplainer deviceType="ipad" />
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

      {/* ── All iPads grid ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Alle iPads
          </Heading>
          <p className="mt-4 text-[#86868B]">
            {templates.length} iPads på lager lige nu. Alle testet og klar
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

      {/* ── Hvorfor refurbished iPad ── */}
      <SectionWrapper background="cream">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
              Smart valg
            </p>
            <Heading as="h2" size="md">
              Hvorfor købe en refurbished iPad?
            </Heading>
            <p className="mt-4 text-[#86868B] leading-relaxed">
              En ny iPad koster fra 3.000 kr og op. Den samme model koster fra
              899 kr hos PhoneSpot — testet med 30+ kontroller og med 36
              måneders garanti. Du får præcis samme oplevelse.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Spar 20-40% sammenlignet med ny pris",
                "Samme iPadOS, samme apps, samme hastighed",
                "80% mindre CO₂ end ny produktion",
                "36 måneders garanti og 14 dages returret",
                "Perfekt til studie, streaming og kreativt arbejde",
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
              { value: "899 kr", label: "Billigste iPad" },
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
            Spørgsmål om refurbished iPads
          </Heading>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-[#E5E5EA]">
          {IPAD_FAQ.map((item) => (
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
            Klar til at finde din iPad?
          </Heading>
          <p className="mt-4 text-[#86868B]">
            Scroll op og udforsk vores udvalg — eller se vores tilbehør for at
            beskytte din nye enhed.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/tilbehoer"
              className="inline-block rounded-full bg-[#1A3D2E] px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se tilbehør &rarr;
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
