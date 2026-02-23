import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getCollectionProducts } from "@/lib/shopify/client";
import type { Product } from "@/lib/shopify/types";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { SortSelector } from "@/components/collection/sort-selector";
import { ProductGrid } from "@/components/collection/product-grid";
import { ProductCard } from "@/components/product/product-card";
import { FadeIn } from "@/components/ui/fade-in";

export const metadata: Metadata = {
  title: "Refurbished Smartwatches - Apple Watch & Samsung | PhoneSpot",
  description:
    "Køb kvalitetstestede refurbished smartwatches med 36 måneders garanti. Apple Watch og Samsung Galaxy Watch — alle testet med 30+ kontroller og klar til brug.",
};

// ---------------------------------------------------------------------------
// Model tiers (Swappie-inspired)
// ---------------------------------------------------------------------------

const MODEL_TIERS = [
  {
    tier: "Budget",
    tagline: "Perfekt til basale behov",
    cardBg: "bg-white",
    cardBorder: "border border-sand",
    badgeBg: "bg-sand/70",
    badgeText: "text-charcoal",
    taglineColor: "text-gray",
    iconColor: "text-charcoal/50",
    patterns: ["apple watch se", "apple watch series 3", "apple watch series 4", "galaxy watch 4"],
  },
  {
    tier: "Populær",
    tagline: "Bedste værdi for pengene",
    cardBg: "bg-green-eco/[0.03]",
    cardBorder: "border-2 border-green-eco/20",
    badgeBg: "bg-green-eco",
    badgeText: "text-white",
    taglineColor: "text-green-eco",
    iconColor: "text-green-eco",
    patterns: ["apple watch series 5", "apple watch series 6", "apple watch series 7", "galaxy watch 5"],
  },
  {
    tier: "Premium",
    tagline: "Det bedste inden for smartwatches",
    cardBg: "bg-charcoal",
    cardBorder: "border-0",
    badgeBg: "bg-white/15",
    badgeText: "text-white",
    taglineColor: "text-white/60",
    iconColor: "text-white/70",
    patterns: ["apple watch series 8", "apple watch series 9", "apple watch ultra", "galaxy watch 6"],
  },
];

function TierIcon({ tier, className }: { tier: string; className?: string }) {
  if (tier === "Budget") {
    // Coin icon
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  if (tier === "Populær") {
    // Star icon
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
    );
  }
  // Premium — diamond/gem icon
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12l4.5 6-10.5 12L1.5 9 6 3Zm0 0 3 6m6-6-3 6m-6 0h12" />
    </svg>
  );
}

/** Assign a product to the best-matching tier. More specific patterns match first. */
function getProductTier(product: Product): number | null {
  const title = product.title.toLowerCase();

  // Check tiers in reverse (Premium first) so more specific patterns
  // like "apple watch ultra" match before the broader "apple watch se".
  for (let i = MODEL_TIERS.length - 1; i >= 0; i--) {
    if (MODEL_TIERS[i].patterns.some((p) => title.includes(p))) {
      return i;
    }
  }
  return null;
}

function groupProductsByTier(products: Product[]): Map<number, Product[]> {
  const map = new Map<number, Product[]>();
  for (const product of products) {
    const tier = getProductTier(product);
    if (tier === null) continue;
    if (!map.has(tier)) map.set(tier, []);
    map.get(tier)!.push(product);
  }
  return map;
}

const SMARTWATCH_FAQ = [
  {
    question: "Hvilken smartwatch skal jeg vælge?",
    answer:
      "Det afhænger af dit budget og behov. Til basalt brug (notifikationer, fitness-tracking) er Apple Watch SE eller Galaxy Watch 4 perfekt. Vil du have avanceret sundhedsmonitorering, så gå efter Series 7 eller Galaxy Watch 5. Vil du have det allerbedste, så er Apple Watch Ultra eller Series 9 vejen frem.",
  },
  {
    question: "Er en refurbished Apple Watch vandtæt?",
    answer:
      "Ja. Alle Apple Watch-modeller fra Series 2 og nyere har en vandtæthed på WR50 (50 meter). Vi tester vandtætheden som en del af vores 30+ kvalitetskontroller, så du kan trygt bruge dit ur til svømning og i regnvejr.",
  },
  {
    question: "Kan jeg bruge den med min iPhone/Android?",
    answer:
      "Apple Watch kræver en iPhone (iPhone 8 eller nyere) for opsætning og daglig brug. Samsung Galaxy Watch virker bedst med Android-telefoner, men har også begrænset funktionalitet med iPhone. Vi rådgiver dig gerne, hvis du er i tvivl.",
  },
  {
    question: "Hvad med batteriet?",
    answer:
      "Vi tester alle batterier med professionelt værktøj. Grade A kræver min. 85% kapacitet, Grade B min. 80%, Grade C min. 75%. De fleste smartwatches holder en hel dag på en opladning, og vi oplyser altid batterikapaciteten.",
  },
  {
    question: "Får jeg den nyeste watchOS/Tizen?",
    answer:
      "Vi opdaterer alle smartwatches til den nyeste kompatible softwareversion før afsendelse. Apple Watch Series 4 og nyere kører den seneste watchOS. Samsung Galaxy Watch opdateres til nyeste Wear OS/Tizen.",
  },
  {
    question: "Kommer der tilbehør med?",
    answer:
      "Alle smartwatches leveres med oplader (magnetisk for Apple Watch, trådløs for Samsung). Vi anbefaler at tilkøbe en ekstra rem, hvis du ønsker en anden stil — se vores tilbehør.",
  },
];

const COMPARISON = [
  { feature: "Pris", new: "2.000-6.000 kr", refurbished: "999-4.500 kr" },
  { feature: "Garanti", new: "24 mdr. (Apple/Samsung)", refurbished: "36 mdr. (PhoneSpot)" },
  { feature: "Test", new: "Fabrikskontrol", refurbished: "30+ individuelle tests" },
  { feature: "Batteri", new: "100% kapacitet", refurbished: "Min. 80% (gradafhængig)" },
  { feature: "Software", new: "Nyeste version", refurbished: "Nyeste version" },
  { feature: "Bæredygtighed", new: "Ny produktion", refurbished: "80% mindre CO2" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SmartwatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;

  let collectionData: Awaited<ReturnType<typeof getCollectionProducts>> = null;
  try {
    collectionData = await getCollectionProducts("smartwatches", sort);
  } catch {
    collectionData = null;
  }
  const products = collectionData?.products ?? [];
  const tierGroups = groupProductsByTier(products);

  return (
    <>
      {/* ── Hero ── */}
      <SectionWrapper background="charcoal" className="text-center text-white">
        <span className="mb-4 inline-block rounded-full bg-green-eco/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[2px] text-green-eco">
          Spar op til 40%
        </span>
        <Heading size="xl" className="text-white">
          Refurbished Smartwatches
        </Heading>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          Kvalitetstestede smartwatches fra 999 kr. Alle enheder gennemgår 30+
          kontroller, leveres med 36 måneders garanti og er klar til brug
          fra dag et. Samme smartwatch — bare smartere købt.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Fra 999 kr
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> 36 mdr. garanti
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Alle testet
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Vandtætte
          </span>
        </div>
      </SectionWrapper>

      {/* ── Model tiers ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Find det rigtige smartwatch til dig
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Vi har delt vores udvalg op i tre prisgrupper, så det er nemt at
            finde det smartwatch der passer til dit budget og behov.
          </p>
        </div>

        <div className="mt-12 space-y-8">
          {MODEL_TIERS.map((tier, tierIndex) => {
            const tierProducts = tierGroups.get(tierIndex) ?? [];
            if (tierProducts.length === 0) return null;

            return (
              <div
                key={tier.tier}
                className={`rounded-3xl ${tier.cardBg} ${tier.cardBorder} p-5 md:p-8`}
              >
                {/* Tier header */}
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <TierIcon tier={tier.tier} className={`h-6 w-6 ${tier.iconColor}`} />
                  <div>
                    <span className={`inline-block rounded-full ${tier.badgeBg} ${tier.badgeText} px-4 py-1 text-xs font-bold uppercase tracking-[2px]`}>
                      {tier.tier}
                    </span>
                    <p className={`mt-1 text-sm ${tier.taglineColor}`}>
                      {tier.tagline}
                    </p>
                  </div>
                  <span className={`ml-auto text-sm font-semibold ${tierIndex === 2 ? "text-white/60" : "text-green-eco"}`}>
                    {tierProducts.length} modeller
                  </span>
                </div>

                {/* Product cards — horizontal scroll */}
                <div className="-mx-5 px-5 md:-mx-8 md:px-8">
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide md:gap-5">
                    {tierProducts.slice(0, 10).map((product, idx) => (
                      <FadeIn key={product.id} delay={idx * 0.04} className="w-[45%] shrink-0 sm:w-[32%] md:w-[24%] lg:w-[20%]">
                        <ProductCard
                          product={product}
                          collectionHandle="smartwatches"
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
            Alle smartwatches er 100% funktionelle. Forskellen mellem graderne er
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
            Alle Smartwatches
          </Heading>
          <p className="mt-4 text-gray">
            {products.length} smartwatches på lager lige nu. Alle testet og klar
            med 36 måneders garanti.
          </p>
        </div>

        <div className="mt-8">
          <div className="mb-6 flex items-center justify-end">
            <Suspense fallback={null}>
              <SortSelector />
            </Suspense>
          </div>
          <ProductGrid products={products} collectionHandle="smartwatches" />
        </div>
      </SectionWrapper>

      {/* ── Hvorfor refurbished smartwatch ── */}
      <SectionWrapper background="cream">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Smart valg
            </p>
            <Heading as="h2" size="md">
              Hvorfor købe et refurbished smartwatch?
            </Heading>
            <p className="mt-4 text-gray leading-relaxed">
              Et nyt Apple Watch Series 9 koster over 3.500 kr. Den samme model
              koster fra 2.500 kr hos PhoneSpot — testet med 30+ kontroller
              og med 36 måneders garanti. Du får præcis samme oplevelse.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Spar 20-40% sammenlignet med ny pris",
                "Samme watchOS, samme apps, samme funktioner",
                "80% mindre CO2 end ny produktion",
                "36 måneders garanti og 14 dages returret",
                "Alle smartwatches er testet for vandtæthed",
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
            { value: "999 kr", label: "Billigste watch" },
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
            Spørgsmål om refurbished smartwatches
          </Heading>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-sand">
          {SMARTWATCH_FAQ.map((item) => (
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
            Klar til at finde dit smartwatch?
          </Heading>
          <p className="mt-4 text-gray">
            Scroll op og udforsk vores udvalg — eller se vores tilbehør for at
            beskytte din nye enhed.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/covers"
              className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se covers & tilbehør &rarr;
            </Link>
            <Link
              href="/kvalitet"
              className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
            >
              Læs om vores kvalitet &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
