import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SellLandingPage, type SellLandingContent } from "@/components/sell-device/sell-landing-page";
import { STORES, openingHoursJsonLd } from "@/lib/store-config";
import { SELL_DEVICES } from "@/app/saelg-din-enhed/[device]/devices";

/**
 * Lokale sælg-sider for byer ud over Vejle (som har sin egen side). Slagelse
 * har butik; Kolding, Horsens og Fredericia har ikke, så de sider siger det
 * ligeud og peger på gratis label eller butikken i Vejle. Ingen priser.
 */

const BASE_URL = "https://phonespot.dk";

export type SellCity = {
  slug: "slagelse" | "kolding" | "horsens" | "fredericia";
  city: string;
  /** Butikken, enheden afleveres i. Er den i byen selv, er `local` true. */
  store: "vejle" | "slagelse";
  local: boolean;
  title: string;
  description: string;
  /** Én sætning, der kun gælder denne by. */
  localNote: string;
};

export const SELL_CITIES: SellCity[] = [
  {
    slug: "slagelse",
    city: "Slagelse",
    store: "slagelse",
    local: true,
    title: "Sælg telefon i Slagelse – aflever i butikken | PhoneSpot",
    description:
      "Sælg din telefon i Slagelse. Aflever i VestsjællandsCentret eller send med gratis label. Fast pris, og pengene samme dag som vi modtager den.",
    localNote: "Butikken ligger i VestsjællandsCentret og har åbent alle ugens dage, også søndag.",
  },
  {
    slug: "kolding",
    city: "Kolding",
    store: "vejle",
    local: false,
    title: "Sælg telefon i Kolding – gratis label | PhoneSpot",
    description:
      "Sælg din telefon fra Kolding. Send den med gratis label, eller aflever i butikken i Vejle. Fast pris, og pengene samme dag som vi modtager den.",
    localNote: "Fra Kolding er der omkring en halv times kørsel ad E45 til butikken i Vejle.",
  },
  {
    slug: "horsens",
    city: "Horsens",
    store: "vejle",
    local: false,
    title: "Sælg telefon i Horsens – gratis label | PhoneSpot",
    description:
      "Sælg din telefon fra Horsens. Send den med gratis label, eller aflever i butikken i Vejle. Fast pris, og pengene samme dag som vi modtager den.",
    localNote: "Fra Horsens er der omkring en halv times kørsel sydpå ad E45 til butikken i Vejle.",
  },
  {
    slug: "fredericia",
    city: "Fredericia",
    store: "vejle",
    local: false,
    title: "Sælg telefon i Fredericia – gratis label | PhoneSpot",
    description:
      "Sælg din telefon fra Fredericia. Send den med gratis label, eller aflever i butikken i Vejle. Fast pris, og pengene samme dag som vi modtager den.",
    localNote: "Fra Fredericia er der omkring en halv times kørsel til butikken i Vejle.",
  },
];

export function getSellCity(slug: SellCity["slug"]): SellCity {
  const city = SELL_CITIES.find((entry) => entry.slug === slug);
  if (!city) throw new Error(`Ukendt by: ${slug}`);
  return city;
}

export function sellCityMetadata(slug: SellCity["slug"]): Metadata {
  const city = getSellCity(slug);
  const url = `${BASE_URL}/saelg-din-enhed/${city.slug}`;
  return {
    title: { absolute: city.title },
    description: city.description,
    alternates: { canonical: url },
    openGraph: { title: city.title, description: city.description, url, type: "website", locale: "da_DK", siteName: "PhoneSpot" },
  };
}

function cityContent(city: SellCity): SellLandingContent {
  const store = STORES[city.store];
  const address = `${store.street}, ${store.zip} ${store.city}`;

  if (city.local) {
    return {
      eyebrow: `Sælg din enhed i ${city.city}`,
      h1: `Sælg din telefon i ${city.city}`,
      answer: `Du sælger din brugte telefon, tablet, computer eller konsol i ${city.city} ved at beskrive den i formularen og aflevere den hos ${store.name}, ${store.street}. Du får et tilbud først, og prisen står fast, medmindre enheden afviger fra din beskrivelse. Pengene kommer samme dag, som vi modtager enheden.`,
      bodyHeading: `Sådan sælger du i ${city.city}`,
      body: [
        `Beskriv enheden i formularen: model, lagerplads og stand. Vælg aflevering i butikken og ${city.city} som butik. Du får et tilbud på mail, før du kommer forbi, så du ved præcis, hvad du får.`,
        `${city.localNote} Vi tjekker enheden ved disken, og stemmer den med din beskrivelse, får du pengene samme dag.`,
        "Har enheden en revnet skærm eller et slidt batteri, kan vi også se på, om det kan betale sig at reparere den først. Værkstedet ligger samme sted.",
      ],
      coverageHeading: `Det køber vi i ${city.city}`,
      coverage:
        "Telefoner, tablets, MacBook og andre bærbare, smartwatches, spillekonsoller, controllere, høretelefoner, Dyson og smart home. Brugt, ridset eller defekt, og nu også ny og uåbnet elektronik. Telefonen eller tabletten må ikke være låst til en iCloud- eller Google-konto.",
      faqHeading: `Spørgsmål om at sælge i ${city.city}`,
      faq: [
        {
          question: `Hvor kan jeg sælge min telefon i ${city.city}?`,
          answer: `Hos ${store.name}, ${address}. Beskriv telefonen i formularen, få et tilbud, og aflever den i butikken.`,
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
          question: "Kan jeg sende enheden i stedet for at komme forbi?",
          answer: "Ja. Vælg gratis label i formularen, så får du en fragtlabel på mail. Prisen og løfterne er de samme.",
        },
        {
          question: "Køber I også defekte og nye enheder?",
          answer:
            "Ja. Markér i formularen, hvad der ikke virker, så vurderer vi enheden ud fra det. Er enheden ny og uåbnet, så skriv det i kommentarfeltet.",
        },
      ],
      blogSlugs: ["saelg-brugt-telefon-slagelse", "saelg-brugt-elektronik-guide", "saelg-paa-dba-eller-til-opkoeber"],
    };
  }

  return {
    eyebrow: `Sælg din enhed fra ${city.city}`,
    h1: `Sælg din telefon i ${city.city}`,
    answer: `Bor du i ${city.city}, sælger du din brugte telefon, tablet, computer eller konsol ved at beskrive den i formularen og sende den med en gratis label, eller aflevere den hos ${store.name}. Vi har ikke butik i ${city.city}. Du får et tilbud først, og pengene kommer samme dag, som vi modtager enheden.`,
    bodyHeading: `Sådan sælger du fra ${city.city}`,
    body: [
      "Beskriv enheden i formularen: model, lagerplads og stand. Du får et tilbud på mail, og prisen står fast, medmindre enheden afviger fra din beskrivelse.",
      `Vælg gratis label, hvis du vil sende. Du får en fragtlabel på mail, pakker enheden ind og afleverer pakken i en pakkeshop i ${city.city}. Siger du nej efter vores tjek, sender vi enheden gratis retur.`,
      `Vil du hellere aflevere selv, ligger nærmeste butik på ${address}, med gratis parkering ved døren. ${city.localNote}`,
    ],
    coverageHeading: "Det køber vi",
    coverage:
      "Telefoner, tablets, MacBook og andre bærbare, smartwatches, spillekonsoller, controllere, høretelefoner, Dyson og smart home. Brugt, ridset eller defekt, og nu også ny og uåbnet elektronik. Telefonen eller tabletten må ikke være låst til en iCloud- eller Google-konto.",
    faqHeading: `Spørgsmål om at sælge fra ${city.city}`,
    faq: [
      {
        question: `Har I en butik i ${city.city}?`,
        answer: `Nej. Nærmeste butik er ${store.name} på ${address}. De fleste i ${city.city} sender enheden med gratis label.`,
      },
      {
        question: "Hvad koster det at sende enheden?",
        answer: "Ingenting. Du får en fragtlabel på mail, og vi betaler fragten. Køber vi ikke enheden, sender vi den gratis retur.",
      },
      {
        question: "Hvornår får jeg pengene?",
        answer: "Samme dag, som vi modtager enheden. Pengene går til den konto, du oplyser, når du accepterer tilbuddet.",
      },
      {
        question: "Kan prisen ændre sig, når I har set enheden?",
        answer:
          "Kun hvis enheden afviger fra din beskrivelse. Så får du et nyt tilbud, som du kan sige ja eller nej til. Siger du nej, får du enheden gratis retur.",
      },
      {
        question: "Køber I også defekte og nye enheder?",
        answer:
          "Ja. Markér i formularen, hvad der ikke virker, så vurderer vi enheden ud fra det. Er enheden ny og uåbnet, så skriv det i kommentarfeltet.",
      },
    ],
    blogSlugs: ["saelg-brugt-elektronik-guide", "saelg-paa-dba-eller-til-opkoeber", "hvad-er-din-brugte-iphone-vaerd"],
  };
}

export function SellCityPage({ slug }: { slug: SellCity["slug"] }) {
  const city = getSellCity(slug);
  const store = STORES[city.store];
  const path = `/saelg-din-enhed/${city.slug}`;
  const otherCities = SELL_CITIES.filter((entry) => entry.slug !== city.slug);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: `Opkøb af brugt elektronik i ${city.city}`,
          serviceType: "Opkøb af brugt elektronik",
          url: `${BASE_URL}${path}`,
          areaServed: { "@type": "City", name: city.city },
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
        content={cityContent(city)}
        path={path}
        crumbs={[{ name: `Sælg i ${city.city}`, label: city.city }]}
        readMoreLinks={[
          { href: `/butik/${store.slug}`, label: `${store.name}: adresse og åbningstider` },
          { href: `/reparation-${city.slug}`, label: `Reparation i ${city.city}` },
          { href: "/saelg-din-enhed/vejle", label: "Sælg i Vejle" },
          ...otherCities.map((entry) => ({ href: `/saelg-din-enhed/${entry.slug}`, label: `Sælg i ${entry.city}` })),
        ]}
        relatedHeading="Sælg en bestemt enhed"
        relatedLinks={SELL_DEVICES.map((device) => ({ href: `/saelg-din-enhed/${device.slug}`, label: `Sælg ${device.linkLabel}` }))}
      />
    </>
  );
}
