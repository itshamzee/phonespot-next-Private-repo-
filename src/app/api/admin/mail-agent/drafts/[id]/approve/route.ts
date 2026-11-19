import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInquiryReply } from "@/lib/inquiries/send-reply";
import { requireInquiryAccess } from "@/lib/inquiries/inquiry-access";
import { finalizeReply } from "@/lib/inquiries/reply";
import { staffDisplayName } from "@/lib/inquiries/inbox";
import { markDraft } from "@/lib/mail-agent/drafts";
import { fileInquiryMail } from "@/lib/mail-agent/run";

/**
 * POST /api/admin/mail-agent/drafts/[id]/approve
 * Body: { body?: string, after?: "done" | "waiting" }. Sender det (evt. rettede) udkast fra
 * henvendelsens postkasse i den loggede medarbejders navn (et evt. `staff_name` ignoreres).
 * Response: { ok: true, transport, filed, warning? }.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = createAdminClient();
  const payload = (await req.json().catch(() => ({}))) as { body?: unknown; after?: unknown };

  const { data: draft } = await sb.from("ai_drafts").select("*").eq("id", id).maybeSingle();
  if (!draft) return NextResponse.json({ error: "Udkastet blev ikke fundet" }, { status: 404 });
  const access = await requireInquiryAccess(req, draft.inquiry_id as string);
  if (!access.ok) return access.response;
  if (draft.status !== "pending") {
    return NextResponse.json({ error: "Udkastet er allerede behandlet." }, { status: 409 });
  }
  if (payload.after !== undefined && payload.after !== "done" && payload.after !== "waiting") {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }
  const after = payload.after === "done" ? "done" : "waiting";

  const edited = typeof payload.body === "string" ? payload.body : null;
  const body = (edited ?? draft.draft_body ?? "").trim();
  if (!body) return NextResponse.json({ error: "Svaret er tomt" }, { status: 400 });

  const staffName = staffDisplayName(access.staff);
  let sent: Awaited<ReturnType<typeof sendInquiryReply>>;
  try {
    sent = await sendInquiryReply(sb, {
      inquiryId: draft.inquiry_id,
      body,
      staffName,
      subjectOverride: draft.draft_subject ?? undefined,
    });
  } catch (err) {
    console.error(`[mail-agent] approve send failed for draft ${id}:`, (err as Error).message);
    return NextResponse.json({ error: "Svaret kunne ikke sendes. Prøv igen." }, { status: 502 });
  }

  // Efter afsendelsen må intet blive en fejl, der inviterer til gensendelse.
  let bookkept = true;
  let filed = 0;
  try {
    const now = new Date().toISOString();
    await markDraft(sb, id, { status: "sent", final_body: body, reviewed_by: staffName, reviewed_at: now, sent_at: now });
    bookkept = await finalizeReply(sb, draft.inquiry_id, after, { id: access.staff.id, name: staffName });
    try {
      filed = await fileInquiryMail(sb, draft.inquiry_id, draft.category);
    } catch (err) {
      console.warn("[mail-agent] kunne ikke flytte mailen til mappe:", (err as Error).message);
    }
  } catch {
    bookkept = false;
    console.error(`[mail-agent] approve bookkeeping failed for draft ${id}`);
  }

  return NextResponse.json({
    ok: true,
    transport: sent.transport,
    filed,
    ...(bookkept ? {} : { warning: "Svaret er sendt, men sagen kunne ikke opdateres. Opdater siden." }),
  });
}
