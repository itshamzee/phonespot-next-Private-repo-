"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatDKK } from "@/lib/supabase/trade-in-types";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import { readLeadDevices, deviceLabel } from "@/lib/buyback/lead-devices";

/**
 * Offers that have been priced automatically but have not left yet.
 *
 * This is the whole point of the hold window: for these minutes the decision is
 * still yours. Hidden entirely when nothing is pending, so a quiet day stays quiet.
 */

interface ScheduledOffer {
  id: string;
  inquiry_id: string;
  offer_amount: number;
  scheduled_send_at: string;
  label: string;
}

const REFRESH_MS = 30_000;

function countdown(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "sendes nu";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "under 1 min.";
  return `om ${minutes} min.`;
}

export default function BuybackHoldWindow({ onChange }: { onChange?: () => void }) {
  const [offers, setOffers] = useState<ScheduledOffer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data, error: err } = await supabase
      .from("trade_in_offers")
      .select("id, inquiry_id, offer_amount, scheduled_send_at")
      .eq("send_state", "scheduled")
      .order("scheduled_send_at", { ascending: true });

    // The column does not exist until the migration is applied; stay quiet.
    if (err || !data) {
      setOffers([]);
      return;
    }

    const rows = data as Omit<ScheduledOffer, "label">[];
    if (rows.length === 0) {
      setOffers([]);
      setNow(Date.now());
      return;
    }

    const { data: inquiries } = await supabase
      .from("contact_inquiries")
      .select("id, metadata")
      .in("id", rows.map((r) => r.inquiry_id));

    const labels = new Map<string, string>();
    for (const inq of (inquiries ?? []) as { id: string; metadata: unknown }[]) {
      labels.set(inq.id, deviceLabel(readLeadDevices(inq.metadata)[0]?.device));
    }

    setOffers(rows.map((r) => ({ ...r, label: labels.get(r.inquiry_id) ?? "Ukendt enhed" })));
    setNow(Date.now());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) void load();
    };
    const initial = setTimeout(run, 0);
    const timer = setInterval(run, REFRESH_MS);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);

  async function act(offerId: string, action: "cancel" | "send_now") {
    setWorking(offerId);
    setError("");
    try {
      const res = await staffFetch("/api/trade-in/takeover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: offerId, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Handlingen kunne ikke gennemføres");
      } else {
        await load();
        onChange?.();
      }
    } catch {
      setError("Handlingen kunne ikke gennemføres — prøv igen");
    }
    setWorking(null);
  }

  if (offers.length === 0) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm">
      <header className="flex items-center justify-between border-b border-amber-200/60 px-5 py-3">
        <h3 className="text-[13px] font-semibold text-amber-900">Sendes om lidt</h3>
        <span className="text-[11px] text-amber-700/60">Du kan nå at gribe ind</span>
      </header>

      <ul className="divide-y divide-amber-200/40">
        {offers.map((offer) => (
          <li key={offer.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-charcoal">{offer.label}</p>
              <p className="mt-0.5 text-[12px] text-amber-800/70">
                {formatDKK(offer.offer_amount)} · {countdown(offer.scheduled_send_at, now)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={working === offer.id}
                onClick={() => void act(offer.id, "cancel")}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-800 transition-colors hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
              >
                Tag over
              </button>
              <button
                type="button"
                disabled={working === offer.id}
                onClick={() => void act(offer.id, "send_now")}
                className="rounded-lg bg-charcoal px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Send nu
              </button>
            </div>
          </li>
        ))}
      </ul>

      {error && <p className="px-5 py-2.5 text-[12px] text-rose-600">{error}</p>}
    </section>
  );
}
