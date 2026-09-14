import type { Metadata } from "next";
import { DeviceCollection, type CollectionFaq } from "@/components/product/device-collection";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Refurbished iPads med 36 måneders garanti | PhoneSpot",
  description: "Sammenlign aktuelle refurbished iPads efter pris, lagerplads, fysisk stand og tilgængelighed hos PhoneSpot.",
  alternates: { canonical: "https://phonespot.dk/ipads" },
  openGraph: { title: "Refurbished iPads | PhoneSpot", description: "Find en kvalitetstestet refurbished iPad i det aktuelle udvalg.", url: "https://phonespot.dk/ipads" },
};

const FAQS: CollectionFaq[] = [
  { question: "Hvilken iPad passer til mig?", answer: "Overvej først skærmstørrelse, lagerplads og om du primært skal læse, streame, tegne eller arbejde. Sammenlign derefter de modeller, der er på lager." },
  { question: "Hvad fortæller standen?", answer: "Grade A, B og C beskriver de kosmetiske brugsspor. Funktioner og den konkrete enheds oplysninger fremgår af produktsiden." },
  { question: "Hvordan vurderes batteriet?", answer: "Batteriet vurderes for den enkelte enhed. Den tilgængelige batterioplysning står på produktsiden og kan ikke udledes af den kosmetiske grade." },
  { question: "Kan jeg hente en iPad i butik?", answer: "Ja, når kortet viser et faktisk butikslager. Brug afhentningsfilteret til kun at se disse modeller." },
];

const CHOICES = [
  { title: "Brug", body: "En kompakt model er let at tage med, mens en større skærm giver mere plads til arbejde, video og tegning." },
  { title: "Lagerplads", body: "Vælg efter hvor mange apps, billeder og offlinefiler du vil have liggende på enheden." },
  { title: "Tilbehør", body: "Kontrollér kompatibilitet for tastatur og pen på den konkrete model, før du vælger tilbehør." },
];

export default async function IpadsPage() {
  const templates = await getPublishedTemplates("ipad", { inStock: true });
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" }, { "@type": "ListItem", position: 2, name: "Refurbished iPads", item: "https://phonespot.dk/ipads" }] }} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} />
    <DeviceCollection deviceType="ipad" templates={templates} title="Refurbished iPads" intro="Til noter på studiet, en serie i sofaen og idéerne undervejs. Find en kvalitetstestet iPad med den skærmstørrelse, lagerplads og stand, du har brug for." collectionHeading="Aktuelle iPads" guideTitle="Sådan vælger du iPad" guideIntro="Tag udgangspunkt i hvor og hvordan du vil bruge din iPad. Model, størrelse og lagerplads kan derefter afgrænse udvalget." choices={CHOICES} faqs={FAQS} />
  </>;
}
