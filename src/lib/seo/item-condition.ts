/**
 * Maps PhoneSpot's device/product grading system to the schema.org
 * `itemCondition` values used in Product JSON-LD (and by extension, Google
 * Merchant Center).
 *
 * Grading system (see DeviceGrade in lib/supabase/platform-types.ts):
 *   - N = fabriksny / brand new, sealed, never used     -> NewCondition
 *   - P, A, B, C = refurbished / used, quality-graded    -> RefurbishedCondition
 *
 * Accessories (sku_products) have no grade column at all — they are new
 * goods sold as new, so they always map to NewCondition unless a future
 * "condition" field says otherwise.
 */

export const ITEM_CONDITION = {
  NEW: "https://schema.org/NewCondition",
  REFURBISHED: "https://schema.org/RefurbishedCondition",
} as const;

export type ItemCondition = (typeof ITEM_CONDITION)[keyof typeof ITEM_CONDITION];

/** Any grade string coming out of the devices table (DeviceGrade = 'N' | 'P' | 'A' | 'B' | 'C'). */
type GradeLike = string | null | undefined;

/** Single-device grade -> schema.org condition. */
export function gradeToItemCondition(grade: GradeLike): ItemCondition {
  return grade === "N" ? ITEM_CONDITION.NEW : ITEM_CONDITION.REFURBISHED;
}

/**
 * Derives the itemCondition for a Product JSON-LD node that describes a
 * *template* (one product page, potentially backed by several physical
 * devices with independent grades).
 *
 * Rule: a single Product node is a claim about the offering as a whole, so
 * it may only claim NewCondition when EVERY currently listed device is
 * grade N. A single non-N unit mixed in (e.g. one N + one B) means the
 * offering is not uniformly new, so the whole node must fall back to
 * RefurbishedCondition — anything else would let a stray used unit make an
 * inaccurate "new" claim, which is the exact bug this fix addresses in
 * reverse.
 *
 * When there are no currently listed devices (template is sold out and the
 * page is showing a fallback/base price), we have no live grade data to
 * confirm "new" — default to RefurbishedCondition, the more conservative
 * claim, consistent with the page's fallback price being keyed off
 * base_price_a (grade A).
 */
export function devicesToItemCondition(devices: { grade?: GradeLike }[]): ItemCondition {
  if (devices.length === 0) return ITEM_CONDITION.REFURBISHED;
  return devices.every((d) => d.grade === "N") ? ITEM_CONDITION.NEW : ITEM_CONDITION.REFURBISHED;
}
