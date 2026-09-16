import type { Metadata } from "next";
import { DeviceCollection, type CollectionFaq } from "@/components/product/device-collection";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Refurbished iPhones med 36 måneders garanti | PhoneSpot",
  description: "Find en kvalitetstestet refurbished iPhone. Sammenlign aktuelle modeller, priser, stand og lager hos PhoneSpot.",
  alternates: { canonical: "https://phonespot.dk/iphones" },
  openGraph: {
    title: "Refurbished iPhones | PhoneSpot",
    description: "Sammenlign aktuelle refurbished iPhones efter pris, stand, lagerplads og tilgængelighed.",
    url: "https://phonespot.dk/iphones",
  },
};

const FAQS: CollectionFaq[] = [
  { question: "Hvordan vælger jeg den rigtige iPhone?", answer: "Begynd med skærmstørrelse, kamera, lagerplads og dit budget. På den enkelte model kan du sammenligne de enheder, der faktisk er tilgængelige lige nu." },
  { question: "Hvad betyder stand A, B og C?", answer: "Stand A, B og C beskriver den kosmetiske stand og mængden af synlige brugsspor. Enhedens konkrete stand og billeder fremgår af produktsiden." },
  { question: "Hvordan er batteriet på en refurbished iPhone?", answer: "Batteriet vurderes på den enkelte enhed. Se den målte batterioplysning på produktsiden; den kosmetiske stand bruges ikke som mål for batteriet." },
  { question: "Kan jeg se telefonen i en butik?", answer: "Filteret for afhentning viser kun modeller med faktisk butikslager. Lagerstedet står også på det enkelte produktkort, når enheden findes i en butik." },
];

const CHOICES = [
  { title: "Størrelse", body: "Vælg en størrelse, der passer til din hånd og den måde, du bruger telefonen på." },
  { title: "Lagerplads", body: "Billeder, video og apps fylder mest. Brug lagerfilteret til at afgrænse de aktuelle muligheder." },
  { title: "Stand og batteri", body: "Vælg kosmetisk stand efter dine ønsker, og læs altid batterioplysningen for den konkrete enhed." },
];

export default async function IphonesPage() {
  const templates = await getPublishedTemplates("iphone", { inStock: true });
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
      { "@type": "ListItem", position: 2, name: "Refurbished iPhones", item: "https://phonespot.dk/iphones" },
    ] }} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} />
    <DeviceCollection
      templates={templates}
      title="Refurbished iPhones"
      intro="Til billederne, beskederne og alt det imellem. Find din næste kvalitetstestede iPhone, og vælg den model, lagerplads og stand, der passer til dig."
      collectionHeading="Aktuelle iPhones"
      guideTitle="Sådan vælger du iPhone"
      guideIntro="Modelnavne fortæller ikke hele historien. Tag udgangspunkt i de funktioner, du bruger hver dag, og sammenlign derefter de konkrete enheder."
      choices={CHOICES}
      faqs={FAQS}
      serviceLink={{ href: "/reparation/iphone", label: "Se iPhone-reparationer", body: "Har din nuværende iPhone brug for en reparation, kan du se mulighederne og vælge model." }}
    />
  </>;
}
