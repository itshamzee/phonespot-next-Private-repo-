"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MailLogEntry, MailStatus } from "@/lib/supabase/types";

const MAIL_STATUS_BADGE: Record<string, string> = {
  delivered: "bg-emerald-500/10 text-emerald-600",
  bounced: "bg-orange-500/10 text-orange-600",
  failed: "bg-rose-500/10 text-rose-600",
  pending: "bg-amber-500/10 text-amber-600",
};

const MAIL_STATUS_DOT: Record<string, string> = {
  delivered: "bg-emerald-500",
  bounced: "bg-orange-500",
  failed: "bg-rose-500",
  pending: "bg-amber-500",
};

const MAIL_STATUS_LABELS: Record<string, string> = {
  delivered: "Leveret",
  bounced: "Bounced",
  failed: "Fejlet",
  pending: "Afventer",
};

type StatusFilter = "alle" | MailStatus;

const ALL_STATUSES: StatusFilter[] = ["alle", "delivered", "bounced", "failed", "pending"];

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

  const statusCounts = entries.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Mail Log
        </h2>
        <p className="mt-0.5 text-sm text-charcoal/35">
          {entries.length} emails totalt
        </p>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-medium text-charcoal/35">Sendt i dag</p>
              <p className="text-2xl font-bold text-charcoal">{sentToday}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
              <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-medium text-charcoal/35">Fejlet i dag</p>
              <p className="text-2xl font-bold text-rose-600">{failedToday}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-medium text-charcoal/35">Sendt denne m\u00e5ned</p>
              <p className="text-2xl font-bold text-charcoal">{sentThisMonth}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg className="h-4 w-4 text-charcoal/25" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="S\u00f8g efter email eller emne..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/[0.06] bg-white py-3 pl-11 pr-4 text-sm text-charcoal placeholder:text-charcoal/25 shadow-sm transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {ALL_STATUSES.map((s) => {
          const count = s === "alle" ? entries.length : (statusCounts[s] ?? 0);
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all ${
                statusFilter === s
                  ? "bg-charcoal text-white shadow-sm"
                  : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 shadow-sm"
              }`}
            >
              {s !== "alle" && (
                <span className={`h-2 w-2 rounded-full ${MAIL_STATUS_DOT[s]}`} />
              )}
              {s === "alle" ? "Alle" : MAIL_STATUS_LABELS[s]}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                statusFilter === s ? "bg-white/20 text-white" : "bg-charcoal/[0.04] text-charcoal/30"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mail list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
            <p className="text-sm text-charcoal/30">Indl\u00e6ser mail-log...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white py-20 shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/[0.03]">
            <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <p className="text-sm font-medium text-charcoal/30">Ingen mails fundet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div
                key={entry.id}
                className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6"
                >
                  {/* Status dot */}
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${MAIL_STATUS_DOT[entry.status] ?? "bg-charcoal/20"}`} />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal">{entry.to_email}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-charcoal/35">
                      {entry.subject}
                    </p>
                  </div>

                  {/* Right */}
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${MAIL_STATUS_BADGE[entry.status] ?? "bg-charcoal/[0.06] text-charcoal/40"}`}>
                      {MAIL_STATUS_LABELS[entry.status] ?? entry.status}
                    </span>
                    <span className="hidden text-xs text-charcoal/20 sm:block">
                      {formatDate(entry.created_at)}
                    </span>
                    <svg
                      className={`h-4 w-4 text-charcoal/15 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-black/[0.04] bg-charcoal/[0.015] px-5 pb-4 pt-3 sm:px-6">
                    <p className="mb-3 whitespace-pre-wrap text-sm text-charcoal/70">
                      {entry.body}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {entry.resend_id && (
                        <p className="text-xs text-charcoal/25">
                          Resend ID: {entry.resend_id}
                        </p>
                      )}
                      {entry.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => handleResend(entry)}
                          disabled={resending === entry.id}
                          className="ml-auto rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-500/15 transition-all hover:brightness-110 disabled:opacity-50"
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
