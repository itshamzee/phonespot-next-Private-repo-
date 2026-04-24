import type { Metadata } from "next";
import { Suspense } from "react";
import { SpotPicker } from "./_components/SpotPicker";
import { QualityStrip } from "./_components/QualityStrip";
import { fetchActiveSpotSkus } from "@/lib/spot/queries";

export const metadata: Metadata = {
  title: "Beskyttelsesglas til alle telefoner · 9H hærdet · fra 199 kr",
  description:
    "Beskyttelsesglas til iPhone, Samsung, iPad og flere. Gratis montering i Vejle og Slagelse. Fri fragt over 500 kr.",
  alternates: { canonical: "/beskyttelsesglas" },
};

export default async function BeskyttelsesglasHubPage() {
  const skus = await fetchActiveSpotSkus();

  return (
    <main>
      {/* ── Hero — compact rounded card ── */}
      <section className="px-4 pt-4 pb-0 md:px-6 md:pt-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-[#1A3D2E] md:rounded-3xl">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-[#1A3D2E] via-[#1A3D2E] to-[#2a5c47]"
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-8 right-[-2rem] select-none font-display text-[12rem] font-black leading-none text-white/[0.05] md:-bottom-12 md:right-[-3rem] md:text-[20rem] lg:text-[24rem]"
          >
            9H
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl"
          />

          <div className="relative z-10 px-5 py-9 sm:px-8 sm:py-11 md:px-12 md:py-12 lg:max-w-[62%] lg:px-16">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-white/90 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white/80" aria-hidden />
              9H HÆRDET · GRATIS MONTERING
            </span>

            <h1 className="font-display text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3rem]">
              Beskyttelsesglas
              <br />
              til din enhed
            </h1>

            <p className="mt-3 max-w-lg text-base leading-relaxed text-white/75 md:text-lg">
              Vælg din enhed og vi viser beskyttelsesglas der passer perfekt — fra 199 kr. Gratis montering i Vejle og Slagelse.
            </p>
          </div>
        </div>
      </section>

      {/* ── Picker — search / configure / add to cart ── */}
      <Suspense fallback={null}>
        <SpotPicker skus={skus} />
      </Suspense>

      {/* ── Quality strip (unchanged) ── */}
      <QualityStrip />

      {/* ── Gratis montering CTA ── */}
      <section className="bg-[#f4f4f5] py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">Gratis professionel montering</h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-700">
            Kom forbi PhoneSpot i <strong>Vejle</strong> eller <strong>Slagelse</strong> — vi monterer dit glas gratis på under et minut. Perfekt hver gang, ellers får du et nyt.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a href="/beskyttelsesglas/vejle" className="rounded-full bg-black px-5 py-3 text-white">Se Vejle-butikken</a>
            <a href="/beskyttelsesglas/slagelse" className="rounded-full border border-black px-5 py-3">Se Slagelse-butikken</a>
          </div>
        </div>
      </section>
    </main>
  );
}
