import { NextResponse } from "next/server";
import { bulkCreateAccessories } from "@/lib/supabase/accessories";
import type { Accessory } from "@/lib/supabase/platform-types";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const {
    name_pattern,
    category,
    brand,
    models,
    price,
    cost_price,
    image_url,
    description,
    online_stock,
    store_stock,
    store_id,
  } = body;

  if (!name_pattern || !category || !Array.isArray(models) || models.length === 0) {
    return NextResponse.json(
      { error: "name_pattern, category og models (array) er påkrævet" },
      { status: 400 }
    );
  }

  if (price === undefined || cost_price === undefined || !store_id) {
    return NextResponse.json(
      { error: "price, cost_price og store_id er påkrævet" },
      { status: 400 }
    );
  }

  try {
    const accessories = await bulkCreateAccessories({
      name_pattern: String(name_pattern),
      category: category as Accessory["category"],
      brand: brand ? String(brand) : null,
      models: models as string[],
      price: Number(price),
      cost_price: Number(cost_price),
      image_url: image_url ? String(image_url) : null,
      description: description ? String(description) : null,
      online_stock: online_stock !== undefined ? Number(online_stock) : 0,
      store_stock: store_stock !== undefined ? Number(store_stock) : 0,
      store_id: String(store_id),
    });
    return NextResponse.json(
      { created: accessories.length, accessories },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
