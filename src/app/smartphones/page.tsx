import type { Metadata } from "next";
import { DeviceCollection, type CollectionFaq } from "@/components/product/device-collection";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Brugte telefoner med 36 mdr. garanti – iPhone og Android | PhoneSpot",
  description: "Køb en brugt telefon, testet og istandsat hos PhoneSpot. Se iPhone, Samsung og andre mærker med 36 måneders garanti og 30 dages returret, online eller i butik.",
  alternates: { canonical: "https://phonespot.dk/smartphones" },
  openGraph: { title: "Brugte telefoner med 36 mdr. garanti | PhoneSpot", description: "Brugte iPhones, Samsung og andre mærker. Find din næste testede telefon hos PhoneSpot.", url: "https://phonespot.dk/smartphones" },
};

const FAQS: CollectionFaq[] = [
  { question: "Hvor kan jeg købe en brugt telefon med garanti?", answer: "Hos PhoneSpot får du 36 måneders garanti og 30 dages returret på brugte telefoner. Du kan købe online eller se telefonen i vores butikker i Vejle og Slagelse, når den er på lager dér." },
  { question: "Sælger I også Samsung og OnePlus?", answer: "Ja, PhoneSpot sælger også refurbished smartphones med Android, herunder Samsung og OnePlus. Udvalget skifter. Mærkefilteret viser de mærker, der er i det aktuelle udvalg, så du kan sammenligne modeller på lager." },
  { question: "Hvordan vælger jeg en smartphone?", answer: "Sammenlign først størrelse, kamera, lagerplads og styresystem med dit behov. Brug derefter filtrene til at se de modeller, der faktisk er på lager." },
  { question: "Hvad betyder den kosmetiske stand?", answer: "Stand A, B og C beskriver synlige brugsspor. Standen ændrer ikke modellens specifikationer, og øvrige oplysninger står på den konkrete enhed." },
  { question: "Hvor finder jeg batterioplysninger?", answer: "Se produktsiden for den konkrete enhed. Batteriet vurderes særskilt og beskrives ikke af den kosmetiske stand." },
  { question: "Kan en smartphone afhentes i butik?", answer: "Når en model har faktisk butikslager, vises butikken på kortet. Afhentningsfilteret kan begrænse udvalget til disse modeller." },
];

const CHOICES = [
  { title: "Styresystem", body: "Vælg det system og den appoplevelse, du allerede kender eller ønsker at skifte til." },
  { title: "Kamera og skærm", body: "Overvej, hvor meget du fotograferer, streamer og læser, før du vælger størrelse og model." },
  { title: "Lagerplads", body: "Apps, billeder og video fylder forskelligt. Filtrér efter den kapacitet, der passer til dit brug." },
];

export default async function SmartphonesPage() {
  const [iphones, android] = await Promise.all([
    getPublishedTemplates("iphone", { inStock: true }),
    getPublishedTemplates("smartphone", { inStock: true }),
  ]);
  const templates = [...iphones, ...android];
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" }, { "@type": "ListItem", position: 2, name: "Brugte telefoner", item: "https://phonespot.dk/smartphones" }] }} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} />
    <DeviceCollection collection="smartphone" templates={templates} title="Brugte telefoner" intro="Find din næste brugte telefon blandt iPhones, Samsung og andre mærker. Testet og istandsat, med 36 måneders garanti og 30 dages returret." collectionHeading="Aktuelle brugte telefoner" guideTitle="Sådan vælger du brugt telefon" guideIntro="Tag udgangspunkt i de funktioner, der betyder mest i din hverdag. Vælg derefter blandt de konkrete modeller og enheder på lager." choices={CHOICES} faqs={FAQS} />
  </>;
}
