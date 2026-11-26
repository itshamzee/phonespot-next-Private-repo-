"use client";

import { BLACK_WEEK, isBlackWeek, isGiftModel } from "@/lib/campaign/black-week";
import { useBlackWeek } from "@/lib/campaign/use-black-week";

/**
 * Black Week-mærket på produktkort: sort, fladt, uden skygge. Ligger øverst
 * til venstre på kortets billede (forælderen skal være `relative`).
 */
export function BlackWeekBadge({
  serverActive,
  className = "absolute left-3 top-3 z-10",
}: {
  serverActive?: boolean;
  className?: string;
}) {
  const active = useBlackWeek(serverActive ?? isBlackWeek());
  if (!active) return null;
  return (
    <span
      className={`${className} inline-flex items-center rounded-[4px] bg-black px-2 py-1 text-[11px] font-semibold leading-none tracking-[0.01em] text-white`}
    >
      {BLACK_WEEK.name}
    </span>
  );
}

/** Kort linje på iPhone-kort: hvad der følger med. Viser intet for andre enheder. */
export function BlackWeekCardGift({ title, serverActive }: { title: string; serverActive?: boolean }) {
  const active = useBlackWeek(serverActive ?? isBlackWeek());
  if (!active || !isGiftModel(title)) return null;
  return <p className="mt-1.5 text-xs font-semibold text-[#202421]">{BLACK_WEEK.giftShort} følger med</p>;
}

/**
 * Gavelinjen under en iPhone i kurv, kasse og på produktsiden.
 * `boxed` giver den sorte ramme til produktsiden; ellers er det en tekstlinje.
 */
export function BlackWeekGift({ title, boxed = false }: { title: string; boxed?: boolean }) {
  const active = useBlackWeek(isBlackWeek());
  if (!active || !isGiftModel(title)) return null;
  if (boxed) {
    return (
      <div className="mt-4 rounded-[10px] bg-black px-4 py-3.5 text-white">
        <p className="text-[11px] font-semibold leading-none text-[#8fb89f]">{BLACK_WEEK.name}</p>
        <p className="mt-1.5 text-[15px] font-semibold leading-snug">{BLACK_WEEK.giftShort} med i købet</p>
        <p className="mt-1 text-[13px] leading-snug text-white/70">
          Et beskyttelsesglas og et gennemsigtigt cover, der passer til din iPhone, lægges i pakken. Til og med 30. november.
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
