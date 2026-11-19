import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInquiryAccess } from "@/lib/inquiries/inquiry-access";
import { staffDisplayName } from "@/lib/inquiries/inbox";
import { discardDraftRow } from "@/lib/mail-agent/draft-handling";

/**
 * POST /api/admin/mail-agent/drafts/[id]/discard
 * Kasserer et udkast i den loggede medarbejders navn (et evt. `staff_name` i body ignoreres).
 * Response: { ok: true, filed: number }.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = createAdminClient();

  const { data: draft } = await sb.from("ai_drafts").select("id, inquiry_id, status").eq("id", id).maybeSingle();
  if (!draft) return NextResponse.json({ error: "Udkastet blev ikke fundet" }, { status: 404 });
  const access = await requireInquiryAccess(req, draft.inquiry_id as string);
  if (!access.ok) return access.response;
  if (draft.status !== "pending") {
    return NextResponse.json({ error: "Udkastet er allerede behandlet." }, { status: 409 });
  }

  try {
    const filed = await discardDraftRow(sb, id, staffDisplayName(access.staff));
    return NextResponse.json({ ok: true, filed });
  } catch (err) {
    console.error(`[mail-agent] discard failed for draft ${id}:`, (err as Error).message);
    return NextResponse.json({ error: "Udkastet kunne ikke kasseres. Prøv igen." }, { status: 500 });
  }
}
