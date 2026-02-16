import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reparation af iPhone & iPad | PhoneSpot",
  description:
    "Professionel reparation af iPhones og iPads. Skærmskift, batteriskift, vandskade og mere. Hurtig service og faste priser hos PhoneSpot.",
};

const SERVICES = [
  {
    title: "Skærmskift",
    description:
      "Smadret eller ridset skærm? Vi udskifter din skærm med kvalitetsdele og giver garanti på reparationen.",
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
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
  },
  {
    title: "Batteriskift",
    description:
      "Holder dit batteri ikke en hel dag? Vi skifter batteriet så din enhed kører som ny igen.",
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
        <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
        <line x1="23" y1="13" x2="23" y2="11" />
        <line x1="7" y1="10" x2="7" y2="14" />
        <line x1="5" y1="12" x2="9" y2="12" />
      </svg>
    ),
  },
  {
    title: "Vandskade",
    description:
      "Har din enhed fået vand? Jo hurtigere du handler, jo bedre. Vi renser og reparerer vandskadede enheder.",
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
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    ),
  },
  {
    title: "Diverse reparationer",
    description:
      "Ladestik, kamera, højttalere eller andre fejl — vi diagnosticerer og reparerer de fleste problemer.",
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
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
];

const INFO_ITEMS = [
  {
    title: "Hurtig service",
    description:
      "De fleste reparationer udføres inden for 1-2 hverdage. Skærmskift kan ofte klares samme dag.",
  },
  {
    title: "Faste priser",
    description:
      "Vi oplyser altid prisen inden reparationen. Ingen overraskelser eller skjulte gebyrer.",
  },
  {
    title: "Garanti på reparation",
    description:
      "Alle reparationer leveres med garanti på både arbejde og reservedele.",
  },
];

export default function ReparationPage() {
  return (
    <>
      {/* Hero section */}
      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-4 font-display text-3xl font-extrabold italic text-charcoal md:text-4xl">
            Reparation
          </h1>
          <p className="text-lg leading-relaxed text-gray">
            Er din iPhone eller iPad gået i stykker? PhoneSpot tilbyder
            professionel reparation med kvalitetsdele og garanti. Vi reparerer
            alt fra smadrede skærme til slidte batterier — hurtigt og til faste
            priser.
          </p>
        </div>
      </section>

      {/* Service cards */}
      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <div
              key={service.title}
              className="rounded-[16px] border border-sand bg-white p-6"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[12px] bg-green-eco/10 text-green-eco">
                {service.icon}
              </div>
              <h3 className="mb-2 font-display text-xl font-bold italic text-charcoal">
                {service.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Info section */}
      <section className="bg-green-pale">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <h2 className="mb-10 text-center font-display text-3xl font-extrabold italic text-charcoal md:text-4xl">
            Sådan fungerer det
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {INFO_ITEMS.map((item, index) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-eco font-display text-xl font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mb-2 font-display text-xl font-bold italic text-charcoal">
                  {item.title}
                </h3>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-gray">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="rounded-[16px] border border-sand bg-white p-10 text-center md:p-14">
          <h2 className="mb-3 font-display text-2xl font-extrabold italic text-charcoal md:text-3xl">
            Klar til at booke en reparation?
          </h2>
          <p className="mb-8 text-gray">
            Kontakt os med en beskrivelse af problemet, og vi vender hurtigt
            tilbage med pris og tidsestimat.
          </p>
          <Link
            href="/kontakt"
            className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Kontakt os
          </Link>
        </div>
      </section>
    </>
  );
}
