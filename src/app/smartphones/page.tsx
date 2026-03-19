import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { ProductGridCard } from "@/components/product/product-grid-card";
import { JsonLd } from "@/components/seo/json-ld";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Refurbished Smartphones - Samsung, OnePlus & mere | PhoneSpot",
  description:
    "Køb kvalitetstestede refurbished smartphones med 36 måneders garanti. Samsung Galaxy, OnePlus og mere — alle testet med 30+ kontroller og klar til brug.",
  alternates: { canonical: "https://phonespot.dk/smartphones" },
  openGraph: {
    title: "Refurbished Smartphones - Samsung, OnePlus & mere | PhoneSpot",
    description: "Køb kvalitetstestede refurbished smartphones med 36 måneders garanti. Samsung Galaxy, OnePlus og mere — alle testet med 30+ kontroller og klar til brug.",
    url: "https://phonespot.dk/smartphones",
  },
};

const BRAND_TIERS = [
  {
    tier: "Samsung Galaxy",
    tagline: "Danmarks mest populære Android",
    cardBg: "bg-white",
    cardBorder: "border border-[#E5E5EA]",
    badgeBg: "bg-[#111111]",
    badgeText: "text-white",
    taglineColor: "text-[#86868B]",
    iconColor: "text-[#86868B]",
    patterns: ["samsung", "galaxy"],
  },
  {
    tier: "OnePlus",
    tagline: "Flagskibsydelse til skarp pris",
    cardBg: "bg-[#F7F7F8]",
    cardBorder: "border-2 border-[#1A3D2E]/20",
    badgeBg: "bg-[#1A3D2E]",
    badgeText: "text-white",
    taglineColor: "text-[#1A3D2E]",
    iconColor: "text-[#1A3D2E]",
    patterns: ["oneplus"],
  },
  {
    tier: "Øvrige mærker",
    tagline: "Google Pixel, Xiaomi og flere",
    cardBg: "bg-white",
    cardBorder: "border border-[#E5E5EA]",
    badgeBg: "bg-[#E5E5EA]",
    badgeText: "text-[#111111]",
    taglineColor: "text-[#86868B]",
    iconColor: "text-[#86868B]",
    patterns: ["pixel", "xiaomi", "huawei", "google", "motorola", "sony", "nothing"],
  },
];

const SMARTPHONE_FAQ = [
  {
    question: "Hvilken Android-telefon skal jeg vælge?",
    answer:
      "Samsung Galaxy S-serien er perfekt til dem der vil have det bedste kamera og skærm. OnePlus giver flagskibsydelse til en lavere pris. Google Pixel er bedst til ren Android-oplevelse og kamerakvalitet.",
  },
  {
    question: "Er en refurbished smartphone lige så hurtig som en ny?",
    answer:
      "Ja, 100%. Ydelsen er identisk — vi nulstiller til fabriksindstillinger og opdaterer til nyeste software. Du får præcis samme hastighed og funktioner som en ny enhed.",
  },
  {
    question: "Får jeg de nyeste Android-opdateringer?",
    answer:
      "Det afhænger af modellen. Samsung Galaxy-telefoner fra de seneste 3-4 år modtager stadig opdateringer. Vi sørger for at opdatere enheden til den nyeste tilgængelige version før afsendelse.",
  },
  {
    question: "Hvad med batteriet på en refurbished smartphone?",
    answer:
      "Vi tester alle batterier med professionelt værktøj. Grade A kræver min. 85% kapacitet, Grade B min. 80%, Grade C min. 75%. Du får altid oplyst batterikapaciteten.",
  },
  {
    question: "Kan jeg bruge alle danske mobilabonnementer?",
    answer:
      "Ja. Alle vores smartphones er ulåste og virker med alle danske operatører — TDC, Telenor, Telia, 3, Lebara og andre.",
  },
  {
    question: "Hvad er forskellen på en refurbished og en brugt telefon?",
    answer:
      "En refurbished telefon er professionelt testet, rengjort og klargjort med 30+ kvalitetskontroller. En brugt telefon sælges som den er. Hos PhoneSpot får du desuden 36 måneders garanti og 14 dages returret.",
  },
];

const COMPARISON = [
  { feature: "Pris", new: "4.000-12.000 kr", refurbished: "799-5.500 kr" },
  { feature: "Garanti", new: "24 mdr. (producent)", refurbished: "36 mdr. (PhoneSpot)" },
  { feature: "Test", new: "Fabrikskontrol", refurbished: "30+ individuelle tests" },
  { feature: "Batteri", new: "100% kapacitet", refurbished: "Min. 75-85% (grad-afhængig)" },
  { feature: "Software", new: "Nyeste version", refurbished: "Nyeste tilgængelige version" },
  { feature: "Bæredygtighed", new: "Ny produktion", refurbished: "80% mindre CO2" },
];

export default async function SmartphonesPage() {
  const templates = await getPublishedTemplates("smartphone");

  const brandGroups = new Map<number, typeof templates>();
  for (const t of templates) {
    const name = t.display_name.toLowerCase();
    let matched = false;
    for (let i = 0; i < BRAND_TIERS.length; i++) {
      if (BRAND_TIERS[i].patterns.some((p) => name.includes(p))) {
        if (!brandGroups.has(i)) brandGroups.set(i, []);
        brandGroups.get(i)!.push(t);
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (!brandGroups.has(2)) brandGroups.set(2, []);
      brandGroups.get(2)!.push(t);
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
            { "@type": "ListItem", position: 2, name: "Refurbished Smartphones", item: "https://phonespot.dk/smartphones" },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: SMARTPHONE_FAQ.map((item) => ({
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
            <span className="text-[#111111] font-medium">Refurbished Smartphones</span>
          </nav>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              {/* Category badge */}
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#1A3D2E]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1A3D2E]" />
                Android Smartphones
              </span>

              <h1 className="font-display text-4xl font-bold tracking-tight text-[#111111] md:text-5xl lg:text-6xl">
                Refurbished Smartphones
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#86868B] md:text-lg">
                Samsung Galaxy, OnePlus og mere fra 799 kr. Alle enheder gennemgår 30+ kontroller, leveres med 36 måneders garanti og er klar til brug fra dag et.
              </p>

              {/* Quick stats */}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <span className="flex items-center gap-2 text-[#111111]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                  <strong className="font-semibold">Fra 799 DKK</strong>
                </span>
                <span className="text-[#E5E5EA]">|</span>
                <span className="flex items-center gap-2 text-[#111111]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]" aria-hidden="true">
                    <path d="M8 16.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z" />
                    <path fillRule="evenodd" d="M4 4a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V4Zm4-1.5v.75c0 .414.336.75.75.75h2.5a.75.75 0 0 0 .75-.75V2.5h1A1.5 1.5 0 0 1 14.5 4v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 16V4A1.5 1.5 0 0 1 7 2.5h1Z" clipRule="evenodd" />
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.samsung.com/is/image/samsung/p6pim/uk/2401/gallery/uk-galaxy-s24-s928-sm-s928bzadeub-thumb-539447824"
                  alt="Samsung Galaxy smartphones"
                  width={320}
                  height={280}
                  className="relative h-56 w-auto object-contain drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Brand tiers ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Vælg dit foretrukne mærke
          </Heading>
          <p className="mt-4 text-lg text-[#86868B]">
            Vi har organiseret vores udvalg efter mærke, så det er nemt at
            finde den smartphone der passer til dig.
          </p>
        </div>

        <div className="mt-12 space-y-8">
          {BRAND_TIERS.map((tier, tierIndex) => {
            const tierTemplates = brandGroups.get(tierIndex) ?? [];
            if (tierTemplates.length === 0) return null;

            return (
              <div
                key={tier.tier}
                className={`rounded-3xl ${tier.cardBg} ${tier.cardBorder} p-5 md:p-8`}
              >
                <div className="mb-6 flex flex-wrap items-center gap-3">
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
            Alle smartphones er 100% funktionelle. Forskellen mellem graderne er
            udelukkende kosmetisk. Swipe mellem forside og bagside.
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

      {/* ── All smartphones grid ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Alle smartphones
          </Heading>
          <p className="mt-4 text-[#86868B]">
            {templates.length} smartphones på lager lige nu. Alle testet og klar
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

      {/* ── Hvorfor refurbished smartphone ── */}
      <SectionWrapper background="cream">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
              Smart valg
            </p>
            <Heading as="h2" size="md">
              Hvorfor købe en refurbished smartphone?
            </Heading>
            <p className="mt-4 text-[#86868B] leading-relaxed">
              En ny Samsung Galaxy S24 koster over 7.000 kr. Den samme model
              koster fra 3.500 kr hos PhoneSpot — testet med 30+ kontroller
              og med 36 måneders garanti. Du får præcis samme oplevelse.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Spar 30-50% sammenlignet med ny pris",
                "Samme Android, samme apps, samme hastighed",
                "80% mindre CO2 end ny produktion",
                "36 måneders garanti og 14 dages returret",
                "Alle telefoner er ulåste og virker med alle operatører",
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
              { value: "799 kr", label: "Billigste smartphone" },
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
            Spørgsmål om refurbished smartphones
          </Heading>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-[#E5E5EA]">
          {SMARTPHONE_FAQ.map((item) => (
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
            Klar til at finde din smartphone?
          </Heading>
          <p className="mt-4 text-[#86868B]">
            Scroll op og udforsk vores udvalg — eller se vores iPhones og
            tilbehør.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/iphones"
              className="inline-block rounded-full bg-[#1A3D2E] px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se iPhones &rarr;
            </Link>
            <Link
              href="/reservedele"
              className="inline-block rounded-full border-2 border-[#111111] px-8 py-3 font-semibold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
            >
              Se covers &amp; tilbehør &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
