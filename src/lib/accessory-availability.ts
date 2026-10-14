// Én sandhed om tilbehørs lagerstatus — bruges af produktsiden (UI + JSON-LD)
// og af Google Shopping-feedet, så de aldrig siger forskellige ting.
//
// stock > 0                       -> på lager
// stock 0 + always_in_stock       -> leveres fra leverandør inden for få dage;
//                                    meldes som InStock (ikke BackOrder)
// stock 0, ikke always_in_stock   -> udsolgt
// stock ukendt (null)             -> ukendt på siden; "out_of_stock" i feedet,
//                                    medmindre always_in_stock er sat

export interface AccessoryAvailability {
  /** Google Merchant `g:availability`. */
  feed: "in_stock" | "out_of_stock";
  /** schema.org availability-URL, eller undefined når status er ukendt. */
  schema: string | undefined;
  /** Dansk statustekst til siden. */
  label: string;
  /** Kan varen lægges i kurven? */
  canBuy: boolean;
}

export const SUPPLIER_STOCK_LABEL = "På lager hos leverandør – sendes 1–3 hverdage";

export function accessoryAvailability(
  stockQuantity: number | null | undefined,
  alwaysInStock: boolean | null | undefined,
): AccessoryAvailability {
  const stock = stockQuantity ?? 0;
  if (stock > 0) {
    return { feed: "in_stock", schema: "https://schema.org/InStock", label: "På lager", canBuy: true };
  }
  if (alwaysInStock) {
    return { feed: "in_stock", schema: "https://schema.org/InStock", label: SUPPLIER_STOCK_LABEL, canBuy: true };
  }
  if (stockQuantity == null) {
    return { feed: "out_of_stock", schema: undefined, label: "Lagerstatus ukendt", canBuy: false };
  }
  return { feed: "out_of_stock", schema: "https://schema.org/OutOfStock", label: "Udsolgt", canBuy: false };
}
