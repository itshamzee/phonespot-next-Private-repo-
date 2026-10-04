import { PAYMENT_TYPES, isPaymentType, type PaymentType } from "./constants";
import { standardVat } from "./calc";
import { finalDifference, sumExpenses, type CashExpense } from "./cash-session";

/**
 * Daily summary (dagsopgoerelse) per register and Copenhagen day, aggregated
 * from the immutable documents (orders, order_items, order_payments) plus the
 * locked cash sessions. Pure: the loader in daily-summary-data.ts feeds it.
 *
 * Sign convention: sales are positive, credit notes negative. "Net" figures
 * therefore already have returns taken off.
 */

export type SummaryOrder = {
  id: string;
  order_number: string;
  receipt_number: string | null;
  receipt_no: number | null;
  type: "pos" | "credit_note";
  total: number;
  discount_amount: number;
  discount_reason: string | null;
  vat_total: number | null;
  brugtmoms_total: number | null;
  confirmed_at: string | null;
  payment_method: string | null;
  register_id: string | null;
  order_items: Array<{
    item_type: string;
    quantity: number;
    total_price: number;
    discount_amount: number | null;
    vat_scheme: "brugtmoms" | "regular" | null;
    /** Needed to split deposit VAT; falls back to 25/125 of the line when absent. */
    vat_amount?: number | null;
  }>;
  order_payments: Array<{ type: string; amount_oere: number }>;
};

export type SummarySession = {
  id: string;
  registerId: string;
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  countedCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  cashToBank: number | null;
  expenses: CashExpense[];
  locked: boolean;
  adjustments: number[];
};

export type PaymentBreakdown = { type: PaymentType; received: number; refunded: number; net: number };

export type DailySummary = {
  date: string;
  locationId: string | null;
  registerId: string | null;
  registerName: string | null;
  salesCount: number;
  creditCount: number;
  grossSales: number;
  refunds: number;
  netTotal: number;
  discountTotal: number;
  discountByReason: Record<string, number>;
  payments: PaymentBreakdown[];
  /** Standard 25 % VAT contained in net sales (credit notes subtract). */
  vatStandard: number;
  /** Brugtmoms payable on margin-scheme lines (credit notes subtract). */
  brugtmoms: number;
  /** Net sales on standard-VAT lines, incl. VAT. */
  regularGross: number;
  /** Net sales on brugtmoms lines (gross selling price after discount). */
  brugtGross: number;
  /**
   * Repair deposits (prepayments). Received and applied are reported separately:
   * VAT is booked when the deposit is received, and the applied amount is taken off
   * the pickup receipt. Amounts are net of returns (a refunded deposit reduces
   * "received"), VAT-inclusive, positive numbers.
   */
  deposits: { received: number; receivedVat: number; applied: number; appliedVat: number };
  deviceCount: number;
  skuCount: number;
  receiptRange: { first: string | null; last: string | null; count: number };
  legacyOrderCount: number;
  sessions: SummarySession[];
  cash: {
    sessionsClosed: number;
    sessionsOpen: number;
    openingFloat: number;
    expectedCash: number;
    countedCash: number;
    /** Closed sessions' differences incl. later adjustment rows. */
    difference: number;
    cashToBank: number;
    expensesTotal: number;
  };
};

export function aggregateDailySummary(
  orders: SummaryOrder[],
  sessions: SummarySession[],
  meta: { date: string; locationId?: string | null; registerId?: string | null; registerName?: string | null },
): DailySummary {
  let salesCount = 0;
  let creditCount = 0;
  let grossSales = 0;
  let refunds = 0;
  let discountTotal = 0;
  const discountByReason: Record<string, number> = {};
  const pay = new Map<PaymentType, PaymentBreakdown>();
  let vatStandard = 0;
  let brugtmoms = 0;
  let brugtGross = 0;
  let deviceCount = 0;
  let skuCount = 0;
  let legacyOrderCount = 0;
  let depReceived = 0;
  let depReceivedVat = 0;
  let depApplied = 0;
  let depAppliedVat = 0;

  const numbered = orders
    .filter((o) => o.receipt_no != null)
    .sort((a, b) => (a.receipt_no ?? 0) - (b.receipt_no ?? 0));

  for (const o of orders) {
    if (o.type === "credit_note") {
      creditCount += 1;
      refunds += -o.total;
    } else {
      salesCount += 1;
      grossSales += o.total;
      discountTotal += o.discount_amount;
      if (o.discount_amount > 0) {
        const key = o.discount_reason ?? "Ukendt";
        discountByReason[key] = (discountByReason[key] ?? 0) + o.discount_amount;
      }
    }
    if (o.receipt_no == null) legacyOrderCount += 1;

    vatStandard += o.vat_total ?? 0;
    brugtmoms += o.brugtmoms_total ?? 0;

    for (const it of o.order_items ?? []) {
      if (it.item_type === "device") deviceCount += it.quantity;
      else if (it.item_type === "sku_product") skuCount += it.quantity;
      if (it.vat_scheme === "brugtmoms") brugtGross += it.total_price - (it.discount_amount ?? 0);
      if (it.item_type === "deposit") {
        depReceived += it.total_price;
        depReceivedVat += it.vat_amount ?? standardVat(it.total_price);
      } else if (it.item_type === "deposit_applied") {
        // Applied lines are negative on a sale, positive on the credit note that reverses them.
        depApplied += -it.total_price;
        depAppliedVat += -(it.vat_amount ?? standardVat(it.total_price));
      }
    }

    // Legacy sales (before order_payments) fall back to the single payment_method.
    const lines =
      o.order_payments && o.order_payments.length > 0
        ? o.order_payments
        : o.payment_method
          ? [{ type: legacyType(o.payment_method), amount_oere: o.total }]
          : [];
    for (const p of lines) {
      if (!isPaymentType(p.type)) continue;
      const cur = pay.get(p.type) ?? { type: p.type, received: 0, refunded: 0, net: 0 };
      if (p.amount_oere >= 0) cur.received += p.amount_oere;
      else cur.refunded += -p.amount_oere;
      cur.net += p.amount_oere;
      pay.set(p.type, cur);
    }
  }

  const netTotal = grossSales - refunds;
  const payments = PAYMENT_TYPES.filter((t) => pay.has(t)).map((t) => pay.get(t)!);

  const closed = sessions.filter((s) => s.locked);
  const cash = {
    sessionsClosed: closed.length,
    sessionsOpen: sessions.length - closed.length,
    openingFloat: sessions.reduce((s, x) => s + x.openingFloat, 0),
    expectedCash: closed.reduce((s, x) => s + (x.expectedCash ?? 0), 0),
    countedCash: closed.reduce((s, x) => s + (x.countedCash ?? 0), 0),
    difference: closed.reduce((s, x) => s + finalDifference(x.difference ?? 0, x.adjustments), 0),
    cashToBank: closed.reduce((s, x) => s + (x.cashToBank ?? 0), 0),
    expensesTotal: closed.reduce((s, x) => s + sumExpenses(x.expenses), 0),
  };

  return {
    date: meta.date,
    locationId: meta.locationId ?? null,
    registerId: meta.registerId ?? null,
    registerName: meta.registerName ?? null,
    salesCount,
    creditCount,
    grossSales,
    refunds,
    netTotal,
    discountTotal,
    discountByReason,
    payments,
    vatStandard,
    brugtmoms,
    regularGross: netTotal - brugtGross,
    brugtGross,
    deposits: { received: depReceived, receivedVat: depReceivedVat, applied: depApplied, appliedVat: depAppliedVat },
    deviceCount,
    skuCount,
    receiptRange: {
      first: numbered[0]?.receipt_number ?? null,
      last: numbered[numbered.length - 1]?.receipt_number ?? null,
      count: numbered.length,
    },
    legacyOrderCount,
    sessions,
    cash,
  };
}

function legacyType(method: string): string {
  if (method === "cash") return "kontant";
  if (method === "card") return "kort_terminal";
  return method;
}
