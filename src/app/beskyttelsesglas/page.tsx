import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { TilbehoerCategoryClient } from "@/components/tilbehoer/tilbehoer-category-client";
import { getCategoryConfig } from "@/lib/tilbehoer-config";

export const metadata: Metadata = {
  title: "Beskyttelsesglas til telefon og tablet | PhoneSpot",
  description: "Se beskyttelsesglas med pris og kompatible modeller. Find almindeligt glas og glas med indkigsbeskyttelse, og få hjælp til montering i Vejle og Slagelse.",
  alternates: { canonical: "https://phonespot.dk/beskyttelsesglas" },
};

export default function BeskyttelsesglasHub() {
  const category = getCategoryConfig("beskyttelsesglas")!;
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
      { "@type": "ListItem", position: 2, name: "Tilbehør", item: "https://phonespot.dk/tilbehoer" },
      { "@type": "ListItem", position: 3, name: "Beskyttelsesglas", item: "https://phonespot.dk/beskyttelsesglas" },
    ] }} />
    <nav aria-label="Brødkrumme" className="mx-auto flex max-w-[1280px] gap-3 px-5 pt-5 text-sm text-charcoal/65 sm:px-9">
      <Link href="/tilbehoer" className="underline underline-offset-4">Tilbehør</Link><span aria-hidden="true">/</span><span>Beskyttelsesglas</span>
    </nav>
    <TilbehoerCategoryClient category={{ ...category, heroDescription: "Se glassene her, og tjek, hvilke modeller de passer til. Du kan filtrere efter din enhed og se pris og lagerstatus på hvert produkt." }} initialCount={0} />
    <div className="mx-auto max-w-[1280px] px-5 pb-12 text-sm sm:px-9">
      <p className="mb-3 font-semibold">Hjælp til montering i vores butikker</p>
      <div className="flex gap-6"><Link href="/beskyttelsesglas/vejle" className="underline underline-offset-4">Vejle</Link><Link href="/beskyttelsesglas/slagelse" className="underline underline-offset-4">Slagelse</Link></div>
    </div>
  </>;
}
