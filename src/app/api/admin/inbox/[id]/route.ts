import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireInquiryAccess } from "@/lib/inquiries/inquiry-access";

const NO_STORE = { "Cache-Control": "no-store" };

type Msg = { id: string; sender: string; body: string | null; is_internal?: boolean | null; created_at: string };

/**
 * GET /api/admin/inbox/[id] — hele tråden til personalet: henvendelsen, alle
 * beskeder (også interne noter, markeret med is_internal) og udkast fra Fiks.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireInquiryAccess(request, id);
  if (!access.ok) return access.response;

  const sb = createServerClient();
  const [inqRes, msgRes, draftRes] = await Promise.all([
    sb.from("contact_inquiries").select("*").eq("id", id).maybeSingle(),
    sb.from("inquiry_messages").select("*").eq("inquiry_id", id).order("created_at", { ascending: true }),
    sb
      .from("ai_drafts")
      .select("*")
      .eq("inquiry_id", id)
      .in("status", ["pending", "auto_sent"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (inqRes.error || msgRes.error || draftRes.error) {
    console.error("[admin/inbox] detail failed:", id, inqRes.error?.message ?? msgRes.error?.message ?? draftRes.error?.message);
    return NextResponse.json({ error: "Kunne ikke hente henvendelsen" }, { status: 500 });
  }
  const inquiry = inqRes.data as (Record<string, unknown> & { message?: string | null; channel?: string | null; created_at: string }) | null;
  if (!inquiry) return NextResponse.json({ error: "Henvendelse ikke fundet" }, { status: 404 });

  const thread = ((msgRes.data ?? []) as Msg[]).map((m) => ({ ...m, is_internal: !!m.is_internal }));

  // Første besked ligger i contact_inquiries.message; tag den med, hvis tråden ikke selv har den.
  const first = (inquiry.message ?? "").trim();
  const probe = first.slice(0, 300);
  const hasFirst = !first || thread.some((m) => m.sender === "customer" && !m.is_internal && (m.body ?? "").trim().startsWith(probe));
  const messages = hasFirst
    ? thread
    : [
        {
          id: `first-${id}`,
          inquiry_id: id,
          sender: "customer",
          channel: inquiry.channel ?? "email",
          body: inquiry.message,
          staff_name: null,
          is_internal: false,
          created_at: inquiry.created_at,
        },
        ...thread,
      ];

  const all = (draftRes.data ?? []) as { status: string }[];
  const drafts = [...all.filter((d) => d.status === "pending"), ...all.filter((d) => d.status === "auto_sent").slice(0, 1)];

  return NextResponse.json({ inquiry, messages, drafts }, { headers: NO_STORE });
}
