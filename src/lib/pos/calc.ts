import {
  STANDARD_VAT_DENOMINATOR,
  STANDARD_VAT_NUMERATOR,
  REFERENCE_REQUIRED_TYPES,
  isPaymentType,
  type PaymentType,
} from "./constants";

/**
 * Pure money maths for the POS. ALL amounts are integer oere, VAT-inclusive.
 *
 * The SQL function pos_create_sale (supabase/migrations/20261003130000_pos_rpcs.sql)
 * implements the same algorithms; the SQL is authoritative, this file drives
 * the UI preview and the unit tests. Keep the two in sync.
 */

/**
 * Distribute a discount proportionally over line totals (largest remainder, so
 * the allocations sum to EXACTLY the discount). Lines with total 0 get 0.
 * Ties on the remainder go to the lowest index.
 */
export function distributeDiscount(lineTotals: number[], discount: number): number[] {
  const base = lineTotals.reduce((s, t) => s + t, 0);
  const out = lineTotals.map(() => 0);
  if (discount <= 0 || base <= 0) return out;
  if (discount > base) throw new Error("discount_exceeds_total");

  const rema: number[] = [];
  let allocated = 0;
  lineTotals.forEach((t, i) => {
    const prod = discount * t;
    out[i] = Math.floor(prod / base);
    rema[i] = prod - out[i] * base;
    allocated += out[i];
  });

  let left = discount - allocated;
  const taken = new Set<number>();
  while (left > 0) {
    let best = -1;
    for (let i = 0; i < rema.length; i++) {
      if (taken.has(i) || rema[i] <= 0) continue;
      if (best === -1 || rema[i] > rema[best]) best = i;
    }
    if (best === -1) break;
    out[best] += 1;
    taken.add(best);
    left -= 1;
  }
  return out;
}

/** Standard 25 % VAT contained in a VAT-inclusive amount: 25/125 of it. */
export function standardVat(grossOere: number): number {
  // Round half away from zero like Postgres round(), so a negative line (applied
  // deposit) carries exactly minus the VAT of the positive one.
  const vat = Math.round((Math.abs(grossOere) * STANDARD_VAT_NUMERATOR) / STANDARD_VAT_DENOMINATOR);
  return grossOere < 0 ? -vat : vat;
}

/**
 * Brugtmoms (margin scheme): 25/125 of the margin, margin = net selling price
 * (after discount) minus purchase price. Negative margin gives 0, never a credit.
 */
export function brugtmomsVat(netOere: number, purchaseOere: number): number {
  const margin = netOere - purchaseOere;
  if (margin <= 0) return 0;
  return Math.round((margin * STANDARD_VAT_NUMERATOR) / STANDARD_VAT_DENOMINATOR);
}

export type SaleLineInput = {
  kind: "device" | "sku_product" | "free_text" | "deposit" | "repair_service" | "deposit_applied";
  unitPrice: number;
  quantity: number;
  /** Purchase/cost price per unit (devices: purchase_price, accessories: cost_price). */
  costPrice: number | null;
  vatScheme: "brugtmoms" | "regular";
};

export type SaleLineResult = SaleLineInput & {
  total: number; // unit * quantity, before discount
  discount: number; // allocated discount
  net: number; // total - discount
  vat: number; // brugtmoms (scheme brugtmoms) or standard VAT (regular)
};

export type SaleTotals = {
  lines: SaleLineResult[];
  subtotal: number;
  discount: number;
  total: number;
  /** Standard VAT included in regular lines. */
  vatTotal: number;
  /** Brugtmoms payable on margin-scheme lines. */
  brugtmomsTotal: number;
};

/** Prepayment lines (deposit received / applied) are never discountable. */
export function isDepositKind(kind: SaleLineInput["kind"]): boolean {
  return kind === "deposit" || kind === "deposit_applied";
}

/**
 * Totals for a cart. Discount is distributed over all lines except deposit
 * lines (a deposit is a prepayment, not discountable), THEN VAT is computed per
 * line on the discounted amount. An applied deposit is a negative line.
 */
export function computeSaleTotals(lines: SaleLineInput[], discount = 0): SaleTotals {
  const totals = lines.map((l) => l.unitPrice * l.quantity);
  const discountable = lines.map((l, i) => (isDepositKind(l.kind) ? 0 : totals[i]));
  const discountableBase = discountable.reduce((s, t) => s + t, 0);
  if (discount < 0) throw new Error("discount_negative");
  if (discount > discountableBase) throw new Error("discount_exceeds_total");
  const alloc = distributeDiscount(discountable, discount);

  const result = lines.map<SaleLineResult>((l, i) => {
    const net = totals[i] - alloc[i];
    const vat =
      l.vatScheme === "brugtmoms"
        ? brugtmomsVat(net, (l.costPrice ?? 0) * l.quantity)
        : standardVat(net);
    return { ...l, total: totals[i], discount: alloc[i], net, vat };
  });

  const subtotal = totals.reduce((s, t) => s + t, 0);
  return {
    lines: result,
    subtotal,
    discount,
    total: subtotal - discount,
    vatTotal: result.filter((l) => l.vatScheme === "regular").reduce((s, l) => s + l.vat, 0),
    brugtmomsTotal: result.filter((l) => l.vatScheme === "brugtmoms").reduce((s, l) => s + l.vat, 0),
  };
}

export type PaymentLineInput = {
  type: string;
  amountOere: number;
  reference?: string | null;
};

export type PaymentValidation =
  | { ok: true; sum: number }
  | { ok: false; code: string; message: string; sum: number };

/**
 * Split-payment validation: every line has a known type and a positive integer
 * amount, voucher/gift-card lines carry a reference, and the lines sum to
 * exactly the sale total. A zero-total sale takes no payment lines.
 */
export function validatePayments(payments: PaymentLineInput[], total: number): PaymentValidation {
  let sum = 0;
  for (const p of payments) {
    if (!isPaymentType(p.type)) {
      return { ok: false, code: "invalid_payment_type", message: `Ugyldig betalingstype: ${p.type}`, sum };
    }
    if (!Number.isInteger(p.amountOere) || p.amountOere <= 0) {
      return { ok: false, code: "invalid_payment_amount", message: "Beløb skal være større end 0", sum };
    }
    if (
      REFERENCE_REQUIRED_TYPES.includes(p.type as PaymentType) &&
      !(p.reference && p.reference.trim())
    ) {
      return {
        ok: false,
        code: "payment_reference_required",
        message: "Angiv nummer/kode på tilgodebevis eller gavekort",
        sum,
      };
    }
    sum += p.amountOere;
  }
  if (sum !== total) {
    const diff = total - sum;
    return {
      ok: false,
      code: "payment_mismatch",
      message: diff > 0 ? "Betalingerne dækker ikke totalen" : "Betalingerne overstiger totalen",
      sum,
    };
  }
  return { ok: true, sum };
}

/** Legacy `orders.payment_method` summary for old readers (dashboard, order list). */
export function legacyPaymentMethod(types: string[]): string | null {
  const uniq = [...new Set(types)];
  if (uniq.length === 0) return null;
  if (uniq.length > 1) return "split";
  const t = uniq[0];
  if (t === "kontant") return "cash";
  if (t === "kort_terminal") return "card";
  return t;
}
