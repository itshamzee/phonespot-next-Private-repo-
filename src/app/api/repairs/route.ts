import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import { STORE } from "@/lib/store-config";

const resend = new Resend(process.env.RESEND_API_KEY);

const REQUIRED_FIELDS = [
  "customer_name",
  "customer_email",
  "customer_phone",
  "device_type",
  "device_model",
  "issue_description",
  "service_type",
] as const;

export async function POST(request: Request) {
  const body = await request.json();

  // Validate required fields
  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || (typeof body[field] === "string" && !body[field].trim())) {
      return NextResponse.json(
        { error: `Feltet "${field}" er påkrævet` },
        { status: 400 },
      );
    }
  }

  const supabase = createServerClient();

  try {
    // Build booking_details JSONB if booking flow fields are present
    const bookingDetails = body.selected_services
      ? {
          selected_services: body.selected_services,
          total_price_dkk: body.total_price_dkk,
          discount_percent: body.discount_percent || 0,
          includes_tempered_glass: body.includes_tempered_glass || false,
        }
      : null;

    // Insert repair ticket
    const { data: ticket, error: insertError } = await supabase
      .from("repair_tickets")
      .insert({
        customer_name: body.customer_name.trim(),
        customer_email: body.customer_email.trim(),
        customer_phone: body.customer_phone.trim(),
        device_type: body.device_type.trim(),
        device_model: body.device_model.trim(),
        issue_description: body.issue_description.trim(),
        service_type: body.service_type.trim(),
        ...(bookingDetails ? { booking_details: bookingDetails } : {}),
      })
      .select()
      .single();

    if (insertError || !ticket) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json(
        { error: "Kunne ikke oprette reparationssag" },
        { status: 500 },
      );
    }

    // Build booking summary lines for emails
    const bookingLines: string[] = [];
    if (bookingDetails) {
      bookingLines.push("");
      bookingLines.push("--- Booking detaljer ---");
      for (const svc of bookingDetails.selected_services) {
        bookingLines.push(`  ${svc.name}: ${svc.price_dkk} DKK`);
      }
      if (bookingDetails.includes_tempered_glass) {
        bookingLines.push("  Panserglas: 99 DKK");
      }
      if (bookingDetails.discount_percent > 0) {
        bookingLines.push(`  Rabat: ${bookingDetails.discount_percent}%`);
      }
      bookingLines.push(`  Total: ${bookingDetails.total_price_dkk} DKK`);
    }

    // Send confirmation email to customer
    await resend.emails.send({
      from: "PhoneSpot Reparation <noreply@phonespot.dk>",
      to: body.customer_email.trim(),
      subject: `Reparationssag modtaget — ${ticket.id.slice(0, 8)}`,
      text: [
        `Hej ${body.customer_name},`,
        "",
        "Tak for din reparationsanmodning. Vi har modtaget den og vender tilbage hurtigst muligt med et tilbud.",
        "",
        `Sags-ID: ${ticket.id}`,
        `Enhed: ${body.device_type} — ${body.device_model}`,
        `Service: ${body.service_type}`,
        ...bookingLines,
        "",
        "Du vil modtage en email naar vi har vurderet din enhed og kan give dig en fast pris.",
        "",
        "Med venlig hilsen,",
        STORE.name,
        `${STORE.street}, ${STORE.zip} ${STORE.city}`,
        STORE.email,
      ].join("\n"),
    });

    // Send notification email to staff
    await resend.emails.send({
      from: "PhoneSpot System <noreply@phonespot.dk>",
      to: "info@phonespot.dk",
      subject: `Ny reparationssag: ${body.device_type} ${body.device_model}`,
      text: [
        "Ny reparationsanmodning modtaget:",
        "",
        `Kunde: ${body.customer_name}`,
        `Email: ${body.customer_email}`,
        `Telefon: ${body.customer_phone}`,
        `Enhed: ${body.device_type} — ${body.device_model}`,
        `Service: ${body.service_type}`,
        `Beskrivelse: ${body.issue_description}`,
        ...bookingLines,
        "",
        `Sags-ID: ${ticket.id}`,
      ].join("\n"),
    });

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (err) {
    console.error("Repair ticket error:", err);
    return NextResponse.json(
      { error: "Noget gik galt. Prøv igen senere." },
      { status: 500 },
    );
  }
}
