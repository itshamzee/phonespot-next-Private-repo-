import type Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/client";
import { resend } from "@/lib/email/resend";
import { REPAIR_EMAIL_FROM, sendRepairConfirmation } from "@/lib/email/repair-confirmation";
import { getStaffRecipients } from "@/lib/email/staff-routing";
import { storeLabel, normalizeStoreId } from "@/lib/stores";
import { sendPushover } from "@/lib/notifications/pushover";
import { parseTicketIdList } from "@/lib/repair/booking-devices";

type RepairBookingDetails = {
  selected_services?: { name: string; price_dkk: number }[];
  total_price_dkk?: number;
  discount_percent?: number;
  includes_tempered_glass?: boolean;
  preferred_date?: string | null;
  preferred_time?: string | null;
  delivery_method?: string | null;
  booking_device_index?: number;
  booking_group_total_dkk?: number;
};

/**
 * Forudbetalte reparationer (metadata.type = "repair") har ingen ordre — de
 * hører til en repair_ticket. Uden denne gren blev betalingen ignoreret: sagen
 * stod som ubetalt i admin, og kunden fik ingen kvittering.
 *
 * En booking med flere enheder har én sag pr. enhed og én samlet betaling
 * (metadata.repair_ticket_ids). Alle sagerne markeres betalt, og kunden får én
 * kvittering, der lister alle enheder.
 *
 * Opdateringen er betinget af paid = false, så Stripes gentagne leveringer af
 * samme event kun sender mails én gang.
 */
export async function handleRepairPayment(session: Stripe.Checkout.Session): Promise<void> {
  const ticketIds = parseTicketIdList(session.metadata);
  if (ticketIds.length === 0) {
    console.error("[webhook] repair session without repair_ticket_id:", session.id);
    return;
  }
  if (session.payment_status !== "paid") {
    console.warn("[webhook] repair session completed but not paid:", session.id, session.payment_status);
    return;
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("repair_tickets")
    .update({ paid: true, paid_at: new Date().toISOString() })
    .in("id", ticketIds)
    .eq("paid", false)
    .select("id, customer_name, customer_email, customer_phone, device_type, device_model, store_id, booking_details");

  if (error) throw new Error(`Could not mark repair tickets ${ticketIds.join(",")} as paid: ${error.message}`);
  const tickets = [...(data ?? [])].sort(
    (a, b) =>
      ((a.booking_details as RepairBookingDetails | null)?.booking_device_index ?? 0) -
      ((b.booking_details as RepairBookingDetails | null)?.booking_device_index ?? 0),
  );
  if (tickets.length === 0) return; // allerede markeret betalt — gentaget event

  const ticket = tickets[0];
  const multi = tickets.length > 1;
  const detailsOf = (t: (typeof tickets)[number]) => (t.booking_details ?? {}) as RepairBookingDetails;
  const details = detailsOf(ticket);
  const amount =
    session.amount_total != null
      ? session.amount_total / 100
      : multi
        ? tickets.reduce((sum, t) => sum + (detailsOf(t).total_price_dkk ?? 0), 0)
        : details.total_price_dkk ?? null;
  const deviceLabel = (t: (typeof tickets)[number]) => `${t.device_type} ${t.device_model}`.trim();

  await sendRepairConfirmation({
    ticketId: ticket.id,
    customerName: ticket.customer_name,
    customerEmail: ticket.customer_email,
    deviceLabel: multi ? tickets.map(deviceLabel).join(", ") : deviceLabel(ticket),
    services: details.selected_services ?? [],
    includesTemperedGlass: details.includes_tempered_glass,
    discountPercent: details.discount_percent,
    totalDkk: amount,
    paid: true,
    deliveryMethod: details.delivery_method,
    storeId: ticket.store_id,
    preferredDate: details.preferred_date,
    preferredTime: details.preferred_time,
    ...(multi
      ? {
          devices: tickets.map((t) => ({
            deviceLabel: deviceLabel(t),
            services: detailsOf(t).selected_services ?? [],
            includesTemperedGlass: detailsOf(t).includes_tempered_glass,
          })),
        }
      : {}),
  }).catch((err) => console.error("[webhook] repair confirmation threw:", err));

  const store = storeLabel(normalizeStoreId(ticket.store_id));
  const { error: staffError } = await resend.emails.send({
    from: REPAIR_EMAIL_FROM,
    ...getStaffRecipients(ticket.store_id),
    subject: multi
      ? `Betalt reparation (${store}): ${tickets.length} enheder — ${ticket.customer_name}`
      : `Betalt reparation (${store}): ${ticket.device_model} — ${ticket.customer_name}`,
    text: [
      `Reparationen er betalt online: ${amount ?? "?"} kr.`,
      "",
      `Kunde: ${ticket.customer_name} · ${ticket.customer_phone} · ${ticket.customer_email}`,
      ...tickets.flatMap((t) => [
        `Enhed: ${deviceLabel(t)}${multi ? ` (sags-ID ${t.id})` : ""}`,
        ...(detailsOf(t).selected_services ?? []).map((s) => `- ${s.name}: ${s.price_dkk} kr.`),
        ...(multi && detailsOf(t).includes_tempered_glass ? ["- Beskyttelsesglas: 99 kr."] : []),
      ]),
      details.preferred_date ? `Ønsket dato: ${details.preferred_date}${details.preferred_time ? ` kl. ${details.preferred_time}` : ""}` : "",
      "",
      ...(multi ? [] : [`Sags-ID: ${ticket.id}`]),
      `${multi ? "Sagerne er" : "Sagen er"} markeret som betalt i admin — kunden skal IKKE betale i butikken.`,
    ].join("\n"),
  });
  if (staffError) console.error("[webhook] repair staff email failed:", ticket.id, staffError);

  await sendPushover({
    title: `Betalt reparation · ${store}`,
    message: multi
      ? `${tickets.length} enheder — ${amount ?? "?"} kr. (${ticket.customer_name})`
      : `${ticket.device_model} — ${amount ?? "?"} kr. (${ticket.customer_name})`,
    sound: "cashregister",
  }).catch(() => undefined);
}
