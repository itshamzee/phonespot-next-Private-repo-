import "server-only";
import { isOwner } from "@/lib/auth/store-scope";
import type { RmaItem } from "./api-types";

/** Kostpris og kreditbeløb er kun for ejeren (samme regel som Dele brugt). */
export function rmaForStaff(staff: Parameters<typeof isOwner>[0], item: RmaItem): RmaItem | Omit<RmaItem, "unit_cost_ore" | "credit_ore"> {
  if (isOwner(staff)) return item;
  const { unit_cost_ore: _c, credit_ore: _k, ...rest } = item;
  return rest;
}
