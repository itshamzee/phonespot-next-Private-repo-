import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FadeIn } from "@/components/ui/fade-in";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import {
  DOC_TERMS_URL,
  DOC_IPID_URL,
  STORSTROM_PRODUCT_URL,
  INSURANCE_HIGHLIGHTS as HIGHLIGHTS,
  INSURANCE_COVERED as COVERED,
  INSURANCE_NOT_COVERED as NOT_COVERED,
} from "@/lib/insurance-config";

export const metadata: Metadata = {
  title:
    "Elektronikforsikring til din enhed | I samarbejde med Storstrøm Forsikring | PhoneSpot",
  description:
    "PhoneSpot tilbyder i samarbejde med Storstrøm Forsikring elektronikforsikring på refurbished enheder og reparationer. Dæk din enhed mod uheld og funktionsfejl for en lav månedlig rate.",
  keywords:
    "elektronikforsikring, telefonforsikring, mobilforsikring, forsikring refurbished, storstrøm forsikring, forsikring iphone, forsikring computer, skærmskade forsikring, phonespot forsikring",
  alternates: {
    canonical: "https://phonespot.dk/forsikring",
  },
  openGraph: {
    title:
      "Elektronikforsikring til din enhed | PhoneSpot & Storstrøm Forsikring",
    description:
      "Dæk din refurbished enhed mod uheld og funktionsfejl for en lav månedlig rate. Tilbydes i samarbejde med Storstrøm Forsikring.",
    url: "https://phonespot.dk/forsikring",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Data
// Shared product facts (highlights, coverage, docs) live in the single source
// of truth at @/lib/insurance-config so the cart / product add-on stays in
// sync. Page-only content (steps, FAQ) stays here.
// ---------------------------------------------------------------------------

const STEPS = [
  {
    title: "Køb eller reparér i Slagelse",
    description:
      "Køb en refurbished enhed eller få en reparation i PhoneSpot Slagelse. Forsikringen tegnes i forbindelse med købet eller reparationen.",
  },
  {
    title: "Tilføj elektronikforsikring",
    description:
      "Vi opretter forsikringen sammen med dig i butikken og vælger den dækning og selvrisiko, der passer til din enhed.",
  },
  {
    title: "1 kr. den første måned",
    description:
      "Du betaler 1 kr. den første måned og derefter en lav månedlig rate via Betalingsservice. Du kan altid opsige med virkning fra næste måned.",
  },
];

const INSURANCE_FAQ = [
  {
    question: "Hvad dækker elektronikforsikringen?",
    answer:
      "Forsikringen dækker pludselig skade (uheld med øjeblikkelig virkning, fx fald og slag) og funktionsfejl (mekaniske eller elektriske svigt). Den dækker også skade på mobiltelefonbatteriet, hvis kapaciteten falder til under 70 % af det oprindelige, samt pixelfejl ud over producentens accepterede grænse. Det fulde overblik fremgår af forsikringsbetingelserne.",
  },
  {
    question: "Hvad dækker den ikke?",
    answer:
      "Forsikringen dækker ikke almindelig slid, ælde eller gradvis forringelse, rent kosmetiske skader, skader der allerede er dækket af garanti eller reklamationsret, skader forårsaget af dyr, fejl i data og software, virus og hacking, samt skader fra oversvømmelse og naturkatastrofer. Se betingelserne for den fulde liste.",
  },
  {
    question: "Hvor længe er jeg dækket?",
    answer:
      "Forsikringen fornyes automatisk hver måned i op til 60 måneder — dog maksimalt 36 måneder for smartphones. Den dækker maksimalt to skader pr. forsikringsår, og erstatningen kan ikke overstige enhedens oprindelige købspris.",
  },
  {
    question: "Kan refurbished enheder forsikres?",
    answer:
      "Ja. Elektronikforsikringen kan tegnes på refurbished enheder. Ved en totalskade erstatter vi enheden med et nyt eller istandsat produkt med samme eller tilsvarende specifikation.",
  },
  {
    question: "Hvad koster det?",
    answer:
      "Du betaler 1 kr. den første måned og derefter en lav månedlig rate via Betalingsservice. Den månedlige pris og en eventuel selvrisiko afhænger af enheden og den valgte dækning og fremgår af din forsikringsaftale. Vi oplyser den præcise pris i butikken.",
  },
  {
    question: "Hvordan får jeg forsikringen?",
    answer:
      "Forsikringen tegnes i forbindelse med køb af en enhed eller en reparation i PhoneSpot Slagelse — senest 30 dage efter købet. Du skal være fyldt 18 år for at tegne forsikringen.",
  },
  {
    question: "Hvad gør jeg, hvis der sker en skade?",
    answer:
      "Kontakt PhoneSpot, hvor du har tegnet forsikringen. Vi hjælper dig med at anmelde skaden og indlevere enheden til reparation. En eventuel selvrisiko betales direkte til reparatøren.",
  },
  {
    question: "Repareres min enhed med originale dele?",
    answer:
      "Tegner du forsikringen ved køb, repareres enheden som udgangspunkt hos os i PhoneSpot Slagelse. Vi bruger originale Apple-reservedele i vores værksted, hvor det er muligt. For enheder, der på skadetidspunktet er ældre end 2 år, kan der ifølge betingelserne anvendes uoriginale reservedele i bedste tilgængelige kvalitet.",
  },
  {
    question: "Kan jeg fortryde?",
    answer:
      "Ja. Som privatperson har du 14 dages fortrydelsesret på købet af forsikringen. Du kan desuden altid opsige forsikringen skriftligt med virkning fra næste kalendermåned.",
  },
  {
    question: "Kan jeg få forsikringen i Vejle?",
    answer:
      "Indtil videre tilbyder vi tilkøb af elektronikforsikring i vores Slagelse-afdeling. Spørg gerne i butikken eller kontakt os, hvis du vil høre mere.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: INSURANCE_FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5 shrink-0 text-[#1A3D2E]"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5 shrink-0 text-[#86868B]"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      className="h-6 w-6 shrink-0 text-[#1A3D2E]"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ForsikringPage() {
  return (
    <>
      <JsonLd data={faqJsonLd} />

      {/* ── Hero ── */}
      <div className="border-b border-[#E5E5EA] bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <FadeIn>
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
                  I samarbejde med Storstrøm Forsikring
                </p>
                <Heading size="xl" className="text-[#111111]">
                  Elektronikforsikring til din enhed
                </Heading>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#86868B]">
                  Garanti dækker fejl og mangler — men ikke uheld. Derfor er vi
                  gået sammen med Storstrøm Forsikring om at tilbyde
                  elektronikforsikring på dine produkter. Dæk din enhed mod uheld
                  og funktionsfejl for en lav månedlig rate, og vær tryg uanset
                  hvad hverdagen byder på.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    href="#saadan"
                    className="inline-block rounded-full bg-[#1A3D2E] px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Sådan får du den
                  </Link>
                  <Link
                    href="#hvad-daekker"
                    className="inline-block rounded-full border-2 border-[#111111] px-8 py-3 font-semibold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                  >
                    Hvad dækker den?
                  </Link>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="flex justify-center lg:justify-end">
                <div className="overflow-hidden rounded-3xl shadow-sm">
                  <Image
                    src="/brand/partners/storstrom-forsikring-primary.svg"
                    alt="Storstrøm Forsikring"
                    width={1420}
                    height={800}
                    className="h-auto w-72 md:w-80"
                    priority
                  />
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>

      {/* ── Highlight cards ── */}
      <SectionWrapper>
        <FadeIn>
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.label}
                className="rounded-2xl border border-[#1A3D2E]/20 bg-[#1A3D2E]/5 p-6 text-center"
              >
                <p className="font-display text-3xl font-bold text-[#1A3D2E]">
                  {h.value}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111111]">
                  {h.label}
                </p>
                <p className="mt-0.5 text-xs text-[#86868B]">{h.sub}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </SectionWrapper>

      {/* ── Coverage ── */}
      <SectionWrapper background="cream" id="hvad-daekker">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
            Dækning
          </p>
          <Heading as="h2" size="lg">
            Hvad dækker forsikringen?
          </Heading>
          <p className="mt-4 text-lg text-[#86868B]">
            Elektronikforsikringen dækker det, garantien ikke gør — uheld og
            funktionsfejl på din enhed. Her er hovedpunkterne. Det fulde overblik
            findes altid i forsikringsbetingelserne.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Covered */}
          <div className="grid gap-3 sm:grid-cols-2">
            {COVERED.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <CheckIcon />
                  <h3 className="font-display text-sm font-bold text-[#111111]">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#86868B]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Not covered */}
          <div className="rounded-2xl border border-[#E5E5EA] bg-white p-6">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-[#111111]">
              Dækker ikke
            </h3>
            <ul className="mt-4 space-y-3">
              {NOT_COVERED.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <MinusIcon />
                  <span className="text-sm leading-relaxed text-[#86868B]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionWrapper>

      {/* ── How to get it ── */}
      <SectionWrapper id="saadan">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
            Sådan får du den
          </p>
          <Heading as="h2" size="lg">
            Tre trin til at forsikre din enhed
          </Heading>
          <p className="mt-4 text-lg text-[#86868B]">
            Elektronikforsikring tilføjes i forbindelse med dit køb eller din
            reparation. Indtil videre tilbyder vi tilkøb i vores
            Slagelse-afdeling.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded-2xl bg-[#F7F7F8] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A3D2E] font-display text-lg font-bold text-white">
                {i + 1}
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-[#111111]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#86868B]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Repair synergy ── */}
      <SectionWrapper background="green">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
              Repareret hos PhoneSpot
            </p>
            <Heading as="h2" size="md">
              Sker der uheld, repareres din enhed hos os
            </Heading>
            <p className="mt-4 leading-relaxed text-[#86868B]">
              Når du tegner forsikringen ved køb, udføres en eventuel reparation
              som udgangspunkt af os i PhoneSpot Slagelse — samme værksted og
              samme teknikere, som klargør alle vores enheder. Vi bruger
              originale Apple-reservedele, hvor det er muligt, så din enhed
              kommer tilbage i bedst mulige stand.
            </p>
            <p className="mt-3 text-sm text-[#86868B]">
              Du betaler kun en eventuel selvrisiko — resten klarer forsikringen.
            </p>
            <div className="mt-6">
              <Link
                href="/reparation"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A3D2E] hover:underline"
              >
                Se vores reparationer &rarr;
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "2", label: "Skader pr. år dækkes" },
              { value: "14", label: "Dages fortrydelsesret" },
              { value: "60", label: "Dages dækning i udlandet" },
              { value: "100%", label: "Dansk forsikringsselskab" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-white p-6 text-center shadow-sm"
              >
                <p className="font-display text-3xl font-bold text-[#1A3D2E]">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-[#86868B]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ── About Storstrøm ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[200px_1fr]">
          <div className="flex justify-center">
            <div className="overflow-hidden rounded-2xl shadow-sm">
              <Image
                src="/brand/partners/storstrom-forsikring-primary.svg"
                alt="Storstrøm Forsikring"
                width={1420}
                height={800}
                className="h-auto w-48"
              />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
              Vores partner
            </p>
            <Heading as="h2" size="md">
              Om Storstrøm Forsikring
            </Heading>
            <p className="mt-4 leading-relaxed text-[#86868B]">
              Storstrøm Forsikring er et dansk forsikringsselskab, der er
              underlagt tilsyn fra Finanstilsynet og tilmeldt Garantifonden for
              skadeforsikringsselskaber. Al kommunikation og sagsbehandling
              foregår på dansk. Vi har indgået et samarbejde med Storstrøm
              Forsikring, så du kan forsikre din enhed direkte hos os.
            </p>
            <a
              href={STORSTROM_PRODUCT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A3D2E] hover:underline"
            >
              Læs mere hos Storstrøm Forsikring &rarr;
            </a>
          </div>
        </div>
      </SectionWrapper>

      {/* ── FAQ ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
              Spørgsmål & svar
            </p>
            <Heading as="h2" size="md">
              Ofte stillede spørgsmål om elektronikforsikring
            </Heading>
          </div>
          <div className="mt-10 divide-y divide-[#E5E5EA]">
            {INSURANCE_FAQ.map((item) => (
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
        </div>
      </SectionWrapper>

      {/* ── Official documents ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="sm">
            Officielle dokumenter
          </Heading>
          <p className="mt-3 text-sm text-[#86868B]">
            Forsikringsaftalen, policen og forsikringsbetingelserne er altid
            gældende. Læs de officielle dokumenter fra Storstrøm Forsikring her.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <a
              href={DOC_IPID_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-[#E5E5EA] bg-white p-5 text-left transition-shadow hover:shadow-md"
            >
              <DocumentIcon />
              <span>
                <span className="block font-display text-sm font-bold text-[#111111]">
                  Produktinformation (IPID)
                </span>
                <span className="mt-0.5 block text-xs text-[#86868B]">
                  Kort overblik over forsikringen — PDF
                </span>
              </span>
            </a>
            <a
              href={DOC_TERMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-[#E5E5EA] bg-white p-5 text-left transition-shadow hover:shadow-md"
            >
              <DocumentIcon />
              <span>
                <span className="block font-display text-sm font-bold text-[#111111]">
                  Forsikringsbetingelser 7201
                </span>
                <span className="mt-0.5 block text-xs text-[#86868B]">
                  De fulde vilkår — PDF
                </span>
              </span>
            </a>
          </div>
        </div>
      </SectionWrapper>

      {/* ── CTA ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-8 text-center md:p-10">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] md:text-3xl">
            Spørg om elektronikforsikring i PhoneSpot Slagelse
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#86868B]">
            Køber du en refurbished enhed eller får en reparation hos os, hjælper
            vi dig med at tilføje elektronikforsikring. Kig forbi butikken eller
            kontakt os, så fortæller vi mere.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <a
              href={`tel:${STORE.phone.replace(/\s/g, "")}`}
              className="inline-block rounded-full bg-[#1A3D2E] px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Ring {STORE.phone}
            </a>
            <Link
              href="/butik/slagelse"
              className="inline-block rounded-full border-2 border-[#111111] px-8 py-3 font-semibold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
            >
              Find butikken
            </Link>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Trust bar ── */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
