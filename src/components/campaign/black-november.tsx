"use client";

import Link from "next/link";
import { BLACK_NOVEMBER } from "@/lib/campaign/black-november";
import { useBlackNovember } from "@/lib/campaign/use-black-november";
import { StorefrontIcon } from "@/components/ui/storefront-icon";

// Sort, hvid og gul i november: afspærringsbånd, stor hvid titel og gule procent-mærker.

/** Gult bånd med gentaget kampagnenavn. Pynt, så det skjules for skærmlæsere. */
export function BlackNovemberTape({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute overflow-hidden whitespace-nowrap bg-[#FFD54A] py-1.5 text-[13px] leading-none text-black ${className}`}
    >
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} className="mr-3">
          <strong className="font-bold">BLACK</strong> NOVEMBER
        </span>
      ))}
    </div>
  );
}

function PercentBadge({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute flex items-center justify-center rounded-full bg-[#FFD54A] font-bold text-black ${className}`}
    >
      %
    </span>
  );
}

/** Titlen fra kampagnen: hvidt BLACK over en hvid NOVEMBER-plade med rund kant. */
function CampaignTitle({ id }: { id: string }) {
  return (
    <h2 id={id} className="inline-block font-body font-bold leading-none text-white">
      <span className="block text-[60px] tracking-[-0.03em] md:text-[84px]">BLACK</span>
      <span className="mt-2 block rounded-bl-[28px] bg-[#f4f4f4] py-2.5 text-center text-[20px] tracking-[0.1em] text-black md:text-[28px]">
        NOVEMBER
      </span>
    </h2>
  );
}

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
    <div role="region" aria-label="Black November" className="bg-black text-[13px] text-white/80">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-2 sm:justify-center sm:gap-4 sm:px-5">
        <span className="min-w-0">
          <strong className="font-semibold text-[#FFD54A]">Black November</strong>
          <span className="hidden sm:inline">
            {" "}· {BLACK_NOVEMBER.repairPercent} % på reparationer · {BLACK_NOVEMBER.devicePercent} % på brugte enheder · covers og glas{" "}
            {BLACK_NOVEMBER.accessoryPriceKr} kr.
          </span>
          <span className="sm:hidden"> hele november</span>
        </span>
        <Link
          href={BLACK_NOVEMBER.href}
          className="inline-flex min-h-6 shrink-0 items-center font-semibold !text-[#FFD54A] underline underline-offset-[3px]"
        >
          Se tilbuddene
        </Link>
      </div>
    </div>
  );
}

/** Forsidens bånd: sort flade, afspærringsbånd og tilbuddene på gul og hvid. */
export function BlackNovemberBand({ serverActive }: { serverActive: boolean }) {
  const active = useBlackNovember(serverActive);
  if (!active) return null;
  return (
    <section aria-labelledby="black-november-band" className="my-4">
      <article className="relative isolate grid overflow-hidden rounded-[10px] bg-black text-white md:min-h-[420px] md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:items-center">
        <BlackNovemberTape className="-left-10 -right-10 top-5 -rotate-[9deg]" />
        <BlackNovemberTape className="-left-10 -right-10 bottom-4 rotate-[2deg]" />
        <PercentBadge className="right-5 top-[58%] hidden h-14 w-14 text-2xl md:flex" />
        <PercentBadge className="bottom-14 left-5 h-9 w-9 text-sm" />
        <div className="relative z-10 px-6 pb-4 pt-20 md:px-[38px] md:py-20">
          <CampaignTitle id="black-november-band" />
          <p className="mb-5 mt-5 max-w-[380px] text-[13px] leading-[1.65] text-white/75">
            I butikkerne i Vejle og Slagelse og her på siden.
            <br />
            Prisen trækkes automatisk, du skal ikke bruge en kode.
          </p>
          <Link
            href={BLACK_NOVEMBER.href}
            className="inline-flex min-h-[43px] items-center justify-between gap-[18px] rounded-[5px] bg-[#FFD54A] px-[19px] py-3 text-[12px] font-semibold !text-black transition-colors hover:bg-white"
          >
            Se alle tilbud
            <StorefrontIcon kind="arrow" className="h-5 w-5" />
          </Link>
        </div>
        <div className="relative z-10 mx-6 mb-16 md:mb-0 md:ml-0 md:mr-[38px]">
          <ul className="overflow-hidden rounded-tl-[24px] bg-[#FFD54A] text-black">
            {OFFERS.map((o) => (
              <li key={o.href} className="border-b border-black/15 last:border-b-0">
                <Link
                  href={o.href}
                  className="grid grid-cols-[110px_minmax(0,1fr)] items-baseline gap-4 px-5 py-3.5 !text-black hover:underline"
                >
                  <span className="font-display text-[34px] font-bold leading-none tracking-tight">{o.figure}</span>
                  <span className="text-[14px] font-[550]">{o.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="rounded-b-[12px] bg-[#f4f4f4] px-5 py-2 text-right text-[11px] font-semibold text-black">
            Gælder til og med 30. november
          </p>
        </div>
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

/** Kategori- og reparationssider: sort bånd med gult tal. */
export function BlackNovemberStrip({ kind, serverActive = false }: { kind: StripKind; serverActive?: boolean }) {
  const active = useBlackNovember(serverActive);
  if (!active) return null;
  const copy = STRIP_COPY[kind];
  return (
    <Link
      href={BLACK_NOVEMBER.href}
      className="my-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl bg-black px-5 py-5 !text-white transition-colors hover:bg-[#1c1c1c] md:px-7"
    >
      <span>
        <span className="block font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl">Black November</span>
        <span className="mt-1 block text-sm text-white/75">{copy.text}</span>
      </span>
      <span className="shrink-0 text-right leading-none">
        <span className="block text-xs text-white/70">{copy.small}</span>
        <span className="font-display text-3xl font-bold tracking-tight text-[#FFD54A]">{copy.figure}</span>
      </span>
    </Link>
  );
}
