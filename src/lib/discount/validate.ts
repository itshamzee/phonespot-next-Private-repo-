import { createServerClient } from "@/lib/supabase/client";

type ValidateResult =
  | { valid: true; discount: { id: string; code: string; type: string; value: number } }
  | { valid: false; error: string };

/**
 * Validate a discount code against the current order.
 * Checks: existence, active status, date range, usage limit, min order amount.
 */
export async function validateDiscountCode(
  code: string,
  orderSubtotal: number,
): Promise<ValidateResult> {
  const supabase = createServerClient();

  const { data: discount, error } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .single();

  if (error || !discount) {
    return { valid: false, error: "Ukendt rabatkode" };
  }

  const now = new Date();

  // Check valid_from
  if (discount.valid_from && new Date(discount.valid_from) > now) {
    return { valid: false, error: "Rabatkoden er ikke aktiv endnu" };
  }

  // Check valid_until
  if (discount.valid_until && new Date(discount.valid_until) < now) {
    return { valid: false, error: "Rabatkoden er udlobet" };
  }

  // Check usage limit
  if (discount.usage_limit !== null && discount.times_used >= discount.usage_limit) {
    return { valid: false, error: "Rabatkoden er brugt op" };
  }

  // Check min order amount
  if (discount.min_order_amount > 0 && orderSubtotal < discount.min_order_amount) {
    const minFormatted = (discount.min_order_amount / 100).toLocaleString("da-DK");
    return {
      valid: false,
      error: `Minimum ordrebelob er ${minFormatted} DKK`,
    };
  }

  return {
    valid: true,
    discount: {
      id: discount.id,
      code: discount.code,
      type: discount.type,
      value: discount.value,
    },
  };
}
