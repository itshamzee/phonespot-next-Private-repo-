"use client";

import Link from "next/link";
import { BLACK_NOVEMBER } from "@/lib/campaign/black-november";
import { useBlackNovember } from "@/lib/campaign/use-black-november";
import { StorefrontIcon } from "@/components/ui/storefront-icon";

// Samme udtryk som lagersalget: salviefarvet flade på forsiden, mørkegrønt bånd på kategorisiderne.

const OFFERS = [
  { figure: `${BLACK_NOVEMBER.repairPercent} %`, title: "på alle reparationer", href: "/reparation" },
  { figure: `${BLACK_NOVEMBER.devicePercent} %`, title: "på alle brugte enheder", href: "/iphones" },
  { figure: `${BLACK_NOVEMBER.accessoryPriceKr} kr.`, title: "for covers og beskyttelsesglas", href: "/tilbehoer/covers" },
] as const;

/** Smal bjælke øverst på alle sider i november. */
export function BlackNovemberBar({ serverActive }: { serverActive: boolean }) {
  const active = useBlackNovember(serverActive);
  if (!active) return null;
  return (
    <div role="region" aria-label="Black November" className="border-b border-[#e2e7de] bg-[#eef0eb] text-[13px] text-[#1a3d2e]">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-2 sm:justify-center sm:gap-4 sm:px-5">
        <span className="min-w-0">
          <strong className="font-semibold">Black November</strong>
          <span className="hidden sm:inline">
            {" "}· {BLACK_NOVEMBER.repairPercent} % på reparationer · {BLACK_NOVEMBER.devicePercent} % på brugte enheder · covers og glas{" "}
            {BLACK_NOVEMBER.accessoryPriceKr} kr.
          </span>
          <span className="sm:hidden"> hele november</span>
        </span>
        <Link
          href={BLACK_NOVEMBER.href}
          className="inline-flex min-h-6 shrink-0 items-center font-semibold !text-[#1a3d2e] underline underline-offset-[3px]"
        >
          Se tilbuddene
        </Link>
      </div>
    </div>
  );
}

/** Forsidens bånd, bygget som lagersalgets. */
export function BlackNovemberBand({ serverActive }: { serverActive: boolean }) {
  const active = useBlackNovember(serverActive);
  if (!active) return null;
  return (
    <section aria-labelledby="black-november-band" className="my-4">
      <article className="relative grid overflow-hidden rounded-[10px] border border-[#e2e7de] bg-[#eef0eb] text-[#1a3d2e] md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:items-center">
        <div className="px-6 pb-6 pt-6 md:px-[30px] md:pb-[42px] md:pt-[26px]">
          <div className="mb-[13px] flex items-center gap-2 text-[12px] font-[550]">
            <StorefrontIcon kind="bag" className="h-[17px] w-[17px]" />
            Black November
          </div>
          <h2 id="black-november-band" className="mb-[13px] text-[29px] font-[550] leading-[1.08] tracking-[-1.25px] md:text-[32px]">
            Lavere priser.
            <br />
            Hele november.
          </h2>
          <p className="mb-5 max-w-[380px] text-[13px] leading-[1.65] text-[#576354]">
            I butikkerne i Vejle og Slagelse og her på siden.
            <br />
            Prisen trækkes automatisk, du skal ikke bruge en kode.
          </p>
          <Link
            href={BLACK_NOVEMBER.href}
            className="inline-flex min-h-[43px] items-center justify-between gap-[18px] rounded-[5px] bg-[#1a3d2e] px-[19px] py-3 text-[12px] font-semibold !text-white transition-colors hover:bg-[#294d39]"
          >
            Se alle tilbud
            <StorefrontIcon kind="arrow" className="h-5 w-5" />
          </Link>
        </div>
        <ul className="mx-6 mb-10 border-t border-[#d6ddd3] md:mb-0 md:ml-0 md:mr-[30px] md:border-t-0">
          {OFFERS.map((o) => (
            <li key={o.href} className="border-b border-[#d6ddd3] last:border-b-0">
              <Link
                href={o.href}
                className="grid grid-cols-[110px_minmax(0,1fr)] items-baseline gap-4 py-3.5 !text-[#1a3d2e] hover:underline"
              >
                <span className="font-display text-[34px] font-bold leading-none tracking-tight">{o.figure}</span>
                <span className="text-[14px] font-[550]">{o.title}</span>
              </Link>
            </li>
          ))}
        </ul>
        <span className="absolute bottom-[14px] left-6 text-[10px] opacity-70 md:left-[30px]">
          Gælder til og med 30. november
        </span>
      </article>
    </section>
  );
}

type StripKind = "repair" | "devices" | "accessories";

const STRIP_COPY: Record<StripKind, { text: string; small: string; figure: string }> = {
  repair: {
    text: "På alle reparationer hele november. Rabatten trækkes, når du booker.",
    small: "spar",
    figure: `${BLACK_NOVEMBER.repairPercent} %`,
  },
  devices: {
    text: "På alle brugte enheder hele november. Priserne herunder er allerede nedsat.",
    small: "spar",
    figure: `${BLACK_NOVEMBER.devicePercent} %`,
  },
  accessories: {
    text: "Covers og beskyttelsesglas hele november. Bookcovers og lagersalg er ikke med.",
    small: "højst",
    figure: `${BLACK_NOVEMBER.accessoryPriceKr} kr.`,
  },
};

/** Kategori- og reparationssider: samme mørkegrønne bånd som "Covers på lagersalg". */
export function BlackNovemberStrip({ kind, serverActive = false }: { kind: StripKind; serverActive?: boolean }) {
  const active = useBlackNovember(serverActive);
  if (!active) return null;
  const copy = STRIP_COPY[kind];
  return (
    <Link
      href={BLACK_NOVEMBER.href}
      className="my-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl bg-[#1A3D2E] px-5 py-5 !text-white transition-colors hover:bg-[#244f3c] md:px-7"
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
