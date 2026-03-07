"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type {
  RepairTicket,
  RepairQuote,
  RepairStatusLog,
  RepairStatus,
} from "@/lib/supabase/types";

const STATUS_LABELS: Record<RepairStatus, string> = {
  modtaget: "Modtaget",
  diagnostik: "Diagnostik",
  tilbud_sendt: "Tilbud sendt",
  godkendt: "Godkendt",
  i_gang: "I gang",
  faerdig: "Faerdig",
  afhentet: "Afhentet",
};

const STATUS_COLORS: Record<RepairStatus, string> = {
  modtaget: "bg-blue-100 text-blue-800",
  diagnostik: "bg-indigo-100 text-indigo-800",
  tilbud_sendt: "bg-yellow-100 text-yellow-800",
  godkendt: "bg-green-100 text-green-800",
  i_gang: "bg-orange-100 text-orange-800",
  faerdig: "bg-emerald-100 text-emerald-800",
  afhentet: "bg-gray-100 text-gray-800",
};

const STATUS_PROGRESSION: Record<RepairStatus, RepairStatus | null> = {
  modtaget: "diagnostik",
  diagnostik: null, // Use quote flow
  tilbud_sendt: "godkendt",
  godkendt: "i_gang",
  i_gang: "faerdig",
  faerdig: "afhentet",
  afhentet: null,
};

export default function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [quotes, setQuotes] = useState<RepairQuote[]>([]);
  const [statusLogs, setStatusLogs] = useState<RepairStatusLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Quote form state
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteDays, setQuoteDays] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [quoteSending, setQuoteSending] = useState(false);

  // Status update state
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Internal note state
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  // SMS state
  const [smsMessage, setSmsMessage] = useState("");
  const [smsSending, setSmsSending] = useState(false);

  const supabase = createBrowserClient();

  async function loadData() {
    setLoading(true);

    const ticketRes = await supabase.from("repair_tickets").select("*").eq("id", id).single();
    const quotesRes = await supabase
      .from("repair_quotes")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: false });
    const logsRes = await supabase
      .from("repair_status_log")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: false });

    if (ticketRes.data) setTicket(ticketRes.data as unknown as RepairTicket);
    if (quotesRes.data) setQuotes(quotesRes.data as unknown as RepairQuote[]);
    if (logsRes.data) setStatusLogs(logsRes.data as unknown as RepairStatusLog[]);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSendQuote(e: React.FormEvent) {
    e.preventDefault();
    setQuoteSending(true);

    try {
      const res = await fetch(`/api/repairs/${id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_dkk: Number(quotePrice),
          estimated_days: quoteDays ? Number(quoteDays) : null,
          notes: quoteNotes || null,
        }),
      });

      if (res.ok) {
        setShowQuoteForm(false);
        setQuotePrice("");
        setQuoteDays("");
        setQuoteNotes("");
        await loadData();
      }
    } catch {
      // Silently handle error — user sees no change
    }

    setQuoteSending(false);
  }

  async function handleStatusUpdate() {
    if (!ticket) return;
    const nextStatus = STATUS_PROGRESSION[ticket.status];
    if (!nextStatus) return;

    setStatusUpdating(true);

    try {
      const res = await fetch(`/api/repairs/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch {
      // Silently handle error
    }

    setStatusUpdating(false);
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleAddNote() {
    if (!ticket || !noteText.trim()) return;
    setNoteSaving(true);
    const existingNotes = ticket.internal_notes ?? [];
    const newNotes = [
      ...existingNotes,
      { text: noteText.trim(), author: "Admin", timestamp: new Date().toISOString() },
    ];
    await supabase
      .from("repair_tickets")
      .update({ internal_notes: newNotes, updated_at: new Date().toISOString() })
      .eq("id", id);
    setNoteText("");
    await loadData();
    setNoteSaving(false);
  }

  async function handleSendSms() {
    if (!ticket || !smsMessage.trim()) return;
    setSmsSending(true);
    await fetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_id: id,
        customer_id: ticket.customer_id,
        phone: ticket.customer_phone,
        message: smsMessage.trim(),
      }),
    });
    setSmsMessage("");
    setSmsSending(false);
  }

  if (loading) {
    return <p className="text-gray">Indlaeser sag...</p>;
  }

  if (!ticket) {
    return <p className="text-gray">Sag ikke fundet.</p>;
  }

  const nextStatus = STATUS_PROGRESSION[ticket.status];

  return (
    <div>
      <Link
        href="/admin/reparationer"
        className="mb-6 inline-block text-sm font-medium text-green-eco hover:underline"
      >
        &larr; Tilbage til oversigt
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket info */}
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
              <h2 className="font-display text-xl font-bold text-charcoal">
                Sag: {ticket.id.slice(0, 8)}
              </h2>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[ticket.status]}`}
              >
                {STATUS_LABELS[ticket.status]}
              </span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[2px] text-gray">
                  Kundeoplysninger
                </h3>
                <p className="font-semibold text-charcoal">
                  {ticket.customer_name}
                </p>
                <p className="text-sm text-gray">{ticket.customer_email}</p>
                <p className="text-sm text-gray">{ticket.customer_phone}</p>
              </div>
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[2px] text-gray">
                  Enhed
                </h3>
                <p className="font-semibold text-charcoal">
                  {ticket.device_type} — {ticket.device_model}
                </p>
                <p className="text-sm text-gray">{ticket.service_type}</p>
                <p className="mt-1 text-xs text-gray">
                  Oprettet: {formatDateTime(ticket.created_at)}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[2px] text-gray">
                Problembeskrivelse
              </h3>
              <p className="text-sm leading-relaxed text-charcoal">
                {ticket.issue_description}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-charcoal">
              Handlinger
            </h3>
            <div className="flex flex-wrap gap-3">
              {ticket.status === "modtaget" && (
                <button
                  type="button"
                  onClick={() => setShowQuoteForm(!showQuoteForm)}
                  className="rounded-full bg-green-eco px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {showQuoteForm ? "Annuller" : "Send tilbud"}
                </button>
              )}
              {nextStatus && (
                <button
                  type="button"
                  onClick={handleStatusUpdate}
                  disabled={statusUpdating}
                  className="rounded-full border border-soft-grey px-6 py-2 text-sm font-semibold text-charcoal transition-colors hover:bg-sand disabled:opacity-60"
                >
                  {statusUpdating
                    ? "Opdaterer..."
                    : `Marker som: ${STATUS_LABELS[nextStatus]}`}
                </button>
              )}
            </div>

            {/* Quote form */}
            {showQuoteForm && (
              <form
                onSubmit={handleSendQuote}
                className="mt-6 rounded-xl border border-sand bg-sand/30 p-5"
              >
                <h4 className="mb-4 font-semibold text-charcoal">
                  Opret tilbud
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="quote-price"
                      className="text-sm font-medium text-charcoal"
                    >
                      Pris (DKK) *
                    </label>
                    <input
                      id="quote-price"
                      type="number"
                      required
                      min="1"
                      value={quotePrice}
                      onChange={(e) => setQuotePrice(e.target.value)}
                      placeholder="f.eks. 899"
                      className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="quote-days"
                      className="text-sm font-medium text-charcoal"
                    >
                      Estimerede hverdage
                    </label>
                    <input
                      id="quote-days"
                      type="number"
                      min="1"
                      value={quoteDays}
                      onChange={(e) => setQuoteDays(e.target.value)}
                      placeholder="f.eks. 2"
                      className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <label
                    htmlFor="quote-notes"
                    className="text-sm font-medium text-charcoal"
                  >
                    Noter
                  </label>
                  <textarea
                    id="quote-notes"
                    rows={3}
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder="Evt. noter til kunden..."
                    className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                  />
                </div>
                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={quoteSending}
                    className="rounded-full bg-green-eco px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {quoteSending ? "Sender..." : "Send tilbud til kunde"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quotes list */}
          {quotes.length > 0 && (
            <div className="rounded-2xl border border-soft-grey bg-white p-6">
              <h3 className="mb-4 font-display text-lg font-bold text-charcoal">
                Tilbud
              </h3>
              <div className="space-y-4">
                {quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="rounded-xl border border-sand bg-sand/30 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-lg font-bold text-charcoal">
                        {quote.price_dkk} DKK
                      </p>
                      <span className="text-xs text-gray">
                        {quote.sent_at
                          ? formatDateTime(quote.sent_at)
                          : formatDateTime(quote.created_at)}
                      </span>
                    </div>
                    {quote.estimated_days && (
                      <p className="mt-1 text-sm text-gray">
                        Estimeret: {quote.estimated_days} hverdag
                        {quote.estimated_days > 1 ? "e" : ""}
                      </p>
                    )}
                    {quote.notes && (
                      <p className="mt-1 text-sm text-gray">{quote.notes}</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      {quote.accepted_at && (
                        <span className="text-xs font-semibold text-green-700">
                          Godkendt {formatDateTime(quote.accepted_at)}
                        </span>
                      )}
                      {quote.declined_at && (
                        <span className="text-xs font-semibold text-red-600">
                          Afslaet {formatDateTime(quote.declined_at)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

          {/* Payment status */}
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-charcoal">
              Betaling
            </h3>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  ticket.paid
                    ? "bg-green-100 text-green-800"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {ticket.paid ? "Betalt" : "Ikke betalt"}
              </span>
              {ticket.paid_at && (
                <span className="text-xs text-gray">
                  {formatDateTime(ticket.paid_at)}
                </span>
              )}
            </div>
            {ticket.shopify_draft_order_id && (
              <p className="mt-2 text-xs text-gray">
                Shopify Draft: {ticket.shopify_draft_order_id}
              </p>
            )}
          </div>

          {/* PDF downloads */}
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-charcoal">
              Dokumenter
            </h3>
            <div className="flex flex-wrap gap-3">
              <a
                href={`/api/pdf/intake-receipt/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-charcoal px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Indleveringsbevis
              </a>
              <a
                href={`/api/pdf/workshop-report/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-soft-grey px-5 py-2 text-sm font-semibold text-charcoal transition-colors hover:bg-sand"
              >
                Vaerkstedsrapport
              </a>
            </div>
          </div>

          {/* Intake checklist */}
          {ticket.intake_checklist && (ticket.intake_checklist as unknown[]).length > 0 && (
            <div className="rounded-2xl border border-soft-grey bg-white p-6">
              <h3 className="mb-4 font-display text-lg font-bold text-charcoal">
                Tjekliste
              </h3>
              <div className="space-y-2">
                {(ticket.intake_checklist as { label: string; status: string; note: string }[]).map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <span
                      className={`w-10 text-xs font-bold ${
                        item.status === "fejl"
                          ? "text-red-600"
                          : item.status === "ok"
                            ? "text-green-600"
                            : "text-gray"
                      }`}
                    >
                      {item.status === "ok" ? "OK" : item.status === "fejl" ? "FEJL" : "N/A"}
                    </span>
                    <span className="text-charcoal">{item.label}</span>
                    {item.note && <span className="text-gray">— {item.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Internal notes */}
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-charcoal">
              Interne noter
            </h3>
            {ticket.internal_notes && ticket.internal_notes.length > 0 && (
              <div className="mb-4 space-y-3">
                {ticket.internal_notes.map((note, i) => (
                  <div key={i} className="rounded-lg bg-sand/50 p-3">
                    <p className="text-sm text-charcoal">{note.text}</p>
                    <p className="mt-1 text-xs text-gray">
                      {note.author} · {formatDateTime(note.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Tilfoej note..."
                className="min-w-0 flex-1 rounded-lg border border-soft-grey bg-white px-4 py-2 text-sm text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={noteSaving || !noteText.trim()}
                className="rounded-lg bg-charcoal px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {noteSaving ? "..." : "Tilfoej"}
              </button>
            </div>
          </div>

          {/* SMS */}
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-charcoal">
              Send SMS
            </h3>
            <p className="mb-2 text-sm text-gray">Til: {ticket.customer_phone}</p>
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Skriv besked..."
                className="min-w-0 flex-1 rounded-lg border border-soft-grey bg-white px-4 py-2 text-sm text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSendSms}
                disabled={smsSending || !smsMessage.trim()}
                className="self-end rounded-lg bg-green-eco px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {smsSending ? "Sender..." : "Send"}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar — status history */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-charcoal">
              Statushistorik
            </h3>
            {statusLogs.length === 0 ? (
              <p className="text-sm text-gray">Ingen statusaendringer endnu.</p>
            ) : (
              <div className="relative space-y-0">
                {statusLogs.map((log, i) => (
                  <div key={log.id} className="relative flex gap-3 pb-6">
                    {/* Timeline line */}
                    {i < statusLogs.length - 1 && (
                      <div className="absolute left-[7px] top-4 h-full w-px bg-sand" />
                    )}
                    {/* Timeline dot */}
                    <div className="relative mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-green-eco bg-white" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-charcoal">
                        {log.old_status
                          ? `${STATUS_LABELS[log.old_status as RepairStatus] ?? log.old_status} → ${STATUS_LABELS[log.new_status as RepairStatus] ?? log.new_status}`
                          : STATUS_LABELS[log.new_status as RepairStatus] ??
                            log.new_status}
                      </p>
                      {log.note && (
                        <p className="mt-0.5 text-xs text-gray">{log.note}</p>
                      )}
                      <p className="mt-0.5 text-xs text-gray">
                        {formatDateTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
