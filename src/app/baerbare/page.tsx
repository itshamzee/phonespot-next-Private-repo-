import type { Metadata } from "next";
import { DeviceCollection, type CollectionFaq } from "@/components/product/device-collection";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Brugt bærbar og refurbished laptop – 36 mdr. garanti | PhoneSpot",
  description: "Køb en brugt bærbar eller refurbished laptop fra Lenovo, Dell og flere mærker. Testet, med 36 måneders garanti og 30 dages returret. Sammenlign pris, RAM og skærm.",
  alternates: { canonical: "https://phonespot.dk/baerbare" },
  openGraph: { title: "Brugt bærbar og refurbished laptop | PhoneSpot", description: "Find en testet brugt bærbar med 36 måneders garanti hos PhoneSpot.", url: "https://phonespot.dk/baerbare" },
};

const FAQS: CollectionFaq[] = [
  { question: "Er en refurbished laptop det samme som en brugt bærbar?", answer: "En refurbished laptop er en brugt bærbar, der er testet og klargjort, før den sælges igen. Hos PhoneSpot får du 36 måneders garanti og 30 dages returret." },
  { question: "Hvilken bærbar passer til mit behov?", answer: "Til almindeligt kontorarbejde er skærmstørrelse, tastatur og batteri ofte vigtigst. Til tunge programmer bør du også sammenligne processor, RAM og lagerplads på den konkrete model." },
  { question: "Hvad betyder standen på en bærbar?", answer: "Standen beskriver kosmetiske brugsspor. Specifikationer og den konkrete enheds øvrige oplysninger står på produktsiden." },
  { question: "Hvordan får jeg oplysninger om batteriet?", answer: "Se oplysningerne for den konkrete enhed på produktsiden. Batteriet vurderes særskilt og kan ikke udledes af den kosmetiske stand." },
  { question: "Følger der en oplader med?", answer: "Se produktbeskrivelsen for den konkrete enhed, og kontakt os, hvis du vil have en detalje bekræftet før køb." },
];

const CHOICES = [
  { title: "Arbejdsform", body: "Vælg skærmstørrelse og vægt efter, om computeren mest står på et bord eller skal med hver dag." },
  { title: "Ydelse", body: "Sammenlign processor og RAM med kravene til de programmer, du bruger." },
  { title: "Lager og stand", body: "Vælg plads til dine filer, og brug standen til at afstemme de kosmetiske brugsspor med dit budget." },
];

function requestedBrand(value: string | string[] | undefined) {
  return typeof value === "string" && value.toLowerCase() === "apple" ? "Apple" : undefined;
}

export default async function BaerbarePage({ searchParams }: { searchParams: Promise<{ brand?: string | string[] }> }) {
  const templates = await getPublishedTemplates("laptop", { inStock: true });
  const query = await searchParams;
  const initialBrand = requestedBrand(query.brand);
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" }, { "@type": "ListItem", position: 2, name: "Brugte bærbare", item: "https://phonespot.dk/baerbare" }] }} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} />
    <DeviceCollection deviceType="laptop" templates={templates} initialBrand={initialBrand} title="Brugte og refurbished bærbare" intro="En ny arbejdsdag kræver ikke en ny computer. Find din næste brugte laptop eller MacBook, og sammenlign skærm, RAM og lagerplads med det, du skal bruge den til." collectionHeading="Aktuelle brugte bærbare" guideTitle="Sådan vælger du bærbar" guideIntro="Start med dine programmer og den måde, computeren skal bruges på. Filtrene hjælper dig videre til de modeller, der matcher." choices={CHOICES} faqs={FAQS} />
  </>;
}
