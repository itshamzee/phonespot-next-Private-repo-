import type { createAdminClient } from "@/lib/supabase/admin";
import { scoreCandidate } from "./match";
import type { Identified, MatchCandidate } from "./types";

type Db = ReturnType<typeof createAdminClient>;
type Row = Omit<MatchCandidate, "score" | "stock">;

const SELECT = "id, title, images, selling_price, status, subcategory, brand, compatible_models, attributes";
const SUPPLIER_BRANDS = ["rixus", "novanl"];
const MIN_SCORE = 5;

export async function storeLocations(db: Db) {
  const { data } = await db.from("locations").select("id, name, type").eq("type", "store");
  return (data ?? []) as { id: string; name: string; type: string }[];
}

/** Antal pr. butik (vejle/slagelse) for hver vare. */
export async function stockByStore(db: Db, productIds: string[]): Promise<Map<string, Record<string, number>>> {
  const out = new Map<string, Record<string, number>>();
  if (productIds.length === 0) return out;
  const [locations, { data: stock }] = await Promise.all([
    storeLocations(db),
    db.from("sku_stock").select("product_id, location_id, quantity").in("product_id", productIds),
  ]);
  for (const id of productIds) {
    out.set(
      id,
      Object.fromEntries(
        locations.map((l) => [
          l.name.toLowerCase(),
          (stock ?? []).find((s) => s.product_id === id && s.location_id === l.id)?.quantity ?? 0,
        ]),
      ),
    );
  }
  return out;
}

/**
 * Rangerer mulige dubletter: kun varer på udsalg eller fra Rixus/NovaNL,
 * score >= 5, højst 3. Praktikanten bekræfter altid selv.
 */
export function rankCandidates(i: Identified, rows: Row[], stock: Map<string, Record<string, number>>): MatchCandidate[] {
  return rows
    .filter((r) => r.attributes?.udsalg === "Ja" || SUPPLIER_BRANDS.includes((r.brand ?? "").trim().toLowerCase()))
    .map((r) => ({ ...r, score: scoreCandidate(i, r), stock: stock.get(r.id) ?? {} }))
    .filter((c) => c.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/** Eksakt match på trykte varekoder/EAN samt op til 3 sandsynlige dubletter. */
export async function findCandidates(
  db: Db,
  i: Identified,
): Promise<{ exact: MatchCandidate | null; candidates: MatchCandidate[] }> {
  // Kun [A-Za-z0-9-], så koderne er sikre i PostgREST-filteret.
  const codes = i.supplierCodes.filter((c) => /^[A-Za-z0-9-]{4,32}$/.test(c));
  const list = codes.join(",");
  const [exactRes, candRes] = await Promise.all([
    codes.length
      ? db
          .from("sku_products")
          .select(SELECT)
          .eq("category", "accessory")
          .neq("status", "archived")
          .or(`ean.in.(${list}),barcode.in.(${list})`)
          .limit(1)
      : Promise.resolve({ data: [] as Row[] }),
    i.models.length
      ? db
          .from("sku_products")
          .select(SELECT)
          .eq("category", "accessory")
          .neq("status", "archived")
          .overlaps("compatible_models", i.models)
          .limit(200)
      : Promise.resolve({ data: [] as Row[] }),
  ]);
  const exactRow = ((exactRes.data ?? []) as Row[])[0] ?? null;
  const rows = ((candRes.data ?? []) as Row[]).filter((r) => r.id !== exactRow?.id);
  const ranked = rankCandidates(i, rows, new Map());
  const stock = await stockByStore(db, [...(exactRow ? [exactRow.id] : []), ...ranked.map((c) => c.id)]);
  return {
    exact: exactRow ? { ...exactRow, score: 10, stock: stock.get(exactRow.id) ?? {} } : null,
    candidates: ranked.map((c) => ({ ...c, stock: stock.get(c.id) ?? {} })),
  };
}
