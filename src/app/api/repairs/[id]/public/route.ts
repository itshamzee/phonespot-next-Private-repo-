import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Fetch ticket with only public-safe fields
  const { data: ticket, error: ticketError } = await supabase
    .from("repair_tickets")
    .select(
      "id, device_model, device_type, status, ticket_number, store_location_id, created_at",
    )
    .eq("id", id)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json(
      { error: "Reparation ikke fundet" },
      { status: 404 },
    );
  }

  // Fetch customer-visible comments only
  const { data: comments } = await supabase
    .from("repair_comments")
    .select("*")
    .eq("ticket_id", id)
    .eq("visibility", "kunde")
    .order("created_at", { ascending: true });

  // Fetch status log
  const { data: statusLog } = await supabase
    .from("repair_status_log")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    ticket,
    comments: comments ?? [],
    status_log: statusLog ?? [],
  });
}
