import { computeKpis, type OverviewOrder } from "@/lib/admin/overview/kpi";
import { calendarDaysSince } from "@/lib/admin/overview/format";
import { addDays } from "@/lib/admin/overview/period";
import { POS_TIME_ZONE } from "@/lib/pos/constants";
import { copenhagenDateString, copenhagenDayBounds } from "@/lib/pos/copenhagen";
import { SCOPE_LABELS, SCOPE_SLUGS, isScopeSlug, type ScopeSlug, type StoreScope } from "@/lib/auth/store-scope";
import type { StatViewer } from "./access";
import { countOrders, groupLines, pctDelta, seriesByBucket, staffTable, sumLines, topProducts, type Totals } from "./aggregate";
import { toStatLines, type Category, type LineCtx, type StatLine, type Stream } from "./lines";
import { nowBlockRanges, type StatBucket, type StatRange } from "./range";

/**
 * Statistik-payload: rene funktioner fra de indlæste rækker til det, siden,
 * grafen og eksporten bruger. Alle beløb i øre; `revenue` er uden moms.
 * buildPayload regner altid alt ud og skærer derefter ejer-felterne fra med
 * stripForViewer, så kostpris, fortjeneste, margin, medarbejdere og lagerværdi
 * aldrig forlader serveren til andre end ejeren.
 */

/* ------------------------------------------------------------------ */
/*  Typer                                                              */
/* ------------------------------------------------------------------ */

/** profit og marginPct kun for ejeren. */
export type Money = { revenue: number; revenueInclVat: number; profit?: number; marginPct?: number | null };

export type NowBlock = {
  updatedAt: string;
  today: Money & {
    count: number;
    deltaPct: number | null;
    hours: { label: string; revenue: number; future: boolean }[];
    streams: Record<Stream, number>;
  };
  rows: { key: "igaar" | "uge" | "maaned"; label: string; money: Money; deltaPct: number | null; compareLabel: string }[];
};

/** Afsnit, der kan svigte blødt i load.ts; står de i `unavailable`, er tallene tomme, ikke 0. */
export type StatSection =
  | "openRepairs"
  | "receipts"
  | "offers"
  | "abandoned"
  | "funnel"
  | "devices"
  | "accessoryStock"
  | "partialRefunds";

export type StatPayload = {
  viewer: { isOwner: boolean; canExport: boolean; scope: StoreScope };
  range: Pick<StatRange, "preset" | "from" | "to" | "rangeLabel" | "compareLabel" | "unit">;
  minDate: string;
  /** Butiksvalg, viewer må bruge. */
  stores: { slug: ScopeSlug | "alle"; label: string }[];
  now: NowBlock;
  total: Money & { deltaPct: number | null; profitDeltaPct?: number | null };
  series: { key: string; label: string; webshop: Money; kasse: Money; reparation: Money; prevRevenue: number | null; prevProfit?: number | null }[];
  byStore: { slug: ScopeSlug; label: string; money: Money }[];
  payments: { type: string; label: string; amount: number }[];
  categories?: { category: Category; label: string; money: Required<Money> }[];
  missingCost?: number;
  staff?: { name: string; store: string | null; sales: number; repairs: number; money: Required<Money> }[];
  top: { name: string; category: Category; units: number; money: Money }[];
  repairs: { paidCases: number; money: Money; openNow: number; byType: { label: string; sharePct: number }[]; prepaidWithoutAmount: number };
  buyback: { paidOut: number; offset: number; receipts: number; offersSent: number; acceptedPct: number | null; byStore: { label: string; amount: number }[]; dataFrom: string | null };
  webshop: { visits: number | null; addToCart: number | null; purchases: number; abandoned: number; avgOrder: number };
  stock: { units: number; costValue?: number; accessoryCostValue?: number; avgDays: number | null; over60: number; soldOutModels: number; oneLeftModels: number };
  /** Øre refunderet delvist i perioden. */
  notes: { partialRefunds: number };
  /** Afsnit, der ikke kunne hentes; vises som "Kunne ikke hentes lige nu". Ingen ejer-data. */
  unavailable: StatSection[];
};

export type TicketRow = { id: string; assigned_to: string | null; service_type: string | null; services: { name?: string | null }[] | null };
export type StaffRow = { id: string; name: string; is_active: boolean; location_id: string | null };
export type PaymentRow = { order_id: string; type: string; amount_oere: number };
export type ReceiptRow = { total_amount: number; offset_amount: number | null; location_id: string | null };
export type OfferRow = { status: string };
export type DeviceRow = { purchase_price: number | null; purchased_at: string | null; template_id: string | null; status: string };
export type AccessoryStockRow = { quantity: number; cost_price: number | null };

/** Det, buildNowBlock skal bruge: ordrer, der dækker alle fire perioder og deres sammenligning. */
export type NowInput = {
  now: Date;
  orders: OverviewOrder[];
  slugOf: LineCtx["slugOf"];
  originalStreamByOrderId: Map<string, Stream>;
};

/** De rå, allerede butiksafgrænsede rækker fra load.ts. */
export type BuildInput = {
  now: Date;
  range: StatRange;
  minDate: string;
  /** Butikker i lokationstabellen. */
  locationSlugs: ScopeSlug[];
  slugOf: LineCtx["slugOf"];
  orders: OverviewOrder[];
  /** Tom når range.prev er null. */
  prevOrders: OverviewOrder[];
  /** Ordrer for "Lige nu"-blokkens perioder (se NowInput). */
  nowOrders: OverviewOrder[];
  /** Type pr. oprindelig ordre-id for kreditnotaerne i alle tre ordresæt. */
  originalStreamByOrderId: Map<string, Stream>;
  /** Sagerne bag reparationslinjerne i perioden. */
  tickets: TicketRow[];
  staff: StaffRow[];
  payments: PaymentRow[];
  prepaidWithoutAmount: number;
  openRepairs: number;
  receipts: ReceiptRow[];
  offers: OfferRow[];
  funnel: { visits: number; addToCart: number } | null;
  abandoned: number;
  devices: DeviceRow[];
  publishedTemplateIds: string[];
  /** sku_stock-rækker med varens kostpris. */
  accessoryStock: AccessoryStockRow[];
  /** details.amount (øre) for hver delvis refundering i perioden. */
  partialRefunds: number[];
  /** Afsnit, hvis forespørgsel fejlede (deres felter ovenfor er tomme). */
  unavailable: StatSection[];
};

/* ------------------------------------------------------------------ */
/*  Konstanter                                                         */
/* ------------------------------------------------------------------ */

const CATEGORY_LABELS: Record<Category, string> = {
  enheder: "Enheder",
  tilbehoer: "Tilbehør",
  reparation: "Reparation",
  oevrigt: "Øvrigt",
};
const CATEGORY_ORDER: Category[] = ["enheder", "tilbehoer", "reparation", "oevrigt"];

const PAYMENT_LABELS: Record<string, string> = {
  kontant: "Kontant",
  kort_terminal: "Kort",
  mobilepay: "MobilePay",
  klarna: "Klarna",
  faktura: "Faktura",
  tilgodebevis: "Tilgodebevis",
  gavekort: "Gavekort",
  opkoeb: "Modregnet opkøb",
  online: "Online betaling",
};
/** orders.payment_method for webshop-betalinger. */
const ONLINE_METHODS = new Set(["stripe"]);

const POST_LABEL = "Indsendt med post";
/** Slutsedler findes fra denne dato (20261109120000_d2_opkoeb_schema.sql). */
export const RECEIPTS_FROM = "2026-11-09";
const TOP_LIMIT = 100;
const TICKET_KEY = "ticket:";
const STOCK_OLD_DAYS = 60;

/** Timesøjler i "Lige nu": butikkernes åbningstid; salg før/efter lægges i første/sidste søjle. */
const FIRST_HOUR = 9;
const LAST_HOUR = 19;

const hourFormatter = new Intl.DateTimeFormat("en-US", { timeZone: POS_TIME_ZONE, hourCycle: "h23", hour: "2-digit" });
const danishHour = (iso: string | Date) => Number(hourFormatter.format(new Date(iso)));

/* ------------------------------------------------------------------ */
/*  Hjælpere                                                           */
/* ------------------------------------------------------------------ */

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

function money(t: Totals): Required<Money> {
  return { revenue: t.revenue, revenueInclVat: t.revenueInclVat, profit: t.profit, marginPct: t.marginPct };
}

function publicMoney(m: Money): Money {
  return { revenue: m.revenue, revenueInclVat: m.revenueInclVat };
}

function inSpan(at: string | null | undefined, startIso: string, endIso: string): boolean {
  if (!at) return false;
  const t = Date.parse(at);
  return t >= Date.parse(startIso) && t < Date.parse(endIso);
}

const linesIn = (lines: StatLine[], startIso: string, endIso: string) => lines.filter((l) => inSpan(l.at, startIso, endIso));

function capitalise(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function storeOptions(viewer: StatViewer, locationSlugs: ScopeSlug[]): StatPayload["stores"] {
  if (viewer.isOwner) {
    const present = SCOPE_SLUGS.filter((s) => locationSlugs.includes(s));
    return [{ slug: "alle", label: SCOPE_LABELS.alle }, ...present.map((slug) => ({ slug, label: SCOPE_LABELS[slug] }))];
  }
  return isScopeSlug(viewer.scope) ? [{ slug: viewer.scope, label: SCOPE_LABELS[viewer.scope] }] : [];
}

/**
 * Forrige periodes intervaller, så interval i svarer til interval i i perioden:
 * timer forskydes med periodernes afstand, dage/uger/måneder med samme antal
 * kalenderdage. Afskæres ved prev.endIso (samme tid i forrige periode).
 *
 * Måneder: måneds-inddeling bruges kun til I år (ingen forrige periode) og frie
 * intervaller over 366 dage. Deres forrige periode er "lige så mange dage før"
 * og starter sjældent den 1., så den kan ikke deles i kalendermåneder med samme
 * nummer. Interval i sammenlignes derfor med det stykke af forrige periode, der
 * ligger på samme plads og har samme antal dage. Intervallerne dækker forrige
 * periode præcis, uden huller eller overlap, så summen af prevRevenue er hele
 * forrige periodes omsætning.
 */
export function prevBuckets(range: StatRange): StatBucket[] | null {
  if (!range.prev) return null;
  const prevEnd = Date.parse(range.prev.endIso);
  const clip = (ms: number) => new Date(Math.min(ms, prevEnd)).toISOString();

  if (range.unit === "time") {
    const shift = Date.parse(range.startIso) - Date.parse(range.prev.startIso);
    return range.buckets.map((b) => ({
      ...b,
      startIso: clip(Date.parse(b.startIso) - shift),
      endIso: clip(Date.parse(b.endIso) - shift),
    }));
  }

  const prevFrom = copenhagenDateString(range.prev.startIso);
  const days = Math.round((Date.parse(`${range.from}T00:00:00Z`) - Date.parse(`${prevFrom}T00:00:00Z`)) / 86_400_000);
  const shift = (iso: string) => Date.parse(copenhagenDayBounds(addDays(copenhagenDateString(iso), -days)).startIso);
  return range.buckets.map((b) => ({ ...b, startIso: clip(shift(b.startIso)), endIso: clip(shift(b.endIso)) }));
}

/* ------------------------------------------------------------------ */
/*  Lige nu                                                            */
/* ------------------------------------------------------------------ */

const NOW_ROWS: { key: "igaar" | "uge" | "maaned"; label: string }[] = [
  { key: "igaar", label: "I går" },
  { key: "uge", label: "Denne uge" },
  { key: "maaned", label: "Denne måned" },
];

function hourIndex(hour: number): number {
  return Math.min(Math.max(hour, FIRST_HOUR), LAST_HOUR) - FIRST_HOUR;
}

function fullNowBlock(input: NowInput): NowBlock {
  const ranges = nowBlockRanges(input.now);
  const ctx: LineCtx = {
    slugOf: input.slugOf,
    technicianByTicket: new Map(),
    staff: [],
    originalStreamByOrderId: input.originalStreamByOrderId,
  };
  const lines = toStatLines(input.orders, ctx);
  const prevTotals = (r: StatRange) => (r.prev ? sumLines(linesIn(lines, r.prev.startIso, r.prev.endIso)) : null);

  const idag = ranges.idag;
  const todayLines = linesIn(lines, idag.startIso, idag.endIso);
  const today = sumLines(todayLines);
  const todayPrev = prevTotals(idag);

  const hourTotals = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, () => 0);
  for (const l of todayLines) hourTotals[hourIndex(danishHour(l.at))] += l.revenue;
  const current = hourIndex(danishHour(input.now));

  const streams: Record<Stream, number> = { webshop: 0, kasse: 0, reparation: 0 };
  for (const l of todayLines) streams[l.stream] += l.revenue;

  const todayOrders = input.orders.filter((o) => inSpan(o.confirmed_at, idag.startIso, idag.endIso));

  return {
    updatedAt: input.now.toISOString(),
    today: {
      ...money(today),
      count: countOrders(todayOrders).sales,
      deltaPct: todayPrev ? pctDelta(today.revenue, todayPrev.revenue) : null,
      hours: hourTotals.map((revenue, i) => ({ label: String(FIRST_HOUR + i), revenue, future: i > current })),
      streams,
    },
    rows: NOW_ROWS.map(({ key, label }) => {
      const r = ranges[key];
      const t = sumLines(linesIn(lines, r.startIso, r.endIso));
      const prev = prevTotals(r);
      return { key, label, money: money(t), deltaPct: prev ? pctDelta(t.revenue, prev.revenue) : null, compareLabel: r.compareLabel };
    }),
  };
}

function stripNowBlock(n: NowBlock): NowBlock {
  const { today } = n;
  return {
    updatedAt: n.updatedAt,
    today: {
      ...publicMoney(today),
      count: today.count,
      deltaPct: today.deltaPct,
      hours: today.hours,
      streams: today.streams,
    },
    rows: n.rows.map((r) => ({ ...r, money: publicMoney(r.money) })),
  };
}

/** "Lige nu"-blokken for viewer; ejer-felterne er skåret fra for andre. */
export function buildNowBlock(input: NowInput, viewer: StatViewer): NowBlock {
  const full = fullNowBlock(input);
  return viewer.isOwner ? full : stripNowBlock(full);
}

/* ------------------------------------------------------------------ */
/*  Periode                                                            */
/* ------------------------------------------------------------------ */

function buildPayments(orders: OverviewOrder[], payments: PaymentRow[]): StatPayload["payments"] {
  const amounts = new Map<string, number>();
  const add = (type: string, amount: number) => amounts.set(type, (amounts.get(type) ?? 0) + amount);
  const paid = new Set(payments.map((p) => p.order_id));
  for (const p of payments) add(p.type, p.amount_oere);
  for (const o of orders) {
    if (o.id && paid.has(o.id)) continue;
    const method = o.type === "repair_prepaid" || ONLINE_METHODS.has(o.payment_method ?? "") ? "online" : o.payment_method || "ukendt";
    add(method, o.total ?? 0);
  }
  return [...amounts]
    .filter(([, amount]) => amount !== 0)
    .map(([type, amount]) => ({ type, label: PAYMENT_LABELS[type] ?? capitalise(type), amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Sagens reparationstype: første ydelse, ellers service_type. */
function repairLabel(t: TicketRow | undefined): string | null {
  return t?.services?.[0]?.name?.trim() || t?.service_type?.trim() || null;
}

function buildRepairs(lines: StatLine[], input: BuildInput): StatPayload["repairs"] {
  const paid = new Set(
    lines.filter((l) => !l.isCredit && l.productKey.startsWith(TICKET_KEY)).map((l) => l.productKey.slice(TICKET_KEY.length)),
  );
  const ticketById = new Map(input.tickets.map((t) => [t.id, t]));
  const byLabel = new Map<string, number>();
  for (const id of paid) {
    const label = repairLabel(ticketById.get(id)) ?? "Andet";
    byLabel.set(label, (byLabel.get(label) ?? 0) + 1);
  }
  const byType = [...byLabel]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "da"))
    .slice(0, 3)
    .map(([label, n]) => ({ label, sharePct: Math.round((n / paid.size) * 100) }));

  return {
    paidCases: paid.size,
    money: money(sumLines(lines.filter((l) => l.stream === "reparation"))),
    openNow: input.openRepairs,
    byType,
    prepaidWithoutAmount: input.prepaidWithoutAmount,
  };
}

function buildBuyback(input: BuildInput): StatPayload["buyback"] {
  const byStore = new Map<string, number>();
  let paidOut = 0;
  let offset = 0;
  for (const r of input.receipts) {
    const off = r.offset_amount ?? 0;
    const out = r.total_amount - off;
    paidOut += out;
    offset += off;
    const slug = input.slugOf(r.location_id);
    const label = slug && slug !== "webshop" ? SCOPE_LABELS[slug] : POST_LABEL;
    byStore.set(label, (byStore.get(label) ?? 0) + out);
  }
  const accepted = input.offers.filter((o) => o.status === "accepted").length;
  return {
    paidOut,
    offset,
    receipts: input.receipts.length,
    offersSent: input.offers.length,
    acceptedPct: input.offers.length > 0 ? round1((accepted / input.offers.length) * 100) : null,
    byStore: [...byStore].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount),
    dataFrom: input.range.from < RECEIPTS_FROM ? RECEIPTS_FROM : null,
  };
}

function buildStock(input: BuildInput): StatPayload["stock"] {
  const days = input.devices.filter((d) => d.purchased_at).map((d) => calendarDaysSince(d.purchased_at!, input.now));
  const listed = new Map<string, number>();
  for (const d of input.devices) {
    if (d.status === "listed" && d.template_id) listed.set(d.template_id, (listed.get(d.template_id) ?? 0) + 1);
  }
  const counts = input.publishedTemplateIds.map((id) => listed.get(id) ?? 0);
  return {
    units: input.devices.length,
    costValue: sum(input.devices.map((d) => d.purchase_price ?? 0)),
    accessoryCostValue: sum(input.accessoryStock.map((r) => r.quantity * (r.cost_price ?? 0))),
    avgDays: days.length > 0 ? Math.round(sum(days) / days.length) : null,
    over60: days.filter((d) => d > STOCK_OLD_DAYS).length,
    soldOutModels: counts.filter((n) => n === 0).length,
    oneLeftModels: counts.filter((n) => n === 1).length,
  };
}

/** Den fulde payload med alle ejer-felter. */
function fullPayload(input: BuildInput, viewer: StatViewer): StatPayload {
  const { range } = input;
  const staffLookup = input.staff.map((s) => ({ id: s.id, name: s.name, active: s.is_active }));
  const ctx: LineCtx = {
    slugOf: input.slugOf,
    technicianByTicket: new Map(input.tickets.map((t) => [t.id, t.assigned_to])),
    staff: staffLookup,
    originalStreamByOrderId: input.originalStreamByOrderId,
  };
  const lines = toStatLines(input.orders, ctx);
  const prevLines = range.prev ? toStatLines(input.prevOrders, ctx) : [];

  const total = sumLines(lines);
  const prevTotal = range.prev ? sumLines(prevLines) : null;

  const series = seriesByBucket(lines, range.buckets);
  const prevB = prevBuckets(range);
  const prevSeries = prevB ? seriesByBucket(prevLines, prevB) : null;

  const storeTotals = groupLines(lines, (l) => l.store);
  const categoryTotals = groupLines(lines, (l) => l.category);

  const storeOfStaff = new Map<string, string>();
  for (const s of input.staff) {
    const slug = input.slugOf(s.location_id);
    if (slug) storeOfStaff.set(s.id, SCOPE_LABELS[slug]);
  }

  const online = input.orders.filter((o) => o.type === "online");
  const ticketById = new Map(input.tickets.map((t) => [t.id, t]));

  return {
    viewer: { isOwner: viewer.isOwner, canExport: viewer.canExport, scope: viewer.scope },
    range: {
      preset: range.preset,
      from: range.from,
      to: range.to,
      rangeLabel: range.rangeLabel,
      compareLabel: range.compareLabel,
      unit: range.unit,
    },
    minDate: input.minDate,
    stores: storeOptions(viewer, input.locationSlugs),
    now: fullNowBlock({
      now: input.now,
      orders: input.nowOrders,
      slugOf: input.slugOf,
      originalStreamByOrderId: input.originalStreamByOrderId,
    }),
    total: {
      ...money(total),
      deltaPct: prevTotal ? pctDelta(total.revenue, prevTotal.revenue) : null,
      profitDeltaPct: prevTotal ? pctDelta(total.profit, prevTotal.profit) : null,
    },
    series: series.map((b, i) => ({
      key: b.key,
      label: b.label,
      webshop: money(b.webshop),
      kasse: money(b.kasse),
      reparation: money(b.reparation),
      prevRevenue: prevSeries ? prevSeries[i].total.revenue : null,
      prevProfit: prevSeries ? prevSeries[i].total.profit : null,
    })),
    byStore: SCOPE_SLUGS.filter((s) => storeTotals[s]).map((slug) => ({
      slug,
      label: SCOPE_LABELS[slug],
      money: money(storeTotals[slug]),
    })),
    payments: buildPayments(input.orders, input.payments),
    categories: CATEGORY_ORDER.filter((c) => categoryTotals[c]).map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      money: money(categoryTotals[category]),
    })),
    missingCost: total.missingCost,
    staff: staffTable(lines, staffLookup, storeOfStaff).map((r) => ({
      name: r.name,
      store: r.store,
      sales: r.sales,
      repairs: r.repairs,
      money: money(r.totals),
    })),
    top: topProducts(lines, TOP_LIMIT).map((p) => ({
      // Forudbetalte sager har ingen ordrelinje og dermed intet navn.
      name:
        p.name ||
        (p.productKey.startsWith(TICKET_KEY) ? repairLabel(ticketById.get(p.productKey.slice(TICKET_KEY.length))) : null) ||
        CATEGORY_LABELS[p.category],
      category: p.category,
      units: p.units,
      money: money(p.totals),
    })),
    repairs: buildRepairs(lines, input),
    buyback: buildBuyback(input),
    webshop: {
      visits: input.funnel?.visits ?? null,
      addToCart: input.funnel?.addToCart ?? null,
      purchases: online.length,
      abandoned: input.abandoned,
      avgOrder: online.length > 0 ? Math.round(computeKpis(online).revenue / online.length) : 0,
    },
    stock: buildStock(input),
    notes: { partialRefunds: sum(input.partialRefunds) },
    unavailable: [...input.unavailable],
  };
}

/* ------------------------------------------------------------------ */
/*  Indgange                                                           */
/* ------------------------------------------------------------------ */

/**
 * Fjerner alle ejer-felter (kostpris, fortjeneste, margin, medarbejdere,
 * lagerværdi) for andre end ejeren, og sætter viewer og butiksvalg efter
 * viewer. Ejerens payload returneres uændret. Idempotent.
 */
export function stripForViewer(p: StatPayload, viewer: StatViewer): StatPayload {
  if (viewer.isOwner) return p;
  const strippedStock: StatPayload["stock"] = {
    units: p.stock.units,
    avgDays: p.stock.avgDays,
    over60: p.stock.over60,
    soldOutModels: p.stock.soldOutModels,
    oneLeftModels: p.stock.oneLeftModels,
  };
  return {
    viewer: { isOwner: false, canExport: viewer.canExport, scope: viewer.scope },
    range: p.range,
    minDate: p.minDate,
    stores: storeOptions(viewer, []),
    now: stripNowBlock(p.now),
    total: { ...publicMoney(p.total), deltaPct: p.total.deltaPct },
    series: p.series.map((s) => ({
      key: s.key,
      label: s.label,
      webshop: publicMoney(s.webshop),
      kasse: publicMoney(s.kasse),
      reparation: publicMoney(s.reparation),
      prevRevenue: s.prevRevenue,
    })),
    byStore: p.byStore.map((s) => ({ ...s, money: publicMoney(s.money) })),
    payments: p.payments,
    top: p.top.map((t) => ({ ...t, money: publicMoney(t.money) })),
    repairs: { ...p.repairs, money: publicMoney(p.repairs.money) },
    buyback: p.buyback,
    webshop: p.webshop,
    stock: strippedStock,
    notes: p.notes,
    unavailable: p.unavailable,
  };
}

export function buildPayload(input: BuildInput, viewer: StatViewer): StatPayload {
  return stripForViewer(fullPayload(input, viewer), viewer);
}
