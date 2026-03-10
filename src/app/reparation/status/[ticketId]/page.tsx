import type { Metadata } from "next";
import Link from "next/link";
import { STORES } from "@/lib/store-config";

export const metadata: Metadata = {
  title: "Reparationsstatus | PhoneSpot",
  robots: { index: false, follow: false },
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StatusLogEntry {
  id: string;
  status: string;
  created_at: string;
  note: string | null;
}

interface Comment {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
}

interface TicketData {
  ticket: {
    id: string;
    device_model: string;
    device_type: string;
    status: string;
    ticket_number: string;
    store_location_id: string | null;
    created_at: string;
  };
  comments: Comment[];
  status_log: StatusLogEntry[];
}

/* ------------------------------------------------------------------ */
/*  Status pipeline                                                    */
/* ------------------------------------------------------------------ */

const STATUS_STEPS = [
  { key: "modtaget", label: "Modtaget" },
  { key: "diagnostik", label: "Diagnostik" },
  { key: "tilbud_sendt", label: "Tilbud sendt" },
  { key: "godkendt", label: "Godkendt" },
  { key: "i_gang", label: "I gang" },
  { key: "faerdig", label: "Færdig" },
  { key: "afhentet", label: "Afhentet" },
];

/* ------------------------------------------------------------------ */
/*  Data fetching                                                      */
/* ------------------------------------------------------------------ */

async function fetchTicket(ticketId: string): Promise<TicketData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://phonespot.dk";
  try {
    const res = await fetch(`${baseUrl}/api/repairs/${ticketId}/public`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function RepairStatusPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const data = await fetchTicket(ticketId);

  if (!data) {
    return (
      <div className="min-h-screen bg-warm-white">
        {/* Simplified header */}
        <header className="border-b border-sand bg-warm-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-center px-4">
            <Link href="/">
              <img
                src="/brand/logos/phonespot-wordmark-dark.svg"
                alt="PhoneSpot"
                width={140}
                height={32}
              />
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-charcoal">
            Reparation ikke fundet
          </h1>
          <p className="mt-3 text-gray">
            Vi kunne ikke finde en reparation med dette ID. Tjek venligst linket og prøv igen.
          </p>
          <Link
            href="/kontakt"
            className="mt-8 inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Kontakt os
          </Link>
        </div>
      </div>
    );
  }

  const { ticket, comments, status_log } = data;

  // Determine completed statuses from the log
  const completedStatuses = new Set(status_log.map((entry) => entry.status));
  const currentStatusIndex = STATUS_STEPS.findIndex(
    (s) => s.key === ticket.status,
  );

  // Find timestamp for each status
  const statusTimestamps: Record<string, string> = {};
  for (const entry of status_log) {
    statusTimestamps[entry.status] = entry.created_at;
  }

  // Find store info
  const store = ticket.store_location_id
    ? Object.values(STORES).find(
        (s) => s.shopifyLocationId === ticket.store_location_id,
      )
    : Object.values(STORES)[0];

  return (
    <div className="min-h-screen bg-warm-white">
      {/* Simplified header */}
      <header className="border-b border-sand bg-warm-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-center px-4">
          <Link href="/">
            <img
              src="/brand/logos/phonespot-wordmark-dark.svg"
              alt="PhoneSpot"
              width={140}
              height={32}
            />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Page title */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-charcoal md:text-4xl">
            Reparationsstatus
          </h1>
          <p className="mt-2 text-gray">
            Sags-ID:{" "}
            <span className="font-mono font-bold text-charcoal">
              {ticket.ticket_number || ticket.id.slice(0, 8)}
            </span>
          </p>
        </div>

        {/* Device card */}
        <div className="mb-8 rounded-2xl border border-soft-grey bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-eco/10 text-green-eco">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <div>
              <p className="font-display text-lg font-bold text-charcoal">
                {ticket.device_type} {ticket.device_model}
              </p>
              <p className="text-sm text-gray">
                Modtaget {formatDate(ticket.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Status timeline */}
        <div className="mb-8 rounded-2xl border border-soft-grey bg-white p-6 shadow-sm">
          <h2 className="mb-6 font-display text-lg font-bold text-charcoal">
            Status
          </h2>
          <div className="relative ml-4">
            {STATUS_STEPS.map((statusStep, i) => {
              const isCompleted =
                completedStatuses.has(statusStep.key) || i < currentStatusIndex;
              const isCurrent = i === currentStatusIndex;
              const isFuture = i > currentStatusIndex;
              const timestamp = statusTimestamps[statusStep.key];

              return (
                <div key={statusStep.key} className="relative flex pb-8 last:pb-0">
                  {/* Vertical line */}
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`absolute left-[7px] top-5 h-full w-0.5 ${
                        isCompleted || isCurrent
                          ? "bg-green-eco"
                          : "bg-soft-grey"
                      }`}
                    />
                  )}

                  {/* Dot */}
                  <div className="relative z-10 mr-4 mt-0.5 flex-shrink-0">
                    {isCompleted && !isCurrent ? (
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-eco">
                        <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5 text-white">
                          <path d="M10.28 2.28a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 0 1-1.06 0L1.72 6.34a.75.75 0 1 1 1.06-1.06L4.75 7.25l4.72-4.72a.75.75 0 0 1 1.06 0h-.25Z" />
                        </svg>
                      </div>
                    ) : isCurrent ? (
                      <div className="relative flex h-4 w-4 items-center justify-center">
                        <div className="absolute h-4 w-4 animate-ping rounded-full bg-green-eco/40" />
                        <div className="h-4 w-4 rounded-full bg-green-eco shadow-md shadow-green-eco/30" />
                      </div>
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-soft-grey bg-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-bold ${
                        isFuture ? "text-gray" : "text-charcoal"
                      }`}
                    >
                      {statusStep.label}
                      {isCurrent && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-green-eco/10 px-2 py-0.5 text-xs font-bold text-green-eco">
                          Nuværende
                        </span>
                      )}
                    </p>
                    {timestamp && (
                      <p className="mt-0.5 text-xs text-gray">
                        {formatDateTime(timestamp)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estimated completion */}
        <div className="mb-8 rounded-2xl border border-green-eco/20 bg-green-eco/5 p-6">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-green-eco">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-sm text-charcoal">
              <span className="font-bold">Forventet færdiggørelse:</span>{" "}
              Vi bestræber os på at have din enhed klar inden for 1-3 hverdage efter godkendelse.
            </p>
          </div>
        </div>

        {/* Comments */}
        {comments.length > 0 && (
          <div className="mb-8 rounded-2xl border border-soft-grey bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-display text-lg font-bold text-charcoal">
              Beskeder
            </h2>
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl bg-sand/30 p-4"
                >
                  <p className="text-sm text-charcoal">{comment.content}</p>
                  <p className="mt-2 text-xs text-gray">
                    {comment.author_name} &middot;{" "}
                    {formatDateTime(comment.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact section */}
        <div className="rounded-2xl border border-soft-grey bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-bold text-charcoal">
            Har du spørgsmål?
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
            {store && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-green-eco/10 text-green-eco">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-charcoal">Telefon</p>
                    <a
                      href={`tel:${store.phone.replace(/\s/g, "")}`}
                      className="text-sm text-green-eco hover:underline"
                    >
                      {store.phone}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-green-eco/10 text-green-eco">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-charcoal">Email</p>
                    <a
                      href={`mailto:${store.email}`}
                      className="text-sm text-green-eco hover:underline"
                    >
                      {store.email}
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
          {store && (
            <div className="mt-4 rounded-lg bg-green-pale p-4">
              <p className="text-sm text-charcoal">
                <span className="font-semibold">{store.name}</span>
                {" "}&middot;{" "}
                {store.street}, {store.zip} {store.city}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
