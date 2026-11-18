import { computeKpis, type OverviewItem, type OverviewOrder } from "@/lib/admin/overview/kpi";
import { storeSlugForOrder } from "@/lib/admin/overview/sale-rules";
import type { ScopeSlug } from "@/lib/auth/store-scope";

/**
 * Statistik-linjer: hver solgt ordrelinje klassificeret efter type (stream),
 * kategori, butik og medarbejder. Rene funktioner, beløb i øre.
 *
 * Pr. ordre lægges forskellen mellem computeKpis([ordre]) og summen af linjerne
 * (fragt, rabat på ordren, afrunding, brugtmoms) på én ekstra "Fragt og rabatter"-
 * linje, så alle opdelinger summer præcis til computeKpis.
 */

export type Stream = "webshop" | "kasse" | "reparation";
export type Category = "enheder" | "tilbehoer" | "reparation" | "oevrigt";
export type StatLine = {
  orderId: string;
  at: string;
  stream: Stream;
  category: Category;
  store: ScopeSlug;
  staffId: string | null;
  productKey: string;
  name: string;
  quantity: number;
  /** Ekskl. moms, øre. */
  revenue: number;
  revenueInclVat: number;
  cost: number;
  missingCost: boolean;
  /** Linjen hører til en kreditnota. */
  isCredit: boolean;
};
export type StaffLookup = { id: string; name: string; active: boolean }[];
export type LineCtx = {
  slugOf: (locationId: string | null | undefined) => ScopeSlug | null;
  /** repair_tickets.assigned_to (fritekst) pr. sag. */
  technicianByTicket: Map<string, string | null>;
  staff: StaffLookup;
  /** Type pr. oprindelig ordre-id; kreditnotaer slås op på deres original_order_id. */
  originalStreamByOrderId?: Map<string, Stream>;
};

const REMAINDER_NAME = "Fragt og rabatter";
const REMAINDER_KEY = "oevrigt";

const isDepositLine = (it: OverviewItem) => it.item_type === "deposit" || it.item_type === "deposit_applied";
const lineAmount = (it: OverviewItem) => (it.total_price ?? 0) - (it.discount_amount ?? 0);
const norm = (s: string) => s.trim().toLowerCase();

/**
 * Finder en aktiv medarbejder ud fra fritekst: fuldt navn (uden store/små bogstaver),
 * ellers et fornavn, der kun passer på én. Flertydigt eller intet match giver null.
 */
export function matchStaffByName(name: string | null | undefined, staff: StaffLookup): string | null {
  const wanted = norm(name ?? "");
  if (!wanted) return null;
  const active = staff.filter((s) => s.active);
  const full = active.filter((s) => norm(s.name) === wanted);
  if (full.length === 1) return full[0].id;
  if (full.length > 1) return null;
  const first = active.filter((s) => norm(s.name).split(/\s+/)[0] === wanted);
  return first.length === 1 ? first[0].id : null;
}

function orderStream(o: OverviewOrder, ctx: LineCtx): Stream {
  if (o.type === "online") return "webshop";
  if (o.type === "credit_note") {
    return (o.original_order_id && ctx.originalStreamByOrderId?.get(o.original_order_id)) || "kasse";
  }
  return "kasse";
}

function categoryOf(it: OverviewItem): Category {
  if (it.repair_ticket_id) return "reparation";
  if (it.item_type === "device") return "enheder";
  if (it.item_type === "free_text") return "oevrigt";
  return "tilbehoer";
}

function productKeyOf(it: OverviewItem): string {
  if (it.repair_ticket_id) return `ticket:${it.repair_ticket_id}`;
  if (it.device_id) return `device:${it.device_id}`;
  if (it.sku_product_id) return `sku:${it.sku_product_id}`;
  return `${it.item_type ?? "item"}:${it.name ?? ""}`;
}

/**
 * Linjens moms er ukendt, når vat_amount mangler. order_items.vat_amount er
 * NOT NULL DEFAULT 0, og webshoppen skriver den ikke, så på online-ordrer
 * betyder 0 også "ukendt".
 */
const vatUnknown = (it: OverviewItem, o: OverviewOrder) =>
  it.vat_amount == null || (o.type === "online" && it.vat_amount === 0);

/**
 * Brugtmoms for linjer med ukendt moms: ordrens brugtmoms_total (minus brugtmoms
 * der allerede står på linjerne) fordelt efter linjebeløb. Den sidste linje får
 * afrundingsresten, så fordelingen summer præcis.
 */
function allocateBrugtmoms(o: OverviewOrder, items: OverviewItem[]): Map<OverviewItem, number> {
  const out = new Map<OverviewItem, number>();
  const brugt = items.filter((it) => it.vat_scheme === "brugtmoms");
  const open = brugt.filter((it) => vatUnknown(it, o));
  if (!open.length) return out;
  const known = brugt.filter((it) => !vatUnknown(it, o)).reduce((s, it) => s + (it.vat_amount ?? 0), 0);
  const toSplit = (o.brugtmoms_total ?? 0) - known;
  const base = open.reduce((s, it) => s + lineAmount(it), 0);
  let given = 0;
  open.forEach((it, i) => {
    const share = i === open.length - 1 ? toSplit - given : base === 0 ? 0 : Math.round((toSplit * lineAmount(it)) / base);
    given += share;
    out.set(it, share);
  });
  return out;
}

/**
 * Linjens moms. Ukendt standardmoms på en online-linje udledes som en femtedel,
 * men kun når ordren ikke har vat_total (samme betingelse som estimateStandardVat
 * i computeKpis); ellers ligger forskellen på "Fragt og rabatter"-linjen.
 */
function lineVat(it: OverviewItem, o: OverviewOrder, brugtmoms: Map<OverviewItem, number>): number {
  if (!vatUnknown(it, o)) return it.vat_amount ?? 0;
  if (it.vat_scheme === "brugtmoms") return brugtmoms.get(it) ?? 0;
  if (o.type === "online" && (o.vat_total ?? 0) === 0) return Math.round(lineAmount(it) / 5);
  return 0;
}

export function toStatLines(orders: OverviewOrder[], ctx: LineCtx): StatLine[] {
  const out: StatLine[] = [];

  for (const o of orders) {
    const stream = orderStream(o, ctx);
    const store = storeSlugForOrder(o, ctx.slugOf);
    const orderStaff = stream === "webshop" ? null : o.staff_id ?? null;
    const isCredit = o.type === "credit_note";
    // Uden confirmed_at falder linjen uden for alle intervaller; loaderen sender kun ordrer med confirmed_at i perioden.
    const base = { orderId: o.id ?? "", at: o.confirmed_at ?? "", store, isCredit };
    const items = (o.order_items ?? []).filter((it) => !isDepositLine(it));
    const brugtmoms = allocateBrugtmoms(o, items);
    let sumExVat = 0;
    let sumInclVat = 0;

    for (const it of items) {
      const amount = lineAmount(it);
      const revenue = amount - lineVat(it, o, brugtmoms);
      const category = categoryOf(it);
      const ticket = it.repair_ticket_id;
      const quantity = it.quantity ?? 0;
      sumExVat += revenue;
      sumInclVat += amount;
      out.push({
        ...base,
        stream: ticket ? "reparation" : stream,
        category,
        staffId: ticket ? matchStaffByName(ctx.technicianByTicket.get(ticket), ctx.staff) ?? o.staff_id ?? null : orderStaff,
        productKey: productKeyOf(it),
        name: it.name ?? "",
        quantity,
        revenue,
        revenueInclVat: amount,
        cost: (it.purchase_price ?? 0) * quantity,
        missingCost: it.purchase_price == null && (category === "enheder" || category === "tilbehoer"),
      });
    }

    const kpis = computeKpis([o]);
    const restExVat = kpis.revenueExVat - sumExVat;
    const restInclVat = kpis.revenue - sumInclVat;
    if (restExVat !== 0 || restInclVat !== 0) {
      out.push({
        ...base,
        stream,
        category: "oevrigt",
        staffId: orderStaff,
        productKey: REMAINDER_KEY,
        name: REMAINDER_NAME,
        quantity: 0,
        revenue: restExVat,
        revenueInclVat: restInclVat,
        cost: 0,
        missingCost: false,
      });
    }
  }

  return out;
}
