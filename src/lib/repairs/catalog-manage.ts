/**
 * Kataloghåndtering (Varer, Reparationer): træ med inaktive modeller, en models reparationer
 * inkl. inaktive, adgangskontrol og revalidering af hjemmesidens reparationssider.
 * Hjemmesiden læser aktive modeller og reparationer direkte, så en ændring her er live på phonespot.dk.
 */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/client";
import { loadLocationIndex, requireStaffScope, unauthorizedResponse, type StaffWithScope } from "@/lib/auth/store-scope-server";
import { canSeeCost, type StockRow } from "@/lib/repairs/availability";
import { buildServicesResponse, type BrandRow, type ModelRow, type PartLinkRow, type ServiceRow } from "@/lib/repairs/catalog";
import { PARENT_BRAND_META, PARENT_BRAND_ORDER, parentBrandKey } from "@/lib/repairs/parent-brands";
import type { CaseStore } from "@/lib/repairs/new-case-types";
import type {
  ManageBrandNode,
  ManageModelNode,
  ManageModelResponse,
  ManageParentNode,
  ManageSeriesNode,
  ManageTreeResponse,
} from "@/lib/repairs/catalog-manage-types";

type Db = SupabaseClient;

/* ------------------------------------------------------------------ */
/*  Adgang                                                              */
/* ------------------------------------------------------------------ */

/** Kun ejer og manager redigerer kataloget (priser og aktivering er live på hjemmesiden). */
export async function requireCatalogEditor(request: Request): Promise<{ ctx: StaffWithScope } | { response: NextResponse }> {
  const ctx = await requireStaffScope(request);
  if (!ctx) return { response: unauthorizedResponse() };
  if (!canSeeCost(ctx.staff.role)) {
    return { response: NextResponse.json({ error: "Kun managere og ejere kan redigere reparationskataloget" }, { status: 403 }) };
  }
  return { ctx };
}

/* ------------------------------------------------------------------ */
/*  Hjemmesidens cache                                                  */
/* ------------------------------------------------------------------ */

/**
 * /reparation-siderne har revalidate = 3600. Efter en ændring genopbygges model-, mærke- og
 * oversigtssiden med det samme, så en ny pris eller en ny model er live uden at vente en time.
 */
export function revalidateRepairPages(target: { brandSlug?: string | null; modelSlug?: string | null }): void {
  try {
    if (target.brandSlug && target.modelSlug) revalidatePath(`/reparation/${target.brandSlug}/${target.modelSlug}`);
    if (target.brandSlug) revalidatePath(`/reparation/${target.brandSlug}`);
    revalidatePath("/reparation");
  } catch (err) {
    // En mislykket revalidering må aldrig vælte selve ændringen; siden genopbygges inden for en time.
    console.error("[repair-catalog] revalidate failed:", err);
  }
}

/** Mærke- og modelslug for en model, til revalidering. */
export async function modelSlugs(db: Db, modelId: string): Promise<{ brandSlug: string | null; modelSlug: string | null }> {
  const { data } = await db.from("repair_models").select("slug, repair_brands(slug)").eq("id", modelId).maybeSingle();
  const row = data as { slug: string; repair_brands: { slug: string } | { slug: string }[] | null } | null;
  if (!row) return { brandSlug: null, modelSlug: null };
  const brand = Array.isArray(row.repair_brands) ? row.repair_brands[0] : row.repair_brands;
  return { brandSlug: brand?.slug ?? null, modelSlug: row.slug };
}

/* ------------------------------------------------------------------ */
/*  Træ                                                                 */
/* ------------------------------------------------------------------ */

const OTHER_SERIES = "Øvrige";

function byName(a: string, b: string): number {
  return a.localeCompare(b, "da", { numeric: true, sensitivity: "base" });
}

function seriesCompare(a: string, b: string): number {
  if (a === OTHER_SERIES) return 1;
  if (b === OTHER_SERIES) return -1;
  const na = /\d+/.exec(a)?.[0];
  const nb = /\d+/.exec(b)?.[0];
  if (na && nb && a.replace(/\d+/, "") === b.replace(/\d+/, "")) return Number(nb) - Number(na);
  return byName(a, b);
}

export type ManageModelRow = ModelRow & { active: boolean };
export type ServiceCountRow = { model_id: string; active: boolean; price_dkk: number | null };

export function buildManageTree(brands: BrandRow[], models: ManageModelRow[], services: ServiceCountRow[]): ManageTreeResponse {
  const counts = new Map<string, { total: number; live: number }>();
  for (const s of services) {
    const c = counts.get(s.model_id) ?? { total: 0, live: 0 };
    c.total += 1;
    if (s.active && (s.price_dkk ?? 0) > 0) c.live += 1;
    counts.set(s.model_id, c);
  }
  const modelsByBrand = new Map<string, ManageModelRow[]>();
  for (const m of models) modelsByBrand.set(m.brand_id, [...(modelsByBrand.get(m.brand_id) ?? []), m]);

  const nodes = new Map<string, ManageBrandNode[]>();
  for (const b of [...brands].sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0) || byName(x.name, y.name))) {
    const list = modelsByBrand.get(b.id) ?? [];
    const bySeries = new Map<string, ManageModelRow[]>();
    for (const m of list) {
      const key = m.series?.trim() || OTHER_SERIES;
      bySeries.set(key, [...(bySeries.get(key) ?? []), m]);
    }
    const series: ManageSeriesNode[] = [...bySeries.entries()]
      .sort(([x], [y]) => seriesCompare(x, y))
      .map(([name, ms]) => ({
        name,
        models: [...ms]
          .sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0) || byName(x.name, y.name))
          .map<ManageModelNode>((m) => ({
            id: m.id,
            slug: m.slug,
            name: m.name,
            image_url: m.image_url,
            active: m.active,
            series: m.series,
            live_services: counts.get(m.id)?.live ?? 0,
            total_services: counts.get(m.id)?.total ?? 0,
          })),
      }));
    const key = parentBrandKey(b.slug);
    nodes.set(key, [...(nodes.get(key) ?? []), { id: b.id, slug: b.slug, name: b.name, device_type: b.device_type, series }]);
  }
  const known = PARENT_BRAND_ORDER.filter((k) => nodes.has(k));
  const rest = [...nodes.keys()].filter((k) => !PARENT_BRAND_ORDER.includes(k)).sort(byName);
  const parents: ManageParentNode[] = [...known, ...rest].map((key) => ({
    key,
    name: PARENT_BRAND_META[key]?.name ?? nodes.get(key)?.[0]?.name ?? key,
    brands: nodes.get(key) ?? [],
  }));
  return { parents };
}

async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < size) return out;
  }
}

export async function loadManageTree(db: Db = createServerClient()): Promise<ManageTreeResponse> {
  const [brands, models, services] = await Promise.all([
    fetchAll<BrandRow>((from, to) =>
      db.from("repair_brands").select("id, slug, name, device_type, logo_url, sort_order").eq("active", true).order("id").range(from, to),
    ),
    fetchAll<ManageModelRow>((from, to) =>
      db.from("repair_models").select("id, brand_id, slug, name, series, image_url, sort_order, active").order("id").range(from, to),
    ),
    fetchAll<ServiceCountRow>((from, to) => db.from("repair_services").select("model_id, active, price_dkk").order("id").range(from, to)),
  ]);
  return buildManageTree(brands, models, services);
}

/* ------------------------------------------------------------------ */
/*  En models reparationer (inkl. inaktive)                             */
/* ------------------------------------------------------------------ */

type ModelJoin = {
  id: string;
  slug: string;
  name: string;
  series: string | null;
  image_url: string | null;
  active: boolean;
  brand_id: string;
  repair_brands: { slug: string; name: string; device_type: string } | { slug: string; name: string; device_type: string }[] | null;
};

export async function loadManageModel(
  modelId: string,
  location: CaseStore | null,
  db: Db = createServerClient(),
): Promise<ManageModelResponse | null> {
  const { data: model, error: modelError } = await db
    .from("repair_models")
    .select("id, slug, name, series, image_url, active, brand_id, repair_brands(slug, name, device_type)")
    .eq("id", modelId)
    .maybeSingle();
  if (modelError) throw new Error(modelError.message);
  if (!model) return null;
  const m = model as unknown as ModelJoin;
  const brand = Array.isArray(m.repair_brands) ? m.repair_brands[0] : m.repair_brands;

  const { data: serviceRows, error: svcError } = await db
    .from("repair_services")
    .select("id, slug, name, price_dkk, quality_tier, estimated_minutes, warranty_info, service_category, part_mode, sort_order, active")
    .eq("model_id", modelId);
  if (svcError) throw new Error(svcError.message);
  const services = (serviceRows ?? []) as Array<ServiceRow & { active: boolean }>;
  const activeById = new Map(services.map((s) => [s.id, s.active === true]));
  const sortById = new Map(services.map((s) => [s.id, s.sort_order ?? 0]));

  const serviceIds = services.map((s) => s.id);
  const links: PartLinkRow[] = [];
  if (serviceIds.length > 0) {
    const { data, error } = await db
      .from("repair_service_parts")
      .select("repair_service_id, sku_product_id, is_primary, sku_products(title, always_in_stock, cost_price)")
      .in("repair_service_id", serviceIds);
    if (error) throw new Error(error.message);
    for (const r of (data ?? []) as unknown as Array<{
      repair_service_id: string;
      sku_product_id: string;
      is_primary: boolean;
      sku_products: { title: string | null; always_in_stock: boolean | null; cost_price: number | null } | null;
    }>) {
      links.push({
        repair_service_id: r.repair_service_id,
        sku_product_id: r.sku_product_id,
        is_primary: r.is_primary,
        title: r.sku_products?.title ?? null,
        always_in_stock: r.sku_products?.always_in_stock ?? null,
        cost_price: r.sku_products?.cost_price ?? null,
      });
    }
  }

  const skuIds = [...new Set(links.map((l) => l.sku_product_id))];
  const index = await loadLocationIndex();
  let stock: StockRow[] = [];
  if (skuIds.length > 0) {
    const { data, error } = await db.from("sku_stock").select("product_id, location_id, quantity, reserved_qty").in("product_id", skuIds);
    if (error) throw new Error(error.message);
    stock = (data ?? []) as StockRow[];
  }

  const built = buildServicesResponse({
    model: {
      id: m.id,
      name: m.name,
      brand_name: brand?.name ?? "",
      brand_slug: brand?.slug ?? "",
      series: m.series,
      image_url: m.image_url,
      device_type: brand?.device_type ?? "smartphone",
    },
    services,
    partLinks: links,
    stock,
    inTransit: {},
    location,
    locationIdBySlug: index.idBySlug as Partial<Record<CaseStore | "webshop", string>>,
    includeCost: true,
  });

  const categories = built.categories.map((c) => ({
    name: c.name,
    services: c.services.map((s) => ({ ...s, active: activeById.get(s.id) ?? false, sort_order: sortById.get(s.id) ?? 0 })),
  }));
  const all = categories.flatMap((c) => c.services);
  return {
    model: {
      id: m.id,
      slug: m.slug,
      name: m.name,
      series: m.series,
      image_url: m.image_url,
      active: m.active,
      brand_id: m.brand_id,
      brand_name: brand?.name ?? "",
      brand_slug: brand?.slug ?? "",
      device_type: brand?.device_type ?? "smartphone",
    },
    categories,
    summary: {
      total: all.length,
      active: all.filter((s) => s.active).length,
      live: all.filter((s) => s.active && s.price_dkk > 0).length,
      priced_inactive: all.filter((s) => !s.active && s.price_dkk > 0).length,
    },
  };
}
