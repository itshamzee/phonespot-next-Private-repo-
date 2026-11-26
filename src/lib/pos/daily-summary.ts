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
  /** Lagersalg 3 for 2 (orders.bundle_discount_amount); holdes adskilt fra den manuelle rabat. */
  bundle_discount_amount?: number | null;
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
    description?: string | null;
  }>;
  order_payments: Array<{ type: string; amount_oere: number; reference?: string | null }>;
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
  openedByName?: string | null;
  closedByName?: string | null;
  /** Kortsalg i kassen, terminalens total og forskellen, sat ved lukning. */
  expectedCard?: number | null;
  countedCard?: number | null;
  cardDifference?: number | null;
  cardNote?: string | null;
};

/** Salgstyper på opgørelsen, i den rækkefølge de vises. */
export const SALE_KINDS = ["repair_service", "device", "sku_product", "free_text", "deposit", "deposit_applied"] as const;
export const SALE_KIND_LABELS: Record<string, string> = {
  repair_service: "Reparationer",
  device: "Enheder",
  sku_product: "Tilbehør og varer",
  free_text: "Andet salg (fritekst)",
  deposit: "Depositum modtaget",
  deposit_applied: "Depositum modregnet",
};

export type SummaryReceipt = {
  number: string;
  type: "pos" | "credit_note";
  confirmedAt: string | null;
  total: number;
  /** Kort tekst om indholdet: linjens beskrivelse, ellers salgstypen. */
  what: string;
  payments: Array<{ type: string; amount: number; reference: string | null }>;
};

export type PaymentBreakdown = { type: PaymentType; received: number; refunded: number; net: number };

export type DailySummary = {
  date: string;
  locationId: string | null;
  registerId: string | null;
  registerName: string | null;
  /** Butik og juridisk enhed til bilagets hoved (sat af loaderen). */
  locationName: string | null;
  locationAddress: string | null;
  company: { name: string; cvr: string } | null;
  /** Omsætning ekskl. moms: netTotal minus udgående moms og brugtmoms. */
  netExVat: number;
  /** Nettosalg pr. salgstype (inkl. moms, efter linjerabat). Kun typer med beløb. */
  byKind: Array<{ kind: string; label: string; gross: number }>;
  /** Hver bon i nummerorden: bilagets sporbarhed. */
  receipts: SummaryReceipt[];
  /** Kortafstemning fra lukkede sessioner; null når ingen session har en terminaltotal. */
  card: { expected: number; counted: number; difference: number; notes: string[] } | null;
  salesCount: number;
  creditCount: number;
  grossSales: number;
  refunds: number;
  netTotal: number;
  discountTotal: number;
  discountByReason: Record<string, number>;
  /** Lagersalg 3 for 2 givet på salg (ikke en del af discountTotal/discountByReason). */
  bundleTotal: number;
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
  meta: {
    date: string;
    locationId?: string | null;
    registerId?: string | null;
    registerName?: string | null;
    locationName?: string | null;
    locationAddress?: string | null;
    company?: { name: string; cvr: string } | null;
  },
): DailySummary {
  let salesCount = 0;
  let creditCount = 0;
  let grossSales = 0;
  let refunds = 0;
  let discountTotal = 0;
  let bundleTotal = 0;
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
  const kindGross = new Map<string, number>();
  const receipts: SummaryReceipt[] = [];

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
      bundleTotal += o.bundle_discount_amount ?? 0;
    }
    if (o.receipt_no == null) legacyOrderCount += 1;

    vatStandard += o.vat_total ?? 0;
    brugtmoms += o.brugtmoms_total ?? 0;

    for (const it of o.order_items ?? []) {
      kindGross.set(it.item_type, (kindGross.get(it.item_type) ?? 0) + it.total_price - (it.discount_amount ?? 0));
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
    receipts.push({
      number: o.receipt_number ?? o.order_number,
      type: o.type,
      confirmedAt: o.confirmed_at,
      total: o.total,
      what: receiptWhat(o),
      payments: lines.map((p: { type: string; amount_oere: number; reference?: string | null }) => ({
        type: p.type,
        amount: p.amount_oere,
        reference: p.reference ?? null,
      })),
    });
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
  const withCard = closed.filter((s) => s.countedCard != null);
  const card =
    withCard.length > 0
      ? {
          expected: withCard.reduce((s, x) => s + (x.expectedCard ?? 0), 0),
          counted: withCard.reduce((s, x) => s + (x.countedCard ?? 0), 0),
          difference: withCard.reduce((s, x) => s + (x.cardDifference ?? 0), 0),
          notes: withCard.map((x) => x.cardNote ?? "").filter(Boolean),
        }
      : null;

  const known = SALE_KINDS as readonly string[];
  const byKind = [...kindGross.entries()]
    .filter(([, gross]) => gross !== 0)
    .sort((a, b) => rank(known, a[0]) - rank(known, b[0]))
    .map(([kind, gross]) => ({ kind, label: SALE_KIND_LABELS[kind] ?? kind, gross }));
  // Ordrerabatter, der ikke ligger på linjerne (fx 3 for 2), så kolonnen summer til omsætningen.
  const kindSum = byKind.reduce((s, k) => s + k.gross, 0);
  if (byKind.length > 0 && kindSum !== netTotal) {
    byKind.push({ kind: "adjustment", label: "Rabat på hele bonen", gross: netTotal - kindSum });
  }
  receipts.sort((a, b) => a.number.localeCompare(b.number) || (a.confirmedAt ?? "").localeCompare(b.confirmedAt ?? ""));
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
    locationName: meta.locationName ?? null,
    locationAddress: meta.locationAddress ?? null,
    company: meta.company ?? null,
    netExVat: netTotal - vatStandard - brugtmoms,
    byKind,
    receipts,
    card,
    salesCount,
    creditCount,
    grossSales,
    refunds,
    netTotal,
    discountTotal,
    discountByReason,
    bundleTotal,
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

function rank(order: readonly string[], kind: string): number {
  const i = order.indexOf(kind);
  return i === -1 ? order.length : i;
}

/** Hvad bonen dækker: linjernes beskrivelser, ellers salgstypen. Depositum-modregning udelades. */
function receiptWhat(o: SummaryOrder): string {
  const parts: string[] = [];
  for (const it of o.order_items ?? []) {
    if (it.item_type === "deposit_applied") continue;
    const text = it.description?.trim() || SALE_KIND_LABELS[it.item_type] || it.item_type;
    if (!parts.includes(text)) parts.push(text);
  }
  const joined = parts.join(", ");
  return joined.length > 120 ? `${joined.slice(0, 117)}...` : joined;
}

function legacyType(method: string): string {
  if (method === "cash") return "kontant";
  if (method === "card") return "kort_terminal";
  return method;
}
