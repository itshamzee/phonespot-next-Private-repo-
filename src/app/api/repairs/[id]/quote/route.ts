import { requireTicketAccess } from "@/lib/repairs/ticket-access";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import { storeForId } from "@/lib/store-config";
import { ticketLabel } from "@/lib/repairs/ticket-label";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireTicketAccess(request, id);
  if (!access.ok) return access.response;
  const body = await request.json();
  const { price_dkk, estimated_days, notes } = body;

  if (!price_dkk || typeof price_dkk !== "number") {
    return NextResponse.json(
      { error: "Pris er påkrævet" },
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

    // Sign the quote with the store the ticket belongs to — a Vejle customer
    // was previously given Slagelse's address to turn up at.
    const store = storeForId(ticket.store_id);

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

    // Tilbuddet er gemt og statussen ændret; mailen er en bivirkning. Walk-ins
    // har ofte ingen e-mail, og en Resend-fejl må ikke vælte et gemt tilbud.
    let warning: string | undefined;
    if (!ticket.customer_email?.trim()) {
      warning = "Tilbuddet er gemt, men kunden har ingen e-mail. Giv besked på telefon eller SMS.";
    } else {
      try {
        const { error: emailError } = await resend.emails.send({
          from: "PhoneSpot Reparation <noreply@phonespot.dk>",
          to: ticket.customer_email,
          subject: `Tilbud på reparation: ${ticket.device_type} ${ticket.device_model}`,
          text: [
            `Hej ${ticket.customer_name},`,
            "",
            `Vi har nu vurderet din ${ticket.device_type} ${ticket.device_model} og kan tilbyde følgende:`,
            "",
            `Sagsnummer: ${ticketLabel(ticket)}`,
            `Reparation: ${ticket.service_type}`,
            `Pris: ${price_dkk} DKK (inkl. moms)`,
            daysText,
            notes ? `Noter: ${notes}` : "",
            "",
            "Svar venligst på denne e-mail for at godkende eller afslå tilbuddet.",
            "",
            "Med venlig hilsen,",
            store.name,
            `${store.street}, ${store.zip} ${store.city}`,
            store.email,
          ]
            .filter(Boolean)
            .join("\n"),
        });
        if (emailError) throw new Error(emailError.message);
      } catch (emailErr) {
        console.error("Quote email error:", id, emailErr);
        warning = "Tilbuddet er gemt, men e-mailen til kunden kunne ikke sendes.";
      }
    }

    return NextResponse.json({ success: true, quoteId: quote.id, ...(warning ? { warning } : {}) });
  } catch (err) {
    console.error("Quote error:", err);
    return NextResponse.json(
      { error: "Noget gik galt. Prøv igen senere." },
      { status: 500 },
    );
  }
}
