import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";
import { canAccessStore } from "@/lib/auth/store-scope";
import { storeLocations } from "@/lib/accessory-intake/candidates";
import { closeBox, currentOpenBox, openBox } from "@/lib/lagersalg/boxes";
import { toPosError } from "@/lib/pos/errors";

/**
 * Lagersalgskasser pr. butik (optagelsen).
 *
 * GET  ?store=vejle → { open: SaleBox | null, nextNumber }  (nextNumber = højeste nummer + 1)
 * POST { store, action: "open" }                → { opened }
 * POST { store, action: "close", boxId }        → { closed, opened }  (lukker og åbner altid næste)
 * Praktikanter må bruge begge, kun i deres egen butik.
 */

const STORES = ["vejle", "slagelse"] as const;

const postSchema = z.discriminatedUnion("action", [
  z.object({ store: z.enum(STORES), action: z.literal("open") }),
  z.object({ store: z.enum(STORES), action: z.literal("close"), boxId: z.string().uuid() }),
]);

async function locationFor(store: (typeof STORES)[number]) {
  const db = createAdminClient();
  const location = (await storeLocations(db)).find((l) => l.name.toLowerCase() === store);
  return { db, location };
}

export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: "Kun medarbejdere" }, { status: 401 });

  const store = new URL(request.url).searchParams.get("store") ?? "";
  if (!(STORES as readonly string[]).includes(store)) {
    return NextResponse.json({ error: "Ugyldig butik" }, { status: 400 });
  }
  if (!canAccessStore(staff, store)) {
    return NextResponse.json({ error: "Du har ikke adgang til den butik" }, { status: 403 });
  }

  try {
    const { db, location } = await locationFor(store as (typeof STORES)[number]);
    if (!location) return NextResponse.json({ error: "Butikken findes ikke" }, { status: 404 });
    const open = await currentOpenBox(db, location.id);
    const { data, error } = await db
      .from("sale_boxes")
      .select("number")
      .eq("location_id", location.id)
      .order("number", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return NextResponse.json({ open, nextNumber: (data?.[0]?.number ?? 0) + 1 });
  } catch {
    return NextResponse.json({ error: "Kasserne kunne ikke hentes. Prøv igen." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: "Kun medarbejdere" }, { status: 401 });

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  const input = parsed.data;
  if (!canAccessStore(staff, input.store)) {
    return NextResponse.json({ error: "Du har ikke adgang til den butik" }, { status: 403 });
  }

  try {
    const { db, location } = await locationFor(input.store);
    if (!location) return NextResponse.json({ error: "Butikken findes ikke" }, { status: 404 });
    if (input.action === "open") {
      return NextResponse.json({ opened: await openBox(db, location.id, staff.id) });
    }
    // Kassen skal høre til den butik, medarbejderen har adgang til.
    const { data: box, error: boxError } = await db
      .from("sale_boxes")
      .select("id, location_id")
      .eq("id", input.boxId)
      .maybeSingle();
    if (boxError) throw new Error(boxError.message);
    if (!box || box.location_id !== location.id) {
      return NextResponse.json({ error: "Kassen findes ikke" }, { status: 404 });
    }
    return NextResponse.json(await closeBox(db, input.boxId, staff.id, true));
  } catch (err) {
    const pos = toPosError(err);
    if (pos) return NextResponse.json({ error: pos.message, code: pos.code }, { status: pos.status });
    return NextResponse.json({ error: "Kassen kunne ikke opdateres. Prøv igen." }, { status: 500 });
  }
}
