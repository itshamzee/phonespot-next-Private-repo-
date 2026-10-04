/**
 * Pris- og rabatregler for sagslinjer. Spejler repair__plan_item i
 * 20261005130000_repair_case_functions.sql (databasen er facit; dette bruges til
 * tidlig validering i API'et og til tests).
 *
 *  - Listeprisen kommer ALTID fra serveren (repair_services.price_dkk i hele kroner,
 *    sku_products/devices i øre).
 *  - Klienten må foreslå en anden stykpris (unit_price_oere), men en afvigelse kræver price_reason.
 *  - Fritekst har ingen listepris: prisen er den angivne, ingen begrundelse nødvendig.
 */
import { CaseError } from "@/lib/repairs/case-errors";
import type { NewCaseItemInput } from "@/lib/repairs/new-case-types";

/** repair_services.price_dkk (hele kroner) -> øre. */
export function serviceListOere(priceDkk: number): number {
  return Math.round(priceDkk * 100);
}

/** Salgspris for en vare: udsalgspris hvis den er lavere end normalprisen. */
export function productListOere(p: { selling_price: number; sale_price?: number | null }): number {
  return p.sale_price != null && p.sale_price < p.selling_price ? p.sale_price : p.selling_price;
}

export type PriceDecision = {
  list_oere: number;
  unit_oere: number;
  /** null når prisen er listeprisen. */
  reason: string | null;
  discounted: boolean;
};

/**
 * Vælger stykprisen. Uden `requested` bruges listeprisen. En anden pris end listeprisen
 * kræver en begrundelse (price_reason_required), og negative priser afvises.
 */
export function decideUnitPrice(
  listOere: number,
  requested: number | null | undefined,
  reason: string | null | undefined,
  label = "linjen",
): PriceDecision {
  const unit = requested ?? listOere;
  if (!Number.isInteger(unit) || unit < 0) throw new CaseError("invalid_price", "Ugyldig pris", 400);
  const trimmed = reason?.trim() || null;
  if (unit !== listOere && !trimmed) {
    throw new CaseError(
      "price_reason_required",
      `Skriv en begrundelse, når prisen på ${label} afviger fra listeprisen`,
      400,
    );
  }
  return {
    list_oere: listOere,
    unit_oere: unit,
    reason: unit !== listOere ? trimmed : null,
    discounted: unit < listOere,
  };
}

/** Rabat i øre ud fra liste- og stykpris (0 hvis prisen er højere end listeprisen). */
export function discountOere(listOere: number, unitOere: number, qty = 1): number {
  return Math.max(0, (listOere - unitOere) * qty);
}

/** Linjer der ikke har en serverside listepris, og derfor ikke kan "afvige". */
export function hasListPrice(item: NewCaseItemInput): boolean {
  return item.kind !== "free_text";
}

/** Linjesum (stykpris x antal). */
export function lineTotalOere(unitOere: number, qty: number): number {
  return unitOere * qty;
}

/**
 * Hurtigt tjek før RPC-kaldet: ugyldige priser afvises uden at røre databasen. Om en pris afviger
 * fra listeprisen (og så kræver en begrundelse) afgør databasen, som som eneste kender listepriserne.
 */
export function assertPricesValid(items: NewCaseItemInput[]): void {
  for (const item of items) {
    const price = item.kind === "free_text" ? item.unit_price_oere : item.unit_price_oere ?? null;
    if (price == null) continue;
    if (!Number.isInteger(price) || price < 0) throw new CaseError("invalid_price", "Ugyldig pris", 400);
  }
}
