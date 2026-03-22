"use client";

import { useState } from "react";
import Link from "next/link";
import { TILBEHOER_CATEGORIES } from "@/lib/tilbehoer-config";
import { DevicePicker } from "./device-picker";
import { AccessoryGrid } from "./accessory-grid";
import { KlarnaMicroBanner } from "@/components/ui/klarna-micro-banner";
import { TrustBar } from "@/components/ui/trust-bar";

function scrollToGrid() {
  document.getElementById("produkter")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HubPageClient() {
  const [selectedModel, setSelectedModel] = useState("");

  function handleModelChange(model: string) {
    setSelectedModel(model);
    if (model) setTimeout(scrollToGrid, 50);
  }

  return (
    <>
      {/* Section 1: Hero */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center md:py-20">
          <span className="inline-flex rounded-full bg-green-eco/10 px-4 py-1 text-sm font-medium text-green-eco">
            Tilbehør
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-charcoal md:text-5xl">
            Find tilbehør til din enhed
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-charcoal/70">
            Covers, opladere, kabler og mere — til alle populære mærker
          </p>

          {/* Device picker */}
          <div className="mx-auto mt-10 max-w-2xl text-left">
            <DevicePicker
              selectedModel={selectedModel}
              onChange={handleModelChange}
            />
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs font-semibold text-charcoal/50">
            <span>e-mærket certificeret</span>
            <span>36 mdr. garanti</span>
            <span>14 dages returret</span>
            <span>Hurtig levering</span>
          </div>
        </div>
      </section>

      {/* Section 2: Category grid */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 font-display text-2xl font-bold tracking-tight text-charcoal md:text-3xl">
          Shop efter kategori
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {TILBEHOER_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/tilbehoer/${cat.slug}`}
              className="group relative rounded-[16px] border border-sand bg-white p-6 text-center transition-all hover:shadow-md hover:border-green-eco/30"
            >
              {cat.slug === "outlet" && (
                <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  SALE
                </span>
              )}
              <h3 className="font-display text-sm font-bold text-charcoal leading-tight">
                {cat.label}
              </h3>
              <p className="mt-1.5 hidden text-xs text-charcoal/50 md:block line-clamp-2 leading-relaxed">
                {cat.description ?? "Se udvalget"}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-green-eco">
                Se alle
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                  <path
                    fillRule="evenodd"
                    d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 3: Cross-sell banner */}
      <section className="mx-auto max-w-7xl px-4 pb-8">
        <div className="flex flex-col items-start justify-between gap-4 rounded-[16px] border border-green-eco/20 bg-cream px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold text-charcoal">
              Køb cover + skærmbeskyttelse og spar 15% på begge
            </p>
            <p className="mt-0.5 text-sm text-charcoal/50">
              Kombiner og beskyt din enhed komplet.
            </p>
          </div>
          <Link
            href="/tilbehoer/covers"
            className="shrink-0 rounded-full bg-green-eco px-5 py-2.5 text-sm font-bold text-white hover:bg-green-eco/90 transition-colors"
          >
            Se covers
          </Link>
        </div>
      </section>

      {/* Section 4: Product grid */}
      <section id="produkter" className="scroll-mt-16 bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-10">
          {selectedModel && (
            <p className="mb-4 font-display text-xl font-bold text-charcoal">
              Tilbehør til {selectedModel}
            </p>
          )}
          <AccessoryGrid externalModel={selectedModel} />
        </div>
      </section>

      {/* Section 5: Klarna banner */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <KlarnaMicroBanner />
      </div>

      {/* Section 6: USP section */}
      <section className="bg-cream py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "e-mærket certificeret", desc: "Tryg handel med certificeret dansk netbutik." },
              { title: "36 måneders garanti", desc: "Markedets bedste garanti på alt tilbehør." },
              { title: "14 dages returret", desc: "Fortryd dit køb inden for 14 dage — ingen spørgsmål." },
              { title: "Hurtig levering", desc: "Bestil inden kl. 16 og modtag i morgen." },
            ].map((usp) => (
              <div key={usp.title} className="flex gap-4 rounded-[16px] border border-sand bg-white p-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-eco/10">
                  <span className="h-2 w-2 rounded-full bg-green-eco" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-charcoal">{usp.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-charcoal/50">{usp.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: TrustBar */}
      <TrustBar />
    </>
  );
}
