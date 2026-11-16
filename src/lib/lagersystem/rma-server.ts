import "server-only";
import { isOwner } from "@/lib/auth/store-scope";
import type { RmaItem } from "./api-types";
import { canManageStock } from "./locations";

/**
 * Kostpris er kun for ejeren (samme regel som Dele brugt). Kreditbeløbet ser ejer og leder,
 * fordi de også er dem, der må angive det.
 */
export function rmaForStaff(
  staff: { role: string },
  item: RmaItem,
): RmaItem | Omit<RmaItem, "unit_cost_ore"> | Omit<RmaItem, "unit_cost_ore" | "credit_ore"> {
  if (isOwner(staff)) return item;
  const { unit_cost_ore: _c, ...withCredit } = item;
  if (canManageStock(staff)) return withCredit;
  const { credit_ore: _k, ...rest } = withCredit;
  return rest;
}
