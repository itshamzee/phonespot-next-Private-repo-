/**
 * Læser sagens linjer (repair_ticket_items). Før migrationen 20261005120000 er kørt findes
 * tabellen ikke; så returneres en tom liste, og sagen vises som hidtil (services/booking/tilbud).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadLocationIndex } from "@/lib/auth/store-scope-server";
import { slugForLocationId } from "@/lib/auth/store-scope";
import type { CaseItemRow } from "@/lib/repairs/case-money";
import type { CaseItemView, CaseStore, ItemStockStatus } from "@/lib/repairs/new-case-types";

type DbRow = {
  id: string;
  parent_item_id: string | null;
  kind: CaseItemRow["kind"];
  description: string;
  quality_label: string | null;
  qty: number;
  list_price_oere: number;
  unit_price_oere: number;
  price_reason: string | null;
  cost_oere: number | null;
  location_id: string | null;
  stock_status: ItemStockStatus;
  repair_service_id: string | null;
  sku_product_id: string | null;
  device_id: string | null;
  order_item_id: string | null;
  created_at: string;
};

const COLUMNS =
  "id, parent_item_id, kind, description, quality_label, qty, list_price_oere, unit_price_oere, price_reason, cost_oere, location_id, stock_status, repair_service_id, sku_product_id, device_id, order_item_id, created_at";

export async function loadCaseItemRows(db: SupabaseClient, ticketId: string): Promise<DbRow[]> {
  const { data, error } = await db
    .from("repair_ticket_items")
    .select(COLUMNS)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[repairs] items not available (migration applied?):", ticketId, error.message);
    return [];
  }
  return (data ?? []) as DbRow[];
}

/** Rækker til caseLines(): enhedslinjer får deres momsordning fra devices. */
export async function loadCaseItems(db: SupabaseClient, ticketId: string): Promise<CaseItemRow[]> {
  const rows = await loadCaseItemRows(db, ticketId);
  const deviceIds = rows.map((r) => r.device_id).filter((v): v is string => Boolean(v));
  const scheme = new Map<string, "brugtmoms" | "regular">();
  if (deviceIds.length > 0) {
    const { data } = await db.from("devices").select("id, vat_scheme").in("id", deviceIds);
    for (const d of (data ?? []) as Array<{ id: string; vat_scheme: string | null }>) {
      scheme.set(d.id, d.vat_scheme === "regular" ? "regular" : "brugtmoms");
    }
  }
  return rows.map((r) => ({
    id: r.id,
    parent_item_id: r.parent_item_id,
    kind: r.kind,
    description: r.description,
    qty: r.qty,
    unit_price_oere: r.unit_price_oere,
    stock_status: r.stock_status,
    sku_product_id: r.sku_product_id,
    device_id: r.device_id,
    created_at: r.created_at,
    vat_scheme: r.device_id ? scheme.get(r.device_id) : undefined,
  }));
}

/** Samme rækker som API-visning (CaseItemView). Kostpris udelades medmindre `includeCost`. */
export async function loadCaseItemViews(
  db: SupabaseClient,
  ticketId: string,
  includeCost: boolean,
): Promise<CaseItemView[]> {
  const rows = await loadCaseItemRows(db, ticketId);
  if (rows.length === 0) return [];
  const index = await loadLocationIndex();
  const created = new Map(rows.map((r) => [r.id, r.created_at]));
  return [...rows]
    .sort(
      (a, b) =>
        (created.get(a.parent_item_id ?? a.id) ?? "").localeCompare(created.get(b.parent_item_id ?? b.id) ?? "") ||
        Number(a.kind === "part") - Number(b.kind === "part") ||
        a.created_at.localeCompare(b.created_at),
    )
    .map((r) => {
      const view: CaseItemView = {
        id: r.id,
        parent_item_id: r.parent_item_id,
        kind: r.kind,
        description: r.description,
        quality_label: r.quality_label,
        qty: r.qty,
        list_price_oere: r.list_price_oere,
        unit_price_oere: r.unit_price_oere,
        total_oere: r.qty * r.unit_price_oere,
        price_reason: r.price_reason,
        stock_status: r.stock_status,
        location_slug: slugForLocationId(index, r.location_id) as CaseStore | null,
        repair_service_id: r.repair_service_id,
        sku_product_id: r.sku_product_id,
        device_id: r.device_id,
        order_item_id: r.order_item_id,
      };
      if (includeCost) view.cost_oere = r.cost_oere;
      return view;
    });
}
