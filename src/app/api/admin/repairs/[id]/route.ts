import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireTicketAccess } from "@/lib/repairs/ticket-access";
import { loadCaseDetail } from "@/lib/repairs/case-detail";

/**
 * GET  /api/admin/repairs/[id] — sagen med tilbud, statuslog, kommentarer, enhed,
 *      SMS-tråd, depositum, linjer og totaler. `?light=1` giver kun det sidepanelet
 *      skal bruge (ingen fotos, kommentarer eller kundehistorik).
 * POST /api/admin/repairs/[id] — tilføj en intern note: { note: string }.
 *
 * Adgang: kun personale i sagens butik (ejeren: alle). En sag i en anden butik
 * svarer 404. Fotos udleveres som korte signerede URL'er (private bucket).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireTicketAccess(request, id);
  if (!access.ok) return access.response;

  const light = new URL(request.url).searchParams.get("light") === "1";
  const supabase = createServerClient();

  let detail;
  try {
    detail = await loadCaseDetail(supabase, id, { light });
  } catch (err) {
    console.error("[admin/repairs] detail failed:", id, err);
    return NextResponse.json({ error: "Kunne ikke hente sagen" }, { status: 500 });
  }
  if (!detail) return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });

  return NextResponse.json(detail, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireTicketAccess(request, id);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => null);
  const text = body && typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  if (!text) return NextResponse.json({ error: "Skriv en note først" }, { status: 400 });

  const supabase = createServerClient();
  const { data: current, error: loadError } = await supabase
    .from("repair_tickets")
    .select("internal_notes")
    .eq("id", id)
    .maybeSingle();
  if (loadError || !current) return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });

  const notes = [
    ...((current.internal_notes as unknown[] | null) ?? []),
    { text, author: access.staff.name ?? "Admin", timestamp: new Date().toISOString() },
  ];
  const { error } = await supabase
    .from("repair_tickets")
    .update({ internal_notes: notes, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[admin/repairs] note failed:", id, error);
    return NextResponse.json({ error: "Noten blev ikke gemt. Prøv igen." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
