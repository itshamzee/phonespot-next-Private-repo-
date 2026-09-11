import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SpotPicker } from "./_components/SpotPicker";
import { QualityStrip } from "./_components/QualityStrip";
import { fetchActiveSpotSkus } from "@/lib/spot/queries";
import { TrustBar } from "@/components/ui/trust-bar";
export const metadata: Metadata = {
  title: "Beskyttelsesglas til din telefon og tablet | PhoneSpot",
  description: "Find beskyttelsesglas til din model. Gratis montering ved køb hos PhoneSpot i Vejle og Slagelse. Se varianter og priser online.",
  alternates: { canonical: "/beskyttelsesglas" },
};
export default async function BeskyttelsesglasHubPage() {
  const skus = await fetchActiveSpotSkus();
  return <div className="font-body text-charcoal">
    <section className="border-b border-sand bg-white">
      <div className="mx-auto max-w-[1280px] px-5 py-7 sm:px-9 sm:py-9">
        <p className="text-xs font-semibold text-[#1A3D2E]">Beskyttelse til hverdagen</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Beskyttelsesglas til din enhed</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal/65">Vælg din telefon eller tablet, og se de glas der passer til modellen. Vi hjælper med gratis montering ved køb i Vejle og Slagelse.</p>
      </div>
    </section>
    <Suspense fallback={<p role="status" className="mx-auto max-w-[1280px] px-5 py-8 sm:px-9">Henter modelvælger…</p>}>
      <SpotPicker skus={skus}/>
    </Suspense>
    <QualityStrip/>
    <section className="border-y border-sand bg-[#f4f5f2]">
      <div className="mx-auto grid max-w-[1280px] gap-6 px-5 py-10 sm:px-9 lg:grid-cols-2 lg:items-center">
        <div><h2 className="text-2xl font-semibold tracking-tight">Vi hjælper med monteringen</h2><p className="mt-3 max-w-xl text-sm leading-6 text-charcoal/65">Kom forbi i Vejle eller Slagelse. Montering er gratis, når du køber dit beskyttelsesglas hos os.</p></div>
        <div className="flex flex-wrap gap-3 lg:justify-end"><Link href="/beskyttelsesglas/vejle" className="rounded-lg bg-[#1A3D2E] px-5 py-3 text-sm font-semibold text-white">Se Vejle-butikken</Link><Link href="/beskyttelsesglas/slagelse" className="rounded-lg border border-[#1A3D2E] px-5 py-3 text-sm font-semibold text-[#1A3D2E]">Se Slagelse-butikken</Link></div>
      </div>
    </section>
    <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-9"><TrustBar variant="accessory"/></div>
  </div>;
}
