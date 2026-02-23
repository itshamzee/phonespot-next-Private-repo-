import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FadeIn } from "@/components/ui/fade-in";

export const metadata: Metadata = {
  title: "Prismatch-Garanti | PhoneSpot",
  description:
    "Finder du en billigere pris på en refurbished enhed hos en dansk konkurrent? PhoneSpot matcher prisen. Læs betingelserne her.",
  alternates: {
    canonical: "https://phonespot.dk/prismatch",
  },
  openGraph: {
    title: "Prismatch-Garanti | PhoneSpot",
    description:
      "Finder du en billigere pris på en refurbished enhed hos en dansk konkurrent? PhoneSpot matcher prisen. Læs betingelserne her.",
    url: "https://phonespot.dk/prismatch",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const STEPS = [
  {
    number: "1",
    title: "Find en lavere pris",
    description:
      "Find en billigere pris på en sammenlignelig refurbished enhed hos en dansk konkurrent med aktiv dansk webshop. Enheden skal være samme model, samme grade og på lager.",
  },
  {
    number: "2",
    title: "Kontakt os med et link",
    description:
      "Send os et link til den billigere pris via vores kontaktformular eller email. Husk at inkludere hvilken enhed det drejer sig om, og linket til konkurrentens tilbud.",
  },
  {
    number: "3",
    title: "Vi matcher prisen",
    description:
      "Vi verificerer prisen og matcher den. Så enkelt er det. Du får den bedste pris — med PhoneSpots 36 måneders garanti, 30+ kvalitetstests og 14 dages returret oveni.",
  },
];

const CONDITIONS = [
  "Kun danske konkurrenter med aktiv dansk webshop",
  "Samme model, samme kosmetiske grade og på lager hos konkurrenten",
  "Offentligt tilgængelig pris (ikke medlemsrabatter, kuponer eller flash sales)",
  "Ikke markedspladssælgere (DBA, Facebook Marketplace) eller private sælgere",
  "PhoneSpot forbeholder sig retten til at vurdere sammenlignelighed",
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PrismatchPage() {
  return (
    <>
      {/* -- Hero -- */}
      <SectionWrapper background="charcoal">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Prismatch
            </p>
            <Heading size="xl" className="text-white">
              Prismatch-garanti
            </Heading>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Hos PhoneSpot er vi overbeviste om, at vi tilbyder Danmarks bedste
              priser på kvalitetstestet refurbished elektronik. Men finder du
              alligevel en billigere pris hos en dansk konkurrent? Så matcher vi
              den &mdash; uden tøven. Du får stadig vores 36 måneders garanti,
              30+ kvalitetstests og 14 dages returret.
            </p>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* -- Sådan fungerer det -- */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              3 nemme trin
            </p>
            <Heading as="h2" size="lg">
              Sådan fungerer det
            </Heading>
            <p className="mt-4 text-lg text-gray">
              Prismatch hos PhoneSpot er enkelt og gennemsigtigt. Følg disse tre
              trin, og du er sikret den laveste pris.
            </p>
          </FadeIn>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <FadeIn key={step.number} delay={i * 0.1}>
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-eco font-display text-2xl font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-charcoal">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray">
                  {step.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* -- Betingelser -- */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <div className="text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
                Vilkår
              </p>
              <Heading as="h2" size="lg">
                Betingelser
              </Heading>
              <p className="mt-4 text-lg text-gray">
                For at sikre en fair sammenligning gælder følgende betingelser
                for vores prismatch-garanti.
              </p>
            </div>
            <ul className="mt-10 space-y-4">
              {CONDITIONS.map((condition) => (
                <li
                  key={condition}
                  className="flex items-start gap-3 text-charcoal"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="mt-0.5 h-5 w-5 shrink-0 text-green-eco"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-base leading-relaxed">{condition}</span>
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* -- Hvorfor vi tør give prismatch -- */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <div className="rounded-2xl border border-green-eco/20 bg-green-eco/5 p-8 md:p-10">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
                Vores fordel
              </p>
              <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-charcoal md:text-3xl">
                Hvorfor vi tør give prismatch
              </h2>
              <p className="mt-4 leading-relaxed text-gray">
                Vi køber ind direkte fra certificerede europæiske leverandører og
                holder vores omkostninger lave. Det betyder, at vi næsten altid
                har de bedste priser i Danmark på refurbished elektronik. Vi er
                så sikre på vores priser, at vi tør tilbyde prismatch-garanti
                &mdash; noget ingen af vores danske konkurrenter gør.
              </p>
              <p className="mt-4 leading-relaxed text-gray">
                Og i de sjældne tilfælde hvor en konkurrent har en lavere pris,
                matcher vi den gerne. For hos PhoneSpot får du ikke bare den
                bedste pris &mdash; du får også 36 måneders garanti, over 30
                individuelle kvalitetstests og 14 dages fuld returret. Det er
                tryghed du ikke finder andre steder.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-sm font-medium text-green-eco">
                <span className="flex items-center gap-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  36 mdr. garanti
                </span>
                <span className="flex items-center gap-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  30+ kvalitetstests
                </span>
                <span className="flex items-center gap-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  14 dages returret
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* -- Trust bar -- */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>

      {/* -- CTA -- */}
      <SectionWrapper>
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <Heading as="h2" size="md">
              Fundet en lavere pris? Kontakt os
            </Heading>
            <p className="mt-4 text-gray">
              Send os et link til den billigere pris, og vi matcher den. Du kan
              også kontakte os, hvis du har spørgsmål til vores
              prismatch-garanti.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/kontakt"
                className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Kontakt os &rarr;
              </Link>
              <Link
                href="/iphones"
                className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
              >
                Se vores udvalg &rarr;
              </Link>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>
    </>
  );
}
