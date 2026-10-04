/**
 * Reparationskataloget til "Ny sag": mærker -> serier -> modeller, reparationer pr. kategori
 * med reservedelens lagerstatus, og tilkøb til modellen. Opbygningen af svarene er rene
 * funktioner (build*), så de kan testes uden database; load* henter rækkerne.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/client";
import { loadLocationIndex } from "@/lib/auth/store-scope-server";
import type { LocationIndex } from "@/lib/auth/store-scope";
import { CASE_STORES, groupByCategory, shapeStock, stripPartCost, type StockRow } from "@/lib/repairs/availability";
import { productListOere } from "@/lib/repairs/case-pricing";
import { PARENT_BRAND_META, PARENT_BRAND_ORDER, parentBrandKey } from "@/lib/repairs/parent-brands";
import {
  REPAIR_QUALITY_LABELS,
  type CaseStore,
  type CatalogBrand,
  type CatalogParentBrand,
  type CatalogSeries,
  type CatalogTreeResponse,
  type PartMode,
  type RepairQuality,
  type RepairServiceOption,
  type RepairServicesResponse,
  type UpsellDevice,
  type UpsellDevicesResponse,
  type UpsellProduct,
  type UpsellResponse,
} from "@/lib/repairs/new-case-types";

type Db = SupabaseClient;

/** Henter alle rækker i sider (Supabase skærer ved 1000). */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
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

/* ------------------------------------------------------------------ */
/*  Træ                                                                 */
/* ------------------------------------------------------------------ */

export type BrandRow = { id: string; slug: string; name: string; device_type: string; logo_url: string | null; sort_order: number | null };
export type ModelRow = {
  id: string;
  brand_id: string;
  slug: string;
  name: string;
  series: string | null;
  image_url: string | null;
  sort_order: number | null;
};

const OTHER_SERIES = "Øvrige";

/** Naturlig sortering: "iPhone 15" før "iPhone 15 Pro", tal som tal ("iPhone 9" før "iPhone 10"). */
function byName(a: string, b: string): number {
  return a.localeCompare(b, "da", { numeric: true, sensitivity: "base" });
}

/** Nyeste først for serier med tal ("iPhone 16" før "iPhone 15"); ellers alfabetisk. */
function seriesCompare(a: string, b: string): number {
  if (a === OTHER_SERIES) return 1;
  if (b === OTHER_SERIES) return -1;
  const na = /\d+/.exec(a)?.[0];
  const nb = /\d+/.exec(b)?.[0];
  if (na && nb && a.replace(/\d+/, "") === b.replace(/\d+/, "")) return Number(nb) - Number(na);
  return byName(a, b);
}

export function buildCatalogTree(brands: BrandRow[], models: ModelRow[]): CatalogTreeResponse {
  const modelsByBrand = new Map<string, ModelRow[]>();
  for (const m of models) modelsByBrand.set(m.brand_id, [...(modelsByBrand.get(m.brand_id) ?? []), m]);

  const brandNodes = new Map<string, CatalogBrand[]>();
  for (const b of [...brands].sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0) || byName(x.name, y.name))) {
    const list = modelsByBrand.get(b.id) ?? [];
    if (list.length === 0) continue;
    const bySeries = new Map<string, ModelRow[]>();
    for (const m of list) {
      const key = m.series?.trim() || OTHER_SERIES;
      bySeries.set(key, [...(bySeries.get(key) ?? []), m]);
    }
    const series: CatalogSeries[] = [...bySeries.entries()]
      .sort(([x], [y]) => seriesCompare(x, y))
      .map(([name, ms]) => ({
        name,
        models: [...ms]
          .sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0) || byName(x.name, y.name))
          .map((m) => ({ id: m.id, slug: m.slug, name: m.name, image_url: m.image_url })),
      }));
    const node: CatalogBrand = {
      id: b.id,
      slug: b.slug,
      name: b.name,
      device_type: b.device_type,
      logo_url: b.logo_url,
      series,
    };
    const key = parentBrandKey(b.slug);
    brandNodes.set(key, [...(brandNodes.get(key) ?? []), node]);
  }

  const known = PARENT_BRAND_ORDER.filter((k) => brandNodes.has(k));
  const rest = [...brandNodes.keys()].filter((k) => !PARENT_BRAND_ORDER.includes(k)).sort(byName);
  const parents: CatalogParentBrand[] = [...known, ...rest].map((key) => {
    const brandsForKey = brandNodes.get(key) ?? [];
    const meta = PARENT_BRAND_META[key];
    return { key, name: meta?.name ?? brandsForKey[0]?.name ?? key, logo: meta?.logo ?? null, brands: brandsForKey };
  });
  return { parents };
}

export async function loadCatalogTree(db: Db = createServerClient()): Promise<CatalogTreeResponse> {
  const [brands, models] = await Promise.all([
    fetchAll<BrandRow>((from, to) =>
      db.from("repair_brands").select("id, slug, name, device_type, logo_url, sort_order").eq("active", true).order("id").range(from, to),
    ),
    fetchAll<ModelRow>((from, to) =>
      db
        .from("repair_models")
        .select("id, brand_id, slug, name, series, image_url, sort_order")
        .eq("active", true)
        .order("id")
        .range(from, to),
    ),
  ]);
  return buildCatalogTree(brands, models);
}

/* ------------------------------------------------------------------ */
/*  Reparationer pr. model                                              */
/* ------------------------------------------------------------------ */

export type ServiceRow = {
  id: string;
  slug: string;
  name: string;
  price_dkk: number;
  quality_tier: RepairQuality | null;
  estimated_minutes: number | null;
  warranty_info: string | null;
  service_category: string | null;
  part_mode: PartMode | null;
  sort_order: number | null;
};

export type PartLinkRow = {
  repair_service_id: string;
  sku_product_id: string;
  is_primary: boolean;
  title: string | null;
  always_in_stock: boolean | null;
  cost_price: number | null;
};

export type BuildServicesInput = {
  model: RepairServicesResponse["model"];
  services: ServiceRow[];
  partLinks: PartLinkRow[];
  stock: StockRow[];
  /** sku_product_id -> antal på vej til butikken. */
  inTransit: Record<string, number>;
  location: CaseStore | null;
  locationIdBySlug: Partial<Record<CaseStore | "webshop", string>>;
  includeCost: boolean;
};

export function buildServicesResponse(input: BuildServicesInput): RepairServicesResponse {
  const stockBySku = new Map<string, StockRow[]>();
  for (const r of input.stock) stockBySku.set(r.product_id, [...(stockBySku.get(r.product_id) ?? []), r]);

  // Primær del først; ellers den første kobling.
  const linkByService = new Map<string, PartLinkRow>();
  for (const l of [...input.partLinks].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))) {
    if (!linkByService.has(l.repair_service_id)) linkByService.set(l.repair_service_id, l);
  }

  const options: Array<RepairServiceOption & { _category: string | null; _sort: number }> = [...input.services]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((s) => {
      const link = linkByService.get(s.id);
      const mode: PartMode = s.part_mode ?? "manual";
      const part = link
        ? {
            sku_product_id: link.sku_product_id,
            title: link.title,
            ...shapeStock({
              alwaysInStock: link.always_in_stock,
              rows: stockBySku.get(link.sku_product_id) ?? [],
              location: input.location,
              locationIdBySlug: input.locationIdBySlug,
              inTransit: input.inTransit[link.sku_product_id] ?? 0,
            }),
            ...(input.includeCost ? { cost_oere: link.cost_price } : {}),
          }
        : null;
      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        price_dkk: s.price_dkk,
        price_oere: Math.round(s.price_dkk * 100),
        quality_tier: s.quality_tier,
        quality_label: s.quality_tier ? REPAIR_QUALITY_LABELS[s.quality_tier] : null,
        estimated_minutes: s.estimated_minutes,
        warranty_info: s.warranty_info,
        part_mode: mode,
        part,
        _category: s.service_category,
        _sort: s.sort_order ?? 0,
      };
    });

  const categoryOf = new Map(options.map((o) => [o.id, o._category]));
  const clean = options.map(({ _category, _sort, ...rest }) => {
    void _category;
    void _sort;
    return rest as RepairServiceOption;
  });
  const categories = groupByCategory(clean, (s) => categoryOf.get(s.id) ?? null);
  return {
    model: input.model,
    location: input.location,
    categories: input.includeCost
      ? categories
      : categories.map((c) => ({ ...c, services: c.services.map((s) => stripPartCost(s)) })),
  };
}

type ModelJoin = {
  id: string;
  name: string;
  series: string | null;
  image_url: string | null;
  repair_brands: { slug: string; name: string; device_type: string } | { slug: string; name: string; device_type: string }[] | null;
};

function locationMaps(index: LocationIndex) {
  return {
    idBySlug: index.idBySlug as Partial<Record<CaseStore | "webshop", string>>,
  };
}

/** Antal på vej til butikken pr. vare (afsendte overførsler, endnu ikke modtaget eller returneret). */
async function loadInTransit(db: Db, skuIds: string[], locationId: string | null): Promise<Record<string, number>> {
  if (!locationId || skuIds.length === 0) return {};
  const { data, error } = await db
    .from("stock_transfer_lines")
    .select("sku_product_id, sent_qty, received_qty, returned_qty, stock_transfers!inner(status, to_location_id)")
    .in("sku_product_id", skuIds)
    .eq("stock_transfers.status", "sent")
    .eq("stock_transfers.to_location_id", locationId);
  if (error) {
    console.error("[repair-catalog] in-transit lookup failed:", error.message);
    return {};
  }
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as Array<{ sku_product_id: string | null; sent_qty: number; received_qty: number; returned_qty: number }>) {
    if (!r.sku_product_id) continue;
    out[r.sku_product_id] = (out[r.sku_product_id] ?? 0) + Math.max(0, r.sent_qty - r.received_qty - r.returned_qty);
  }
  return out;
}

export async function loadModelServices(
  modelId: string,
  location: CaseStore | null,
  includeCost: boolean,
  db: Db = createServerClient(),
): Promise<RepairServicesResponse | null> {
  const { data: model, error: modelError } = await db
    .from("repair_models")
    .select("id, name, series, image_url, repair_brands(slug, name, device_type)")
    .eq("id", modelId)
    .eq("active", true)
    .maybeSingle();
  if (modelError) throw new Error(modelError.message);
  if (!model) return null;
  const m = model as unknown as ModelJoin;
  const brand = Array.isArray(m.repair_brands) ? m.repair_brands[0] : m.repair_brands;

  const { data: serviceRows, error: svcError } = await db
    .from("repair_services")
    .select("id, slug, name, price_dkk, quality_tier, estimated_minutes, warranty_info, service_category, part_mode, sort_order")
    .eq("model_id", modelId)
    .eq("active", true);
  if (svcError) throw new Error(svcError.message);
  const services = (serviceRows ?? []) as ServiceRow[];

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
  const { idBySlug } = locationMaps(index);
  let stock: StockRow[] = [];
  if (skuIds.length > 0) {
    const { data, error } = await db
      .from("sku_stock")
      .select("product_id, location_id, quantity, reserved_qty")
      .in("product_id", skuIds);
    if (error) throw new Error(error.message);
    stock = (data ?? []) as StockRow[];
  }
  const inTransit = await loadInTransit(db, skuIds, location ? (idBySlug[location] ?? null) : null);

  return buildServicesResponse({
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
    inTransit,
    location,
    locationIdBySlug: idBySlug,
    includeCost,
  });
}

/* ------------------------------------------------------------------ */
/*  Tilkøb                                                              */
/* ------------------------------------------------------------------ */

export type UpsellRow = {
  id: string;
  title: string;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  selling_price: number;
  sale_price: number | null;
  images: string[] | null;
  always_in_stock: boolean | null;
};

/** Søgetekst til ilike: kun bogstaver, tal og mellemrum, så ingen operatorer slipper ind i filteret. */
export function sanitizeSearch(q: string | null | undefined): string {
  return (q ?? "").replace(/[^\p{L}\p{N}\s.\-+]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

/** Navne en model kan stå under i compatible_models: "iPhone 15 Pro" og uden mærkeprefix. */
export function compatibleNameVariants(modelName: string): string[] {
  const name = modelName.trim();
  const noBrand = name.replace(/^(apple|samsung|google|huawei|oneplus|xiaomi|sony|motorola)\s+/i, "").trim();
  return [...new Set([name, noBrand].filter(Boolean))];
}

export function buildUpsellResponse(input: {
  rows: UpsellRow[];
  stock: StockRow[];
  location: CaseStore | null;
  locationIdBySlug: Partial<Record<CaseStore | "webshop", string>>;
  inTransit: Record<string, number>;
  limit?: number;
}): UpsellResponse {
  const stockBySku = new Map<string, StockRow[]>();
  for (const r of input.stock) stockBySku.set(r.product_id, [...(stockBySku.get(r.product_id) ?? []), r]);
  const seen = new Set<string>();
  const items: UpsellProduct[] = [];
  for (const r of input.rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    items.push({
      sku_product_id: r.id,
      title: r.title,
      brand: r.brand,
      category: r.subcategory ?? r.category,
      price_oere: productListOere(r),
      image_url: r.images?.[0] ?? null,
      ...shapeStock({
        alwaysInStock: r.always_in_stock,
        rows: stockBySku.get(r.id) ?? [],
        location: input.location,
        locationIdBySlug: input.locationIdBySlug,
        inTransit: input.inTransit[r.id] ?? 0,
      }),
    });
  }
  // På lager i butikken først, derefter titel.
  items.sort((a, b) => {
    const aIn = !a.tracked || (a.available ?? 0) > 0 ? 0 : 1;
    const bIn = !b.tracked || (b.available ?? 0) > 0 ? 0 : 1;
    return aIn - bIn || a.title.localeCompare(b.title, "da");
  });
  return { location: input.location, items: items.slice(0, input.limit ?? 40) };
}

const UPSELL_COLUMNS = "id, title, brand, category, subcategory, selling_price, sale_price, images, always_in_stock";

/**
 * Tilbehør der passer til modellen (compatible_models), med lager. Med `q` søges i stedet i hele
 * sortimentet (titel/EAN), også tilbehør uden kompatibilitetsdata. Reservedele (repair_only) og
 * inaktive varer er aldrig med.
 */
export async function loadUpsell(
  modelId: string,
  location: CaseStore | null,
  q: string | null,
  db: Db = createServerClient(),
): Promise<UpsellResponse | null> {
  const { data: model, error } = await db.from("repair_models").select("id, name").eq("id", modelId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!model) return null;
  const search = sanitizeSearch(q);

  const base = () =>
    db
      .from("sku_products")
      .select(UPSELL_COLUMNS)
      .eq("is_active", true)
      .eq("repair_only", false)
      .eq("status", "published")
      .neq("category", "spare-part")
      .neq("subcategory", "spare-part");

  let rows: UpsellRow[] = [];
  if (search.length >= 2) {
    const { data, error: e } = await base()
      .or(`title.ilike.%${search}%,ean.eq.${search.replace(/[^0-9]/g, "") || "-"}`)
      .limit(40);
    if (e) throw new Error(e.message);
    rows = (data ?? []) as UpsellRow[];
  } else {
    const variants = compatibleNameVariants((model as { name: string }).name);
    const results = await Promise.all(
      variants.map((v) => base().contains("compatible_models", JSON.stringify([v])).limit(80)),
    );
    for (const r of results) {
      if (r.error) throw new Error(r.error.message);
      rows.push(...((r.data ?? []) as UpsellRow[]));
    }
  }

  const skuIds = [...new Set(rows.map((r) => r.id))];
  const index = await loadLocationIndex();
  const { idBySlug } = locationMaps(index);
  let stock: StockRow[] = [];
  if (skuIds.length > 0) {
    const { data, error: se } = await db
      .from("sku_stock")
      .select("product_id, location_id, quantity, reserved_qty")
      .in("product_id", skuIds);
    if (se) throw new Error(se.message);
    stock = (data ?? []) as StockRow[];
  }
  const inTransit = await loadInTransit(db, skuIds, location ? (idBySlug[location] ?? null) : null);
  return buildUpsellResponse({ rows, stock, location, locationIdBySlug: idBySlug, inTransit });
}

/* ------------------------------------------------------------------ */
/*  Refurb-enheder til tilkøb                                           */
/* ------------------------------------------------------------------ */

type DeviceRow = {
  id: string;
  storage: string | null;
  grade: string | null;
  barcode: string | null;
  selling_price: number | null;
  vat_scheme: string | null;
  product_templates: { display_name: string | null } | { display_name: string | null }[] | null;
};

export function gradeLabel(grade: string | null): string | null {
  if (!grade) return null;
  return grade === "N" ? "Fabriksny" : `Grade ${grade}`;
}

export function buildDevicesResponse(rows: DeviceRow[], location: CaseStore | null): UpsellDevicesResponse {
  const devices: UpsellDevice[] = rows
    .filter((r) => (r.selling_price ?? 0) > 0)
    .map((r) => {
      const tpl = Array.isArray(r.product_templates) ? r.product_templates[0] : r.product_templates;
      return {
        device_id: r.id,
        name: tpl?.display_name ?? "Enhed",
        storage: r.storage,
        grade: gradeLabel(r.grade),
        barcode: r.barcode,
        price_oere: r.selling_price ?? 0,
        vat_scheme: r.vat_scheme === "brugtmoms" ? "brugtmoms" : "regular",
      };
    });
  return { location, devices };
}

/** Enheder (status listed) i butikken. Leverandørvarer (foxway) kan ikke sælges i butikken. */
export async function loadUpsellDevices(
  location: CaseStore | null,
  q: string | null,
  db: Db = createServerClient(),
): Promise<UpsellDevicesResponse> {
  if (!location) return { location, devices: [] };
  const index = await loadLocationIndex();
  const locationId = index.idBySlug[location];
  if (!locationId) return { location, devices: [] };
  const search = sanitizeSearch(q);

  let query = db
    .from("devices")
    .select("id, storage, grade, barcode, selling_price, vat_scheme, product_templates(display_name)")
    .eq("status", "listed")
    .eq("location_id", locationId)
    .neq("source", "foxway")
    .gt("selling_price", 0)
    .order("selling_price", { ascending: true })
    .limit(30);
  if (search.length >= 2) query = query.or(`barcode.ilike.%${search}%,imei.ilike.%${search}%,serial_number.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let result = buildDevicesResponse((data ?? []) as unknown as DeviceRow[], location);
  if (search.length >= 2) {
    // Søgning på navn sker her: relationen kan ikke filtreres i samme or().
    const lower = search.toLowerCase();
    if (result.devices.length === 0) {
      const { data: all, error: e2 } = await db
        .from("devices")
        .select("id, storage, grade, barcode, selling_price, vat_scheme, product_templates(display_name)")
        .eq("status", "listed")
        .eq("location_id", locationId)
        .neq("source", "foxway")
        .gt("selling_price", 0)
        .limit(400);
      if (e2) throw new Error(e2.message);
      const named = buildDevicesResponse((all ?? []) as unknown as DeviceRow[], location);
      result = { location, devices: named.devices.filter((d) => `${d.name} ${d.storage ?? ""}`.toLowerCase().includes(lower)).slice(0, 30) };
    }
  }
  return result;
}

export { CASE_STORES };
