import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markDraft } from "@/lib/mail-agent/drafts";
import { fileInquiryMail } from "@/lib/mail-agent/run";

/** POST /api/admin/mail-agent/drafts/[id]/discard — Body: { staff_name?: string }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await req.json().catch(() => ({}))) as { staff_name?: string };
  const sb = createAdminClient();
  try {
    await markDraft(sb, id, {
      status: "discarded",
      reviewed_by: payload.staff_name || "Admin",
      reviewed_at: new Date().toISOString(),
    });
    const { data: draft } = await sb.from("ai_drafts").select("inquiry_id, category").eq("id", id).maybeSingle();
    let filed = 0;
    if (draft) {
      try {
        filed = await fileInquiryMail(sb, draft.inquiry_id, draft.category);
      } catch (err) {
        console.warn("[mail-agent] kunne ikke flytte mailen til mappe:", (err as Error).message);
      }
    }
    return NextResponse.json({ ok: true, filed });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
