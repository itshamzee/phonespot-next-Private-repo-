import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SellLandingPage, type SellLandingContent } from "@/components/sell-device/sell-landing-page";
import { STORES, openingHoursJsonLd } from "@/lib/store-config";
import { SELL_DEVICES } from "@/app/saelg-din-enhed/[device]/devices";

/**
 * Lokal sælg-side for Vejle (ejerens SEO-prioritet nr. 1). Opkøbsanalysen
 * 10/11-2026 fandt 0 sælg-søgninger med by og ingen side, der kunne rangere
 * på "sælg telefon Vejle". Ingen priser (ejerbeslutning 2026-08-10).
 */

const BASE_URL = "https://phonespot.dk";
const PATH = "/saelg-din-enhed/vejle";
const store = STORES.vejle;

const TITLE = "Sælg telefon i Vejle – aflever i butikken | PhoneSpot";
const DESCRIPTION =
  "Sælg din telefon i Vejle. Aflever på Løversysselvej 3B eller send med gratis label. Fast pris, og pengene samme dag som vi modtager den.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}${PATH}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${BASE_URL}${PATH}`, type: "website", locale: "da_DK", siteName: "PhoneSpot" },
};

const content: SellLandingContent = {
  eyebrow: "Sælg din enhed i Vejle",
  h1: "Sælg din telefon i Vejle",
  answer: `Du sælger din brugte telefon, tablet, computer eller konsol i Vejle ved at beskrive den i formularen og aflevere den hos ${store.name} på ${store.street}. Du får et tilbud først, og prisen står fast, medmindre enheden afviger fra din beskrivelse. Pengene kommer samme dag, som vi modtager enheden.`,
  bodyHeading: "Sådan sælger du i Vejle",
  body: [
    "Beskriv enheden i formularen: model, lagerplads og stand. Vælg aflevering i butikken og Vejle som butik. Du får et tilbud på mail, før du kommer forbi, så du ved præcis, hvad du får.",
    `Butikken ligger på ${store.street}, ${store.zip} ${store.city}, og der er gratis parkering ved døren. Vi tjekker enheden ved disken, og stemmer den med din beskrivelse, får du pengene samme dag.`,
    "Har enheden en revnet skærm eller et slidt batteri, kan vi også se på, om det kan betale sig at reparere den først. Værkstedet ligger samme sted.",
  ],
  coverageHeading: "Det køber vi i Vejle",
  coverage:
    "Telefoner, tablets, MacBook og andre bærbare, smartwatches, spillekonsoller, controllere, høretelefoner, Dyson og smart home. Brugt, ridset eller defekt, og nu også ny og uåbnet elektronik. Telefonen eller tabletten må ikke være låst til en iCloud- eller Google-konto.",
  faqHeading: "Spørgsmål om at sælge i Vejle",
  faq: [
    {
      question: "Hvor kan jeg sælge min telefon i Vejle?",
      answer: `Hos ${store.name} på ${store.street}, ${store.zip} ${store.city}. Beskriv telefonen i formularen, få et tilbud, og aflever den i butikken. Der er gratis parkering ved butikken.`,
    },
    {
      question: "Skal jeg have et tilbud, før jeg kommer?",
      answer:
        "Det er det hurtigste. Når du har tilbuddet, går afleveringen hurtigt ved disken, og du ved på forhånd, hvad du får. Prisen står fast, medmindre enheden afviger fra din beskrivelse.",
    },
    {
      question: "Hvornår får jeg pengene?",
      answer: "Samme dag, som vi modtager enheden. Pengene går til den konto, du oplyser, når du accepterer tilbuddet.",
    },
    {
      question: "Kan jeg sælge, hvis jeg bor i Horsens, Kolding eller Fredericia?",
      answer:
        "Ja. Kør forbi butikken i Vejle, eller send enheden med en gratis label. Prisen og løfterne er de samme.",
    },
    {
      question: "Køber I også defekte og nye enheder?",
      answer:
        "Ja. Markér i formularen, hvad der ikke virker, så vurderer vi enheden ud fra det. Er enheden ny og uåbnet, så skriv det i kommentarfeltet.",
    },
  ],
  blogSlugs: ["saelg-brugt-elektronik-guide", "saelg-paa-dba-eller-til-opkoeber", "hvad-er-din-brugte-iphone-vaerd"],
};

export default function SellInVejlePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Opkøb af brugt elektronik i Vejle",
          serviceType: "Opkøb af brugt elektronik",
          url: `${BASE_URL}${PATH}`,
          areaServed: { "@type": "City", name: "Vejle" },
          provider: {
            "@type": "ElectronicsStore",
            name: store.name,
            telephone: store.phone,
            address: {
              "@type": "PostalAddress",
              streetAddress: store.street,
              postalCode: store.zip,
              addressLocality: store.city,
              addressCountry: store.countryCode,
            },
            geo: { "@type": "GeoCoordinates", latitude: store.coordinates.lat, longitude: store.coordinates.lng },
            openingHoursSpecification: openingHoursJsonLd(store.hours),
          },
        }}
      />
      <SellLandingPage
        content={content}
        path={PATH}
        crumbs={[{ name: "Sælg i Vejle", label: "Vejle" }]}
        readMoreLinks={[
          { href: "/butik/vejle", label: "PhoneSpot Vejle: adresse og åbningstider" },
          { href: "/reparation-vejle", label: "Reparation i Vejle" },
          { href: "/saelg-din-enhed/kolding", label: "Sælg i Kolding" },
          { href: "/saelg-din-enhed/horsens", label: "Sælg i Horsens" },
          { href: "/saelg-din-enhed/fredericia", label: "Sælg i Fredericia" },
          { href: "/saelg-din-enhed/slagelse", label: "Sælg i Slagelse" },
        ]}
        relatedHeading="Sælg en bestemt enhed"
        relatedLinks={SELL_DEVICES.map((device) => ({ href: `/saelg-din-enhed/${device.slug}`, label: `Sælg ${device.linkLabel}` }))}
      />
    </>
  );
}
