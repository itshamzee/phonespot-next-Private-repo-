import type { Metadata } from "next";
import { DeviceCollection, type CollectionFaq } from "@/components/product/device-collection";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Refurbished smartwatches med 36 måneders garanti | PhoneSpot",
  description: "Sammenlign aktuelle refurbished smartwatches efter pris, stand og tilgængelighed hos PhoneSpot.",
  alternates: { canonical: "https://phonespot.dk/smartwatches" },
  openGraph: { title: "Refurbished smartwatches | PhoneSpot", description: "Find et kvalitetstestet smartwatch i det aktuelle udvalg.", url: "https://phonespot.dk/smartwatches" },
};

const FAQS: CollectionFaq[] = [
  { question: "Hvordan vælger jeg et smartwatch?", answer: "Start med urstørrelse, de funktioner, du bruger, og kompatibilitet med din telefon. Sammenlign derefter de aktuelle modeller og enheder." },
  { question: "Hvad betyder standen?", answer: "Standen beskriver kosmetiske brugsspor på ur og kabinet. Se den konkrete enhed for de oplysninger og billeder, der er tilgængelige." },
  { question: "Hvordan er batteriet vurderet?", answer: "Batteriet vurderes på den enkelte enhed. Se den konkrete produktvisning, og spørg os, hvis du har brug for en detalje bekræftet." },
  { question: "Kan jeg hente uret i butik?", answer: "Ja, når kortet viser lager i Vejle eller Slagelse. Afhentningsfilteret viser kun modeller med faktisk butikslager." },
];

const CHOICES = [
  { title: "Kompatibilitet", body: "Kontrollér, at uret passer til din telefon og de apps eller funktioner, du vil bruge." },
  { title: "Størrelse", body: "Kabinet og rem skal sidde behageligt. Sammenlign størrelsen på den konkrete model." },
  { title: "Brug", body: "Vælg efter, om notifikationer, træning, navigation eller hverdagens hurtige handlinger betyder mest." },
];

export default async function SmartwatchesPage() {
  const templates = await getPublishedTemplates("smartwatch", { inStock: true });
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" }, { "@type": "ListItem", position: 2, name: "Refurbished smartwatches", item: "https://phonespot.dk/smartwatches" }] }} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} />
    <DeviceCollection deviceType="watch" templates={templates} title="Refurbished smartwatches" intro="Til løbeturen, beskederne og de små pauser. Find et kvalitetstestet smartwatch, og vælg størrelse og funktioner, der passer til dig og din telefon." collectionHeading="Aktuelle smartwatches" guideTitle="Sådan vælger du smartwatch" guideIntro="Vælg først efter kompatibilitet og størrelse. Derefter kan du sammenligne de funktioner, der betyder mest i din hverdag." choices={CHOICES} faqs={FAQS} />
  </>;
}
