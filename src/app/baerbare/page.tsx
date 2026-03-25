import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";
import { LAPTOP_TIERS } from "@/lib/laptop-tiers";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { LaptopFilteredGrid } from "@/components/product/laptop-filtered-grid";
import { ProductGridCard } from "@/components/product/product-grid-card";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

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

function TierIcon({ tier }: { tier: string }) {
  if (tier === "budget") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    );
  }
  if (tier === "mellem") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  );
}

export default async function BaerbarePage() {
  const templates = await getPublishedTemplates("laptop");

  // Group by price tier using min_price (øre)
  const tierGroups = new Map<string, typeof templates>();
  for (const tier of LAPTOP_TIERS) {
    tierGroups.set(tier.slug, []);
  }
  for (const t of templates) {
    const priceKr = t.min_price != null ? t.min_price / 100 : 0;
    const tier =
      LAPTOP_TIERS.find((lt) => priceKr >= lt.minPrice && priceKr < lt.maxPrice) ??
      LAPTOP_TIERS[0];
    tierGroups.get(tier.slug)!.push(t);
  }

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

      {/* ── Hero ── */}
      <section className="bg-[#F7F7F8] border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-[#86868B]" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#111111] transition-colors">Forside</Link>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
            <span className="text-[#111111] font-medium">Refurbished Bærbare</span>
          </nav>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              {/* Category badge */}
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#1A3D2E]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1A3D2E]" />
                Laptops &amp; Computere
              </span>

              <h1 className="font-display text-4xl font-bold tracking-tight text-[#111111] md:text-5xl lg:text-6xl">
                Bærbare du kan stole på
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#86868B] md:text-lg">
                Kvalitetstestede laptops med 36 måneders garanti. Hver eneste computer er testet med 30+ kontroller, rengjort og klar til brug fra dag et.
              </p>

              {/* Quick stats */}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <span className="flex items-center gap-2 text-[#111111]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                  <strong className="font-semibold">Fra 1.359 DKK</strong>
                </span>
                <span className="text-[#E5E5EA]">|</span>
                <span className="flex items-center gap-2 text-[#111111]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]" aria-hidden="true">
                    <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
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

      {/* ── Price tier showcase ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Vælg dit prisniveau
          </Heading>
          <p className="mt-4 text-lg text-[#86868B]">
            Find den rigtige bærbar til dit budget. Alle er testet efter samme
            grundige standard — uanset pris.
          </p>
        </div>

        <div className="mt-12 space-y-8">
          {LAPTOP_TIERS.map((tier, tierIndex) => {
            const tierTemplates = tierGroups.get(tier.slug) ?? [];

            // Clean Nordic tier card styles
            const cardStyles = [
              { cardBg: "bg-white", cardBorder: "border border-[#E5E5EA]", badgeBg: "bg-[#E5E5EA]", badgeText: "text-[#111111]", taglineColor: "text-[#86868B]", countColor: "text-[#1A3D2E]", arrowColor: "text-[#1A3D2E]" },
              { cardBg: "bg-[#F7F7F8]", cardBorder: "border-2 border-[#1A3D2E]/20", badgeBg: "bg-[#1A3D2E]", badgeText: "text-white", taglineColor: "text-[#1A3D2E]", countColor: "text-[#1A3D2E]", arrowColor: "text-[#1A3D2E]" },
              { cardBg: "bg-white", cardBorder: "border-2 border-[#111111]", badgeBg: "bg-[#111111]", badgeText: "text-white", taglineColor: "text-[#86868B]", countColor: "text-[#1A3D2E]", arrowColor: "text-[#111111]" },
            ];
            const s = cardStyles[tierIndex] ?? cardStyles[0];

            return (
              <Link
                key={tier.slug}
                href={`/baerbare/${tier.slug}`}
                className={`group block rounded-3xl ${s.cardBg} ${s.cardBorder} p-5 transition-shadow hover:shadow-md md:p-8`}
              >
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.badgeBg} ${s.badgeText}`}>
                    <TierIcon tier={tier.slug} />
                  </div>
                  <div>
                    <span className={`inline-block rounded-full ${s.badgeBg} ${s.badgeText} px-4 py-1 text-xs font-bold uppercase tracking-wide`}>
                      {tier.title}
                    </span>
                    <p className={`mt-1 text-sm ${s.taglineColor}`}>
                      {tier.tagline}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    {tierTemplates.length > 0 && (
                      <span className={`text-sm font-semibold ${s.countColor}`}>
                        {tierTemplates.length} {tierTemplates.length === 1 ? "model" : "modeller"}
                      </span>
                    )}
                    <span className={`text-sm font-semibold ${s.arrowColor} transition-transform group-hover:translate-x-1`}>
                      Se alle &rarr;
                    </span>
                  </div>
                </div>

                {tierTemplates.length > 0 && (
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
                )}

                {tierTemplates.length === 0 && (
                  <p className={`text-sm ${s.taglineColor}`}>
                    Se vores {tier.title.toLowerCase()} bærbare &rarr;
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </SectionWrapper>

      {/* ── Use cases ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            Hvad skal du bruge din bærbare til?
          </Heading>
          <p className="mt-4 text-lg text-[#86868B]">
            Find den rigtige computer til dit behov — uanset om det er studie,
            kontor eller krævende arbejde.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
          {USE_CASES.map((uc) => (
            <div
              key={uc.title}
              className="rounded-3xl bg-white border border-[#E5E5EA] p-6 shadow-sm"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A3D2E]/10 text-[#1A3D2E]">
                {uc.icon}
              </div>
              <h3 className="font-display text-lg font-bold text-[#111111]">
                {uc.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#86868B]">
                {uc.description}
              </p>
              <Link
                href={uc.href}
                className="mt-4 inline-block text-sm font-semibold text-[#1A3D2E] hover:underline"
              >
                {uc.cta} &rarr;
              </Link>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Budget highlight ── */}
      <section className="bg-[#1A3D2E] py-20 text-center text-white md:py-28">
        <div className="mx-auto max-w-7xl px-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/60">
            Bedste pris
          </p>
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            Bærbare fra 1.359 kr
          </h2>
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
            className="mt-8 inline-block rounded-full bg-white px-8 py-3 font-semibold text-[#1A3D2E] transition-opacity hover:opacity-90"
          >
            Se budget bærbare &rarr;
          </Link>
        </div>
      </section>

      {/* ── Test process ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Sådan tester vi hver eneste laptop
          </Heading>
          <p className="mt-4 text-lg text-[#86868B]">
            8 trin der sikrer at din bærbare er 100% klar. Ingen genveje —
            alle computere testes individuelt af vores teknikere.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-4xl">
          <div className="grid gap-4 sm:grid-cols-2">
            {LAPTOP_TEST_STEPS.map((step) => (
              <div
                key={step.step}
                className="flex gap-4 rounded-2xl bg-[#F7F7F8] border border-[#E5E5EA] p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A3D2E] text-sm font-bold text-white">
                  {step.step}
                </span>
                <div>
                  <h3 className="font-display text-sm font-bold tracking-tight text-[#111111]">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#86868B]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ── Hvorfor refurbished? ── */}
      <SectionWrapper background="cream">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
              Bæredygtigt valg
            </p>
            <Heading as="h2" size="md">
              Hvorfor købe en refurbished laptop?
            </Heading>
            <p className="mt-4 text-[#86868B] leading-relaxed">
              En ny laptop kræver råstoffer, energi og transport. Ved at
              vælge refurbished forlænger du enhedens levetid og reducerer
              e-affald med op til 80%.
            </p>
            <p className="mt-3 text-[#86868B] leading-relaxed">
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
                <li key={point} className="flex items-start gap-2 text-sm text-[#111111]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#1A3D2E]"
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
          <div className="rounded-3xl bg-white p-8 shadow-sm border border-[#E5E5EA]">
            <h3 className="mb-6 font-display text-lg font-bold text-[#111111]">
              Ny vs. PhoneSpot Refurbished
            </h3>
            <div className="divide-y divide-[#E5E5EA]">
              {COMPARISON.map((row) => (
                <div key={row.feature} className="flex items-start gap-4 py-3">
                  <span className="w-28 shrink-0 text-sm font-semibold text-[#111111]">
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
              { value: "30+", label: "Tests per computer" },
              { value: "4+", label: "Timers min. batteri" },
              { value: "36", label: "Måneders garanti" },
              { value: "1-2", label: "Dages levering" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white border border-[#E5E5EA] p-6 text-center shadow-sm">
                <p className="font-display text-4xl font-bold text-[#1A3D2E] md:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-[#86868B]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── All laptops grid with filters ── */}
      <SectionWrapper>
        <LaptopFilteredGrid templates={templates} heading="Alle baerbare" />
      </SectionWrapper>

      {/* ── FAQ ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            Ofte stillede spørgsmål om bærbare
          </Heading>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-[#E5E5EA]">
          {LAPTOP_FAQ.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer items-center justify-between font-display text-base font-semibold text-[#111111]">
                {item.question}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 shrink-0 text-[#86868B] transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#86868B]">
                {item.answer}
              </p>
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
            Find din næste bærbare
          </Heading>
          <p className="mt-4 text-[#86868B]">
            Alle computere er testet, rengjort og klar med 36 måneders garanti
            og 14 dages fortrydelsesret.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/baerbare/budget"
              className="inline-block rounded-full bg-[#1A3D2E] px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se budget &rarr;
            </Link>
            <Link
              href="/baerbare/mellem"
              className="inline-block rounded-full border-2 border-[#111111] px-8 py-3 font-semibold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
            >
              Se mellem &rarr;
            </Link>
            <Link
              href="/baerbare/premium"
              className="inline-block rounded-full border-2 border-[#111111] px-8 py-3 font-semibold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
            >
              Se premium &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
