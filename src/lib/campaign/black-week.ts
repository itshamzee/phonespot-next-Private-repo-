/**
 * Black Week 2026 — reglerne for gaven ved køb af iPhone.
 *
 * Gælder 26.–30. november 2026 (dansk tid), online og i butikkerne:
 * ved køb af en iPhone følger et beskyttelsesglas og et gennemsigtigt cover
 * med uden beregning. Gaven er ikke en ordrelinje (ingen pris, ingen
 * lagertræk i kassen); den står som intern note på ordren, så den bliver
 * pakket, og den nævnes i kurv, kasse og ordrebekræftelse.
 *
 * Modulet er rent (ingen server-imports), så server og klient bruger de
 * samme regler. Black November (reparationer, covers og glas til 199 kr.)
 * kører uændret ved siden af.
 */

export const BLACK_WEEK = {
  name: "Black Week",
  /** 26. nov. 00:00 dansk tid (CET, UTC+1). */
  startsAt: Date.parse("2026-11-26T00:00:00+01:00"),
  /** 1. dec. 00:00 dansk tid — kampagnen er slut. */
  endsAt: Date.parse("2026-12-01T00:00:00+01:00"),
  giftShort: "Gratis beskyttelsesglas og cover",
  giftLong: "Beskyttelsesglas og gennemsigtigt cover følger med uden beregning",
  href: "/iphones",
} as const;

function previewActive(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_CAMPAIGN_PREVIEW === "black-week"
  );
}

export function isBlackWeek(now: number = Date.now()): boolean {
  if (previewActive()) return true;
  return now >= BLACK_WEEK.startsAt && now < BLACK_WEEK.endsAt;
}

/** En iPhone (selve telefonen). Tilbehør "til iPhone" afgøres af kalderen: kun enheder spørges. */
export function isGiftModel(modelOrTitle: string | null | undefined): boolean {
  return /\biphone\b/i.test(modelOrTitle ?? "");
}

/** Om en enhed med denne titel/model får gaven lige nu. */
export function hasBlackWeekGift(modelOrTitle: string | null | undefined, now: number = Date.now()): boolean {
  return isBlackWeek(now) && isGiftModel(modelOrTitle);
}

/**
 * Intern note til ordren, så gaven bliver pakket. Én linje pr. iPhone.
 * Returnerer null, når ordren ikke har en iPhone, eller kampagnen ikke kører.
 */
export function blackWeekGiftNote(models: Array<string | null | undefined>, now: number = Date.now()): string | null {
  if (!isBlackWeek(now)) return null;
  const gifts = models.filter(isGiftModel) as string[];
  if (!gifts.length) return null;
  return gifts
    .map((model) => `Black Week-gave: beskyttelsesglas + gennemsigtigt cover til ${model.trim()} (0 kr.)`)
    .join("\n");
}
