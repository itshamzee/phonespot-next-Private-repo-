import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getCollectionProducts } from "@/lib/medusa/client";
import type { Product } from "@/lib/medusa/types";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { SortSelector } from "@/components/collection/sort-selector";
import { ProductGrid } from "@/components/collection/product-grid";
import { ProductCard } from "@/components/product/product-card";
import { FadeIn } from "@/components/ui/fade-in";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Refurbished Smartphones - Samsung, OnePlus & mere | PhoneSpot",
  description:
    "Køb kvalitetstestede refurbished smartphones med 36 måneders garanti. Samsung Galaxy, OnePlus og mere — alle testet med 30+ kontroller og klar til brug.",
};

// ---------------------------------------------------------------------------
// Brand tiers
// ---------------------------------------------------------------------------

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

function BrandIcon({ tier, className }: { tier: string; className?: string }) {
  if (tier === "Samsung Galaxy") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    );
  }
  if (tier === "OnePlus") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  );
}

function getProductBrand(product: Product): number | null {
  const title = product.title.toLowerCase();
  for (let i = 0; i < BRAND_TIERS.length; i++) {
    if (BRAND_TIERS[i].patterns.some((p) => title.includes(p))) {
      return i;
    }
  }
  return null;
}

function groupProductsByBrand(products: Product[]): Map<number, Product[]> {
  const map = new Map<number, Product[]>();
  for (const product of products) {
    const brand = getProductBrand(product);
    if (brand === null) continue;
    if (!map.has(brand)) map.set(brand, []);
    map.get(brand)!.push(product);
  }
  return map;
}

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SmartphonesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;

  let collectionData: Awaited<ReturnType<typeof getCollectionProducts>> = null;
  try {
    collectionData = await getCollectionProducts("smartphones", sort);
  } catch {
    collectionData = null;
  }
  const products = collectionData?.products ?? [];
  const brandGroups = groupProductsByBrand(products);

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
      <SectionWrapper background="charcoal" className="text-center text-white">
        <span className="mb-4 inline-block rounded-full bg-green-eco/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[2px] text-green-eco">
          Spar op til 50%
        </span>
        <Heading size="xl" className="text-white">
          Refurbished Smartphones
        </Heading>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          Samsung Galaxy, OnePlus og mere fra 799 kr. Alle enheder gennemgår 30+
          kontroller, leveres med 36 måneders garanti og er klar til brug
          fra dag et.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Fra 799 kr
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> 36 mdr. garanti
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Alle ulåste
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Nyeste Android
          </span>
        </div>
      </SectionWrapper>

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
            const tierProducts = brandGroups.get(tierIndex) ?? [];
            if (tierProducts.length === 0) return null;

            return (
              <div
                key={tier.tier}
                className={`rounded-3xl ${tier.cardBg} ${tier.cardBorder} p-5 md:p-8`}
              >
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <BrandIcon tier={tier.tier} className={`h-6 w-6 ${tier.iconColor}`} />
                  <div>
                    <span className={`inline-block rounded-full ${tier.badgeBg} ${tier.badgeText} px-4 py-1 text-xs font-bold uppercase tracking-[2px]`}>
                      {tier.tier}
                    </span>
                    <p className={`mt-1 text-sm ${tier.taglineColor}`}>
                      {tier.tagline}
                    </p>
                  </div>
                  <span className="ml-auto text-sm font-semibold text-green-eco">
                    {tierProducts.length} modeller
                  </span>
                </div>

                <div className="-mx-5 px-5 md:-mx-8 md:px-8">
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide md:gap-5">
                    {tierProducts.slice(0, 10).map((product, idx) => (
                      <FadeIn key={product.id} delay={idx * 0.04} className="w-[45%] shrink-0 sm:w-[32%] md:w-[24%] lg:w-[20%]">
                        <ProductCard
                          product={product}
                          collectionHandle="smartphones"
                        />
                      </FadeIn>
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

      {/* ── Product grid ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Alle smartphones
          </Heading>
          <p className="mt-4 text-gray">
            {products.length} smartphones på lager lige nu. Alle testet og klar
            med 36 måneders garanti.
          </p>
        </div>

        <div className="mt-8">
          <div className="mb-6 flex items-center justify-end">
            <Suspense fallback={null}>
              <SortSelector />
            </Suspense>
          </div>
          <ProductGrid products={products} collectionHandle="smartphones" />
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
              href="/covers"
              className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
            >
              Se covers & tilbehør &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
