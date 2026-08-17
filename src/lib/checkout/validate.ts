import { createServerClient } from "@/lib/supabase/client";
import type { CartItem, CartDeviceItem, CartSkuItem } from "@/lib/cart/types";
import { resolveUpgrades, type AllowedUpgrade } from "./upgrades";

export interface ValidatedItem {
  item: CartItem;
  serverPrice: number;
  available: boolean;
  error?: string;
  /** devices.source for device-linjer — 'foxway' for dropship-enheder. */
  deviceSource?: string | null;
}

export interface ValidationResult {
  valid: boolean;
  items: ValidatedItem[];
  errors: string[];
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
      .select("id, status, selling_price, reservation_expires_at, source, source_stock, template_id")
      .in("id", deviceIds);
    const deviceMap = new Map((dbDevices ?? []).map((d) => [d.id, d]));

    const upgradeTemplateIds = devices
      .filter((d) => (d.upgrades?.length ?? 0) > 0)
      .map((d) => deviceMap.get(d.deviceId)?.template_id)
      .filter((t): t is string => !!t);

    const allowedByTemplate = new Map<string, AllowedUpgrade[]>();
    if (upgradeTemplateIds.length > 0) {
      const { data: links } = await supabase
        .from("template_upgrade_options")
        .select("template_id, option:laptop_upgrade_options(id, kind, label, price, active)")
        .in("template_id", upgradeTemplateIds);
      for (const row of (links ?? []) as unknown as Array<{ template_id: string; option: { id: string; kind: "ram" | "ssd"; label: string; price: number; active: boolean } | null }>) {
        if (!row.option?.active) continue;
        const list = allowedByTemplate.get(row.template_id) ?? [];
        list.push({ id: row.option.id, kind: row.option.kind, label: row.option.label, price: row.option.price });
        allowedByTemplate.set(row.template_id, list);
      }
    }

    for (const item of devices) {
      const db = deviceMap.get(item.deviceId);
      if (!db) {
        validated.push({ item, serverPrice: 0, available: false, error: "Enhed ikke fundet", deviceSource: null });
        errors.push(`${item.title} er ikke tilgængelig`);
        continue;
      }
      if (db.source === "foxway") {
        // Foxway devices: validate stock instead of reservation
        if ((db.source_stock ?? 0) <= 0) {
          validated.push({ item, serverPrice: 0, available: false, error: "Udsolgt", deviceSource: db.source ?? null });
          errors.push(`${item.title} er udsolgt`);
          continue;
        }
        if (item.upgrades?.length) {
          const resolved = resolveUpgrades(item.upgrades, allowedByTemplate.get(db.template_id) ?? []);
          if (resolved.error) {
            validated.push({ item, serverPrice: 0, available: false, error: resolved.error, deviceSource: db.source ?? null });
            errors.push(`${item.title}: ${resolved.error}`);
            continue;
          }
          validated.push({ item: { ...item, upgrades: resolved.upgrades }, serverPrice: db.selling_price, available: true, deviceSource: db.source ?? null });
          continue;
        }
        validated.push({ item, serverPrice: db.selling_price, available: true, deviceSource: db.source ?? null });
        continue;
      }
      if (db.status !== "reserved") {
        validated.push({ item, serverPrice: 0, available: false, error: "Enhed er ikke reserveret", deviceSource: db.source ?? null });
        errors.push(`${item.title} er ikke længere tilgængelig`);
        continue;
      }
      if (db.reservation_expires_at && new Date(db.reservation_expires_at) < new Date()) {
        validated.push({ item, serverPrice: 0, available: false, error: "Reservation udløbet", deviceSource: db.source ?? null });
        errors.push(`Reservation for ${item.title} er udløbet`);
        continue;
      }
      if (item.upgrades?.length) {
        const resolved = resolveUpgrades(item.upgrades, allowedByTemplate.get(db.template_id) ?? []);
        if (resolved.error) {
          validated.push({ item, serverPrice: 0, available: false, error: resolved.error, deviceSource: db.source ?? null });
          errors.push(`${item.title}: ${resolved.error}`);
          continue;
        }
        validated.push({ item: { ...item, upgrades: resolved.upgrades }, serverPrice: db.selling_price, available: true, deviceSource: db.source ?? null });
        continue;
      }
      validated.push({ item, serverPrice: db.selling_price, available: true, deviceSource: db.source ?? null });
    }
  }

  if (skus.length > 0) {
    const realSkus = skus;
    {
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
        const serverPrice = db.sale_price ?? db.selling_price;
        validated.push({ item, serverPrice, available: true });
      }
    }
  }

  return { valid: errors.length === 0, items: validated, errors };
}

/** True når mindst én tilgængelig ordrelinje er en Foxway-enhed. */
export function hasFoxwayDevice(items: ValidatedItem[]): boolean {
  return items.some((vi) => vi.available && vi.deviceSource === "foxway");
}
