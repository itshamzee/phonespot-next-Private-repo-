import { createServerClient } from "@/lib/supabase/client";
import type { StaffIdentity } from "@/lib/auth/require-staff";
import { isOwner } from "@/lib/auth/store-scope";
import { invoiceLegalEntity } from "@/lib/legal-entity";
import { PosError } from "./errors";
import { storeForbidden } from "./pos-context";

type EntityRel = { cvr: string | null } | Array<{ cvr: string | null }> | null;

/**
 * CVR of the legal entity behind a location. Strict, unlike legalEntityForLocation:
 * a lookup error throws and an unknown entity gives null, so the return check
 * fails closed instead of defaulting to Fixon.
 */
async function cvrForLocation(locationId: string | null): Promise<string | null> {
  if (!locationId) return null;
  const { data, error } = await createServerClient()
    .from("locations")
    .select("legal_entities(cvr)")
    .eq("id", locationId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load legal entity: ${error.message}`);
  const rel = (data as { legal_entities: EntityRel } | null)?.legal_entities ?? null;
  const entity = Array.isArray(rel) ? rel[0] : rel;
  return entity?.cvr ?? null;
}

/**
 * A return is only allowed within the same legal entity as the sale: the
 * original order's entity (orders.legal_cvr snapshot, else its location's
 * entity, else PhoneGo like invoices) must equal the entity of `registerLocationId`.
 * A missing order passes here; the database reports order_not_found.
 */
export async function assertReturnEntity(registerLocationId: string, originalOrderId: string): Promise<void> {
  const { data: order, error } = await createServerClient()
    .from("orders")
    .select("id, location_id, legal_cvr")
    .eq("id", originalOrderId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load original order: ${error.message}`);
  if (!order) return;

  const orderCvr =
    order.legal_cvr ||
    (await cvrForLocation(order.location_id)) ||
    invoiceLegalEntity({ legal_name: null, legal_cvr: null }).cvr;
  const registerCvr = await cvrForLocation(registerLocationId);
  if (!registerCvr || registerCvr !== orderCvr) {
    throw new PosError("return_other_entity", "Returen skal laves i en butik under samme firma som købet", 403);
  }
}

/** Return lookup (GET): the owner sees all; others only orders of their own store's entity. */
export async function assertReturnLookupEntity(actor: StaffIdentity, orderId: string): Promise<void> {
  if (isOwner(actor)) return;
  if (!actor.location_id) throw storeForbidden();
  await assertReturnEntity(actor.location_id, orderId);
}
