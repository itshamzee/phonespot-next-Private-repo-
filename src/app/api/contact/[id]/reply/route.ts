import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import { sendSms } from "@/lib/gateway-api/client";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    try {
      const emailResult = await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: inquiry.email,
        subject: `Re: ${inquiry.subject || "Din henvendelse"}`,
        text: body,
      });

      await supabase.from("mail_log").insert({
        inquiry_id: id,
        to_email: inquiry.email,
        subject: `Re: ${inquiry.subject || "Din henvendelse"}`,
        body,
        status: "delivered",
        resend_id: emailResult.data?.id ?? null,
      });
    } catch {
      await supabase.from("mail_log").insert({
        inquiry_id: id,
        to_email: inquiry.email,
        subject: `Re: ${inquiry.subject || "Din henvendelse"}`,
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
