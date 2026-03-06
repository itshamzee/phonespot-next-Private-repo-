"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { RepairStatus, RepairTicket } from "@/lib/supabase/types";

const STATUS_LABELS: Record<RepairStatus, string> = {
  modtaget: "Modtaget",
  tilbud_sendt: "Tilbud sendt",
  godkendt: "Godkendt",
  i_gang: "I gang",
  faerdig: "Faerdig",
  afhentet: "Afhentet",
};

const STATUS_COLORS: Record<RepairStatus, string> = {
  modtaget: "bg-blue-100 text-blue-800",
  tilbud_sendt: "bg-yellow-100 text-yellow-800",
  godkendt: "bg-green-100 text-green-800",
  i_gang: "bg-orange-100 text-orange-800",
  faerdig: "bg-emerald-100 text-emerald-800",
  afhentet: "bg-gray-100 text-gray-800",
};

interface Customer {
  email: string;
  name: string;
  phone: string;
  ticketCount: number;
  lastTicketDate: string;
  tickets: RepairTicket[];
}

function groupByCustomer(tickets: RepairTicket[]): Customer[] {
  const map = new Map<string, Customer>();

  for (const ticket of tickets) {
    const existing = map.get(ticket.customer_email);
    if (existing) {
      existing.ticketCount += 1;
      existing.tickets.push(ticket);
      // Update name/phone from the most recent ticket
      if (ticket.created_at > existing.lastTicketDate) {
        existing.lastTicketDate = ticket.created_at;
        existing.name = ticket.customer_name;
        existing.phone = ticket.customer_phone;
      }
    } else {
      map.set(ticket.customer_email, {
        email: ticket.customer_email,
        name: ticket.customer_name,
        phone: ticket.customer_phone,
        ticketCount: 1,
        lastTicketDate: ticket.created_at,
        tickets: [ticket],
      });
    }
  }

  // Sort customers by last ticket date (most recent first)
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastTicketDate).getTime() - new Date(a.lastTicketDate).getTime()
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminKunderPage() {
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

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

  const customers = groupByCustomer(tickets);

  const filteredCustomers = customers.filter((customer) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      customer.name.toLowerCase().includes(q) ||
      customer.email.toLowerCase().includes(q) ||
      customer.phone.toLowerCase().includes(q)
    );
  });

  function toggleExpand(email: string) {
    setExpandedEmail((prev) => (prev === email ? null : email));
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl font-bold text-charcoal">
        Kunder
      </h2>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Soeg efter navn, email eller telefon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
        />
      </div>

      {/* Customer list */}
      {loading ? (
        <p className="text-gray">Indlaeser kunder...</p>
      ) : filteredCustomers.length === 0 ? (
        <p className="text-gray">Ingen kunder fundet.</p>
      ) : (
        <div className="grid gap-4">
          {filteredCustomers.map((customer) => {
            const isExpanded = expandedEmail === customer.email;

            return (
              <div
                key={customer.email}
                className="rounded-2xl border border-soft-grey bg-white transition-shadow hover:shadow-md"
              >
                {/* Customer row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(customer.email)}
                  className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">
                      {customer.name}
                    </p>
                    <p className="mt-1 text-sm text-gray">{customer.email}</p>
                    <p className="mt-0.5 text-sm text-gray">{customer.phone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="inline-block rounded-full bg-sand px-3 py-1 text-xs font-semibold text-charcoal">
                      {customer.ticketCount}{" "}
                      {customer.ticketCount === 1 ? "sag" : "sager"}
                    </span>
                    <span className="text-xs text-gray">
                      Senest: {formatDate(customer.lastTicketDate)}
                    </span>
                    <svg
                      className={`h-4 w-4 text-gray transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Expanded ticket history */}
                {isExpanded && (
                  <div className="border-t border-soft-grey px-5 pb-5 pt-3">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray">
                      Sagshistorik
                    </p>
                    <div className="grid gap-2">
                      {customer.tickets.map((ticket) => (
                        <Link
                          key={ticket.id}
                          href={`/admin/reparationer/${ticket.id}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warm-white p-3 text-sm transition-colors hover:bg-sand"
                        >
                          <div className="flex-1">
                            <span className="font-medium text-charcoal">
                              {ticket.device_type} — {ticket.device_model}
                            </span>
                            <span className="ml-2 text-gray">
                              {ticket.service_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[ticket.status]}`}
                            >
                              {STATUS_LABELS[ticket.status]}
                            </span>
                            <span className="text-xs text-gray">
                              {formatDate(ticket.created_at)}
                            </span>
                          </div>
                        </Link>
                      ))}
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
