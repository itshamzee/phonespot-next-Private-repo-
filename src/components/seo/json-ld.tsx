import { STORE } from "@/lib/store-config";

type JsonLdProps = {
  data: Record<string, unknown>;
};

/**
 * Renders structured data as a JSON-LD script tag for SEO.
 *
 * Safety: dangerouslySetInnerHTML is used here with static, build-time-only
 * data (never user input), so there is no XSS risk.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export const ORGANIZATION_JSONLD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  name: "PhoneSpot",
  url: "https://phonespot.dk",
  logo: "https://phonespot.dk/brand/logo.png",
  image: "https://phonespot.dk/brand/logo.png",
  description:
    "Refurbished elektronik og reparation af telefoner og tablets med butikker i Vejle og Slagelse. Refurbished iPhones, iPads og MacBooks med 36 måneders garanti; reparation mens du venter med livstidsgaranti på arbejde og dele.",
  telephone: "+45 61 10 00 48",
  areaServed: { "@type": "Country", name: "Danmark" },
  // Samler PhoneSpot som én entitet på tværs af profiler — søgemaskiner og
  // AI-søgning (bl.a. via Bing) bruger sameAs til at koble omtale og anmeldelser.
  sameAs: [
    "https://dk.trustpilot.com/review/phonespot.dk",
    "https://www.facebook.com/phonespot.dk/",
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: STORE.street,
    addressLocality: STORE.city,
    postalCode: STORE.zip,
    addressCountry: STORE.countryCode,
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: "Danish",
    email: "info@phonespot.dk",
  },
  priceRange: "$$",
};
