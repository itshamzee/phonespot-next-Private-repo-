import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import { STORE } from "@/lib/store-config";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { price_dkk, estimated_days, notes } = body;

  if (!price_dkk || typeof price_dkk !== "number") {
    return NextResponse.json(
      { error: "Pris er paakraevet" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  try {
    // Get the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("repair_tickets")
      .select("*")
      .eq("id", id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Sag ikke fundet" },
        { status: 404 },
      );
    }

    // Create quote
    const { data: quote, error: quoteError } = await supabase
      .from("repair_quotes")
      .insert({
        ticket_id: id,
        price_dkk,
        estimated_days: estimated_days ?? null,
        notes: notes ?? null,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (quoteError || !quote) {
      console.error("Quote insert error:", quoteError);
      return NextResponse.json(
        { error: "Kunne ikke oprette tilbud" },
        { status: 500 },
      );
    }

    const oldStatus = ticket.status;

    // Update ticket status to tilbud_sendt
    await supabase
      .from("repair_tickets")
      .update({ status: "tilbud_sendt", updated_at: new Date().toISOString() })
      .eq("id", id);

    // Log status change
    await supabase.from("repair_status_log").insert({
      ticket_id: id,
      old_status: oldStatus,
      new_status: "tilbud_sendt",
      note: `Tilbud sendt: ${price_dkk} DKK`,
    });

    // Send quote email to customer
    const daysText = estimated_days
      ? `Estimeret tid: ${estimated_days} hverdag${estimated_days > 1 ? "e" : ""}`
      : "Vi kontakter dig med et tidsestimat";

    await resend.emails.send({
      from: "PhoneSpot Reparation <noreply@phonespot.dk>",
      to: ticket.customer_email,
      subject: `Tilbud paa reparation — ${ticket.device_type} ${ticket.device_model}`,
      text: [
        `Hej ${ticket.customer_name},`,
        "",
        `Vi har nu vurderet din ${ticket.device_type} ${ticket.device_model} og kan tilbyde foelgende:`,
        "",
        `Reparation: ${ticket.service_type}`,
        `Pris: ${price_dkk} DKK (inkl. moms)`,
        daysText,
        notes ? `Noter: ${notes}` : "",
        "",
        "Svar venligst paa denne email for at godkende eller afslaae tilbuddet.",
        "",
        "Med venlig hilsen,",
        STORE.name,
        `${STORE.street}, ${STORE.zip} ${STORE.city}`,
        STORE.email,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return NextResponse.json({ success: true, quoteId: quote.id });
  } catch (err) {
    console.error("Quote error:", err);
    return NextResponse.json(
      { error: "Noget gik galt. Proev igen senere." },
      { status: 500 },
    );
  }
}
