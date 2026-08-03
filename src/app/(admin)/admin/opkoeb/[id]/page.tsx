"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ContactInquiry, InquiryMessage } from "@/lib/supabase/types";
import type { TradeInOffer, TradeInOfferStatus, TradeInReceipt } from "@/lib/supabase/trade-in-types";
import { formatDKK } from "@/lib/supabase/trade-in-types";
import { DECLINE_REASONS } from "@/lib/buyback/decline-reasons";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import { readLeadDevices, deviceLabel } from "@/lib/buyback/lead-devices";
import { trackingUrlFor } from "@/lib/shipmondo/carriers";

/** What GET /api/trade-in/suggest answers with. */
interface LeadSuggestionResponse {
  status: "ok" | "manual";
  manualReason: string | null;
  suggestDecline: boolean;
  totalAimKr: number;
  totalFloorKr: number;
  devices: { label: string; explanation: string; manualReason: string | null; aimKr: number }[];
}

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

  // Shipping
  const [shippingLabel, setShippingLabel] = useState<Record<string, unknown> | null>(null);
  const [labelLoading, setLabelLoading] = useState(false);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [labelOpening, setLabelOpening] = useState(false);

  // Price suggestion from the engine
  const [suggestion, setSuggestion] = useState<LeadSuggestionResponse | null>(null);
  // Set once the admin has touched the amount, so a late suggestion never
  // overwrites something they typed.
  const [amountTouched, setAmountTouched] = useState(false);

  // Decline
  const [declines, setDeclines] = useState<{ id: string }[]>([]);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineError, setDeclineError] = useState("");

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

  async function loadDeclines() {
    const { data } = await supabase
      .from("buyback_declines")
      .select("id")
      .eq("inquiry_id", inquiryId);
    setDeclines((data as { id: string }[]) ?? []);
  }

  async function loadSuggestion() {
    try {
      const res = await staffFetch(`/api/trade-in/suggest?inquiry_id=${inquiryId}`);
      if (res.ok) setSuggestion(await res.json());
    } catch {
      // A missing suggestion just means admin prices it by hand, as before.
    }
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

  async function loadShippingLabel(offerId: string) {
    const { data } = await supabase
      .from("shipping_labels")
      .select("*")
      .eq("offer_id", offerId)
      .single();
    setShippingLabel(data ?? null);
  }

  async function loadAll() {
    setLoading(true);
    await Promise.all([
      loadInquiry(),
      loadOffers(),
      loadReceipts(),
      loadMessages(),
      loadDeclines(),
      loadSuggestion(),
    ]);
    // Load shipping label for accepted offer if present
    // We load offers first, then check — but since loadOffers sets state async,
    // we need to fetch separately here:
    const { data: offersData } = await supabase
      .from("trade_in_offers")
      .select("*")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: false });
    const accepted = (offersData as any[])?.find((o) => o.status === "accepted");
    if (accepted) await loadShippingLabel(accepted.id);
    setLoading(false);
  }

  useEffect(() => {
    if (inquiryId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId]);

  // Prefill the amount with what the engine suggests, but never over something
  // the admin has already typed.
  useEffect(() => {
    if (!amountTouched && suggestion?.status === "ok" && suggestion.totalAimKr > 0) {
      setOfferAmount(String(suggestion.totalAimKr));
    }
  }, [suggestion, amountTouched]);

  const isDeclined = declines.length > 0;
  const hasAccepted = offers.some((o) => o.status === "accepted");
  const canDecline = !isDeclined && !hasAccepted && receipts.length === 0;

  /* ---- Decline ---- */

  async function handleDecline(reasonCode: string) {
    setDeclining(true);
    setDeclineError("");
    try {
      const res = await staffFetch("/api/trade-in/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry_id: inquiryId, reason_code: reasonCode, declined_by: "Admin" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeclineError(data.error || "Kunne ikke afvise");
      } else {
        setDeclineOpen(false);
        await Promise.all([loadDeclines(), loadInquiry(), loadMessages()]);
      }
    } catch {
      setDeclineError("Kunne ikke afvise — prøv igen");
    }
    setDeclining(false);
  }

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
      const res = await staffFetch("/api/trade-in/offers", {
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

  /**
   * The device is physically in our hands. Kept apart from the carrier's
   * "delivered": a parcel can be handed over and still sit unopened, and a
   * device brought into the store never has a tracking status at all.
   */
  async function handleMarkReceived() {
    setReceiveLoading(true);
    try {
      const res = await staffFetch(`/api/trade-in/${inquiryId}/receive`, { method: "POST" });
      if (res.ok) await loadAll();
    } catch {
      // The button stays available; nothing is lost by trying again.
    }
    setReceiveLoading(false);
  }

  /**
   * Signed storage links expire, so the stored one is usually dead. A fresh one
   * is minted per click.
   */
  async function handleOpenLabel(offerId: string) {
    setLabelOpening(true);
    try {
      const res = await staffFetch(`/api/trade-in/${offerId}/label`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) window.open(data.url, "_blank", "noopener");
      else alert(data.error || "Kunne ikke hente label");
    } catch {
      alert("Kunne ikke hente label");
    }
    setLabelOpening(false);
  }

  async function handleCreateShipment(offerId: string) {
    setLabelLoading(true);
    try {
      const res = await staffFetch(`/api/trade-in/${offerId}/create-shipment`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await loadShippingLabel(offerId);
      } else {
        alert(data.error || "Fejl ved oprettelse af forsendelse");
      }
    } finally {
      setLabelLoading(false);
    }
  }

  async function handleSendAcceptance(offerId: string) {
    const res = await staffFetch(`/api/trade-in/${offerId}/send-acceptance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      alert("Accepterings-email sendt!");
    } else {
      const data = await res.json().catch(() => ({ error: "Ukendt fejl" }));
      alert(data.error || "Fejl ved afsendelse af email");
    }
  }

  /* ---- Extract metadata ---- */

  const meta = (inquiry?.metadata ?? {}) as Record<string, unknown>;
  // Through readLeadDevices: metadata.device is the old flat shape, and the
  // current wizard writes `devices: []`, so reading the old one showed an empty
  // card on every lead — you could not see which phone the customer was selling.
  const leadDevices = readLeadDevices(inquiry?.metadata);
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
            {leadDevices.length > 0 && (
              <p className="mt-0.5 text-sm font-semibold text-charcoal/70">
                {leadDevices.map((e) => deviceLabel(e.device)).join(" · ")}
              </p>
            )}
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
          {leadDevices.length === 0 && (
            <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
              <p className="text-sm text-stone-400">Ingen enhedsdata på henvendelsen.</p>
            </div>
          )}

          {leadDevices.map((entry, i) => (
            <div key={i} className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="font-display text-base font-bold text-charcoal">
                  {deviceLabel(entry.device)}
                </h3>
                {leadDevices.length > 1 && (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                    Enhed {i + 1} af {leadDevices.length}
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Enhedstype" value={entry.device.deviceType} />
                <InfoRow label="Mærke" value={entry.device.brand || entry.device.brandCustom} />
                <InfoRow label="Model" value={entry.device.model || entry.device.modelCustom} />
                <InfoRow label="Lagerplads" value={entry.device.storage} />
                <InfoRow label="RAM" value={entry.device.ram} />
              </div>

              <div className="mt-4 border-t border-stone-200/60 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Tilstand
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Skærm" value={entry.condition.screen} />
                  <InfoRow label="Bagside" value={entry.condition.back} />
                  <InfoRow label="Batteri" value={entry.condition.battery} />
                  <InfoRow label="Alt virker" value={entry.condition.allWorking} />
                  <InfoRow
                    label="Defekte dele"
                    value={entry.condition.brokenParts.join(", ")}
                  />
                  <InfoRow label="iCloud-låst" value={entry.condition.cloudLocked} />
                </div>
              </div>
            </div>
          ))}

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
                  onChange={(e) => {
                    setAmountTouched(true);
                    setOfferAmount(e.target.value);
                  }}
                  placeholder="F.eks. 2500"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-charcoal placeholder:text-stone-400 transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
                />

                {/* Why the number is what it is — admin should never have to guess */}
                {suggestion?.status === "ok" && (
                  <div className="mt-2 rounded-xl bg-stone-50 px-3 py-2.5">
                    {suggestion.devices.map((d) => (
                      <p key={d.label} className="text-[12px] leading-relaxed text-stone-500">
                        <span className="font-medium text-stone-700">{d.label}:</span> {d.explanation}
                      </p>
                    ))}
                    <p className="mt-1.5 text-[12px] text-stone-400">
                      Forhandlingsgulv: {suggestion.totalFloorKr.toLocaleString("da-DK")} kr
                    </p>
                  </div>
                )}
                {suggestion?.status === "manual" && (
                  <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-700">
                    Kan ikke prissættes automatisk: {suggestion.manualReason}
                  </p>
                )}
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

          {/* Decline — a real answer costs less than silence */}
          {(canDecline || isDeclined) && (
            <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Afvis
              </h3>

              {isDeclined ? (
                <p className="text-sm text-stone-500">
                  Leadet er afvist, og kunden har fået besked.
                </p>
              ) : !declineOpen ? (
                <>
                  <p className="mb-3 text-sm text-stone-500">
                    Sender en dansk email med begrundelsen og lukker henvendelsen.
                  </p>
                  {suggestion?.suggestDecline && (
                    <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2.5 text-[12px] text-amber-700">
                      Enheden er iCloud-låst — den kan vi ikke købe.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeclineOpen(true)}
                    className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:border-rose-300 hover:text-rose-600"
                  >
                    Afvis lead
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-3 text-sm text-stone-500">Vælg en årsag — kunden får den at vide:</p>
                  <div className="space-y-2">
                    {DECLINE_REASONS.map((reason) => (
                      <button
                        key={reason.code}
                        type="button"
                        disabled={declining}
                        onClick={() => handleDecline(reason.code)}
                        className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition-colors disabled:opacity-50 ${
                          suggestion?.suggestDecline && reason.code === "icloud_laast"
                            ? "border-amber-300 bg-amber-50 font-semibold text-amber-800"
                            : "border-stone-200 text-stone-600 hover:border-rose-300 hover:text-rose-600"
                        }`}
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>
                  {declineError && (
                    <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                      {declineError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeclineOpen(false)}
                    className="mt-3 text-[13px] text-stone-400 underline"
                  >
                    Fortryd
                  </button>
                </>
              )}
            </div>
          )}

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

          {/* Shipping label */}
          {hasAcceptedOffer && (() => {
            const acceptedOffer = offers.find((o) => o.status === "accepted");
            if (!acceptedOffer) return null;
            return (
              <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Forsendelse
                </h3>
                {shippingLabel ? (
                  <div className="space-y-3">
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-stone-400">Status</span>
                        <span className="font-medium text-charcoal capitalize">
                          {String(shippingLabel.status).replace(/_/g, " ")}
                        </span>
                      </div>
                      {Boolean(shippingLabel.tracking_number) && (
                        <div className="flex justify-between">
                          <span className="text-stone-400">Tracking</span>
                          <a
                            href={trackingUrlFor("pdk", String(shippingLabel.tracking_number))}
                            target="_blank"
                            rel="noopener"
                            className="font-medium text-green-eco hover:underline"
                          >
                            {String(shippingLabel.tracking_number)}
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => handleOpenLabel(acceptedOffer.id)}
                        disabled={labelOpening}
                        className="inline-flex items-center gap-1.5 rounded-full bg-green-eco px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {labelOpening ? "Henter..." : "Åbn label (PDF)"}
                      </button>
                      <button
                        onClick={() => handleSendAcceptance(acceptedOffer.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-charcoal transition-colors hover:bg-stone-50"
                      >
                        Send accepterings-email
                      </button>
                    </div>
                    {Boolean(shippingLabel.delivered_at) && (
                      <p className="text-[12px] text-stone-400">
                        Leveret {new Date(String(shippingLabel.delivered_at)).toLocaleString("da-DK")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-stone-400">Ingen forsendelsesmaerkat endnu.</p>
                    <button
                      onClick={() => handleCreateShipment(acceptedOffer.id)}
                      disabled={labelLoading}
                      className="inline-flex items-center gap-1.5 rounded-full bg-green-eco px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {labelLoading ? "Opretter..." : "Generer e-label (Shipmondo)"}
                    </button>
                  </div>
                )}

                {/* Ours, not the carrier's: a delivered parcel can still be
                    unopened, and a device handed in at the store never has a
                    label at all. */}
                <div className="mt-4 border-t border-stone-200/60 pt-4">
                  {acceptedOffer.received_at ? (
                    <p className="text-sm text-charcoal">
                      <span className="font-semibold text-violet-700">Modtaget</span>{" "}
                      <span className="text-stone-400">
                        {new Date(acceptedOffer.received_at).toLocaleString("da-DK")}
                        {acceptedOffer.received_by ? ` af ${acceptedOffer.received_by}` : ""}
                      </span>
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => handleMarkReceived()}
                        disabled={receiveLoading}
                        className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {receiveLoading ? "Markerer..." : "Marker som modtaget"}
                      </button>
                      <span className="text-[12px] text-stone-400">
                        Tryk når enheden fysisk er i hånden
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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
