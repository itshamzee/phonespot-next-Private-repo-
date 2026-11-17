import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { stripe } from "@/lib/stripe/client";
import { resend } from "@/lib/email/resend";
import { normalizeStoreId, storeLabel } from "@/lib/stores";
import { getStaffRecipients } from "@/lib/email/staff-routing";
import { adminCaseUrl, staffRepairHtml, staffRepairSubject } from "@/lib/email/staff-repair-alert";
import { REPAIR_EMAIL_FROM, sendRepairConfirmation } from "@/lib/email/repair-confirmation";
import { TEMPERED_GLASS_PRICE_DKK } from "@/lib/repair/booking-devices";
import {
  convertToPayInStore,
  lookupRecoverableTickets,
  type RecoveryTicket,
} from "@/lib/repair/payment-recovery";

/**
 * POST /api/repairs/recovery  { ticket_id, token, action }
 *
 * Kunden kom tilbage fra Stripe uden at betale. Nøglen (token) står kun i cancel-linket
 * og skal passe til hashen på sagen, ellers svares der som om sagen ikke findes.
 *
 *   action "pay_in_store": gør den samme sag til en almindelig booking med betaling i butikken.
 *   action "retry":        giver URL'en til den åbne Stripe-betaling, hvis den ikke er udløbet.
 */

type Details = {
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

const detailsOf = (t: RecoveryTicket) => (t.booking_details ?? {}) as Details;
const label = (t: RecoveryTicket) => `${t.device_type ?? ""} ${t.device_model ?? ""}`.trim();

const INVALID = "Linket er ugyldigt eller udløbet. Book på ny, eller ring til os.";

async function notify(tickets: RecoveryTicket[]) {
  const sorted = [...tickets].sort(
    (a, b) => (detailsOf(a).booking_device_index ?? 0) - (detailsOf(b).booking_device_index ?? 0),
  );
  const first = sorted[0];
  const multi = sorted.length > 1;
  const d = detailsOf(first);
  const storeId = normalizeStoreId(first.store_id);
  const total = multi
    ? (d.booking_group_total_dkk ?? sorted.reduce((n, t) => n + (detailsOf(t).total_price_dkk ?? 0), 0))
    : (d.total_price_dkk ?? null);

  await sendRepairConfirmation({
    ticketId: first.id,
    ticketNumber: first.ticket_number,
    customerName: first.customer_name,
    customerEmail: first.customer_email,
    deviceLabel: sorted.map(label).join(", "),
    services: d.selected_services ?? [],
    includesTemperedGlass: d.includes_tempered_glass,
    discountPercent: d.discount_percent,
    totalDkk: total,
    paid: false,
    deliveryMethod: d.delivery_method,
    storeId,
    preferredDate: d.preferred_date,
    preferredTime: d.preferred_time,
    ...(multi
      ? {
          devices: sorted.map((t) => ({
            deviceLabel: label(t),
            services: detailsOf(t).selected_services ?? [],
            includesTemperedGlass: detailsOf(t).includes_tempered_glass,
          })),
        }
      : {}),
  }).catch((err) => console.error("[repairs/recovery] customer confirmation threw:", err));

  const url = adminCaseUrl(first.id);
  const text = [
    "Kunden afbrød betalingen online og valgte i stedet at betale i butikken.",
    "Sagen er en almindelig booking og skal IKKE behandles som afbrudt.",
    "",
    `Butik: ${storeLabel(storeId)}`,
    `Kunde: ${first.customer_name}`,
    `Email: ${first.customer_email}`,
    `Telefon: ${first.customer_phone}`,
    ...sorted.flatMap((t, i) => [
      "",
      `Enhed${multi ? ` ${i + 1}` : ""}: ${label(t)}${multi ? ` (sags-ID ${t.id})` : ""}`,
      ...(detailsOf(t).selected_services ?? []).map((s) => `  ${s.name}: ${s.price_dkk} DKK`),
      ...(detailsOf(t).includes_tempered_glass ? [`  Beskyttelsesglas: ${TEMPERED_GLASS_PRICE_DKK} DKK`] : []),
    ]),
    "",
    ...(total != null ? [`Total at betale i butikken: ${total} DKK`] : []),
    ...(d.delivery_method ? [`Levering: ${d.delivery_method}`] : []),
    ...(d.preferred_date ? [`Ønsket dato: ${d.preferred_date}${d.preferred_time ? ` kl. ${d.preferred_time}` : ""}`] : []),
    "",
    `Åbn sagen i admin: ${url}`,
  ].join("\n");
  const { error } = await resend.emails.send({
    from: REPAIR_EMAIL_FROM,
    ...getStaffRecipients(storeId),
    subject: `${staffRepairSubject({
      storeLabel: storeId ? storeLabel(storeId) : null,
      what: multi ? `${sorted.length} enheder` : label(first),
      date: d.preferred_date,
      time: d.preferred_time,
    })} (betaler i butikken)`,
    text,
    html: staffRepairHtml(text, url),
  });
  if (error) console.error("[repairs/recovery] staff email failed:", first.id, error);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    ticket_id?: unknown;
    token?: unknown;
    action?: unknown;
  } | null;
  if (!body || (body.action !== "pay_in_store" && body.action !== "retry")) {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }

  const supabase = createServerClient();
  const found = await lookupRecoverableTickets(supabase, body.ticket_id, body.token);
  if (!found.ok) {
    if (found.reason === "paid") {
      return NextResponse.json(
        { error: "Betalingen er allerede gennemført.", reason: "paid" },
        { status: 409 },
      );
    }
    if (found.reason === "closed") {
      return NextResponse.json(
        { error: "Bookingen er ikke længere aktiv. Book på ny, eller ring til os.", reason: "closed" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: INVALID, reason: "invalid" }, { status: 404 });
  }

  try {
    if (body.action === "retry") {
      if (!found.sessionId) {
        return NextResponse.json(
          { error: "Betalingslinket er udløbet. Vælg betaling i butikken, eller book på ny.", reason: "expired" },
          { status: 410 },
        );
      }
      const session = await stripe.checkout.sessions.retrieve(found.sessionId);
      if (session.status === "open" && session.url) {
        return NextResponse.json({ success: true, url: session.url });
      }
      return NextResponse.json(
        { error: "Betalingslinket er udløbet. Vælg betaling i butikken, eller book på ny.", reason: "expired" },
        { status: 410 },
      );
    }

    // pay_in_store. Allerede konverteret: svar ok uden at sende mails igen.
    if (found.alreadyInStore) return NextResponse.json({ success: true, ticketId: found.tickets[0].id, already: true });

    const changed = await convertToPayInStore(supabase, found.tickets);
    if (!changed) {
      return NextResponse.json(
        { error: "Bookingen kunne ikke opdateres. Ring til os, så hjælper vi.", reason: "closed" },
        { status: 409 },
      );
    }

    // Luk den åbne Stripe-betaling, så kunden ikke kan betale to gange. Best effort.
    if (found.sessionId) {
      await stripe.checkout.sessions.expire(found.sessionId).catch(() => undefined);
    }
    await notify(found.tickets);

    return NextResponse.json({ success: true, ticketId: found.tickets[0].id });
  } catch (err) {
    console.error("[repairs/recovery] failed:", err);
    return NextResponse.json({ error: "Noget gik galt. Prøv igen, eller ring til os." }, { status: 500 });
  }
}
