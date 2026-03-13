"use client";

import { useState, useEffect, useCallback } from "react";
import type { DraftOrder } from "@/lib/supabase/platform-types";
import { formatDKK, formatDate } from "@/lib/platform/format";

interface Props {
  onSelect: (draft: DraftOrder) => void;
}

type StatusFilter = "all" | "draft" | "sent" | "paid" | "cancelled";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "draft", label: "Kladde" },
  { value: "sent", label: "Sendt" },
  { value: "paid", label: "Betalt" },
  { value: "cancelled", label: "Annulleret" },
];

function StatusBadge({ status }: { status: DraftOrder["status"] }) {
  const styles: Record<DraftOrder["status"], string> = {
    draft: "bg-stone-100 text-stone-600",
    sent: "bg-blue-50 text-blue-700",
    paid: "bg-green-50 text-green-700",
    converting: "bg-amber-50 text-amber-700",
    cancelled: "bg-red-50 text-red-600",
  };

  const labels: Record<DraftOrder["status"], string> = {
    draft: "Kladde",
    sent: "Sendt",
    paid: "Betalt",
    converting: "Behandles",
    cancelled: "Annulleret",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function DraftOrderList({ onSelect }: Props) {
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/platform/draft-orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDrafts(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <div className="flex gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-200 border-t-green-600" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="py-16 text-center text-sm text-stone-400">
          Ingen fakturakladder fundet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/60 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                <th className="px-4 py-3">Faktura nr.</th>
                <th className="px-4 py-3">Dato</th>
                <th className="px-4 py-3">Kunde</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {drafts.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => onSelect(d)}
                  className="cursor-pointer hover:bg-stone-50/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-stone-800">
                    {d.draft_number}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {formatDate(d.created_at)}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <div>{d.customer_name ?? <span className="text-stone-400">—</span>}</div>
                    {d.customer_email && (
                      <div className="text-xs text-stone-400">{d.customer_email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-stone-800">
                    {formatDKK(d.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
