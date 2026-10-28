import type { Identified } from "./types";

/** Mærker der prissættes som "kendt mærke" (79 kr., flip 99 kr.). */
export const KNOWN_BRANDS = [
  "NovaNL", "Rixus", "Celly", "Swissten", "Shield", "Spigen", "OtterBox", "Holdit",
  "iDeal of Sweden", "Nudient", "UAG", "Mobilize", "Puro", "dbramante1928", "Din Certco",
];
const GENUINE_BRANDS = ["apple", "samsung"];

export const PRICE_CHIPS = [49, 59, 79, 99, 129];

/** Prisforslag i kr. efter mærke og type (spec: AI-tilbehørsoptagelse, Pris). */
export function suggestPriceKr(i: Pick<Identified, "productType" | "brand" | "isGenuineBrandProduct" | "caseType">): number {
  if (i.productType === "screen_protector") return 49;
  const brand = (i.brand ?? "").trim().toLowerCase();
  if (i.isGenuineBrandProduct && GENUINE_BRANDS.includes(brand)) return 99;
  const known = brand !== "" && KNOWN_BRANDS.some((b) => b.toLowerCase() === brand);
  if (!known) return 59;
  const flip = i.productType === "flip_cover" || i.caseType === "Flip" || i.caseType === "Wallet";
  return flip ? 99 : 79;
}
