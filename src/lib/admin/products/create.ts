/**
 * Ét fælles grundlag for at oprette produkter fra admin.
 *
 * Alle opret-flows (tilbehør, beskyttelsesglas, reservedele) ender i
 * `sku_products` + `sku_stock`. Reglerne for hvornår et produkt er synligt og
 * købbart på webshoppen ligger i /api/accessories og lib/checkout/validate:
 *   status = 'published', is_active = true, slug sat, category/subcategory
 *   korrekt, compatible_models som slugs fra TILBEHOER_DEVICES.
 * Funktionerne her er rene (ingen I/O), så de kan testes uden database.
 */
import { slugify } from "@/lib/supabase/accessories";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { TYPE_ATTRIBUTES } from "./attributes";

export type ProductStatus = "published" | "draft";

export interface LocationRow {
  id: string;
  name: string | null;
  type: string | null;
}

export interface StockSpec {
  /** Antal på online-lageret (webshop). */
  online?: number | null;
  /** Antal pr. butik, nøgle = butiksnavn i små bogstaver (vejle, slagelse). */
  stores?: Record<string, number | null | undefined>;
}

export interface AccessoryInput {
  /** Kan indeholde {model}, som erstattes med modellens label. */
  title: string;
  subcategory: string;
  brand?: string | null;
  /** Slugs fra TILBEHOER_DEVICES. */
  models: string[];
  /** per-model = én række pr. model; universal = én række der passer alle valgte. */
  mode: "per-model" | "universal";
  sellingPrice: number;
  salePrice?: number | null;
  costPrice?: number | null;
  ean?: string | null;
  images: string[];
  description?: string | null;
  attributes?: Record<string, string | null | undefined>;
  alwaysInStock?: boolean;
  status?: ProductStatus;
}

export interface SparePartInput {
  title: string;
  sellingPrice: number;
  salePrice?: number | null;
  costPrice?: number | null;
  partCategoryId?: string | null;
  qualityTierId?: string | null;
  warrantyMonths?: number | null;
  deviceBrand?: string | null;
  deviceSeries?: string | null;
  deviceModel?: string | null;
  ean?: string | null;
  images: string[];
  description?: string | null;
  isInquiryOnly?: boolean;
  alwaysInStock?: boolean;
  status?: ProductStatus;
}

/** Rækken som den indsættes i sku_products (uden id/timestamps). */
export interface SkuProductRow {
  title: string;
  slug: string;
  category: "accessory" | "spare-part";
  subcategory: string;
  brand: string | null;
  selling_price: number;
  sale_price: number | null;
  cost_price: number | null;
  ean: string | null;
  images: string[];
  description: string | null;
  compatible_models: string[];
  attributes: Record<string, string>;
  always_in_stock: boolean;
  status: ProductStatus;
  is_active: boolean;
  [extra: string]: unknown;
}

const deviceBySlug = new Map(TILBEHOER_DEVICES.map((d) => [d.slug, d]));

export function expandTitle(pattern: string, modelSlug: string): string {
  const label = deviceBySlug.get(modelSlug)?.label ?? modelSlug;
  return pattern.replace(/\{model\}/gi, label).replace(/\s+/g, " ").trim();
}

export function validateCompatibleModels(models: string[]): { ok: string[]; unknown: string[] } {
  const ok: string[] = [];
  const unknown: string[] = [];
  for (const slug of models) (deviceBySlug.has(slug) ? ok : unknown).push(slug);
  return { ok, unknown };
}

function text(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

function oere(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function requirePrice(value: number): number {
  const v = oere(value);
  if (v == null) throw new Error("Salgspris skal være et positivt beløb i øre");
  return v;
}

function cleanAttributes(subcategory: string, attributes: AccessoryInput["attributes"]): Record<string, string> {
  const allowed = new Map((TYPE_ATTRIBUTES[subcategory] ?? []).map((f) => [f.key, f]));
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(attributes ?? {})) {
    const value = text(raw);
    if (!value) continue;
    const field = allowed.get(key);
    if (!field) throw new Error(`Attributten "${key}" findes ikke for kategorien ${subcategory}`);
    if (field.options && !field.options.includes(value)) {
      throw new Error(`"${value}" er ikke en gyldig værdi for ${field.label}`);
    }
    out[key] = value;
  }
  return out;
}

export function buildAccessoryRows(input: AccessoryInput): SkuProductRow[] {
  if (!TYPE_ATTRIBUTES[input.subcategory]) throw new Error(`Ukendt tilbehørskategori: ${input.subcategory}`);
  const { ok: models, unknown } = validateCompatibleModels(input.models);
  if (unknown.length) throw new Error(`Ukendte modeller: ${unknown.join(", ")}`);
  const attributes = cleanAttributes(input.subcategory, input.attributes);
  const sellingPrice = requirePrice(input.sellingPrice);

  const common = {
    category: "accessory" as const,
    subcategory: input.subcategory,
    brand: text(input.brand),
    selling_price: sellingPrice,
    sale_price: oere(input.salePrice),
    cost_price: oere(input.costPrice),
    ean: text(input.ean),
    images: input.images.filter(Boolean),
    description: text(input.description),
    attributes,
    always_in_stock: input.alwaysInStock ?? false,
    status: input.status ?? "published",
    is_active: true,
  };

  if (input.mode === "per-model") {
    if (!models.length) throw new Error("Vælg mindst én model, når der oprettes pr. model");
    return models.map((slug) => {
      const title = expandTitle(input.title, slug);
      return { ...common, title, slug: slugify(title), compatible_models: [slug] };
    });
  }
  const title = input.title.replace(/\{model\}/gi, "").replace(/\s+/g, " ").trim();
  if (!title) throw new Error("Titel mangler");
  return [{ ...common, title, slug: slugify(title), compatible_models: models }];
}

export function buildSparePartRow(input: SparePartInput): SkuProductRow {
  const title = input.title.trim();
  if (!title) throw new Error("Titel mangler");
  return {
    title,
    slug: slugify(title),
    category: "spare-part",
    subcategory: "spare-part",
    brand: text(input.deviceBrand),
    selling_price: requirePrice(input.sellingPrice),
    sale_price: oere(input.salePrice),
    cost_price: oere(input.costPrice),
    ean: text(input.ean),
    images: input.images.filter(Boolean),
    description: text(input.description),
    compatible_models: [],
    attributes: {},
    always_in_stock: input.alwaysInStock ?? false,
    status: input.status ?? "published",
    is_active: true,
    part_category_id: text(input.partCategoryId),
    quality_tier_id: text(input.qualityTierId),
    warranty_months: input.warrantyMonths ?? null,
    device_brand: text(input.deviceBrand),
    device_series: text(input.deviceSeries),
    device_model: text(input.deviceModel),
    is_inquiry_only: input.isInquiryOnly ?? false,
  };
}

/**
 * Oversætter et lagerønske til sku_stock-rækker. Online findes på type,
 * butikker på navn — samme regel uanset hvilket flow der kalder.
 */
export function resolveStockRows(
  locations: LocationRow[],
  spec: StockSpec,
): { location_id: string; quantity: number }[] {
  const rows: { location_id: string; quantity: number }[] = [];
  const online = locations.find((l) => l.type === "online");
  if (online && spec.online && spec.online > 0) rows.push({ location_id: online.id, quantity: Math.round(spec.online) });
  for (const [name, qty] of Object.entries(spec.stores ?? {})) {
    if (!qty || qty <= 0) continue;
    const store = locations.find((l) => l.type === "store" && l.name?.toLowerCase() === name.toLowerCase());
    if (store) rows.push({ location_id: store.id, quantity: Math.round(qty) });
  }
  return rows;
}

/** Giver hver slug et løbenummer, hvis den allerede findes (i basen eller i samme batch). */
export function uniqueSlugs(slugs: string[], taken: Set<string>): string[] {
  const used = new Set(taken);
  return slugs.map((base) => {
    let candidate = base;
    let n = 2;
    while (used.has(candidate)) candidate = `${base}-${n++}`;
    used.add(candidate);
    return candidate;
  });
}
