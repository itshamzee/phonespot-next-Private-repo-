import { requireInquiryAccess } from "@/lib/inquiries/inquiry-access";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendReply, finalizeReply, ReplyError } from "@/lib/inquiries/reply";
import { staffDisplayName } from "@/lib/inquiries/inbox";

const STATUS_BY_CODE = {
  not_found: 404,
  no_email: 400,
  no_phone: 400,
  send_failed: 502,
  saved_failed: 500,
} as const;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireInquiryAccess(req, id);
  if (!access.ok) return access.response;
  const supabase = createServerClient();
  let payload: { body?: unknown; channel?: unknown; after?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }
  // staff_name i body ignoreres bevidst: afsenderen er altid den loggede medarbejder.
  const { body, channel, after } = payload ?? {};

  if (typeof body !== "string" || !body.trim() || (channel !== "email" && channel !== "sms")) {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }
  if (after !== undefined && after !== "done" && after !== "waiting") {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }
  const staffName = staffDisplayName(access.staff);

  try {
    const result = await sendReply(supabase, {
      inquiryId: id,
      body,
      staffName,
      channel,
    });
    await finalizeReply(supabase, id, after ?? "waiting", { id: access.staff.id, name: staffName });
    return NextResponse.json({ id: result.messageRowId }, { status: 201 });
  } catch (err) {
    if (err instanceof ReplyError) {
      return NextResponse.json({ error: err.message }, { status: STATUS_BY_CODE[err.code] });
    }
    console.error(`[reply route] unexpected error for inquiry ${id}:`, err);
    return NextResponse.json({ error: "Der opstod en fejl. Prøv igen." }, { status: 500 });
  }
}
