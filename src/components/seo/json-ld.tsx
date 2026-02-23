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
  "@type": "Organization",
  name: "PhoneSpot",
  url: "https://phonespot.dk",
  logo: "https://phonespot.dk/brand/logo.svg",
  description:
    "Danmarks specialist i kvalitetstestet refurbished elektronik. iPhones, iPads og bærbare med 36 måneders garanti.",
  address: {
    "@type": "PostalAddress",
    addressCountry: "DK",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: "Danish",
  },
};
