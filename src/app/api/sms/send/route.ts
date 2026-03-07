import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendSms } from "@/lib/gateway-api/client";

export async function POST(request: Request) {
  const body = await request.json();
  const { ticket_id, customer_id, phone, message } = body;

  if (!phone || !message) {
    return NextResponse.json(
      { error: "Telefon og besked er paakraevet" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  const result = await sendSms(phone, message);

  await supabase.from("sms_log").insert({
    ticket_id: ticket_id ?? null,
    customer_id: customer_id ?? null,
    phone,
    message,
    provider_message_id: result.messageId,
    status: result.success ? "sent" : "failed",
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "SMS kunne ikke sendes" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, messageId: result.messageId });
}
