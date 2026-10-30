import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";
import { canAccessStore } from "@/lib/auth/store-scope";
import { storeLocations } from "@/lib/accessory-intake/candidates";
import { boxStockInStore, unboxedInStore } from "@/lib/lagersalg/unboxed";

/**
 * GET ?store=vejle → { boxes: [{ id, number, status, lines, units }], unboxed }
 * lines = produkter med antal > 0 i kassen, units = summen. unboxed = lagersalgsvarer
 * på lager i butikken, som ikke ligger i nogen kasse.
 */
export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: "Kun medarbejdere" }, { status: 401 });

  const store = new URL(request.url).searchParams.get("store") ?? "";
  if (store !== "vejle" && store !== "slagelse") return NextResponse.json({ error: "Ugyldig butik" }, { status: 400 });
  if (!canAccessStore(staff, store)) {
    return NextResponse.json({ error: "Du har ikke adgang til den butik" }, { status: 403 });
  }

  try {
    const db = createAdminClient();
    const location = (await storeLocations(db)).find((l) => l.name.toLowerCase() === store);
    if (!location) return NextResponse.json({ error: "Butikken findes ikke" }, { status: 404 });

    const { data, error } = await db
      .from("sale_boxes")
      .select("id, number, status")
      .eq("location_id", location.id)
      .order("number", { ascending: false });
    if (error) throw new Error(error.message);

    const stock = await boxStockInStore(db, location.id);
    const unboxed = await unboxedInStore(db, location.id, stock);
    const agg = new Map<string, { lines: Set<string>; units: number }>();
    for (const row of stock) {
      const a = agg.get(row.box_id) ?? { lines: new Set<string>(), units: 0 };
      a.lines.add(row.product_id);
      a.units += row.quantity;
      agg.set(row.box_id, a);
    }
    const boxes = ((data ?? []) as { id: string; number: number; status: "open" | "closed" }[]).map((b) => ({
      id: b.id,
      number: b.number,
      status: b.status,
      lines: agg.get(b.id)?.lines.size ?? 0,
      units: agg.get(b.id)?.units ?? 0,
    }));
    return NextResponse.json({ boxes, unboxed: unboxed.length });
  } catch {
    return NextResponse.json({ error: "Kasserne kunne ikke hentes. Prøv igen." }, { status: 503 });
  }
}
