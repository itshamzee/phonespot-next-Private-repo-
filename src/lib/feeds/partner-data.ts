// Data layer for the authenticated B2B partner stock feed
// (src/app/api/feeds/partner/route.ts).
//
// This is deliberately NOT modelled on the existing marketing feeds
// (src/app/feeds/google-shopping, src/app/api/feeds/{google,iphones,
// pricerunner}) — those hardcode availability, never emit quantity, and
// (critically) count every `devices` row as one physical unit. That's wrong
// for Foxway-sourced rows: a Foxway `devices` row is a supplier STOCK LINE,
// carrying its real quantity in `source_stock`, not one serialised unit. An
// in-house row genuinely is one row per physical unit (with its own
// `barcode`). This module sums quantity correctly per source and only
// attaches barcodes to the in-house rows they actually identify.

import type { SupabaseClient } from "@supabase/supabase-js";
import { GRADE_SHORT_LABEL } from "@/lib/grades";
import type { DeviceGrade } from "@/lib/supabase/platform-types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";

/** A `devices` row with this `source` is a Foxway supplier stock line — its
 * quantity lives in `source_stock`, and it is NOT one physical unit. */
const FOXWAY_SOURCE = "foxway";

/**
 * Contractual device warranty on every unit sold, in months. There is no
 * `warranty_months` column on `devices` or `orders` today — warranty terms
 * exist only as customer-facing copy and the (unrelated) `warranties` table
 * that tracks per-order warranty status, not length. Hardcoded here so the
 * partner feed states the term explicitly rather than the partner having to
 * infer it from the website. Update this constant (and only this constant)
 * if the warranty term ever changes.
 */
export const PARTNER_FEED_WARRANTY_MONTHS = 36;

/** Categories served when the request's `?category=` param is absent. */
export const DEFAULT_PARTNER_FEED_CATEGORIES = ["iphone", "smartphone"] as const;

export interface PartnerFeedTemplate {
  id: string;
  display_name: string;
  brand: string;
  category: string;
  slug: string;
  status: string;
  images: string[] | null;
  default_attributes: Record<string, unknown> | null;
}

/** Shape returned by the Supabase query in `fetchPartnerFeedRows` — also the
 * input to `buildPartnerFeedRows`, which is pure and unit-tested directly. */
export interface PartnerFeedDeviceRow {
  id: string;
  grade: string;
  storage: string | null;
  color: string | null;
  selling_price: number | null;
  vat_scheme: string | null;
  source: string | null;
  source_stock: number | null;
  battery_health: number | null;
  condition_notes: string | null;
  barcode: string | null;
  template: PartnerFeedTemplate | PartnerFeedTemplate[] | null;
}

export interface PartnerFeedRow {
  variantKey: string;
  barcodes: string[];
  gtin: string | null;
  brand: string;
  displayName: string;
  category: string;
  storage: string | null;
  colour: string | null;
  grade: string;
  gradeLabel: string;
  productUrl: string;
  imageUrl: string | null;
  priceDkk: number;
  currency: "DKK";
  vatScheme: string | null;
  quantity: number;
  batteryHealth: number | null;
  conditionNotes: string[] | null;
  warrantyMonths: number;
}

interface VariantAccumulator {
  template: PartnerFeedTemplate;
  storage: string | null;
  colour: string | null;
  grade: string;
  quantity: number;
  minPriceOere: number;
  vatScheme: string | null;
  barcodes: string[];
  batteryHealthMin: number | null;
  conditionNotes: Set<string>;
}

/**
 * Pure grouping/shaping logic — no I/O, so it is unit-tested directly
 * without a Supabase mock. Groups raw device rows into one row per
 * (template, storage, colour, grade) variant with a real summed quantity:
 *
 *   quantity = SUM(source = 'foxway' ? COALESCE(source_stock, 0) : 1)
 *
 * Variants whose computed quantity is <= 0 are dropped entirely.
 */
export function buildPartnerFeedRows(devices: PartnerFeedDeviceRow[]): PartnerFeedRow[] {
  const variants = new Map<string, VariantAccumulator>();

  for (const dev of devices) {
    const template = Array.isArray(dev.template) ? dev.template[0] : dev.template;
    if (!template || !template.slug || template.status !== "published") continue;
    if (dev.selling_price == null || dev.selling_price <= 0) continue;

    const storage = dev.storage ?? null;
    const colour = dev.color ?? null;
    const grade = dev.grade;
    const key = `${template.slug}|${storage ?? ""}|${colour ?? ""}|${grade}`;

    const isFoxway = dev.source === FOXWAY_SOURCE;
    const unitQuantity = isFoxway ? Math.max(0, dev.source_stock ?? 0) : 1;

    let acc = variants.get(key);
    if (!acc) {
      acc = {
        template,
        storage,
        colour,
        grade,
        quantity: 0,
        minPriceOere: dev.selling_price,
        vatScheme: dev.vat_scheme ?? null,
        barcodes: [],
        batteryHealthMin: null,
        conditionNotes: new Set(),
      };
      variants.set(key, acc);
    }

    acc.quantity += unitQuantity;
    if (dev.selling_price < acc.minPriceOere) acc.minPriceOere = dev.selling_price;

    // Only in-house rows are genuinely one row per physical unit. A Foxway
    // row's barcode field (if ever populated) would misrepresent a
    // multi-unit stock line as a single serialised device, so it is
    // deliberately never surfaced here.
    if (!isFoxway && dev.barcode) acc.barcodes.push(dev.barcode);

    if (dev.battery_health != null) {
      acc.batteryHealthMin =
        acc.batteryHealthMin == null
          ? dev.battery_health
          : Math.min(acc.batteryHealthMin, dev.battery_health);
    }

    const note = dev.condition_notes?.trim();
    if (note) acc.conditionNotes.add(note);
  }

  const rows: PartnerFeedRow[] = [];
  for (const [key, acc] of variants) {
    if (acc.quantity <= 0) continue;

    const { template, storage, colour, grade } = acc;

    const gtinsByVariant = (template.default_attributes?.gtins_by_variant ?? null) as
      | Record<string, string>
      | null;
    const fallbackGtin = (template.default_attributes?.gtin ?? null) as string | null;
    const gtin = gtinsByVariant?.[`${storage ?? ""}|${colour ?? ""}`] ?? fallbackGtin ?? null;

    const imagesByColor = (template.default_attributes?.images_by_color ?? null) as
      | Record<string, string[]>
      | null;
    const colourImages = colour && imagesByColor?.[colour]?.length ? imagesByColor[colour] : null;
    const imageUrl = colourImages?.[0] ?? template.images?.[0] ?? null;

    rows.push({
      variantKey: key,
      barcodes: acc.barcodes,
      gtin: gtin || null,
      brand: template.brand,
      displayName: template.display_name,
      category: template.category,
      storage,
      colour,
      grade,
      gradeLabel: GRADE_SHORT_LABEL[grade as DeviceGrade] ?? grade,
      productUrl: `${SITE_URL}/refurbished/${template.slug}`,
      imageUrl,
      priceDkk: acc.minPriceOere / 100,
      currency: "DKK",
      vatScheme: acc.vatScheme,
      quantity: acc.quantity,
      batteryHealth: acc.batteryHealthMin,
      conditionNotes: acc.conditionNotes.size > 0 ? [...acc.conditionNotes] : null,
      warrantyMonths: PARTNER_FEED_WARRANTY_MONTHS,
    });
  }

  return rows;
}

/**
 * Fetches listed devices for the given template categories and shapes them
 * into partner feed rows. `supabase` is injected so the route can pass a
 * real client while tests can pass a mock without touching this function.
 */
export async function fetchPartnerFeedRows(
  supabase: SupabaseClient,
  categories: readonly string[],
): Promise<PartnerFeedRow[]> {
  const { data, error } = await supabase
    .from("devices")
    .select(
      `
      id, grade, storage, color, selling_price, vat_scheme, source, source_stock,
      battery_health, condition_notes, barcode,
      template:product_templates!template_id!inner (
        id, display_name, brand, category, slug, status, images, default_attributes
      )
      `,
    )
    .eq("status", "listed")
    .not("selling_price", "is", null)
    .gt("selling_price", 0)
    .eq("template.status", "published")
    .in("template.category", categories as string[]);

  if (error) throw new Error(`Partner feed query failed: ${error.message}`);

  return buildPartnerFeedRows((data ?? []) as unknown as PartnerFeedDeviceRow[]);
}
