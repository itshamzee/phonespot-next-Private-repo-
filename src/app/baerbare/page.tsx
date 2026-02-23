import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCollectionProducts } from "@/lib/medusa/client";
import type { Product } from "@/lib/medusa/types";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ProductCard } from "@/components/product/product-card";
import { FadeIn } from "@/components/ui/fade-in";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Refurbished Bærbare - MacBook, Lenovo & HP | PhoneSpot",
  description:
    "Kvalitetstestede bærbare fra Apple, Lenovo og HP med 36 måneders garanti. Spar op til 40% og få en computer der er testet, rengjort og klar til brug.",
};

// ---------------------------------------------------------------------------
// Brand tiers (mirrors iPhone tier pattern)
// ---------------------------------------------------------------------------

const BRAND_TIERS = [
  {
    brand: "Apple",
    slug: "apple",
    tagline: "Premium design & ydelse",
    cardBg: "bg-white",
    cardBorder: "border border-sand",
    badgeBg: "bg-sand/70",
    badgeText: "text-charcoal",
    taglineColor: "text-gray",
    iconColor: "text-charcoal/50",
    countColor: "text-green-eco",
    logoPath: "/brand/logos/apple-logo.svg",
    patterns: ["macbook", "mac"],
  },
  {
    brand: "Lenovo",
    slug: "lenovo",
    tagline: "Bedste værdi for pengene",
    cardBg: "bg-green-eco/[0.03]",
    cardBorder: "border-2 border-green-eco/20",
    badgeBg: "bg-green-eco",
    badgeText: "text-white",
    taglineColor: "text-green-eco",
    iconColor: "text-green-eco",
    countColor: "text-green-eco",
    logoPath: "/brand/logos/lenovo-logo.svg",
    patterns: ["thinkpad", "lenovo", "ideapad"],
  },
  {
    brand: "HP",
    slug: "hp",
    tagline: "Business kvalitet",
    cardBg: "bg-charcoal",
    cardBorder: "border-0",
    badgeBg: "bg-white/15",
    badgeText: "text-white",
    taglineColor: "text-white/60",
    iconColor: "text-white/70",
    countColor: "text-white/60",
    logoPath: "/brand/logos/hp-logo.svg",
    patterns: ["elitebook", "hp", "probook"],
  },
];

// SVG icon fallbacks per brand
function BrandIcon({ brand, className }: { brand: string; className?: string }) {
  if (brand === "Apple") {
    // Laptop icon
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
      </svg>
    );
  }
  if (brand === "Lenovo") {
    // Shield / durability icon
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    );
  }
  // HP — briefcase / business icon
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

/** Assign a product to the best-matching brand tier. */
function getProductBrand(product: Product): number | null {
  const title = product.title.toLowerCase();

  // Check tiers in reverse so more specific patterns match first
  // (e.g. "thinkpad" before "lenovo" which is broader)
  for (let i = BRAND_TIERS.length - 1; i >= 0; i--) {
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
      "Til studiet anbefaler vi en Lenovo ThinkPad eller HP EliteBook med min. 8 GB RAM og SSD. De er robuste, har gode tastaturer og holder hele dagen på en opladning. Se vores studiecomputer-udvalg for håndplukkede modeller fra 1.999 kr.",
  },
  {
    question: "Er en refurbished MacBook lige så god som en ny?",
    answer:
      "Funktionelt ja — 100%. Alle MacBooks gennemgår vores 30-punkts test og leveres med ren macOS-installation. Kosmetisk afhænger det af graden: Grade A er næsten umulig at skelne fra ny. Du sparer typisk 30-40% sammenlignet med ny pris.",
  },
  {
    question: "Hvor lang tid holder batteriet?",
    answer:
      "Alle vores bærbare har minimum 4 timers batterilevetid under realistisk brug. Mange modeller holder 6-8 timer. Vi oplyser altid batterisundhed, så du ved præcis hvad du får.",
  },
  {
    question: "Kan jeg opgradere RAM eller SSD bagefter?",
    answer:
      "Det afhænger af modellen. De fleste Lenovo ThinkPads og HP EliteBooks tillader opgradering af RAM og SSD. MacBooks med M-chip har loddet RAM, men SSD kan i nogle tilfælde opgraderes. Spørger du os, hjælper vi gerne.",
  },
  {
    question: "Hvilken oplader følger med?",
    answer:
      "Alle bærbare leveres med en kompatibel oplader. MacBooks leveres med USB-C oplader, Lenovo og HP med deres respektive opladere. Det er altid en funktionel oplader — enten original eller certificeret kompatibel.",
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
      "Word, PowerPoint, browsing og Zoom. En ThinkPad eller EliteBook med 8 GB RAM klarer alt hvad du har brug for på universitetet.",
    cta: "Se studiecomputere",
    href: "/baerbare/studiecomputer",
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
      "Multitasking, regneark og videomøder. En kraftig EliteBook eller ThinkPad med 16 GB RAM og SSD giver dig professionel ydelse.",
    cta: "Se Lenovo",
    href: "/baerbare/lenovo",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: "Til kreativt arbejde",
    description:
      "Foto, video og design kræver en stærk skærm og kraftig processor. MacBook Pro med Retina er det oplagte valg.",
    cta: "Se MacBooks",
    href: "/baerbare/apple",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

const COMPARISON = [
  { feature: "Pris (typisk)", new: "8.000-15.000 kr", refurbished: "1.999-7.999 kr" },
  { feature: "Garanti", new: "24 mdr. (producent)", refurbished: "36 mdr. (PhoneSpot)" },
  { feature: "Test", new: "Fabrikskontrol", refurbished: "30+ individuelle tests" },
  { feature: "Software", new: "Forinstalleret", refurbished: "Ren installation" },
  { feature: "Bæredygtighed", new: "Ny produktion", refurbished: "80% mindre CO2" },
  { feature: "Levering", new: "3-5 hverdage", refurbished: "1-2 hverdage" },
];

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
    collectionData = await getCollectionProducts("computere", sort);
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
          Kvalitetstestede laptops fra Apple, Lenovo og HP — med 36 måneders
          garanti. Hver eneste computer er testet med 30+ kontroller, rengjort
          og klar til brug fra dag et.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Fra 1.999 kr
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> 36 måneders garanti
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Spar op til 40%
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Ren installation
          </span>
        </div>
      </SectionWrapper>

      {/* -- Brand showcase -- */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Vælg dit mærke
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Vi fører de mest pålidelige laptop-mærker på markedet. Alle er
            testet efter samme grundige standard.
          </p>
        </div>

        <div className="mt-12 space-y-8">
          {BRAND_TIERS.map((tier, tierIndex) => {
            const brandProducts = brandGroups.get(tierIndex) ?? [];

            return (
              <Link
                key={tier.slug}
                href={`/baerbare/${tier.slug}`}
                className={`group block rounded-3xl ${tier.cardBg} ${tier.cardBorder} p-5 transition-shadow hover:shadow-md md:p-8`}
              >
                {/* Brand header */}
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  {/* Try brand logo image, fall back to SVG icon */}
                  <div className="relative flex h-8 w-8 items-center justify-center">
                    <Image
                      src={tier.logoPath}
                      alt={`${tier.brand} logo`}
                      width={32}
                      height={32}
                      className={`h-8 w-8 object-contain ${tierIndex === 2 ? "brightness-0 invert" : ""}`}
                      onError={undefined}
                    />
                  </div>
                  <BrandIcon brand={tier.brand} className={`h-6 w-6 ${tier.iconColor} hidden`} />
                  <div>
                    <span className={`inline-block rounded-full ${tier.badgeBg} ${tier.badgeText} px-4 py-1 text-xs font-bold uppercase tracking-[2px]`}>
                      {tier.brand}
                    </span>
                    <p className={`mt-1 text-sm ${tier.taglineColor}`}>
                      {tier.tagline}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    {brandProducts.length > 0 && (
                      <span className={`text-sm font-semibold ${tier.countColor}`}>
                        {brandProducts.length} modeller
                      </span>
                    )}
                    <span className={`text-sm font-semibold ${tierIndex === 2 ? "text-white/80 group-hover:text-white" : "text-green-eco"} transition-transform group-hover:translate-x-1`}>
                      Se alle &rarr;
                    </span>
                  </div>
                </div>

                {/* Product cards - horizontal scroll */}
                {brandProducts.length > 0 && (
                  <div className="-mx-5 px-5 md:-mx-8 md:px-8">
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide md:gap-5">
                      {brandProducts.slice(0, 10).map((product, idx) => (
                        <FadeIn key={product.id} delay={idx * 0.04} className="w-[45%] shrink-0 sm:w-[32%] md:w-[24%] lg:w-[20%]">
                          <ProductCard
                            product={product}
                            collectionHandle="baerbare"
                          />
                        </FadeIn>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback when no products loaded */}
                {brandProducts.length === 0 && (
                  <p className={`text-sm ${tierIndex === 2 ? "text-white/40" : "text-gray"}`}>
                    Se vores udvalg af {tier.brand} bærbare &rarr;
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
            kontor eller kreativt arbejde.
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

      {/* -- Studiecomputer highlight -- */}
      <SectionWrapper background="green" className="text-center text-white">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-white/60">
          For studerende
        </p>
        <Heading as="h2" size="lg" className="text-white">
          Studiecomputer fra 1.999 kr
        </Heading>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
          Du behøver ikke bruge hele SU&apos;en på en computer. Vores
          studiecomputere er håndplukket til studiet — med minimum 8 GB RAM,
          SSD og 4+ timers batteri. Alle testet og klar med 36 måneders garanti.
        </p>
        <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-4 text-sm text-white/70">
          <span className="flex items-center gap-1.5">
            <span className="text-white">✓</span> Min. 8 GB RAM
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-white">✓</span> SSD-disk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-white">✓</span> 4+ timers batteri
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-white">✓</span> Windows installeret
          </span>
        </div>
        <Link
          href="/baerbare/studiecomputer"
          className="mt-8 inline-block rounded-full bg-white px-8 py-3 font-semibold text-green-eco transition-opacity hover:opacity-90"
        >
          Se studiecomputere &rarr;
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
                MacBook, ThinkPad eller EliteBook? Komplet guide
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
              href="/baerbare/apple"
              className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se MacBooks &rarr;
            </Link>
            <Link
              href="/baerbare/lenovo"
              className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
            >
              Se Lenovo &rarr;
            </Link>
            <Link
              href="/baerbare/hp"
              className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
            >
              Se HP &rarr;
            </Link>
            <Link
              href="/baerbare/studiecomputer"
              className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
            >
              Se studiecomputere &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
