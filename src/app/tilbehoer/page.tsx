import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { HubPageClient } from "@/components/tilbehoer/hub-page-client";

export const metadata: Metadata = {
  title: "Tilbehør til iPhone, iPad & Samsung | PhoneSpot",
  description:
    "Covers, panserglas, opladere, kabler og tilbehør til din telefon og tablet. Altid hurtig levering og skarpe priser hos PhoneSpot.",
  alternates: { canonical: "https://phonespot.dk/tilbehoer" },
  openGraph: {
    title: "Tilbehør til iPhone, iPad & Samsung | PhoneSpot",
    description:
      "Covers, panserglas, opladere, kabler og tilbehør til din telefon og tablet.",
    url: "https://phonespot.dk/tilbehoer",
  },
};

export default function TilbehoerPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
      { "@type": "ListItem", position: 2, name: "Tilbehør", item: "https://phonespot.dk/tilbehoer" },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <HubPageClient />
    </>
  );
}
