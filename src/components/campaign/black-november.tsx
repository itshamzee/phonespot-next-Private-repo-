"use client";

import Link from "next/link";
import { BLACK_NOVEMBER } from "@/lib/campaign/black-november";
import { useBlackNovember } from "@/lib/campaign/use-black-november";
import { StorefrontIcon } from "@/components/ui/storefront-icon";

// Sort og hvid. Forsidens slides ligger i black-november-slider.tsx.

/** Smal bjælke øverst på alle sider i november. */
export function BlackNovemberBar({ serverActive }: { serverActive: boolean }) {
  const active = useBlackNovember(serverActive);
  if (!active) return null;
  return (
    <div role="region" aria-label="Black November" className="bg-black text-[13px] text-white/75">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-2 sm:justify-center sm:gap-4 sm:px-5">
        <span className="min-w-0">
          <strong className="font-semibold text-white">Black November</strong>
          <span className="hidden sm:inline">
            {" "}· {BLACK_NOVEMBER.repairPercent} % på reparationer · covers og glas{" "}
            {BLACK_NOVEMBER.accessoryPriceKr} kr.
          </span>
          <span className="sm:hidden"> hele november</span>
        </span>
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
    small: "spar",
    figure: `${BLACK_NOVEMBER.repairPercent} %`,
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
        <span className="block font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl">Black November</span>
        <span className="mt-1 block text-sm text-white/75">{copy.text}</span>
      </span>
      <span className="shrink-0 text-right leading-none">
        <span className="block text-xs text-white/70">{copy.small}</span>
        <span className="font-display text-3xl font-bold tracking-tight">{copy.figure}</span>
      </span>
    </Link>
  );
}
