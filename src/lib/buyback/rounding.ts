// Offers are rounded down to whole 50 kr steps so the amount reads as written
// rather than computed. Rounding DOWN also means rounding never costs margin.
export const OFFER_ROUNDING_ORE = 5000;

export function roundOfferDown(ore: number): number {
  if (ore <= 0) return 0;
  return Math.floor(ore / OFFER_ROUNDING_ORE) * OFFER_ROUNDING_ORE;
}
