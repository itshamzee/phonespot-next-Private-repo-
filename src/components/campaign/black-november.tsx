"use client";

import Link from "next/link";
import { BLACK_NOVEMBER } from "@/lib/campaign/black-november";
import { useBlackNovember } from "@/lib/campaign/use-black-november";
import { useBlackNovemberDaysLeft } from "@/lib/campaign/use-days-left";
import { PriceTag } from "./price-tag";

// Sort flade, hvid tekst, grønt prismærke. Forsidens top ligger i black-november-hero.tsx.

/** Smal bjælke øverst på alle sider i november: én linje, ingen mærker. */
export function BlackNovemberBar({ serverActive }: { serverActive: boolean }) {
  const active = useBlackNovember(serverActive);
  const daysLeft = useBlackNovemberDaysLeft();
  if (!active) return null;
  return (
    <div role="region" aria-label="Black November" className="bg-black text-[13px] text-white/65">
      <Link
        href={BLACK_NOVEMBER.href}
        className="group mx-auto flex max-w-[1280px] items-center justify-center gap-x-4 px-4 py-2.5 !text-white/65 sm:px-5"
      >
        <span className="min-w-0 truncate">
          <strong className="font-semibold text-white">Black November</strong>
          <span className="mx-2.5 inline-block h-3 w-px translate-y-[1px] bg-white/25" aria-hidden="true" />
          <span className="text-white">{BLACK_NOVEMBER.repairPercent} % på alle reparationer</span>
          <span className="hidden lg:inline"> og covers og glas til {BLACK_NOVEMBER.accessoryPriceKr} kr.</span>
        </span>
        {daysLeft && <span className="hidden shrink-0 tabular-nums md:inline">{daysLeft}</span>}
        <span className="hidden shrink-0 font-semibold text-[#8fb89f] group-hover:underline group-hover:underline-offset-[3px] sm:inline">Se tilbuddene</span>
      </Link>
    </div>
  );
}

type StripKind = "repair" | "accessories";

const STRIP_COPY: Record<StripKind, { text: string; small: string; figure: string }> = {
  repair: {
    text: "På alle reparationer hele november. Rabatten trækkes, når du booker.",
    small: "på reparationer",
    figure: `−${BLACK_NOVEMBER.repairPercent} %`,
  },
  accessories: {
    text: "Covers og beskyttelsesglas hele november. Bookcovers og lagersalg er ikke med.",
    small: "højst",
    figure: `${BLACK_NOVEMBER.accessoryPriceKr} kr.`,
  },
};

/** Kategori- og reparationssider: sort bånd. */
export function BlackNovemberStrip({ kind, serverActive = false }: { kind: StripKind; serverActive?: boolean }) {
  const active = useBlackNovember(serverActive);
  if (!active) return null;
  const copy = STRIP_COPY[kind];
  return (
    <Link
      href={BLACK_NOVEMBER.href}
      className="my-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-[12px] bg-black px-5 py-5 !text-white transition-colors hover:bg-[#1c1c1c] md:px-7"
    >
      <span>
        <span className="block text-[22px] font-[550] leading-tight tracking-[-0.02em] md:text-[26px]">Black November</span>
        <span className="mt-1 block text-sm text-white/75">{copy.text}</span>
      </span>
      <PriceTag size="md" price={copy.figure} note={copy.small} className="mr-1 shrink-0" />
    </Link>
  );
}
