"use client";

import Link from "next/link";
import { BLACK_NOVEMBER } from "@/lib/campaign/black-november";
import { useBlackNovember } from "@/lib/campaign/use-black-november";
import { useBlackNovemberDaysLeft } from "@/lib/campaign/use-days-left";
import { PriceTag } from "./price-tag";

// Sort flade, hvid tekst, gult prismærke. Forsidens top ligger i black-november-hero.tsx.

/** Smal bjælke øverst på alle sider i november: ét budskab og dage tilbage. */
export function BlackNovemberBar({ serverActive }: { serverActive: boolean }) {
  const active = useBlackNovember(serverActive);
  const daysLeft = useBlackNovemberDaysLeft();
  if (!active) return null;
  return (
    <div role="region" aria-label="Black November" className="bg-black text-[13px] text-white/70">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-2 sm:justify-center sm:gap-5 sm:px-5">
        <span className="flex min-w-0 items-center gap-2.5">
          <PriceTag size="sm" price={`−${BLACK_NOVEMBER.repairPercent} %`} />
          <span className="min-w-0 truncate">
            <strong className="font-semibold text-white">Black November</strong>
            <span className="hidden sm:inline"> på alle reparationer · covers og glas {BLACK_NOVEMBER.accessoryPriceKr} kr.</span>
          </span>
        </span>
        {daysLeft && <span className="hidden tabular-nums md:inline">{daysLeft}</span>}
        <Link
          href={BLACK_NOVEMBER.href}
          className="inline-flex min-h-6 shrink-0 items-center font-semibold !text-white underline underline-offset-[3px]"
        >
          Se tilbuddene
        </Link>
      </div>
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
    small: "højst, covers og glas",
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
      <PriceTag size="md" tilt={-3} price={copy.figure} note={copy.small} className="mr-1 shrink-0" />
    </Link>
  );
}
