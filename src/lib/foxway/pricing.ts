import type { DeviceGrade } from "@/lib/supabase/platform-types";

/** Markup percentages per grade — lower grades get higher markup */
const GRADE_MARKUP: Record<DeviceGrade, number> = {
  N: 0.30,  // Fabriksny: +30%
  P: 0.45,  // Premium: +45%
  A: 0.55,  // Som ny: +55%
  B: 0.60,  // God stand: +60%
  C: 0.65,  // Brugt: +65%
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
 * Check if margin is below the 25% threshold.
 */
export function isLowMargin(buyOere: number, sellOere: number): boolean {
  return calculateMarginPercent(buyOere, sellOere) < 25;
}
