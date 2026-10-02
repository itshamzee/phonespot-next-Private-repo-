import { normalizeStoreId } from "@/lib/stores";

/**
 * Whitelist over de felter personalet må ændre direkte på en sag. Alt andet i
 * body ignoreres — status har sin egen rute, fordi den logger og sender beskeder.
 */
export function buildTicketPatch(body: unknown): {
  patch: Record<string, unknown>;
  error?: string;
} {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if ("is_urgent" in input) {
    if (typeof input.is_urgent !== "boolean") {
      return { patch, error: "is_urgent skal være sandt eller falsk" };
    }
    patch.is_urgent = input.is_urgent;
  }

  if ("on_hold_reason" in input) {
    const reason = input.on_hold_reason;
    if (reason !== null && typeof reason !== "string") {
      return { patch, error: "on_hold_reason skal være tekst eller null" };
    }
    const trimmed = typeof reason === "string" ? reason.trim() : null;
    patch.on_hold_reason = trimmed ? trimmed.slice(0, 200) : null;
  }

  if ("store_id" in input) {
    patch.store_id = normalizeStoreId(input.store_id);
  }

  if (Object.keys(patch).length === 0) {
    return { patch, error: "Ingen gyldige felter at opdatere" };
  }
  return { patch };
}
