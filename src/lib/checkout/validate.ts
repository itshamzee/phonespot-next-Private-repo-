import { readReservationOwner } from "@/lib/cart/reservation-owner";
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
  reservationId?: string;
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
    const { data: dbDevices, error: deviceError } = await supabase
      .from("devices")
      .select("id, status, selling_price, reservation_expires_at, source, source_stock, template_id, reservation_id, reservation_owner_hash, reservation_order_id")
      .in("id", deviceIds);
    const deviceMap = new Map((deviceError ? [] : dbDevices ?? []).map((d) => [d.id, d]));

    const owner = [...deviceMap.values()].some(d => d.source !== "foxway") ? await readReservationOwner() : null;
    const duplicateIds = new Set(deviceIds.filter((id, i) => deviceIds.indexOf(id) !== i));
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
      if (!db || duplicateIds.has(item.deviceId)) {
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
      if (!owner || db.reservation_owner_hash !== owner || !db.reservation_id || db.reservation_order_id || !db.reservation_expires_at || !(new Date(db.reservation_expires_at).getTime() > Date.now())) {
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
        validated.push({ item: { ...item, upgrades: resolved.upgrades }, serverPrice: db.selling_price, available: true, deviceSource: db.source ?? null, reservationId: db.reservation_id });
        continue;
      }
      validated.push({ item, serverPrice: db.selling_price, available: true, deviceSource: db.source ?? null, reservationId: db.reservation_id });
    }
  }

  if (skus.length > 0) {
    const requested = new Map<string, number>();
    for (const item of skus) {
      const total = (requested.get(item.skuProductId) ?? 0) + item.quantity;
      requested.set(item.skuProductId, Number.isSafeInteger(item.quantity) && item.quantity > 0 && Number.isSafeInteger(total) ? total : NaN);
    }
    const { data, error } = await supabase.from("checkout_sku_inventory")
      .select("id, selling_price, sale_price, is_active, always_in_stock, total_stock")
      .in("id", [...requested.keys()]);
    const skuMap = new Map((error ? [] : data ?? []).map(s => [s.id, s]));
    for (const item of skus) {
      const db = skuMap.get(item.skuProductId);
      const demand = requested.get(item.skuProductId)!;
      const stock = db?.total_stock;
      const available = !!db?.is_active && Number.isSafeInteger(demand) && demand > 0 &&
        (!!db.always_in_stock || (Number.isSafeInteger(stock) && stock >= demand));
      const message = "Produktets lager eller antal kunne ikke bekræftes";
      validated.push({ item, serverPrice: db?.sale_price ?? db?.selling_price ?? 0, available, ...(available ? {} : {error: message}) });
      if (!available) errors.push(item.title + ": " + message);
    }
  }

  return { valid: errors.length === 0, items: validated, errors };
}

/** True når mindst én tilgængelig ordrelinje er en Foxway-enhed. */
export function hasFoxwayDevice(items: ValidatedItem[]): boolean {
  return items.some((vi) => vi.available && vi.deviceSource === "foxway");
}
