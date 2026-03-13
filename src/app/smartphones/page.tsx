import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { CategoryHero } from "@/components/product/category-hero";
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
    cardBorder: "border border-sand",
    badgeBg: "bg-charcoal",
    badgeText: "text-white",
    taglineColor: "text-gray",
    iconColor: "text-charcoal/50",
    patterns: ["samsung", "galaxy"],
  },
  {
    tier: "OnePlus",
    tagline: "Flagskibsydelse til skarp pris",
    cardBg: "bg-green-eco/[0.03]",
    cardBorder: "border-2 border-green-eco/20",
    badgeBg: "bg-green-eco",
    badgeText: "text-white",
    taglineColor: "text-green-eco",
    iconColor: "text-green-eco",
    patterns: ["oneplus"],
  },
  {
    tier: "Øvrige mærker",
    tagline: "Google Pixel, Xiaomi og flere",
    cardBg: "bg-cream",
    cardBorder: "border border-sand/60",
    badgeBg: "bg-sand/70",
    badgeText: "text-charcoal",
    taglineColor: "text-gray",
    iconColor: "text-charcoal/50",
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
      <div className="px-4 pt-8 max-w-7xl mx-auto">
        <CategoryHero
          title="Refurbished Smartphones"
          description="Samsung Galaxy, OnePlus og mere fra 799 kr. Alle enheder gennemgår 30+ kontroller, leveres med 36 måneders garanti og er klar til brug fra dag et."
          productCount={templates.length}
        />
      </div>

      {/* ── Brand tiers ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Vælg dit foretrukne mærke
          </Heading>
          <p className="mt-4 text-lg text-gray">
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
                    <span className={`inline-block rounded-full ${tier.badgeBg} ${tier.badgeText} px-4 py-1 text-xs font-bold uppercase tracking-[2px]`}>
                      {tier.tier}
                    </span>
                    <p className={`mt-1 text-sm ${tier.taglineColor}`}>
                      {tier.tagline}
                    </p>
                  </div>
                  <span className="ml-auto text-sm font-semibold text-green-eco">
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
          <p className="mt-4 text-gray">
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
            className="text-sm font-semibold text-green-eco hover:underline"
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
          <p className="mt-4 text-gray">
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Smart valg
            </p>
            <Heading as="h2" size="md">
              Hvorfor købe en refurbished smartphone?
            </Heading>
            <p className="mt-4 text-gray leading-relaxed">
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
                <li key={point} className="flex items-start gap-2 text-sm text-charcoal">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-green-eco" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h3 className="mb-6 font-display text-lg font-bold text-charcoal">
              Ny vs. PhoneSpot
            </h3>
            <div className="divide-y divide-sand/60">
              {COMPARISON.map((row) => (
                <div key={row.feature} className="flex items-start gap-4 py-3">
                  <span className="w-24 shrink-0 text-sm font-semibold text-charcoal">
                    {row.feature}
                  </span>
                  <span className="flex-1 text-sm text-gray">{row.new}</span>
                  <span className="flex-1 text-sm font-medium text-green-eco">
                    {row.refurbished}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Stats ── */}
      <SectionWrapper background="charcoal" className="text-white">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 lg:grid-cols-4">
          {[
            { value: "30+", label: "Tests per enhed" },
            { value: "799 kr", label: "Billigste smartphone" },
            { value: "36", label: "Måneders garanti" },
            { value: "1-2", label: "Dages levering" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-3xl font-bold text-green-eco md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── FAQ ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            Spørgsmål om refurbished smartphones
          </Heading>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-sand">
          {SMARTPHONE_FAQ.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer items-center justify-between font-display text-base font-semibold text-charcoal">
                {item.question}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-gray transition-transform group-open:rotate-180" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray">{item.answer}</p>
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
          <p className="mt-4 text-gray">
            Scroll op og udforsk vores udvalg — eller se vores iPhones og
            tilbehør.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/iphones"
              className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se iPhones &rarr;
            </Link>
            <Link
              href="/reservedele"
              className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
            >
              Se covers &amp; tilbehør &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
