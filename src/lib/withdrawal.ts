import { randomBytes } from "crypto";
import { createServerClient } from "@/lib/supabase/client";

export function generateWithdrawalToken(): string {
  return randomBytes(32).toString("base64url");
}

type WithdrawalResult = {
  id: string;
  order_number: string;
  status: string;
  type: string;
  is_b2b: boolean;
  total: number;
  created_at: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  customer_id: string | null;
  customers: unknown;
  eligible: boolean;
  reason?: string;
  daysRemaining?: number;
};

export async function validateWithdrawalToken(token: string): Promise<WithdrawalResult | null> {
  const supabase = createServerClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      type,
      is_b2b,
      total,
      created_at,
      confirmed_at,
      delivered_at,
      customer_id,
      customers (
        name,
        email
      )
    `)
    .eq("withdrawal_token", token)
    .single();

  if (error || !order) return null;

  if (order.is_b2b) return { ...order, eligible: false, reason: "B2B-ordre har ikke fortrydelsesret" };
  if (order.type === "pos") return { ...order, eligible: false, reason: "Køb i butik har ikke online fortrydelsesret" };

  const eligibleStatuses = ["confirmed", "shipped", "delivered"];
  if (!eligibleStatuses.includes(order.status)) {
    return { ...order, eligible: false, reason: "Ordren kan ikke fortrydes i dens nuværende status" };
  }

  const referenceDate = order.delivered_at || order.confirmed_at || order.created_at;
  const deadlineMs = new Date(referenceDate).getTime() + 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  if (now > deadlineMs) {
    return { ...order, eligible: false, reason: "Fortrydelsesfristen på 14 dage er udløbet" };
  }

  const daysRemaining = Math.ceil((deadlineMs - now) / (24 * 60 * 60 * 1000));

  return { ...order, eligible: true, daysRemaining };
}
