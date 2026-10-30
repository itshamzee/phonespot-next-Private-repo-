import type { createAdminClient } from "@/lib/supabase/admin";
import { isLagersalg } from "@/lib/lagersalg/is-lagersalg";

type Db = ReturnType<typeof createAdminClient>;
const PAGE = 1000;

async function pages<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

type One<T> = T | T[] | null;
const first = <T>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** Kassebeholdning i en butik: kun rækker med quantity > 0. */
export async function boxStockInStore(db: Db, locationId: string) {
  const rows = await pages<{ product_id: string; box_id: string; quantity: number }>((from, to) =>
    db
      .from("sku_box_stock")
      .select("product_id, box_id, quantity, sale_boxes!inner(location_id)")
      .eq("sale_boxes.location_id", locationId)
      .gt("quantity", 0)
      .order("product_id")
      .order("box_id")
      .range(from, to),
  );
  return rows;
}

/** Lagersalgsvarer (ikke glas) med antal > 0 i butikken. */
export async function lagersalgInStock(db: Db, locationId: string) {
  const rows = await pages<{
    product_id: string;
    quantity: number;
    sku_products: One<{ subcategory: string | null; attributes: Record<string, string> | null }>;
  }>((from, to) =>
    db
      .from("sku_stock")
      .select("product_id, quantity, sku_products!inner(subcategory, attributes)")
      .eq("location_id", locationId)
      .gt("quantity", 0)
      .order("product_id")
      .range(from, to),
  );
  return rows
    .filter((r) => {
      const p = first(r.sku_products);
      return p != null && isLagersalg(p);
    })
    .map((r) => ({ product_id: r.product_id, quantity: r.quantity }));
}

/** Lagersalgsvarer på lager i butikken, som ikke ligger i nogen af butikkens kasser. */
export async function unboxedInStore(db: Db, locationId: string) {
  const [stock, boxed] = await Promise.all([lagersalgInStock(db, locationId), boxStockInStore(db, locationId)]);
  const inBox = new Set(boxed.map((b) => b.product_id));
  return stock.filter((s) => !inBox.has(s.product_id));
}
