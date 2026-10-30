import type { createAdminClient } from "@/lib/supabase/admin";
import { storeLocations } from "@/lib/accessory-intake/candidates";
import { loadLocationIndex } from "@/lib/auth/store-scope-server";
import { boxNumbersFor, picksForOrder } from "@/lib/lagersalg/boxes";
import { isLagersalg } from "@/lib/lagersalg/is-lagersalg";

type Db = ReturnType<typeof createAdminClient>;

export type OrderSkuInput = {
  id: string;
  subcategory: string | null;
  attributes: Record<string, string> | null | undefined;
};

/**
 * Kassen er plukoplysning: kassenumre for de lagersalgsvarer en ordre indeholder.
 * Først de pluk salget registrerede (sale_box_picks) — kassebeholdningen er allerede trukket ned,
 * når pakkeren åbner ordren. Kun varer uden pluk (fx salg fra før pluk blev gemt, eller varen lå
 * ikke i nogen kasse ved salget) falder tilbage til den nuværende kassebeholdning i den butik
 * ordren plukkes fra (ordrens location når det er en butik, ellers Vejle).
 */
export async function boxesForOrderSkus(
  db: Db,
  {
    orderId,
    orderLocationId,
    skus,
  }: { orderId: string | null; orderLocationId: string | null; skus: OrderSkuInput[] },
): Promise<{ locationId: string | null; boxes: Record<string, number[]>; lagersalg: Record<string, boolean> }> {
  const lagersalg: Record<string, boolean> = {};
  for (const s of skus) lagersalg[s.id] = isLagersalg(s);

  const [stores, index] = await Promise.all([storeLocations(db), loadLocationIndex()]);
  // Vejle slås op på slug (locations.slug = 'vejle'), ikke på navn: butik nr. 4 i Vejle gågade
  // må ikke blive fallback-butikken bare fordi navnet indeholder "Vejle".
  const locationId =
    (orderLocationId && stores.find((l) => l.id === orderLocationId)?.id) || index.idBySlug.vejle || null;

  const ids = skus.filter((s) => lagersalg[s.id]).map((s) => s.id);
  if (ids.length === 0) return { locationId, boxes: {}, lagersalg };

  const boxes: Record<string, number[]> = {};
  const picks = orderId ? await picksForOrder(db, orderId) : new Map<string, number[]>();
  for (const id of ids) {
    const picked = picks.get(id);
    if (picked && picked.length > 0) boxes[id] = picked;
  }

  const unpicked = ids.filter((id) => !boxes[id]);
  if (locationId && unpicked.length > 0) {
    for (const [id, numbers] of await boxNumbersFor(db, unpicked, locationId)) boxes[id] = numbers;
  }
  return { locationId, boxes, lagersalg };
}
