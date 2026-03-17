// src/lib/foneday/sync.ts
// Foneday catalog sync — upsert, price/stock update, missing detection

import { createAdminClient } from "@/lib/supabase/admin";
import { getProducts } from "./client";
import { clearMapCache } from "./mapper";
import type { FonedayProduct, FonedaySettings, SyncStats } from "./types";

async function getFonedaySettings(): Promise<FonedaySettings> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "foneday")
    .single();
  return (data?.value as FonedaySettings) ?? { eur_dkk_rate: 745, in_stock_qty: 99 };
}

function eurToOere(priceEur: number, rate: number): number {
  // rate = DKK-per-EUR * 100, e.g. 745 = 7.45 DKK/EUR
  // Result: priceEur * rate = oere (e.g. 119.99 * 745 = 89,393 oere = 893.93 DKK)
  return Math.round(priceEur * rate);
}

export async function syncCatalog(): Promise<SyncStats> {
  const supabase = createAdminClient();
  const settings = await getFonedaySettings();
  clearMapCache();

  const stats: SyncStats = { synced: 0, new: 0, missing: 0, linked_updated: 0, errors: [] };

  // 1. Fetch all products from Foneday
  let products: FonedayProduct[];
  try {
    const response = await getProducts();
    products = response.products;
  } catch (err) {
    stats.errors.push(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return stats;
  }

  const now = new Date().toISOString();
  const fetchedSkus = new Set<string>();

  // Get existing SKUs before upsert to detect genuinely new products
  const { data: existingRows } = await supabase
    .from("foneday_catalog")
    .select("foneday_sku");
  const existingSkus = new Set((existingRows ?? []).map((r) => r.foneday_sku));

  // 2. Upsert products into foneday_catalog
  // Process in batches of 100 to avoid payload limits
  const batchSize = 100;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const rows = batch.map((p) => ({
      foneday_sku: p.sku,
      ean: p.ean,
      title: p.title,
      in_stock: p.instock === "Y",
      suitable_for: p.suitable_for,
      category: p.category,
      product_brand: p.product_brand,
      artcode: p.artcode,
      quality: p.quality,
      model_brand: p.model_brand,
      model_codes: p.model_codes ?? [],
      price_eur: p.price,
      price_dkk: eurToOere(p.price, settings.eur_dkk_rate),
      raw_data: p as unknown as Record<string, unknown>,
      missing_since: null, // clear missing flag
      last_synced_at: now,
      updated_at: now,
    }));

    const { error } = await supabase
      .from("foneday_catalog")
      .upsert(rows, { onConflict: "foneday_sku" });

    if (error) {
      stats.errors.push(`Upsert batch ${i}: ${error.message}`);
    } else {
      stats.synced += batch.length;
    }

    batch.forEach((p) => fetchedSkus.add(p.sku));
  }

  // Count genuinely new products by comparing against pre-sync SKU set
  stats.new = products.filter((p) => !existingSkus.has(p.sku)).length;

  // 3. Mark missing products
  // Products in our catalog that weren't in the API response
  const { data: allCatalog } = await supabase
    .from("foneday_catalog")
    .select("id, foneday_sku, missing_since")
    .is("missing_since", null);

  const missingRows = (allCatalog ?? []).filter((row) => !fetchedSkus.has(row.foneday_sku));
  if (missingRows.length > 0) {
    const { error } = await supabase
      .from("foneday_catalog")
      .update({ missing_since: now, in_stock: false, updated_at: now })
      .in("id", missingRows.map((r) => r.id));
    if (error) stats.errors.push(`Mark missing: ${error.message}`);
    stats.missing = missingRows.length;
  }

  // 4. Update linked retail accessories
  const { data: links } = await supabase
    .from("foneday_sku_link")
    .select("*, foneday_catalog:foneday_catalog_id(*)")
    .eq("use_type", "retail")
    .not("accessory_id", "is", null);

  for (const link of links ?? []) {
    const catalog = link.foneday_catalog as any;
    if (!catalog || !link.accessory_id) continue;

    const updates: Record<string, unknown> = { updated_at: now };

    if (link.auto_sync_price) {
      const costDkk = eurToOere(catalog.price_eur, settings.eur_dkk_rate);
      const markup = Number(link.markup_percentage) || 0;
      const sellingPrice = Math.round(costDkk * (1 + markup / 100));
      updates.cost_price = costDkk;
      updates.price = sellingPrice;
    }

    if (link.auto_sync_stock) {
      updates.online_stock = catalog.in_stock ? settings.in_stock_qty : 0;
    }

    const { error } = await supabase
      .from("accessories")
      .update(updates)
      .eq("id", link.accessory_id);

    if (error) {
      stats.errors.push(`Update accessory ${link.accessory_id}: ${error.message}`);
    } else {
      stats.linked_updated++;
    }
  }

  // 5. Archive stale products (missing > 7 days with retail link)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: staleLinks } = await supabase
    .from("foneday_sku_link")
    .select("accessory_id, foneday_catalog:foneday_catalog_id(missing_since)")
    .eq("use_type", "retail")
    .not("accessory_id", "is", null);

  for (const link of staleLinks ?? []) {
    const catalog = link.foneday_catalog as any;
    if (!catalog?.missing_since || !link.accessory_id) continue;
    if (catalog.missing_since < sevenDaysAgo) {
      await supabase
        .from("accessories")
        .update({ status: "archived", online_stock: 0, updated_at: now })
        .eq("id", link.accessory_id);
    }
  }

  return stats;
}
