import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/gateway-api";
import { sendRecoveryEmail } from "@/lib/recovery/send-recovery-email";

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

        const result = await sendRecoveryEmail(supabase, order as any);
        if (!result.ok) {
          console.error(`[recovery] Failed to send email for order ${order.id}:`, result.reason, result.detail ?? "");
          errors++;
          continue;
        }

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
