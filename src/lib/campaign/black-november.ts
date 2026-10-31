/**
 * Black November 2026 — den eneste sandhed om kampagnens regler.
 *
 * Gælder 1.–30. november 2026 (dansk tid), i butikkerne og online:
 * - 10 % på alle reparationer (mængderabatten 15 % ved 3+ vinder, de lægges ikke sammen)
 * - 5 % på alle brugte enheder (fabriksnye enheder er ikke med)
 * - Covers og beskyttelsesglas til højst 199 kr. Bookcovers/pungcovers og
 *   lagersalgsvarer er ikke med; lagersalg har sine egne priser.
 *
 * Modulet er rent (ingen server-imports), så både checkout-serveren, sider
 * og klientkomponenter regner med præcis de samme regler.
 */

export const BLACK_NOVEMBER = {
  name: "Black November",
  /** 1. nov. 00:00 dansk tid (CET, UTC+1). */
  startsAt: Date.parse("2026-11-01T00:00:00+01:00"),
  /** 1. dec. 00:00 dansk tid — kampagnen er slut. */
  endsAt: Date.parse("2026-12-01T00:00:00+01:00"),
  repairPercent: 10,
  devicePercent: 5,
  accessoryPriceOere: 19900,
  accessoryPriceKr: 199,
  href: "/black-november",
} as const;

/**
 * Forhåndsvisning uden for produktion: sæt NEXT_PUBLIC_CAMPAIGN_PREVIEW=black-november
 * i .env.development.local for at se kampagnen før 1. november.
 */
function previewActive(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_CAMPAIGN_PREVIEW === "black-november"
  );
}

export function isBlackNovember(now: number = Date.now()): boolean {
  if (previewActive()) return true;
  return now >= BLACK_NOVEMBER.startsAt && now < BLACK_NOVEMBER.endsAt;
}

/* ------------------------------------------------------------------ */
/*  Reparationer                                                        */
/* ------------------------------------------------------------------ */

/** Mængderabatten fra prissiden og guiden: 10 % ved 2 reparationer, 15 % ved 3+. */
export function volumeRepairPercent(serviceCount: number): number {
  return serviceCount >= 3 ? 15 : serviceCount >= 2 ? 10 : 0;
}

/**
 * Den rabat, en reparationsbooking får. I november er bunden 10 % fra første
 * reparation; ved 3+ reparationer gælder mængderabattens 15 % i stedet.
 */
export function repairDiscountPercent(serviceCount: number, now: number = Date.now()): number {
  return repairDiscountPercentFor(serviceCount, isBlackNovember(now));
}

/** Samme regel, når klienten allerede ved, om kampagnen kører. */
export function repairDiscountPercentFor(serviceCount: number, campaignActive: boolean): number {
  const volume = volumeRepairPercent(serviceCount);
  if (serviceCount <= 0 || !campaignActive) return volume;
  return Math.max(volume, BLACK_NOVEMBER.repairPercent);
}

/** True når rabatten skyldes kampagnen (til tekster som "Black November -10 %"). */
export function repairDiscountIsCampaign(serviceCount: number, now: number = Date.now()): boolean {
  return (
    serviceCount > 0 &&
    isBlackNovember(now) &&
    volumeRepairPercent(serviceCount) <= BLACK_NOVEMBER.repairPercent
  );
}

/* ------------------------------------------------------------------ */
/*  Brugte enheder                                                      */
/* ------------------------------------------------------------------ */

/** Fabriksnye enheder (grade N) er ikke brugte og er ikke med. */
export function isUsedDeviceGrade(grade: string | null | undefined): boolean {
  return (grade ?? "").trim().toUpperCase() !== "N";
}

/**
 * Enhedspris i øre med 5 % rabat, rundet ned til hele kroner.
 * Uden for kampagnen (eller for fabriksnye enheder) returneres prisen uændret.
 */
export function blackNovemberDevicePrice(
  priceOere: number,
  grade?: string | null,
  now: number = Date.now(),
): number {
  if (!Number.isFinite(priceOere) || priceOere <= 0) return priceOere;
  if (!isBlackNovember(now) || !isUsedDeviceGrade(grade)) return priceOere;
  const discounted = (priceOere * (100 - BLACK_NOVEMBER.devicePercent)) / 100;
  return Math.floor(discounted / 100) * 100;
}

/* ------------------------------------------------------------------ */
/*  Covers og beskyttelsesglas                                          */
/* ------------------------------------------------------------------ */

export type CampaignSkuSource = {
  category?: string | null;
  subcategory?: string | null;
  title?: string | null;
  name?: string | null;
  attributes?: Record<string, string> | null;
  /** Udledt på serveren via isLagersalg, når attributterne ikke er offentlige. */
  lagersalg?: boolean | null;
};

const BOOK_CASE_TYPES = new Set(["wallet", "flip", "book", "folio"]);
const BOOK_CASE_NAME = /(pung|book|bog|flip|tegnebog|wallet|folio)/i;

/** Bookcovers og pungcovers er ikke med i 199 kr.-tilbuddet. */
export function isBookCase(row: CampaignSkuSource): boolean {
  const type = row.attributes?.case_type?.trim().toLowerCase();
  if (type && BOOK_CASE_TYPES.has(type)) return true;
  return BOOK_CASE_NAME.test(row.title ?? row.name ?? "");
}

function isLagersalgRow(row: CampaignSkuSource): boolean {
  if (row.lagersalg) return true;
  return row.attributes?.udsalg?.trim() === "Ja" && row.subcategory !== "screen_protector";
}

export function isCampaignGlass(row: CampaignSkuSource): boolean {
  return (
    row.subcategory === "screen_protector" ||
    row.category === "skaermbeskyttelse" ||
    row.category === "screen_protector"
  );
}

export function isCampaignCover(row: CampaignSkuSource): boolean {
  return (row.subcategory === "cover" || row.category === "cover") && !isBookCase(row);
}

/** Om varen er omfattet af 199 kr.-tilbuddet (uafhængigt af dato). */
export function isCampaignAccessory(row: CampaignSkuSource): boolean {
  if (isLagersalgRow(row)) return false;
  return isCampaignGlass(row) || isCampaignCover(row);
}

/**
 * Salgsprisen i øre for en cover- eller glasvare: den laveste af den aktuelle
 * pris og 199 kr. Varer, der allerede koster mindre, bliver ikke dyrere.
 */
export function blackNovemberSkuPrice(
  row: CampaignSkuSource,
  effectivePriceOere: number,
  now: number = Date.now(),
): number {
  if (!isBlackNovember(now) || !isCampaignAccessory(row)) return effectivePriceOere;
  if (!Number.isFinite(effectivePriceOere) || effectivePriceOere <= 0) return effectivePriceOere;
  return Math.min(effectivePriceOere, BLACK_NOVEMBER.accessoryPriceOere);
}

/**
 * Lægger kampagneprisen ind som `sale_price` på en varelinje, så alle
 * eksisterende visninger (overstreget normalpris + salgspris) virker uden
 * ændringer. `selling_price` bevares som normalpris.
 */
export function withBlackNovemberSku<
  T extends CampaignSkuSource & { selling_price: number; sale_price: number | null },
>(row: T, now: number = Date.now()): T & { black_november?: true } {
  const effective = row.sale_price ?? row.selling_price;
  const campaign = blackNovemberSkuPrice(row, effective, now);
  if (campaign >= effective) return row;
  return { ...row, sale_price: campaign, black_november: true };
}

/** Samme som ovenfor for den offentlige tilbehørsform (`price` / `sale_price`). */
export function withBlackNovemberAccessory<
  T extends CampaignSkuSource & { price: number; sale_price: number | null },
>(row: T, now: number = Date.now()): T & { black_november?: true } {
  const effective = row.sale_price ?? row.price;
  const campaign = blackNovemberSkuPrice(row, effective, now);
  if (campaign >= effective) return row;
  return { ...row, sale_price: campaign, black_november: true };
}
