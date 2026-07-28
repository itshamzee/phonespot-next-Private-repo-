"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ContactInquiry } from "@/lib/supabase/types";
import { deriveTradeInStatus } from "@/lib/supabase/trade-in-types";
import { readLeadDevices, deviceLabel, type LeadDevice } from "@/lib/buyback/lead-devices";
import { DECLINE_REASONS } from "@/lib/buyback/decline-reasons";
import { staffFetch } from "@/lib/buyback/admin-fetch";

/**
 * Queue mode: one lead at a time, driven from the keyboard.
 *
 *   Enter  send the offer with the amount shown
 *   A      open the decline reasons
 *   1-6    pick a reason while the list is open
 *   Esc    close the list, or leave the queue
 *
 * The queue is loaded once and does not reshuffle under you while you work.
 * Each lead is rendered as a keyed LeadCard, so moving on resets its state by
 * remounting rather than by clearing half a dozen useStates.
 */

interface QueueLead {
  inquiry: ContactInquiry;
  devices: LeadDevice[];
}

interface SuggestionResponse {
  status: "ok" | "manual";
  manualReason: string | null;
  suggestDecline: boolean;
  totalAimKr: number;
  totalFloorKr: number;
  devices: { label: string; explanation: string; manualReason: string | null; aimKr: number }[];
}

/* Green for good, amber for wear, rose for damage. */
function conditionTone(value: string): string {
  const v = value.trim().toLowerCase();
  if (!v) return "bg-stone-100 text-stone-500";
  if (["perfekt", "god (80%+)", "ja", "nej"].includes(v)) return "bg-emerald-50 text-emerald-700";
  if (["små ridser", "ridser", "buler/ridser", "okay (60-80%)", "ved ikke"].includes(v)) {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-rose-50 text-rose-700";
}

function Chip({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] ${conditionTone(value)}`}>
      <span className="opacity-60">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  One lead                                                           */
/* ------------------------------------------------------------------ */

function LeadCard({
  lead,
  position,
  total,
  onDone,
}: {
  lead: QueueLead;
  position: number;
  total: number;
  onDone: () => void;
}) {
  const router = useRouter();

  const [suggestion, setSuggestion] = useState<SuggestionResponse | null>(null);
  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const inquiryId = lead.inquiry.id;

  useEffect(() => {
    let cancelled = false;

    async function fetchSuggestion() {
      try {
        const res = await staffFetch(`/api/trade-in/suggest?inquiry_id=${inquiryId}`);
        if (!res.ok || cancelled) return;
        const data: SuggestionResponse = await res.json();
        if (cancelled) return;
        setSuggestion(data);
        if (data.status === "ok" && data.totalAimKr > 0) setAmount(String(data.totalAimKr));
      } catch {
        // No suggestion just means the amount gets typed by hand.
      }
    }

    const timer = setTimeout(fetchSuggestion, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inquiryId]);

  const sendOffer = useCallback(async () => {
    if (working) return;
    const kr = parseFloat(amount);
    if (!kr || kr <= 0) {
      setError("Indtast et beløb først");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/trade-in/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiry_id: inquiryId,
          offer_amount: Math.round(kr * 100),
          created_by: "Admin",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Kunne ikke sende tilbud");
        setWorking(false);
      } else {
        onDone();
      }
    } catch {
      setError("Kunne ikke sende tilbud — prøv igen");
      setWorking(false);
    }
  }, [amount, working, inquiryId, onDone]);

  const decline = useCallback(
    async (reasonCode: string) => {
      if (working) return;
      setWorking(true);
      setError("");
      try {
        const res = await staffFetch("/api/trade-in/decline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inquiry_id: inquiryId, reason_code: reasonCode, declined_by: "Admin" }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Kunne ikke afvise");
          setWorking(false);
        } else {
          onDone();
        }
      } catch {
        setError("Kunne ikke afvise — prøv igen");
        setWorking(false);
      }
    },
    [working, inquiryId, onDone],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if (e.key === "Enter") {
        // Enter works everywhere, including from inside the amount field.
        e.preventDefault();
        if (!declineOpen) void sendOffer();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (declineOpen) setDeclineOpen(false);
        else router.push("/admin/opkoeb");
        return;
      }
      if (inField) return; // the shortcuts below must not fire while typing

      if (e.key.toLowerCase() === "a") {
        e.preventDefault();
        setDeclineOpen(true);
        return;
      }
      if (declineOpen && /^[1-6]$/.test(e.key)) {
        e.preventDefault();
        const reason = DECLINE_REASONS[Number(e.key) - 1];
        if (reason) void decline(reason.code);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [declineOpen, sendOffer, decline, router]);

  const meta = (lead.inquiry.metadata || {}) as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal">Kø</h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            {position} af {total}
          </p>
        </div>
        <Link href="/admin/opkoeb" className="text-[13px] text-charcoal/40 underline">
          Forlad kø (Esc)
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
        {/* Customer */}
        <div className="border-b border-black/[0.03] px-6 py-4">
          <p className="text-sm font-semibold text-charcoal">{lead.inquiry.name}</p>
          <p className="mt-0.5 text-xs text-charcoal/35">
            {lead.inquiry.email}
            {typeof meta.preferredStore === "string" && ` · ${meta.preferredStore}`}
            {meta.deliveryMethod === "Aflever i butik" ? " · Butik" : " · Forsendelse"}
          </p>
        </div>

        {/* Devices + condition at a glance */}
        <div className="space-y-4 px-6 py-5">
          {lead.devices.map((entry, i) => (
            <div key={i}>
              <p className="mb-2 text-sm font-semibold text-charcoal">{deviceLabel(entry.device)}</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip label="Skærm" value={entry.condition.screen} />
                <Chip label="Bagside" value={entry.condition.back} />
                <Chip label="Batteri" value={entry.condition.battery} />
                <Chip label="Alt virker" value={entry.condition.allWorking} />
                {entry.condition.cloudLocked && (
                  <Chip label="iCloud-låst" value={entry.condition.cloudLocked} />
                )}
                {entry.condition.brokenParts.map((part) => (
                  <span
                    key={part}
                    className="inline-flex items-center rounded-lg bg-rose-50 px-2.5 py-1 text-[12px] font-semibold text-rose-700"
                  >
                    {part}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {lead.devices.length === 0 && (
            <p className="text-sm text-charcoal/40">Ingen enhedsdata på henvendelsen.</p>
          )}
        </div>

        {/* Amount or decline reasons */}
        <div className="border-t border-black/[0.03] bg-stone-50/50 px-6 py-5">
          {!declineOpen ? (
            <>
              <label className="mb-1.5 block text-sm font-medium text-charcoal">Beløb (kr)</label>
              <input
                autoFocus
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => {
                  setAmountTouched(true);
                  setAmount(e.target.value);
                }}
                placeholder={suggestion?.status === "manual" ? "Intet forslag — tast selv" : "F.eks. 2500"}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-lg font-semibold text-charcoal placeholder:text-sm placeholder:font-normal placeholder:text-stone-400 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              />

              {suggestion?.status === "ok" && (
                <div className="mt-2">
                  {suggestion.devices.map((d) => (
                    <p key={d.label} className="text-[12px] leading-relaxed text-stone-500">
                      {d.explanation}
                    </p>
                  ))}
                  <p className="mt-1 text-[12px] text-stone-400">
                    Gulv: {suggestion.totalFloorKr.toLocaleString("da-DK")} kr
                    {amountTouched && " · beløbet er ændret manuelt"}
                  </p>
                </div>
              )}
              {suggestion?.status === "manual" && (
                <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[12px] text-amber-700">
                  {suggestion.manualReason}
                </p>
              )}

              {error && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={working}
                  onClick={() => void sendOffer()}
                  className="rounded-full bg-green-eco px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {working ? "Sender..." : "Send tilbud"}
                </button>
                <button
                  type="button"
                  disabled={working}
                  onClick={() => setDeclineOpen(true)}
                  className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                >
                  Afvis
                </button>
                <span className="ml-auto text-[11px] text-charcoal/25">
                  Enter sender · A afviser · Esc ud
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-charcoal/50">Vælg årsag — kunden får den at vide:</p>
              <div className="space-y-2">
                {DECLINE_REASONS.map((reason, i) => (
                  <button
                    key={reason.code}
                    type="button"
                    disabled={working}
                    onClick={() => void decline(reason.code)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors disabled:opacity-50 ${
                      suggestion?.suggestDecline && reason.code === "icloud_laast"
                        ? "border-amber-300 bg-amber-50 font-semibold text-amber-800"
                        : "border-stone-200 bg-white text-stone-600 hover:border-rose-300 hover:text-rose-600"
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-stone-100 text-[11px] font-bold text-stone-500">
                      {i + 1}
                    </span>
                    {reason.label}
                  </button>
                ))}
              </div>
              {error && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={() => setDeclineOpen(false)}
                className="mt-3 text-[13px] text-charcoal/40 underline"
              >
                Fortryd (Esc)
              </button>
            </>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-[12px] text-charcoal/25">
        <Link href={`/admin/opkoeb/${inquiryId}`} className="underline">
          Åbn hele leadet
        </Link>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  The queue                                                          */
/* ------------------------------------------------------------------ */

export default function OpkoebQueuePage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [queue, setQueue] = useState<QueueLead[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: inquiries } = await supabase
        .from("contact_inquiries")
        .select("*")
        .eq("source", "saelg-enhed")
        .order("created_at", { ascending: true });

      if (!inquiries || inquiries.length === 0) {
        if (!cancelled) {
          setQueue([]);
          setLoading(false);
        }
        return;
      }

      const ids = inquiries.map((i) => i.id);
      const [{ data: offers }, { data: receipts }, { data: declines }] = await Promise.all([
        supabase.from("trade_in_offers").select("inquiry_id, status").in("inquiry_id", ids),
        supabase.from("trade_in_receipts").select("inquiry_id, status").in("inquiry_id", ids),
        supabase.from("buyback_declines").select("id, inquiry_id").in("inquiry_id", ids),
      ]);

      const untouched = (inquiries as ContactInquiry[]).filter((inquiry) => {
        const status = deriveTradeInStatus(
          inquiry.status,
          (offers ?? []).filter((o) => o.inquiry_id === inquiry.id),
          (receipts ?? []).filter((r) => r.inquiry_id === inquiry.id),
          (declines ?? []).filter((d) => d.inquiry_id === inquiry.id),
        );
        return status === "ny";
      });

      if (!cancelled) {
        setQueue(untouched.map((inquiry) => ({ inquiry, devices: readLeadDevices(inquiry.metadata) })));
        setLoading(false);
      }
    }

    const timer = setTimeout(load, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [supabase]);

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
      </div>
    );
  }

  const current = queue[index];

  if (!current) {
    return (
      <div className="mx-auto max-w-3xl py-24 text-center">
        <p className="text-lg font-semibold text-charcoal">
          {queue.length === 0 ? "Køen er tom" : "Du er igennem køen"}
        </p>
        <p className="mt-1 text-sm text-charcoal/40">
          {queue.length === 0
            ? "Der er ingen ubehandlede henvendelser."
            : `${queue.length} ${queue.length === 1 ? "lead" : "leads"} behandlet.`}
        </p>
        <Link
          href="/admin/opkoeb"
          className="mt-6 inline-block rounded-full bg-charcoal px-5 py-2.5 text-sm font-semibold text-white"
        >
          Tilbage til opkøb
        </Link>
      </div>
    );
  }

  return (
    <LeadCard
      key={current.inquiry.id}
      lead={current}
      position={index + 1}
      total={queue.length}
      onDone={advance}
    />
  );
}
