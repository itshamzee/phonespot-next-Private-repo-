import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/gateway-api";
import AbandonedCartEmail, {
  subject as emailSubject,
  from as emailFrom,
} from "@/lib/email/templates/abandoned-cart-email";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = `PhoneSpot <${emailFrom}>`;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://phonespot.dk";

// 24-hour per-customer throttle: track which emails have been sent in this run
// (The authoritative throttle is checked via recovery_email_sent_at in the DB)

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
      "id, customer_email, customer_name, customer_phone, marketing_consent, items, total_amount, recovery_token, abandoned_at, recovery_email_sent_at, recovery_status"
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
        if (!order.customer_email || !order.recovery_token) {
          console.warn(`[recovery] Order ${order.id} missing email or recovery_token, skipping`);
          continue;
        }

        // 24h per-customer throttle: check if we sent an email to this address within 24h
        const { data: recentEmail } = await supabase
          .from("orders")
          .select("id")
          .eq("customer_email", order.customer_email)
          .not("recovery_email_sent_at", "is", null)
          .gt("recovery_email_sent_at", twentyFourHoursAgo)
          .neq("id", order.id)
          .limit(1)
          .maybeSingle();

        if (recentEmail) {
          console.log(`[recovery] Throttled email for ${order.customer_email} (sent within 24h)`);
          continue;
        }

        const recoveryUrl = `${BASE_URL}/checkout/recover/${order.recovery_token}`;
        const items: Array<{ title: string; price: number }> = Array.isArray(order.items)
          ? order.items.map((item: { title?: string; price?: number; unit_price?: number }) => ({
              title: item.title ?? "Produkt",
              price: item.price ?? item.unit_price ?? 0,
            }))
          : [];

        const { error: sendError } = await resend.emails.send({
          from: EMAIL_FROM,
          to: order.customer_email,
          subject: emailSubject,
          react: AbandonedCartEmail({
            customerName: order.customer_name ?? "Kunde",
            items,
            total: order.total_amount ?? 0,
            recoveryUrl,
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
        console.log(`[recovery] Email sent for order ${order.id}`);
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
      "id, customer_email, customer_name, customer_phone, marketing_consent, total_amount, recovery_token, abandoned_at, recovery_email_sent_at, recovery_sms_sent_at, recovery_status"
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
        // Must have phone and marketing consent
        if (!order.customer_phone || !order.marketing_consent) {
          console.log(`[recovery] Order ${order.id} no phone or no consent, skipping SMS`);
          continue;
        }

        if (!order.recovery_token) {
          console.warn(`[recovery] Order ${order.id} missing recovery_token, skipping SMS`);
          continue;
        }

        // 24h per-customer throttle via email address
        const { data: recentSms } = await supabase
          .from("orders")
          .select("id")
          .eq("customer_email", order.customer_email)
          .not("recovery_sms_sent_at", "is", null)
          .gt("recovery_sms_sent_at", twentyFourHoursAgo)
          .neq("id", order.id)
          .limit(1)
          .maybeSingle();

        if (recentSms) {
          console.log(`[recovery] Throttled SMS for ${order.customer_email} (sent within 24h)`);
          continue;
        }

        const recoveryUrl = `${BASE_URL}/checkout/recover/${order.recovery_token}`;
        const message = `Hej ${order.customer_name ?? ""}! Du har varer i din kurv på PhoneSpot. Fuldfør dit køb her: ${recoveryUrl}`.trim();

        const { success } = await sendSms({
          to: order.customer_phone,
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
