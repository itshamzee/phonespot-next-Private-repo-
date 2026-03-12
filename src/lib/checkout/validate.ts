import { createServerClient } from "@/lib/supabase/client";
import type { CartItem, CartDeviceItem, CartSkuItem } from "@/lib/cart/types";

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
      .select("id, status, selling_price, reservation_expires_at")
      .in("id", deviceIds);
    const deviceMap = new Map((dbDevices ?? []).map((d) => [d.id, d]));

    for (const item of devices) {
      const db = deviceMap.get(item.deviceId);
      if (!db) {
        validated.push({ item, serverPrice: 0, available: false, error: "Enhed ikke fundet" });
        errors.push(`${item.title} er ikke tilgængelig`);
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
    const skuIds = skus.map((s) => s.skuProductId);
    const { data: dbSkus } = await supabase
      .from("sku_products")
      .select("id, selling_price, sale_price, is_active")
      .in("id", skuIds);
    const { data: stocks } = await supabase
      .from("sku_stock")
      .select("product_id, quantity, location:locations!inner(type)")
      .in("product_id", skuIds)
      .eq("locations.type", "online");
    const skuMap = new Map((dbSkus ?? []).map((s) => [s.id, s]));
    const stockMap = new Map((stocks ?? []).map((s) => [s.product_id, s.quantity as number]));

    for (const item of skus) {
      const db = skuMap.get(item.skuProductId);
      if (!db || !db.is_active) {
        validated.push({ item, serverPrice: 0, available: false, error: "Produkt ikke fundet" });
        errors.push(`${item.title} er ikke tilgængelig`);
        continue;
      }
      const stock = stockMap.get(item.skuProductId) ?? 0;
      if (stock < item.quantity) {
        validated.push({ item, serverPrice: db.sale_price ?? db.selling_price, available: false, error: `Kun ${stock} på lager` });
        errors.push(`${item.title}: kun ${stock} på lager`);
        continue;
      }
      validated.push({ item, serverPrice: db.sale_price ?? db.selling_price, available: true });
    }
  }

  return { valid: errors.length === 0, items: validated, errors };
}
