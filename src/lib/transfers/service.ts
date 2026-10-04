import { createServerClient } from "@/lib/supabase/client";
import type { StaffIdentity } from "@/lib/auth/require-staff";
import {
  SCOPE_LABELS,
  type LocationIndex,
  type ScopeSlug,
  type StoreScope,
  locationIdForSlug,
  slugForLocationId,
} from "@/lib/auth/store-scope";
import { loadLocationIndex } from "@/lib/auth/store-scope-server";
import { TransferError, transferError } from "./errors";
import {
  TransferRuleError,
  assertTransition,
  canActFor,
  canRequest,
  canSeeTransfer,
  transferPermissions,
  type TransferAction,
} from "./rules";
import type { RequestLineInput, Transfer, TransferLine, TransferLocation, TransferStatus } from "./types";

type Db = ReturnType<typeof createServerClient>;

type HeaderRow = {
  id: string;
  number: number;
  status: TransferStatus;
  from_location_id: string;
  to_location_id: string;
  note: string | null;
  requested_by: string | null;
  requested_at: string;
  sent_by: string | null;
  sent_at: string | null;
  received_by: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  closed_short: boolean | null;
};

type LineRow = {
  id: string;
  transfer_id: string;
  sku_product_id: string | null;
  device_id: string | null;
  template_id: string | null;
  storage: string | null;
  grade: string | null;
  description: string;
  qty: number;
  sent_qty: number;
  received_qty: number;
  returned_qty: number;
};

const HEADER_COLUMNS =
  "id, number, status, from_location_id, to_location_id, note, requested_by, requested_at, sent_by, sent_at, received_by, received_at, cancelled_at, closed_short";
const LINE_COLUMNS =
  "id, transfer_id, sku_product_id, device_id, template_id, storage, grade, description, qty, sent_qty, received_qty, returned_qty";

/** Hvor længe afsluttede overførsler bliver på tavlen. */
const CLOSED_WINDOW_DAYS = 30;
const CLOSED_LIMIT = 40;

function location(index: LocationIndex, id: string): TransferLocation {
  const slug = slugForLocationId(index, id);
  return { id, slug, name: slug ? SCOPE_LABELS[slug] : "Ukendt butik" };
}

/* ---------------------- læsning ---------------------- */

async function hydrate(db: Db, staff: StaffIdentity, headers: HeaderRow[], index: LocationIndex): Promise<Transfer[]> {
  if (headers.length === 0) return [];
  const ids = headers.map((h) => h.id);
  const { data: lineData, error } = await db.from("stock_transfer_lines").select(LINE_COLUMNS).in("transfer_id", ids);
  if (error) throw transferError("Kunne ikke hente varelinjer", error);
  const lines = (lineData ?? []) as LineRow[];

  const deviceIds = [...new Set(lines.map((l) => l.device_id).filter((x): x is string => !!x))];
  const skuIds = [...new Set(lines.map((l) => l.sku_product_id).filter((x): x is string => !!x))];
  const staffIds = [
    ...new Set(headers.flatMap((h) => [h.requested_by, h.sent_by, h.received_by]).filter((x): x is string => !!x)),
  ];

  const [devices, skus, staffRows] = await Promise.all([
    deviceIds.length
      ? db.from("devices").select("id, imei, barcode, serial_number").in("id", deviceIds)
      : Promise.resolve({ data: [] as unknown[] }),
    skuIds.length
      ? db.from("sku_products").select("id, ean, product_number").in("id", skuIds)
      : Promise.resolve({ data: [] as unknown[] }),
    staffIds.length ? db.from("staff").select("id, name").in("id", staffIds) : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const deviceById = new Map(
    ((devices.data ?? []) as { id: string; imei: string | null; barcode: string | null; serial_number: string | null }[]).map(
      (d) => [d.id, d],
    ),
  );
  const skuById = new Map(
    ((skus.data ?? []) as { id: string; ean: string | null; product_number: string | null }[]).map((s) => [s.id, s]),
  );
  const nameById = new Map(((staffRows.data ?? []) as { id: string; name: string | null }[]).map((s) => [s.id, s.name]));

  const toLine = (l: LineRow): TransferLine => {
    const d = l.device_id ? deviceById.get(l.device_id) : undefined;
    const s = l.sku_product_id ? skuById.get(l.sku_product_id) : undefined;
    const codes = [d?.imei, d?.barcode, d?.serial_number, s?.ean, s?.product_number].filter((c): c is string => !!c);
    return {
      id: l.id,
      skuProductId: l.sku_product_id,
      deviceId: l.device_id,
      templateId: l.template_id,
      storage: l.storage,
      grade: l.grade,
      description: l.description,
      qty: l.qty,
      sentQty: l.sent_qty,
      receivedQty: l.received_qty,
      returnedQty: l.returned_qty,
      codes,
      imei: d?.imei ?? null,
    };
  };

  return headers.map((h) => {
    const mine = lines.filter((l) => l.transfer_id === h.id).map(toLine);
    const from = location(index, h.from_location_id);
    const to = location(index, h.to_location_id);
    return {
      id: h.id,
      number: h.number,
      status: h.status,
      from,
      to,
      note: h.note,
      requestedAt: h.requested_at,
      requestedByName: h.requested_by ? (nameById.get(h.requested_by) ?? null) : null,
      sentAt: h.sent_at,
      sentByName: h.sent_by ? (nameById.get(h.sent_by) ?? null) : null,
      receivedAt: h.received_at,
      receivedByName: h.received_by ? (nameById.get(h.received_by) ?? null) : null,
      cancelledAt: h.cancelled_at,
      closedShort: !!h.closed_short,
      lines: mine,
      can: transferPermissions(staff, {
        status: h.status,
        fromSlug: from.slug,
        toSlug: to.slug,
        hasReceipts: mine.some((l) => l.receivedQty > 0),
      }),
    };
  });
}

/**
 * Overførsler synlige for medarbejderen. Ejeren ser alle (eller dem der rører den
 * valgte butik); alle andre kun dem hvor deres egen butik er afsender eller modtager.
 */
export async function listTransfers(
  staff: StaffIdentity,
  scope: StoreScope,
  db: Db = createServerClient(),
): Promise<Transfer[]> {
  const index = await loadLocationIndex();
  const involving = visibleLocationId(staff, scope, index);
  if (involving === "none") return [];

  const since = new Date(Date.now() - CLOSED_WINDOW_DAYS * 86_400_000).toISOString();
  const restrict = <Q extends { or(filters: string): Q }>(q: Q): Q =>
    involving ? q.or(`from_location_id.eq.${involving},to_location_id.eq.${involving}`) : q;

  const [open, closed] = await Promise.all([
    restrict(db.from("stock_transfers").select(HEADER_COLUMNS).in("status", ["requested", "sent"]).order("requested_at", { ascending: false }).limit(200)),
    restrict(
      db
        .from("stock_transfers")
        .select(HEADER_COLUMNS)
        .in("status", ["received", "cancelled"])
        .order("requested_at", { ascending: false })
        .limit(CLOSED_LIMIT * 3),
    ),
  ]);
  if (open.error) throw transferError("Kunne ikke hente overførsler", open.error);
  if (closed.error) throw transferError("Kunne ikke hente overførsler", closed.error);
  const recent = ((closed.data ?? []) as HeaderRow[])
    .filter((h) => (h.received_at ?? h.cancelled_at ?? h.requested_at) >= since)
    .slice(0, CLOSED_LIMIT);
  return hydrate(db, staff, [...((open.data ?? []) as HeaderRow[]), ...recent], index);
}

/** null = ingen afgrænsning (ejer på 'alle'), 'none' = ingen butik, ellers locations.id der skal være afsender/modtager. */
export function visibleLocationId(staff: StaffIdentity, scope: StoreScope, index: LocationIndex): string | null | "none" {
  if (staff.role === "owner") {
    if (scope === "alle") return null;
    if (scope === "ingen") return "none";
    return locationIdForSlug(index, scope) ?? "none";
  }
  return staff.location_id ?? "none";
}

/* ---------------------- skrivning ---------------------- */

type Sides = { status: TransferStatus; fromSlug: ScopeSlug | null; toSlug: ScopeSlug | null; hasReceipts: boolean };

async function loadSides(db: Db, id: string, index: LocationIndex): Promise<Sides> {
  const { data, error } = await db
    .from("stock_transfers")
    .select("status, from_location_id, to_location_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw transferError("Kunne ikke hente overførslen", error);
  if (!data) throw new TransferError("not_found", "Overførslen findes ikke", 404);
  const row = data as { status: TransferStatus; from_location_id: string; to_location_id: string };
  const { data: lines } = await db.from("stock_transfer_lines").select("received_qty").eq("transfer_id", id);
  return {
    status: row.status,
    fromSlug: slugForLocationId(index, row.from_location_id),
    toSlug: slugForLocationId(index, row.to_location_id),
    hasReceipts: ((lines ?? []) as { received_qty: number }[]).some((l) => l.received_qty > 0),
  };
}

/** Fælles forhåndstjek: skjul andres overførsler (404), tjek status og rettighed (403). */
async function guard(db: Db, staff: StaffIdentity, id: string, action: TransferAction): Promise<void> {
  const index = await loadLocationIndex();
  const sides = await loadSides(db, id, index);
  if (!canSeeTransfer(staff, sides.fromSlug, sides.toSlug)) throw new TransferError("not_found", "Overførslen findes ikke", 404);
  try {
    assertTransition(sides.status, action);
  } catch (err) {
    if (err instanceof TransferRuleError) throw new TransferError(err.code, err.message, err.status);
    throw err;
  }
  if (!transferPermissions(staff, sides)[action]) {
    if (action === "cancel" && sides.status === "sent" && sides.hasReceipts && canActFor(staff, sides.fromSlug)) {
      throw new TransferError("partially_received", "En del er allerede modtaget. Luk overførslen med mangler i stedet.", 409);
    }
    const message =
      action === "send"
        ? "Kun afsenderbutikken kan pakke og sende."
        : action === "receive"
          ? "Kun modtagerbutikken kan modtage."
          : "Du kan ikke annullere denne overførsel.";
    throw new TransferError("forbidden_location", message, 403);
  }
}

export function toRpcRequestLines(lines: RequestLineInput[]) {
  return lines.map((l) => {
    if ("skuProductId" in l) return { sku_product_id: l.skuProductId, qty: l.qty };
    if ("deviceId" in l) return { device_id: l.deviceId };
    return { template_id: l.templateId, storage: l.storage, grade: l.grade, qty: l.qty };
  });
}

export async function requestTransfer(
  staff: StaffIdentity,
  input: { fromSlug: ScopeSlug; toSlug: ScopeSlug; lines: RequestLineInput[]; note?: string | null },
  db: Db = createServerClient(),
): Promise<{ id: string; number: number }> {
  const index = await loadLocationIndex();
  if (!canRequest(staff, input.fromSlug, input.toSlug)) {
    throw new TransferError("forbidden_location", "Du kan kun anmode om varer til din egen butik, fra en anden butik.", 403);
  }
  const fromId = locationIdForSlug(index, input.fromSlug);
  const toId = locationIdForSlug(index, input.toSlug);
  if (!fromId || !toId) throw new TransferError("location_not_found", "Butikken findes ikke", 404);

  const { data, error } = await db.rpc("transfer_request", {
    p_from: fromId,
    p_to: toId,
    p_staff_id: staff.id,
    p_lines: toRpcRequestLines(input.lines),
    p_note: input.note ?? null,
  });
  if (error || !data) throw transferError("Anmodningen kunne ikke oprettes", error);
  return data as { id: string; number: number };
}

export async function sendTransfer(
  staff: StaffIdentity,
  id: string,
  overrides: { lineId: string; qty?: number; deviceIds?: string[] }[] | null,
  db: Db = createServerClient(),
) {
  await guard(db, staff, id, "send");
  const { data, error } = await db.rpc("transfer_send", {
    p_transfer_id: id,
    p_staff_id: staff.id,
    p_lines: overrides
      ? overrides.map((o) => ({ line_id: o.lineId, qty: o.qty, device_ids: o.deviceIds ?? [] }))
      : null,
  });
  if (error) throw transferError("Overførslen kunne ikke sendes", error);
  return data as { id: string; number: number; status: TransferStatus };
}

export async function receiveTransfer(
  staff: StaffIdentity,
  id: string,
  scans: { lineId: string; qty: number }[],
  closeShort: boolean,
  db: Db = createServerClient(),
) {
  await guard(db, staff, id, "receive");
  const { data, error } = await db.rpc("transfer_receive", {
    p_transfer_id: id,
    p_staff_id: staff.id,
    p_lines: scans.map((s) => ({ line_id: s.lineId, qty: s.qty })),
    p_close_short: closeShort,
  });
  if (error) throw transferError("Modtagelsen kunne ikke gemmes", error);
  return data as { id: string; number: number; status: TransferStatus; open_lines: number; closed_short: boolean };
}

export async function cancelTransfer(
  staff: StaffIdentity,
  id: string,
  reason: string | null,
  db: Db = createServerClient(),
) {
  await guard(db, staff, id, "cancel");
  const { data, error } = await db.rpc("transfer_cancel", {
    p_transfer_id: id,
    p_staff_id: staff.id,
    p_reason: reason,
  });
  if (error) throw transferError("Overførslen kunne ikke annulleres", error);
  return data as { id: string; number: number; status: TransferStatus };
}
