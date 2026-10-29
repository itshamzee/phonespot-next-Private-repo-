import type { Metadata } from "next";
import { DeviceCollection, type CollectionFaq } from "@/components/product/device-collection";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Brugt iPhone med 36 mdr. garanti – refurbished | PhoneSpot",
  description: "Køb en brugt iPhone, der er testet og istandsat. Batteri min. 90 % ved levering, 36 mdr. garanti og 30 dages returret. Se den i Vejle eller Slagelse.",
  alternates: { canonical: "https://phonespot.dk/iphones" },
  openGraph: {
    title: "Brugte iPhones med 36 mdr. garanti | PhoneSpot",
    description: "Brugte og refurbished iPhones med batteri min. 90 % ved levering, 36 måneders garanti og 30 dages returret.",
    url: "https://phonespot.dk/iphones",
  },
};

const FAQS: CollectionFaq[] = [
  { question: "Hvor kan man købe en brugt iPhone med garanti?", answer: "Hos PhoneSpot køber du brugte og refurbished iPhones med 36 måneders garanti, batteri min. 90 % ved levering og 30 dages returret. Du kan købe online eller se telefonen i vores butikker i Vejle og Slagelse." },
  { question: "Hvad er forskellen på en brugt og en refurbished iPhone?", answer: "En refurbished iPhone er en brugt iPhone, der er testet, rengjort og om nødvendigt repareret, før den sælges igen med garanti. Vi oplyser altid, om skærm og batteri er originale eller skiftet." },
  { question: "Hvordan vælger jeg den rigtige iPhone?", answer: "Begynd med skærmstørrelse, kamera, lagerplads og dit budget. På den enkelte model kan du sammenligne de enheder, der faktisk er tilgængelige lige nu." },
  { question: "Hvad betyder stand A, B og C?", answer: "Stand A, B og C beskriver den kosmetiske stand og mængden af synlige brugsspor. Enhedens konkrete stand og billeder fremgår af produktsiden." },
  { question: "Hvordan er batteriet på en refurbished iPhone?", answer: "Alle iPhones har mindst 90 % batterikapacitet ved levering. Er den lavere, skifter vi batteriet uden beregning. Den målte værdi står på produktsiden, når vi har den." },
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
      title="Brugte iPhones med 36 måneders garanti"
      intro="Hos PhoneSpot køber du brugte iPhones, der er testet og istandsat på vores eget værksted. Batteriet er mindst 90 % ved levering, vi oplyser om dele er skiftet, og du får 36 måneders garanti og 30 dages returret. Se telefonen i Vejle eller Slagelse, eller få den leveret."
      collectionHeading="Aktuelle iPhones"
      guideTitle="Sådan vælger du iPhone"
      guideIntro="Modelnavne fortæller ikke hele historien. Tag udgangspunkt i de funktioner, du bruger hver dag, og sammenlign derefter de konkrete enheder."
      choices={CHOICES}
      faqs={FAQS}
     
    />
  </>;
}
