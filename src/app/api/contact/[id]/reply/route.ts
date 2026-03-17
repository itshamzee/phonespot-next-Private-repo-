import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { resend } from "@/lib/email/resend";
import { render } from "@react-email/render";
import InquiryReplyEmail from "@/lib/email/templates/inquiry-reply";
import { sendSms } from "@/lib/gateway-api/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  const { body, channel, staff_name } = await req.json();

  if (!body || !channel) {
    return NextResponse.json(
      { error: "body and channel required" },
      { status: 400 },
    );
  }

  // Fetch the inquiry to get contact details
  const { data: inquiry, error: inquiryError } = await supabase
    .from("contact_inquiries")
    .select("*")
    .eq("id", id)
    .single();

  if (inquiryError || !inquiry) {
    return NextResponse.json(
      { error: "Henvendelse ikke fundet" },
      { status: 404 },
    );
  }

  // Insert the message
  const { data: message, error: messageError } = await supabase
    .from("inquiry_messages")
    .insert({
      inquiry_id: id,
      sender: "staff",
      channel,
      body,
      staff_name: staff_name || null,
    })
    .select()
    .single();

  if (messageError) {
    return NextResponse.json(
      { error: messageError.message },
      { status: 500 },
    );
  }

  // Send via the chosen channel
  if (channel === "email") {
    if (!inquiry.email) {
      return NextResponse.json(
        { error: "Ingen email paa henvendelsen" },
        { status: 400 },
      );
    }

    // Fetch staff profile for signature
    let staffProfile = null;
    try {
      const { data } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .single();
      staffProfile = data;
    } catch {
      // No staff profile — email will be sent without signature
    }

    // Fetch company settings
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("*")
      .single();

    const subject = `Re: ${inquiry.subject || "Din henvendelse"}`;

    // Render styled email with signature
    const html = await render(
      InquiryReplyEmail({
        customerName: inquiry.name,
        replyBody: body,
        staffProfile,
        companySettings,
      })
    );

    try {
      const emailResult = await resend.emails.send({
        from: "PhoneSpot <support@phonespot.dk>",
        to: inquiry.email,
        replyTo: "support@reply.phonespot.dk",
        subject,
        html,
      });

      const messageId = `<${emailResult.data?.id}@reply.phonespot.dk>`;

      await supabase.from("mail_log").insert({
        inquiry_id: id,
        to_email: inquiry.email,
        subject,
        body,
        status: "delivered",
        resend_id: emailResult.data?.id ?? null,
        message_id: messageId,
      });

      // Set email_thread_id if not already set
      if (!inquiry.email_thread_id) {
        await supabase
          .from("contact_inquiries")
          .update({ email_thread_id: crypto.randomUUID() })
          .eq("id", id);
      }
    } catch {
      await supabase.from("mail_log").insert({
        inquiry_id: id,
        to_email: inquiry.email,
        subject,
        body,
        status: "failed",
        resend_id: null,
      });
    }
  } else if (channel === "sms") {
    if (!inquiry.phone) {
      return NextResponse.json(
        { error: "Ingen telefonnummer paa henvendelsen" },
        { status: 400 },
      );
    }

    const result = await sendSms(inquiry.phone, body);

    await supabase.from("sms_log").insert({
      phone: inquiry.phone,
      message: body,
      provider_message_id: result.messageId,
      status: result.success ? "sent" : "failed",
    });
  }

  // Update inquiry status to "besvaret"
  await supabase
    .from("contact_inquiries")
    .update({ status: "besvaret" })
    .eq("id", id);

  return NextResponse.json(message, { status: 201 });
}
