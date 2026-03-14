"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { RepairStatus, RepairTicket } from "@/lib/supabase/types";

const STATUS_LABELS: Record<RepairStatus, string> = {
  modtaget: "Modtaget",
  diagnostik: "Diagnostik",
  tilbud_sendt: "Tilbud sendt",
  godkendt: "Godkendt",
  i_gang: "I gang",
  faerdig: "F\u00e6rdig",
  afhentet: "Afhentet",
  bero: "Bero",
  reklamation_modtaget: "Reklamation modtaget",
  reklamation_vurderet: "Reklamation vurderet",
  reklamation_loest: "Reklamation l\u00f8st",
};

const STATUS_BADGE: Record<RepairStatus, string> = {
  modtaget: "bg-blue-500/10 text-blue-600",
  diagnostik: "bg-indigo-500/10 text-indigo-600",
  tilbud_sendt: "bg-amber-500/10 text-amber-600",
  godkendt: "bg-emerald-500/10 text-emerald-600",
  i_gang: "bg-orange-500/10 text-orange-600",
  faerdig: "bg-green-500/10 text-green-700",
  afhentet: "bg-charcoal/[0.05] text-charcoal/40",
  bero: "bg-rose-500/10 text-rose-600",
  reklamation_modtaget: "bg-red-500/10 text-red-600",
  reklamation_vurderet: "bg-purple-500/10 text-purple-600",
  reklamation_loest: "bg-teal-500/10 text-teal-600",
};

const STATUS_DOT: Record<RepairStatus, string> = {
  modtaget: "bg-blue-500",
  diagnostik: "bg-indigo-500",
  tilbud_sendt: "bg-amber-500",
  godkendt: "bg-emerald-500",
  i_gang: "bg-orange-500",
  faerdig: "bg-green-500",
  afhentet: "bg-charcoal/20",
  bero: "bg-rose-500",
  reklamation_modtaget: "bg-red-500",
  reklamation_vurderet: "bg-purple-500",
  reklamation_loest: "bg-teal-500",
};

const ALL_STATUSES: (RepairStatus | "alle")[] = [
  "alle",
  "modtaget",
  "diagnostik",
  "tilbud_sendt",
  "godkendt",
  "i_gang",
  "faerdig",
  "afhentet",
];

export default function AdminReparationerPage() {
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RepairStatus | "alle">("alle");
  const [search, setSearch] = useState("");

  const supabase = createBrowserClient();

  useEffect(() => {
    async function loadTickets() {
      setLoading(true);
      const { data, error } = await supabase
        .from("repair_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTickets(data as RepairTicket[]);
      }
      setLoading(false);
    }

    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTickets = tickets.filter((ticket) => {
    if (filter !== "alle" && ticket.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        ticket.customer_name.toLowerCase().includes(q) ||
        ticket.customer_email.toLowerCase().includes(q) ||
        ticket.device_model.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Count per status for filter badges
  const statusCounts = tickets.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Reparationer
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            {filteredTickets.length} {filteredTickets.length === 1 ? "sag" : "sager"}
            {filter !== "alle" && ` \u2014 ${STATUS_LABELS[filter]}`}
          </p>
        </div>
        <Link
          href="/admin/indlevering"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/15 transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98] sm:w-auto"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ny indlevering
        </Link>
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
            placeholder="S\u00f8g efter navn, email eller model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/[0.06] bg-white py-3 pl-11 pr-4 text-sm text-charcoal placeholder:text-charcoal/25 shadow-sm transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {ALL_STATUSES.map((s) => {
          const count = s === "alle" ? tickets.length : (statusCounts[s] ?? 0);
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all ${
                filter === s
                  ? "bg-charcoal text-white shadow-sm"
                  : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 shadow-sm"
              }`}
            >
              {s !== "alle" && (
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
              )}
              {s === "alle" ? "Alle" : STATUS_LABELS[s]}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                filter === s ? "bg-white/20 text-white" : "bg-charcoal/[0.04] text-charcoal/30"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
            <p className="text-sm text-charcoal/30">Indl\u00e6ser sager...</p>
          </div>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white py-20 shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/[0.03]">
            <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-charcoal/30">Ingen sager fundet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
          <div className="divide-y divide-black/[0.03]">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/admin/reparationer/${ticket.id}`}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-black/[0.015] sm:px-6"
              >
                {/* Status dot */}
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[ticket.status]}`} />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-charcoal group-hover:text-emerald-700 sm:text-[15px]">
                    {ticket.customer_name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-charcoal/35">
                    {ticket.device_type} \u2014 {ticket.device_model} \u00b7 {ticket.service_type}
                  </p>
                </div>

                {/* Right: status + payment + date */}
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold sm:inline-block ${
                    ticket.paid ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                  }`}>
                    {ticket.paid ? "Betalt" : "Ikke betalt"}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_BADGE[ticket.status]}`}>
                    {STATUS_LABELS[ticket.status]}
                  </span>
                  <span className="hidden text-xs text-charcoal/20 sm:block">
                    {formatDate(ticket.created_at)}
                  </span>
                  <svg className="h-4 w-4 text-charcoal/15" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
