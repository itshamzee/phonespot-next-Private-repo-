import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendSms } from "@/lib/gateway-api/client";
import { sendInquiryReply } from "@/lib/inquiries/send-reply";

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

  if (channel === "email") {
    try {
      const result = await sendInquiryReply(supabase, {
        inquiryId: id,
        body,
        staffName: staff_name || "Admin",
      });
      return NextResponse.json(
        { id: result.messageRowId, transport: result.transport },
        { status: 201 },
      );
    } catch (err) {
      const msg = (err as Error).message;
      const status = msg.includes("ikke fundet") ? 404 : msg.includes("Ingen email") ? 400 : 502;
      return NextResponse.json({ error: msg }, { status });
    }
  }

  // SMS: unchanged behaviour.
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

  if (channel === "sms") {
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

  await supabase
    .from("contact_inquiries")
    .update({ status: "besvaret" })
    .eq("id", id);

  return NextResponse.json(message, { status: 201 });
}
