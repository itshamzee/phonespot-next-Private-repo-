import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaff } from "@/lib/auth/require-staff";
import { ticketLabel } from "@/lib/repairs/ticket-label";
import { canAccessStore } from "@/lib/auth/store-scope";

// Ikke dækket af middleware-matcheren — personale-tjekket ligger i ruten.

/**
 * Opretter en reklamationssag: en ny repair_tickets-række med kunde og enhed
 * kopieret fra originalen, parent_ticket_id peger på den og status er
 * "modtaget". Databasen kender ikke "reklamation_*" som status, så
 * reklamationen er en sag for sig selv, ikke en statusændring.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await requireStaff(request);
  if (!staff) {
    return NextResponse.json({ error: "Log ind som personale for at oprette en reklamation." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const note =
    body && typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 1000) : null;

  const supabase = createServerClient();

  const { data: original, error: loadError } = await supabase
    .from("repair_tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[repairs] reklamation load failed:", id, loadError);
    return NextResponse.json({ error: "Kunne ikke hente den oprindelige sag" }, { status: 500 });
  }
  if (!original || !canAccessStore(staff, original.store_id)) {
    return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });
  }

  const label = ticketLabel(original);
  const description =
    `Reklamation på sag ${label}: ${original.issue_description ?? ""}`.trim() +
    (note ? `

Årsag: ${note}` : "");

  const { data: created, error: insertError } = await supabase
    .from("repair_tickets")
    .insert({
      customer_name: original.customer_name,
      customer_email: original.customer_email ?? "",
      customer_phone: original.customer_phone,
      customer_id: original.customer_id ?? null,
      device_type: original.device_type,
      device_model: original.device_model,
      device_id: original.device_id ?? null,
      service_type: original.service_type,
      store_id: original.store_id ?? null,
      issue_description: description,
      status: "modtaget",
      parent_ticket_id: original.id,
      paid: false,
    })
    .select("id, ticket_number")
    .single();

  if (insertError || !created) {
    console.error("[repairs] reklamation insert failed:", id, insertError);
    return NextResponse.json({ error: "Kunne ikke oprette reklamationssagen" }, { status: 500 });
  }

  await supabase.from("repair_status_log").insert({
    ticket_id: created.id,
    old_status: null,
    new_status: "modtaget",
    note: `Reklamation på sag ${label}`,
  });

  return NextResponse.json(
    { success: true, ticketId: created.id, ticketNumber: created.ticket_number ?? null },
    { status: 201 },
  );
}
