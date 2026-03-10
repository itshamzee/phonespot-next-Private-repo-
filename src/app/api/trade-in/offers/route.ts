import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { Resend } from "resend";
import { buildOfferEmailHtml, buildOfferEmailSubject } from "@/lib/email/offer-email";
import { formatDKK } from "@/lib/supabase/trade-in-types";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phonespot.dk";

/* GET /api/trade-in/offers?inquiry_id=xxx */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inquiryId = searchParams.get("inquiry_id");
  if (!inquiryId) return NextResponse.json({ error: "inquiry_id required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("trade_in_offers")
    .select("*")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/* POST /api/trade-in/offers — create offer and send email */
export async function POST(req: Request) {
  const body = await req.json();
  const { inquiry_id, offer_amount, admin_note, created_by } = body;

  if (!inquiry_id || !offer_amount) {
    return NextResponse.json({ error: "inquiry_id and offer_amount required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // 1. Expire any existing pending offers for this inquiry
  await supabase
    .from("trade_in_offers")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("inquiry_id", inquiry_id)
    .eq("status", "pending");

  // 2. Create new offer
  const { data: offer, error: offerErr } = await supabase
    .from("trade_in_offers")
    .insert({
      inquiry_id,
      offer_amount,
      admin_note: admin_note || null,
      created_by: created_by || null,
    })
    .select()
    .single();

  if (offerErr || !offer) {
    return NextResponse.json({ error: offerErr?.message || "Failed to create offer" }, { status: 500 });
  }

  // 3. Fetch the inquiry for customer details + device metadata
  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("*")
    .eq("id", inquiry_id)
    .single();

  if (!inquiry) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  }

  // 4. Build email
  const metadata = (inquiry.metadata || {}) as Record<string, any>;
  const device = metadata.device || {};
  const condition = metadata.condition || {};
  const amountKr = formatDKK(offer_amount);

  const conditionParts = [
    condition.screen ? `Sk\u00e6rm: ${condition.screen}` : null,
    condition.back ? `Bagside: ${condition.back}` : null,
    condition.battery ? `Batteri: ${condition.battery}` : null,
  ].filter(Boolean).join(", ");

  const acceptUrl = `${BASE_URL}/saelg-din-enhed/accepter?token=${offer.token}`;
  const rejectUrl = `${BASE_URL}/saelg-din-enhed/afvis?token=${offer.token}`;

  const emailHtml = buildOfferEmailHtml({
    customerName: inquiry.name,
    deviceType: device.deviceType || "enhed",
    brand: device.brand || "",
    model: device.model || "",
    storage: device.storage || null,
    conditionSummary: conditionParts || "Ikke angivet",
    offerAmountKr: amountKr,
    acceptUrl,
    rejectUrl,
  });

  const subject = buildOfferEmailSubject(
    device.model || "enhed",
    amountKr,
  );

  // 5. Send email via Resend
  try {
    const emailResult = await resend.emails.send({
      from: "PhoneSpot <noreply@phonespot.dk>",
      to: inquiry.email,
      replyTo: "ha@phonespot.dk",
      subject,
      html: emailHtml,
    });

    // Log to mail_log
    await supabase.from("mail_log").insert({
      inquiry_id,
      to_email: inquiry.email,
      subject,
      body: emailHtml,
      status: "delivered",
      resend_id: emailResult.data?.id || null,
    });
  } catch (emailErr) {
    // Log failure but don't fail the offer creation
    await supabase.from("mail_log").insert({
      inquiry_id,
      to_email: inquiry.email,
      subject,
      body: emailHtml,
      status: "failed",
    });
  }

  // 6. Update inquiry status
  await supabase
    .from("contact_inquiries")
    .update({ status: "besvaret" })
    .eq("id", inquiry_id);

  // 7. Log as inquiry message
  await supabase.from("inquiry_messages").insert({
    inquiry_id,
    sender: "staff",
    channel: "email",
    body: `Tilbud sendt: ${amountKr}${admin_note ? ` (note: ${admin_note})` : ""}`,
    staff_name: created_by || "System",
  });

  return NextResponse.json(offer, { status: 201 });
}
