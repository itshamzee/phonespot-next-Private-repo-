import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FadeIn } from "@/components/ui/fade-in";
import { JsonLd } from "@/components/seo/json-ld";
import { STORES } from "@/lib/store-config";

export const metadata: Metadata = {
  title: "Besøg PhoneSpot — Butikker i Slagelse & Vejle",
  description:
    "Besøg PhoneSpot i Slagelse eller Vejle. Reparation, personlig rådgivning, sælg din enhed og refurbished elektronik med 36 mdr. garanti.",
  alternates: {
    canonical: "https://phonespot.dk/butik",
  },
  openGraph: {
    title: "Besøg PhoneSpot — Butikker i Slagelse & Vejle",
    description:
      "Besøg PhoneSpot i Slagelse eller Vejle. Reparation, personlig rådgivning, sælg din enhed og refurbished elektronik med 36 mdr. garanti.",
    url: "https://phonespot.dk/butik",
    type: "website",
  },
};

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  );
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function DeviceIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
    </svg>
  );
}

function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function StorefrontIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Services                                                           */
/* ------------------------------------------------------------------ */

const IN_STORE_SERVICES = [
  {
    title: "Reparation",
    description: "Professionel reparation af iPhones, iPads, Samsung og andre enheder med livstidsgaranti.",
    icon: <WrenchIcon className="h-7 w-7" />,
    href: "/reparation",
  },
  {
    title: "Køb refurbished",
    description: "Se og prøv kvalitetstestet refurbished elektronik med 36 mdr. garanti.",
    icon: <DeviceIcon className="h-7 w-7" />,
    href: "/iphones",
  },
  {
    title: "Sælg din enhed",
    description: "Få en fair pris for din brugte enhed. Hurtig vurdering og betaling med det samme.",
    icon: <TagIcon className="h-7 w-7" />,
    href: "/saelg-din-enhed",
  },
  {
    title: "Tilbehør",
    description: "Covers, panserglas, opladere og andet tilbehør til din enhed.",
    icon: <ShoppingBagIcon className="h-7 w-7" />,
    href: "/tilbehoer",
  },
];

/* ------------------------------------------------------------------ */
/*  JSON-LD                                                            */
/* ------------------------------------------------------------------ */

const storeList = Object.values(STORES);

const ORGANIZATION_JSONLD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PhoneSpot",
  url: "https://phonespot.dk",
  logo: "https://phonespot.dk/brand/logo.svg",
  subOrganization: storeList.map((store) => ({
    "@type": "LocalBusiness",
    name: store.name,
    url: `https://phonespot.dk/butik/${store.slug}`,
    telephone: store.phone,
    email: store.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: store.street,
      addressLocality: store.city,
      postalCode: store.zip,
      addressCountry: store.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: store.coordinates.lat,
      longitude: store.coordinates.lng,
    },
  })),
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ButikPage() {
  return (
    <>
      <JsonLd data={ORGANIZATION_JSONLD} />

      {/* -- Hero -- */}
      <SectionWrapper background="charcoal">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Fysiske butikker
            </p>
            <Heading size="xl" className="text-white">
              Besøg PhoneSpot
            </Heading>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Vi har butikker i Slagelse og Vejle, hvor du er velkommen til at
              kigge forbi, prøve produkter og få personlig rådgivning.
            </p>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* -- Store cards -- */}
      <SectionWrapper>
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:grid-cols-2">
            {storeList.map((store, i) => (
              <FadeIn key={store.slug} delay={i * 0.1}>
                <div className="flex h-full flex-col rounded-2xl border border-soft-grey bg-white p-6 shadow-sm transition-shadow hover:shadow-md md:p-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-eco/10 text-green-eco">
                      <StorefrontIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold text-charcoal">
                        {store.name}
                      </h2>
                      {store.mall && (
                        <p className="text-sm text-gray">{store.mall}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-eco" />
                      <p className="text-sm text-gray">
                        {store.street}, {store.zip} {store.city}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-eco" />
                      <div className="text-sm text-gray">
                        <p>Man-Fre: {store.hours.weekdays}</p>
                        <p>Lør: {store.hours.saturday}</p>
                        <p>Søn: {store.hours.sunday}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <PhoneIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-eco" />
                      <a
                        href={`tel:${store.phone.replace(/\s/g, "")}`}
                        className="text-sm text-green-eco hover:underline"
                      >
                        {store.phone}
                      </a>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Link
                      href={`/butik/${store.slug}`}
                      className="inline-flex items-center gap-2 rounded-full bg-green-eco px-6 py-3 text-sm font-bold text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-green-eco/25"
                    >
                      Se butik
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </FadeIn>
            ))}
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
              Hvad kan du gøre i butikken?
            </Heading>
            <p className="mt-4 text-lg text-gray">
              Hos PhoneSpot tilbyder vi mere end bare produkter. Kom forbi og oplev vores service.
            </p>
          </FadeIn>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {IN_STORE_SERVICES.map((service, i) => (
            <FadeIn key={service.title} delay={i * 0.1}>
              <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                  {service.icon}
                </div>
                <h3 className="font-display text-lg font-bold text-charcoal">
                  {service.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray">
                  {service.description}
                </p>
                <Link
                  href={service.href}
                  className="mt-4 inline-flex text-sm font-semibold text-green-eco hover:underline"
                >
                  Læs mere &rarr;
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* -- Trustpilot reference -- */}
      <SectionWrapper background="charcoal">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <div className="mb-4 flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                <path d="M12 1.5l2.76 8.49h8.93l-7.22 5.25 2.76 8.49L12 18.49l-7.23 5.24 2.76-8.49L.31 9.99h8.93z" fill="#00B67A" />
              </svg>
              <span className="text-lg font-bold text-[#00B67A]">Trustpilot</span>
            </div>
            <Heading as="h2" size="md" className="text-white">
              Vores kunder anbefaler os
            </Heading>
            <p className="mt-4 text-white/60">
              Vi er stolte af vores kundetilfredshed. Læs anmeldelser fra rigtige kunder på Trustpilot.
            </p>
            <a
              href="https://dk.trustpilot.com/review/phonespot.dk"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-block rounded-full border-2 border-white/30 px-8 py-3 font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-charcoal"
            >
              Se anmeldelser på Trustpilot &rarr;
            </a>
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
