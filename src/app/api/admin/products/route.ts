import { requireStaff } from "@/lib/auth/require-staff";
import { INTERN_ROLE } from "@/lib/auth/intern-access";
import { canAccessStore } from "@/lib/auth/store-scope";
import type { StaffIdentity } from "@/lib/auth/require-staff";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildAccessoryRows,
  buildSparePartRow,
  resolveStockRows,
  uniqueSlugs,
  type LocationRow,
  type SkuProductRow,
  type StockSpec,
} from "@/lib/admin/products/create";
import { modelsForProduct } from "@/lib/admin/products/update";
import { ACCESSORY_CATEGORY_TO_SLUG } from "@/lib/tilbehoer-config";
import { isLagersalg } from "@/lib/lagersalg/is-lagersalg";
import { addToBox, currentOpenBox } from "@/lib/lagersalg/boxes";

/**
 * POST /api/admin/products — ét opret-endpoint for alt der bor i sku_products.
 * Bag middleware (cookie-session). Modtager 1–100 varer i ét kald og opretter
 * dem sammen med lager, så alle opret-flows i admin skriver på samme måde.
 */

const stockSchema = z
  .object({
    online: z.number().int().min(0).nullable().optional(),
    stores: z.record(z.string(), z.number().int().min(0).nullable().optional()).optional(),
  })
  .optional();

const accessoryItem = z.object({
  title: z.string().min(1),
  subcategory: z.string().min(1),
  brand: z.string().nullable().optional(),
  models: z.array(z.string()).default([]),
  mode: z.enum(["per-model", "universal"]).default("universal"),
  sellingPrice: z.number().int(),
  salePrice: z.number().int().nullable().optional(),
  costPrice: z.number().int().nullable().optional(),
  ean: z.string().nullable().optional(),
  images: z.array(z.string()).default([]),
  description: z.string().nullable().optional(),
  shortDescription: z.string().nullable().optional(),
  highlights: z.array(z.string()).max(6).optional(),
  attributes: z.record(z.string(), z.string().nullable().optional()).optional(),
  alwaysInStock: z.boolean().optional(),
  status: z.enum(["published", "draft"]).optional(),
  stock: stockSchema,
});

const sparePartItem = z.object({
  title: z.string().min(1),
  sellingPrice: z.number().int(),
  salePrice: z.number().int().nullable().optional(),
  costPrice: z.number().int().nullable().optional(),
  partCategoryId: z.string().nullable().optional(),
  qualityTierId: z.string().nullable().optional(),
  warrantyMonths: z.number().int().nullable().optional(),
  deviceBrand: z.string().nullable().optional(),
  deviceSeries: z.string().nullable().optional(),
  deviceModel: z.string().nullable().optional(),
  ean: z.string().nullable().optional(),
  images: z.array(z.string()).default([]),
  description: z.string().nullable().optional(),
  isInquiryOnly: z.boolean().optional(),
  alwaysInStock: z.boolean().optional(),
  status: z.enum(["published", "draft"]).optional(),
  stock: stockSchema,
});

const bodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("accessory"), items: z.array(accessoryItem).min(1).max(100) }),
  z.object({ type: z.literal("spare-part"), items: z.array(sparePartItem).min(1).max(100) }),
]);

/**
 * GET /api/admin/products — pagineret liste over tilbehør/reservedele med lager,
 * fra viewet checkout_sku_inventory (samme tal som webshoppen bruger).
 * Params: type (accessory|spare-part), page, limit (≤100), search, subcategory,
 * brand, status (published|draft), stock (in|out|order).
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const type = p.get("type") === "spare-part" ? "spare-part" : "accessory";
  const page = Math.max(1, Number(p.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(p.get("limit")) || 50));
  const search = p.get("search")?.trim() ?? "";
  const subcategory = p.get("subcategory")?.trim() ?? "";
  const brand = p.get("brand")?.trim() ?? "";
  const status = p.get("status");
  const stock = p.get("stock");

  const supabase = createAdminClient();
  let query = supabase
    .from("checkout_sku_inventory")
    .select(
      "id, title, slug, subcategory, brand, selling_price, sale_price, always_in_stock, images, compatible_models, status, is_active, created_at, store_stock, online_stock, total_stock",
      { count: "exact" },
    )
    .eq("category", type);
  if (type === "accessory") query = query.neq("subcategory", "spare-part");
  if (search) query = query.or(`title.ilike.%${search.replace(/[%,]/g, " ")}%,brand.ilike.%${search.replace(/[%,]/g, " ")}%`);
  if (subcategory) query = query.eq("subcategory", subcategory);
  if (brand) query = query.ilike("brand", brand);
  if (status === "published" || status === "draft") query = query.eq("status", status);
  if (stock === "in") query = query.gt("total_stock", 0);
  else if (stock === "out") query = query.eq("total_stock", 0).eq("always_in_stock", false);
  else if (stock === "order") query = query.eq("always_in_stock", true);

  const from = (page - 1) * limit;
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, from + limit - 1);
  if (error) return NextResponse.json({ error: "Produkterne kunne ikke hentes" }, { status: 503 });

  // "Passer til" har to kilder. Listen viser dem samlet, så et produkt med
  // skabelon-koblinger (den gamle formular) ikke ser ud til at mangle modeller.
  const rows = data ?? [];
  const names = new Map<string, string[]>();
  if (rows.length) {
    const { data: links } = await supabase
      .from("sku_product_templates")
      .select("sku_product_id, product_templates(display_name)")
      .in("sku_product_id", rows.map((r) => r.id));
    for (const l of (links ?? []) as unknown as { sku_product_id: string; product_templates: { display_name: string | null } | null }[]) {
      const name = l.product_templates?.display_name;
      if (name) names.set(l.sku_product_id, [...(names.get(l.sku_product_id) ?? []), name]);
    }
  }
  const items = rows.map((r) => ({ ...r, models: modelsForProduct(r.compatible_models, names.get(r.id) ?? []) }));
  return NextResponse.json({ items, total: count ?? 0, page, limit });
}

export interface CreatedProduct {
  id: string;
  slug: string;
  title: string;
  url: string;
  boxNumber?: number | null;
}

function publicUrl(row: { slug: string; category: string; subcategory: string }): string {
  if (row.category === "spare-part") return `/reservedele?soeg=${encodeURIComponent(row.slug)}`;
  const category = ACCESSORY_CATEGORY_TO_SLUG[row.subcategory] ?? "andet";
  return `/tilbehoer/${category}/${row.slug}`;
}

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);

  // Praktikanter må kun oprette tilbehør (hurtig-optagelsen).
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Kun medarbejdere" }, { status: 401 });
  if (staff.role === INTERN_ROLE && raw?.type !== "accessory") {
    return NextResponse.json({ error: "Du kan kun oprette tilbehør" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ugyldige felter", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }
  const body = parsed.data;
  // Butiksafgrænsning: alle andre end ejeren må kun lægge lager i egne butikker.
  for (const item of body.items) {
    for (const store of Object.keys(item.stock?.stores ?? {})) {
      if (!canAccessStore(staff, store)) {
        return NextResponse.json({ error: "Du har ikke adgang til lageret i den butik" }, { status: 403 });
      }
    }
  }
  if (staff.role === INTERN_ROLE && body.type === "accessory") {
    const denied = internCreateError(staff, body.items);
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });
  }

  // 1. Byg rækker rent (kaster med dansk fejltekst ved forkerte værdier).
  const planned: { row: SkuProductRow; stock?: StockSpec }[] = [];
  try {
    if (body.type === "accessory") {
      for (const item of body.items) {
        for (const row of buildAccessoryRows(item)) planned.push({ row, stock: item.stock ?? undefined });
      }
    } else {
      for (const item of body.items) planned.push({ row: buildSparePartRow(item), stock: item.stock ?? undefined });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Kunne ikke bygge produktet" }, { status: 400 });
  }
  if (planned.length > 200) {
    return NextResponse.json({ error: "Højst 200 produkter pr. oprettelse" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 2. Unikke slugs: hent alt der ligner de ønskede slugs, og giv løbenumre.
  const bases = [...new Set(planned.map((p) => p.row.slug))];
  const { data: existing, error: slugError } = await supabase
    .from("sku_products")
    .select("slug")
    .or(bases.map((b) => `slug.like.${b}%`).join(","));
  if (slugError) return NextResponse.json({ error: "Kunne ikke kontrollere links (slugs)" }, { status: 503 });
  const taken = new Set((existing ?? []).map((r) => r.slug as string).filter(Boolean));
  const slugs = uniqueSlugs(planned.map((p) => p.row.slug), taken);
  planned.forEach((p, i) => (p.row.slug = slugs[i]));

  // 3. Opret produkterne i ét kald.
  const { data: inserted, error: insertError } = await supabase
    .from("sku_products")
    .insert(planned.map((p) => p.row))
    .select("id, slug, title, category, subcategory");
  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message ?? "Produkterne blev ikke oprettet" }, { status: 500 });
  }

  // 4. Lager. Rækkefølgen fra insert svarer til planned.
  const boxNumbers = new Map<string, number>();
  const warnings: string[] = [];
  let locations: LocationRow[] = [];
  const needsStock = planned.some((p) => p.stock && (p.stock.online || Object.keys(p.stock.stores ?? {}).length));
  if (needsStock) {
    const { data: locationData } = await supabase.from("locations").select("id, name, type");
    locations = (locationData ?? []) as LocationRow[];
    const stockRows: { product_id: string; location_id: string; quantity: number }[] = [];
    inserted.forEach((product, i) => {
      const spec = planned[i]?.stock;
      if (!spec) return;
      for (const r of resolveStockRows(locations, spec)) {
        stockRows.push({ product_id: product.id, ...r });
      }
    });
    if (stockRows.length) {
      const { error: stockError } = await supabase
        .from("sku_stock")
        .upsert(stockRows, { onConflict: "product_id,location_id" });
      if (stockError) {
        return NextResponse.json(
          { error: "Produkterne er oprettet, men lageret kunne ikke gemmes", created: inserted },
          { status: 207 },
        );
      }
    }
  }

  // 5. Lagersalgsvarer med butikslager lægges i butikkens åbne kasse. Mangler kassen,
  // oprettes varen alligevel (en masseimport må ikke blokeres), og svaret får en advarsel.
  if (needsStock && body.type === "accessory") {
    const openByStore = new Map<string, Awaited<ReturnType<typeof currentOpenBox>>>();
    const warned = new Set<string>();
    for (const [i, product] of inserted.entries()) {
      const plan = planned[i];
      if (!plan || !isLagersalg(plan.row)) continue;
      for (const [store, qty] of Object.entries(plan.stock?.stores ?? {})) {
        if (!qty || qty <= 0) continue;
        const location = locations.find(
          (l) => l.type === "store" && l.name?.toLowerCase() === store.toLowerCase(),
        );
        if (!location) continue;
        let failed = false;
        try {
          if (!openByStore.has(location.id)) openByStore.set(location.id, await currentOpenBox(supabase, location.id));
          const box = openByStore.get(location.id);
          if (box) {
            await addToBox(supabase, product.id, box.id, Math.round(qty));
            boxNumbers.set(product.id, box.number);
            continue;
          }
        } catch {
          // Faldt kassen ud (fx lukket midt i importen), må importen ikke blokeres.
          failed = true;
        }
        const label = location.name ?? store;
        const text = failed
          ? `Varen kunne ikke lægges i kasse i ${label}: ${product.title} er oprettet uden kasse`
          : `Ingen åben kasse i ${label}: varen er oprettet uden kasse`;
        if (failed || !warned.has(label)) {
          warned.add(label);
          warnings.push(text);
        }
      }
    }
  }

  revalidatePath(body.type === "accessory" ? "/tilbehoer" : "/reservedele", "layout");
  if (body.type === "accessory") revalidatePath("/lagersalg", "layout");

  const created: CreatedProduct[] = inserted.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    url: publicUrl(row),
    boxNumber: boxNumbers.get(row.id) ?? null,
  }));
  return NextResponse.json(
    { created, count: created.length, ...(warnings.length ? { warnings } : {}) },
    { status: 201 },
  );
}

/** Hurtig-optagelsens rammer for praktikanter: lav pris, kun egen butik, intet online-/altid-på-lager. */
function internCreateError(
  staff: StaffIdentity,
  items: z.infer<typeof accessoryItem>[],
): string | null {
  if (items.length > 1) return "Opret én vare ad gangen";
  for (const item of items) {
    if (item.sellingPrice > 50_000) return "Prisen er for høj til hurtig-optagelsen";
    if (item.salePrice != null) return "Praktikanter kan ikke sætte en tilbudspris";
    if (item.mode !== "universal" || item.models.length > 10) return "Opret én vare ad gangen";
    if (item.alwaysInStock) return "Praktikanter kan ikke sætte varer altid på lager";
    if (item.stock?.online) return "Praktikanter kan kun lægge varer på lager i butikken";
    for (const store of Object.keys(item.stock?.stores ?? {})) {
      if (!canAccessStore(staff, store)) return "Du har ikke adgang til lageret i den butik";
    }
  }
  return null;
}
