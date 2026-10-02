import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import { normalizeStoreId, storeLabel } from "@/lib/stores";
import { getStaffRecipients } from "@/lib/email/staff-routing";
import { sendRepairConfirmation } from "@/lib/email/repair-confirmation";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatDanishDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" });
}

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
          preferred_date: body.preferred_date || null,
          preferred_time: body.preferred_time || null,
          delivery_method: body.delivery_method || null,
        }
      : null;

    // The chosen store decides which mailbox the staff notification lands in and
    // which address the customer's confirmation is signed with. A booking made
    // without one (a direct API call — the wizard requires the field) stays
    // unattributed rather than being filed as Slagelse, and only the signature
    // falls back, because the customer must be given some address.
    const storeId = normalizeStoreId(body.store_id);

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
        store_id: storeId,
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
        bookingLines.push("  Beskyttelsesglas: 99 DKK");
      }
      if (bookingDetails.discount_percent > 0) {
        bookingLines.push(`  Rabat: ${bookingDetails.discount_percent}%`);
      }
      bookingLines.push(`  Total: ${bookingDetails.total_price_dkk} DKK`);
      if (bookingDetails.delivery_method) {
        bookingLines.push(`  Levering: ${bookingDetails.delivery_method}`);
      }
      if (bookingDetails.preferred_date) {
        bookingLines.push(
          `  Ønsket dato: ${formatDanishDate(bookingDetails.preferred_date)}${
            bookingDetails.preferred_time ? ` kl. ${bookingDetails.preferred_time}` : ""
          }`,
        );
      }
    }

    // Kundens kvittering. Fejler den, må bookingen ikke fejle — sagen er
    // oprettet — men fejlen logges i sendRepairConfirmation.
    await sendRepairConfirmation({
      ticketId: ticket.id,
      customerName: body.customer_name,
      customerEmail: body.customer_email,
      deviceLabel: `${body.device_type} ${body.device_model}`.trim(),
      services: bookingDetails?.selected_services ?? [],
      includesTemperedGlass: bookingDetails?.includes_tempered_glass,
      discountPercent: bookingDetails?.discount_percent,
      totalDkk: bookingDetails?.total_price_dkk ?? null,
      paid: false,
      deliveryMethod: bookingDetails?.delivery_method,
      storeId,
      preferredDate: bookingDetails?.preferred_date,
      preferredTime: bookingDetails?.preferred_time,
    }).catch((err) => console.error("[repairs] customer confirmation threw:", err));

    // Send notification email to staff
    const { error: staffEmailError } = await resend.emails.send({
      from: "PhoneSpot System <noreply@phonespot.dk>",
      ...getStaffRecipients(storeId),
      subject: `Ny reparationssag${storeId ? ` (${storeLabel(storeId)})` : ""}: ${body.device_type} ${body.device_model}`,
      text: [
        "Ny reparationsanmodning modtaget:",
        "",
        `Butik: ${storeLabel(storeId)}`,
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
    if (staffEmailError) console.error("[repairs] staff email failed:", ticket.id, staffEmailError);

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (err) {
    console.error("Repair ticket error:", err);
    return NextResponse.json(
      { error: "Noget gik galt. Prøv igen senere." },
      { status: 500 },
    );
  }
}
