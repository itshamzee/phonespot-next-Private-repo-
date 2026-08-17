import { createAdminClient } from "@/lib/supabase/admin";
import type { DeviceGrade } from "@/lib/supabase/platform-types";
import type { FoxwayParsedItem } from "./types";
import { calculateSellPrice, calculateMarginPercent, isLowMargin } from "./pricing";

// ============================================
// Public types
// ============================================

export interface SyncResult {
  created: number;
  updated: number;
  delisted: number;
  templatesCreated: number;
  errors: { sku: string; error: string }[];
}

export interface SyncItemWithPrice extends FoxwayParsedItem {
  sellPrice: number; // in øre, may be overridden by admin
}

export interface PreviewItem extends FoxwayParsedItem {
  sellPrice: number;
  marginPercent: number;
  lowMargin: boolean;
  status: "new" | "updated" | "unchanged" | "delisted";
  templateName: string;
}

export interface PreviewResult {
  items: PreviewItem[];
  newTemplates: number;
  newDevices: number;
  updatedDevices: number;
  delistedDevices: number;
}

// ============================================
// Brand & model formatting
// ============================================

const BRAND_MAP: Record<string, string> = {
  LENOVO: "Lenovo",
  HP: "HP",
  DELL: "Dell",
  APPLE: "Apple",
  MICROSOFT: "Microsoft",
};

// ============================================
// HP model number patterns (3-digit series)
// ============================================
const HP_ELITEBOOK_NUMBERS = ["630", "640", "645", "650", "655", "665", "830", "835", "840", "845", "850", "855", "860", "865", "1030", "1040"];
const HP_PROBOOK_NUMBERS = ["440", "445", "450", "455", "640", "650"];
const HP_ZBOOK_PREFIXES = ["ZBOOK", "ZB ", "FIREFLY", "FURY", "POWER"];

/** Detect actual brand from description — critical for TEQCYCLE which resells HP, Dell, and Lenovo */
function detectBrand(prod: string, description: string): string {
  const upper = prod.toUpperCase().trim();
  if (upper !== "TEQCYCLE") return BRAND_MAP[upper] ?? titleCase(prod);

  const desc = description.toUpperCase();
  // Explicit HP keywords
  if (/\bELITEBOOK\b|\bPROBOOK\b|\bZBOOK\b|\bFIREFLY\b|\bFURY\b|\bPOWER\b/.test(desc)) return "HP";
  // HP model numbers: "840 G8", "850 G7", "1030 G8"
  if (/\b(?:830|835|840|845|850|855|860|1030|1040|440|450)\s+G\d/.test(desc)) return "HP";
  // Dell keywords
  if (/\bLATITUDE\b|\bINSPIRON\b|\bXPS\b|\bPRECISION\b|\bVOSTRO\b/.test(desc)) return "Dell";
  // Dell model numbers: "5410", "5520", "7410", "7420"
  if (/\b(?:54\d{2}|55\d{2}|74\d{2}|75\d{2})\s/.test(desc)) return "Dell";
  // Default to Lenovo (ThinkPads)
  return "Lenovo";
}

/** Extract the model portion from the beginning of a Foxway description string.
 *  Descriptions look like: "T14s G2 i5-1135G7/16GB/256M2/FHD/4U/F/C/W11P"
 *  We want: "T14s G2" */
function extractModelFromDescription(description: string): string | null {
  const desc = description.trim();
  // Match everything before the first CPU pattern, slash, or spec-like content
  const cpuPattern = /\s+(?:i[3579]-\d|R[3579][ -]\d|U[357]-\d|U\d-\d|Ryzen|Snapdragon|Celeron|Kompanio|N\d{4}|Pentium|Core|X1E\d)/i;
  const slashIdx = desc.indexOf("/");
  const cpuMatch = desc.match(cpuPattern);

  let endIdx = desc.length;
  if (slashIdx > 0) endIdx = Math.min(endIdx, slashIdx);
  if (cpuMatch?.index) endIdx = Math.min(endIdx, cpuMatch.index);

  const model = desc.substring(0, endIdx).trim();
  if (model.length < 2 || model.length > 60) return null;
  return model;
}

/** Check if a CATAGORY value is a proper model name vs a part number */
function isPartNumber(model: string): boolean {
  if (!model || model.toLowerCase() === "n/a") return true;
  // Part numbers: "20T0", "21F6", "1G1X7AV", "358N2EA", "358N6EA#UUW"
  if (model.includes("#")) return true;
  // Known good prefixes — these are real model names
  const knownPrefixes = [
    "THINKPAD", "ELITEBOOK", "PROBOOK", "ZBOOK", "LATITUDE", "IDEAPAD",
    "YOGA", "LOQ", "CHROMEBOOK", "CHROME", "FIREFLY", "FURY",
  ];
  if (knownPrefixes.some(p => model.toUpperCase().startsWith(p))) return false;
  // "Hp Elitebook 840 G7" style from Teqcycle MODEL field
  if (/elitebook|probook|zbook|latitude|thinkpad/i.test(model)) return false;
  // Short codes without spaces are part numbers
  if (model.length < 8 && !/\s/.test(model)) return true;
  // 4-char codes like "20T0", "21F6", "82JC"
  if (/^[\dA-Z]{4}$/i.test(model)) return true;
  return false;
}

/** Resolve the best model name for an item, combining CATAGORY + description */
function resolveModel(item: FoxwayParsedItem): string {
  // If CATAGORY has a proper model name, use it
  if (item.model && !isPartNumber(item.model)) {
    return item.model;
  }
  // Try to extract from description
  const extracted = extractModelFromDescription(item.description);
  if (extracted) return extracted;
  return item.model || "Unknown";
}

/** Resolve the best brand for an item */
function resolveBrand(item: FoxwayParsedItem): string {
  return detectBrand(item.brand, item.description);
}

/** Add product line prefix when the model is just a number like "840 G8" or "T14s G2".
 *  Also handles Teqcycle's "Hp Elitebook 840 G7" → strip the brand prefix. */
function inferFullModelName(model: string, brand: string): string {
  let m = model.trim();
  const b = brand.toUpperCase();

  // Strip redundant brand prefixes from Teqcycle MODEL field:
  // "Hp Elitebook 840 G7" → "ELITEBOOK 840 G7"
  // "Dell Latitude 5410" → "LATITUDE 5410"
  m = m.replace(/^(?:Hp|Hp\s+|Dell\s+|Lenovo\s+)/i, "").trim();

  // HP: bare number + generation → EliteBook
  // "840 G8" → "ELITEBOOK 840 G8"
  if (b === "HP" && /^\d{3,4}\s+G\d+/i.test(m)) {
    // Check if it's a ProBook number
    const num = m.match(/^(\d{3,4})/)?.[1] ?? "";
    if (HP_PROBOOK_NUMBERS.includes(num) && !HP_ELITEBOOK_NUMBERS.includes(num)) {
      return `PROBOOK ${m}`;
    }
    return `ELITEBOOK ${m}`;
  }
  // HP: "X360 1030 G8" → "ELITEBOOK X360 1030 G8"
  if (b === "HP" && /^X360\s+\d{3,4}/i.test(m)) return `ELITEBOOK ${m}`;
  // HP: "EB " prefix (abbreviated EliteBook from Foxway descriptions)
  if (b === "HP" && /^EB\s+/i.test(m)) return m.replace(/^EB\s+/i, "ELITEBOOK ");
  // HP: "ZB " prefix
  if (b === "HP" && /^ZB\s+/i.test(m)) return m.replace(/^ZB\s+/i, "ZBOOK ");

  // Lenovo: "T14s G2" → "THINKPAD T14S G2"
  if (b === "LENOVO" && /^[TXLEP]\d\d?[sS]?\s+G\d/i.test(m)) return `THINKPAD ${m}`;
  // Lenovo: "X1 Carbon G9", "X1 Yoga G6", "X1 2-in-1 G9"
  if (b === "LENOVO" && /^X1\s/i.test(m)) return `THINKPAD ${m}`;
  // Lenovo: "X13 G5", "X12Det G1"
  if (b === "LENOVO" && /^X1[23]\s/i.test(m)) return `THINKPAD ${m}`;
  // Lenovo: "L14 G2", "L13 G4", "L16 G1"
  if (b === "LENOVO" && /^L\d{2}\s+G\d/i.test(m)) return `THINKPAD ${m}`;
  // Lenovo: "P1 G6", "P16 G2", "P16s G2"
  if (b === "LENOVO" && /^P\d/i.test(m)) return `THINKPAD ${m}`;
  // Lenovo: "E14 G5", "E14 G6"
  if (b === "LENOVO" && /^E\d{2}\s+G\d/i.test(m)) return `THINKPAD ${m}`;
  // Lenovo: "TB 14 G7" → "THINKBOOK 14 G7"
  if (b === "LENOVO" && /^TB\s+/i.test(m)) return m.replace(/^TB\s+/i, "THINKBOOK ");
  // Lenovo: "IP Slim" → "IDEAPAD Slim"
  if (b === "LENOVO" && /^IP\s+/i.test(m)) return m.replace(/^IP\s+/i, "IDEAPAD ");
  // Lenovo: "YG " → "YOGA "
  if (b === "LENOVO" && /^YG\s+/i.test(m)) return m.replace(/^YG\s+/i, "YOGA ");
  // Lenovo: "CB " → "CHROMEBOOK "
  if (b === "LENOVO" && /^CB\s+/i.test(m)) return m.replace(/^CB\s+/i, "CHROMEBOOK ");

  // Dell: bare 4-digit number → Latitude
  if (b === "DELL" && /^\d{4}$/i.test(m)) return `LATITUDE ${m}`;
  // Dell: "Lat7410" → "LATITUDE 7410"
  if (/^Lat(?:t?itude)?\s*(\d{4})/i.test(m)) {
    const num = m.match(/(\d{4})/)?.[1];
    return `LATITUDE ${num}`;
  }
  // Dell: "Lattitude 5520" (typo) → "LATITUDE 5520"
  if (/^Latt?itude\s+/i.test(m)) return m.replace(/^Latt?itude/i, "LATITUDE");

  return m;
}

/** Known model-name prefixes with their canonical casing */
const MODEL_PREFIX_MAP: Record<string, string> = {
  THINKPAD: "ThinkPad",
  THINKBOOK: "ThinkBook",
  ELITEBOOK: "EliteBook",
  PROBOOK: "ProBook",
  ZBOOK: "ZBook",
  LATITUDE: "Latitude",
  IDEAPAD: "IdeaPad",
  YOGA: "Yoga",
  LOQ: "LOQ",
  CHROMEBOOK: "Chromebook",
  FIREFLY: "Firefly",
  FURY: "Fury",
  POWER: "Power",
};

export function formatBrand(brand: string, description = ""): string {
  return detectBrand(brand, description);
}

export function formatModelName(model: string): string {
  const parts = model.trim().split(/\s+/);
  if (parts.length === 0) return model;

  const firstUpper = parts[0].toUpperCase();
  const mapped = MODEL_PREFIX_MAP[firstUpper];

  if (mapped) {
    // Replace the first token with the canonical form, title-case the rest
    // but keep model numbers (containing digits) as-is
    return [mapped, ...parts.slice(1).map(formatModelPart)].join(" ");
  }

  // Two-word prefixes: "X1 CARBON", "X360 1030", etc. are handled by single
  // prefix match above — the remaining tokens are already fine.
  // Default: title-case each part, but keep model numbers uppercase
  return parts.map(formatModelPart).join(" ");
}

/** Title-case a single word, but leave model-number tokens (e.g. "T14S", "G2", "14ARP10") unchanged when they contain digits */
function formatModelPart(part: string): string {
  if (/\d/.test(part)) {
    // Keep model-number tokens in their original case (usually uppercase is fine)
    return part;
  }
  return titleCase(part);
}

function titleCase(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function generateSlug(brand: string, model: string): string {
  const formatted = `${formatBrand(brand)} ${formatModelName(model)}`;
  return formatted
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Template lookup key: brand-model normalized */
function templateKey(brand: string, model: string): string {
  return `${brand.toLowerCase().trim()}-${model.toLowerCase().trim()}`;
}

// ============================================
// Core sync
// ============================================

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

interface ExistingDevice {
  id: string;
  source_sku: string;
  purchase_price: number;
  source_stock: number;
  status: string;
  template_id: string;
  selling_price: number | null;
}

interface ExistingTemplate {
  id: string;
  model: string;
  brand: string;
  slug: string;
}

export async function syncFoxwayItems(
  items: SyncItemWithPrice[],
  supabase: SupabaseAdmin
): Promise<SyncResult> {
  const result: SyncResult = {
    created: 0,
    updated: 0,
    delisted: 0,
    templatesCreated: 0,
    errors: [],
  };

  // 1–4. Fetch existing data in parallel
  const [devicesRes, templatesRes, supplierRes, locationRes] =
    await Promise.all([
      supabase
        .from("devices")
        .select("id, source_sku, purchase_price, source_stock, status, template_id, selling_price")
        .eq("source", "foxway"),
      supabase
        .from("product_templates")
        .select("id, model, brand, slug")
        .eq("category", "laptop"),
      supabase.from("suppliers").select("id").eq("name", "Foxway").limit(1),
      supabase.from("locations").select("id").eq("type", "online").limit(1),
    ]);

  if (devicesRes.error) throw new Error(`Failed to fetch devices: ${devicesRes.error.message}`);
  if (templatesRes.error) throw new Error(`Failed to fetch templates: ${templatesRes.error.message}`);
  if (supplierRes.error || !supplierRes.data?.[0]) throw new Error("Foxway supplier not found");
  if (locationRes.error || !locationRes.data?.[0]) throw new Error("Online location not found");

  const foxwaySupplierID = supplierRes.data[0].id;
  const onlineLocationID = locationRes.data[0].id;

  // 5. Build lookup maps
  const existingBySourceSku = new Map<string, ExistingDevice>();
  for (const d of devicesRes.data as ExistingDevice[]) {
    if (d.source_sku) existingBySourceSku.set(d.source_sku, d);
  }

  const templatesByKey = new Map<string, ExistingTemplate>();
  for (const t of templatesRes.data as ExistingTemplate[]) {
    templatesByKey.set(templateKey(t.brand, t.model), t);
  }

  // Track which source_skus are in the current import
  const incomingSkus = new Set<string>();
  // Track templates that need base-price updates
  const affectedTemplateIds = new Set<string>();
  // Collect EAN data per template so we can persist it onto
  // template.default_attributes.gtins_by_variant at the end of the run.
  // Map<templateId, Map<"<storage>|<color>", ean>>
  const eansByTemplate = new Map<string, Map<string, string>>();

  // 6. Process each item
  for (const item of items) {
    try {
      incomingSkus.add(item.sourceSku);

      // 6a. Find or create template
      const templateId = await findOrCreateTemplate(
        item,
        supabase,
        templatesByKey,
        result
      );

      affectedTemplateIds.add(templateId);

      // Capture EAN per (storage, color) so we can write it back onto the
      // template's default_attributes after the device loop completes.
      // Only accept GTIN-13 / GTIN-14 numerics — drop "N/A" and dashes.
      const cleanedEan = (item.ean ?? "").replace(/\D/g, "");
      if (cleanedEan.length >= 8 && cleanedEan.length <= 14) {
        const variantKey = `${item.storage}|${item.color || "Sort"}`;
        let bucket = eansByTemplate.get(templateId);
        if (!bucket) {
          bucket = new Map();
          eansByTemplate.set(templateId, bucket);
        }
        bucket.set(variantKey, cleanedEan);
      }

      const existing = existingBySourceSku.get(item.sourceSku);

      if (!existing) {
        // 6c. NEW device
        const { error } = await supabase.from("devices").insert({
          template_id: templateId,
          source: "foxway",
          source_sku: item.sourceSku,
          source_url: item.foxwayUrl || null,
          source_stock: item.stock,
          grade: item.grade,
          storage: item.storage,
          color: item.color || "Sort",
          purchase_price: item.buyPrice,
          selling_price: item.sellPrice,
          vat_scheme: "regular" as const,
          supplier_id: foxwaySupplierID,
          location_id: onlineLocationID,
          status: "listed" as const,
          origin_country: "DK",
          photos: [],
          serial_number: null,
          imei: null,
          battery_health: null,
          condition_notes: null,
          purchased_at: new Date().toISOString(),
          listed_at: new Date().toISOString(),
          sold_at: null,
          reservation_expires_at: null,
        });
        if (error) {
          result.errors.push({ sku: item.sourceSku, error: error.message });
        } else {
          result.created++;
        }
      } else {
        // 6d. EXISTING device — update stock and price if buy price changed
        const updates: Record<string, unknown> = {
          source_stock: item.stock,
          status: "listed",
          source_url: item.foxwayUrl || null,
        };

        if (existing.purchase_price !== item.buyPrice) {
          updates.purchase_price = item.buyPrice;
          updates.selling_price = item.sellPrice;
        }

        const { error } = await supabase
          .from("devices")
          .update(updates)
          .eq("id", existing.id);

        if (error) {
          result.errors.push({ sku: item.sourceSku, error: error.message });
        } else {
          result.updated++;
        }
      }
    } catch (err) {
      result.errors.push({
        sku: item.sourceSku,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 7. Delist devices not in the new CSV
  const toDelistIds: string[] = [];
  for (const [sku, device] of existingBySourceSku) {
    if (!incomingSkus.has(sku) && device.status !== "delisted") {
      toDelistIds.push(device.id);
      affectedTemplateIds.add(device.template_id);
    }
  }

  if (toDelistIds.length > 0) {
    const { error } = await supabase
      .from("devices")
      .update({ status: "delisted", source_stock: 0 })
      .in("id", toDelistIds);

    if (error) {
      result.errors.push({ sku: "_delist_batch", error: error.message });
    } else {
      result.delisted = toDelistIds.length;
    }
  }

  // 7b. Persist collected EANs onto each affected template's default_attributes.
  // One read + one write per template (cheap compared to the device loop).
  await mergeEansIntoTemplates(eansByTemplate, supabase, result);

  // 8. Update template base prices for affected templates
  await updateTemplateBasePrices(affectedTemplateIds, supabase);

  // 9. Log to foxway_import_log
  await supabase.from("foxway_import_log").insert({
    total_rows: items.length,
    imported_rows: result.created + result.updated,
    skipped_rows: result.delisted,
    errors: result.errors.length > 0 ? result.errors : null,
    imported_at: new Date().toISOString(),
  });

  return result;
}

// ============================================
// Template helpers
// ============================================

async function findOrCreateTemplate(
  item: FoxwayParsedItem,
  supabase: SupabaseAdmin,
  templatesByKey: Map<string, ExistingTemplate>,
  result: SyncResult
): Promise<string> {
  const resolvedBrand = resolveBrand(item);
  const resolvedModel = resolveModel(item);
  const fullModel = inferFullModelName(resolvedModel, resolvedBrand);
  const brand = resolvedBrand;
  const key = templateKey(brand, fullModel);

  const existing = templatesByKey.get(key);
  if (existing) return existing.id;

  const model = formatModelName(fullModel);
  const slug = generateSlug(brand, fullModel);

  const { data, error } = await supabase
    .from("product_templates")
    .insert({
      brand,
      model,
      display_name: `${brand} ${model}`,
      category: "laptop",
      slug,
      status: "published" as const,
      storage_options: [item.storage],
      colors: [item.color || "Sort"],
      specifications: {
        processor: item.processor,
        ram: item.ram,
        storage: item.storage,
        screen_size: item.screenSize,
        resolution: item.resolution,
        graphics: item.graphics,
        display_type: item.displayType,
        os: item.os,
      },
      images: [],
      default_attributes: {},
      description: null,
      short_description: null,
      meta_title: null,
      meta_description: null,
      base_price_a: null,
      base_price_b: null,
      base_price_c: null,
      base_price_n: null,
      base_price_p: null,
    })
    .select("id, model, brand, slug")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create template for ${brand} ${model}: ${error?.message}`);
  }

  // Cache the new template
  templatesByKey.set(key, data as ExistingTemplate);
  result.templatesCreated++;

  return data.id;
}

// ============================================
// Base-price update
// ============================================

const GRADE_PRICE_COLUMNS: Record<DeviceGrade, string> = {
  N: "base_price_n",
  P: "base_price_p",
  A: "base_price_a",
  B: "base_price_b",
  C: "base_price_c",
};

/**
 * For each template, merge collected EAN data into
 * default_attributes.gtins_by_variant. Existing keys are preserved unless
 * the new sync provides a different value for the same (storage|color)
 * combo, in which case the latest CSV wins (Foxway is the source of truth).
 * Other default_attributes keys (e.g. images_by_color) are left untouched.
 */
async function mergeEansIntoTemplates(
  eansByTemplate: Map<string, Map<string, string>>,
  supabase: SupabaseAdmin,
  result: SyncResult,
): Promise<void> {
  if (eansByTemplate.size === 0) return;

  const ids = Array.from(eansByTemplate.keys());
  const { data: templates, error } = await supabase
    .from("product_templates")
    .select("id, default_attributes")
    .in("id", ids);

  if (error || !templates) {
    result.errors.push({
      sku: "_ean_merge_fetch",
      error: error?.message ?? "could not fetch templates",
    });
    return;
  }

  for (const t of templates as Array<{ id: string; default_attributes: Record<string, unknown> | null }>) {
    const collected = eansByTemplate.get(t.id);
    if (!collected || collected.size === 0) continue;

    const existing = (t.default_attributes ?? {}) as Record<string, unknown>;
    const existingVariants =
      (existing.gtins_by_variant as Record<string, string> | undefined) ?? {};
    const merged: Record<string, string> = { ...existingVariants };
    for (const [variantKey, ean] of collected) {
      merged[variantKey] = ean;
    }

    const nextAttrs: Record<string, unknown> = {
      ...existing,
      gtins_by_variant: merged,
    };

    const { error: upErr } = await supabase
      .from("product_templates")
      .update({ default_attributes: nextAttrs })
      .eq("id", t.id);

    if (upErr) {
      result.errors.push({ sku: `_ean_merge_${t.id}`, error: upErr.message });
    }
  }
}

async function updateTemplateBasePrices(
  templateIds: Set<string>,
  supabase: SupabaseAdmin
): Promise<void> {
  for (const templateId of templateIds) {
    const { data: devices } = await supabase
      .from("devices")
      .select("grade, selling_price")
      .eq("template_id", templateId)
      .eq("source", "foxway")
      .in("status", ["listed", "reserved"]);

    if (!devices || devices.length === 0) continue;

    // Find min selling_price per grade
    const minByGrade: Partial<Record<DeviceGrade, number>> = {};
    for (const d of devices) {
      const grade = d.grade as DeviceGrade;
      const price = d.selling_price as number | null;
      if (price == null) continue;
      if (minByGrade[grade] == null || price < minByGrade[grade]!) {
        minByGrade[grade] = price;
      }
    }

    const updates: Record<string, number | null> = {};
    for (const [grade, col] of Object.entries(GRADE_PRICE_COLUMNS)) {
      const minPrice = minByGrade[grade as DeviceGrade];
      updates[col] = minPrice ?? null;
    }

    await supabase
      .from("product_templates")
      .update(updates)
      .eq("id", templateId);
  }
}

// ============================================
// Preview (read-only)
// ============================================

export async function previewSync(
  items: FoxwayParsedItem[],
  supabase: SupabaseAdmin
): Promise<PreviewResult> {
  // Fetch existing data
  const [devicesRes, templatesRes] = await Promise.all([
    supabase
      .from("devices")
      .select("id, source_sku, purchase_price, source_stock, status, template_id, selling_price")
      .eq("source", "foxway"),
    supabase
      .from("product_templates")
      .select("id, model, brand, slug")
      .eq("category", "laptop"),
  ]);

  if (devicesRes.error) throw new Error(`Failed to fetch devices: ${devicesRes.error.message}`);
  if (templatesRes.error) throw new Error(`Failed to fetch templates: ${templatesRes.error.message}`);

  const existingBySourceSku = new Map<string, ExistingDevice>();
  for (const d of devicesRes.data as ExistingDevice[]) {
    if (d.source_sku) existingBySourceSku.set(d.source_sku, d);
  }

  const templatesByKey = new Map<string, ExistingTemplate>();
  for (const t of templatesRes.data as ExistingTemplate[]) {
    templatesByKey.set(templateKey(t.brand, t.model), t);
  }

  const incomingSkus = new Set<string>();
  const previewItems: PreviewItem[] = [];
  let newTemplates = 0;
  let newDevices = 0;
  let updatedDevices = 0;

  for (const item of items) {
    incomingSkus.add(item.sourceSku);

    const resolvedBrand = resolveBrand(item);
    const resolvedModel = resolveModel(item);
    const fullModel = inferFullModelName(resolvedModel, resolvedBrand);
    const brand = resolvedBrand;
    const model = formatModelName(fullModel);
    const key = templateKey(brand, fullModel);
    const templateExists = templatesByKey.has(key);

    if (!templateExists) {
      newTemplates++;
      templatesByKey.set(key, {
        id: `preview-${key}`,
        model: fullModel,
        brand,
        slug: generateSlug(brand, fullModel),
      });
    }

    const sellPrice = calculateSellPrice(item.buyPrice, item.grade);
    const marginPercent = calculateMarginPercent(item.buyPrice, sellPrice);
    const lowMargin = isLowMargin(item.buyPrice, sellPrice);

    const existing = existingBySourceSku.get(item.sourceSku);
    let status: PreviewItem["status"];

    if (!existing) {
      status = "new";
      newDevices++;
    } else if (
      existing.purchase_price !== item.buyPrice ||
      existing.source_stock !== item.stock
    ) {
      status = "updated";
      updatedDevices++;
    } else {
      status = "unchanged";
    }

    previewItems.push({
      ...item,
      sellPrice,
      marginPercent: Math.round(marginPercent * 10) / 10,
      lowMargin,
      status,
      templateName: `${brand} ${model}`,
    });
  }

  // Delisted: devices in DB not in incoming CSV
  let delistedDevices = 0;
  for (const [sku, device] of existingBySourceSku) {
    if (!incomingSkus.has(sku) && device.status !== "delisted") {
      delistedDevices++;
      previewItems.push({
        sourceSku: sku,
        model: "",
        brand: "",
        description: "",
        stock: 0,
        buyPrice: device.purchase_price,
        grade: "B" as DeviceGrade,
        processor: "",
        ram: "",
        storage: "",
        screenSize: "",
        resolution: "",
        graphics: "",
        color: "",
        os: "",
        displayType: "",
        ean: "",
        warranty: "",
        foxwayUrl: "",
        sellPrice: device.selling_price ?? 0,
        marginPercent: 0,
        lowMargin: false,
        status: "delisted",
        templateName: "",
      });
    }
  }

  return {
    items: previewItems,
    newTemplates,
    newDevices,
    updatedDevices,
    delistedDevices,
  };
}
