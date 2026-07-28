import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDeclineReasonCode, declineReason } from "@/lib/buyback/decline-reasons";
import { buildDeclineEmailHtml, buildDeclineEmailSubject } from "@/lib/email/decline-email";
import { readLeadDevices, deviceLabel } from "@/lib/buyback/lead-devices";
import { logBuybackEvent } from "@/lib/buyback/events";

const resend = new Resend(process.env.RESEND_API_KEY);

/* POST /api/trade-in/decline — admin declines a buyback lead and tells the customer */
export async function POST(req: Request) {
  const body = await req.json();
  const { inquiry_id, reason_code, declined_by, auto } = body;

  if (!inquiry_id || !isDeclineReasonCode(reason_code)) {
    return NextResponse.json(
      { error: "inquiry_id and a valid reason_code required" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("id, name, email, metadata")
    .eq("id", inquiry_id)
    .maybeSingle();

  if (!inquiry) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });

  // A decline is terminal. Declining twice must not send a second email.
  const { data: existing } = await supabase
    .from("buyback_declines")
    .select("id")
    .eq("inquiry_id", inquiry_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ id: existing.id, email_sent: false, already: true }, { status: 200 });
  }

  // Declining after the customer accepted would be going back on a deal.
  const { data: acceptedOffers } = await supabase
    .from("trade_in_offers")
    .select("id")
    .eq("inquiry_id", inquiry_id)
    .eq("status", "accepted")
    .limit(1);

  if ((acceptedOffers ?? []).length > 0) {
    return NextResponse.json(
      { error: "Kunden har allerede accepteret et tilbud — leadet kan ikke afvises" },
      { status: 409 },
    );
  }

  const label = deviceLabel(readLeadDevices(inquiry.metadata)[0]?.device);
  const subject = buildDeclineEmailSubject(label);
  const html = buildDeclineEmailHtml({
    customerName: inquiry.name,
    deviceLabel: label,
    reasonCode: reason_code,
  });

  let emailSent = false;
  try {
    const sent = await resend.emails.send({
      from: "PhoneSpot <info@phonespot.dk>",
      to: inquiry.email,
      replyTo: "info@phonespot.dk",
      subject,
      html,
    });
    emailSent = !sent.error;
    await supabase.from("mail_log").insert({
      inquiry_id,
      to_email: inquiry.email,
      subject,
      body: html,
      status: emailSent ? "delivered" : "failed",
      resend_id: sent.data?.id ?? null,
    });
  } catch {
    await supabase.from("mail_log").insert({
      inquiry_id,
      to_email: inquiry.email,
      subject,
      body: html,
      status: "failed",
    });
  }

  const { data: decline, error } = await supabase
    .from("buyback_declines")
    .insert({
      inquiry_id,
      reason_code,
      email_sent: emailSent,
      declined_by: auto === true ? "system" : declined_by || "Admin",
    })
    .select("id")
    .single();

  if (error || !decline) {
    return NextResponse.json(
      { error: error?.message || "Failed to record decline" },
      { status: 500 },
    );
  }

  await supabase.from("contact_inquiries").update({ status: "lukket" }).eq("id", inquiry_id);

  await supabase.from("inquiry_messages").insert({
    inquiry_id,
    sender: "staff",
    channel: "email",
    body: `Afvist: ${declineReason(reason_code).label}`,
    staff_name: auto === true ? "System" : declined_by || "Admin",
  });

  // A decline whose email never left is the silent failure this system exists to
  // prevent, so it is logged as a warning rather than as routine.
  await logBuybackEvent(supabase, {
    type: auto === true ? "auto_declined" : "declined",
    severity: emailSent ? "info" : "warn",
    summary: emailSent
      ? `${label} afvist (${declineReason(reason_code).label})`
      : `${label} afvist (${declineReason(reason_code).label}) — mailen kunne ikke sendes`,
    inquiryId: inquiry_id,
  });

  return NextResponse.json({ id: decline.id, email_sent: emailSent }, { status: 201 });
}
