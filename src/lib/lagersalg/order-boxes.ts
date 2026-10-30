import type { createAdminClient } from "@/lib/supabase/admin";
import { storeLocations } from "@/lib/accessory-intake/candidates";
import { boxNumbersFor } from "@/lib/lagersalg/boxes";
import { isLagersalg } from "@/lib/lagersalg/is-lagersalg";

type Db = ReturnType<typeof createAdminClient>;

export type OrderSkuInput = {
  id: string;
  subcategory: string | null;
  attributes: Record<string, string> | null | undefined;
};

/**
 * Kassen er plukoplysning: kassenumre for de lagersalgsvarer en ordre indeholder, i den butik
 * ordren plukkes fra (ordrens location når det er en butik, ellers Vejle).
 */
export async function boxesForOrderSkus(
  db: Db,
  { orderLocationId, skus }: { orderLocationId: string | null; skus: OrderSkuInput[] },
): Promise<{ locationId: string | null; boxes: Record<string, number[]>; lagersalg: Record<string, boolean> }> {
  const lagersalg: Record<string, boolean> = {};
  for (const s of skus) lagersalg[s.id] = isLagersalg(s);

  const stores = await storeLocations(db);
  const locationId =
    (orderLocationId && stores.find((l) => l.id === orderLocationId)?.id) ||
    stores.find((l) => l.name.toLowerCase().includes("vejle"))?.id ||
    null;

  const ids = skus.filter((s) => lagersalg[s.id]).map((s) => s.id);
  if (!locationId || ids.length === 0) return { locationId, boxes: {}, lagersalg };

  const boxes = Object.fromEntries(await boxNumbersFor(db, ids, locationId));
  return { locationId, boxes, lagersalg };
}
