import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaff } from "@/lib/auth/require-staff";
import { buildTicketPatch } from "@/lib/repairs/patch";

// Stien er ikke dækket af middleware-matcheren, så personale-tjekket ligger her.
// (/api/repairs/[id]/public er bevidst offentlig og røres ikke.)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await requireStaff(request);
  if (!staff) {
    return NextResponse.json({ error: "Log ind som personale for at ændre sagen." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }

  const { patch, error } = buildTicketPatch(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const supabase = createServerClient();
  const { data, error: updateError } = await supabase
    .from("repair_tickets")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, is_urgent, on_hold_reason, store_id")
    .maybeSingle();

  if (updateError) {
    console.error("[repairs] patch failed:", id, updateError);
    return NextResponse.json({ error: "Kunne ikke opdatere sagen" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });

  return NextResponse.json({ success: true, ticket: data });
}
