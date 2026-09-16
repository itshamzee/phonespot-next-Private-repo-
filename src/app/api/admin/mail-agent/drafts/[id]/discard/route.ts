import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markDraft } from "@/lib/mail-agent/drafts";

/** POST /api/admin/mail-agent/drafts/[id]/discard — Body: { staff_name?: string }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await req.json().catch(() => ({}))) as { staff_name?: string };
  try {
    await markDraft(createAdminClient(), id, {
      status: "discarded",
      reviewed_by: payload.staff_name || "Admin",
      reviewed_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
