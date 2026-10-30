import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";
import { canAccessStore } from "@/lib/auth/store-scope";
import { adjustStock } from "@/lib/pos/sessions";
import { storeLocations } from "@/lib/accessory-intake/candidates";
import { isLagersalg } from "@/lib/lagersalg/is-lagersalg";
import { toPosError } from "@/lib/pos/errors";
import { addToBox, currentOpenBox } from "@/lib/lagersalg/boxes";

/**
 * Hurtig lageroptagelse med stregkode (/admin/produkter/hurtig-cover).
 *
 * GET  ?ean=…  → varen med den stregkode og antal pr. butik, eller { product: null }
 * POST { productId, store, quantity, publish? } → lægger antal på lager i butikken
 *       (pos_adjust_stock, årsag "receive", så reguleringen er logget med medarbejder).
 *       Kun tilbehør, og kun i en butik medarbejderen har adgang til (ejeren: alle).
 *       publish { priceKr } udgiver en kladde: et cover kommer på udsalg til priceKr,
 *       andre typer udgives til den pris, de har. En publiceret vare får aldrig ny pris herfra.
 */

const STORES = ["vejle", "slagelse"] as const;

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
    .select("id, title, slug, subcategory, brand, selling_price, images, status, compatible_models, attributes")
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
  publish: z.object({ priceKr: z.number().int().min(10).max(2000).optional() }).optional(),
});

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: "Kun medarbejdere" }, { status: 401 });

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldigt antal eller butik" }, { status: 400 });
  const { productId, store, quantity, publish } = parsed.data;
  if (!canAccessStore(staff, store)) {
    return NextResponse.json({ error: "Du har ikke adgang til lageret i den butik" }, { status: 403 });
  }

  const db = createAdminClient();
  const { data: product } = await db
    .from("sku_products")
    .select("category, status, subcategory, selling_price, attributes")
    .eq("id", productId)
    .maybeSingle();
  if (product?.category !== "accessory") {
    return NextResponse.json({ error: "Kun tilbehør kan lægges på lager her" }, { status: 400 });
  }
  const location = (await storeLocations(db)).find((l) => l.name.toLowerCase() === store);
  if (!location) return NextResponse.json({ error: "Butikken findes ikke" }, { status: 404 });

  // En lagersalgsvare (også en kladde, der udgives til udsalg nu) skal i butikkens åbne kasse.
  // Tjekket kommer før lagerreguleringen, så intet gemmes halvt.
  const willBeUdsalg = product.subcategory === "cover" && !!publish?.priceKr && product.status === "draft";
  const lagersalg = isLagersalg({
    subcategory: product.subcategory,
    attributes: willBeUdsalg
      ? { ...((product.attributes as Record<string, string> | null) ?? {}), udsalg: "Ja" }
      : (product.attributes as Record<string, string> | null),
  });
  let box: Awaited<ReturnType<typeof currentOpenBox>> = null;
  if (lagersalg) {
    box = await currentOpenBox(db, location.id);
    if (!box) {
      return NextResponse.json(
        { error: "Åbn en kasse i optagelsen, før varen kan lægges på lager" },
        { status: 409 },
      );
    }
  }

  try {
    const result = await adjustStock({
      productId,
      locationId: location.id,
      delta: quantity,
      reason: "receive",
      note: "Hurtig optagelse",
      staffId: staff.id,
    });
    let published = false;
    let priceOere: number = product.selling_price ?? 0;
    if (publish && product.status === "draft") {
      const update: Record<string, unknown> = { status: "published" };
      if (product.subcategory === "cover" && publish.priceKr) {
        priceOere = publish.priceKr * 100;
        update.selling_price = priceOere;
        update.attributes = { ...((product.attributes as Record<string, string> | null) ?? {}), udsalg: "Ja" };
      }
      const { error } = await db.from("sku_products").update(update).eq("id", productId);
      if (error) throw new Error("Varen blev lagt på lager, men kunne ikke udgives");
      published = true;
    }
    revalidatePath("/tilbehoer", "layout");
    revalidatePath("/lagersalg", "layout");
    if (box) {
      try {
        await addToBox(db, productId, box.id, quantity);
      } catch (boxErr) {
        // Lageret er allerede registreret; kassen kan være lukket imens.
        const pos = toPosError(boxErr);
        if (!pos) throw boxErr;
        return NextResponse.json(
          {
            error:
              pos.code === "box_closed"
                ? "Varen er lagt på lager, men kassen blev lukket imens. Læg den i den nye kasse."
                : pos.message,
            code: pos.code,
            quantity: result.quantity,
            published,
            priceKr: Math.round(priceOere / 100),
            boxNumber: null,
          },
          { status: pos.status },
        );
      }
    }
    return NextResponse.json({
      quantity: result.quantity,
      published,
      priceKr: Math.round(priceOere / 100),
      boxNumber: box?.number ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lageret blev ikke opdateret" },
      { status: 500 },
    );
  }
}
