import type { createAdminClient } from "@/lib/supabase/admin";
import type { BuybackDevice } from "./types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

interface FallbackPriceRow {
  device_type: string | null;
  brand: string | null;
  model: string | null;
  storage: string | null;
  ram: string | null;
  base_price: number | null;
  active: boolean | null;
}

function key(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

// Hand-maintained fallback base price (øre) for a device in perfect condition.
// Only consulted when we have no refurbished sale price of our own. Matching is
// case- and whitespace-insensitive because the wizard stores free-form strings.
export async function lookupFallbackBaseOre(
  client: SupabaseAdmin,
  device: BuybackDevice,
): Promise<number | null> {
  const { data, error } = await client
    .from("buyback_prices")
    .select("device_type, brand, model, storage, ram, base_price, active")
    .eq("active", true);

  if (error || !data) return null;

  const match = (data as FallbackPriceRow[]).find(
    (row) =>
      row.active === true &&
      row.base_price != null &&
      row.base_price > 0 &&
      key(row.device_type) === key(device.deviceType) &&
      key(row.brand) === key(device.brand) &&
      key(row.model) === key(device.model) &&
      key(row.storage) === key(device.storage) &&
      key(row.ram) === key(device.ram),
  );

  return match?.base_price ?? null;
}
