import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaff } from "@/lib/auth/require-staff";
import { buildTicketPatch } from "@/lib/repairs/patch";
import { applyStoreScope, forbiddenResponse } from "@/lib/auth/store-scope-server";
import { canAccessStore, getStoreScope } from "@/lib/auth/store-scope";

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

  // Butiksafgrænsning: man må ikke flytte en sag til en butik man ikke selv hører til ...
  if (typeof patch.store_id !== "undefined" && !canAccessStore(staff, patch.store_id as string | null)) {
    return forbiddenResponse("Du kan kun knytte sager til din egen butik.");
  }

  // ... og man kan kun ændre sager i sin egen butik (ejeren: alle). Filteret ligger i
  // selve UPDATE'en, så en sag i en anden butik giver 404 uden et ekstra opslag.
  const supabase = createServerClient();
  const { data, error: updateError } = await applyStoreScope(
    supabase
      .from("repair_tickets")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id),
    getStoreScope(staff),
  )
    .select("id, is_urgent, on_hold_reason, store_id")
    .maybeSingle();

  if (updateError) {
    console.error("[repairs] patch failed:", id, updateError);
    return NextResponse.json({ error: "Kunne ikke opdatere sagen" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });

  return NextResponse.json({ success: true, ticket: data });
}
