import type { createAdminClient } from "@/lib/supabase/admin";
import { storeLocations } from "@/lib/accessory-intake/candidates";

type Db = ReturnType<typeof createAdminClient>;

export class BoxEditError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type One<T> = T | T[] | null;
const first = <T>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** Kasser med antal > 0 for et produkt: { vejle: { "1": 3 } }. */
export async function boxesForProduct(db: Db, productId: string): Promise<Record<string, Record<string, number>>> {
  const { data } = await db
    .from("sku_box_stock")
    .select("quantity, sale_boxes(number, locations(name))")
    .eq("product_id", productId)
    .gt("quantity", 0);
  const out: Record<string, Record<string, number>> = {};
  for (const row of (data ?? []) as unknown as {
    quantity: number;
    sale_boxes: One<{ number: number; locations: One<{ name: string | null }> }>;
  }[]) {
    const box = first(row.sale_boxes);
    const store = first(box?.locations ?? null)?.name?.toLowerCase();
    if (!box || !store) continue;
    (out[store] ??= {})[String(box.number)] = row.quantity;
  }
  return out;
}

/**
 * Rækkerne til sku_box_stock for en redigering: angivne numre sættes, udeladte
 * numre med lager nulstilles. Kun butikkens egne kasser; ukendte numre afvises,
 * og en lukket kasse kan kun tømmes (ikke fyldes op).
 */
export async function planProductBoxes(
  db: Db,
  productId: string,
  input: Record<string, Record<string, number>>,
): Promise<{ product_id: string; box_id: string; quantity: number }[]> {
  const locations = await storeLocations(db);
  const rows: { product_id: string; box_id: string; quantity: number }[] = [];
  for (const [store, wanted] of Object.entries(input)) {
    const location = locations.find((l) => l.name.toLowerCase() === store);
    if (!location) throw new BoxEditError("Butikken findes ikke", 404);
    const { data: boxes, error } = await db
      .from("sale_boxes")
      .select("id, number, status")
      .eq("location_id", location.id);
    if (error) throw new Error(error.message);
    const byNumber = new Map((boxes ?? []).map((b) => [String(b.number), b as { id: string; number: number; status: string }]));
    const ids = (boxes ?? []).map((b) => b.id);
    const { data: current, error: curError } = ids.length
      ? await db.from("sku_box_stock").select("box_id, quantity").eq("product_id", productId).in("box_id", ids)
      : { data: [], error: null };
    if (curError) throw new Error(curError.message);
    const have = new Map((current ?? []).map((c) => [c.box_id as string, (c.quantity as number) ?? 0]));

    for (const [number, quantity] of Object.entries(wanted)) {
      const box = byNumber.get(String(Number(number)));
      if (!box) throw new BoxEditError(`Kasse ${number} findes ikke i ${location.name}`);
      if (box.status === "closed" && quantity > (have.get(box.id) ?? 0)) {
        throw new BoxEditError(`Kasse ${String(box.number).padStart(2, "0")} er lukket og kan kun tømmes`, 409);
      }
      rows.push({ product_id: productId, box_id: box.id, quantity });
    }
    for (const [boxId, qty] of have) {
      if (qty > 0 && !rows.some((r) => r.box_id === boxId)) rows.push({ product_id: productId, box_id: boxId, quantity: 0 });
    }
  }
  return rows;
}
