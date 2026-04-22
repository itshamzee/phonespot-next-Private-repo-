import type { Metadata } from "next";
import Image from "next/image";
import { SmartSearch } from "./_components/SmartSearch";
import { BrandGrid } from "./_components/BrandGrid";
import { QualityStrip } from "./_components/QualityStrip";
import { fetchActiveSpotSkus } from "@/lib/spot/queries";

export const metadata: Metadata = {
  title: "Beskyttelsesglas til alle telefoner · 9H hærdet · fra 199 kr",
  description: "Beskyttelsesglas til iPhone, Samsung, iPad og flere. Gratis montering i Vejle og Slagelse. Fri fragt over 399 kr.",
  alternates: { canonical: "/beskyttelsesglas" },
};

export default async function BeskyttelsesglasHubPage() {
  const skus = await fetchActiveSpotSkus();
  const coveredModels = [...new Set(skus.flatMap(s => s.compatible_models))];

  return (
    <main>
      <section className="relative min-h-[70vh] bg-[#0a0a0a] text-white flex items-center overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <Image src="/spot/hero.png" alt="" fill className="object-cover" priority />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">Beskyttelsesglas til din telefon</h1>
          <p className="mt-4 text-lg text-white/75">Hærdet 9H glas. Perfekt pasform. Gratis montering i Vejle og Slagelse.</p>
          <div className="mt-8"><SmartSearch models={coveredModels} /></div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">Vælg din telefon</h2>
        <BrandGrid />
      </section>

      <QualityStrip />

      <section className="bg-[#f4f4f5] py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">Gratis professionel montering</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">
            Kom forbi PhoneSpot i <strong>Vejle</strong> eller <strong>Slagelse</strong> — vi monterer dit glas gratis på under et minut. Perfekt hver gang, ellers får du et nyt.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <a href="/beskyttelsesglas/vejle" className="px-5 py-3 rounded-full bg-black text-white">Se Vejle-butikken</a>
            <a href="/beskyttelsesglas/slagelse" className="px-5 py-3 rounded-full border border-black">Se Slagelse-butikken</a>
          </div>
        </div>
      </section>
    </main>
  );
}
