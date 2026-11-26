"use client";

import { BLACK_WEEK, isBlackWeek, isGiftModel } from "@/lib/campaign/black-week";
import { useBlackWeek } from "@/lib/campaign/use-black-week";

/**
 * Black Week-mærket på produktkort. Samme formsprog som forsidens kampagnepille:
 * hvid kapsel med en sort kerne. Sidder på sømmen mellem billede og tekst, så
 * det ikke dækker telefonen. På iPhones står gaven i kapslen; på andre enheder
 * er det kun den sorte kerne. Forælderen skal være `relative` og `@container`.
 */
export function BlackWeekBadge({ title, serverActive }: { title?: string; serverActive?: boolean }) {
  const active = useBlackWeek(serverActive ?? isBlackWeek());
  if (!active) return null;
  const gift = isGiftModel(title);
  const core = (
    <span className="inline-flex h-[22px] items-center rounded-full bg-black px-2.5 text-[11.5px] font-semibold leading-none text-white">
      {BLACK_WEEK.name}
    </span>
  );
  return (
    <span className="absolute left-4 top-0 z-10 -translate-y-1/2 sm:left-5">
      {gift ? (
        <span className="inline-flex items-center rounded-full border border-[#DDE2DD] bg-white p-[3px] @[250px]:pr-3">
          {core}
          <span className="ml-2 hidden whitespace-nowrap text-[12px] font-medium leading-none text-[#202421] @[250px]:inline">
            Glas og cover følger med
          </span>
        </span>
      ) : (
        <span className="inline-flex rounded-full border border-white bg-white p-[3px]">{core}</span>
      )}
    </span>
  );
}

/** Smalle iPhone-kort, hvor gaven ikke kan stå i kapslen: en rolig tekstlinje i stedet. */
export function BlackWeekCardGift({ title, serverActive }: { title: string; serverActive?: boolean }) {
  const active = useBlackWeek(serverActive ?? isBlackWeek());
  if (!active || !isGiftModel(title)) return null;
  return <p className="mt-1.5 text-xs text-[#202421] @[250px]:hidden">Beskyttelsesglas og cover følger med</p>;
}

/**
 * Gavelinjen under en iPhone i kurv, kasse og på produktsiden.
 * `boxed` giver den sorte ramme til produktsiden; ellers er det en tekstlinje.
 */
export function BlackWeekGift({ title, boxed = false }: { title: string; boxed?: boolean }) {
  const active = useBlackWeek(isBlackWeek());
  if (!active || !isGiftModel(title)) return null;
  if (boxed) {
    const row = "flex items-baseline justify-between gap-4 border-t border-white/15 py-2.5 text-[14px]";
    return (
      <div className="mt-5 rounded-[12px] bg-black px-4 pb-1 pt-4 text-white sm:px-5">
        <p className="pb-3 text-[17px] font-semibold leading-snug tracking-[-0.01em]">
          Følger med i {BLACK_WEEK.name}
        </p>
        <p className={row}>
          <span>Beskyttelsesglas til din iPhone</span>
          <span className="shrink-0 tabular-nums text-white/60">0 kr.</span>
        </p>
        <p className={row}>
          <span>Gennemsigtigt cover</span>
          <span className="shrink-0 tabular-nums text-white/60">0 kr.</span>
        </p>
        <p className="border-t border-white/15 py-2.5 text-[12.5px] text-white/60">
          Lægges i pakken. Gælder til og med 30. november.
        </p>
      </div>
    );
  }
  return (
    <p className="mt-1 flex items-baseline justify-between gap-3 text-xs text-[#202421]">
      <span>
        <strong className="font-semibold">{BLACK_WEEK.name}:</strong> beskyttelsesglas og gennemsigtigt cover
      </span>
      <span className="shrink-0 font-semibold">0 kr.</span>
    </p>
  );
}
