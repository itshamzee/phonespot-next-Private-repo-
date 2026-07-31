"use client";

import { useState } from "react";
import Link from "next/link";
import { TRADE_IN_PIPELINE, type TradeInDerivedStatus } from "@/lib/supabase/trade-in-types";
import { staffFetch } from "@/lib/buyback/admin-fetch";

export interface PipelineRow {
  inquiryId: string;
  customerName: string;
  device: string;
  status: TradeInDerivedStatus;
  deliveredAt: string | null;
  inTransitAt: string | null;
  trackingNumber: string | null;
}

interface Props {
  rows: PipelineRow[];
  labels: Record<TradeInDerivedStatus, { label: string; dot: string }>;
  active: TradeInDerivedStatus | "alle";
  onSelect: (status: TradeInDerivedStatus | "alle") => void;
  onChanged: () => void;
}

/** Devices in flight, in the order they move. Only the states with something in them. */
const INBOUND: TradeInDerivedStatus[] = [
  "accepteret",
  "afventer_forsendelse",
  "paa_vej",
  "leveret",
  "modtaget",
  "vurderet",
];

const STUCK_DAYS = 2;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

export default function BuybackPipeline({ rows, labels, active, onSelect, onChanged }: Props) {
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  const inFlight = INBOUND.reduce((sum, s) => sum + (counts[s] ?? 0), 0);

  // A parcel the carrier handed over that nobody has opened. This is the one
  // gap where a device can disappear without anything looking wrong.
  const stuck = rows
    .filter((r) => r.status === "leveret")
    .map((r) => ({ row: r, days: daysSince(r.deliveredAt) ?? 0 }))
    .filter((x) => x.days >= STUCK_DAYS)
    .sort((a, b) => b.days - a.days);

  async function markReceived(inquiryId: string) {
    if (working) return;
    setWorking(inquiryId);
    setError("");
    try {
      const res = await staffFetch(`/api/trade-in/${inquiryId}/receive`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Kunne ikke markere som modtaget");
      } else {
        onChanged();
      }
    } catch {
      setError("Kunne ikke markere som modtaget — prøv igen");
    } finally {
      setWorking(null);
    }
  }

  if (inFlight === 0 && stuck.length === 0) return null;

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
      <div className="flex items-baseline justify-between border-b border-black/[0.03] px-5 py-3.5">
        <h3 className="text-sm font-semibold text-charcoal">Undervejs</h3>
        <span className="text-[12px] text-charcoal/35">
          {inFlight} {inFlight === 1 ? "enhed" : "enheder"} i forløbet
        </span>
      </div>

      {/* The chain, in order. Empty steps stay visible so the gap is legible. */}
      <div className="flex gap-2 overflow-x-auto px-5 py-4">
        {TRADE_IN_PIPELINE.filter((s) => INBOUND.includes(s)).map((status, i) => {
          const count = counts[status] ?? 0;
          const isActive = active === status;
          return (
            <div key={status} className="flex shrink-0 items-center gap-2">
              {i > 0 && <span className="text-charcoal/15">→</span>}
              <button
                type="button"
                onClick={() => onSelect(isActive ? "alle" : status)}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  isActive
                    ? "border-charcoal/20 bg-charcoal/[0.04]"
                    : count > 0
                      ? "border-black/[0.06] bg-white hover:border-black/15"
                      : "border-transparent bg-transparent"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${count > 0 ? labels[status].dot : "bg-charcoal/10"}`} />
                  <span className={`text-[11px] ${count > 0 ? "text-charcoal/50" : "text-charcoal/25"}`}>
                    {labels[status].label}
                  </span>
                </span>
                <span
                  className={`mt-0.5 block text-lg font-bold ${count > 0 ? "text-charcoal" : "text-charcoal/20"}`}
                >
                  {count}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {stuck.length > 0 && (
        <div className="border-t border-amber-200/60 bg-amber-50/60 px-5 py-4">
          <p className="text-[13px] font-semibold text-amber-800">
            Leveret, men ikke modtaget
          </p>
          <p className="mt-0.5 text-[12px] text-amber-700/80">
            Fragtfirmaet har afleveret {stuck.length === 1 ? "denne pakke" : "disse pakker"}, men
            ingen har markeret {stuck.length === 1 ? "den" : "dem"} som modtaget.
          </p>

          <ul className="mt-3 space-y-2">
            {stuck.map(({ row, days }) => (
              <li
                key={row.inquiryId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/70 bg-white px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-charcoal">{row.device}</p>
                  <p className="mt-0.5 text-[12px] text-charcoal/40">
                    {row.customerName} · {days} {days === 1 ? "dag" : "dage"} siden levering
                    {row.trackingNumber && ` · ${row.trackingNumber}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/admin/opkoeb/${row.inquiryId}`}
                    className="text-[12px] text-charcoal/40 underline"
                  >
                    Åbn
                  </Link>
                  <button
                    type="button"
                    disabled={working === row.inquiryId}
                    onClick={() => void markReceived(row.inquiryId)}
                    className="rounded-full bg-green-eco px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {working === row.inquiryId ? "Markerer..." : "Modtaget"}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {error && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-600">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
