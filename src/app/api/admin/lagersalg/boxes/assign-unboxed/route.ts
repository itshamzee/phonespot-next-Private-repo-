import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";
import { canAccessStore } from "@/lib/auth/store-scope";
import { storeLocations } from "@/lib/accessory-intake/candidates";
import { currentOpenBox } from "@/lib/lagersalg/boxes";
import { unboxedInStore } from "@/lib/lagersalg/unboxed";

/** POST { store } → { assigned, box }: lægger lagersalgsvarer uden kasse i butikkens åbne kasse (med hele butiksantallet). */
const schema = z.object({ store: z.enum(["vejle", "slagelse"]) });

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: "Kun medarbejdere" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  const { store } = parsed.data;
  if (!canAccessStore(staff, store)) {
    return NextResponse.json({ error: "Du har ikke adgang til den butik" }, { status: 403 });
  }

  try {
    const db = createAdminClient();
    const location = (await storeLocations(db)).find((l) => l.name.toLowerCase() === store);
    if (!location) return NextResponse.json({ error: "Butikken findes ikke" }, { status: 404 });

    const box = await currentOpenBox(db, location.id);
    if (!box) {
      return NextResponse.json(
        { error: `Ingen åben kasse i ${location.name}`, code: "box_not_open" },
        { status: 409 },
      );
    }

    const todo = await unboxedInStore(db, location.id);
    if (todo.length > 0) {
      const rows = todo.map((t) => ({ product_id: t.product_id, box_id: box.id, quantity: t.quantity }));
      const { error } = await db.from("sku_box_stock").upsert(rows, { onConflict: "product_id,box_id" });
      if (error) throw new Error(error.message);
    }
    return NextResponse.json({ assigned: todo.length, box });
  } catch {
    return NextResponse.json({ error: "Varerne kunne ikke lægges i kassen. Prøv igen." }, { status: 500 });
  }
}
