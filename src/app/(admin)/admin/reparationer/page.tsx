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
};

const STATUS_COLORS: Record<RepairStatus, string> = {
  modtaget: "bg-blue-100 text-blue-800",
  diagnostik: "bg-indigo-100 text-indigo-800",
  tilbud_sendt: "bg-yellow-100 text-yellow-800",
  godkendt: "bg-green-100 text-green-800",
  i_gang: "bg-orange-100 text-orange-800",
  faerdig: "bg-emerald-100 text-emerald-800",
  afhentet: "bg-gray-100 text-gray-800",
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
  }, [supabase]);

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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-charcoal">
          Reparationssager
        </h2>
        <Link
          href="/admin/indlevering"
          className="rounded-full bg-green-eco px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
          className="w-full max-w-md rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
        />
      </div>

      {/* Status filter buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === s
                ? "bg-green-eco text-white"
                : "bg-white text-charcoal border border-soft-grey hover:bg-sand"
            }`}
          >
            {s === "alle" ? "Alle" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      {loading ? (
        <p className="text-gray">Indlaeser sager...</p>
      ) : filteredTickets.length === 0 ? (
        <p className="text-gray">Ingen sager fundet.</p>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/admin/reparationer/${ticket.id}`}
              className="block rounded-2xl border border-soft-grey bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-charcoal">
                    {ticket.customer_name}
                  </p>
                  <p className="mt-1 text-sm text-gray">
                    {ticket.device_type} — {ticket.device_model}
                  </p>
                  <p className="mt-1 text-sm text-gray">
                    {ticket.service_type}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[ticket.status]}`}
                  >
                    {STATUS_LABELS[ticket.status]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        ticket.paid
                          ? "bg-green-100 text-green-800"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {ticket.paid ? "Betalt" : "Ikke betalt"}
                    </span>
                    <span className="text-xs text-gray">
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
