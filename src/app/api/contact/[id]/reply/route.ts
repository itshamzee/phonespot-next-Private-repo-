import { requireInquiryAccess } from "@/lib/inquiries/inquiry-access";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendReply, ReplyError } from "@/lib/inquiries/reply";

const STATUS_BY_CODE = {
  not_found: 404,
  no_email: 400,
  no_phone: 400,
  send_failed: 502,
} as const;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireInquiryAccess(req, id);
  if (!access.ok) return access.response;
  const supabase = createServerClient();
  const { body, channel, staff_name } = await req.json();

  if (!body || (channel !== "email" && channel !== "sms")) {
    return NextResponse.json(
      { error: "body and channel (email|sms) required" },
      { status: 400 },
    );
  }

  try {
    const result = await sendReply(supabase, {
      inquiryId: id,
      body,
      staffName: staff_name || "Admin",
      channel,
    });
    return NextResponse.json({ id: result.messageRowId }, { status: 201 });
  } catch (err) {
    if (err instanceof ReplyError) {
      return NextResponse.json({ error: err.message }, { status: STATUS_BY_CODE[err.code] });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
