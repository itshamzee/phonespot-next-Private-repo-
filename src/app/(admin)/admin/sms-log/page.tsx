"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { SmsLogEntry } from "@/lib/supabase/types";

const SMS_STATUS_BADGE: Record<string, string> = {
  sent: "bg-emerald-500/10 text-emerald-600",
  failed: "bg-rose-500/10 text-rose-600",
  pending: "bg-amber-500/10 text-amber-600",
};

const SMS_STATUS_DOT: Record<string, string> = {
  sent: "bg-emerald-500",
  failed: "bg-rose-500",
  pending: "bg-amber-500",
};

const SMS_STATUS_LABELS: Record<string, string> = {
  sent: "Sendt",
  failed: "Fejlet",
  pending: "Afventer",
};

type StatusFilter = "alle" | "sent" | "failed" | "pending";

const ALL_STATUSES: StatusFilter[] = ["alle", "sent", "failed", "pending"];

export default function AdminSmsLogPage() {
  const [entries, setEntries] = useState<SmsLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  const supabase = createBrowserClient();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("sms_log")
        .select("*")
        .order("created_at", { ascending: false });
      setEntries((data as SmsLogEntry[]) ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);

  const sentToday = entries.filter(
    (e) => e.status === "sent" && e.created_at.slice(0, 10) === today
  ).length;
  const failedToday = entries.filter(
    (e) => e.status === "failed" && e.created_at.slice(0, 10) === today
  ).length;
  const sentThisMonth = entries.filter(
    (e) => e.status === "sent" && e.created_at.slice(0, 7) === thisMonth
  ).length;

  const statusCounts = entries.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filtered = entries.filter((e) => {
    if (statusFilter !== "alle" && e.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return e.phone.includes(q) || e.message.toLowerCase().includes(q);
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

  async function handleResend(entry: SmsLogEntry) {
    setResending(entry.id);
    try {
      await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: entry.phone,
          message: entry.message,
          ticket_id: entry.ticket_id,
        }),
      });
      const { data } = await supabase
        .from("sms_log")
        .select("*")
        .order("created_at", { ascending: false });
      setEntries((data as SmsLogEntry[]) ?? []);
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
          SMS Log
        </h2>
        <p className="mt-0.5 text-sm text-charcoal/35">
          {entries.length} beskeder totalt
        </p>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
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
            placeholder="S\u00f8g efter telefonnummer eller besked..."
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
                <span className={`h-2 w-2 rounded-full ${SMS_STATUS_DOT[s]}`} />
              )}
              {s === "alle" ? "Alle" : SMS_STATUS_LABELS[s]}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                statusFilter === s ? "bg-white/20 text-white" : "bg-charcoal/[0.04] text-charcoal/30"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Message list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
            <p className="text-sm text-charcoal/30">Indl\u00e6ser SMS-log...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white py-20 shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/[0.03]">
            <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-charcoal/30">Ingen SMS-beskeder fundet</p>
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
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${SMS_STATUS_DOT[entry.status] ?? "bg-charcoal/20"}`} />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal">{entry.phone}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-charcoal/35">
                      {entry.message}
                    </p>
                  </div>

                  {/* Right */}
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${SMS_STATUS_BADGE[entry.status] ?? "bg-charcoal/[0.06] text-charcoal/40"}`}>
                      {SMS_STATUS_LABELS[entry.status] ?? entry.status}
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
                      {entry.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {entry.ticket_id && (
                        <Link
                          href={`/admin/reparationer/${entry.ticket_id}`}
                          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          G\u00e5 til sag \u2192
                        </Link>
                      )}
                      {entry.provider_message_id && (
                        <p className="text-xs text-charcoal/25">
                          Provider ID: {entry.provider_message_id}
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
