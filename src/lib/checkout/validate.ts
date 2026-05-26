import { createServerClient } from "@/lib/supabase/client";
import type { CartItem, CartDeviceItem, CartSkuItem } from "@/lib/cart/types";
import {
  SOMMER_BUNDLE_2026,
  TPU_CASE_BY_TEMPLATE_ID,
  BATTERY_UPGRADE,
} from "@/lib/campaigns/sommer-bundle";

export interface ValidatedItem {
  item: CartItem;
  serverPrice: number;
  available: boolean;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  items: ValidatedItem[];
  errors: string[];
}

/**
 * Returns true when a sku_product is a trusted Sommer Bundle freebie.
 * Freebies are server-priced at 0 øre regardless of their DB selling price.
 */
function isTrustedFreebie(item: CartSkuItem): boolean {
  if (!item.bundleAttached || item.bundleAttached.campaignId !== "sommer-bundle-2026") return false;
  if (item.skuProductId === SOMMER_BUNDLE_2026.glassSkuId) return true;
  return Object.values(TPU_CASE_BY_TEMPLATE_ID).includes(item.skuProductId);
}

export async function validateCart(items: CartItem[]): Promise<ValidationResult> {
  const supabase = createServerClient();
  const errors: string[] = [];
  const validated: ValidatedItem[] = [];

  const devices = items.filter((i): i is CartDeviceItem => i.type === "device");
  const skus = items.filter((i): i is CartSkuItem => i.type === "sku_product");

  if (devices.length > 0) {
    const deviceIds = devices.map((d) => d.deviceId);
    const { data: dbDevices } = await supabase
      .from("devices")
      .select("id, status, selling_price, reservation_expires_at, source, source_stock")
      .in("id", deviceIds);
    const deviceMap = new Map((dbDevices ?? []).map((d) => [d.id, d]));

    for (const item of devices) {
      const db = deviceMap.get(item.deviceId);
      if (!db) {
        validated.push({ item, serverPrice: 0, available: false, error: "Enhed ikke fundet" });
        errors.push(`${item.title} er ikke tilgængelig`);
        continue;
      }
      if (db.source === "foxway") {
        // Foxway devices: validate stock instead of reservation
        if ((db.source_stock ?? 0) <= 0) {
          validated.push({ item, serverPrice: 0, available: false, error: "Udsolgt" });
          errors.push(`${item.title} er udsolgt`);
          continue;
        }
        validated.push({ item, serverPrice: db.selling_price, available: true });
        continue;
      }
      if (db.status !== "reserved") {
        validated.push({ item, serverPrice: 0, available: false, error: "Enhed er ikke reserveret" });
        errors.push(`${item.title} er ikke længere tilgængelig`);
        continue;
      }
      if (db.reservation_expires_at && new Date(db.reservation_expires_at) < new Date()) {
        validated.push({ item, serverPrice: 0, available: false, error: "Reservation udløbet" });
        errors.push(`Reservation for ${item.title} er udløbet`);
        continue;
      }
      validated.push({ item, serverPrice: db.selling_price, available: true });
    }
  }

  if (skus.length > 0) {
    // Separate synthetic battery-upgrade lines from real DB-backed SKUs.
    // Battery-upgrade items use a synthetic skuProductId ("battery-upgrade:<uuid>")
    // and are not stored in sku_products — they are validated by kind alone.
    const batteryUpgradeItems = skus.filter((s) => s.kind === "battery-upgrade");
    const realSkus = skus.filter((s) => s.kind !== "battery-upgrade");

    // Validate battery-upgrade lines server-side without DB lookup.
    for (const item of batteryUpgradeItems) {
      validated.push({
        item,
        serverPrice: BATTERY_UPGRADE.price_oere,
        available: true,
      });
    }

    if (realSkus.length > 0) {
      const skuIds = realSkus.map((s) => s.skuProductId);
      const { data: dbSkus } = await supabase
        .from("sku_products")
        .select("id, selling_price, sale_price, is_active, always_in_stock")
        .in("id", skuIds);
      // Sum stock across ALL locations (store + online + warehouse)
      // A product is orderable if it exists anywhere
      const { data: stocks } = await supabase
        .from("sku_stock")
        .select("product_id, quantity")
        .in("product_id", skuIds);
      const skuMap = new Map((dbSkus ?? []).map((s) => [s.id, s]));
      const stockMap = new Map<string, number>();
      for (const s of stocks ?? []) {
        stockMap.set(s.product_id, (stockMap.get(s.product_id) ?? 0) + (s.quantity as number));
      }

      for (const item of realSkus) {
        const db = skuMap.get(item.skuProductId);
        if (!db || !db.is_active) {
          validated.push({ item, serverPrice: 0, available: false, error: "Produkt ikke fundet" });
          errors.push(`${item.title} er ikke tilgængelig`);
          continue;
        }
        // Skip stock check for always-in-stock products (e.g., screen protectors)
        if (!db.always_in_stock) {
          const stock = stockMap.get(item.skuProductId) ?? 0;
          if (stock < item.quantity) {
            validated.push({ item, serverPrice: db.sale_price ?? db.selling_price, available: false, error: `Kun ${stock} på lager` });
            errors.push(`${item.title}: kun ${stock} på lager`);
            continue;
          }
        }
        // Trusted Sommer Bundle freebies are priced at 0 øre server-side.
        // The DB price is non-zero; we override it here so the Stripe line item
        // reflects the promotional 0-price rather than the retail price.
        const serverPrice = isTrustedFreebie(item) ? 0 : (db.sale_price ?? db.selling_price);
        validated.push({ item, serverPrice, available: true });
      }
    }
  }

  return { valid: errors.length === 0, items: validated, errors };
}
