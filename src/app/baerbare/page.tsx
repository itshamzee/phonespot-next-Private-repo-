import type { Metadata } from "next";
import Link from "next/link";
import { getCollectionProducts } from "@/lib/shopify/client";

export const dynamic = "force-dynamic";
import type { Product } from "@/lib/shopify/types";
import {
  LAPTOP_TIERS,
  filterProductsByTier,
  filterRealLaptops,
} from "@/lib/laptop-tiers";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ProductCard } from "@/components/product/product-card";

import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Refurbished Bærbare - Fra 1.359 kr med 36 mdr. garanti | PhoneSpot",
  description:
    "Kvalitetstestede bærbare med 36 måneders garanti. Spar op til 40% og få en computer der er testet, rengjort og klar til brug.",
  alternates: { canonical: "https://phonespot.dk/baerbare" },
  openGraph: {
    title: "Refurbished Bærbare - Fra 1.359 kr med 36 mdr. garanti | PhoneSpot",
    description: "Kvalitetstestede bærbare med 36 måneders garanti. Spar op til 40% og få en computer der er testet, rengjort og klar til brug.",
    url: "https://phonespot.dk/baerbare",
  },
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const LAPTOP_TEST_STEPS = [
  {
    step: "01",
    title: "Visuel inspektion",
    description:
      "Kabinet, skærm og hængsler inspiceres for ridser, buler og slid. Kosmetisk grade fastsættes.",
  },
  {
    step: "02",
    title: "Skærm & pixels",
    description:
      "Skærmen testes for dead pixels, farvegengivelse, lysstyrke og jævn baggrundsbelysning.",
  },
  {
    step: "03",
    title: "Tastatur & trackpad",
    description:
      "Alle taster testes individuelt. Trackpad tjekkes for præcision, klik og multitouch-gestus.",
  },
  {
    step: "04",
    title: "Batterilevetid",
    description:
      "Batteriet testes under realistisk brug. Minimum 4 timers levetid kræves for alle grades.",
  },
  {
    step: "05",
    title: "Ydelsestest",
    description:
      "Computeren stresses i minimum 1 time for at sikre stabil ydelse under belastning — ingen nedbrud, ingen overophedning.",
  },
  {
    step: "06",
    title: "Porte & forbindelser",
    description:
      "Alle USB-porte, HDMI, hovedtelefonstik, Wi-Fi og Bluetooth testes for fuld funktionalitet.",
  },
  {
    step: "07",
    title: "Ren installation",
    description:
      "Windows eller macOS installeres fra bunden med seneste opdateringer. Alle tidligere data slettes sikkert.",
  },
  {
    step: "08",
    title: "Rengøring & pakning",
    description:
      "Computeren rengøres grundigt og pakkes omhyggeligt i vores emballage med oplader.",
  },
];

const LAPTOP_FAQ = [
  {
    question: "Hvilken bærbar skal jeg vælge til studiet?",
    answer:
      "Til studiet anbefaler vi en budget-bærbar med min. 8 GB RAM og SSD. De er robuste, har gode tastaturer og holder hele dagen på en opladning. Se vores budget-udvalg for modeller fra 1.359 kr.",
  },
  {
    question: "Hvad er forskellen på budget, mellem og premium?",
    answer:
      "Budget (under 2.000 kr) er perfekt til studiet og daglig brug. Mellem (2.000-4.000 kr) giver mere kraft til multitasking og kontor. Premium (over 4.000 kr) har de nyeste processorer og mest RAM til krævende opgaver. Alle er 100% testet med 36 måneders garanti.",
  },
  {
    question: "Hvor lang tid holder batteriet?",
    answer:
      "Alle vores bærbare har minimum 4 timers batterilevetid under realistisk brug. Mange modeller holder 6-8 timer. Vi oplyser altid batterisundhed, så du ved præcis hvad du får.",
  },
  {
    question: "Kan jeg opgradere RAM eller SSD bagefter?",
    answer:
      "De fleste af vores Lenovo ThinkPads tillader opgradering af RAM og SSD. Spørger du os, hjælper vi gerne med at finde de rigtige komponenter.",
  },
  {
    question: "Hvilken oplader følger med?",
    answer:
      "Alle bærbare leveres med en kompatibel oplader. Det er altid en funktionel oplader — enten original eller certificeret kompatibel.",
  },
  {
    question: "Hvad med garanti på en refurbished laptop?",
    answer:
      "Du får 36 måneders garanti fra PhoneSpot. Det dækker fabrikationsfejl og funktionelle mangler. Har du problemer, kontakt os — vi reparerer, bytter eller refunderer.",
  },
];

const USE_CASES = [
  {
    title: "Til studiet",
    description:
      "Word, PowerPoint, browsing og Zoom. En bærbar med 8 GB RAM klarer alt hvad du har brug for på universitetet.",
    cta: "Se budget bærbare",
    href: "/baerbare/budget",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    title: "Til kontoret",
    description:
      "Multitasking, regneark og videomøder. En mellem-klasse bærbar med mere kraft giver dig professionel ydelse.",
    cta: "Se mellem bærbare",
    href: "/baerbare/mellem",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: "Til krævende arbejde",
    description:
      "Tunge programmer, store regneark og mange åbne faner. En premium bærbar med kraftig processor og masser af RAM.",
    cta: "Se premium bærbare",
    href: "/baerbare/premium",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

const COMPARISON = [
  { feature: "Pris (typisk)", new: "8.000-15.000 kr", refurbished: "1.359-5.339 kr" },
  { feature: "Garanti", new: "24 mdr. (producent)", refurbished: "36 mdr. (PhoneSpot)" },
  { feature: "Test", new: "Fabrikskontrol", refurbished: "30+ individuelle tests" },
  { feature: "Software", new: "Forinstalleret", refurbished: "Ren installation" },
  { feature: "Bæredygtighed", new: "Ny produktion", refurbished: "80% mindre CO2" },
  { feature: "Levering", new: "3-5 hverdage", refurbished: "1-2 hverdage" },
];

// Tier icons
function TierIcon({ tier }: { tier: string }) {
  if (tier === "budget") {
    // Piggy bank / savings
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    );
  }
  if (tier === "mellem") {
    // Scale / balance
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
      </svg>
    );
  }
  // Premium - rocket
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BaerbarePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;

  let collectionData: Awaited<ReturnType<typeof getCollectionProducts>> = null;
  try {
    collectionData = await getCollectionProducts("baerbare", sort);
  } catch {
    collectionData = null;
  }
  const allProducts = collectionData?.products ?? [];
  const products = filterRealLaptops(allProducts);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
            { "@type": "ListItem", position: 2, name: "Refurbished Bærbare", item: "https://phonespot.dk/baerbare" },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: LAPTOP_FAQ.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />

      {/* -- Hero -- */}
      <SectionWrapper background="charcoal" className="text-center text-white">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
          Refurbished bærbare
        </p>
        <Heading size="xl" className="text-white">
          Bærbare du kan stole på
        </Heading>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          Kvalitetstestede laptops med 36 måneders garanti. Hver eneste computer
          er testet med 30+ kontroller, rengjort og klar til brug fra dag et.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
          <span className="flex items-center gap-2">
            <span className="text-green-eco">&#10003;</span> Fra 1.359 kr
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">&#10003;</span> 36 måneders garanti
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">&#10003;</span> Spar op til 40%
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">&#10003;</span> Ren installation
          </span>
        </div>
      </SectionWrapper>

      {/* -- Price tier showcase -- */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Vælg dit prisniveau
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Find den rigtige bærbar til dit budget. Alle er testet efter samme
            grundige standard — uanset pris.
          </p>
        </div>

        <div className="mt-12 space-y-8">
          {LAPTOP_TIERS.map((tier, tierIndex) => {
            const tierProducts = filterProductsByTier(products, tier);

            return (
              <Link
                key={tier.slug}
                href={`/baerbare/${tier.slug}`}
                className={`group block rounded-3xl ${tier.cardBg} ${tier.cardBorder} p-5 transition-shadow hover:shadow-md md:p-8`}
              >
                {/* Tier header */}
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tier.badgeBg} ${tier.badgeText}`}>
                    <TierIcon tier={tier.slug} />
                  </div>
                  <div>
                    <span className={`inline-block rounded-full ${tier.badgeBg} ${tier.badgeText} px-4 py-1 text-xs font-bold uppercase tracking-[2px]`}>
                      {tier.title}
                    </span>
                    <p className={`mt-1 text-sm ${tier.taglineColor}`}>
                      {tier.tagline}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    {tierProducts.length > 0 && (
                      <span className={`text-sm font-semibold ${tier.countColor}`}>
                        {tierProducts.length} {tierProducts.length === 1 ? "model" : "modeller"}
                      </span>
                    )}
                    <span className={`text-sm font-semibold ${tierIndex === 2 ? "text-white/80 group-hover:text-white" : "text-green-eco"} transition-transform group-hover:translate-x-1`}>
                      Se alle &rarr;
                    </span>
                  </div>
                </div>

                {/* Product cards - horizontal scroll */}
                {tierProducts.length > 0 && (
                  <div className="-mx-5 px-5 md:-mx-8 md:px-8">
                    <div className="flex gap-4 overflow-x-auto overscroll-x-contain pb-4 scrollbar-hide md:gap-5">
                      {tierProducts.slice(0, 10).map((product) => (
                        <div key={product.id} className="w-[45%] shrink-0 sm:w-[32%] md:w-[24%] lg:w-[20%]">
                          <ProductCard
                            product={product}
                            collectionHandle="baerbare"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback when no products loaded */}
                {tierProducts.length === 0 && (
                  <p className={`text-sm ${tierIndex === 2 ? "text-white/40" : "text-gray"}`}>
                    Se vores {tier.title.toLowerCase()} bærbare &rarr;
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </SectionWrapper>

      {/* -- Hvem er du? Use cases -- */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            Hvad skal du bruge din bærbare til?
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Find den rigtige computer til dit behov — uanset om det er studie,
            kontor eller krævende arbejde.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
          {USE_CASES.map((uc) => (
            <div
              key={uc.title}
              className="rounded-3xl bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-eco/10 text-green-eco">
                {uc.icon}
              </div>
              <h3 className="font-display text-lg font-bold text-charcoal">
                {uc.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray">
                {uc.description}
              </p>
              <Link
                href={uc.href}
                className="mt-4 inline-block text-sm font-semibold text-green-eco hover:underline"
              >
                {uc.cta} &rarr;
              </Link>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* -- Budget highlight -- */}
      <SectionWrapper background="green" className="text-center text-white">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-white/60">
          Bedste pris
        </p>
        <Heading as="h2" size="lg" className="text-white">
          Bærbare fra 1.359 kr
        </Heading>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
          Du behøver ikke bruge en formue på en god computer. Vores
          budget-bærbare er håndplukket — med minimum 8 GB RAM,
          SSD og 4+ timers batteri. Alle testet og klar med 36 måneders garanti.
        </p>
        <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-4 text-sm text-white/70">
          <span className="flex items-center gap-1.5">
            <span className="text-white">&#10003;</span> Min. 8 GB RAM
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-white">&#10003;</span> SSD-disk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-white">&#10003;</span> 4+ timers batteri
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-white">&#10003;</span> Windows installeret
          </span>
        </div>
        <Link
          href="/baerbare/budget"
          className="mt-8 inline-block rounded-full bg-white px-8 py-3 font-semibold text-green-eco transition-opacity hover:opacity-90"
        >
          Se budget bærbare &rarr;
        </Link>
      </SectionWrapper>

      {/* -- Testproces -- */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Sådan tester vi hver eneste laptop
          </Heading>
          <p className="mt-4 text-lg text-gray">
            8 trin der sikrer at din bærbare er 100% klar. Ingen genveje —
            alle computere testes individuelt af vores teknikere.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-4xl">
          <div className="grid gap-4 sm:grid-cols-2">
            {LAPTOP_TEST_STEPS.map((step) => (
              <div
                key={step.step}
                className="flex gap-4 rounded-2xl bg-sand/40 p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-eco text-sm font-bold text-white">
                  {step.step}
                </span>
                <div>
                  <h3 className="font-display text-sm font-bold uppercase tracking-[1px] text-charcoal">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* -- Hvorfor refurbished? -- */}
      <SectionWrapper background="cream">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Bæredygtigt valg
            </p>
            <Heading as="h2" size="md">
              Hvorfor købe en refurbished laptop?
            </Heading>
            <p className="mt-4 text-gray leading-relaxed">
              En ny laptop kræver råstoffer, energi og transport. Ved at
              vælge refurbished forlænger du enhedens levetid og reducerer
              e-affald med op til 80%.
            </p>
            <p className="mt-3 text-gray leading-relaxed">
              Hos PhoneSpot er en refurbished laptop ikke bare billigere — den
              er også grundigere testet end en ny. Vi kører 30+ individuelle
              tests på hver computer, så du får en enhed der virker perfekt fra
              dag et.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Spar 20-40% sammenlignet med ny pris",
                "80% mindre CO2-aftryk end ny produktion",
                "Grundigere testet end en fabriksny enhed",
                "36 måneders garanti og 14 dages returret",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-charcoal">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="mt-0.5 h-4 w-4 shrink-0 text-green-eco"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h3 className="mb-6 font-display text-lg font-bold text-charcoal">
              Ny vs. PhoneSpot Refurbished
            </h3>
            <div className="divide-y divide-sand/60">
              {COMPARISON.map((row) => (
                <div key={row.feature} className="flex items-start gap-4 py-3">
                  <span className="w-28 shrink-0 text-sm font-semibold text-charcoal">
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

      {/* -- Tal -- */}
      <SectionWrapper background="charcoal" className="text-white">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 lg:grid-cols-4">
          {[
            { value: "30+", label: "Tests per computer" },
            { value: "4+", label: "Timers min. batteri" },
            { value: "36", label: "Måneders garanti" },
            { value: "1-2", label: "Dages levering" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-4xl font-bold text-green-eco md:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* -- FAQ -- */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            Ofte stillede spørgsmål om bærbare
          </Heading>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-sand">
          {LAPTOP_FAQ.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer items-center justify-between font-display text-base font-semibold text-charcoal">
                {item.question}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 shrink-0 text-gray transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </SectionWrapper>

      {/* -- Trust -- */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>

      {/* -- Guides -- */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="sm">
            Læs mere om refurbished bærbare
          </Heading>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/blog/guide-refurbished-baerbar"
              className="rounded-2xl bg-white p-5 text-left transition-shadow hover:shadow-md"
            >
              <p className="font-display text-sm font-bold text-charcoal">
                Sådan vælger du den rigtige refurbished bærbar
              </p>
              <p className="mt-1 text-xs text-gray">
                Budget, mellem eller premium? Komplet guide
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
                Se den komplette sammenligning
              </p>
            </Link>
          </div>
        </div>
      </SectionWrapper>

      {/* -- CTA -- */}
      <SectionWrapper>
        <div className="mx-auto max-w-2xl text-center">
          <Heading as="h2" size="md">
            Find din næste bærbare
          </Heading>
          <p className="mt-4 text-gray">
            Alle computere er testet, rengjort og klar med 36 måneders garanti
            og 14 dages fortrydelsesret.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/baerbare/budget"
              className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se budget &rarr;
            </Link>
            <Link
              href="/baerbare/mellem"
              className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
            >
              Se mellem &rarr;
            </Link>
            <Link
              href="/baerbare/premium"
              className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
            >
              Se premium &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
