import { createServerClient } from "@/lib/supabase/client";
import type { StaffIdentity } from "@/lib/auth/require-staff";
import {
  buildLocationIndex,
  canAccessStore,
  isOwner,
  slugForLocationId,
  type LocationIndex,
  type ScopeSlug,
} from "@/lib/auth/store-scope";
import { PosError } from "./errors";

export const storeForbidden = () => new PosError("store_forbidden", "Du har ikke adgang til denne butik.", 403);

async function loadLocationIndex(): Promise<LocationIndex> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("locations").select("id, name, slug, type");
  if (error) throw new Error(`Failed to load locations: ${error.message}`);
  return buildLocationIndex(data ?? []);
}

/**
 * Kassens butik afgøres af serveren, aldrig af klienten: kassen slås op, dens
 * egen location bruges, og ekspedienten (actor) skal have adgang til butikken.
 */
export async function resolveRegister(
  actor: StaffIdentity,
  registerId: string,
): Promise<{ registerId: string; locationId: string; locationSlug: ScopeSlug }> {
  const supabase = createServerClient();
  const { data: reg, error } = await supabase
    .from("registers")
    .select("id, location_id, active")
    .eq("id", registerId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load register: ${error.message}`);
  if (!reg || reg.active === false || !reg.location_id) {
    throw new PosError("register_not_found", "Kassen findes ikke eller er inaktiv", 404);
  }

  const slug = slugForLocationId(await loadLocationIndex(), reg.location_id);
  if (!slug || !canAccessStore(actor, slug)) throw storeForbidden();
  return { registerId: reg.id, locationId: reg.location_id, locationSlug: slug };
}

/** Må ekspedienten røre denne location (uuid)? Ukendt location afvises som 403 (fail closed). */
export async function assertLocationAccess(actor: StaffIdentity, locationId: string): Promise<ScopeSlug> {
  const slug = slugForLocationId(await loadLocationIndex(), locationId);
  if (!slug || !canAccessStore(actor, slug)) throw storeForbidden();
  return slug;
}

/** Kassesessionens kasse slås op, så luk/juster følger samme adgangsregel som kassen. */
export async function assertSessionAccess(actor: StaffIdentity, sessionId: string): Promise<void> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("cash_sessions")
    .select("register_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load cash session: ${error.message}`);
  if (!data) throw new PosError("session_not_found", "Kassesessionen findes ikke", 404);
  await resolveRegister(actor, data.register_id);
}

/** Dagsopgørelser uden kasse/location (alle butikker) er forbeholdt ejeren. */
export function assertOwnerForAllStores(actor: StaffIdentity): void {
  if (!isOwner(actor)) throw storeForbidden();
}
