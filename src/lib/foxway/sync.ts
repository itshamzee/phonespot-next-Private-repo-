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

/** Detect actual brand from description for TEQCYCLE (resells both HP and Lenovo) */
function detectBrand(prod: string, description: string): string {
  const upper = prod.toUpperCase().trim();
  if (upper !== "TEQCYCLE") return BRAND_MAP[upper] ?? titleCase(prod);

  const desc = description.toUpperCase();
  // Check description for known HP model prefixes
  if (/\bELITEBOOK\b|\bPROBOOK\b|\bZBOOK\b|\bFIREFLY\b/.test(desc)) return "HP";
  // Check for Dell
  if (/\bLATITUDE\b|\bINSPIRON\b|\bXPS\b/.test(desc)) return "Dell";
  // Default to Lenovo (most TEQCYCLE items are ThinkPads)
  return "Lenovo";
}

/** Extract model name from description when CATAGORY is n/a or a part number */
function extractModelFromDescription(description: string): string | null {
  const desc = description.trim();
  // Known patterns at start of description:
  // "T14s G2 i5-1135G7/16GB/..."
  // "840 G8 i5-1145G7/16GB/..."
  // "X1 Carbon G9 i7-1185G7/..."
  // "X360 1030 G8 i7-1165G7/..."
  // "Latitude 7420 i5-1135G7/..."
  // "5520 i5-1135G7/..."

  // Match everything before the first CPU-like pattern or slash
  const match = desc.match(/^(.+?)(?:\s+(?:i[3579]-|R[3579][ -]|U[357]-|Ryzen|Snapdragon|Celeron|Kompanio|N\d{4}|Pentium)|\s*\/)/i);
  if (match) {
    let model = match[1].trim();
    // If it's just a number like "840", "5520", look for a generation suffix
    // Check for known EliteBook/ProBook/ZBook/Latitude patterns
    if (/^(X360\s+)?\d{3,4}(\s+G\d+)?$/i.test(model)) {
      // This is like "840 G8" - need to infer the product line from the brand
      return model;
    }
    // Check for ThinkPad-style: "T14s G2", "X1 Carbon G9", "L14 G2"
    if (/^[TXLEP]\d|^X1\s|^X13|^L\d|^P\d/i.test(model)) {
      return model;
    }
    return model;
  }
  return null;
}

/** Check if a model string looks like a part number rather than a model name */
function isPartNumber(model: string): boolean {
  if (!model || model.toLowerCase() === "n/a") return true;
  // Part numbers: "20T0", "21F6", "1G1X7AV", "358N2EA", "358N6EA#UUW"
  // Model names: "THINKPAD T14S G2", "ELITEBOOK 840 G7"
  // If it's short and mostly alphanumeric with no spaces, it's likely a part number
  if (model.length < 8 && /^[A-Z0-9#-]+$/i.test(model)) return true;
  // If it contains # it's a part number
  if (model.includes("#")) return true;
  // If first part is all digits or a short code without known prefixes
  const first = model.split(/\s+/)[0].toUpperCase();
  const knownPrefixes = ["THINKPAD", "ELITEBOOK", "PROBOOK", "ZBOOK", "LATITUDE", "IDEAPAD", "YOGA", "LOQ", "CHROMEBOOK", "FIREFLY"];
  if (knownPrefixes.some(p => model.toUpperCase().startsWith(p))) return false;
  // Short alphanumeric codes are part numbers
  if (/^\d{2}[A-Z]{2}/.test(model) || /^[A-Z]\d[A-Z]\d/.test(model)) return true;
  return false;
}

/** Resolve the best model name for an item */
function resolveModel(item: FoxwayParsedItem): string {
  // If CATAGORY has a proper model name, use it
  if (item.model && !isPartNumber(item.model)) {
    return item.model;
  }
  // Try to extract from description
  const extracted = extractModelFromDescription(item.description);
  if (extracted) return extracted;
  // Fallback to whatever we have
  return item.model || "Unknown";
}

/** Resolve the best brand for an item */
function resolveBrand(item: FoxwayParsedItem): string {
  return detectBrand(item.brand, item.description);
}

/** Infer full model line from a bare number model + brand */
function inferFullModelName(model: string, brand: string): string {
  const m = model.trim();
  const b = brand.toUpperCase();
  // "840 G8" with HP → "ELITEBOOK 840 G8"
  // "850 G7" with HP → "ELITEBOOK 850 G7"
  if (b === "HP" && /^\d{3}\s+G\d+/.test(m)) return `ELITEBOOK ${m}`;
  if (b === "HP" && /^X360\s+\d{3,4}\s+G\d+/.test(m)) return `ELITEBOOK X360 ${m.replace(/^X360\s+/, "")}`;
  // "5520" or "5410" with Dell → "LATITUDE 5520"
  if (b === "DELL" && /^\d{4}$/.test(m)) return `LATITUDE ${m}`;
  if (b === "DELL" && /^Lat\d{4}/.test(m)) return `LATITUDE ${m.replace(/^Lat/i, "")}`;
  // "7410" or "7420" alone → could be Latitude
  if (/^\d{4}$/.test(m)) return `LATITUDE ${m}`;
  return m;
}

/** Known model-name prefixes with their canonical casing */
const MODEL_PREFIX_MAP: Record<string, string> = {
  THINKPAD: "ThinkPad",
  ELITEBOOK: "EliteBook",
  PROBOOK: "ProBook",
  ZBOOK: "ZBook",
  LATITUDE: "Latitude",
  IDEAPAD: "IdeaPad",
  YOGA: "Yoga",
  LOQ: "LOQ",
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
      const existing = existingBySourceSku.get(item.sourceSku);

      if (!existing) {
        // 6c. NEW device
        const { error } = await supabase.from("devices").insert({
          template_id: templateId,
          source: "foxway",
          source_sku: item.sourceSku,
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
          purchased_at: null,
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

  // 8. Update template base prices for affected templates
  await updateTemplateBasePrices(affectedTemplateIds, supabase);

  // 9. Log to foxway_import_log
  await supabase.from("foxway_import_log").insert({
    items_count: items.length,
    created: result.created,
    updated: result.updated,
    delisted: result.delisted,
    templates_created: result.templatesCreated,
    errors: result.errors,
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
