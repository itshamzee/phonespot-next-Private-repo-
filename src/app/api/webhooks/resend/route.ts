import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logBuybackEvent } from "@/lib/buyback/events";
import { pauseAutomation } from "@/lib/buyback/pause";
import { sendCriticalAlert } from "@/lib/buyback/alerts";

interface ResendWebhookBody {
  type?: string;
  data?: { email_id?: string; to?: string[] };
}

/**
 * POST /api/webhooks/resend — delivery status for buyback mail.
 *
 * This is the answer to "did the offer actually reach the customer?". Without it
 * a suppressed or bouncing sender would drop every automatic offer in silence,
 * and we would only find out when nobody replied.
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as ResendWebhookBody;
  const emailId = body.data?.email_id;
  const recipient = body.data?.to?.[0] ?? "ukendt modtager";
  if (!emailId) return NextResponse.json({ ok: true });

  const supabase = createAdminClient();

  const { data: offer } = await supabase
    .from("trade_in_offers")
    .select("id, inquiry_id")
    .eq("resend_email_id", emailId)
    .maybeSingle();

  if (!offer) return NextResponse.json({ ok: true }); // not a buyback mail

  if (body.type === "email.sent" || body.type === "email.delivered") {
    await supabase.from("trade_in_offers").update({ send_state: "sent" }).eq("id", offer.id);
    await logBuybackEvent(supabase, {
      type: "delivered",
      severity: "info",
      summary: `Tilbudsmail leveret til ${recipient}`,
      inquiryId: offer.inquiry_id,
      offerId: offer.id,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.type === "email.bounced" || body.type === "email.complained") {
    await supabase.from("trade_in_offers").update({ send_state: "failed" }).eq("id", offer.id);
    const summary = `Tilbudsmail bouncede til ${recipient}`;
    await logBuybackEvent(supabase, {
      type: "bounced",
      severity: "critical",
      summary,
      inquiryId: offer.inquiry_id,
      offerId: offer.id,
      detail: body,
    });
    // One bounce can mean the sender is suppressed, which would silently drop
    // every following offer. Stop and say so.
    await pauseAutomation(supabase, "En tilbudsmail bouncede");
    await sendCriticalAlert(supabase, summary);
  }

  return NextResponse.json({ ok: true });
}
