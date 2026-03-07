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

interface DashboardStats {
  activeCases: number;
  pendingQuotes: number;
  finishedToday: number;
  revenueThisMonth: number;
  newInquiries: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    activeCases: 0,
    pendingQuotes: 0,
    finishedToday: 0,
    revenueThisMonth: 0,
    newInquiries: 0,
  });
  const [recentTickets, setRecentTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient();

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      // Fetch all tickets for stat calculations
      const { data: allTickets } = await supabase
        .from("repair_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      const tickets = (allTickets as RepairTicket[]) ?? [];

      // Active cases: status NOT 'afhentet'
      const activeCases = tickets.filter((t) => t.status !== "afhentet").length;

      // Pending quotes: status = 'modtaget'
      const pendingQuotes = tickets.filter(
        (t) => t.status === "modtaget"
      ).length;

      // Finished today: status = 'faerdig' AND updated_at is today
      const todayStr = new Date().toISOString().slice(0, 10);
      const finishedToday = tickets.filter(
        (t) =>
          t.status === "faerdig" && t.updated_at.slice(0, 10) === todayStr
      ).length;

      // Revenue this month: sum of price_dkk from repair_quotes where accepted_at is this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);

      const { data: quotes } = await supabase
        .from("repair_quotes")
        .select("price_dkk, accepted_at")
        .gte("accepted_at", monthStart)
        .lte("accepted_at", monthEnd + "T23:59:59");

      const revenueThisMonth = (quotes ?? []).reduce(
        (sum: number, q: { price_dkk: number }) => sum + (q.price_dkk ?? 0),
        0
      );

      // New inquiries count
      const { count: inquiryCount } = await supabase
        .from("contact_inquiries")
        .select("*", { count: "exact", head: true })
        .eq("status", "ny");

      setStats({
        activeCases,
        pendingQuotes,
        finishedToday,
        revenueThisMonth,
        newInquiries: inquiryCount ?? 0,
      });

      // Recent 10 tickets
      setRecentTickets(tickets.slice(0, 10));

      setLoading(false);
    }

    loadDashboard();
  }, [supabase]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("da-DK", {
      style: "currency",
      currency: "DKK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray">Indlaeser dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-8 font-display text-2xl font-bold text-charcoal">
        Dashboard
      </h2>

      {/* Stat cards */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-soft-grey bg-white p-6">
          <p className="text-3xl font-bold text-green-eco">
            {stats.activeCases}
          </p>
          <p className="mt-1 text-sm text-gray">Aktive sager</p>
        </div>
        <div className="rounded-2xl border border-soft-grey bg-white p-6">
          <p className="text-3xl font-bold text-green-eco">
            {stats.pendingQuotes}
          </p>
          <p className="mt-1 text-sm text-gray">Ventende tilbud</p>
        </div>
        <div className="rounded-2xl border border-soft-grey bg-white p-6">
          <p className="text-3xl font-bold text-green-eco">
            {stats.finishedToday}
          </p>
          <p className="mt-1 text-sm text-gray">Faerdige i dag</p>
        </div>
        <div className="rounded-2xl border border-soft-grey bg-white p-6">
          <p className="text-3xl font-bold text-green-eco">
            {formatCurrency(stats.revenueThisMonth)}
          </p>
          <p className="mt-1 text-sm text-gray">Omsaetning denne maaned</p>
        </div>
        <div className="rounded-2xl border border-soft-grey bg-white p-6">
          <p className="text-3xl font-bold text-green-eco">
            {stats.newInquiries}
          </p>
          <p className="mt-1 text-sm text-gray">Nye henvendelser</p>
        </div>
      </div>

      {/* Recent tickets */}
      <div className="mb-10 rounded-2xl border border-soft-grey bg-white">
        <div className="border-b border-soft-grey px-6 py-4">
          <h3 className="font-display text-lg font-semibold text-charcoal">
            Seneste sager
          </h3>
        </div>
        {recentTickets.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray">
            Ingen sager endnu.
          </p>
        ) : (
          <div className="divide-y divide-soft-grey">
            {recentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/admin/reparationer/${ticket.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-warm-white"
              >
                <div className="flex-1">
                  <p className="font-semibold text-charcoal">
                    {ticket.customer_name}
                  </p>
                  <p className="mt-0.5 text-sm text-gray">
                    {ticket.device_type} — {ticket.device_model}
                  </p>
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
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/indlevering"
          className="rounded-xl bg-green-eco px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          + Ny indlevering
        </Link>
        <Link
          href="/admin/reparationer"
          className="rounded-xl border border-soft-grey bg-white px-5 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-sand"
        >
          Se ventende sager
        </Link>
        <Link
          href="/admin/henvendelser"
          className="rounded-xl border border-soft-grey bg-white px-5 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-sand"
        >
          Se henvendelser
        </Link>
        <Link
          href="/admin/prisliste"
          className="rounded-xl border border-soft-grey bg-white px-5 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-sand"
        >
          Se prisliste
        </Link>
      </div>
    </div>
  );
}
