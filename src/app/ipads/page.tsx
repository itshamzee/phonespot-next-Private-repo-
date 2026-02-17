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
  title: "Refurbished iPads - Spar op til 40% | PhoneSpot",
  description:
    "Køb kvalitetstestede refurbished iPads med 24 måneders garanti. Fra iPad Air 2 til iPad Pro — alle testet med 30+ kontroller og klar til brug.",
};

// ---------------------------------------------------------------------------
// Model tiers (Swappie-inspired)
// ---------------------------------------------------------------------------

const MODEL_TIERS = [
  {
    tier: "Budget",
    tagline: "Perfekt til basale behov",
    priceRange: "Fra 899 kr",
    color: "bg-sand/60",
    models: [
      {
        name: "iPad Air 2",
        price: "Fra 899 kr",
        desc: "Den originale tynde iPad med Touch ID.",
      },
      {
        name: "iPad 6. generation",
        price: "Fra 900 kr",
        desc: "Klassisk iPad med A10 chip og Touch ID.",
      },
    ],
  },
  {
    tier: "Populær",
    tagline: "Bedste værdi for pengene",
    priceRange: "Fra 1.500 kr",
    color: "bg-green-eco/10",
    models: [
      {
        name: "iPad 7. generation",
        price: "Fra 1.500 kr",
        desc: "10,2\" skærm med Smart Connector.",
      },
      {
        name: "iPad 8. generation",
        price: "Fra 1.700 kr",
        desc: "A12 Bionic chip — hurtig til alt fra studie til streaming.",
      },
    ],
  },
  {
    tier: "Premium",
    tagline: "Det bedste Apple tilbyder",
    priceRange: "Fra 2.000 kr",
    color: "bg-charcoal/5",
    models: [
      {
        name: "iPad Pro 10,5\"",
        price: "Fra 2.000 kr",
        desc: "ProMotion 120Hz skærm og quad-speakers.",
      },
    ],
  },
];

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
  { feature: "Garanti", new: "24 mdr. (Apple)", refurbished: "24 mdr. (PhoneSpot)" },
  { feature: "Test", new: "Fabrikskontrol", refurbished: "30+ individuelle tests" },
  { feature: "Batteri", new: "100% kapacitet", refurbished: "Min. 75-85% (gradafhængig)" },
  { feature: "iPadOS", new: "Nyeste version", refurbished: "Nyeste version" },
  { feature: "Bæredygtighed", new: "Ny produktion", refurbished: "80% mindre CO₂" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function IpadsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;

  let collectionData: Awaited<ReturnType<typeof getCollectionProducts>> = null;
  try {
    collectionData = await getCollectionProducts("ipads", sort);
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
          Refurbished iPads
        </Heading>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          Kvalitetstestede iPads fra 899 kr. Alle enheder gennemgår 30+
          kontroller, leveres med 24 måneders garanti og er klar til brug
          fra dag ét. Samme iPad — bare smartere købt.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Fra 899 kr
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> 24 mdr. garanti
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Alle testet
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Nyeste iPadOS
          </span>
        </div>
      </SectionWrapper>

      {/* ── Model tiers ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Find den rigtige iPad til dig
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Vi har delt vores udvalg op i tre prisgrupper, så det er nemt at
            finde den iPad der passer til dit budget og behov.
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
            Alle iPads er 100% funktionelle. Forskellen mellem graderne er
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
            Alle iPads
          </Heading>
          <p className="mt-4 text-gray">
            {products.length} iPads på lager lige nu. Alle testet og klar
            med 24 måneders garanti.
          </p>
        </div>

        <div className="mt-8">
          <div className="mb-6 flex items-center justify-end">
            <Suspense fallback={null}>
              <SortSelector />
            </Suspense>
          </div>
          <ProductGrid products={products} collectionHandle="ipads" />
        </div>
      </SectionWrapper>

      {/* ── Hvorfor refurbished iPad ── */}
      <SectionWrapper background="cream">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Smart valg
            </p>
            <Heading as="h2" size="md">
              Hvorfor købe en refurbished iPad?
            </Heading>
            <p className="mt-4 text-gray leading-relaxed">
              En ny iPad koster fra 3.000 kr og op. Den samme model koster fra
              899 kr hos PhoneSpot — testet med 30+ kontroller og med 24
              måneders garanti. Du får præcis samme oplevelse.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Spar 20-40% sammenlignet med ny pris",
                "Samme iPadOS, samme apps, samme hastighed",
                "80% mindre CO₂ end ny produktion",
                "24 måneders garanti og 14 dages returret",
                "Perfekt til studie, streaming og kreativt arbejde",
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
            { value: "899 kr", label: "Billigste iPad" },
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
            Spørgsmål om refurbished iPads
          </Heading>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-sand">
          {IPAD_FAQ.map((item) => (
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
            Klar til at finde din iPad?
          </Heading>
          <p className="mt-4 text-gray">
            Scroll op og udforsk vores udvalg — eller se vores tilbehør for at
            beskytte din nye enhed.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/tilbehoer"
              className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se tilbehør &rarr;
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
