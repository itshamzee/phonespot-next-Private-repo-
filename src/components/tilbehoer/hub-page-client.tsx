"use client";

import Link from "next/link";
import { TilbehoerLayout } from "./tilbehoer-layout";
import { TrustBar } from "@/components/ui/trust-bar";

export function HubPageClient() {
  return (
    <>
      {/* Beskyttelsesglas promo banner — sits above the tilbehør hero so
          customers immediately see the Spot hub since it lives at its own URL */}
      <section className="mx-auto max-w-7xl px-4 pt-4 md:pt-6">
        <Link
          href="/beskyttelsesglas"
          className="group relative block overflow-hidden rounded-2xl bg-[#1A3D2E] md:rounded-3xl"
        >
          {/* Base gradient */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-[#1A3D2E] via-[#1A3D2E] to-[#2a5c47]"
          />
          {/* Subtle glass-pane grid texture */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          {/* Decorative 9H typography — bleeds off right */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -bottom-10 select-none font-display text-[10rem] font-black leading-none text-white/[0.06] md:-right-10 md:text-[15rem]"
          >
            9H
          </div>

          <div className="relative z-10 flex flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between md:gap-8 md:px-12 md:py-12">
            <div className="max-w-xl">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[10px] font-semibold tracking-[0.08em] text-white/90 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white/80" aria-hidden />
                9H HÆRDET · GRATIS MONTERING
              </span>
              <h2 className="font-display text-2xl font-extrabold leading-[1.1] tracking-tight text-white md:text-3xl lg:text-4xl">
                Beskyttelsesglas
                <br className="hidden md:block" />
                <span className="md:hidden"> </span>
                til din enhed
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75 md:text-base">
                Præcis pasform på iPhone, iPad, Samsung og flere — fra 199 kr. Vi monterer gratis i Vejle og Slagelse.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#1A3D2E] transition-all group-hover:bg-white/95 group-hover:shadow-lg md:text-base">
              Se alle beskyttelsesglas
              <svg
                aria-hidden
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M6 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </Link>
      </section>

      <TilbehoerLayout
        heroTitle="Tilbehør"
        heroDescription="Covers, opladere, kabler og mere — til alle populære mærker"
        activeCategory=""
      />

      <div className="mx-auto max-w-7xl px-4 pb-16">
        <TrustBar />
      </div>
    </>
  );
}
