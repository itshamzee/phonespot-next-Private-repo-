import type Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/client";
import { resend } from "@/lib/email/resend";
import { REPAIR_EMAIL_FROM, sendRepairConfirmation } from "@/lib/email/repair-confirmation";
import { getStaffRecipients } from "@/lib/email/staff-routing";
import { storeLabel, normalizeStoreId } from "@/lib/stores";
import { sendPushover } from "@/lib/notifications/pushover";

type RepairBookingDetails = {
  selected_services?: { name: string; price_dkk: number }[];
  total_price_dkk?: number;
  discount_percent?: number;
  includes_tempered_glass?: boolean;
  preferred_date?: string | null;
  preferred_time?: string | null;
  delivery_method?: string | null;
};

/**
 * Forudbetalte reparationer (metadata.type = "repair") har ingen ordre — de
 * hører til en repair_ticket. Uden denne gren blev betalingen ignoreret: sagen
 * stod som ubetalt i admin, og kunden fik ingen kvittering.
 *
 * Opdateringen er betinget af paid = false, så Stripes gentagne leveringer af
 * samme event kun sender mails én gang.
 */
export async function handleRepairPayment(session: Stripe.Checkout.Session): Promise<void> {
  const ticketId = session.metadata?.repair_ticket_id;
  if (!ticketId) {
    console.error("[webhook] repair session without repair_ticket_id:", session.id);
    return;
  }
  if (session.payment_status !== "paid") {
    console.warn("[webhook] repair session completed but not paid:", session.id, session.payment_status);
    return;
  }

  const supabase = createServerClient();
  const { data: ticket, error } = await supabase
    .from("repair_tickets")
    .update({ paid: true, paid_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("paid", false)
    .select("id, ticket_number, customer_name, customer_email, customer_phone, device_type, device_model, store_id, booking_details")
    .maybeSingle();

  if (error) throw new Error(`Could not mark repair ticket ${ticketId} as paid: ${error.message}`);
  if (!ticket) return; // allerede markeret betalt — gentaget event

  const details = (ticket.booking_details ?? {}) as RepairBookingDetails;
  const amount = session.amount_total != null ? session.amount_total / 100 : details.total_price_dkk ?? null;

  await sendRepairConfirmation({
    ticketId: ticket.id,
    ticketNumber: ticket.ticket_number,
    customerName: ticket.customer_name,
    customerEmail: ticket.customer_email,
    deviceLabel: `${ticket.device_type} ${ticket.device_model}`.trim(),
    services: details.selected_services ?? [],
    includesTemperedGlass: details.includes_tempered_glass,
    discountPercent: details.discount_percent,
    totalDkk: amount,
    paid: true,
    deliveryMethod: details.delivery_method,
    storeId: ticket.store_id,
    preferredDate: details.preferred_date,
    preferredTime: details.preferred_time,
  }).catch((err) => console.error("[webhook] repair confirmation threw:", err));

  const store = storeLabel(normalizeStoreId(ticket.store_id));
  const { error: staffError } = await resend.emails.send({
    from: REPAIR_EMAIL_FROM,
    ...getStaffRecipients(ticket.store_id),
    subject: `Betalt reparation (${store}): ${ticket.device_model} — ${ticket.customer_name}`,
    text: [
      `Reparationen er betalt online: ${amount ?? "?"} kr.`,
      "",
      `Kunde: ${ticket.customer_name} · ${ticket.customer_phone} · ${ticket.customer_email}`,
      `Enhed: ${ticket.device_type} ${ticket.device_model}`,
      ...(details.selected_services ?? []).map((s) => `- ${s.name}: ${s.price_dkk} kr.`),
      details.preferred_date ? `Ønsket dato: ${details.preferred_date}${details.preferred_time ? ` kl. ${details.preferred_time}` : ""}` : "",
      "",
      `Sags-ID: ${ticket.id}`,
      "Sagen er markeret som betalt i admin — kunden skal IKKE betale i butikken.",
    ].join("\n"),
  });
  if (staffError) console.error("[webhook] repair staff email failed:", ticket.id, staffError);

  await sendPushover({
    title: `Betalt reparation · ${store}`,
    message: `${ticket.device_model} — ${amount ?? "?"} kr. (${ticket.customer_name})`,
    sound: "cashregister",
  }).catch(() => undefined);
}
