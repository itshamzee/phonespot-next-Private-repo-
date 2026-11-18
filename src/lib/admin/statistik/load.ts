import { createServerClient } from "@/lib/supabase/client";
import { fetchInChunks } from "@/lib/supabase/in-chunks";
import { applyLocationScope, applyStoreScope, loadLocationIndex } from "@/lib/auth/store-scope-server";
import { slugForLocationId, type LocationIndex, type ScopeSlug, type StoreScope } from "@/lib/auth/store-scope";
import { copenhagenDateString } from "@/lib/pos/copenhagen";
import type { OverviewOrder } from "@/lib/admin/overview/kpi";
import { storeSlugForOrder } from "@/lib/admin/overview/sale-rules";
import {
  CLOSED_REPAIR_STATUSES,
  SALE_STATUSES,
  fetchAll,
  loadOrders,
  loadOrdersWithMeta,
} from "@/lib/admin/overview/load";
import type { StatViewer } from "./access";
import { loadFunnel } from "./ga4";
import type { Stream } from "./lines";
import {
  buildNowBlock,
  buildPayload,
  type AccessoryStockRow,
  type BuildInput,
  type DeviceRow,
  type NowBlock,
  type OfferRow,
  type PaymentRow,
  type ReceiptRow,
  type StaffRow,
  type StatPayload,
  type TicketRow,
} from "./payload";
import { nowBlockRanges, type StatRange } from "./range";

/**
 * Indlæsning til Statistik. Tynd I/O: hver forespørgsel afgrænses på serveren
 * efter viewerens scope, lister hentes side for side (fetchAll) eller i bidder
 * (fetchInChunks), og al regning sker i payload.ts.
 *
 * Ordrer, betalinger, kreditnotaernes originaler, sager og medarbejdere kaster
 * ved fejl (tallene ville ellers være forkerte uden at det ses). Øvrige afsnit
 * (opkøb, tragt, forladte kurve, lager, delvise refunderinger, åbne sager) svigter
 * blødt: afsnittet bliver tomt, resten af siden indlæses.
 */

type Supabase = ReturnType<typeof createServerClient>;

const SALE_TYPES = ["pos", "online", "credit_note"];
const STOCK_STATUSES = ["intake", "graded", "listed", "reserved"];
const RECEIPT_STATUSES = ["paid", "completed"];
/** Bruges, hvis der ikke kan findes en første ordre. Data findes fra marts 2026. */
const FALLBACK_MIN_DATE = "2026-03-01";
const MIN_DATE_CACHE_MS = 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/*  Hjælpere                                                           */
/* ------------------------------------------------------------------ */

async function soft<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    console.error(`Statistik: ${label} kunne ikke hentes`, err);
    return fallback;
  }
}

function must<T>(res: { data: T[]; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Medarbejder med scope "alle" uden at være ejer behandles som "ingen" (fail closed). */
function effectiveScope(viewer: StatViewer): StoreScope {
  if (viewer.scope === "alle" && !viewer.isOwner) return "ingen";
  return viewer.scope;
}

function ticketIds(orders: OverviewOrder[]): string[] {
  const ids = new Set<string>();
  for (const o of orders) for (const it of o.order_items ?? []) if (it.repair_ticket_id) ids.add(it.repair_ticket_id);
  return [...ids];
}

/** Hele tidsrummet "Lige nu"-blokken og dens sammenligninger dækker. */
function nowBlockSpan(now: Date): { startIso: string; endIso: string } {
  const ranges = Object.values(nowBlockRanges(now));
  const starts = ranges.flatMap((r) => [r.startIso, ...(r.prev ? [r.prev.startIso] : [])]);
  const ends = ranges.flatMap((r) => [r.endIso, ...(r.prev ? [r.prev.endIso] : [])]);
  const iso = (ms: number) => new Date(ms).toISOString();
  return { startIso: iso(Math.min(...starts.map(Date.parse))), endIso: iso(Math.max(...ends.map(Date.parse))) };
}

/* ------------------------------------------------------------------ */
/*  Forespørgsler                                                      */
/* ------------------------------------------------------------------ */

/** Type pr. oprindelig ordre for kreditnotaerne (Webshop eller Kassesalg). */
async function loadOriginalStreams(supabase: Supabase, orders: OverviewOrder[]): Promise<Map<string, Stream>> {
  const ids = [...new Set(orders.filter((o) => o.type === "credit_note" && o.original_order_id).map((o) => o.original_order_id!))];
  const out = new Map<string, Stream>();
  if (ids.length === 0) return out;
  const rows = must(
    await fetchInChunks<{ id: string; type: string }>(ids, (chunk) => supabase.from("orders").select("id, type").in("id", chunk)),
  );
  for (const r of rows) out.set(r.id, r.type === "online" ? "webshop" : "kasse");
  return out;
}

async function loadTickets(supabase: Supabase, orders: OverviewOrder[]): Promise<TicketRow[]> {
  const ids = ticketIds(orders);
  if (ids.length === 0) return [];
  return must(
    await fetchInChunks<TicketRow>(ids, (chunk) =>
      supabase.from("repair_tickets").select("id, assigned_to, service_type, services").in("id", chunk),
    ),
  );
}

async function loadPayments(supabase: Supabase, orders: OverviewOrder[]): Promise<PaymentRow[]> {
  const ids = [...new Set(orders.map((o) => o.id).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return [];
  return must(
    await fetchInChunks<PaymentRow>(ids, (chunk) =>
      supabase.from("order_payments").select("order_id, type, amount_oere").in("order_id", chunk),
    ),
  );
}

async function loadStaff(supabase: Supabase): Promise<StaffRow[]> {
  return fetchAll<StaffRow>((from, to) =>
    supabase.from("staff").select("id, name, is_active, location_id").order("id").range(from, to),
  );
}

/** Åbne sager lige nu, afgrænset på repair_tickets.store_id som Overblik. */
async function countOpenRepairs(supabase: Supabase, scope: StoreScope): Promise<number> {
  const q = supabase
    .from("repair_tickets")
    .select("id", { count: "exact", head: true })
    .not("status", "in", `(${[...CLOSED_REPAIR_STATUSES, "annulleret"].join(",")})`);
  const { count, error } = await applyStoreScope(q, scope);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Betalte slutsedler i perioden. Uden lokation = indsendt med post (kun ejer og webshop). */
async function loadReceipts(supabase: Supabase, scope: StoreScope, index: LocationIndex, range: StatRange): Promise<ReceiptRow[]> {
  return fetchAll<ReceiptRow>((from, to) => {
    const q = supabase
      .from("trade_in_receipts")
      .select("total_amount, offset_amount, location_id")
      .in("status", RECEIPT_STATUSES)
      .gte("paid_at", range.startIso)
      .lt("paid_at", range.endIso);
    return applyLocationScope(q, scope, index).order("paid_at", { ascending: true }).range(from, to);
  });
}

/** Tilbud sendt i perioden. Tilbud har ingen butik; de hører til online-opkøbet (ejer og webshop). */
async function loadOffers(supabase: Supabase, scope: StoreScope, range: StatRange): Promise<OfferRow[]> {
  if (scope !== "alle" && scope !== "webshop") return [];
  return fetchAll<OfferRow>((from, to) =>
    supabase
      .from("trade_in_offers")
      .select("status")
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso)
      .order("created_at", { ascending: true })
      .range(from, to),
  );
}

async function countAbandoned(supabase: Supabase, scope: StoreScope, index: LocationIndex, range: StatRange): Promise<number> {
  const q = supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "abandoned")
    .gte("abandoned_at", range.startIso)
    .lt("abandoned_at", range.endIso);
  const { count, error } = await applyLocationScope(q, scope, index);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Egne enheder på lager (ikke dropship) og de offentliggjorte modeller. */
async function loadDevices(
  supabase: Supabase,
  scope: StoreScope,
  index: LocationIndex,
): Promise<{ devices: DeviceRow[]; publishedTemplateIds: string[] }> {
  const [devices, templates] = await Promise.all([
    fetchAll<DeviceRow>((from, to) => {
      const q = supabase
        .from("devices")
        .select("purchase_price, purchased_at, template_id, status")
        .in("status", STOCK_STATUSES)
        .neq("source", "foxway");
      return applyLocationScope(q, scope, index).order("id").range(from, to);
    }),
    fetchAll<{ id: string }>((from, to) =>
      supabase.from("product_templates").select("id").eq("status", "published").order("id").range(from, to),
    ),
  ]);
  return { devices, publishedTemplateIds: templates.map((t) => t.id) };
}

async function loadAccessoryStock(supabase: Supabase, scope: StoreScope, index: LocationIndex): Promise<AccessoryStockRow[]> {
  type Raw = { quantity: number; product: { cost_price: number | null } | { cost_price: number | null }[] | null };
  const rows = await fetchAll<Raw>((from, to) => {
    const q = supabase
      .from("sku_stock")
      .select("quantity, product:sku_products!inner(cost_price)")
      .gt("quantity", 0);
    return applyLocationScope(q, scope, index).order("product_id").order("location_id").range(from, to);
  });
  return rows.map((r) => {
    const product = Array.isArray(r.product) ? r.product[0] : r.product;
    return { quantity: r.quantity, cost_price: product?.cost_price ?? null };
  });
}

/** Delvise refunderinger (activity_log, details.amount i øre) på ordrer i scopet. */
async function loadPartialRefunds(
  supabase: Supabase,
  scope: StoreScope,
  index: LocationIndex,
  range: StatRange,
): Promise<number[]> {
  type Raw = { entity_id: string | null; details: { amount?: unknown } | null };
  const rows = await fetchAll<Raw>((from, to) =>
    supabase
      .from("activity_log")
      .select("entity_id, details")
      .eq("action", "partial_refund")
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso)
      .order("created_at", { ascending: true })
      .range(from, to),
  );
  let kept = rows;
  if (scope !== "alle") {
    const ids = [...new Set(rows.map((r) => r.entity_id).filter((id): id is string => Boolean(id)))];
    const orders =
      ids.length === 0
        ? []
        : must(
            await fetchInChunks<{ id: string; type: string; location_id: string | null; shipping_method: string | null }>(
              ids,
              (chunk) => supabase.from("orders").select("id, type, location_id, shipping_method").in("id", chunk),
            ),
          );
    const slugOf = (id: string | null | undefined) => slugForLocationId(index, id);
    const inScope = new Set(orders.filter((o) => storeSlugForOrder(o, slugOf) === scope).map((o) => o.id));
    kept = rows.filter((r) => r.entity_id && inScope.has(r.entity_id));
  }
  return kept.map((r) => Number(r.details?.amount)).filter((n) => Number.isFinite(n));
}

/* ------------------------------------------------------------------ */
/*  Indgange                                                           */
/* ------------------------------------------------------------------ */

let minDateCache: { at: number; date: string } | null = null;

/** Dansk dato for det første salg. Cachet i en time. */
export async function firstOrderDate(): Promise<string> {
  if (minDateCache && Date.now() - minDateCache.at < MIN_DATE_CACHE_MS) return minDateCache.date;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("confirmed_at")
    .in("type", SALE_TYPES)
    .in("status", SALE_STATUSES)
    .not("confirmed_at", "is", null)
    .order("confirmed_at", { ascending: true })
    .limit(1);
  const first = (data as { confirmed_at: string }[] | null)?.[0]?.confirmed_at;
  if (error || !first) return FALLBACK_MIN_DATE;
  const date = copenhagenDateString(first);
  minDateCache = { at: Date.now(), date };
  return date;
}

function emptyInput(range: StatRange, now: Date): BuildInput {
  return {
    now,
    range,
    minDate: range.from,
    locationSlugs: [],
    slugOf: () => null,
    orders: [],
    prevOrders: [],
    nowOrders: [],
    originalStreamByOrderId: new Map(),
    tickets: [],
    staff: [],
    payments: [],
    prepaidWithoutAmount: 0,
    openRepairs: 0,
    receipts: [],
    offers: [],
    funnel: null,
    abandoned: 0,
    devices: [],
    publishedTemplateIds: [],
    accessoryStock: [],
    partialRefunds: [],
  };
}

export async function loadStatistik(viewer: StatViewer, range: StatRange, now: Date = new Date()): Promise<StatPayload> {
  const scope = effectiveScope(viewer);
  const scoped: StatViewer = { ...viewer, scope };
  if (scope === "ingen") return buildPayload(emptyInput(range, now), scoped);

  const supabase = createServerClient();
  const index = await loadLocationIndex();
  const slugOf = (id: string | null | undefined) => slugForLocationId(index, id);
  const span = nowBlockSpan(now);
  const withFunnel = scope === "alle" || scope === "webshop";

  const [current, prevOrders, nowOrders, minDate, staff, openRepairs, receipts, offers, funnel, abandoned, stock, accessoryStock, partialRefunds] =
    await Promise.all([
      loadOrdersWithMeta(supabase, scope, index, range.startIso, range.endIso),
      range.prev ? loadOrders(supabase, scope, index, range.prev.startIso, range.prev.endIso) : Promise.resolve([]),
      loadOrders(supabase, scope, index, span.startIso, span.endIso),
      firstOrderDate(),
      loadStaff(supabase),
      soft("åbne sager", () => countOpenRepairs(supabase, scope), 0),
      soft("slutsedler", () => loadReceipts(supabase, scope, index, range), [] as ReceiptRow[]),
      soft("opkøbstilbud", () => loadOffers(supabase, scope, range), [] as OfferRow[]),
      withFunnel ? loadFunnel(range.from, range.to) : Promise.resolve(null),
      soft("forladte kurve", () => countAbandoned(supabase, scope, index, range), 0),
      soft("enhedslager", () => loadDevices(supabase, scope, index), { devices: [] as DeviceRow[], publishedTemplateIds: [] as string[] }),
      soft("tilbehørslager", () => loadAccessoryStock(supabase, scope, index), [] as AccessoryStockRow[]),
      soft("delvise refunderinger", () => loadPartialRefunds(supabase, scope, index, range), [] as number[]),
    ]);

  const orders = current.orders;
  const [originalStreamByOrderId, tickets, payments] = await Promise.all([
    loadOriginalStreams(supabase, [...orders, ...prevOrders, ...nowOrders]),
    loadTickets(supabase, orders),
    loadPayments(supabase, orders),
  ]);

  return buildPayload(
    {
      now,
      range,
      minDate,
      locationSlugs: Object.keys(index.idBySlug) as ScopeSlug[],
      slugOf,
      orders,
      prevOrders,
      nowOrders,
      originalStreamByOrderId,
      tickets,
      staff,
      payments,
      prepaidWithoutAmount: current.prepaidWithoutAmount,
      openRepairs,
      receipts,
      offers,
      funnel,
      abandoned,
      devices: stock.devices,
      publishedTemplateIds: stock.publishedTemplateIds,
      accessoryStock,
      partialRefunds,
    },
    scoped,
  );
}

/** Kun "Lige nu"-blokken, til den automatiske opdatering hvert minut. */
export async function loadNowBlock(viewer: StatViewer, now: Date = new Date()): Promise<NowBlock> {
  const scope = effectiveScope(viewer);
  const scoped: StatViewer = { ...viewer, scope };
  if (scope === "ingen") {
    return buildNowBlock({ now, orders: [], slugOf: () => null, originalStreamByOrderId: new Map() }, scoped);
  }
  const supabase = createServerClient();
  const index = await loadLocationIndex();
  const span = nowBlockSpan(now);
  const orders = await loadOrders(supabase, scope, index, span.startIso, span.endIso);
  const originalStreamByOrderId = await loadOriginalStreams(supabase, orders);
  return buildNowBlock(
    { now, orders, slugOf: (id) => slugForLocationId(index, id), originalStreamByOrderId },
    scoped,
  );
}
