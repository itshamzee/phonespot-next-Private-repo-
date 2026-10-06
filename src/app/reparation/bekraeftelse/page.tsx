import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/client";
import { stripe } from "@/lib/stripe/client";
import { normalizeStoreId } from "@/lib/stores";
import { STORES } from "@/lib/store-config";
import { formatDanishDate } from "@/lib/email/repair-confirmation";
import { TEMPERED_GLASS_PRICE_DKK, parseTicketIdList } from "@/lib/repair/booking-devices";

export const metadata: Metadata = {
  title: "Reparation bekræftet | PhoneSpot",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type BookingDetails = {
  selected_services?: { name: string; price_dkk: number }[];
  total_price_dkk?: number;
  preferred_date?: string | null;
  preferred_time?: string | null;
  delivery_method?: string | null;
  includes_tempered_glass?: boolean;
  booking_group_id?: string;
  booking_device_index?: number;
  booking_group_total_dkk?: number;
};

const TICKET_COLUMNS = "id, ticket_number, customer_email, device_type, device_model, store_id, paid, booking_details";

// Sags-ID'et er et uuid og fungerer som adgangsnøgle, ligesom statussiden.
// Siden viser derfor kun det, kunden selv har indtastet, plus butik og pris.
// En booking med flere enheder er én sag pr. enhed (fælles booking_group_id); alle vises.
async function loadTickets(ticketId: string | undefined) {
  if (!ticketId || !UUID.test(ticketId)) return [];
  const supabase = createServerClient();
  const { data } = await supabase.from("repair_tickets").select(TICKET_COLUMNS).eq("id", ticketId).maybeSingle();
  if (!data) return [];
  const groupId = (data.booking_details as BookingDetails | null)?.booking_group_id;
  if (!groupId || !UUID.test(groupId)) return [data];
  const { data: group } = await supabase
    .from("repair_tickets")
    .select(TICKET_COLUMNS)
    .eq("booking_details->>booking_group_id", groupId)
    .limit(10);
  const rows = group && group.length > 0 ? group : [data];
  const index = (t: typeof data) => (t.booking_details as BookingDetails | null)?.booking_device_index ?? 0;
  return [...rows].sort((a, b) => index(a) - index(b));
}

async function sessionIsPaid(sessionId: string | undefined, ticketId: string | undefined) {
  if (!sessionId || !sessionId.startsWith("cs_")) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session.payment_status === "paid" && !!ticketId && parseTicketIdList(session.metadata).includes(ticketId);
  } catch {
    return false;
  }
}

const kr = (value: number) => `${value.toLocaleString("da-DK")} kr.`;

export default async function BekraeftelsePage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; ticket_id?: string; session_id?: string }>;
}) {
  // Stripe-checkout sender ticket_id; ældre links brugte ticket.
  const params = await searchParams;
  const ticketId = params.ticket_id ?? params.ticket;
  const [tickets, paidNow] = await Promise.all([
    loadTickets(ticketId),
    sessionIsPaid(params.session_id, ticketId),
  ]);
  const ticket = tickets[0] ?? null;
  const multi = tickets.length > 1;
  const paid = paidNow || (tickets.length > 0 && tickets.every((t) => t.paid));
  const details = (ticket?.booking_details ?? {}) as BookingDetails;
  const detailsOf = (t: (typeof tickets)[number]) => (t.booking_details ?? {}) as BookingDetails;
  const total = multi
    ? details.booking_group_total_dkk ?? tickets.reduce((sum, t) => sum + (detailsOf(t).total_price_dkk ?? 0), 0)
    : details.total_price_dkk;
  const storeSlug = normalizeStoreId(ticket?.store_id) ?? normalizeStoreId(details.delivery_method);
  const store = storeSlug ? STORES[storeSlug] : null;
  const mailIn = details.delivery_method === "Send ind";
  const shortTicket = ticket?.ticket_number || (ticketId ? ticketId.slice(0, 8) : null);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#fafaf8] px-4 py-12 font-body">
      <div className="w-full max-w-2xl rounded-2xl border border-[#dce1db] bg-white p-6 md:p-10">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-eco">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="mb-3 text-center font-body text-2xl font-bold text-charcoal md:text-3xl">
          {paid ? "Tak! Din reparation er betalt og booket" : "Din reparation er booket"}
        </h1>
        <p className="mx-auto mb-8 max-w-md text-center text-charcoal/70">
          {ticket?.customer_email ? (
            <>
              Vi har sendt en bekræftelse til{" "}
              <strong className="text-charcoal">{ticket.customer_email}</strong>.
              Tjek evt. din spam-mappe.
            </>
          ) : (
            "Du modtager en bekræftelse på e-mail."
          )}
        </p>

        {(shortTicket || ticket) && (
          <dl className="mb-8 divide-y divide-[#E5E5EA] rounded-xl border border-[#E5E5EA] text-sm">
            {!multi && shortTicket && (
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-charcoal/60">Sags-nr.</dt>
                <dd className="font-mono font-semibold tracking-wide text-charcoal">{shortTicket}</dd>
              </div>
            )}
            {tickets.map((t, i) => (
              <div key={t.id} className="px-5 py-3">
                <div className="flex justify-between gap-4">
                  <dt className="text-charcoal/60">{multi ? `Enhed ${i + 1}` : "Enhed"}</dt>
                  <dd className="text-right font-semibold text-charcoal">
                    {t.device_type} {t.device_model}
                    {multi && (
                      <span className="block font-mono text-xs font-normal tracking-wide text-charcoal/60">
                        Sags-nr. {t.ticket_number || t.id.slice(0, 8)}
                      </span>
                    )}
                  </dd>
                </div>
                {(detailsOf(t).selected_services ?? []).map((s) => (
                  <div key={s.name} className="mt-2 flex justify-between gap-4">
                    <dt className="text-charcoal">{s.name}</dt>
                    <dd className="text-charcoal">{kr(s.price_dkk)}</dd>
                  </div>
                ))}
                {multi && detailsOf(t).includes_tempered_glass && (
                  <div className="mt-2 flex justify-between gap-4">
                    <dt className="text-charcoal">Beskyttelsesglas</dt>
                    <dd className="text-charcoal">{kr(TEMPERED_GLASS_PRICE_DKK)}</dd>
                  </div>
                )}
              </div>
            ))}
            {total != null && (
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="font-semibold text-charcoal">I alt</dt>
                <dd className="text-right font-semibold text-charcoal">
                  {kr(total)}
                  <span className="block text-xs font-normal text-green-eco">
                    {paid ? "Betalt online" : "Betales i butikken"}
                  </span>
                </dd>
              </div>
            )}
            {store && !mailIn && (
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-charcoal/60">Aflevering</dt>
                <dd className="text-right text-charcoal">
                  <span className="font-semibold">{store.name}</span>
                  <span className="block">
                    {store.street}, {store.zip} {store.city}
                  </span>
                  {details.preferred_date && (
                    <span className="block">
                      {formatDanishDate(details.preferred_date)}
                      {details.preferred_time ? `, kl. ${details.preferred_time}` : ""}
                    </span>
                  )}
                </dd>
              </div>
            )}
            {mailIn && (
              <div className="px-5 py-3 text-charcoal">
                Du sender din enhed ind. Vi kontakter dig med instruktioner til
                den gratis forsendelse.
              </div>
            )}
          </dl>
        )}

        <div className="mb-8 rounded-xl bg-[#F7F7F8] p-5 text-sm text-charcoal/80">
          <p className="font-semibold text-charcoal">Inden du kommer</p>
          <p className="mt-1">
            Tag en backup af din telefon, og husk din skærmkode, så vi kan teste
            enheden, når den er repareret.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          {ticketId && UUID.test(ticketId) && (
            <Link
              href={`/reparation/status/${ticketId}`}
              className="rounded-full bg-charcoal px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Følg din reparation
            </Link>
          )}
          {store && !mailIn && (
            <a
              href={store.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[#dce1db] px-8 py-3 text-sm font-semibold text-charcoal hover:bg-[#F7F7F8]"
            >
              Find vej til butikken
            </a>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-charcoal/60">
          Skal du ændre noget? Ring på {store?.phone ?? "61 10 00 48"} eller svar
          på bekræftelsesmailen.
        </p>
      </div>
    </div>
  );
}
