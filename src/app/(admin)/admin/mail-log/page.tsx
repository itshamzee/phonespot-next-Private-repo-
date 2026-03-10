"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MailLogEntry, MailStatus } from "@/lib/supabase/types";

const MAIL_STATUS_COLORS: Record<string, string> = {
  delivered: "bg-emerald-50 text-emerald-600",
  bounced: "bg-orange-50 text-orange-600",
  failed: "bg-rose-50 text-rose-600",
  pending: "bg-amber-50 text-amber-600",
};

const MAIL_STATUS_LABELS: Record<string, string> = {
  delivered: "Leveret",
  bounced: "Bounced",
  failed: "Fejlet",
  pending: "Afventer",
};

type StatusFilter = "alle" | MailStatus;

export default function AdminMailLogPage() {
  const [entries, setEntries] = useState<MailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  const supabase = createBrowserClient();

  async function loadEntries() {
    setLoading(true);
    const { data } = await supabase
      .from("mail_log")
      .select("*")
      .order("created_at", { ascending: false });
    setEntries((data as MailLogEntry[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Stats ---------- */
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);

  const sentToday = entries.filter(
    (e) => e.status === "delivered" && e.created_at.slice(0, 10) === today
  ).length;
  const failedToday = entries.filter(
    (e) => (e.status === "failed" || e.status === "bounced") && e.created_at.slice(0, 10) === today
  ).length;
  const sentThisMonth = entries.filter(
    (e) => e.status === "delivered" && e.created_at.slice(0, 7) === thisMonth
  ).length;

  /* ---------- Filtering ---------- */
  const filtered = entries.filter((e) => {
    if (statusFilter !== "alle" && e.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.to_email.toLowerCase().includes(q) ||
      e.subject.toLowerCase().includes(q)
    );
  });

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleResend(entry: MailLogEntry) {
    setResending(entry.id);
    try {
      await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: entry.to_email,
          subject: entry.subject,
          body: entry.body,
          ticket_id: entry.ticket_id,
          inquiry_id: entry.inquiry_id,
        }),
      });
      await loadEntries();
    } catch {
      // silently fail
    }
    setResending(null);
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl font-bold tracking-tight text-charcoal">
        Mail Log
      </h2>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200/60 bg-white p-4 shadow-sm">
          <p className="text-[13px] font-medium text-stone-400">Sendt i dag</p>
          <p className="mt-1 text-2xl font-bold text-charcoal">{sentToday}</p>
        </div>
        <div className="rounded-xl border border-stone-200/60 bg-white p-4 shadow-sm">
          <p className="text-[13px] font-medium text-stone-400">Fejlet i dag</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{failedToday}</p>
        </div>
        <div className="rounded-xl border border-stone-200/60 bg-white p-4 shadow-sm">
          <p className="text-[13px] font-medium text-stone-400">Sendt denne maaned</p>
          <p className="mt-1 text-2xl font-bold text-charcoal">{sentThisMonth}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Soeg efter email eller emne..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-charcoal placeholder:text-stone-400 transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-charcoal transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
        >
          <option value="alle">Alle statusser</option>
          <option value="delivered">Leveret</option>
          <option value="bounced">Bounced</option>
          <option value="failed">Fejlet</option>
          <option value="pending">Afventer</option>
        </select>
      </div>

      {loading ? (
        <p className="text-stone-400">Indlaeser mail-log...</p>
      ) : filtered.length === 0 ? (
        <p className="text-stone-400">Ingen mails fundet.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div
                key={entry.id}
                className="rounded-xl border border-stone-200/60 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-charcoal">{entry.to_email}</p>
                    <p className="mt-0.5 line-clamp-1 text-sm text-stone-400">
                      {entry.subject}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        MAIL_STATUS_COLORS[entry.status] ?? "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {MAIL_STATUS_LABELS[entry.status] ?? entry.status}
                    </span>
                    <span className="text-xs text-stone-400">
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-stone-100 px-4 pb-4 pt-3">
                    <p className="mb-2 whitespace-pre-wrap text-sm text-charcoal">
                      {entry.body}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {entry.resend_id && (
                        <p className="text-xs text-stone-400">
                          Resend ID: {entry.resend_id}
                        </p>
                      )}
                      {entry.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => handleResend(entry)}
                          disabled={resending === entry.id}
                          className="ml-auto rounded-lg bg-green-eco px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-50"
                        >
                          {resending === entry.id ? "Gensender..." : "Gensend"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
