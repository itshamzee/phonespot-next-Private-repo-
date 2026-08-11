import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/gateway-api";
import AbandonedCartEmail, {
  subject as emailSubject,
  from as emailFrom,
} from "@/lib/email/templates/abandoned-cart-email";
import { hasGuaranteeQualifyingDevice, uspsForOrder } from "@/lib/email/brand";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = `PhoneSpot <${emailFrom}>`;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://phonespot.dk";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  let emailsSent = 0;
  let smsSent = 0;
  let errors = 0;

  // -------------------------------------------------------------------------
  // Step 1: Email recovery — abandoned > 1h ago, no email sent yet
  // -------------------------------------------------------------------------
  const { data: emailCandidates, error: emailFetchError } = await supabase
    .from("orders")
    .select(
      `id, total, recovery_token, abandoned_at, recovery_email_sent_at, recovery_status,
       customer:customers!inner(email, name, phone, marketing_consent),
       order_items(id, item_type, device_id, sku_product_id, quantity, unit_price)`
    )
    .eq("status", "abandoned")
    .neq("recovery_status", "recovered")
    .lt("abandoned_at", oneHourAgo)
    .is("recovery_email_sent_at", null);

  if (emailFetchError) {
    console.error("[recovery] Failed to fetch email candidates:", emailFetchError);
    errors++;
  } else if (emailCandidates && emailCandidates.length > 0) {
    for (const order of emailCandidates) {
      try {
        const customer = order.customer as any;
        const customerEmail = customer?.email;
        const customerName = customer?.name;

        if (!customerEmail || !order.recovery_token) {
          console.warn(`[recovery] Order ${order.id} missing email or recovery_token, skipping`);
          continue;
        }

        // 24h per-customer throttle
        const { data: recentEmail } = await supabase
          .from("orders")
          .select("id, customer:customers!inner(email)")
          .eq("customers.email", customerEmail)
          .not("recovery_email_sent_at", "is", null)
          .gt("recovery_email_sent_at", twentyFourHoursAgo)
          .neq("id", order.id)
          .limit(1)
          .maybeSingle();

        if (recentEmail) {
          console.log(`[recovery] Throttled email for ${customerEmail} (sent within 24h)`);
          continue;
        }

        // Build item list from order_items with product names
        const orderItems = (order.order_items as any[]) ?? [];
        const items: Array<{ title: string; price: number }> = [];
        // A cart that's accessory-only must not promise the 36-month device
        // guarantee in the recovery email's USP bar — see lib/email/brand.ts.
        const guaranteeItems: Array<{ itemType: "device" | "sku_product"; category?: string | null }> = [];

        for (const item of orderItems) {
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
            customerName: customerName ?? "Kunde",
            items,
            total: order.total ?? 0,
            recoveryUrl,
            usps,
          }),
        });

        if (sendError) {
          console.error(`[recovery] Failed to send email for order ${order.id}:`, sendError);
          errors++;
          continue;
        }

        await supabase
          .from("orders")
          .update({
            recovery_email_sent_at: now.toISOString(),
            recovery_status: "email_sent",
          })
          .eq("id", order.id);

        emailsSent++;
        console.log(`[recovery] Email sent for order ${order.id} to ${customerEmail}`);
      } catch (err) {
        console.error(`[recovery] Unexpected error for order ${order.id}:`, err);
        errors++;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Step 2: SMS recovery — abandoned > 3h ago, email already sent, no SMS yet
  // -------------------------------------------------------------------------
  const { data: smsCandidates, error: smsFetchError } = await supabase
    .from("orders")
    .select(
      `id, total, recovery_token, abandoned_at, recovery_email_sent_at, recovery_sms_sent_at, recovery_status,
       customer:customers!inner(email, name, phone, marketing_consent)`
    )
    .eq("status", "abandoned")
    .neq("recovery_status", "recovered")
    .lt("abandoned_at", threeHoursAgo)
    .not("recovery_email_sent_at", "is", null)
    .is("recovery_sms_sent_at", null);

  if (smsFetchError) {
    console.error("[recovery] Failed to fetch SMS candidates:", smsFetchError);
    errors++;
  } else if (smsCandidates && smsCandidates.length > 0) {
    for (const order of smsCandidates) {
      try {
        const customer = order.customer as any;
        const customerPhone = customer?.phone;
        const customerName = customer?.name;
        const customerEmail = customer?.email;
        const marketingConsent = customer?.marketing_consent;

        if (!customerPhone || !marketingConsent) {
          console.log(`[recovery] Order ${order.id} no phone or no consent, skipping SMS`);
          continue;
        }

        if (!order.recovery_token) {
          console.warn(`[recovery] Order ${order.id} missing recovery_token, skipping SMS`);
          continue;
        }

        // 24h per-customer throttle
        const { data: recentSms } = await supabase
          .from("orders")
          .select("id, customer:customers!inner(email)")
          .eq("customers.email", customerEmail)
          .not("recovery_sms_sent_at", "is", null)
          .gt("recovery_sms_sent_at", twentyFourHoursAgo)
          .neq("id", order.id)
          .limit(1)
          .maybeSingle();

        if (recentSms) {
          console.log(`[recovery] Throttled SMS for ${customerEmail} (sent within 24h)`);
          continue;
        }

        const recoveryUrl = `${BASE_URL}/checkout/recover/${order.recovery_token}`;
        const message = `Hej ${customerName ?? ""}! Du har varer i din kurv på PhoneSpot. Fuldfør dit køb her: ${recoveryUrl}`.trim();

        const { success } = await sendSms({
          to: customerPhone,
          message,
        });

        if (!success) {
          console.error(`[recovery] SMS failed for order ${order.id}`);
          errors++;
          continue;
        }

        await supabase
          .from("orders")
          .update({
            recovery_sms_sent_at: now.toISOString(),
            recovery_status: "both_sent",
          })
          .eq("id", order.id);

        smsSent++;
        console.log(`[recovery] SMS sent for order ${order.id}`);
      } catch (err) {
        console.error(`[recovery] Unexpected error (SMS) for order ${order.id}:`, err);
        errors++;
      }
    }
  }

  console.log(`[recovery] Done. emails=${emailsSent}, sms=${smsSent}, errors=${errors}`);
  return NextResponse.json({ emailsSent, smsSent, errors });
}
