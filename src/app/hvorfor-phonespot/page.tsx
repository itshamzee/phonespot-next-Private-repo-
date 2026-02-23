import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hvorfor PhoneSpot? | PhoneSpot",
  description:
    "PhoneSpot gør premium tech tilgængeligt og bæredygtigt. Kvalitetstestede produkter med 36 måneders garanti og dansk kundeservice.",
};

const VALUES = [
  {
    title: "Kvalitetstestet",
    description:
      "Hvert eneste produkt gennemgår en grundig inspektion med 30+ tests — fra batteri og skærm til kamera og højttalere. Vi sælger kun det, vi selv ville bruge.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: "Bæredygtigt",
    description:
      "Ved at vælge refurbished forlænger du enhedens levetid og reducerer e-affald. Det er et aktivt valg for en grønnere fremtid.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66L7.5 17" />
        <path d="M17 8c3 0 7-1 7-5-4 0-5 4-5 4" />
        <path d="M17 8c-3 0-7-1-7-5 4 0 5 4 5 4" />
        <path d="M7.5 17c-2.5 0-4 2-4 2s2 1.5 4 0" />
      </svg>
    ),
  },
  {
    title: "Tilgængeligt",
    description:
      "Premium tech behøver ikke koste en formue. Spar op til 40% sammenlignet med nye produkter — uden at gå på kompromis med kvaliteten.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path d="M19 5L5 19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    ),
  },
  {
    title: "Dansk kvalitet",
    description:
      "Vi er en dansk virksomhed med dansk kundeservice. Alle produkter sendes fra Danmark med hurtig levering via GLS.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

const TRUST_ITEMS = [
  {
    title: "Trustpilot",
    description: "Vores kunder anbefaler os. Se anmeldelserne på Trustpilot.",
  },
  {
    title: "e-mærket",
    description: "Vi er e-mærket — din garanti for sikker nethandel i Danmark.",
  },
  {
    title: "36 mdr. garanti",
    description:
      "Alle refurbished produkter leveres med 36 måneders garanti som standard.",
  },
];

export default function HvorforPhonespotPage() {
  return (
    <>
      {/* Hero section */}
      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-4 font-display text-3xl font-extrabold italic text-charcoal md:text-4xl">
            Hvorfor PhoneSpot?
          </h1>
          <p className="text-lg leading-relaxed text-gray">
            Vi tror på, at premium tech skal være tilgængeligt for alle — uden at
            det koster jorden. Bogstaveligt talt. PhoneSpot gør det nemt at
            vælge kvalitetstestet, bæredygtig teknologi til en fair pris.
          </p>
        </div>
      </section>

      {/* Value cards */}
      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((value) => (
            <div
              key={value.title}
              className="rounded-[16px] border border-sand bg-white p-6"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[12px] bg-green-eco/10 text-green-eco">
                {value.icon}
              </div>
              <h3 className="mb-2 font-display text-xl font-bold italic text-charcoal">
                {value.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Eco-banner section */}
      <section className="bg-green-eco text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 font-display text-3xl font-extrabold italic md:text-4xl">
              Et grønnere valg
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-white/80">
              Elektronikproduktion er en af de mest ressourcekrævende industrier
              i verden. Ved at vælge refurbished gør du en aktiv forskel.
            </p>
            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <p className="font-display text-4xl font-extrabold italic">
                  80%
                </p>
                <p className="mt-1 text-sm text-white/70">
                  mindre CO2-udledning sammenlignet med ny produktion
                </p>
              </div>
              <div>
                <p className="font-display text-4xl font-extrabold italic">
                  50 mio.
                </p>
                <p className="mt-1 text-sm text-white/70">
                  tons e-affald genereres globalt hvert år
                </p>
              </div>
              <div>
                <p className="font-display text-4xl font-extrabold italic">
                  2+ år
                </p>
                <p className="mt-1 text-sm text-white/70">
                  ekstra levetid for enheder der genbruges
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <h2 className="mb-10 text-center font-display text-3xl font-extrabold italic text-charcoal md:text-4xl">
          Handl med tryghed
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-[16px] border border-sand bg-white p-6 text-center"
            >
              <h3 className="mb-2 font-display text-xl font-bold italic text-charcoal">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
        <div className="rounded-[16px] border border-sand bg-white p-10 text-center md:p-14">
          <h2 className="mb-3 font-display text-2xl font-extrabold italic text-charcoal md:text-3xl">
            Klar til at finde din næste enhed?
          </h2>
          <p className="mb-8 text-gray">
            Udforsk vores udvalg af kvalitetstestede iPhones, iPads og meget
            mere.
          </p>
          <Link
            href="/iphones"
            className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Se produkter
          </Link>
        </div>
      </section>
    </>
  );
}
