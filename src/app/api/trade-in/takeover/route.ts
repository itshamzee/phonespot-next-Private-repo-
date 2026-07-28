import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { logBuybackEvent } from "@/lib/buyback/events";
import { formatDKK } from "@/lib/supabase/trade-in-types";
import { requireStaff } from "@/lib/auth/require-staff";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/trade-in/takeover — act on an offer still inside its hold window.
 *
 *   action: "cancel"    stop the scheduled mail and hand the lead back to admin
 *   action: "send_now"  bring the scheduled mail forward
 */
export async function POST(req: Request) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { offer_id, action } = await req.json();

  if (!offer_id || (action !== "cancel" && action !== "send_now")) {
    return NextResponse.json(
      { error: "offer_id and action (cancel|send_now) required" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: offer } = await supabase
    .from("trade_in_offers")
    .select("id, inquiry_id, offer_amount, resend_email_id, send_state")
    .eq("id", offer_id)
    .maybeSingle();

  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (offer.send_state !== "scheduled") {
    return NextResponse.json({ error: "Tilbuddet er ikke længere planlagt" }, { status: 409 });
  }
  if (!offer.resend_email_id) {
    return NextResponse.json({ error: "Tilbuddet har ingen planlagt mail" }, { status: 409 });
  }

  if (action === "cancel") {
    await resend.emails.cancel(offer.resend_email_id);
    await supabase
      .from("trade_in_offers")
      .update({ status: "expired", send_state: "cancelled" })
      .eq("id", offer.id);
    await logBuybackEvent(supabase, {
      type: "taken_over",
      severity: "info",
      summary: `Bud på ${formatDKK(offer.offer_amount)} stoppet inden afsendelse`,
      inquiryId: offer.inquiry_id,
      offerId: offer.id,
    });
    return NextResponse.json({ ok: true, action });
  }

  const now = new Date().toISOString();
  await resend.emails.update({ id: offer.resend_email_id, scheduledAt: now });
  await supabase
    .from("trade_in_offers")
    .update({ send_state: "sent", scheduled_send_at: now })
    .eq("id", offer.id);
  await logBuybackEvent(supabase, {
    type: "sent",
    severity: "info",
    summary: `Bud på ${formatDKK(offer.offer_amount)} sendt manuelt før tid`,
    inquiryId: offer.inquiry_id,
    offerId: offer.id,
  });

  return NextResponse.json({ ok: true, action });
}
