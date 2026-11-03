import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import AbandonedCartEmail, {
  subject as emailSubject,
  from as emailFrom,
} from "@/lib/email/templates/abandoned-cart-email";
import { hasGuaranteeQualifyingDevice, uspsForOrder } from "@/lib/email/brand";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = `PhoneSpot <${emailFrom}>`;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://phonespot.dk";

export type RecoveryEmailResult =
  | { ok: true; to: string }
  | { ok: false; reason: "missing_email" | "missing_token" | "send_failed"; detail?: string };

interface RecoveryOrder {
  id: string;
  total: number | null;
  recovery_token: string | null;
  customer: { email?: string | null; name?: string | null } | null;
  order_items: Array<{
    item_type: string;
    device_id: string | null;
    sku_product_id: string | null;
    quantity: number;
    unit_price: number;
  }> | null;
}

/** Felter som sendRecoveryEmail har brug for — brug i .select(). */
export const RECOVERY_ORDER_SELECT = `id, total, recovery_token, recovery_status, recovery_email_sent_at,
  customer:customers!inner(email, name, phone, marketing_consent),
  order_items(id, item_type, device_id, sku_product_id, quantity, unit_price)`;

/**
 * Sender "Du glemte noget i din kurv" for én forladt ordre og stempler
 * recovery_email_sent_at. Bruges af både cron-jobbet og admin-knappen
 * "Send påmindelse", så de altid sender den samme mail.
 */
export async function sendRecoveryEmail(
  supabase: SupabaseClient,
  order: RecoveryOrder,
): Promise<RecoveryEmailResult> {
  const customer = order.customer;
  const customerEmail = customer?.email;
  if (!customerEmail) return { ok: false, reason: "missing_email" };
  if (!order.recovery_token) return { ok: false, reason: "missing_token" };

  const items: Array<{ title: string; price: number }> = [];
  // En kurv med kun tilbehør må ikke love 36 mdr. enhedsgaranti — se lib/email/brand.ts.
  const guaranteeItems: Array<{ itemType: "device" | "sku_product"; category?: string | null }> = [];

  for (const item of order.order_items ?? []) {
    if (item.item_type === "device" && item.device_id) {
      const { data: dev } = await supabase
        .from("devices")
        .select("template:product_templates(brand, model, storage)")
        .eq("id", item.device_id)
        .single();
      const t = (dev as any)?.template;
      items.push({
        title: t ? [t.brand, t.model, t.storage].filter(Boolean).join(" ") : "Enhed",
        price: item.unit_price,
      });
      guaranteeItems.push({ itemType: "device" });
    } else if (item.sku_product_id) {
      const { data: sku } = await supabase
        .from("sku_products")
        .select("title, category")
        .eq("id", item.sku_product_id)
        .single();
      items.push({
        title: sku?.title || "Tilbehør",
        price: item.unit_price * item.quantity,
      });
      guaranteeItems.push({ itemType: "sku_product", category: sku?.category ?? null });
    }
  }

  const recoveryUrl = `${BASE_URL}/checkout/recover/${order.recovery_token}`;
  const usps = uspsForOrder(hasGuaranteeQualifyingDevice(guaranteeItems));

  const { error: sendError } = await resend.emails.send({
    from: EMAIL_FROM,
    to: customerEmail,
    subject: emailSubject,
    react: AbandonedCartEmail({
      customerName: customer?.name ?? "Kunde",
      items,
      total: order.total ?? 0,
      recoveryUrl,
      usps,
    }),
  });

  if (sendError) {
    return { ok: false, reason: "send_failed", detail: sendError.message };
  }

  await supabase
    .from("orders")
    .update({
      recovery_email_sent_at: new Date().toISOString(),
      recovery_status: "email_sent",
    })
    .eq("id", order.id);

  return { ok: true, to: customerEmail };
}
