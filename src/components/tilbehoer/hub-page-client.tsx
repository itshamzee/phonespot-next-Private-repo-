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
      <section className="relative overflow-hidden bg-[#F7F7F8]">
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
            Tilbehør
          </p>
          <h1 className="font-display text-4xl font-bold text-[#111111] md:text-6xl">
            Find tilbehør til din enhed
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[#86868B]">
            Covers, panserglas, kabler og mere — vi har det hele.
          </p>

          {/* Device picker */}
          <div className="mx-auto mt-10 max-w-2xl text-left">
            <DevicePicker
              selectedModel={selectedModel}
              onChange={handleModelChange}
            />
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs font-semibold text-[#86868B]">
            <span>e-mærket certificeret</span>
            <span>36 mdr. garanti</span>
            <span>14 dages returret</span>
            <span>Hurtig levering</span>
          </div>
        </div>
      </section>

      {/* Section 2: Category grid */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 font-display text-2xl font-bold tracking-tight text-[#111111] md:text-3xl">
          Shop efter kategori
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {TILBEHOER_CATEGORIES.map((cat, i) => {
            const gradients = [
              "from-emerald-50 to-teal-100",
              "from-blue-50 to-indigo-100",
              "from-amber-50 to-orange-100",
              "from-purple-50 to-violet-100",
              "from-rose-50 to-pink-100",
              "from-red-50 to-red-100",
            ];
            const gradient = gradients[i % gradients.length];
            return (
              <Link
                key={cat.slug}
                href={`/tilbehoer/${cat.slug}`}
                className={`group relative flex flex-col items-center rounded-2xl bg-gradient-to-br ${gradient} p-6 text-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1`}
              >
                {cat.slug === "outlet" && (
                  <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    SALE
                  </span>
                )}
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <span className="text-3xl">{cat.icon}</span>
                </div>
                <h3 className="mt-4 font-display text-sm font-bold text-[#111111] leading-tight">
                  {cat.label}
                </h3>
                <p className="mt-1.5 hidden text-xs text-[#86868B] md:block line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#1A3D2E] px-3 py-1 text-[11px] font-bold text-white opacity-0 transition-all group-hover:opacity-100">
                  Se alle
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                    <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Section 3: Cross-sell banner */}
      <section className="mx-auto max-w-7xl px-4 pb-8">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#1A3D2E]/20 bg-[#F7F7F8] px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold text-[#111111]">
              Køb cover + skærmbeskyttelse og spar 15% på begge
            </p>
            <p className="mt-0.5 text-sm text-[#86868B]">
              Kombiner og beskyt din enhed komplet.
            </p>
          </div>
          <Link
            href="/tilbehoer/covers"
            className="shrink-0 rounded-full bg-[#1A3D2E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1A3D2E]/90"
          >
            Se covers →
          </Link>
        </div>
      </section>

      {/* Section 4: Product grid */}
      <section id="produkter" className="scroll-mt-16 bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          {selectedModel && (
            <p className="mb-4 font-display text-xl font-bold text-[#111111]">
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
      <section className="bg-[#F7F7F8] py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "🏅", title: "e-mærket certificeret", desc: "Tryg handel med certificeret dansk netbutik." },
              { icon: "🛡️", title: "36 måneders garanti", desc: "Markedets bedste garanti på alt tilbehør." },
              { icon: "↩️", title: "14 dages returret", desc: "Fortryd dit køb inden for 14 dage — ingen spørgsmål." },
              { icon: "🚀", title: "Hurtig levering", desc: "Bestil inden kl. 16 og modtag i morgen." },
            ].map((usp) => (
              <div key={usp.title} className="flex gap-4 rounded-2xl border border-[#E5E5EA] bg-white p-5">
                <span className="text-2xl">{usp.icon}</span>
                <div>
                  <h3 className="font-display text-sm font-bold text-[#111111]">{usp.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#86868B]">{usp.desc}</p>
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
