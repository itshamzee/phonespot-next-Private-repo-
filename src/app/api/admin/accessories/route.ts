import { NextResponse } from "next/server";
import { createAccessory, getAccessories } from "@/lib/supabase/accessories";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category") ?? undefined;
  const brand = searchParams.get("brand") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const model = searchParams.get("model") ?? undefined;
  const store_id = searchParams.get("store_id") ?? undefined;
  const inStoreOnly = searchParams.get("inStoreOnly") === "true";
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

  try {
    const accessories = await getAccessories({
      category,
      brand,
      search,
      status,
      model,
      store_id,
      inStoreOnly,
      limit,
      offset,
    });
    return NextResponse.json(accessories);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const { name, category, price, cost_price, store_id } = body;

  if (!name || !category || price === undefined || cost_price === undefined || !store_id) {
    return NextResponse.json(
      { error: "name, category, price, cost_price og store_id er påkrævet" },
      { status: 400 }
    );
  }

  try {
    const accessory = await createAccessory({
      name: String(name),
      category: category as "cover" | "screen_protector" | "charger" | "cable" | "audio" | "other",
      brand: body.brand ? String(body.brand) : null,
      compatible_models: Array.isArray(body.compatible_models)
        ? (body.compatible_models as string[])
        : [],
      price: Number(price),
      cost_price: Number(cost_price),
      sku: body.sku ? String(body.sku) : null,
      ean: body.ean ? String(body.ean) : null,
      image_url: body.image_url ? String(body.image_url) : null,
      description: body.description ? String(body.description) : null,
      online_stock: body.online_stock !== undefined ? Number(body.online_stock) : 0,
      store_stock: body.store_stock !== undefined ? Number(body.store_stock) : 0,
      store_id: String(store_id),
      status: (body.status as "draft" | "published" | "archived") ?? "draft",
      slug: body.slug ? String(body.slug) : undefined,
    });
    return NextResponse.json(accessory, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
