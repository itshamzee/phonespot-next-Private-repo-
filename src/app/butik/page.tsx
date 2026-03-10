import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FadeIn } from "@/components/ui/fade-in";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";

export const metadata: Metadata = {
  title: "PhoneSpot Slagelse — Besøg os i VestsjællandsCentret",
  description:
    "Besøg PhoneSpot i VestsjællandsCentret, Slagelse. Reparation, personlig rådgivning og refurbished elektronik med 36 mdr. garanti.",
  alternates: {
    canonical: "https://phonespot.dk/butik",
  },
  openGraph: {
    title: "PhoneSpot Slagelse — Besøg os i VestsjællandsCentret",
    description:
      "Besøg PhoneSpot i VestsjællandsCentret, Slagelse. Reparation, personlig rådgivning og refurbished elektronik med 36 mdr. garanti.",
    url: "https://phonespot.dk/butik",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Icons (inline SVG)
// ---------------------------------------------------------------------------

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function DeviceIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function StorefrontIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// JSON-LD structured data
// ---------------------------------------------------------------------------

const LOCAL_BUSINESS_JSONLD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: STORE.name,
  image: "https://phonespot.dk/brand/logo.svg",
  url: "https://phonespot.dk/butik",
  telephone: STORE.phone,
  email: STORE.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: STORE.street,
    addressLocality: STORE.city,
    postalCode: STORE.zip,
    addressCountry: STORE.countryCode,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: STORE.coordinates.lat,
    longitude: STORE.coordinates.lng,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "10:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "10:00",
      closes: "16:00",
    },
  ],
  priceRange: "$$",
};

// ---------------------------------------------------------------------------
// Services data
// ---------------------------------------------------------------------------

const SERVICES = [
  {
    title: "Reparation",
    description:
      "Professionel reparation af iPhones, iPads og andre enheder. Hurtig service med kvalitetsdele og garanti.",
    icon: "wrench" as const,
    href: "/reparation",
  },
  {
    title: "Personlig rådgivning",
    description:
      "Få hjælp til at finde den perfekte enhed. Vores eksperter guider dig baseret på dine behov og budget.",
    icon: "chat" as const,
    href: null,
  },
  {
    title: "Afprøv produkter",
    description:
      "Se og prøv vores refurbished enheder i butikken, før du køber. Mærk kvaliteten selv.",
    icon: "device" as const,
    href: null,
  },
];

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  wrench: <WrenchIcon className="h-7 w-7" />,
  chat: <ChatIcon className="h-7 w-7" />,
  device: <DeviceIcon className="h-7 w-7" />,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ButikPage() {
  return (
    <>
      <JsonLd data={LOCAL_BUSINESS_JSONLD} />

      {/* -- Hero -- */}
      <SectionWrapper background="charcoal">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Fysisk butik
            </p>
            <Heading size="xl" className="text-white">
              Besøg {STORE.name}
            </Heading>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Vi har en fysisk butik i {STORE.mall}, hvor du er velkommen til at
              kigge forbi, prøve produkter og få personlig rådgivning. Kom og
              oplev vores udvalg af kvalitetstestet refurbished elektronik.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5">
              <StorefrontIcon className="h-5 w-5 text-green-eco" />
              <span className="text-sm font-semibold text-white">
                {STORE.mall}
              </span>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* -- Google Maps embed -- */}
      <section className="bg-warm-white">
        <FadeIn>
          <iframe
            src={STORE.googleMapsEmbed}
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Google Maps — ${STORE.name}`}
            className="w-full"
          />
        </FadeIn>
      </section>

      {/* -- Address + Hours -- */}
      <SectionWrapper>
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Address card */}
            <FadeIn>
              <div className="flex h-full gap-5 rounded-2xl border border-soft-grey bg-white p-6 md:p-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-eco/10">
                  <MapPinIcon className="h-6 w-6 text-green-eco" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-charcoal">
                    Adresse
                  </h2>
                  <p className="mt-2 text-sm text-gray">{STORE.company}</p>
                  <p className="text-sm text-gray">{STORE.street}</p>
                  <p className="text-sm text-gray">
                    {STORE.zip} {STORE.city}
                  </p>
                  <p className="mt-2 text-sm text-gray">
                    Tlf:{" "}
                    <a
                      href={`tel:${STORE.phone.replace(/\s/g, "")}`}
                      className="text-green-eco hover:underline"
                    >
                      {STORE.phone}
                    </a>
                  </p>
                  <p className="text-sm text-gray">
                    Email:{" "}
                    <a
                      href={`mailto:${STORE.email}`}
                      className="text-green-eco hover:underline"
                    >
                      {STORE.email}
                    </a>
                  </p>
                  {STORE.googleMapsUrl && (
                    <a
                      href={STORE.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-eco hover:underline"
                    >
                      <MapPinIcon className="h-4 w-4" />
                      Se på Google Maps &rarr;
                    </a>
                  )}
                </div>
              </div>
            </FadeIn>

            {/* Hours card */}
            <FadeIn delay={0.1}>
              <div className="flex h-full gap-5 rounded-2xl border border-soft-grey bg-white p-6 md:p-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-eco/10">
                  <ClockIcon className="h-6 w-6 text-green-eco" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-charcoal">
                    Åbningstider
                  </h2>
                  <div className="mt-2 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray">Mandag – Fredag</span>
                      <span className="font-medium text-charcoal">
                        {STORE.hours.weekdays}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray">Lørdag</span>
                      <span className="font-medium text-charcoal">
                        {STORE.hours.saturday}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray">Søndag</span>
                      <span className="font-medium text-charcoal">
                        {STORE.hours.sunday}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray">
                    Følger {STORE.mall}s åbningstider. Kan variere på helligdage.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </SectionWrapper>

      {/* -- Services -- */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              I butikken
            </p>
            <Heading as="h2" size="lg">
              Hvad kan du opleve hos os?
            </Heading>
            <p className="mt-4 text-lg text-gray">
              Hos {STORE.name} tilbyder vi mere end bare produkter. Kom forbi og
              oplev vores service.
            </p>
          </FadeIn>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <FadeIn key={service.title} delay={i * 0.1}>
              <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                  {SERVICE_ICONS[service.icon]}
                </div>
                <h3 className="font-display text-lg font-bold text-charcoal">
                  {service.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray">
                  {service.description}
                </p>
                {service.href && (
                  <Link
                    href={service.href}
                    className="mt-4 inline-flex text-sm font-semibold text-green-eco hover:underline"
                  >
                    Læs mere &rarr;
                  </Link>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* -- CTA -- */}
      <SectionWrapper background="charcoal">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <Heading as="h2" size="md" className="text-white">
              Har du spørgsmål?
            </Heading>
            <p className="mt-4 text-white/60">
              Kontakt os inden du besøger butikken, eller find vej direkte via
              Google Maps. Vi glæder os til at se dig!
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/kontakt"
                className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Kontakt os &rarr;
              </Link>
              {STORE.googleMapsUrl && (
                <a
                  href={STORE.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-full border-2 border-white/30 px-8 py-3 font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-charcoal"
                >
                  Find vej &rarr;
                </a>
              )}
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* -- Trust bar -- */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
