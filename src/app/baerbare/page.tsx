import type { Metadata } from "next";
import { DeviceCollection, type CollectionFaq } from "@/components/product/device-collection";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Refurbished bærbare med 36 måneders garanti | PhoneSpot",
  description: "Sammenlign aktuelle refurbished bærbare efter mærke, pris, RAM, lagerplads, skærm og tilgængelighed.",
  alternates: { canonical: "https://phonespot.dk/baerbare" },
  openGraph: { title: "Refurbished bærbare | PhoneSpot", description: "Find en kvalitetstestet bærbar i det aktuelle udvalg hos PhoneSpot.", url: "https://phonespot.dk/baerbare" },
};

const FAQS: CollectionFaq[] = [
  { question: "Hvilken bærbar passer til mit behov?", answer: "Til almindeligt kontorarbejde er skærmstørrelse, tastatur og batteri ofte vigtigst. Til tunge programmer bør du også sammenligne processor, RAM og lagerplads på den konkrete model." },
  { question: "Hvad betyder standen på en bærbar?", answer: "Standen beskriver kosmetiske brugsspor. Specifikationer og den konkrete enheds øvrige oplysninger står på produktsiden." },
  { question: "Hvordan får jeg oplysninger om batteriet?", answer: "Se oplysningerne for den konkrete enhed på produktsiden. Batteriet vurderes særskilt og kan ikke udledes af den kosmetiske grade." },
  { question: "Følger der en oplader med?", answer: "Se produktbeskrivelsen for den konkrete enhed og kontakt os, hvis du vil have en detalje bekræftet før køb." },
];

const CHOICES = [
  { title: "Arbejdsform", body: "Vælg skærmstørrelse og vægt efter om computeren mest står på et bord eller skal med hver dag." },
  { title: "Ydelse", body: "Sammenlign processor og RAM med kravene til de programmer, du bruger." },
  { title: "Lager og stand", body: "Vælg plads til dine filer, og brug graden til at afstemme de kosmetiske brugsspor med dit budget." },
];

function requestedBrand(value: string | string[] | undefined) {
  return typeof value === "string" && value.toLowerCase() === "apple" ? "Apple" : undefined;
}

export default async function BaerbarePage({ searchParams }: { searchParams: Promise<{ brand?: string | string[] }> }) {
  const templates = await getPublishedTemplates("laptop", { inStock: true });
  const query = await searchParams;
  const initialBrand = requestedBrand(query.brand);
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" }, { "@type": "ListItem", position: 2, name: "Refurbished bærbare", item: "https://phonespot.dk/baerbare" }] }} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} />
    <DeviceCollection templates={templates} initialBrand={initialBrand} title="Refurbished bærbare" intro="Find en bærbar til arbejde, studie eller hverdagsbrug. Sammenlign hele det aktuelle udvalg efter mærke, pris, skærm, RAM, lagerplads og faktisk butikslager." collectionHeading="Aktuelle bærbare" guideTitle="Sådan vælger du bærbar" guideIntro="Start med dine programmer og den måde, computeren skal bruges på. Filtrene hjælper dig videre til de modeller, der matcher." choices={CHOICES} faqs={FAQS} serviceLink={{ href: "/reparation/macbook", label: "Se MacBook-reparationer", body: "Har din nuværende MacBook brug for hjælp, kan du se de aktuelle reparationer og vælge model." }} />
  </>;
}
