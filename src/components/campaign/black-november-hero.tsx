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

/**
 * Forsidens top i november. Black November er grøn hos PhoneSpot: en
 * repareret telefon holder længere end en ny. Billedet (Higgsfield, 12/11) er
 * en iPhone 17 Pro på mos med en spire; teksten står på den sorte venstre side.
 */
export function BlackNovemberHero({ serverActive, headingLevel = "h2" }: { serverActive: boolean; headingLevel?: "h1" | "h2" }) {
  const active = useBlackNovember(serverActive);
  const daysLeft = useBlackNovemberDaysLeft();
  if (!active) return null;
  const Heading = headingLevel;

  return (
    <section aria-labelledby="bn-hero-title" className="mb-3 overflow-hidden rounded-[12px] bg-black text-white">
      <div className="relative flex flex-col md:block md:min-h-[540px]">
      {/* Billedet: hele fladen på computer, en firkant under teksten på mobil. */}
      <picture className="order-2">
        <source media="(min-width: 768px)" srcSet="/images/campaign/black-november-groen.webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/campaign/black-november-groen-mobil.webp"
          alt="iPhone 17 Pro i sølv på mos med en lille spire"
          fetchPriority="high"
          className="block aspect-[1338/1152] w-full object-cover md:absolute md:inset-0 md:aspect-auto md:h-full md:object-[72%_50%]"
        />
      </picture>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,#000_0%,#000_30%,rgba(0,0,0,0.6)_48%,transparent_62%)] md:block"
      />

      <div className="relative order-1 px-6 pb-2 pt-6 md:max-w-[620px] md:px-12 md:pb-12 md:pt-9">
        <p className="flex items-baseline justify-between gap-4 text-[13px] text-white/65 md:justify-start md:gap-5">
          <span className="font-semibold text-[#8FBFA2]">Black November</span>
          <span aria-live="polite" className="tabular-nums">
            {daysLeft ?? "Til og med 30. november"}
          </span>
        </p>
        <Heading
          id="bn-hero-title"
          className="mt-6 text-[44px] font-[550] leading-[0.98] tracking-[-0.04em] md:mt-9 md:text-[72px]"
        >
          <span className="block">{BLACK_NOVEMBER.repairPercent} % på alle</span>
          <span className="block">reparationer.</span>
        </Heading>
        <p className="mt-4 max-w-[40ch] text-[15px] leading-relaxed text-white/75 md:mt-5 md:text-[17px]">
          Den grønneste telefon er den, du allerede har. Få den repareret i Vejle eller Slagelse
          hele november, og rabatten trækkes, når du booker.
        </p>
      </div>

      <div className="relative order-3 -mt-20 flex flex-wrap items-end gap-x-7 gap-y-5 px-6 pb-7 md:absolute md:bottom-12 md:left-12 md:mt-0 md:px-0 md:pb-0">
        <PriceTag
          size="lg"
          tilt={-4}
          before={kr(REPAIR_EXAMPLE.beforeKr)}
          price={kr(blackNovemberRepairPrice(REPAIR_EXAMPLE.beforeKr))}
          note={REPAIR_EXAMPLE.label}
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pb-1">
          <Link
            href="/reparation"
            className="inline-flex min-h-12 items-center rounded-[8px] bg-white px-5 text-[15px] font-semibold !text-black transition-colors hover:bg-[#E3EFE7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8FBFA2]"
          >
            Find din model
          </Link>
          <Link
            href={BLACK_NOVEMBER.href}
            className="text-[14px] font-semibold !text-white underline decoration-[#8FBFA2] underline-offset-4 hover:text-white/80"
          >
            Se alle tilbud
          </Link>
        </div>
      </div>

      </div>

      <Link
        href="/tilbehoer/covers"
        className="group flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/15 bg-[#0E2219]/90 px-6 py-4 !text-white md:px-12"
      >
        <span className="text-[15px]">
          <span className="font-semibold">Covers og beskyttelsesglas</span>
          <span className="text-white/65"> til din model, også privacy-glas</span>
        </span>
        <span className="flex items-center gap-4">
          <PriceTag size="sm" surface="green" price={`${BLACK_NOVEMBER.accessoryPriceKr} kr.`} />
          <span className="text-[14px] font-semibold underline decoration-[#8FBFA2] underline-offset-4 group-hover:text-white/80">Se covers</span>
        </span>
      </Link>
    </section>
  );
}
