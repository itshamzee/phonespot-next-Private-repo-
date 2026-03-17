// src/app/api/trade-in/[id]/send-acceptance/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { resend } from "@/lib/email/resend";
import { render } from "@react-email/render";
import OfferAcceptanceEmail from "@/lib/email/templates/offer-acceptance";
import { formatDKK } from "@/lib/supabase/trade-in-types";
import { detectDeviceGuide } from "@/lib/supabase/email-types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: offerId } = await params;
  const supabase = createServerClient();

  // Get offer + inquiry + label + staff profile
  const { data: offer, error: offerErr } = await supabase
    .from("trade_in_offers")
    .select("*, contact_inquiries(*)")
    .eq("id", offerId)
    .single();

  if (offerErr || !offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  const inquiry = offer.contact_inquiries;
  const metadata = (inquiry.metadata || {}) as Record<string, any>;

  // Get shipping label (may not exist yet)
  const { data: label } = await supabase
    .from("shipping_labels")
    .select("*")
    .eq("offer_id", offerId)
    .single();

  // Get company settings
  const { data: company } = await supabase
    .from("company_settings")
    .select("*")
    .single();

  // Get staff profile from request body or first active profile
  const body = await req.json().catch(() => ({}));
  let staffProfile = null;

  if (body.staff_profile_id) {
    const { data } = await supabase
      .from("staff_profiles")
      .select("*")
      .eq("id", body.staff_profile_id)
      .single();
    staffProfile = data;
  } else {
    const { data } = await supabase
      .from("staff_profiles")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();
    staffProfile = data;
  }

  // Detect device type
  const brand = metadata.brand || metadata.device?.brand || "";
  const model = metadata.model || metadata.device?.model || "";
  const storage = metadata.storage || metadata.device?.storage || null;
  const deviceGuide = detectDeviceGuide(brand);

  // Build email
  const html = await render(
    OfferAcceptanceEmail({
      customerName: offer.seller_name || inquiry.name,
      brand,
      model,
      storage,
      offerAmountKr: formatDKK(offer.offer_amount),
      trackingNumber: label?.tracking_number,
      trackingUrl: label?.tracking_number
        ? `https://tracking.postnord.com/tracking/${label.tracking_number}`
        : null,
      labelDownloadUrl: label?.label_url || null,
      deviceGuide,
      staffProfile,
      companySettings: company,
    })
  );

  const subject = `Tilbud accepteret — ${[brand, model].filter(Boolean).join(" ")}`;

  try {
    const emailResult = await resend.emails.send({
      from: "PhoneSpot <support@phonespot.dk>",
      to: inquiry.email,
      replyTo: "support@reply.phonespot.dk",
      subject,
      html,
      attachments: label?.label_url
        ? [{ filename: "forsendelsesmaerkat.pdf", path: label.label_url }]
        : undefined,
    });

    // Log to mail_log
    const messageId = `<${emailResult.data?.id}@reply.phonespot.dk>`;
    await supabase.from("mail_log").insert({
      inquiry_id: inquiry.id,
      to_email: inquiry.email,
      subject,
      body: html,
      status: emailResult.data?.id ? "delivered" : "failed",
      resend_id: emailResult.data?.id || null,
      message_id: messageId,
    });

    // Log inquiry message
    await supabase.from("inquiry_messages").insert({
      inquiry_id: inquiry.id,
      sender: "staff",
      channel: "email",
      body: `Accepteringsbekræftelse sendt med ${label ? "forsendelsesmærkat" : "vejledning (uden label)"}`,
      staff_name: staffProfile?.display_name || "System",
    });

    return NextResponse.json({ success: true, email_id: emailResult.data?.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Email send failed" }, { status: 500 });
  }
}
