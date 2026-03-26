import type { DeviceGrade } from "@/lib/supabase/platform-types";

/**
 * Markup percentages per grade — calculated to guarantee minimum margins:
 * Target: N ≥ 35%, P ≥ 38%, A ≥ 40%, B ≥ 42%, C ≥ 45%
 *
 * Margin formula: margin% = markup / (1 + markup)
 * So to get 35% margin: markup = 0.35 / 0.65 = 0.538
 *    to get 40% margin: markup = 0.40 / 0.60 = 0.667
 *    to get 45% margin: markup = 0.45 / 0.55 = 0.818
 */
const GRADE_MARKUP: Record<DeviceGrade, number> = {
  N: 0.55,  // Fabriksny: +55% → ~35% margin
  P: 0.62,  // Premium: +62% → ~38% margin
  A: 0.70,  // Som ny: +70% → ~41% margin
  B: 0.75,  // God stand: +75% → ~43% margin
  C: 0.85,  // Brugt: +85% → ~46% margin
};

/** Standard price points in DKK that look clean on the site */
const STANDARD_PRICES_DKK = [
  1499, 1999, 2499, 2999, 3499, 3999, 4499, 4999,
  5499, 5999, 6999, 7999, 8999, 9999, 11999, 14999,
];

/** Minimum sell price in øre (1,499 DKK) */
const MIN_SELL_PRICE_OERE = 149900;

/**
 * Calculate suggested sell price for a Foxway item.
 * @param buyPriceOere - Purchase price in øre
 * @param grade - Device grade
 * @returns Sell price in øre, snapped to standard price point
 */
export function calculateSellPrice(buyPriceOere: number, grade: DeviceGrade): number {
  const markup = GRADE_MARKUP[grade] ?? 0.50;
  const rawSellOere = buyPriceOere * (1 + markup);
  const rawSellDkk = rawSellOere / 100;
  const snappedDkk = snapToStandardPrice(rawSellDkk);
  const result = snappedDkk * 100;
  return Math.max(result, MIN_SELL_PRICE_OERE);
}

/**
 * Snap a DKK price to the nearest standard price point (>= input).
 * If above the highest standard price, round up to nearest X,999.
 */
export function snapToStandardPrice(dkk: number): number {
  // Find the smallest standard price >= dkk
  for (const sp of STANDARD_PRICES_DKK) {
    if (sp >= dkk) return sp;
  }
  // Above 14,999: round up to nearest X,999
  const thousands = Math.ceil(dkk / 1000);
  return thousands * 1000 - 1;
}

/**
 * Calculate margin percentage.
 * @returns Margin as percentage (e.g. 45.5 for 45.5%)
 */
export function calculateMarginPercent(buyOere: number, sellOere: number): number {
  if (buyOere <= 0) return 0;
  return ((sellOere - buyOere) / sellOere) * 100;
}

/**
 * Check if margin is below the 35% threshold.
 */
export function isLowMargin(buyOere: number, sellOere: number): boolean {
  return calculateMarginPercent(buyOere, sellOere) < 35;
}
