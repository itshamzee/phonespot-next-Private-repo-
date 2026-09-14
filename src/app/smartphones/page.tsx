import type { Metadata } from "next";
import { DeviceCollection, type CollectionFaq } from "@/components/product/device-collection";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Refurbished smartphones med 36 måneders garanti | PhoneSpot",
  description: "Find refurbished Android-telefoner hos PhoneSpot. Se det aktuelle udvalg fra Samsung, OnePlus og andre mærker med 36 måneders garanti på enheder.",
  alternates: { canonical: "https://phonespot.dk/smartphones" },
  openGraph: { title: "Refurbished smartphones | PhoneSpot", description: "Samsung, OnePlus og andre Android-telefoner. Find din næste kvalitetstestede smartphone hos PhoneSpot.", url: "https://phonespot.dk/smartphones" },
};

const FAQS: CollectionFaq[] = [
  { question: "Sælger I også Samsung og OnePlus?", answer: "Ja, PhoneSpot sælger også refurbished smartphones med Android, herunder Samsung og OnePlus. Udvalget skifter. Mærkefilteret viser de mærker, der er i det aktuelle udvalg, så du kan sammenligne modeller på lager." },
  { question: "Hvordan vælger jeg smartphone?", answer: "Sammenlign først størrelse, kamera, lagerplads og styresystem med dit behov. Brug derefter filtrene til at se de modeller, der faktisk er på lager." },
  { question: "Hvad betyder den kosmetiske grade?", answer: "Grade A, B og C beskriver synlige brugsspor. Den ændrer ikke modellens specifikationer, og øvrige oplysninger står på den konkrete enhed." },
  { question: "Hvor finder jeg batterioplysninger?", answer: "Se produktsiden for den konkrete enhed. Batteriet vurderes særskilt og beskrives ikke af den kosmetiske grade." },
  { question: "Kan en smartphone afhentes i butik?", answer: "Når en model har faktisk butikslager, vises butikken på kortet. Afhentningsfilteret kan begrænse udvalget til disse modeller." },
];

const CHOICES = [
  { title: "Styresystem", body: "Vælg det system og den app-oplevelse, du allerede kender eller ønsker at skifte til." },
  { title: "Kamera og skærm", body: "Overvej hvor meget du fotograferer, streamer og læser, før du vælger størrelse og model." },
  { title: "Lagerplads", body: "Apps, billeder og video fylder forskelligt. Filtrér efter den kapacitet, der passer til dit brug." },
];

export default async function SmartphonesPage() {
  const templates = await getPublishedTemplates("smartphone", { inStock: true });
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" }, { "@type": "ListItem", position: 2, name: "Refurbished smartphones", item: "https://phonespot.dk/smartphones" }] }} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} />
    <DeviceCollection collection="smartphone" templates={templates} title="Refurbished smartphones" intro="Mest til Android? Find din næste telefon fra Samsung, OnePlus eller et andet mærke i udvalget. Kvalitetstestet og klar til en ny hverdag hos dig." collectionHeading="Aktuelle smartphones" guideTitle="Sådan vælger du smartphone" guideIntro="Tag udgangspunkt i de funktioner, der betyder mest i din hverdag. Vælg derefter blandt de konkrete modeller og enheder på lager." choices={CHOICES} faqs={FAQS} serviceLink={{ href: "/reparation", label: "Find din reparation", body: "Har din nuværende telefon brug for hjælp, kan du vælge mærke og model i vores reparationsoversigt." }} />
  </>;
}
