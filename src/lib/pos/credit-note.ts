/**
 * Credit-note (kreditnota) construction. A POS return NEVER touches the
 * original order: it becomes a new order of type 'credit_note' with negative
 * lines referencing the original. Mirrors pos_create_return (SQL is
 * authoritative); this drives the return preview and the unit tests.
 *
 * Amount model per original line (all oere, VAT-inclusive):
 *   total_price     = unit_price * quantity before discount
 *   discount_amount = allocated share of the sale discount
 *   vat_amount      = standard VAT (regular) or brugtmoms (brugtmoms)
 *   net refund      = total_price - discount_amount
 * A partial return takes round(orig * returnedQty / origQty) of each field; the
 * return that completes a line takes exactly the remainder, so a line that is
 * returned in several steps always sums to the original.
 */

export type OriginalLine = {
  id: string;
  itemType: "device" | "sku_product" | "free_text" | "deposit";
  deviceId: string | null;
  skuProductId: string | null;
  description: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountAmount: number;
  vatAmount: number;
  vatScheme: "brugtmoms" | "regular" | null;
  purchasePrice: number | null;
};

/** Positive sums of what earlier credit notes already took back, per original line. */
export type ReturnedSoFar = {
  quantity: number;
  total: number;
  discount: number;
  vat: number;
};

export type ReturnRequestLine = {
  orderItemId: string;
  quantity: number;
  restock: boolean;
};

export type CreditLine = {
  originalItemId: string;
  itemType: OriginalLine["itemType"];
  deviceId: string | null;
  skuProductId: string | null;
  description: string | null;
  /** Negative. */
  quantity: number;
  unitPrice: number;
  /** Negative. */
  totalPrice: number;
  /** Negative. */
  discountAmount: number;
  /** Negative. */
  vatAmount: number;
  vatScheme: "brugtmoms" | "regular" | null;
  purchasePrice: number | null;
  restock: boolean;
};

export type CreditNote = {
  lines: CreditLine[];
  /** Negative. */
  subtotal: number;
  /** Negative. */
  discount: number;
  /** Negative: the amount to refund, as a negative number. */
  total: number;
  vatTotal: number;
  brugtmomsTotal: number;
  /** Positive amount the customer gets back. */
  refundAmount: number;
};

export class CreditNoteError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "CreditNoteError";
  }
}

function portion(orig: number, returnedSoFar: number, origQty: number, remainingQty: number, qty: number): number {
  const remaining = orig - returnedSoFar;
  if (qty === remainingQty) return remaining;
  return Math.min(Math.round((orig * qty) / origQty), remaining);
}

export function buildCreditNote(
  originalLines: OriginalLine[],
  returned: Record<string, ReturnedSoFar | undefined>,
  requests: ReturnRequestLine[],
): CreditNote {
  const active = requests.filter((r) => r.quantity > 0);
  if (active.length === 0) {
    throw new CreditNoteError("return_nothing", "Vælg mindst én vare der skal returneres");
  }

  const seen = new Set<string>();
  const lines: CreditLine[] = [];

  for (const req of active) {
    if (seen.has(req.orderItemId)) {
      throw new CreditNoteError("return_duplicate_line", "Samme varelinje er valgt to gange");
    }
    seen.add(req.orderItemId);

    const orig = originalLines.find((l) => l.id === req.orderItemId);
    if (!orig) {
      throw new CreditNoteError("return_item_not_found", "Varelinjen findes ikke på det oprindelige salg");
    }
    const so = returned[orig.id] ?? { quantity: 0, total: 0, discount: 0, vat: 0 };
    const remainingQty = orig.quantity - so.quantity;
    if (!Number.isInteger(req.quantity) || req.quantity < 1 || req.quantity > remainingQty) {
      throw new CreditNoteError(
        "return_quantity_invalid",
        remainingQty <= 0 ? "Varelinjen er allerede returneret" : `Du kan højst returnere ${remainingQty} stk.`,
      );
    }

    const total = portion(orig.totalPrice, so.total, orig.quantity, remainingQty, req.quantity);
    const discount = portion(orig.discountAmount, so.discount, orig.quantity, remainingQty, req.quantity);
    const vat = portion(orig.vatAmount, so.vat, orig.quantity, remainingQty, req.quantity);

    lines.push({
      originalItemId: orig.id,
      itemType: orig.itemType,
      deviceId: orig.deviceId,
      skuProductId: orig.skuProductId,
      description: orig.description,
      quantity: -req.quantity,
      unitPrice: orig.unitPrice,
      totalPrice: -total,
      discountAmount: -discount,
      vatAmount: -vat,
      vatScheme: orig.vatScheme,
      purchasePrice: orig.purchasePrice,
      restock: req.restock,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.totalPrice, 0);
  const discount = lines.reduce((s, l) => s + l.discountAmount, 0);
  const total = subtotal - discount;
  return {
    lines,
    subtotal,
    discount,
    total,
    vatTotal: lines.filter((l) => l.vatScheme !== "brugtmoms").reduce((s, l) => s + l.vatAmount, 0),
    brugtmomsTotal: lines.filter((l) => l.vatScheme === "brugtmoms").reduce((s, l) => s + l.vatAmount, 0),
    refundAmount: -total,
  };
}
