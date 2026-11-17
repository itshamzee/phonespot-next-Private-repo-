import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/client";
import { normalizeStoreId } from "@/lib/stores";
import { STORES } from "@/lib/store-config";
import { lookupRecoverableTickets } from "@/lib/repair/payment-recovery";
import { PaymentCancelledActions } from "./payment-cancelled-actions";

export const metadata: Metadata = {
  title: "Betalingen blev ikke gennemført | PhoneSpot",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const kr = (value: number) => `${value.toLocaleString("da-DK")} kr.`;

type Details = {
  selected_services?: { name: string; price_dkk: number }[];
  total_price_dkk?: number;
  booking_group_total_dkk?: number;
};

const shell = "flex min-h-[60vh] items-center justify-center bg-[#fafaf8] px-4 py-12 font-body";
const card = "w-full max-w-2xl rounded-2xl border border-[#dce1db] bg-white p-6 md:p-10";

/**
 * Stripes cancel_url. Kunden kommer hertil uden at have betalt, og sagen står ubetalt.
 * Siden kræver ticket_id + token fra linket; uden dem (eller med forkert token)
 * vises kun en neutral besked, så sags-id'er ikke kan afprøves.
 */
export default async function BetalingAfbrudtPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket_id?: string; token?: string }>;
}) {
  const { ticket_id: ticketId, token } = await searchParams;
  const found = await lookupRecoverableTickets(createServerClient(), ticketId, token);

  if (!found.ok && found.reason === "paid") {
    return (
      <div className={shell}>
        <div className={card}>
          <h1 className="mb-3 text-2xl font-bold text-charcoal">Betalingen er gennemført</h1>
          <p className="mb-6 text-charcoal/70">Din reparation er booket og betalt, så du behøver ikke gøre mere.</p>
          <Link
            href={`/reparation/bekraeftelse?ticket_id=${ticketId}`}
            className="inline-block rounded-full bg-charcoal px-8 py-3 text-sm font-semibold text-white"
          >
            Se din booking
          </Link>
        </div>
      </div>
    );
  }

  if (!found.ok) {
    return (
      <div className={shell}>
        <div className={card}>
          <h1 className="mb-3 text-2xl font-bold text-charcoal">Betalingen blev ikke gennemført</h1>
          <p className="mb-6 text-charcoal/70">
            Din tid er ikke booket. Linket virker ikke længere, men du kan booke på ny, eller ringe til os på 61 10 00 48.
          </p>
          <Link
            href="/reparation/booking"
            className="inline-block rounded-full bg-green-eco px-8 py-3 text-sm font-bold text-white"
          >
            Book reparation
          </Link>
        </div>
      </div>
    );
  }

  const tickets = found.tickets;
  const head = tickets[0];
  const detailsOf = (t: (typeof tickets)[number]) => (t.booking_details ?? {}) as Details;
  const multi = tickets.length > 1;
  const total = multi
    ? (detailsOf(head).booking_group_total_dkk ?? tickets.reduce((n, t) => n + (detailsOf(t).total_price_dkk ?? 0), 0))
    : detailsOf(head).total_price_dkk;
  const storeSlug = normalizeStoreId(head.store_id);
  const store = storeSlug ? STORES[storeSlug] : null;

  return (
    <div className={shell}>
      <div className={card}>
        <h1 className="mb-3 text-2xl font-bold text-charcoal md:text-3xl">Betalingen blev ikke gennemført</h1>
        <p className="mb-6 text-charcoal/70">
          {found.alreadyInStore
            ? "Din tid er booket, og du betaler i butikken."
            : "Din tid er ikke booket endnu. Du er ikke blevet trukket. Vælg, hvordan du vil gøre bookingen færdig."}
        </p>

        <dl className="mb-8 divide-y divide-[#E5E5EA] rounded-xl border border-[#E5E5EA] text-sm">
          {tickets.map((t) => (
            <div key={t.id} className="px-5 py-3">
              <dt className="font-semibold text-charcoal">
                {t.device_type} {t.device_model}
              </dt>
              <dd className="mt-1 text-charcoal/70">
                {(detailsOf(t).selected_services ?? []).map((s) => s.name).join(", ")}
              </dd>
            </div>
          ))}
          {total != null && (
            <div className="flex justify-between gap-4 px-5 py-3">
              <dt className="font-semibold text-charcoal">I alt</dt>
              <dd className="font-semibold text-charcoal">{kr(total)}</dd>
            </div>
          )}
          {store && (
            <div className="flex justify-between gap-4 px-5 py-3">
              <dt className="text-charcoal/60">Butik</dt>
              <dd className="text-right text-charcoal">
                {store.name}
                <span className="block text-charcoal/70">
                  {store.street}, {store.zip} {store.city}
                </span>
              </dd>
            </div>
          )}
        </dl>

        <PaymentCancelledActions
          ticketId={head.id}
          token={token as string}
          storeCity={store?.city ?? null}
          alreadyInStore={found.alreadyInStore}
          canRetry={!!found.sessionId}
          track={{
            store: storeSlug ?? "webshop",
            brand: head.device_type ?? undefined,
            model: head.device_model ?? undefined,
            service:
              tickets.flatMap((t) => (detailsOf(t).selected_services ?? []).map((s) => s.name)).join(", ") || undefined,
            value: total ?? undefined,
          }}
        />

        <p className="mt-8 text-center text-sm text-charcoal/60">
          Brug for hjælp? Ring på {store?.phone ?? "61 10 00 48"}.
        </p>
      </div>
    </div>
  );
}
