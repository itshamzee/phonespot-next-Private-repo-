import type { SupabaseClient } from "@supabase/supabase-js";
import {
  discountPercentForServiceCount,
  type BookingDevice,
} from "./booking-devices";

// Priser og rabat kommer ALTID fra databasen. Klienten sender kun, hvilke
// services (id) den vil have, på hvilken model. Alt andet (pris, total, rabat)
// ignoreres, så en kunde ikke kan betale 1 kr. ved at pille i requesten.

type CatalogRow = {
  id: string;
  name: string;
  price_dkk: number;
  active: boolean;
  repair_models: { name: string } | { name: string }[] | null;
};

const norm = (s: string) => s.trim().toLowerCase();

export type CatalogResult =
  | { ok: true; devices: BookingDevice[]; discountPercent: number; serviceCount: number }
  | { ok: false; error: string };

export async function priceFromCatalog(
  supabase: SupabaseClient,
  devices: BookingDevice[],
): Promise<CatalogResult> {
  if (devices.length === 0 || devices.some((d) => d.selected_services.length === 0)) {
    return { ok: false, error: "Mindst én service skal vælges" };
  }
  const ids = [...new Set(devices.flatMap((d) => d.selected_services.map((s) => s.id ?? "")))];
  if (ids.some((id) => !id)) return { ok: false, error: "Ukendt service" };

  const { data, error } = await supabase
    .from("repair_services")
    .select("id, name, price_dkk, active, repair_models(name)")
    .in("id", ids);
  if (error) {
    console.error("[repairs] service lookup failed:", error);
    return { ok: false, error: "Kunne ikke hente priser. Prøv igen senere." };
  }
  const byId = new Map((data as unknown as CatalogRow[] | null ?? []).map((r) => [r.id, r]));

  let serviceCount = 0;
  const out: BookingDevice[] = [];
  for (const device of devices) {
    const seen = new Set<string>();
    const services = [];
    for (const requested of device.selected_services) {
      const id = requested.id as string;
      const row = byId.get(id);
      if (!row || !row.active) return { ok: false, error: "Ukendt eller utilgængelig service" };
      if (seen.has(id)) return { ok: false, error: "Samme service er valgt flere gange" };
      seen.add(id);
      const model = Array.isArray(row.repair_models) ? row.repair_models[0] : row.repair_models;
      if (!model || norm(model.name) !== norm(device.device_model)) {
        return { ok: false, error: `Servicen hører ikke til ${device.device_model}` };
      }
      const price = Number(row.price_dkk);
      if (!Number.isFinite(price) || price < 0) return { ok: false, error: "Ugyldig pris" };
      if (price !== requested.price_dkk) {
        console.warn("[repairs] client price differs from catalog, using catalog:", id, requested.price_dkk, price);
      }
      services.push({ id, name: row.name, price_dkk: price });
    }
    serviceCount += services.length;
    out.push({
      ...device,
      selected_services: services,
      service_type: services.map((s) => s.name).join(", "),
    });
  }

  return {
    ok: true,
    devices: out,
    serviceCount,
    discountPercent: discountPercentForServiceCount(serviceCount),
  };
}
