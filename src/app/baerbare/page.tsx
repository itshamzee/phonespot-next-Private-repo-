import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";

export const metadata: Metadata = {
  title: "Refurbished Bærbare - MacBook, Lenovo & HP | PhoneSpot",
  description:
    "Kvalitetstestede bærbare fra Apple, Lenovo og HP med 24 måneders garanti. Spar op til 40% og få en computer der er testet, rengjort og klar til brug.",
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const BRANDS = [
  {
    slug: "apple",
    title: "MacBook",
    subtitle: "MacBook Air & MacBook Pro",
    description:
      "Apples legendariske laptops med Retina-skærm, aluminium-kabinet og macOS. Fra studerende til professionelle — der er en MacBook til alle.",
    highlights: ["Retina-skærm", "macOS klar", "M-chip eller Intel"],
    priceFrom: "3.499 kr",
  },
  {
    slug: "lenovo",
    title: "Lenovo ThinkPad",
    subtitle: "ThinkPad & IdeaPad serien",
    description:
      "Verdens mest pålidelige forretnings-laptop. ThinkPad er bygget til at holde — med legendariske tastaturer og mil-spec holdbarhed.",
    highlights: ["MIL-STD holdbarhed", "Bedste tastatur", "Op til 10 timers batteri"],
    priceFrom: "1.999 kr",
  },
  {
    slug: "hp",
    title: "HP EliteBook",
    subtitle: "EliteBook & ProBook serien",
    description:
      "Business-grade laptops med kraftige processorer og fremragende skærme. Perfekte til kontor, studie og hjemmearbejde.",
    highlights: ["Business kvalitet", "Bang & Olufsen lyd", "Kraftig ydelse"],
    priceFrom: "1.999 kr",
  },
];

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
      "Du får 24 måneders garanti fra PhoneSpot. Det dækker fabrikationsfejl og funktionelle mangler. Har du problemer, kontakt os — vi reparerer, bytter eller refunderer.",
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
  { feature: "Garanti", new: "24 mdr. (producent)", refurbished: "24 mdr. (PhoneSpot)" },
  { feature: "Test", new: "Fabrikskontrol", refurbished: "30+ individuelle tests" },
  { feature: "Software", new: "Forinstalleret", refurbished: "Ren installation" },
  { feature: "Bæredygtighed", new: "Ny produktion", refurbished: "80% mindre CO2" },
  { feature: "Levering", new: "3-5 hverdage", refurbished: "1-2 hverdage" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BaerbarePage() {
  return (
    <>
      {/* ── Hero ── */}
      <SectionWrapper background="charcoal" className="text-center text-white">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
          Refurbished bærbare
        </p>
        <Heading size="xl" className="text-white">
          Bærbare du kan stole på
        </Heading>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          Kvalitetstestede laptops fra Apple, Lenovo og HP — med 24 måneders
          garanti. Hver eneste computer er testet med 30+ kontroller, rengjort
          og klar til brug fra dag et.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Fra 1.999 kr
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> 24 måneders garanti
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Spar op til 40%
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> Ren installation
          </span>
        </div>
      </SectionWrapper>

      {/* ── Brand showcase ── */}
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
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {BRANDS.map((brand) => (
            <Link
              key={brand.slug}
              href={`/baerbare/${brand.slug}`}
              className="group rounded-3xl bg-white p-8 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-4">
                <h3 className="font-display text-2xl font-bold text-charcoal">
                  {brand.title}
                </h3>
                <p className="text-sm text-gray">{brand.subtitle}</p>
              </div>
              <p className="text-sm leading-relaxed text-charcoal/70">
                {brand.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {brand.highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-full bg-sand/60 px-3 py-1 text-xs font-medium text-charcoal"
                  >
                    {h}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm text-gray">
                  Fra <span className="font-bold text-charcoal">{brand.priceFrom}</span>
                </span>
                <span className="text-sm font-semibold text-green-eco transition-transform group-hover:translate-x-1">
                  Se udvalg &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Hvem er du? Use cases ── */}
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

      {/* ── Studiecomputer highlight ── */}
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
          SSD og 4+ timers batteri. Alle testet og klar med 24 måneders garanti.
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

      {/* ── Testproces ── */}
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

      {/* ── Hvorfor refurbished? ── */}
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
                "24 måneders garanti og 14 dages returret",
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

      {/* ── Tal ── */}
      <SectionWrapper background="charcoal" className="text-white">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 lg:grid-cols-4">
          {[
            { value: "30+", label: "Tests per computer" },
            { value: "4+", label: "Timers min. batteri" },
            { value: "24", label: "Måneders garanti" },
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

      {/* ── FAQ ── */}
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
          <p className="mt-4 text-gray">
            Alle computere er testet, rengjort og klar med 24 måneders garanti
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
