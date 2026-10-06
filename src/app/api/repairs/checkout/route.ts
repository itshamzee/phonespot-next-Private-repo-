import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { stripe } from "@/lib/stripe/client";
import { STORE } from "@/lib/store-config";
import { normalizeStoreId, storeLabel } from "@/lib/stores";
import { getStaffRecipients } from "@/lib/email/staff-routing";
import { escapeHtml } from "@/lib/email/escape";
import {
  newBookingGroup,
  parseBookingDevices,
  priceBookingDevices,
} from "@/lib/repair/booking-devices";
import { priceFromCatalog } from "@/lib/repair/catalog-pricing";
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
  preferred_time?: string;
  delivery_method?: string;
  store_id?: string;
  /** Flere enheder: én sag pr. enhed, én samlet Stripe-betaling. */
  devices?: unknown[];
}

function validateInput(body: CheckoutRequestBody): string | null {
  if (!body.customer_name?.trim()) return "Kundenavn er påkrævet";
  if (!body.customer_email?.trim()) return "Email er påkrævet";
  if (!body.customer_phone?.trim()) return "Telefonnummer er påkrævet";
  const parsed = parseBookingDevices(body as unknown as Record<string, unknown>);
  if (!parsed.ok) return parsed.error;
  if (!parsed.multi && !body.selected_services?.length) return "Mindst én service skal vælges";
  if (!body.preferred_date?.trim()) return "Foretrukken dato er påkrævet";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.customer_email)) return "Ugyldig email-adresse";

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(body.preferred_date)) return "Ugyldig datoformat (brug YYYY-MM-DD)";

  return null;
}

interface CheckoutDevice {
  label: string;
  model: string;
  services: { name: string; price_dkk: number }[];
  glass: boolean;
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

    const storeId = normalizeStoreId(body.store_id);

    // Enhederne: én (som før) eller flere. Ved flere oprettes én sag pr. enhed,
    // og rabatten fordeles, så summen af sagerne er det, kunden betaler.
    const parsed = parseBookingDevices(body as unknown as Record<string, unknown>);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    // Priser, rabat og beskyttelsesglas beregnes server-side ud fra databasen.
    // Klientens price_dkk / total_price_dkk / discount_percent ignoreres, så
    // requesten ikke kan bruges til at betale mindre.
    const catalog = await priceFromCatalog(supabase, parsed.devices);
    if (!catalog.ok) {
      return NextResponse.json({ success: false, error: catalog.error }, { status: 400 });
    }
    const discountPercent = catalog.discountPercent;
    const priced = priceBookingDevices(catalog.devices, discountPercent);
    if (Number(body.total_price_dkk) !== priced.total) {
      console.warn("[repairs/checkout] client total differs from server total:", body.total_price_dkk, priced.total);
    }
    const multi = parsed.multi;
    const group = multi ? newBookingGroup(priced.devices.length, priced.total) : null;

    const sharedDetails = {
      preferred_date: body.preferred_date,
      preferred_time: body.preferred_time || null,
      delivery_method: body.delivery_method || null,
    };
    const commonFields = {
      customer_name: body.customer_name.trim(),
      customer_email: body.customer_email.trim().toLowerCase(),
      customer_phone: body.customer_phone.trim(),
      issue_description: body.issue_description,
      store_id: storeId,
      paid: false,
    };

    // 2. Create repair ticket(s) in Supabase
    let ticketIds: string[];
    if (multi && group) {
      const { data, error: ticketsError } = await supabase
        .from("repair_tickets")
        .insert(
          priced.devices.map((d, index) => ({
            ...commonFields,
            device_type: d.device_type,
            device_model: d.device_model,
            service_type: d.service_type,
            booking_details: {
              selected_services: d.selected_services,
              total_price_dkk: d.total_price_dkk,
              discount_percent: discountPercent,
              discount_dkk: d.discount_dkk,
              includes_tempered_glass: d.includes_tempered_glass,
              ...sharedDetails,
              ...group,
              booking_device_index: index + 1,
            },
          })),
        )
        .select("id");
      if (ticketsError || !data || data.length !== priced.devices.length) {
        console.error("Failed to create repair tickets:", ticketsError);
        return NextResponse.json(
          { success: false, error: "Kunne ikke oprette reparationssag" },
          { status: 500 },
        );
      }
      ticketIds = (data as { id: string }[]).map((t) => t.id);
    } else {
      const { data: ticket, error: ticketError } = await supabase
        .from("repair_tickets")
        .insert({
          ...commonFields,
          device_type: priced.devices[0].device_type,
          device_model: priced.devices[0].device_model,
          service_type: priced.devices[0].service_type,
          booking_details: {
            selected_services: priced.devices[0].selected_services,
            total_price_dkk: priced.total,
            discount_percent: discountPercent,
            includes_tempered_glass: priced.devices[0].includes_tempered_glass,
            ...sharedDetails,
          },
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
      ticketIds = [ticket.id];
    }
    const firstTicketId = ticketIds[0];

    // 3. Insert status log entry
    const { error: logError } = await supabase
      .from("repair_status_log")
      .insert(
        ticketIds.map((id) => ({
          ticket_id: id,
          old_status: null,
          new_status: "modtaget",
          note: "Sag oprettet via online booking med forudbetaling",
        })),
      );

    if (logError) {
      console.error("Failed to create status log:", logError);
    }

    // 4. Build Stripe line items (alle enheders linjer)
    const devices: CheckoutDevice[] = priced.devices.map((d) => ({
      label: `${d.device_type} ${d.device_model}`,
      model: d.device_model,
      services: d.selected_services,
      glass: d.includes_tempered_glass,
    }));

    const lineItems: {
      price_data: {
        currency: string;
        product_data: { name: string };
        unit_amount: number;
      };
      quantity: number;
    }[] = [];
    for (const device of devices) {
      for (const svc of device.services) {
        lineItems.push({
          price_data: {
            currency: "dkk",
            product_data: { name: `${device.model} - ${svc.name}` },
            unit_amount: Math.round(svc.price_dkk * 100), // Convert DKK to øre
          },
          quantity: 1,
        });
      }
      if (device.glass) {
        lineItems.push({
          price_data: {
            currency: "dkk",
            product_data: { name: `${device.model} - Beskyttelsesglas` },
            unit_amount: TEMPERED_GLASS_PRICE * 100,
          },
          quantity: 1,
        });
      }
    }

    // 5. Apply discount via Stripe coupon if applicable
    const discounts: { coupon: string }[] = [];
    if (discountPercent > 0) {
      const coupon = await stripe.coupons.create({
        percent_off: discountPercent,
        duration: "once",
        name: `Reparationsrabat ${discountPercent}%`,
        metadata: { repair_ticket_id: firstTicketId },
      });
      discounts.push({ coupon: coupon.id });
    }

    // 6. Create Stripe Checkout session
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "mobilepay", "klarna"],
      line_items: lineItems,
      ...(discounts.length > 0 ? { discounts } : {}),
      customer_email: body.customer_email.trim().toLowerCase(),
      locale: "da",
      currency: "dkk",
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      success_url: `${baseUrl}/reparation/bekraeftelse?session_id={CHECKOUT_SESSION_ID}&ticket_id=${firstTicketId}`,
      cancel_url: `${baseUrl}/reparation/booking?cancelled=true`,
      metadata: {
        type: "repair",
        repair_ticket_id: firstTicketId,
        // Alle sagerne i bookingen; webhooken markerer dem alle betalt.
        repair_ticket_ids: ticketIds.join(","),
        device_model: devices
          .map((d) => d.model)
          .join(", ")
          .slice(0, 500),
        preferred_date: body.preferred_date,
      },
    });

    // Betalingen kobles til sagerne via metadata.repair_ticket_id(s) i Stripe-
    // webhooken (lib/stripe/repair-payment.ts), som markerer dem betalt.

    // 8. Send staff notification email
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const servicesHtml = devices
        .map((d, i) => {
          const items = d.services
            .map((s) => `<li>${escapeHtml(s.name)} — ${s.price_dkk} DKK</li>`)
            .join("");
          const glass = d.glass && multi ? `<li>Beskyttelsesglas — ${TEMPERED_GLASS_PRICE} DKK</li>` : "";
          return multi
            ? `<p style="margin:12px 0 0;font-weight:bold;">${escapeHtml(d.label)} (sag ${ticketIds[i]})</p><ul>${items}${glass}</ul>`
            : `<ul>${items}</ul>`;
        })
        .join("");
      const totalForEmail = priced.total;
      const enhedCell = multi
        ? `${priced.devices.length} enheder (se nedenfor)`
        : devices[0].label;

      await resend.emails.send({
        from: `${STORE.name} <noreply@phonespot.dk>`,
        ...getStaffRecipients(storeId),
        subject: `Ny reparationsbooking${storeId ? ` (${storeLabel(storeId)})` : ""}: ${multi ? `${priced.devices.length} enheder` : priced.devices[0].device_model} — ${body.customer_name}`,
        html: `
          <h2>Ny reparationsbooking med forudbetaling</h2>
          <table style="border-collapse:collapse;">
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Butik</td><td>${storeLabel(storeId)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Kunde</td><td>${body.customer_name}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email</td><td>${body.customer_email}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Telefon</td><td>${body.customer_phone}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Enhed</td><td>${escapeHtml(enhedCell)}</td></tr>
            ${body.delivery_method ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Levering</td><td>${body.delivery_method}</td></tr>` : ""}
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Foretrukken dato</td><td>${body.preferred_date}${body.preferred_time ? ` kl. ${body.preferred_time}` : ""}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Pris i alt</td><td>${totalForEmail} DKK</td></tr>
            ${discountPercent > 0 ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Rabat</td><td>${discountPercent}%</td></tr>` : ""}
            ${!multi && devices[0].glass ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Beskyttelsesglas</td><td>Ja (${TEMPERED_GLASS_PRICE} DKK)</td></tr>` : ""}
          </table>
          <h3>Valgte services</h3>
          ${servicesHtml}
          ${body.issue_description ? `<h3>Beskrivelse</h3><p>${body.issue_description}</p>` : ""}
          <p style="margin-top:16px;color:#666;">Sag ID: ${ticketIds.join(", ")}</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send staff notification email:", emailError);
    }

    // 9. Return Stripe checkout URL
    return NextResponse.json({
      success: true,
      ticketId: firstTicketId,
      ticketIds,
      invoiceUrl: session.url,
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
