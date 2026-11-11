"use client";

import Link from "next/link";
import {
  BLACK_NOVEMBER,
  REPAIR_EXAMPLE,
  blackNovemberRepairPrice,
} from "@/lib/campaign/black-november";
import { useBlackNovember } from "@/lib/campaign/use-black-november";
import { useBlackNovemberDaysLeft } from "@/lib/campaign/use-days-left";
import { PriceTag } from "./price-tag";

const kr = (n: number) => `${n.toLocaleString("da-DK")} kr.`;

const IPHONE_IMAGE =
  "https://xfcadewtpmjrvuzfwkku.supabase.co/storage/v1/object/public/product-media/iphones/cutout/apple-iphone-17-pro-soelv-1792173850693.webp";

/**
 * Forsidens top i november. Én sort flade med et rigtigt prisexempel på det
 * gule prismærke; covers og glas som anden linje. Ingen slides, ingen timer.
 */
export function BlackNovemberHero({ serverActive, headingLevel = "h2" }: { serverActive: boolean; headingLevel?: "h1" | "h2" }) {
  const active = useBlackNovember(serverActive);
  const daysLeft = useBlackNovemberDaysLeft();
  if (!active) return null;
  const Heading = headingLevel;

  return (
    <section aria-labelledby="bn-hero-title" className="mb-3 overflow-hidden rounded-[12px] bg-black text-white">
      <div className="grid md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="px-6 pb-8 pt-6 md:px-12 md:pb-12 md:pt-9">
          <p className="flex items-baseline justify-between gap-4 text-[13px] text-white/65">
            <span className="font-semibold text-white">Black November</span>
            <span aria-live="polite" className="tabular-nums">
              {daysLeft ?? "Til og med 30. november"}
            </span>
          </p>
          <Heading
            id="bn-hero-title"
            className="mt-7 max-w-[13ch] text-[40px] font-[550] leading-[1.02] tracking-[-0.035em] md:mt-10 md:text-[62px]"
          >
            {BLACK_NOVEMBER.repairPercent} % på alle reparationer.
          </Heading>
          <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-white/70 md:text-[16px]">
            Skærm, batteri, opladerstik og resten, hele november i Vejle og Slagelse. Prisen står
            på siden for din model, og rabatten trækkes, når du booker.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/reparation"
              className="inline-flex min-h-12 items-center rounded-[8px] bg-white px-5 text-[15px] font-semibold !text-black transition-colors hover:bg-white/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD60A]"
            >
              Find din model
            </Link>
            <Link
              href={BLACK_NOVEMBER.href}
              className="text-[14px] font-semibold !text-white underline underline-offset-4 hover:text-white/80"
            >
              Se alle tilbud
            </Link>
          </div>
        </div>

        <div className="relative min-h-[300px] md:min-h-[420px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={IPHONE_IMAGE}
            alt="iPhone 17 Pro i sølv"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-contain object-right p-6 md:p-10"
          />
          <PriceTag
            size="lg"
            tilt={-4}
            before={kr(REPAIR_EXAMPLE.beforeKr)}
            price={kr(blackNovemberRepairPrice(REPAIR_EXAMPLE.beforeKr))}
            note={REPAIR_EXAMPLE.label}
            className="absolute bottom-8 left-6 md:bottom-14 md:left-2"
          />
        </div>
      </div>

      <Link
        href="/tilbehoer/covers"
        className="group flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/15 px-6 py-4 !text-white md:px-12"
      >
        <span className="text-[15px]">
          <span className="font-semibold">Covers og beskyttelsesglas</span>
          <span className="text-white/65"> til din model, også privacy-glas</span>
        </span>
        <span className="flex items-center gap-4">
          <PriceTag size="sm" price={`${BLACK_NOVEMBER.accessoryPriceKr} kr.`} />
          <span className="text-[14px] font-semibold underline underline-offset-4 group-hover:text-white/80">Se covers</span>
        </span>
      </Link>
    </section>
  );
}
