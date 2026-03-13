import type { Metadata } from "next";
import { Suspense } from "react";
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
  title: "Refurbished iPhones - Spar op til 40% | PhoneSpot",
  description:
    "Køb kvalitetstestede refurbished iPhones med 36 måneders garanti. Fra iPhone 8 til iPhone 14 Pro Max — alle testet med 30+ kontroller og klar til brug.",
  alternates: { canonical: "https://phonespot.dk/iphones" },
  openGraph: {
    title: "Refurbished iPhones - Spar op til 40% | PhoneSpot",
    description: "Køb kvalitetstestede refurbished iPhones med 36 måneders garanti. Fra iPhone 8 til iPhone 14 Pro Max — alle testet med 30+ kontroller og klar til brug.",
    url: "https://phonespot.dk/iphones",
  },
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
    patterns: ["iphone se", "iphone 11", "iphone xr", "iphone 8"],
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
    patterns: ["iphone 12", "iphone 13"],
  },
  {
    tier: "Premium",
    tagline: "Det bedste Apple tilbyder",
    cardBg: "bg-charcoal",
    cardBorder: "border-0",
    badgeBg: "bg-white/15",
    badgeText: "text-white",
    taglineColor: "text-white/60",
    iconColor: "text-white/70",
    patterns: ["iphone 14", "iphone 13 pro", "iphone 12 pro", "iphone 11 pro", "iphone 15"],
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
  { feature: "Garanti", new: "24 mdr. (Apple)", refurbished: "36 mdr. (PhoneSpot)" },
  { feature: "Test", new: "Fabrikskontrol", refurbished: "30+ individuelle tests" },
  { feature: "Batteri", new: "100% kapacitet", refurbished: "Min. 75-85% (grad-afhængig)" },
  { feature: "iOS", new: "Nyeste version", refurbished: "Nyeste version" },
  { feature: "Bæredygtighed", new: "Ny produktion", refurbished: "80% mindre CO2" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function IphonesPage() {
  const templates = await getPublishedTemplates("iphone");

  // Group by tier
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
      // Default to budget tier
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
            { "@type": "ListItem", position: 2, name: "Refurbished iPhones", item: "https://phonespot.dk/iphones" },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: IPHONE_FAQ.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />

      {/* ── Hero ── */}
      <div className="px-4 pt-8 max-w-7xl mx-auto">
        <CategoryHero
          title="Refurbished iPhones"
          description="Kvalitetstestede iPhones fra 999 kr. Alle enheder gennemgår 30+ kontroller, leveres med 36 måneders garanti og er klar til brug fra dag et."
          productCount={templates.length}
        />
      </div>

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
                    <span className={`inline-block rounded-full ${tier.badgeBg} ${tier.badgeText} px-4 py-1 text-xs font-bold uppercase tracking-[2px]`}>
                      {tier.tier}
                    </span>
                    <p className={`mt-1 text-sm ${tier.taglineColor}`}>
                      {tier.tagline}
                    </p>
                  </div>
                  <span className={`ml-auto text-sm font-semibold ${tierIndex === 2 ? "text-white/60" : "text-green-eco"}`}>
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

      {/* ── All iPhones grid ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Alle iPhones
          </Heading>
          <p className="mt-4 text-gray">
            {templates.length} iPhones på lager lige nu. Alle testet og klar
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
              og med 36 måneders garanti. Du får præcis samme oplevelse.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Spar 20-40% sammenlignet med ny pris",
                "Samme iOS, samme apps, samme hastighed",
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
            { value: "999 kr", label: "Billigste iPhone" },
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

      {/* ── Guides ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="sm">
            Læs mere om refurbished iPhones
          </Heading>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Link
              href="/blog/bedste-refurbished-iphone-2026"
              className="rounded-2xl bg-white p-5 text-left transition-shadow hover:shadow-md"
            >
              <p className="font-display text-sm font-bold text-charcoal">
                Bedste refurbished iPhone i 2026
              </p>
              <p className="mt-1 text-xs text-gray">
                Komplet guide til at vælge den rigtige model
              </p>
            </Link>
            <Link
              href="/blog/refurbished-vs-brugt-guide"
              className="rounded-2xl bg-white p-5 text-left transition-shadow hover:shadow-md"
            >
              <p className="font-display text-sm font-bold text-charcoal">
                Refurbished vs brugt
              </p>
              <p className="mt-1 text-xs text-gray">
                Forstå forskellen og vælg det rigtige for dig
              </p>
            </Link>
            <Link
              href="/sammenlign/refurbished-vs-brugt-vs-ny"
              className="rounded-2xl bg-white p-5 text-left transition-shadow hover:shadow-md"
            >
              <p className="font-display text-sm font-bold text-charcoal">
                Refurbished vs brugt vs ny
              </p>
              <p className="mt-1 text-xs text-gray">
                Se en komplet sammenligning
              </p>
            </Link>
          </div>
        </div>
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
              href="/reservedele"
              className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se reservedele &amp; tilbehør &rarr;
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
