import { createServerClient } from "@/lib/supabase/client";

export interface DiscountResult {
  valid: boolean;
  error?: string;
  code?: string;
  type?: "percentage" | "fixed" | "free_shipping";
  value?: number;
}

export async function validateDiscountCode(code: string, subtotal: number): Promise<DiscountResult> {
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("is_active", true)
    .single();
  if (error || !data) {
    return { valid: false, error: "Ugyldig rabatkode" };
  }
  if (data.valid_from && data.valid_from > now) {
    return { valid: false, error: "Rabatkoden er ikke aktiv endnu" };
  }
  if (data.valid_until && data.valid_until < now) {
    return { valid: false, error: "Rabatkoden er udløbet" };
  }
  if (data.usage_limit && data.times_used >= data.usage_limit) {
    return { valid: false, error: "Rabatkoden er brugt op" };
  }
  if (data.min_order_amount && subtotal < data.min_order_amount) {
    const minDkk = (data.min_order_amount / 100).toFixed(0);
    return { valid: false, error: `Minimum ordrebeløb er ${minDkk} kr.` };
  }
  return { valid: true, code: data.code, type: data.type, value: data.value };
}
