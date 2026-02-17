import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getCollectionProducts } from "@/lib/shopify/client";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { SortSelector } from "@/components/collection/sort-selector";
import { ProductGrid } from "@/components/collection/product-grid";

export const metadata: Metadata = {
  title: "Refurbished iPhones - Spar op til 40% | PhoneSpot",
  description:
    "Køb kvalitetstestede refurbished iPhones med 24 måneders garanti. Fra iPhone 8 til iPhone 14 Pro Max — alle testet med 30+ kontroller og klar til brug.",
};

// ---------------------------------------------------------------------------
// Model tiers (Swappie-inspired)
// ---------------------------------------------------------------------------

const MODEL_TIERS = [
  {
    tier: "Budget",
    tagline: "Perfekt til basale behov",
    priceRange: "Fra 999 kr",
    color: "bg-sand/60",
    models: [
      { name: "iPhone SE", price: "Fra 1.499 kr", desc: "Kompakt kraft. Apples billigste iPhone med A15-chip." },
      { name: "iPhone 11", price: "Fra 1.800 kr", desc: "Fremragende kamera og batteritid til en skarp pris." },
      { name: "iPhone XR", price: "Fra 2.199 kr", desc: "Stor skærm, god ydelse og mange farvemuligheder." },
      { name: "iPhone 8 / 8 Plus", price: "Fra 1.299 kr", desc: "Klassisk design med Home-knap og Touch ID." },
    ],
  },
  {
    tier: "Populær",
    tagline: "Bedste værdi for pengene",
    priceRange: "Fra 2.000 kr",
    color: "bg-green-eco/10",
    models: [
      { name: "iPhone 12", price: "Fra 2.000 kr", desc: "5G, OLED-skærm og MagSafe. Den moderne iPhone-oplevelse." },
      { name: "iPhone 13", price: "Fra 3.400 kr", desc: "Bedre kamera, længere batteri og A15 Bionic-chip." },
      { name: "iPhone 12 Pro", price: "Fra 3.099 kr", desc: "Pro-kamera med LiDAR og kirurgisk stål." },
      { name: "iPhone 11 Pro", price: "Fra 2.349 kr", desc: "Triple-kamera og Super Retina XDR-skærm." },
    ],
  },
  {
    tier: "Premium",
    tagline: "Det bedste Apple tilbyder",
    priceRange: "Fra 4.100 kr",
    color: "bg-charcoal/5",
    models: [
      { name: "iPhone 14 Pro", price: "Fra 5.500 kr", desc: "Dynamic Island, 48MP kamera og Always-On display." },
      { name: "iPhone 14 Pro Max", price: "Fra 6.200 kr", desc: "Den ultimative iPhone — størst skærm, bedst batteri." },
      { name: "iPhone 13 Pro", price: "Fra 4.100 kr", desc: "ProMotion 120Hz skærm og filmisk videotilstand." },
      { name: "iPhone 14 / 14 Plus", price: "Fra 4.400 kr", desc: "Ny crash detection og forbedret kamera." },
    ],
  },
];

const IPHONE_FAQ = [
  {
    question: "Hvilken iPhone skal jeg vælge?",
    answer:
      "Det afhænger af dit budget og behov. Til basalt brug (opkald, SMS, sociale medier) er iPhone 11 eller SE perfekt. Vil du have et godt kamera og 5G, så gå efter iPhone 12 eller 13. Vil du have det allerbedste, så er iPhone 14 Pro vejen frem.",
  },
  {
    question: "Er en refurbished iPhone lige så hurtig som en ny?",
    answer:
      "Ja, 100%. Ydelsen er identisk — vi nulstiller til fabriksindstillinger og opdaterer til nyeste iOS. Du får præcis samme hastighed og funktioner som en ny enhed.",
  },
  {
    question: "Får jeg den nyeste iOS-version?",
    answer:
      "Alle iPhones fra iPhone 8 og nyere kører den seneste iOS-version. Vi opdaterer enheden før afsendelse, så du er klar fra dag et.",
  },
  {
    question: "Hvad med batteriet på en refurbished iPhone?",
    answer:
      "Vi tester alle batterier med professionelt værktøj. Grade A kræver min. 85% kapacitet, Grade B min. 80%, Grade C min. 75%. Du får altid oplyst batterikapaciteten.",
  },
  {
    question: "Kan jeg bruge alle danske mobilabonnementer?",
    answer:
      "Ja. Alle vores iPhones er ulåste (factory unlocked) og virker med alle danske operatører — TDC, Telenor, Telia, 3, Lebara og andre.",
  },
  {
    question: "Kommer der tilbehør med?",
    answer:
      "Alle iPhones leveres med oplader-kabel. Vi anbefaler at tilkøbe et cover og panserglas for at beskytte din nye enhed — se vores tilbehør.",
  },
];

const COMPARISON = [
  { feature: "Pris", new: "6.000-13.000 kr", refurbished: "999-6.200 kr" },
  { feature: "Garanti", new: "24 mdr. (Apple)", refurbished: "24 mdr. (PhoneSpot)" },
  { feature: "Test", new: "Fabrikskontrol", refurbished: "30+ individuelle tests" },
  { feature: "Batteri", new: "100% kapacitet", refurbished: "Min. 75-85% (grad-afhængig)" },
  { feature: "iOS", new: "Nyeste version", refurbished: "Nyeste version" },
  { feature: "Bæredygtighed", new: "Ny produktion", refurbished: "80% mindre CO2" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function IphonesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;

  let collectionData: Awaited<ReturnType<typeof getCollectionProducts>> = null;
  try {
    collectionData = await getCollectionProducts("iphones", sort);
  } catch {
    collectionData = null;
  }
  const products = collectionData?.products ?? [];

  return (
    <>
      {/* ── Hero ── */}
      <SectionWrapper background="charcoal" className="text-center text-white">
        <span className="mb-4 inline-block rounded-full bg-green-eco/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[2px] text-green-eco">
          Spar op til 40%
        </span>
        <Heading size="xl" className="text-white">
          Refurbished iPhones
        </Heading>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          Kvalitetstestede iPhones fra 999 kr. Alle enheder gennemgår 30+
          kontroller, leveres med 24 måneders garanti og er klar til brug
          fra dag et. Samme iPhone — bare smartere købt.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Fra 999 kr
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> 24 mdr. garanti
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Alle ulåste
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Nyeste iOS
          </span>
        </div>
      </SectionWrapper>

      {/* ── Model tiers ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Find den rigtige iPhone til dig
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Vi har delt vores udvalg op i tre prisgrupper, så det er nemt at
            finde den iPhone der passer til dit budget og behov.
          </p>
        </div>

        <div className="mt-12 space-y-8">
          {MODEL_TIERS.map((tier) => (
            <div key={tier.tier} className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className={`rounded-full ${tier.color} px-4 py-1.5 text-xs font-bold uppercase tracking-[2px] text-charcoal`}>
                  {tier.tier}
                </span>
                <span className="text-sm text-gray">{tier.tagline}</span>
                <span className="ml-auto text-sm font-semibold text-green-eco">
                  {tier.priceRange}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {tier.models.map((model) => (
                  <div
                    key={model.name}
                    className="rounded-2xl bg-sand/30 p-4"
                  >
                    <h4 className="font-display text-base font-bold text-charcoal">
                      {model.name}
                    </h4>
                    <p className="mt-1 text-xs font-semibold text-green-eco">
                      {model.price}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-gray">
                      {model.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Condition walkthrough ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            Hvad betyder standen?
          </Heading>
          <p className="mt-4 text-gray">
            Alle iPhones er 100% funktionelle. Forskellen mellem graderne er
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
            Alle iPhones
          </Heading>
          <p className="mt-4 text-gray">
            {products.length} iPhones på lager lige nu. Alle testet og klar
            med 24 måneders garanti.
          </p>
        </div>

        <div className="mt-8">
          <div className="mb-6 flex items-center justify-end">
            <Suspense fallback={null}>
              <SortSelector />
            </Suspense>
          </div>
          <ProductGrid products={products} collectionHandle="iphones" />
        </div>
      </SectionWrapper>

      {/* ── Hvorfor refurbished iPhone ── */}
      <SectionWrapper background="cream">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Smart valg
            </p>
            <Heading as="h2" size="md">
              Hvorfor købe en refurbished iPhone?
            </Heading>
            <p className="mt-4 text-gray leading-relaxed">
              En ny iPhone 14 Pro koster over 10.000 kr. Den samme model
              koster fra 5.500 kr hos PhoneSpot — testet med 30+ kontroller
              og med 24 måneders garanti. Du får præcis samme oplevelse.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Spar 20-40% sammenlignet med ny pris",
                "Samme iOS, samme apps, samme hastighed",
                "80% mindre CO2 end ny produktion",
                "24 måneders garanti og 14 dages returret",
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
            { value: "999 kr", label: "Billigste iPhone" },
            { value: "24", label: "Måneders garanti" },
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
            Spørgsmål om refurbished iPhones
          </Heading>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-sand">
          {IPHONE_FAQ.map((item) => (
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
            Klar til at finde din iPhone?
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
