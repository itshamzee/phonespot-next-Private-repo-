import { createServerClient } from "@/lib/supabase/client";
import { SCOPE_LABELS, slugForLocationId, type StoreScope } from "@/lib/auth/store-scope";
import { loadLocationIndex } from "@/lib/auth/store-scope-server";
import type { StaffIdentity } from "@/lib/auth/require-staff";
import { visibleLocationId } from "@/lib/transfers/service";

type Db = ReturnType<typeof createServerClient>;

export type MovementReason = "sale" | "return" | "adjust" | "receive" | "transfer";

export const REASON_LABELS: Record<MovementReason, string> = {
  sale: "Salg",
  return: "Retur",
  adjust: "Regulering",
  receive: "Varemodtagelse",
  transfer: "Overførsel",
};

export type MovementRow = {
  id: string;
  createdAt: string;
  locationName: string;
  itemName: string;
  qtyDelta: number;
  reason: MovementReason;
  note: string | null;
  staffName: string | null;
};

export const MOVEMENTS_PER_PAGE = 30;

/**
 * Lagerbevægelser (append-only stock_movements), afgrænset efter butik:
 * medarbejdere ser kun deres egen butiks bevægelser, ejeren alle eller den valgte butik.
 */
export async function queryMovements(
  staff: StaffIdentity,
  scope: StoreScope,
  opts: { page?: number; perPage?: number } = {},
  db: Db = createServerClient(),
): Promise<{ rows: MovementRow[]; total: number; page: number; perPage: number }> {
  const index = await loadLocationIndex();
  const perPage = opts.perPage ?? MOVEMENTS_PER_PAGE;
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const restrict = visibleLocationId(staff, scope, index);
  if (restrict === "none") return { rows: [], total: 0, page, perPage };

  let query = db
    .from("stock_movements")
    .select("id, created_at, location_id, sku_product_id, device_id, qty_delta, reason, ref_note, staff_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);
  if (restrict) query = query.eq("location_id", restrict);

  const { data, error, count } = await query;
  if (error) throw new Error(`stock movements failed: ${error.message}`);
  const raw = (data ?? []) as {
    id: string;
    created_at: string;
    location_id: string;
    sku_product_id: string | null;
    device_id: string | null;
    qty_delta: number;
    reason: MovementReason;
    ref_note: string | null;
    staff_id: string | null;
  }[];

  const skuIds = [...new Set(raw.map((r) => r.sku_product_id).filter((x): x is string => !!x))];
  const deviceIds = [...new Set(raw.map((r) => r.device_id).filter((x): x is string => !!x))];
  const staffIds = [...new Set(raw.map((r) => r.staff_id).filter((x): x is string => !!x))];

  const [skus, devices, staffRows] = await Promise.all([
    skuIds.length ? db.from("sku_products").select("id, title").in("id", skuIds) : Promise.resolve({ data: [] as unknown[] }),
    deviceIds.length
      ? db.from("devices").select("id, storage, grade, imei, product_templates(display_name)").in("id", deviceIds)
      : Promise.resolve({ data: [] as unknown[] }),
    staffIds.length ? db.from("staff").select("id, name").in("id", staffIds) : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const skuName = new Map(((skus.data ?? []) as { id: string; title: string }[]).map((s) => [s.id, s.title]));
  const deviceName = new Map(
    (
      (devices.data ?? []) as unknown as {
        id: string;
        storage: string | null;
        grade: string | null;
        imei: string | null;
        product_templates: { display_name: string } | { display_name: string }[] | null;
      }[]
    ).map((d) => {
      const t = Array.isArray(d.product_templates) ? d.product_templates[0] : d.product_templates;
      const label = `${t?.display_name ?? "Enhed"}${d.storage ? ` ${d.storage}` : ""}${d.grade ? ` · ${d.grade === "N" ? "Fabriksny" : `Grade ${d.grade}`}` : ""}`;
      return [d.id, d.imei ? `${label} (IMEI ${d.imei})` : label] as const;
    }),
  );
  const staffName = new Map(((staffRows.data ?? []) as { id: string; name: string | null }[]).map((s) => [s.id, s.name]));

  return {
    rows: raw.map((r) => {
      const slug = slugForLocationId(index, r.location_id);
      return {
        id: r.id,
        createdAt: r.created_at,
        locationName: slug ? SCOPE_LABELS[slug] : "Ukendt butik",
        itemName: (r.sku_product_id ? skuName.get(r.sku_product_id) : r.device_id ? deviceName.get(r.device_id) : null) ?? "Slettet vare",
        qtyDelta: r.qty_delta,
        reason: r.reason,
        note: r.ref_note,
        staffName: r.staff_id ? (staffName.get(r.staff_id) ?? null) : null,
      };
    }),
    total: count ?? 0,
    page,
    perPage,
  };
}
