import { STORES } from "@/lib/store-config";

type JsonLdProps = {
  data: Record<string, unknown>;
};

/**
 * Renders structured data as a JSON-LD script tag for SEO.
 *
 * Safety: data can include database values (brand/model names), so "<", ">"
 * and "&" are escaped as unicode — a value containing "</script>" cannot end
 * the tag. The JSON stays valid for crawlers.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

/** Udvidet returret: 30 dage (oven på den lovpligtige fortrydelsesret på 14 dage). */
export const RETURN_DAYS = 30;

export const MERCHANT_RETURN_POLICY_JSONLD: Record<string, unknown> = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "DK",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: RETURN_DAYS,
  returnMethod: ["https://schema.org/ReturnByMail", "https://schema.org/ReturnInStore"],
};

export const ORGANIZATION_JSONLD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": ["Organization", "OnlineStore"],
  name: "PhoneSpot",
  legalName: "PhoneSpot ApS",
  vatID: "DK38688766",
  url: "https://phonespot.dk",
  logo: "https://phonespot.dk/brand/logo.png",
  image: "https://phonespot.dk/brand/logo.png",
  description:
    "Dansk forhandler af brugte og refurbished iPhones, iPads og bærbare med 36 måneders garanti og eget reparationsværksted i Vejle og Slagelse. Batteri min. 90 % ved levering, oplyst delstatus, 30 dages returret og livstidsgaranti på reparation af telefon og tablet.",
  telephone: "+45 61 10 00 48",
  email: "info@phonespot.dk",
  areaServed: { "@type": "Country", name: "Danmark" },
  // Samler PhoneSpot som én entitet på tværs af profiler — søgemaskiner og
  // AI-søgning (bl.a. via Bing) bruger sameAs til at koble omtale og anmeldelser.
  sameAs: [
    "https://dk.trustpilot.com/review/phonespot.dk",
    "https://www.facebook.com/phonespot.dk/",
  ],
  // Begge butikker som selvstændige lokationer (før stod kun Slagelse).
  department: Object.values(STORES).map((s) => ({
    "@type": ["ElectronicsStore", "LocalBusiness"],
    name: s.name,
    telephone: s.phone,
    email: s.email,
    hasMap: s.googleMapsUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: s.street,
      addressLocality: s.city,
      postalCode: s.zip,
      addressCountry: s.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: s.coordinates.lat,
      longitude: s.coordinates.lng,
    },
  })),
  hasMerchantReturnPolicy: MERCHANT_RETURN_POLICY_JSONLD,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: "Danish",
    email: "info@phonespot.dk",
  },
  priceRange: "$$",
};
