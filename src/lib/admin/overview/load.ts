import { createServerClient } from "@/lib/supabase/client";
import { fetchInChunks } from "@/lib/supabase/in-chunks";
import {
  applyLocationScope,
  applyStoreScope,
  loadLocationIndex,
} from "@/lib/auth/store-scope-server";
import {
  SCOPE_LABELS,
  slugForLocationId,
  type LocationIndex,
  type ScopeSlug,
  type StoreScope,
} from "@/lib/auth/store-scope";
import { finalDifference } from "@/lib/pos/cash-session";
import { computeKpis, groupByStore, pctChange, type Kpis, type OverviewOrder } from "./kpi";
import { calendarDaysSince, formatClock, formatTimeWindow, ticketLabel } from "./format";
import { periodRange, type PeriodKey, type PeriodRange } from "./period";

/**
 * Data til Overblik (én butik) og Alle butikker (ejeren). Hver forespørgsel
 * afgrænses på serveren efter `scope`; en medarbejder kan aldrig få en anden
 * butiks tal, uanset hvad der står i URL eller cookie.
 */

type Supabase = ReturnType<typeof createServerClient>;

/** Ordrer der tæller som salg: gennemført POS/webshop og kreditnotaer. */
const SALE_STATUSES = ["confirmed", "shipped", "picked_up", "delivered"];
const ORDER_COLS =
  "id, type, total, vat_total, brugtmoms_total, location_id, order_items ( item_type, quantity, total_price, discount_amount, purchase_price, vat_amount, vat_scheme )";
/** Sager der ikke længere er åbne. */
export const CLOSED_REPAIR_STATUSES = ["afhentet", "reklamation_loest"];

export const READY_ATTENTION_DAYS = 5;
export const READY_HIGHLIGHT_DAYS = 2;
export const TRANSIT_ATTENTION_DAYS = 2;
const PAGE = 1000;
const MAX_PAGES = 40;

/* ------------------------------------------------------------------ */
/*  Typer                                                              */
/* ------------------------------------------------------------------ */

export type OverviewCtx = { scope: StoreScope; isOwner: boolean };

export type CashState = "open" | "closed" | "none";
export type CashInfo = { state: CashState; detail: string };

export type ReadyCase = { id: string; label: string; title: string; days: number; overdue: boolean };
export type ArrivalLine = { id: string; time: string | null; title: string };
export type TransferLine = { id: string; text: string; action: "Modtag" | "Send" | null };

export type StoreOverview = {
  kind: "store";
  scope: StoreScope;
  period: PeriodKey;
  range: PeriodRange;
  kpis: Kpis;
  /** Procent mod forrige periode; null uden sammenligningsgrundlag. */
  revenueDeltaPct: number | null;
  cash: CashInfo;
  ready: { items: ReadyCase[]; total: number };
  arriving: ArrivalLine[];
  transfers: TransferLine[];
};

export type StoreRow = {
  slug: ScopeSlug | "total";
  label: string;
  revenue: number;
  profit: number;
  salesCount: number;
  openCases: number;
  cash: "Åben" | "Lukket" | "–" | "";
};

export type SessionLine = {
  key: string;
  store: string;
  register: string;
  date: string;
  registerId: string;
  locked: boolean;
  difference: number;
};

export type AttentionLine = { key: string; text: string; href: string };

export type AllOverview = {
  kind: "alle";
  period: PeriodKey;
  range: PeriodRange;
  stores: StoreRow[];
  total: StoreRow;
  sessions: SessionLine[];
  vat: { vatStandard: number; brugtmoms: number; deposits: number };
  attention: AttentionLine[];
};

export type OverviewPayload = StoreOverview | AllOverview;

/* ------------------------------------------------------------------ */
/*  Hjælpere                                                           */
/* ------------------------------------------------------------------ */

type Result<T> = { data: T[] | null; error: { message: string } | null };

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<Result<T>>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(i * PAGE, i * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function loadOrders(
  supabase: Supabase,
  scope: StoreScope,
  index: LocationIndex,
  startIso: string,
  endIso: string,
): Promise<OverviewOrder[]> {
  return fetchAll<OverviewOrder>((from, to) => {
    const q = supabase
      .from("orders")
      .select(ORDER_COLS)
      .in("type", ["pos", "online", "credit_note"])
      .in("status", SALE_STATUSES)
      .gte("confirmed_at", startIso)
      .lt("confirmed_at", endIso);
    return applyLocationScope(q, scope, index).order("confirmed_at", { ascending: true }).range(from, to);
  });
}

type RegisterRow = { id: string; name: string; location_id: string };
type SessionRow = {
  id: string;
  register_id: string;
  opened_at: string;
  opened_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
  difference: number | null;
  locked: boolean;
};

type CashData = {
  registers: RegisterRow[];
  open: Map<string, SessionRow>;
  lastClosed: Map<string, SessionRow>;
  staffNames: Map<string, string>;
  adjustments: Map<string, number[]>;
};

async function loadCash(supabase: Supabase, scope: StoreScope, index: LocationIndex, withAdjustments: boolean): Promise<CashData> {
  const empty: CashData = { registers: [], open: new Map(), lastClosed: new Map(), staffNames: new Map(), adjustments: new Map() };
  if (scope === "ingen") return empty;

  const regQuery = supabase.from("registers").select("id, name, location_id").eq("active", true);
  const { data: regs } = await applyLocationScope(regQuery, scope, index).order("name");
  const registers = ((regs ?? []) as RegisterRow[]).filter((r) => slugForLocationId(index, r.location_id) !== "webshop");
  if (registers.length === 0) return empty;
  const ids = registers.map((r) => r.id);
  const cols = "id, register_id, opened_at, opened_by, closed_at, closed_by, difference, locked";

  const [{ data: openRows }, { data: closedRows }] = await Promise.all([
    supabase.from("cash_sessions").select(cols).in("register_id", ids).is("closed_at", null),
    supabase
      .from("cash_sessions")
      .select(cols)
      .in("register_id", ids)
      .not("closed_at", "is", null)
      .order("closed_at", { ascending: false })
      .limit(Math.max(20, ids.length * 5)),
  ]);

  const open = new Map<string, SessionRow>();
  for (const s of (openRows ?? []) as SessionRow[]) open.set(s.register_id, s);
  const lastClosed = new Map<string, SessionRow>();
  for (const s of (closedRows ?? []) as SessionRow[]) if (!lastClosed.has(s.register_id)) lastClosed.set(s.register_id, s);

  const staffIds = new Set<string>();
  for (const s of [...open.values(), ...lastClosed.values()]) {
    if (s.opened_by) staffIds.add(s.opened_by);
    if (s.closed_by) staffIds.add(s.closed_by);
  }
  const staffNames = new Map<string, string>();
  if (staffIds.size > 0) {
    const { data } = await supabase.from("staff").select("id, name").in("id", [...staffIds]);
    for (const s of (data ?? []) as { id: string; name: string | null }[]) if (s.name) staffNames.set(s.id, s.name);
  }

  const adjustments = new Map<string, number[]>();
  if (withAdjustments && lastClosed.size > 0) {
    const sessionIds = [...lastClosed.values()].map((s) => s.id);
    const { data } = await fetchInChunks<{ session_id: string; amount_oere: number }>(sessionIds, (chunk) =>
      supabase.from("cash_session_adjustments").select("session_id, amount_oere").in("session_id", chunk),
    );
    for (const a of data) {
      const list = adjustments.get(a.session_id) ?? [];
      list.push(a.amount_oere);
      adjustments.set(a.session_id, list);
    }
  }
  return { registers, open, lastClosed, staffNames, adjustments };
}

/** Kassens status for én butik ("Kasse 1 · åbnet 10.02 af Mikkel"). */
export function describeCash(cash: CashData, registerIds: string[]): CashInfo {
  const regs = cash.registers.filter((r) => registerIds.includes(r.id));
  if (regs.length === 0) return { state: "none", detail: "Ingen kasse" };
  const openRegs = regs.filter((r) => cash.open.has(r.id));
  if (openRegs.length > 0) {
    const r = openRegs[0];
    const s = cash.open.get(r.id)!;
    const who = s.opened_by ? cash.staffNames.get(s.opened_by) : null;
    const extra = openRegs.length > 1 ? ` (+${openRegs.length - 1})` : "";
    return { state: "open", detail: `${r.name} · åbnet ${formatClock(s.opened_at)}${who ? ` af ${who}` : ""}${extra}` };
  }
  const closed = regs
    .map((r) => ({ r, s: cash.lastClosed.get(r.id) }))
    .filter((x): x is { r: RegisterRow; s: SessionRow } => Boolean(x.s))
    .sort((a, b) => (b.s.closed_at ?? "").localeCompare(a.s.closed_at ?? ""))[0];
  if (!closed) return { state: "closed", detail: "Ingen åben kasse" };
  const who = closed.s.closed_by ? cash.staffNames.get(closed.s.closed_by) : null;
  return {
    state: "closed",
    detail: `${closed.r.name} · lukket ${formatClock(closed.s.closed_at!)}${who ? ` af ${who}` : ""}`,
  };
}

/* ---- sager ---- */

type TicketRow = {
  id: string;
  ticket_number: string | null;
  device_model: string | null;
  service_type: string | null;
  services: { name: string }[] | null;
  updated_at: string;
  store_id: string | null;
  booking_details?: { preferred_time?: string | null } | null;
};

function ticketTitle(t: TicketRow): string {
  const task = t.services?.length ? t.services.map((s) => s.name).join(", ") : t.service_type;
  return [t.device_model, task].filter(Boolean).join(" · ") || "Sag";
}

type ReadyRaw = { ticket: TicketRow; readyAt: string };

async function loadReadyTickets(supabase: Supabase, scope: StoreScope): Promise<ReadyRaw[]> {
  if (scope === "ingen") return [];
  const q = supabase
    .from("repair_tickets")
    .select("id, ticket_number, device_model, service_type, services, updated_at, store_id")
    .eq("status", "faerdig");
  const { data } = await applyStoreScope(q, scope).order("updated_at", { ascending: true }).limit(300);
  const tickets = (data ?? []) as TicketRow[];
  if (tickets.length === 0) return [];

  // Hvornår blev sagen klar? Seneste "faerdig" i statusloggen; ellers sidste ændring.
  const { data: logs } = await fetchInChunks<{ ticket_id: string; created_at: string }>(
    tickets.map((t) => t.id),
    (chunk) =>
      supabase
        .from("repair_status_log")
        .select("ticket_id, created_at")
        .eq("new_status", "faerdig")
        .in("ticket_id", chunk)
        .order("created_at", { ascending: false }),
  );
  const readyAt = new Map<string, string>();
  for (const l of logs) if (!readyAt.has(l.ticket_id)) readyAt.set(l.ticket_id, l.created_at);
  return tickets
    .map((t) => ({ ticket: t, readyAt: readyAt.get(t.id) ?? t.updated_at }))
    .sort((a, b) => a.readyAt.localeCompare(b.readyAt));
}

async function loadArrivals(supabase: Supabase, scope: StoreScope, today: string): Promise<ArrivalLine[]> {
  if (scope === "ingen") return [];
  const q = supabase
    .from("repair_tickets")
    .select("id, ticket_number, device_model, service_type, services, updated_at, store_id, booking_details")
    .eq("status", "modtaget")
    .eq("booking_details->>preferred_date", today);
  const { data } = await applyStoreScope(q, scope).limit(50);
  return ((data ?? []) as TicketRow[])
    .map((t) => ({
      id: t.id,
      time: formatTimeWindow(t.booking_details?.preferred_time),
      title: ticketTitle(t),
      sort: t.booking_details?.preferred_time ?? "99",
    }))
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .map(({ id, time, title }) => ({ id, time, title }));
}

async function countOpenCases(supabase: Supabase, scope: StoreScope): Promise<Record<string, number>> {
  const counts: Record<string, number> = { vejle: 0, slagelse: 0, webshop: 0 };
  if (scope === "ingen") return counts;
  const rows = await fetchAll<{ store_id: string | null }>((from, to) => {
    const q = supabase
      .from("repair_tickets")
      .select("store_id")
      .not("status", "in", `(${CLOSED_REPAIR_STATUSES.join(",")})`);
    return applyStoreScope(q, scope).range(from, to);
  });
  for (const r of rows) {
    const key = r.store_id === "vejle" || r.store_id === "slagelse" ? r.store_id : "webshop";
    counts[key] += 1;
  }
  return counts;
}

/* ---- overførsler ---- */

export type TransferRow = {
  id: string;
  status: "requested" | "sent";
  from: ScopeSlug | null;
  to: ScopeSlug | null;
  title: string;
  since: string;
};

/**
 * Åbne lageroverførsler mellem butikker (stock_transfers, status requested/sent,
 * med linjer i stock_transfer_lines). Findes tabellerne ikke endnu (migration
 * 20261004400000 ikke kørt), er listen blot tom. Enhedsoverførsler
 * (device_transfers) sker øjeblikkeligt og har ingen "på vej".
 */
async function loadTransfers(supabase: Supabase, scope: StoreScope, index: LocationIndex): Promise<TransferRow[]> {
  if (scope === "ingen") return [];
  try {
    const { data, error } = await supabase
      .from("stock_transfers")
      .select(
        "id, status, from_location_id, to_location_id, requested_at, sent_at, stock_transfer_lines ( description, qty )",
      )
      .in("status", ["requested", "sent"])
      .order("requested_at", { ascending: true })
      .limit(200);
    if (error || !data) return [];
    type Raw = {
      id: string;
      status: string;
      from_location_id: string | null;
      to_location_id: string | null;
      requested_at: string | null;
      sent_at: string | null;
      stock_transfer_lines?: { description: string | null; qty: number | null }[] | null;
    };
    const rows = (data as Raw[]).map<TransferRow>((r) => ({
      id: String(r.id),
      status: r.status === "sent" ? "sent" : "requested",
      from: slugForLocationId(index, r.from_location_id),
      to: slugForLocationId(index, r.to_location_id),
      title: transferTitle(r.stock_transfer_lines ?? []),
      since: (r.status === "sent" ? r.sent_at : null) ?? r.requested_at ?? new Date().toISOString(),
    }));
    return scope === "alle" ? rows : rows.filter((r) => r.from === scope || r.to === scope);
  } catch {
    return [];
  }
}

/** "2× USB-C kabel 1 m" eller "iPhone 14 Pro 128 GB, 2× USB-C kabel 1 m (+1)". */
export function transferTitle(lines: { description: string | null; qty: number | null }[]): string {
  const named = lines.filter((l) => l.description);
  if (named.length === 0) return "Overførsel";
  const text = (l: { description: string | null; qty: number | null }) =>
    `${(l.qty ?? 1) > 1 ? `${l.qty}× ` : ""}${l.description}`;
  const shown = named.slice(0, 2).map(text).join(", ");
  return named.length > 2 ? `${shown} (+${named.length - 2})` : shown;
}

export function transferLines(rows: TransferRow[], scope: ScopeSlug): TransferLine[] {
  const label = (s: ScopeSlug | null) => (s ? SCOPE_LABELS[s] : "ukendt butik");
  return rows.map<TransferLine>((r) => {
    if (r.status === "sent") {
      return r.to === scope
        ? { id: r.id, text: `På vej fra ${label(r.from)} · ${r.title}`, action: "Modtag" }
        : { id: r.id, text: `På vej til ${label(r.to)} · ${r.title}`, action: null };
    }
    return r.from === scope
      ? { id: r.id, text: `${label(r.to)} beder om · ${r.title}`, action: "Send" }
      : { id: r.id, text: `Du har bedt ${label(r.from)} om · ${r.title}`, action: null };
  });
}

/* ------------------------------------------------------------------ */
/*  Én butik                                                           */
/* ------------------------------------------------------------------ */

function emptyStore(scope: StoreScope, period: PeriodKey, range: PeriodRange): StoreOverview {
  return {
    kind: "store",
    scope,
    period,
    range,
    kpis: computeKpis([]),
    revenueDeltaPct: null,
    cash: { state: "none", detail: "Ingen kasse" },
    ready: { items: [], total: 0 },
    arriving: [],
    transfers: [],
  };
}

async function loadStoreOverview(scope: ScopeSlug, period: PeriodKey, now: Date): Promise<StoreOverview> {
  const supabase = createServerClient();
  const index = await loadLocationIndex();
  const range = periodRange(period, now);

  const [orders, prevOrders, cash, ready, arriving, transfers] = await Promise.all([
    loadOrders(supabase, scope, index, range.startIso, range.endIso),
    loadOrders(supabase, scope, index, range.prevStartIso, range.prevEndIso),
    loadCash(supabase, scope, index, false),
    loadReadyTickets(supabase, scope),
    loadArrivals(supabase, scope, range.today),
    loadTransfers(supabase, scope, index),
  ]);

  const kpis = computeKpis(orders);
  const prev = computeKpis(prevOrders);
  const readyCases = ready.map<ReadyCase>(({ ticket, readyAt }) => {
    const days = calendarDaysSince(readyAt, now);
    return { id: ticket.id, label: ticketLabel(ticket.ticket_number), title: ticketTitle(ticket), days, overdue: days > READY_HIGHLIGHT_DAYS };
  });

  return {
    kind: "store",
    scope,
    period,
    range,
    kpis,
    revenueDeltaPct: pctChange(kpis.revenue, prev.revenue),
    cash: describeCash(cash, cash.registers.map((r) => r.id)),
    ready: { items: readyCases.slice(0, 5), total: readyCases.length },
    arriving,
    transfers: transferLines(transfers, scope),
  };
}

/* ------------------------------------------------------------------ */
/*  Alle butikker                                                      */
/* ------------------------------------------------------------------ */

const STORE_ORDER: ScopeSlug[] = ["vejle", "slagelse", "webshop"];

async function loadLowStock(supabase: Supabase, index: LocationIndex): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    const rows = await fetchAll<{ quantity: number; min_level: number | null; location_id: string }>((from, to) =>
      supabase
        .from("sku_stock")
        .select("quantity, min_level, location_id, product:sku_products!inner(is_active, always_in_stock)")
        .gt("min_level", 0)
        .eq("sku_products.is_active", true)
        .eq("sku_products.always_in_stock", false)
        .range(from, to),
    );
    for (const r of rows) {
      if (r.quantity >= (r.min_level ?? 0)) continue;
      const slug = slugForLocationId(index, r.location_id);
      if (slug) out[slug] = (out[slug] ?? 0) + 1;
    }
  } catch {
    /* lagertallet er en bonus; en fejl her må ikke vælte overblikket */
  }
  return out;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

async function loadAllOverview(period: PeriodKey, now: Date): Promise<AllOverview> {
  const supabase = createServerClient();
  const index = await loadLocationIndex();
  const range = periodRange(period, now);

  const [orders, cash, openCases, ready, transfers, lowStock] = await Promise.all([
    loadOrders(supabase, "alle", index, range.startIso, range.endIso),
    loadCash(supabase, "alle", index, true),
    countOpenCases(supabase, "alle"),
    loadReadyTickets(supabase, "alle"),
    loadTransfers(supabase, "alle", index),
    loadLowStock(supabase, index),
  ]);

  const grouped = groupByStore(orders, (id) => slugForLocationId(index, id));
  const total = computeKpis(orders);

  const stores = STORE_ORDER.map<StoreRow>((slug) => {
    const k = computeKpis(grouped[slug] ?? []);
    const regIds = cash.registers.filter((r) => slugForLocationId(index, r.location_id) === slug).map((r) => r.id);
    const cashState = regIds.length === 0 ? "–" : regIds.some((id) => cash.open.has(id)) ? "Åben" : "Lukket";
    return {
      slug,
      label: SCOPE_LABELS[slug],
      revenue: k.revenue,
      profit: k.profit,
      salesCount: k.salesCount,
      openCases: openCases[slug] ?? 0,
      cash: cashState,
    };
  });
  const totalRow: StoreRow = {
    slug: "total",
    label: "I alt",
    revenue: total.revenue,
    profit: total.profit,
    salesCount: total.salesCount,
    openCases: stores.reduce((s, r) => s + r.openCases, 0),
    cash: "",
  };

  const sessions = cash.registers
    .map<SessionLine | null>((r) => {
      const s = cash.lastClosed.get(r.id);
      if (!s?.closed_at) return null;
      const slug = slugForLocationId(index, r.location_id);
      return {
        key: s.id,
        store: slug ? SCOPE_LABELS[slug] : "Ukendt",
        register: r.name,
        date: s.closed_at,
        registerId: r.id,
        locked: s.locked,
        difference: finalDifference(s.difference ?? 0, cash.adjustments.get(s.id) ?? []),
      };
    })
    .filter((x): x is SessionLine => x !== null)
    .sort((a, b) => a.store.localeCompare(b.store, "da") || a.register.localeCompare(b.register, "da"));

  const attention: AttentionLine[] = [];
  const longReady = ready.filter((r) => calendarDaysSince(r.readyAt, now) > READY_ATTENTION_DAYS).length;
  if (longReady > 0) {
    attention.push({
      key: "ready",
      text: `${plural(longReady, "sag", "sager")} klar til afhentning i over ${READY_ATTENTION_DAYS} dage`,
      href: "/admin/reparationer",
    });
  }
  const stuck = transfers.filter(
    (t) => t.status === "sent" && now.getTime() - new Date(t.since).getTime() > TRANSIT_ATTENTION_DAYS * 86_400_000,
  ).length;
  if (stuck > 0) {
    attention.push({
      key: "transit",
      text: `${plural(stuck, "overførsel", "overførsler")} på vej i over ${TRANSIT_ATTENTION_DAYS} dage`,
      href: "/admin/varer/overforsler",
    });
  }
  for (const slug of STORE_ORDER) {
    const n = lowStock[slug] ?? 0;
    if (n > 0) {
      attention.push({
        key: `stock-${slug}`,
        text: `${plural(n, "vare", "varer")} under minimum i ${SCOPE_LABELS[slug]}`,
        href: "/admin/varer",
      });
    }
  }

  return {
    kind: "alle",
    period,
    range,
    stores,
    total: totalRow,
    sessions,
    vat: { vatStandard: total.vatStandard, brugtmoms: total.brugtmoms, deposits: total.deposits },
    attention,
  };
}

/* ------------------------------------------------------------------ */
/*  Indgang                                                            */
/* ------------------------------------------------------------------ */

/**
 * Den eneste vej ind: afgør, hvad den aktuelle bruger må se.
 *  - scope "ingen" (medarbejder uden butik): tom visning, ingen forespørgsler.
 *  - scope "alle" kræver ejer; ellers behandles det som "ingen" (fail closed).
 */
export async function loadOverview(ctx: OverviewCtx, period: PeriodKey, now: Date = new Date()): Promise<OverviewPayload> {
  const { scope } = ctx;
  if (scope === "alle") {
    if (!ctx.isOwner) return emptyStore("ingen", period, periodRange(period, now));
    return loadAllOverview(period, now);
  }
  if (scope === "ingen") return emptyStore("ingen", period, periodRange(period, now));
  return loadStoreOverview(scope, period, now);
}

