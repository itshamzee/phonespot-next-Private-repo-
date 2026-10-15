import { PAYMENT_LABELS, isPaymentType } from "./constants";
import { copenhagenDateString, copenhagenDayBounds, isValidDateString } from "./copenhagen";

/**
 * Pure helpers for the Kasse "Salgshistorik": period handling, filter parsing
 * and shaping of stored rows into what the list/detail show. No I/O here, so
 * everything is unit-testable; the Supabase reads live in sales-history-data.ts.
 */

export const SALES_PER_PAGE = 25;

export const PERIOD_PRESETS = ["i-dag", "i-gaar", "uge", "periode"] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  "i-dag": "I dag",
  "i-gaar": "I går",
  uge: "Denne uge",
  periode: "Periode",
};

export type SalesFilters = {
  period: PeriodPreset;
  /** YYYY-MM-DD, only used (and always set) when period is "periode". */
  from: string;
  to: string;
  payment: string;
  q: string;
  page: number;
};

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseSalesFilters(raw: Raw, now: Date = new Date()): SalesFilters {
  const today = copenhagenDateString(now);
  const p = first(raw.periode);
  const period: PeriodPreset = (PERIOD_PRESETS as readonly string[]).includes(p ?? "") ? (p as PeriodPreset) : "i-dag";
  let from = first(raw.fra) ?? "";
  let to = first(raw.til) ?? "";
  if (period === "periode") {
    if (!isValidDateString(from)) from = today;
    if (!isValidDateString(to)) to = from;
    if (to < from) [from, to] = [to, from];
  } else {
    from = "";
    to = "";
  }
  const pay = first(raw.betaling) ?? "";
  const page = Math.max(1, parseInt(first(raw.side) ?? "1", 10) || 1);
  return {
    period,
    from,
    to,
    payment: isPaymentType(pay) ? pay : "",
    q: (first(raw.q) ?? "").trim().slice(0, 80),
    page,
  };
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Monday of the week containing dateStr. */
function weekStart(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(dateStr, -((dow + 6) % 7));
}

/** Half-open UTC range [startIso, endIso) for the chosen period, in Copenhagen days. */
export function periodRange(f: Pick<SalesFilters, "period" | "from" | "to">, now: Date = new Date()) {
  const today = copenhagenDateString(now);
  let a = today;
  let b = today;
  if (f.period === "i-gaar") a = b = addDays(today, -1);
  else if (f.period === "uge") a = weekStart(today);
  else if (f.period === "periode") {
    a = f.from;
    b = f.to;
  }
  return { startIso: copenhagenDayBounds(a).startIso, endIso: copenhagenDayBounds(b).endIso, fromDate: a, toDate: b };
}

/** Channel filter for the webshop order list: only webshop-side types, never "pos" (credit notes included). */
export function webshopOrderType(raw: string | undefined): "online" | "draft" | "shopify" {
  return raw === "draft" || raw === "shopify" ? raw : "online";
}

/** Removes characters that would break a PostgREST .or() filter string. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[%,()*\\"']/g, " ").replace(/\s+/g, " ").trim();
}

const LEGACY_PAYMENT_LABELS: Record<string, string> = {
  card: "Kort",
  cash: "Kontant",
  mobilepay: "MobilePay",
  split: "Delt betaling",
};

export type PaymentRow = { type: string; amount_oere: number };

export function paymentLabel(type: string): string {
  return isPaymentType(type) ? PAYMENT_LABELS[type] : (LEGACY_PAYMENT_LABELS[type] ?? type);
}

/** "Kontant, MobilePay" from stored payment rows; falls back to the legacy orders.payment_method. */
export function paymentSummary(payments: PaymentRow[], legacyMethod?: string | null): string {
  const types = [...new Set(payments.filter((p) => p.amount_oere > 0).map((p) => p.type))];
  if (types.length) return types.map(paymentLabel).join(", ");
  return legacyMethod ? paymentLabel(legacyMethod) : "—";
}

export type ItemRow = {
  item_type: string;
  quantity: number;
  description: string | null;
  device_name?: string | null;
  sku_title?: string | null;
  repair_ticket_id?: string | null;
};

export function itemName(i: ItemRow): string {
  const name = i.description?.trim() || i.device_name || i.sku_title;
  if (name) return name;
  switch (i.item_type) {
    case "deposit":
      return "Depositum";
    case "deposit_applied":
      return "Depositum modregnet";
    case "repair_service":
      return "Reparation";
    default:
      return "Vare";
  }
}

/** One short line: "iPhone 13 128 GB, Cover +2". */
export function itemsSummary(items: ItemRow[], max = 2): string {
  if (items.length === 0) return "—";
  const names = items.map((i) => (i.quantity > 1 ? `${i.quantity} x ${itemName(i)}` : itemName(i)));
  const shown = names.slice(0, max).join(", ");
  return names.length > max ? `${shown} +${names.length - max}` : shown;
}

export type RefundState = "ingen" | "delvis" | "fuld";

/** Returned state from the credit notes (credit_note orders) that reference a sale. */
export function refundState(total: number, refundedOere: number): RefundState {
  if (refundedOere <= 0) return "ingen";
  return refundedOere >= total ? "fuld" : "delvis";
}

export const REFUND_LABELS: Record<RefundState, string> = {
  ingen: "",
  delvis: "Delvist returneret",
  fuld: "Returneret",
};

export type SaleListRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string | null;
  customerPhone: string | null;
  summary: string;
  caseNumbers: string[];
  payments: string;
  staffName: string | null;
  total: number;
  refunded: number;
  refundState: RefundState;
};

export type SalesTotals = {
  count: number;
  total: number;
  returned: number;
  byPayment: Array<{ label: string; amount: number }>;
};

/** Sums the period: sales total, returns (credit notes), and money per payment method. */
export function totalsFor(
  sales: Array<{ total: number }>,
  creditNotes: Array<{ total: number }>,
  payments: PaymentRow[],
): SalesTotals {
  const byType = new Map<string, number>();
  for (const p of payments) byType.set(p.type, (byType.get(p.type) ?? 0) + p.amount_oere);
  return {
    count: sales.length,
    total: sales.reduce((n, s) => n + s.total, 0),
    returned: creditNotes.reduce((n, c) => n + Math.abs(c.total), 0),
    byPayment: [...byType.entries()]
      .filter(([, amount]) => amount !== 0)
      .map(([type, amount]) => ({ label: paymentLabel(type), amount })),
  };
}

/** Link to the existing return flow, prefilled with the sale's store/register and receipt number. */
export function returUrl(sale: { locationId: string | null; registerId: string | null; receiptNumber: string }): string {
  const p = new URLSearchParams();
  if (sale.locationId) p.set("location_id", sale.locationId);
  if (sale.registerId) p.set("register_id", sale.registerId);
  p.set("q", sale.receiptNumber);
  return `/admin/platform/pos/retur?${p.toString()}`;
}

export function buildQuery(f: SalesFilters, over: Partial<SalesFilters> = {}): string {
  const m = { ...f, ...over };
  const p = new URLSearchParams();
  if (m.period !== "i-dag") p.set("periode", m.period);
  if (m.period === "periode") {
    p.set("fra", m.from);
    p.set("til", m.to);
  }
  if (m.payment) p.set("betaling", m.payment);
  if (m.q) p.set("q", m.q);
  if (m.page > 1) p.set("side", String(m.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}
