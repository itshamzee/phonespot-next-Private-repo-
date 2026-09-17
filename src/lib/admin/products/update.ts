/**
 * Redigering af tilbehør fra admin — modstykket til create.ts.
 *
 * Samme formular opretter og redigerer, så reglerne er de samme: modeller er
 * slugs fra TILBEHOER_DEVICES, kendte attributter valideres mod attributes.ts.
 * Forskellen er, at en redigering aldrig må smide data væk, som formularen
 * ikke viser: frie attributter (materiale, farve …), andre nøgler i
 * specifications og koblinger til skabeloner, modelvælgeren ikke kender.
 * Rene funktioner uden I/O, så de kan testes uden database.
 */
import { slugify } from "@/lib/supabase/accessories";
import { TYPE_ATTRIBUTES } from "./attributes";
import { validateCompatibleModels, type LocationRow, type ProductStatus, type StockSpec } from "./create";
import { matchModels } from "./supplier-paste";

export interface ExistingProduct {
  id: string;
  category: string | null;
  subcategory: string | null;
  slug: string | null;
  attributes: Record<string, unknown> | null;
  specifications: Record<string, unknown> | null;
}

export interface AccessoryUpdateInput {
  title: string;
  subcategory: string;
  brand?: string | null;
  models: string[];
  sellingPrice: number;
  salePrice?: number | null;
  costPrice?: number | null;
  ean?: string | null;
  images: string[];
  description?: string | null;
  shortDescription?: string | null;
  highlights?: string[];
  attributes?: Record<string, string | null | undefined>;
  alwaysInStock?: boolean;
  status?: ProductStatus;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

/** Alle attribut-nøgler som en eller anden kategori styrer via formularen. */
const TYPED_KEYS = new Set(Object.values(TYPE_ATTRIBUTES).flatMap((fields) => fields.map((f) => f.key)));

function text(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

function oere(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

export function buildAccessoryUpdate(existing: ExistingProduct, input: AccessoryUpdateInput): Record<string, unknown> {
  if (existing.category !== "accessory") throw new Error("Kun tilbehør kan redigeres her");
  const title = input.title.trim();
  if (!title) throw new Error("Titel mangler");
  const sellingPrice = oere(input.sellingPrice);
  if (sellingPrice == null) throw new Error("Salgspris skal være et positivt beløb i øre");
  const salePrice = oere(input.salePrice);
  if (salePrice != null && salePrice >= sellingPrice) throw new Error("Tilbudspris skal være lavere end salgsprisen");

  const { ok: models, unknown } = validateCompatibleModels(input.models);
  if (unknown.length) throw new Error(`Ukendte modeller: ${unknown.join(", ")}`);

  // Attributter: formularen ejer de kendte nøgler for den valgte kategori. Frie
  // nøgler bevares; kendte nøgler fra en anden kategori ryger ved kategoriskift.
  const fields = TYPE_ATTRIBUTES[input.subcategory];
  const current = Object.fromEntries(
    Object.entries(existing.attributes ?? {}).filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)]),
  );
  let attributes: Record<string, string> = current;
  if (fields) {
    const allowed = new Map(fields.map((f) => [f.key, f]));
    attributes = Object.fromEntries(Object.entries(current).filter(([k]) => !TYPED_KEYS.has(k)));
    for (const [key, raw] of Object.entries(input.attributes ?? {})) {
      const field = allowed.get(key);
      if (!field) continue;
      const value = text(raw);
      if (!value) continue;
      if (field.options && !field.options.includes(value)) throw new Error(`"${value}" er ikke en gyldig værdi for ${field.label}`);
      attributes[key] = value;
    }
    // Rækkefølge: kendte først, så de står øverst i specifikationerne
    attributes = Object.fromEntries([
      ...Object.entries(attributes).filter(([k]) => allowed.has(k)),
      ...Object.entries(attributes).filter(([k]) => !allowed.has(k)),
    ]);
  }

  const row: Record<string, unknown> = {
    title,
    subcategory: input.subcategory,
    brand: text(input.brand),
    compatible_models: models,
    selling_price: sellingPrice,
    sale_price: salePrice,
    cost_price: oere(input.costPrice),
    ean: text(input.ean),
    images: input.images.filter(Boolean),
    description: text(input.description),
    short_description: text(input.shortDescription),
    specifications: {
      ...(existing.specifications ?? {}),
      highlights: (input.highlights ?? []).map((h) => h.trim()).filter(Boolean),
    },
    attributes,
    always_in_stock: input.alwaysInStock ?? false,
    status: input.status ?? "published",
    meta_title: text(input.metaTitle),
    meta_description: text(input.metaDescription),
  };
  // Slug'en er produktets adresse på webshoppen og i Google — den ændres ikke ved omdøbning.
  if (!existing.slug) row.slug = slugify(title);
  return row;
}

/** Modeller til formularen: compatible_models plus de skabelon-koblinger, modelvælgeren kender. */
export function modelsForProduct(compatibleModels: unknown, templateNames: string[]): string[] {
  const fromColumn = Array.isArray(compatibleModels) ? compatibleModels.filter((m): m is string => typeof m === "string") : [];
  const { ok } = validateCompatibleModels(fromColumn);
  return [...new Set([...ok, ...matchModels(templateNames).slugs])];
}

/**
 * Holder sku_product_templates i takt med modelvalget, så "Passer til" og
 * krydssalg på produktsiden viser det samme som formularen. Koblinger til
 * skabeloner uden for modelvælgeren (fx tablets) røres ikke.
 */
export function planTemplateLinks(
  existingLinks: { template_id: string; display_name: string | null }[],
  selectedSlugs: string[],
  templates: { id: string; display_name: string | null }[],
): { add: string[]; remove: string[] } {
  const selected = new Set(selectedSlugs);
  const slugOf = (name: string | null) => (name ? matchModels([name]).slugs[0] : undefined);

  const remove = existingLinks
    .filter((l) => {
      const slug = slugOf(l.display_name);
      return slug !== undefined && !selected.has(slug);
    })
    .map((l) => l.template_id);

  const linked = new Set(existingLinks.map((l) => l.template_id));
  const add = templates
    .filter((t) => {
      const slug = slugOf(t.display_name);
      return slug !== undefined && selected.has(slug) && !linked.has(t.id);
    })
    .map((t) => t.id);

  return { add, remove };
}

/** Som resolveStockRows, men med nuller — en redigering skal kunne sætte lager ned til 0. */
export function stockUpserts(locations: LocationRow[], spec: StockSpec): { location_id: string; quantity: number }[] {
  const rows: { location_id: string; quantity: number }[] = [];
  const online = locations.find((l) => l.type === "online");
  if (online && spec.online != null) rows.push({ location_id: online.id, quantity: Math.max(0, Math.round(spec.online)) });
  for (const [name, qty] of Object.entries(spec.stores ?? {})) {
    if (qty == null) continue;
    const store = locations.find((l) => l.type === "store" && l.name?.toLowerCase() === name.toLowerCase());
    if (store) rows.push({ location_id: store.id, quantity: Math.max(0, Math.round(qty)) });
  }
  return rows;
}
