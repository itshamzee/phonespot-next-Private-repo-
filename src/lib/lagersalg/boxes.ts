import type { createAdminClient } from "@/lib/supabase/admin";
import { rpcError, toPosError } from "@/lib/pos/errors";

type Db = ReturnType<typeof createAdminClient>;

export type SaleBox = {
  id: string;
  locationId: string;
  number: number;
  status: "open" | "closed";
  openedAt: string;
  closedAt: string | null;
};

type BoxRow = {
  id: string;
  location_id: string;
  number: number;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
};

function toBox(r: BoxRow): SaleBox {
  return {
    id: r.id,
    locationId: r.location_id,
    number: r.number,
    status: r.status,
    openedAt: r.opened_at,
    closedAt: r.closed_at,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function boxLabel(number: number): string {
  return `Kasse ${pad(number)}`;
}

export function boxesLabel(numbers: number[]): string {
  if (numbers.length === 0) return "Ingen kasse";
  const sorted = [...numbers].sort((a, b) => a - b);
  return `Kasse ${sorted.map(pad).join(", ")}`;
}

/** pos_fail-koden (fx box_already_open, box_not_open, box_closed) fra en RPC-fejl, ellers null. */
export function boxErrorCode(error: unknown): string | null {
  return toPosError(error)?.code ?? null;
}

export async function openBox(db: Db, locationId: string, staffId: string | null): Promise<SaleBox> {
  const { data, error } = await db.rpc("sale_box_open", { p_location_id: locationId, p_staff_id: staffId });
  if (error) throw rpcError("sale_box_open", error);
  return toBox(data as BoxRow);
}

export async function closeBox(
  db: Db,
  boxId: string,
  staffId: string | null,
  openNext: boolean,
): Promise<{ closed: SaleBox; opened: SaleBox | null }> {
  const { data, error } = await db.rpc("sale_box_close", {
    p_box_id: boxId,
    p_staff_id: staffId,
    p_open_next: openNext,
  });
  if (error) throw rpcError("sale_box_close", error);
  const res = data as { closed: BoxRow; opened: BoxRow | null };
  return { closed: toBox(res.closed), opened: res.opened ? toBox(res.opened) : null };
}

export async function currentOpenBox(db: Db, locationId: string): Promise<SaleBox | null> {
  const { data, error } = await db
    .from("sale_boxes")
    .select("id, location_id, number, status, opened_at, closed_at")
    .eq("location_id", locationId)
    .eq("status", "open")
    .maybeSingle();
  if (error) throw new Error(`currentOpenBox: ${error.message}`);
  return data ? toBox(data as BoxRow) : null;
}

export async function addToBox(db: Db, productId: string, boxId: string, quantity: number): Promise<number> {
  const { data, error } = await db.rpc("sale_box_add", {
    p_product_id: productId,
    p_box_id: boxId,
    p_quantity: quantity,
  });
  if (error) throw rpcError("sale_box_add", error);
  return data as number;
}

/** Kassenumre (stigende) pr. produkt i en butik; kun kasser med quantity > 0. */
export async function boxNumbersFor(
  db: Db,
  productIds: string[],
  locationId: string,
): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>();
  if (productIds.length === 0) return out;
  const { data, error } = await db
    .from("sku_box_stock")
    .select("product_id, quantity, sale_boxes!inner(number, location_id)")
    .in("product_id", productIds)
    .gt("quantity", 0)
    .eq("sale_boxes.location_id", locationId);
  if (error) throw new Error(`boxNumbersFor: ${error.message}`);
  for (const row of (data ?? []) as unknown as {
    product_id: string;
    sale_boxes: { number: number } | { number: number }[];
  }[]) {
    const box = Array.isArray(row.sale_boxes) ? row.sale_boxes[0] : row.sale_boxes;
    if (!box) continue;
    const list = out.get(row.product_id) ?? [];
    list.push(box.number);
    out.set(row.product_id, list);
  }
  for (const list of out.values()) list.sort((a, b) => a - b);
  return out;
}

/**
 * Kassenumre (stigende, unikke) pr. produkt som ordren faktisk blev plukket fra. Gemmes af
 * sale_box_consume ved salget, så pakkelisten ikke afhænger af kassebeholdningen bagefter
 * (den er allerede trukket ned, når pakkeren åbner ordren).
 */
export async function picksForOrder(db: Db, orderId: string): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>();
  const { data, error } = await db
    .from("sale_box_picks")
    .select("product_id, sale_boxes!inner(number)")
    .eq("order_id", orderId);
  if (error) throw new Error(`picksForOrder: ${error.message}`);
  for (const row of (data ?? []) as unknown as {
    product_id: string;
    sale_boxes: { number: number } | { number: number }[];
  }[]) {
    const box = Array.isArray(row.sale_boxes) ? row.sale_boxes[0] : row.sale_boxes;
    if (!box) continue;
    const list = out.get(row.product_id) ?? [];
    if (!list.includes(box.number)) list.push(box.number);
    out.set(row.product_id, list);
  }
  for (const list of out.values()) list.sort((a, b) => a - b);
  return out;
}
