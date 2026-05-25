import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const PREFIX = "KOM-TILBAGE";
const VALIDITY_DAYS = 7;
const PERCENT = 5;

export interface GenerateRecoveryCodeParams {
  orderNumber: string;
}

/**
 * Insert a new single-use, 7-day, 5% percentage discount code and return
 * the human-readable code string for use in the recovery email.
 *
 * Code shape: `KOM-TILBAGE-<last 4 of order number>-<6 hex chars>`.
 * The order-number fragment makes codes traceable in customer support;
 * the random suffix prevents collisions and guessing.
 */
export async function generateRecoveryCode(
  admin: SupabaseClient,
  params: GenerateRecoveryCodeParams,
): Promise<string> {
  const orderFragment =
    params.orderNumber.replace(/[^0-9A-Za-z]/g, "").slice(-4) || "XXXX";
  const random = randomBytes(3).toString("hex").toUpperCase();
  const code = `${PREFIX}-${orderFragment}-${random}`;

  const now = new Date();
  const validUntil = new Date(
    now.getTime() + VALIDITY_DAYS * 24 * 60 * 60 * 1000,
  );

  const { error } = await admin
    .from("discount_codes")
    .insert({
      code,
      type: "percentage",
      value: PERCENT,
      min_order_amount: 0,
      valid_from: now.toISOString(),
      valid_until: validUntil.toISOString(),
      usage_limit: 1,
      times_used: 0,
      is_active: true,
    })
    .select("code")
    .single();

  if (error) {
    throw new Error(`Failed to insert recovery discount code: ${error.message}`);
  }
  return code;
}
