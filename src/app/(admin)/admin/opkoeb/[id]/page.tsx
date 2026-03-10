"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ContactInquiry, InquiryMessage } from "@/lib/supabase/types";
import type { TradeInOffer, TradeInOfferStatus, TradeInReceipt } from "@/lib/supabase/trade-in-types";
import { formatDKK } from "@/lib/supabase/trade-in-types";

/* ------------------------------------------------------------------ */
/*  Offer status badges                                                */
/* ------------------------------------------------------------------ */

const OFFER_STATUS_CONFIG: Record<TradeInOfferStatus, { label: string; color: string }> = {
  pending: { label: "Afventer", color: "bg-yellow-100 text-yellow-700" },
  accepted: { label: "Accepteret", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Afvist", color: "bg-red-100 text-red-700" },
  expired: { label: "Udloebet", color: "bg-stone-100 text-stone-500" },
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  form: "Formular",
};

const CHANNEL_COLORS: Record<string, string> = {
  email: "bg-blue-50 text-blue-600",
  sms: "bg-purple-50 text-purple-600",
  form: "bg-stone-100 text-stone-500",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminOpkoebDetailPage() {
  const params = useParams();
  const inquiryId = params.id as string;
  const supabase = useMemo(() => createBrowserClient(), []);

  const [inquiry, setInquiry] = useState<ContactInquiry | null>(null);
  const [offers, setOffers] = useState<TradeInOffer[]>([]);
  const [receipts, setReceipts] = useState<TradeInReceipt[]>([]);
  const [messages, setMessages] = useState<InquiryMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Send offer form
  const [offerAmount, setOfferAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);
  const [offerError, setOfferError] = useState("");
  const [offerSuccess, setOfferSuccess] = useState("");

  // Reply form
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  /* ---- Data fetching ---- */

  async function loadInquiry() {
    const { data } = await supabase
      .from("contact_inquiries")
      .select("*")
      .eq("id", inquiryId)
      .single();
    if (data) setInquiry(data as ContactInquiry);
  }

  async function loadOffers() {
    const { data } = await supabase
      .from("trade_in_offers")
      .select("*")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: false });
    setOffers((data as TradeInOffer[]) ?? []);
  }

  async function loadReceipts() {
    const { data } = await supabase
      .from("trade_in_receipts")
      .select("*")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: false });
    setReceipts((data as TradeInReceipt[]) ?? []);
  }

  async function loadMessages() {
    try {
      const res = await fetch(`/api/contact/${inquiryId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      // Silently handle
    }
  }

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadInquiry(), loadOffers(), loadReceipts(), loadMessages()]);
    setLoading(false);
  }

  useEffect(() => {
    if (inquiryId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId]);

  /* ---- Send offer ---- */

  async function handleSendOffer(e: React.FormEvent) {
    e.preventDefault();
    setOfferError("");
    setOfferSuccess("");

    const amountKr = parseFloat(offerAmount);
    if (!amountKr || amountKr <= 0) {
      setOfferError("Indtast et gyldigt beloeb i kr.");
      return;
    }

    setSendingOffer(true);
    try {
      const res = await fetch("/api/trade-in/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiry_id: inquiryId,
          offer_amount: Math.round(amountKr * 100), // convert kr to oere
          admin_note: adminNote.trim() || null,
          created_by: null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ukendt fejl" }));
        setOfferError(err.error ?? "Kunne ikke sende tilbud");
      } else {
        setOfferSuccess("Tilbud sendt!");
        setOfferAmount("");
        setAdminNote("");
        await loadOffers();
      }
    } catch {
      setOfferError("Netvaerksfejl");
    }
    setSendingOffer(false);
  }

  /* ---- Reply ---- */

  async function handleReply(channel: "email" | "sms") {
    if (!replyText.trim()) return;
    setReplySending(true);
    try {
      const res = await fetch(`/api/contact/${inquiryId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: replyText.trim(),
          channel,
          staff_name: "Admin",
        }),
      });
      if (res.ok) {
        setReplyText("");
        await loadMessages();
      }
    } catch {
      // Silently handle
    }
    setReplySending(false);
  }

  /* ---- Extract metadata ---- */

  const meta = (inquiry?.metadata ?? {}) as Record<string, unknown>;
  const device = (meta.device ?? {}) as Record<string, unknown>;
  const condition = (meta.condition ?? {}) as Record<string, unknown>;
  const deliveryMethod = (meta.deliveryMethod ?? meta.delivery_method ?? null) as string | null;
  const preferredStore = (meta.preferredStore ?? meta.preferred_store ?? null) as string | null;

  const hasAcceptedOffer = offers.some((o) => o.status === "accepted");

  /* ---- Loading / not found ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-green-eco" />
          <p className="text-sm text-stone-400">Indlaeser...</p>
        </div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="py-20 text-center">
        <p className="text-stone-400">Henvendelse ikke fundet.</p>
        <Link href="/admin/opkoeb" className="mt-4 inline-block text-sm text-green-eco hover:underline">
          Tilbage til opkoeb
        </Link>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin/opkoeb"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-charcoal"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Tilbage til opkoeb
      </Link>

      {/* Header */}
      <div className="mb-6 rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-charcoal">
              {inquiry.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-stone-400">
              <span>{inquiry.email}</span>
              {inquiry.phone && <span>Tel: {inquiry.phone}</span>}
              <span>{formatDate(inquiry.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- Left column: Device info ---- */}
        <div className="space-y-6">
          {/* Device info card */}
          <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Enhedsoplysninger
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Enhedstype" value={device.deviceType as string} />
              <InfoRow label="Maerke" value={device.brand as string} />
              <InfoRow label="Model" value={device.model as string} />
              <InfoRow label="Lagerplads" value={device.storage as string} />
              <InfoRow label="RAM" value={device.ram as string} />
            </div>
          </div>

          {/* Condition card */}
          <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Tilstand
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Skaerm" value={condition.screen as string} />
              <InfoRow label="Bagside" value={condition.back as string} />
              <InfoRow label="Batteri" value={condition.battery as string} />
              <InfoRow
                label="Alt virker"
                value={condition.allWorking === true ? "Ja" : condition.allWorking === false ? "Nej" : undefined}
              />
              <InfoRow label="Defekte dele" value={condition.brokenParts as string} />
              <InfoRow
                label="Cloud-laast"
                value={condition.cloudLocked === true ? "Ja" : condition.cloudLocked === false ? "Nej" : undefined}
              />
            </div>
          </div>

          {/* Delivery */}
          <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Levering
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow
                label="Leveringsmetode"
                value={deliveryMethod === "shipping" ? "Forsendelse" : deliveryMethod === "in_store" ? "I butik" : deliveryMethod}
              />
              <InfoRow label="Foretrukken butik" value={preferredStore} />
            </div>
          </div>
        </div>

        {/* ---- Right column: Actions ---- */}
        <div className="space-y-6">
          {/* Send offer */}
          <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Send tilbud
            </h3>
            <form onSubmit={handleSendOffer} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal">
                  Beloeb (kr)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="F.eks. 2500"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-charcoal placeholder:text-stone-400 transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal">
                  Admin note (valgfri)
                </label>
                <textarea
                  rows={2}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Intern note..."
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-charcoal placeholder:text-stone-400 transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
                />
              </div>
              {offerError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {offerError}
                </div>
              )}
              {offerSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-600">
                  {offerSuccess}
                </div>
              )}
              <button
                type="submit"
                disabled={sendingOffer}
                className="rounded-full bg-green-eco px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {sendingOffer ? "Sender..." : "Send tilbud"}
              </button>
            </form>
          </div>

          {/* Offer history */}
          <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Tilbudshistorik
            </h3>
            {offers.length === 0 ? (
              <p className="text-sm text-stone-400">Ingen tilbud endnu.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 text-xs font-semibold uppercase tracking-wide text-stone-400">
                      <th className="pb-2 pr-3">Beloeb</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Dato</th>
                      <th className="pb-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((offer) => {
                      const cfg = OFFER_STATUS_CONFIG[offer.status];
                      return (
                        <tr key={offer.id} className="border-b border-stone-50">
                          <td className="py-2.5 pr-3 font-medium text-charcoal">
                            {formatDKK(offer.offer_amount)}
                          </td>
                          <td className="py-2.5 pr-3">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-stone-400">
                            {formatDate(offer.created_at)}
                          </td>
                          <td className="py-2.5 text-stone-400">
                            {offer.admin_note ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Opret slutseddel button */}
          {hasAcceptedOffer && (
            <Link
              href={`/admin/opkoeb/${inquiryId}/slutseddel`}
              className="flex items-center justify-center gap-2 rounded-xl bg-green-eco px-6 py-3 text-sm font-bold tracking-wide text-white shadow-md shadow-green-eco/20 transition-all hover:brightness-110 hover:shadow-lg hover:shadow-green-eco/25"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Opret slutseddel
            </Link>
          )}

          {/* Receipt status (if exists) */}
          {receipts.length > 0 && (
            <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Slutsedler
              </h3>
              {receipts.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-3">
                  <div>
                    <span className="text-sm font-medium text-charcoal">{r.receipt_number}</span>
                    <span className="ml-2 text-xs text-stone-400">{formatDKK(r.total_amount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      r.status === "paid" ? "bg-emerald-100 text-emerald-700"
                      : r.status === "confirmed" ? "bg-blue-100 text-blue-700"
                      : r.status === "completed" ? "bg-green-100 text-green-700"
                      : "bg-stone-100 text-stone-500"
                    }`}>
                      {r.status === "draft" ? "Kladde" : r.status === "confirmed" ? "Bekraeftet" : r.status === "paid" ? "Betalt" : "Faerdig"}
                    </span>
                    <Link
                      href={`/admin/opkoeb/${inquiryId}/slutseddel`}
                      className="text-xs text-green-eco hover:underline"
                    >
                      Abn
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- Message thread ---- */}
      <div className="mt-6 rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
          Samtale
        </h3>

        {/* Original message */}
        <div className="mb-3 flex justify-start">
          <div className="max-w-[80%] rounded-xl bg-amber-50/60 px-4 py-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-semibold text-charcoal">{inquiry.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CHANNEL_COLORS.form}`}>
                {CHANNEL_LABELS.form}
              </span>
              <span className="text-[10px] text-stone-400">{formatDate(inquiry.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-charcoal">{inquiry.message}</p>
          </div>
        </div>

        {/* Subsequent messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-3 flex ${msg.sender === "staff" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.sender === "staff" ? "bg-green-eco/5" : "bg-amber-50/60"
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-semibold text-charcoal">
                  {msg.sender === "staff" ? (msg.staff_name ?? "Personale") : inquiry.name}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CHANNEL_COLORS[msg.channel] ?? CHANNEL_COLORS.email}`}>
                  {CHANNEL_LABELS[msg.channel] ?? msg.channel}
                </span>
                <span className="text-[10px] text-stone-400">{formatDate(msg.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-charcoal">{msg.body}</p>
            </div>
          </div>
        ))}

        {/* Reply box */}
        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/30 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Svar
          </p>
          <textarea
            rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Skriv svar..."
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-charcoal placeholder:text-stone-400 focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleReply("email")}
              disabled={replySending || !replyText.trim()}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {replySending ? "Sender..." : "Send som email"}
            </button>
            <button
              type="button"
              onClick={() => handleReply("sms")}
              disabled={replySending || !replyText.trim() || !inquiry.phone}
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {replySending ? "Sender..." : "Send som SMS"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Info row helper                                                    */
/* ------------------------------------------------------------------ */

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-400">{label}</p>
      <p className="mt-0.5 text-sm text-charcoal">{value || "-"}</p>
    </div>
  );
}
