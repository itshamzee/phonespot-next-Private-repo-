import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { createDraftOrder } from "@/lib/shopify/admin-client";
import { STORE } from "@/lib/store-config";
import { Resend } from "resend";

const TEMPERED_GLASS_PRICE = 99; // DKK

interface SelectedService {
  id: string;
  name: string;
  price_dkk: number;
}

interface CheckoutRequestBody {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  device_type: string;
  device_model: string;
  issue_description: string;
  service_type: string;
  selected_services: SelectedService[];
  total_price_dkk: number;
  discount_percent: number;
  includes_tempered_glass: boolean;
  preferred_date: string;
}

function validateInput(body: CheckoutRequestBody): string | null {
  if (!body.customer_name?.trim()) return "Kundenavn er påkrævet";
  if (!body.customer_email?.trim()) return "Email er påkrævet";
  if (!body.customer_phone?.trim()) return "Telefonnummer er påkrævet";
  if (!body.selected_services?.length) return "Mindst én service skal vælges";
  if (!body.preferred_date?.trim()) return "Foretrukken dato er påkrævet";

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.customer_email)) return "Ugyldig email-adresse";

  // Validate date format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(body.preferred_date)) return "Ugyldig datoformat (brug YYYY-MM-DD)";

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutRequestBody;

    // 1. Validate input
    const validationError = validateInput(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // 2. Create repair ticket in Supabase
    const { data: ticket, error: ticketError } = await supabase
      .from("repair_tickets")
      .insert({
        customer_name: body.customer_name.trim(),
        customer_email: body.customer_email.trim().toLowerCase(),
        customer_phone: body.customer_phone.trim(),
        device_type: body.device_type,
        device_model: body.device_model,
        issue_description: body.issue_description,
        service_type: body.service_type,
        booking_details: {
          selected_services: body.selected_services,
          total_price_dkk: body.total_price_dkk,
          discount_percent: body.discount_percent,
          includes_tempered_glass: body.includes_tempered_glass,
          preferred_date: body.preferred_date,
        },
        paid: false,
      })
      .select("id")
      .single();

    if (ticketError || !ticket) {
      console.error("Failed to create repair ticket:", ticketError);
      return NextResponse.json(
        { success: false, error: "Kunne ikke oprette reparationssag" },
        { status: 500 },
      );
    }

    // 3. Insert status log entry
    const { error: logError } = await supabase
      .from("repair_status_log")
      .insert({
        ticket_id: ticket.id,
        old_status: null,
        new_status: "modtaget",
        note: "Sag oprettet via online booking med forudbetaling",
      });

    if (logError) {
      console.error("Failed to create status log:", logError);
      // Non-fatal — continue
    }

    // 4. Build line items for Shopify Draft Order
    const lineItems = body.selected_services.map((svc) => ({
      title: `${body.device_model} - ${svc.name}`,
      quantity: 1,
      originalUnitPrice: svc.price_dkk.toFixed(2),
    }));

    if (body.includes_tempered_glass) {
      lineItems.push({
        title: `${body.device_model} - Panserglas`,
        quantity: 1,
        originalUnitPrice: TEMPERED_GLASS_PRICE.toFixed(2),
      });
    }

    // 5. Create Shopify Draft Order
    const noteLines = [
      `Reparation: ${body.device_type} ${body.device_model}`,
      `Services: ${body.service_type}`,
      `Foretrukken dato: ${body.preferred_date}`,
      `Kunde: ${body.customer_name} / ${body.customer_phone}`,
      body.issue_description ? `Beskrivelse: ${body.issue_description}` : "",
      body.discount_percent > 0 ? `Rabat: ${body.discount_percent}%` : "",
      `Sag ID: ${ticket.id}`,
    ]
      .filter(Boolean)
      .join("\n");

    const draftOrder = await createDraftOrder({
      customerEmail: body.customer_email.trim().toLowerCase(),
      lineItems,
      note: noteLines,
      tags: ["reparation", "online-booking", "forudbetaling"],
    });

    // 6. Update ticket with Shopify draft order ID
    const { error: updateError } = await supabase
      .from("repair_tickets")
      .update({ shopify_draft_order_id: draftOrder.id })
      .eq("id", ticket.id);

    if (updateError) {
      console.error("Failed to update ticket with draft order ID:", updateError);
      // Non-fatal — continue
    }

    // 7. Send staff notification email
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const servicesHtml = body.selected_services
        .map((s) => `<li>${s.name} — ${s.price_dkk} DKK</li>`)
        .join("");

      await resend.emails.send({
        from: `${STORE.name} <noreply@phonespot.dk>`,
        to: "info@phonespot.dk",
        subject: `Ny reparationsbooking: ${body.device_model} — ${body.customer_name}`,
        html: `
          <h2>Ny reparationsbooking med forudbetaling</h2>
          <table style="border-collapse:collapse;">
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Kunde</td><td>${body.customer_name}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email</td><td>${body.customer_email}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Telefon</td><td>${body.customer_phone}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Enhed</td><td>${body.device_type} ${body.device_model}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Foretrukken dato</td><td>${body.preferred_date}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Pris i alt</td><td>${body.total_price_dkk} DKK</td></tr>
            ${body.discount_percent > 0 ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Rabat</td><td>${body.discount_percent}%</td></tr>` : ""}
            ${body.includes_tempered_glass ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Panserglas</td><td>Ja (${TEMPERED_GLASS_PRICE} DKK)</td></tr>` : ""}
          </table>
          <h3>Valgte services</h3>
          <ul>${servicesHtml}</ul>
          ${body.issue_description ? `<h3>Beskrivelse</h3><p>${body.issue_description}</p>` : ""}
          <p style="margin-top:16px;color:#666;">Shopify kladdeordre: ${draftOrder.name}<br/>Sag ID: ${ticket.id}</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send staff notification email:", emailError);
      // Non-fatal — the booking still goes through
    }

    // 8. Return success with invoice URL
    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      invoiceUrl: draftOrder.invoiceUrl,
    });
  } catch (error) {
    console.error("Repair checkout error:", error);
    const message = error instanceof Error ? error.message : "Ukendt fejl";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
