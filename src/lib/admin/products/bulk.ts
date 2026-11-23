import { z } from "zod";

/**
 * Masseændring af produkter i sku_products fra admin-listerne.
 * Én ændring kan sætte status, bestillingsvare, pris og tilbudspris på mange
 * produkter ad gangen. Planlægningen er ren, så reglerne kan testes uden database.
 */

/** Under Supabase' grænse på 1000 rækker pr. kald, så "for mange" kan opdages i stedet for at blive skåret væk. */
export const BULK_MAX = 500;

export const bulkChangeSchema = z
  .object({
    status: z.enum(["published", "draft"]).optional(),
    alwaysInStock: z.boolean().optional(),
    price: z
      .discriminatedUnion("mode", [
        z.object({ mode: z.literal("set"), oere: z.number().int().positive() }),
        /** +15 = 15 % dyrere, -10 = 10 % billigere. */
        z.object({ mode: z.literal("percent"), percent: z.number().min(-90).max(500) }),
      ])
      .optional(),
    sale: z
      .discriminatedUnion("mode", [
        z.object({ mode: z.literal("set"), oere: z.number().int().positive() }),
        /** Rabat i procent af (den nye) pris. */
        z.object({ mode: z.literal("percent"), percent: z.number().min(1).max(90) }),
        z.object({ mode: z.literal("clear") }),
      ])
      .optional(),
  })
  .strict()
  .refine((c) => Object.values(c).some((v) => v !== undefined), { message: "Vælg en ændring" })
  .refine((c) => !(c.price?.mode === "percent" && c.price.percent === 0), { message: "0 % ændrer ingenting" });

export type BulkChange = z.infer<typeof bulkChangeSchema>;

export interface BulkRow {
  id: string;
  title: string;
  selling_price: number;
  sale_price: number | null;
}

export interface BulkPatch {
  status?: "published" | "draft";
  always_in_stock?: boolean;
  selling_price?: number;
  sale_price?: number | null;
}

export interface BulkPlan {
  updates: { id: string; patch: BulkPatch }[];
  skipped: { id: string; title: string; reason: string }[];
}

/** Priser vises uden øre på webshoppen, så procentregning ender altid på hele kroner. */
function wholeKroner(oere: number): number {
  return Math.round(oere / 100) * 100;
}

/**
 * Regner ud, hvad hvert produkt skal have skrevet. Et produkt springes helt
 * over (intet ændres), hvis resultatet ville give en tilbudspris, der ikke er
 * lavere end prisen, eller en pris under 1 kr.
 */
export function planBulkChange(rows: BulkRow[], change: BulkChange): BulkPlan {
  const plan: BulkPlan = { updates: [], skipped: [] };

  for (const row of rows) {
    const patch: BulkPatch = {};
    if (change.status) patch.status = change.status;
    if (change.alwaysInStock !== undefined) patch.always_in_stock = change.alwaysInStock;

    let price = row.selling_price;
    if (change.price?.mode === "set") price = change.price.oere;
    else if (change.price?.mode === "percent") price = wholeKroner(row.selling_price * (1 + change.price.percent / 100));
    if (change.price) {
      if (price < 100) {
        plan.skipped.push({ id: row.id, title: row.title, reason: "Prisen ville komme under 1 kr." });
        continue;
      }
      patch.selling_price = price;
    }

    let sale = row.sale_price;
    if (change.sale?.mode === "set") sale = change.sale.oere;
    else if (change.sale?.mode === "percent") sale = wholeKroner(price * (1 - change.sale.percent / 100));
    else if (change.sale?.mode === "clear") sale = null;
    if (change.sale) patch.sale_price = sale;

    // Gælder både en ny tilbudspris og en gammel, som en prisnedsættelse ville overhale.
    if ((change.sale || change.price) && sale != null && (sale >= price || sale < 100)) {
      plan.skipped.push({
        id: row.id,
        title: row.title,
        reason: change.sale ? "Tilbudsprisen skal være lavere end prisen" : "Den nuværende tilbudspris ville blive højere end den nye pris",
      });
      continue;
    }

    plan.updates.push({ id: row.id, patch });
  }
  return plan;
}

/** Samler produkter med præcis samme ændring, så de kan skrives i ét kald. */
export function groupByPatch(updates: BulkPlan["updates"]): { patch: BulkPatch; ids: string[] }[] {
  const groups = new Map<string, { patch: BulkPatch; ids: string[] }>();
  for (const u of updates) {
    const key = JSON.stringify([u.patch.status ?? null, u.patch.always_in_stock ?? null, u.patch.selling_price ?? null, "sale_price" in u.patch ? [u.patch.sale_price] : null]);
    const group = groups.get(key) ?? { patch: u.patch, ids: [] };
    group.ids.push(u.id);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
