import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInquiryReply } from "@/lib/inquiries/send-reply";
import { markDraft } from "@/lib/mail-agent/drafts";

/**
 * POST /api/admin/mail-agent/drafts/[id]/approve
 * Body: { body?: string, staff_name?: string }. Sends the (possibly edited)
 * draft from the inquiry's mailbox and marks the draft as sent.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = createAdminClient();
  const payload = (await req.json().catch(() => ({}))) as { body?: string; staff_name?: string };

  const { data: draft } = await sb.from("ai_drafts").select("*").eq("id", id).maybeSingle();
  if (!draft) return NextResponse.json({ error: "Forslag ikke fundet" }, { status: 404 });
  if (draft.status !== "pending") {
    return NextResponse.json({ error: "Forslaget er allerede behandlet" }, { status: 409 });
  }

  const body = (payload.body ?? draft.draft_body ?? "").trim();
  if (!body) return NextResponse.json({ error: "Svaret er tomt" }, { status: 400 });

  const staffName = payload.staff_name || "Admin";
  try {
    const sent = await sendInquiryReply(sb, {
      inquiryId: draft.inquiry_id,
      body,
      staffName,
      subjectOverride: draft.draft_subject ?? undefined,
    });
    const now = new Date().toISOString();
    await markDraft(sb, id, { status: "sent", final_body: body, reviewed_by: staffName, reviewed_at: now, sent_at: now });
    return NextResponse.json({ ok: true, transport: sent.transport });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
