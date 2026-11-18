import { hasPermission } from "@/lib/auth/permissions";
import { INTERN_ROLE } from "@/lib/auth/intern-access";
import type { StaffIdentity } from "@/lib/auth/require-staff";
import { getStoreScope, isOwner, parseRequestedScope, type StoreScope } from "@/lib/auth/store-scope";

export type StatViewer = { isOwner: boolean; scope: StoreScope; canExport: boolean };

/** Ejeren, eller en medarbejder med se_statistik. Praktikanter aldrig. */
export function canSeeStatistik(staff: { role: string; permissions?: readonly string[] | null }): boolean {
  if (staff.role === INTERN_ROLE) return false;
  return hasPermission(staff, "se_statistik");
}

/**
 * Hvem ser statistikken, og hvilken butik? Afgøres på serveren.
 * Ejeren vælger butik via forespørgslen (ellers cookie-scope); alle andre ser altid egen butik.
 */
export function statViewer(
  staff: StaffIdentity,
  cookieScope: StoreScope,
  requestedStore: string | undefined,
): StatViewer | null {
  if (!canSeeStatistik(staff)) return null;
  const owner = isOwner(staff);
  const scope: StoreScope = owner ? (parseRequestedScope(requestedStore) ?? cookieScope) : getStoreScope(staff);
  return { isOwner: owner, scope, canExport: hasPermission(staff, "eksportere") };
}
