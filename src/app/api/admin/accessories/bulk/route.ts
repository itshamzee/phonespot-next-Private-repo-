import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Accessory } from "@/lib/supabase/platform-types";

// Maps display-value category labels (from opret form) to DB subcategory values
const CATEGORY_DISPLAY_TO_DB: Record<string, string> = {
  Cover: "cover",
  Skaermbeskyttelse: "screen_protector",
  Oplader: "charger",
  Kabel: "cable",
  Lyd: "audio",
  Andet: "other",
  // Also accept already-correct DB values (lowercase)
  cover: "cover",
  screen_protector: "screen_protector",
  charger: "charger",
  cable: "cable",
  audio: "audio",
  other: "other",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
    // New opret form sends "devices" and "price_oere" / "cost_price_oere" / "image_urls"
    // Old bulk form sends "models" and "price" / "cost_price" / "image_url"
    models,
    devices,
    price,
    price_oere,
    cost_price,
    cost_price_oere,
    image_url,
    image_urls,
    description,
    ean,
    online_stock,
    store_stock,
  } = body;

  if (!name_pattern || !category) {
    return NextResponse.json(
      { error: "name_pattern og category er påkrævet" },
      { status: 400 }
    );
  }

  // Resolve field aliases between old and new form formats
  const resolvedModels: string[] = Array.isArray(models)
    ? (models as string[])
    : Array.isArray(devices)
    ? (devices as string[])
    : [];
  const resolvedPrice = price_oere !== undefined
    ? Number(price_oere)
    : price !== undefined
    ? Number(price)
    : 0;
  const resolvedCostPrice = cost_price_oere !== undefined
    ? Number(cost_price_oere)
    : cost_price !== undefined
    ? Number(cost_price)
    : 0;
  const resolvedImageUrl = Array.isArray(image_urls) && (image_urls as string[]).length > 0
    ? String((image_urls as string[])[0])
    : image_url
    ? String(image_url)
    : null;

  // Map display category label to DB subcategory value
  const dbCategory = CATEGORY_DISPLAY_TO_DB[String(category)];
  if (!dbCategory) {
    return NextResponse.json(
      {
        error: `Ukendt kategori: ${category}. Gyldige: ${Object.keys(CATEGORY_DISPLAY_TO_DB).filter(k => k === k.toLowerCase() || k[0] === k[0].toUpperCase()).join(", ")}`,
      },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    // Build one sku_product row per device/model (or one generic row if none specified)
    const targets = resolvedModels.length > 0 ? resolvedModels : [null];

    const rows = targets.map((model) => {
      const name = model
        ? String(name_pattern).replace(/\{model\}/gi, model)
        : String(name_pattern);
      return {
        title: name,
        slug: slugify(name),
        category: "accessory" as const,
        subcategory: dbCategory as Accessory["category"],
        brand: brand ? String(brand) : null,
        selling_price: resolvedPrice,
        cost_price: resolvedCostPrice,
        ean: ean ? String(ean) : null,
        images: resolvedImageUrl ? [resolvedImageUrl] : [],
        description: description ? String(description) : null,
        status: "published" as const,
        is_active: true,
      };
    });

    const { data, error } = await supabase
      .from("sku_products")
      .insert(rows)
      .select("id, title, slug");

    if (error) throw error;

    // Create stock records if stock values provided
    if (data && (online_stock != null || store_stock != null)) {
      const { data: locations } = await supabase.from("locations").select("id, type");
      const onlineLoc = locations?.find((l: { id: string; type: string }) => l.type === "online");
      const storeLoc = locations?.find((l: { id: string; type: string }) => l.type === "store");

      const stockRows = [];
      for (const product of data) {
        if (onlineLoc && online_stock != null) {
          stockRows.push({ product_id: product.id, location_id: onlineLoc.id, quantity: Number(online_stock) });
        }
        if (storeLoc && store_stock != null) {
          stockRows.push({ product_id: product.id, location_id: storeLoc.id, quantity: Number(store_stock) });
        }
      }
      if (stockRows.length > 0) {
        await supabase.from("sku_stock").upsert(stockRows, { onConflict: "product_id,location_id" });
      }
    }

    return NextResponse.json(
      { count: data?.length ?? 0, created: data?.length ?? 0, accessories: data ?? [] },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
