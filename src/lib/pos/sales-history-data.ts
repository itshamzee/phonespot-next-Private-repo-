import { createAdminClient } from "@/lib/supabase/admin";
import { applyLocationScope } from "@/lib/auth/store-scope-server";
import type { LocationIndex, StoreScope } from "@/lib/auth/store-scope";
import { ticketLabel } from "@/lib/repairs/ticket-label";
import {
  SALES_PER_PAGE,
  itemName,
  itemsSummary,
  paymentLabel,
  paymentSummary,
  periodRange,
  refundState,
  sanitizeSearch,
  totalsFor,
  type ItemRow,
  type PaymentRow,
  type SaleListRow,
  type SalesFilters,
  type SalesTotals,
} from "./sales-history";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = ReturnType<typeof createAdminClient>;

const CHUNK = 150;
const MAX_ROWS = 5000;

function chunks<T>(arr: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Reads all pages of a query (PostgREST caps a single response at 1000 rows). */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += 1000) {
    const { data } = await build(from, from + 999);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

async function inChunks<T>(ids: string[], run: (part: string[]) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const parts = await Promise.all(chunks(ids).map((c) => run(c)));
  return parts.flatMap((p) => p.data ?? []);
}

/** Order ids matching a free-text search: bonnr., customer name/phone, case number. */
async function searchFilter(db: Db, rawQ: string): Promise<string | null> {
  const q = sanitizeSearch(rawQ);
  if (!q) return null;
  const like = `%${q}%`;
  const [customers, tickets] = await Promise.all([
    db.from("customers").select("id").or(`name.ilike.${like},phone.ilike.${like}`).limit(200),
    db.from("repair_tickets").select("id").ilike("ticket_number", like).limit(200),
  ]);
  const customerIds = ((customers.data ?? []) as Array<{ id: string }>).map((c) => c.id);
  const ticketIds = ((tickets.data ?? []) as Array<{ id: string }>).map((t) => t.id);
  const parts = [`order_number.ilike.${like}`, `receipt_number.ilike.${like}`];
  if (customerIds.length) parts.push(`customer_id.in.(${customerIds.join(",")})`);
  if (ticketIds.length) {
    parts.push(`repair_ticket_id.in.(${ticketIds.join(",")})`);
    const { data } = await db.from("order_items").select("order_id").in("repair_ticket_id", ticketIds).limit(500);
    const orderIds = [...new Set(((data ?? []) as Array<{ order_id: string }>).map((r) => r.order_id))];
    if (orderIds.length) parts.push(`id.in.(${orderIds.join(",")})`);
  }
  return parts.join(",");
}

export type RawSale = {
  id: string;
  order_number: string | null;
  receipt_number: string | null;
  created_at: string;
  confirmed_at: string | null;
  total: number;
  payment_method: string | null;
  customer_id: string | null;
  staff_id: string | null;
  repair_ticket_id: string | null;
};

export type SaleExtras = {
  customers: Map<string, { name: string | null; phone: string | null; email: string | null }>;
  staff: Map<string, string>;
  tickets: Map<string, string>; // ticket uuid -> label
  items: Map<string, Array<ItemRow & { repair_ticket_id: string | null }>>;
  payments: Map<string, PaymentRow[]>;
  refunded: Map<string, number>; // original order id -> refunded oere (positive)
};

/** Pure: shape stored rows into list rows. */
export function shapeSaleRows(sales: RawSale[], x: SaleExtras): SaleListRow[] {
  return sales.map((s) => {
    const items = x.items.get(s.id) ?? [];
    const ticketIds = new Set<string>(items.map((i) => i.repair_ticket_id).filter((v): v is string => !!v));
    if (s.repair_ticket_id) ticketIds.add(s.repair_ticket_id);
    const customer = s.customer_id ? x.customers.get(s.customer_id) : undefined;
    const refunded = x.refunded.get(s.id) ?? 0;
    return {
      id: s.id,
      orderNumber: s.receipt_number ?? s.order_number ?? s.id.slice(0, 8).toUpperCase(),
      createdAt: s.confirmed_at ?? s.created_at,
      customerName: customer?.name?.trim() || null,
      customerPhone: customer?.phone ?? null,
      summary: itemsSummary(items),
      caseNumbers: [...ticketIds].map((id) => x.tickets.get(id) ?? id.slice(0, 8)),
      payments: paymentSummary(x.payments.get(s.id) ?? [], s.payment_method),
      staffName: s.staff_id ? (x.staff.get(s.staff_id) ?? null) : null,
      total: s.total,
      refunded,
      refundState: refundState(s.total, refunded),
    };
  });
}

async function loadExtras(db: Db, sales: RawSale[]): Promise<SaleExtras> {
  const ids = sales.map((s) => s.id);
  const customerIds = [...new Set(sales.map((s) => s.customer_id).filter((v): v is string => !!v))];
  const staffIds = [...new Set(sales.map((s) => s.staff_id).filter((v): v is string => !!v))];

  const [itemRows, payRows, creditRows, customerRows, staffRows] = await Promise.all([
    inChunks<any>(ids, (c) =>
      db
        .from("order_items")
        .select("order_id, item_type, quantity, description, repair_ticket_id, device_id, sku_product_id")
        .in("order_id", c),
    ),
    inChunks<any>(ids, (c) => db.from("order_payments").select("order_id, type, amount_oere").in("order_id", c)),
    inChunks<any>(ids, (c) =>
      db.from("orders").select("original_order_id, total").eq("type", "credit_note").in("original_order_id", c),
    ),
    customerIds.length
      ? inChunks<any>(customerIds, (c) => db.from("customers").select("id, name, phone, email").in("id", c))
      : Promise.resolve([] as any[]),
    staffIds.length
      ? inChunks<any>(staffIds, (c) => db.from("staff").select("id, name").in("id", c))
      : Promise.resolve([] as any[]),
  ]);

  // Names for lines that have no stored description (older sales).
  const deviceIds = [...new Set(itemRows.filter((i) => !i.description && i.device_id).map((i) => i.device_id as string))];
  const skuIds = [...new Set(itemRows.filter((i) => !i.description && i.sku_product_id).map((i) => i.sku_product_id as string))];
  const ticketIds = [
    ...new Set([
      ...itemRows.map((i) => i.repair_ticket_id as string | null),
      ...sales.map((s) => s.repair_ticket_id),
    ].filter((v): v is string => !!v)),
  ];
  const [devices, skus, tickets] = await Promise.all([
    deviceIds.length
      ? inChunks<any>(deviceIds, (c) => db.from("devices").select("id, product_templates ( display_name )").in("id", c))
      : Promise.resolve([] as any[]),
    skuIds.length
      ? inChunks<any>(skuIds, (c) => db.from("sku_products").select("id, title").in("id", c))
      : Promise.resolve([] as any[]),
    ticketIds.length
      ? inChunks<any>(ticketIds, (c) => db.from("repair_tickets").select("id, ticket_number").in("id", c))
      : Promise.resolve([] as any[]),
  ]);

  const deviceName = new Map<string, string>(
    devices.map((d: any) => {
      const t = Array.isArray(d.product_templates) ? d.product_templates[0] : d.product_templates;
      return [d.id, t?.display_name ?? "Enhed"];
    }),
  );
  const skuTitle = new Map<string, string>(skus.map((s: any) => [s.id, s.title]));

  const items = new Map<string, Array<ItemRow & { repair_ticket_id: string | null }>>();
  for (const i of itemRows) {
    const list = items.get(i.order_id) ?? [];
    list.push({
      item_type: i.item_type,
      quantity: i.quantity,
      description: i.description,
      device_name: i.device_id ? deviceName.get(i.device_id) : null,
      sku_title: i.sku_product_id ? skuTitle.get(i.sku_product_id) : null,
      repair_ticket_id: i.repair_ticket_id ?? null,
    });
    items.set(i.order_id, list);
  }
  const payments = new Map<string, PaymentRow[]>();
  for (const p of payRows) {
    const list = payments.get(p.order_id) ?? [];
    list.push({ type: p.type, amount_oere: p.amount_oere });
    payments.set(p.order_id, list);
  }
  const refunded = new Map<string, number>();
  for (const c of creditRows) {
    refunded.set(c.original_order_id, (refunded.get(c.original_order_id) ?? 0) + Math.abs(c.total));
  }

  return {
    customers: new Map(customerRows.map((c: any) => [c.id, { name: c.name, phone: c.phone, email: c.email }])),
    staff: new Map(staffRows.map((s: any) => [s.id, s.name])),
    tickets: new Map(tickets.map((t: any) => [t.id, ticketLabel({ id: t.id, ticket_number: t.ticket_number })])),
    items,
    payments,
    refunded,
  };
}

export type SalesPage = {
  rows: SaleListRow[];
  matching: number;
  totals: SalesTotals;
  page: number;
  pages: number;
  fromDate: string;
  toDate: string;
};

/**
 * POS sales (orders.type = 'pos') for the staff's store scope, filtered, with the period totals.
 * Reads with the service-role client on the server (RLS blocks the browser client).
 */
export async function loadSalesPage(opts: {
  scope: StoreScope;
  locations: LocationIndex;
  filters: SalesFilters;
  now?: Date;
}): Promise<SalesPage> {
  const db = createAdminClient();
  const { scope, locations, filters } = opts;
  const range = periodRange(filters, opts.now);
  const search = await searchFilter(db, filters.q);

  const base = (select: string) => {
    let q: any = db.from("orders").select(select).eq("type", "pos").gte("created_at", range.startIso).lt("created_at", range.endIso);
    q = applyLocationScope(q, scope, locations);
    if (filters.payment) q = q.eq("order_payments.type", filters.payment);
    if (search) q = q.or(search);
    return q;
  };
  const selectIds = `${"id, total"}${filters.payment ? ", order_payments!inner(type)" : ""}`;

  const matching: Array<{ id: string; total: number }> = await fetchAll((from, to) =>
    base(selectIds).order("created_at", { ascending: false }).order("id").range(from, to),
  );

  const pages = Math.max(1, Math.ceil(matching.length / SALES_PER_PAGE));
  const page = Math.min(filters.page, pages);
  const pageIds = matching.slice((page - 1) * SALES_PER_PAGE, page * SALES_PER_PAGE).map((m) => m.id);

  let rows: SaleListRow[] = [];
  if (pageIds.length) {
    const sales = await inChunks<RawSale>(pageIds, (c) =>
      db
        .from("orders")
        .select("id, order_number, receipt_number, created_at, confirmed_at, total, payment_method, customer_id, staff_id, repair_ticket_id")
        .in("id", c) as unknown as PromiseLike<{ data: RawSale[] | null }>,
    );
    const order = new Map(pageIds.map((id, i) => [id, i]));
    sales.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    rows = shapeSaleRows(sales, await loadExtras(db, sales));
  }

  // Period totals: credit notes in the period (same store scope) and money per payment method.
  let creditQ: any = db.from("orders").select("total").eq("type", "credit_note").gte("created_at", range.startIso).lt("created_at", range.endIso);
  creditQ = applyLocationScope(creditQ, scope, locations);
  const [credits, payRows] = await Promise.all([
    fetchAll<{ total: number }>((from, to) => creditQ.range(from, to)),
    matching.length <= 1500
      ? inChunks<PaymentRow>(matching.map((m) => m.id), (c) =>
          db.from("order_payments").select("type, amount_oere").in("order_id", c) as unknown as PromiseLike<{ data: PaymentRow[] | null }>,
        )
      : Promise.resolve([] as PaymentRow[]),
  ]);

  return {
    rows,
    matching: matching.length,
    totals: totalsFor(matching, credits, payRows),
    page,
    pages,
    fromDate: range.fromDate,
    toDate: range.toDate,
  };
}

export type SaleDetail = {
  id: string;
  type: "pos" | "credit_note";
  receiptNumber: string;
  createdAt: string;
  locationName: string | null;
  staffName: string | null;
  customer: { id: string; name: string | null; phone: string | null; email: string | null } | null;
  lines: Array<{ id: string; name: string; quantity: number; unitPrice: number; lineTotal: number; caseNumber: string | null; caseId: string | null }>;
  payments: Array<{ label: string; amount: number; reference: string | null }>;
  subtotal: number;
  discountAmount: number;
  discountReason: string | null;
  total: number;
  vatTotal: number;
  notes: string | null;
  cases: Array<{ id: string; label: string }>;
  refunded: number;
  refundState: ReturnType<typeof refundState>;
  creditNotes: Array<{ id: string; receiptNumber: string; createdAt: string; total: number }>;
  originalOrder: { id: string; receiptNumber: string } | null;
  creditReason: string | null;
  locationId: string | null;
  registerId: string | null;
};

/** One POS sale or credit note for the detail page. Null if it is not a POS document. */
export async function loadSaleDetail(id: string): Promise<SaleDetail | null> {
  const db = createAdminClient();
  const { data: o } = (await db
    .from("orders")
    .select(
      "id, order_number, receipt_number, type, created_at, confirmed_at, subtotal, discount_amount, discount_reason, total, vat_total, notes, location_id, staff_id, customer_id, repair_ticket_id, original_order_id, credit_reason, payment_method, register_id",
    )
    .eq("id", id)
    .maybeSingle()) as { data: any };
  if (!o || (o.type !== "pos" && o.type !== "credit_note")) return null;

  const [items, pays, credits, loc, staff, customer, original] = await Promise.all([
    db
      .from("order_items")
      .select("id, item_type, quantity, unit_price, total_price, description, repair_ticket_id, device_id, sku_product_id")
      .eq("order_id", id),
    db.from("order_payments").select("type, amount_oere, reference").eq("order_id", id).order("created_at", { ascending: true }),
    db.from("orders").select("id, order_number, receipt_number, created_at, confirmed_at, total").eq("type", "credit_note").eq("original_order_id", id),
    o.location_id ? db.from("locations").select("name").eq("id", o.location_id).maybeSingle() : Promise.resolve({ data: null }),
    o.staff_id ? db.from("staff").select("name").eq("id", o.staff_id).maybeSingle() : Promise.resolve({ data: null }),
    o.customer_id ? db.from("customers").select("id, name, phone, email").eq("id", o.customer_id).maybeSingle() : Promise.resolve({ data: null }),
    o.original_order_id
      ? db.from("orders").select("id, order_number, receipt_number").eq("id", o.original_order_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const itemRows = ((items.data ?? []) as any[]).map((r) => r);
  const deviceIds = itemRows.filter((i) => !i.description && i.device_id).map((i) => i.device_id as string);
  const skuIds = itemRows.filter((i) => !i.description && i.sku_product_id).map((i) => i.sku_product_id as string);
  const ticketIds = [...new Set([...itemRows.map((i) => i.repair_ticket_id), o.repair_ticket_id].filter((v): v is string => !!v))];
  const [devices, skus, tickets] = await Promise.all([
    deviceIds.length ? db.from("devices").select("id, product_templates ( display_name )").in("id", deviceIds) : Promise.resolve({ data: [] as any[] }),
    skuIds.length ? db.from("sku_products").select("id, title").in("id", skuIds) : Promise.resolve({ data: [] as any[] }),
    ticketIds.length ? db.from("repair_tickets").select("id, ticket_number").in("id", ticketIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const deviceName = new Map<string, string>(
    ((devices.data ?? []) as any[]).map((d) => {
      const t = Array.isArray(d.product_templates) ? d.product_templates[0] : d.product_templates;
      return [d.id, t?.display_name ?? "Enhed"];
    }),
  );
  const skuTitle = new Map<string, string>(((skus.data ?? []) as any[]).map((s) => [s.id, s.title]));
  const ticketLabels = new Map<string, string>(
    ((tickets.data ?? []) as any[]).map((t) => [t.id, ticketLabel({ id: t.id, ticket_number: t.ticket_number })]),
  );

  const creditNotes = ((credits.data ?? []) as any[]).map((c) => ({
    id: c.id as string,
    receiptNumber: (c.receipt_number ?? c.order_number) as string,
    createdAt: (c.confirmed_at ?? c.created_at) as string,
    total: c.total as number,
  }));
  const refunded = creditNotes.reduce((n, c) => n + Math.abs(c.total), 0);

  return {
    id: o.id,
    type: o.type,
    receiptNumber: o.receipt_number ?? o.order_number,
    createdAt: o.confirmed_at ?? o.created_at,
    locationName: (loc.data as any)?.name ?? null,
    staffName: (staff.data as any)?.name ?? null,
    customer: (customer.data as any) ?? null,
    lines: itemRows.map((i) => ({
      id: i.id,
      name: itemName({
        item_type: i.item_type,
        quantity: i.quantity,
        description: i.description,
        device_name: i.device_id ? deviceName.get(i.device_id) : null,
        sku_title: i.sku_product_id ? skuTitle.get(i.sku_product_id) : null,
      }),
      quantity: i.quantity,
      unitPrice: i.unit_price,
      lineTotal: i.total_price,
      caseId: i.repair_ticket_id ?? null,
      caseNumber: i.repair_ticket_id ? (ticketLabels.get(i.repair_ticket_id) ?? null) : null,
    })),
    payments: ((pays.data ?? []) as any[]).map((p) => ({ label: paymentLabel(p.type), amount: p.amount_oere, reference: p.reference })),
    subtotal: o.subtotal,
    discountAmount: o.discount_amount ?? 0,
    discountReason: o.discount_reason,
    total: o.total,
    vatTotal: o.vat_total ?? 0,
    notes: o.notes,
    cases: [...ticketLabels.entries()].map(([cid, label]) => ({ id: cid, label })),
    refunded,
    refundState: o.type === "pos" ? refundState(o.total, refunded) : "ingen",
    creditNotes,
    originalOrder: original.data ? { id: (original.data as any).id, receiptNumber: (original.data as any).receipt_number ?? (original.data as any).order_number } : null,
    creditReason: o.credit_reason ?? null,
    locationId: o.location_id,
    registerId: o.register_id ?? null,
  };
}
