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
  faerdig: "Faerdig",
  afhentet: "Afhentet",
  bero: "Bero",
  reklamation_modtaget: "Reklamation modtaget",
  reklamation_vurderet: "Reklamation vurderet",
  reklamation_loest: "Reklamation løst",
};

const STATUS_COLORS: Record<RepairStatus, string> = {
  modtaget: "bg-blue-50 text-blue-600",
  diagnostik: "bg-indigo-50 text-indigo-600",
  tilbud_sendt: "bg-amber-50 text-amber-600",
  godkendt: "bg-emerald-50 text-emerald-600",
  i_gang: "bg-orange-50 text-orange-600",
  faerdig: "bg-green-50 text-green-700",
  afhentet: "bg-stone-100 text-stone-500",
  bero: "bg-rose-50 text-rose-600",
  reklamation_modtaget: "bg-red-50 text-red-600",
  reklamation_vurderet: "bg-purple-50 text-purple-600",
  reklamation_loest: "bg-teal-50 text-teal-600",
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
    // Status filter
    if (filter !== "alle" && ticket.status !== filter) return false;

    // Search filter
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

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl font-bold tracking-tight text-charcoal sm:text-2xl">
          Reparationssager
        </h2>
        <Link
          href="/admin/indlevering"
          className="w-full rounded-xl bg-green-eco px-5 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-green-eco/15 transition-all hover:brightness-110 sm:w-auto"
        >
          + Ny indlevering
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Soeg efter navn, email eller model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-charcoal placeholder:text-stone-400 transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10 sm:max-w-md"
        />
      </div>

      {/* Status filter buttons */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 sm:mb-6 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm ${
              filter === s
                ? "bg-green-eco text-white shadow-sm shadow-green-eco/15"
                : "bg-white text-stone-500 border border-stone-200 hover:border-stone-300 hover:text-charcoal"
            }`}
          >
            {s === "alle" ? "Alle" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      {loading ? (
        <p className="text-stone-400">Indlaeser sager...</p>
      ) : filteredTickets.length === 0 ? (
        <p className="text-stone-400">Ingen sager fundet.</p>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {filteredTickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/admin/reparationer/${ticket.id}`}
              className="block rounded-xl border border-stone-200/60 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-charcoal sm:text-base">
                    {ticket.customer_name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-stone-400 sm:mt-1 sm:text-sm">
                    {ticket.device_type} — {ticket.device_model}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-stone-400 sm:mt-1 sm:text-sm">
                    {ticket.service_type}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5 sm:gap-2">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:px-3 sm:py-1 sm:text-xs ${STATUS_COLORS[ticket.status]}`}
                  >
                    {STATUS_LABELS[ticket.status]}
                  </span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${
                        ticket.paid
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {ticket.paid ? "Betalt" : "Ikke betalt"}
                    </span>
                    <span className="text-[10px] text-stone-400 sm:text-xs">
                      {formatDate(ticket.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
