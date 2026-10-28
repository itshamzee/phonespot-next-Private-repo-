import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";
import { canAccessStore } from "@/lib/auth/store-scope";
import { adjustStock } from "@/lib/pos/sessions";

/**
 * Hurtig lageroptagelse med stregkode (/admin/produkter/hurtig-cover).
 *
 * GET  ?ean=…  → varen med den stregkode og antal pr. butik, eller { product: null }
 * POST { productId, store, quantity } → lægger antal på lager i butikken
 *       (pos_adjust_stock, årsag "receive", så reguleringen er logget med medarbejder).
 *       Kun tilbehør, og kun i en butik medarbejderen har adgang til (ejeren: alle).
 */

const STORES = ["vejle", "slagelse"] as const;

async function storeLocations(db: ReturnType<typeof createAdminClient>) {
  const { data } = await db.from("locations").select("id, name, type").eq("type", "store");
  return (data ?? []) as { id: string; name: string; type: string }[];
}

export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: "Kun medarbejdere" }, { status: 401 });

  // EAN-cifre eller leverandørkoder som "RIX02646" (Code 128). Kun bogstaver,
  // cifre og bindestreg, så værdien er sikker i PostgREST-filteret nedenfor.
  const ean = new URL(request.url).searchParams.get("ean")?.trim() ?? "";
  if (!/^[A-Za-z0-9-]{4,32}$/.test(ean)) {
    return NextResponse.json({ error: "Stregkoden kan ikke læses. Prøv igen." }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: products, error } = await db
    .from("sku_products")
    .select("id, title, slug, subcategory, selling_price, images, status, compatible_models")
    .or(`ean.eq.${ean},barcode.eq.${ean}`)
    .eq("category", "accessory")
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) return NextResponse.json({ error: "Opslaget fejlede. Prøv igen." }, { status: 503 });
  const product = products?.[0];
  if (!product) return NextResponse.json({ product: null });

  const [locations, { data: stock }] = await Promise.all([
    storeLocations(db),
    db.from("sku_stock").select("location_id, quantity").eq("product_id", product.id),
  ]);
  const byStore = Object.fromEntries(
    locations.map((l) => [
      l.name.toLowerCase(),
      (stock ?? []).find((s) => s.location_id === l.id)?.quantity ?? 0,
    ]),
  );
  return NextResponse.json({ product: { ...product, stock: byStore } });
}

const postSchema = z.object({
  productId: z.string().uuid(),
  store: z.enum(STORES),
  quantity: z.number().int().min(1).max(1000),
});

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: "Kun medarbejdere" }, { status: 401 });

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldigt antal eller butik" }, { status: 400 });
  const { productId, store, quantity } = parsed.data;
  if (!canAccessStore(staff, store)) {
    return NextResponse.json({ error: "Du har ikke adgang til lageret i den butik" }, { status: 403 });
  }

  const db = createAdminClient();
  const { data: product } = await db.from("sku_products").select("category").eq("id", productId).maybeSingle();
  if (product?.category !== "accessory") {
    return NextResponse.json({ error: "Kun tilbehør kan lægges på lager her" }, { status: 400 });
  }
  const location = (await storeLocations(db)).find((l) => l.name.toLowerCase() === store);
  if (!location) return NextResponse.json({ error: "Butikken findes ikke" }, { status: 404 });

  try {
    const result = await adjustStock({
      productId,
      locationId: location.id,
      delta: quantity,
      reason: "receive",
      note: "Hurtig optagelse",
      staffId: staff.id,
    });
    revalidatePath("/tilbehoer", "layout");
    revalidatePath("/covers-udsalg");
    return NextResponse.json({ quantity: result.quantity });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lageret blev ikke opdateret" },
      { status: 500 },
    );
  }
}
