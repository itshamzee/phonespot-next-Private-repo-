"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { RepairStatus, RepairTicket } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/*  Status config                                                      */
/* ------------------------------------------------------------------ */

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

const STATUS_DOT_COLORS: Record<RepairStatus, string> = {
  modtaget: "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.4)]",
  diagnostik: "bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.4)]",
  tilbud_sendt: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]",
  godkendt: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]",
  i_gang: "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.4)]",
  faerdig: "bg-green-eco shadow-[0_0_6px_rgba(34,197,94,0.4)]",
  afhentet: "bg-stone-400",
  bero: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]",
  reklamation_modtaget: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]",
  reklamation_vurderet: "bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.4)]",
  reklamation_loest: "bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.4)]",
};

/* ------------------------------------------------------------------ */
/*  Stat card config                                                   */
/* ------------------------------------------------------------------ */

const STAT_CARDS: { key: keyof DashboardStats; label: string; color: string; borderColor: string; isCurrency?: boolean }[] = [
  { key: "activeCases", label: "Aktive sager", color: "text-blue-600", borderColor: "via-blue-500" },
  { key: "pendingQuotes", label: "Ventende tilbud", color: "text-amber-600", borderColor: "via-amber-500" },
  { key: "finishedToday", label: "Faerdige i dag", color: "text-emerald-600", borderColor: "via-emerald-500" },
  { key: "revenueThisMonth", label: "Omsaetning", color: "text-violet-600", borderColor: "via-violet-500", isCurrency: true },
  { key: "newInquiries", label: "Nye henvendelser", color: "text-rose-600", borderColor: "via-rose-500" },
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DashboardStats {
  activeCases: number;
  pendingQuotes: number;
  finishedToday: number;
  revenueThisMonth: number;
  newInquiries: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

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
      try {
        const { data: allTickets } = await supabase
          .from("repair_tickets")
          .select("*")
          .order("created_at", { ascending: false });

        const tickets = (allTickets as RepairTicket[]) ?? [];

        const activeCases = tickets.filter((t) => t.status !== "afhentet").length;
        const pendingQuotes = tickets.filter((t) => t.status === "modtaget").length;

        const todayStr = new Date().toISOString().slice(0, 10);
        const finishedToday = tickets.filter(
          (t) => t.status === "faerdig" && t.updated_at.slice(0, 10) === todayStr
        ).length;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

        const { data: quotes } = await supabase
          .from("repair_quotes")
          .select("price_dkk, accepted_at")
          .gte("accepted_at", monthStart)
          .lte("accepted_at", monthEnd + "T23:59:59");

        const revenueThisMonth = (quotes ?? []).reduce(
          (sum: number, q: { price_dkk: number }) => sum + (q.price_dkk ?? 0),
          0
        );

        let newInquiries = 0;
        try {
          const { count } = await supabase
            .from("contact_inquiries")
            .select("*", { count: "exact", head: true })
            .eq("status", "ny");
          newInquiries = count ?? 0;
        } catch {
          // Table may not exist
        }

        setStats({ activeCases, pendingQuotes, finishedToday, revenueThisMonth, newInquiries });
        setRecentTickets(tickets.slice(0, 8));
      } catch (err) {
        console.error("Dashboard load error:", err);
      }
      setLoading(false);
    }
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
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

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-green-eco" />
          <p className="text-sm text-stone-400">Indlaeser dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h2 className="font-display text-xl font-bold tracking-tight text-charcoal sm:text-2xl">
          Dashboard
        </h2>
        <p className="mt-1 text-xs text-stone-400 sm:text-sm" suppressHydrationWarning>
          Overblik over din butik &middot;{" "}
          {new Date().toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:mb-8 sm:gap-3 lg:grid-cols-5">
        {STAT_CARDS.map((card) => {
          const value = stats[card.key];
          return (
            <div
              key={card.key}
              className="group relative overflow-hidden rounded-xl border border-stone-200/60 bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-5"
            >
              {/* Top accent line */}
              <div className={`absolute left-4 right-4 top-0 h-[2px] bg-gradient-to-r from-transparent ${card.borderColor} to-transparent opacity-50`} />

              <p className={`font-mono text-xl font-bold tracking-tight ${card.color} sm:text-2xl lg:text-3xl`}>
                {card.isCurrency ? formatCurrency(value) : value}
              </p>
              <p className="mt-1 text-[11px] font-medium text-stone-400 sm:mt-1.5 sm:text-xs">
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent tickets + Quick actions */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_280px]">
        {/* Recent tickets */}
        <div className="overflow-hidden rounded-xl border border-stone-200/60 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-charcoal">Seneste sager</h3>
            <Link
              href="/admin/reparationer"
              className="text-xs font-medium text-stone-400 transition-colors hover:text-green-eco"
            >
              Se alle &rarr;
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-stone-400">Ingen sager endnu.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/admin/reparationer/${ticket.id}`}
                  className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-stone-50"
                >
                  {/* Status dot */}
                  <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_COLORS[ticket.status]}`} />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-charcoal">
                      {ticket.customer_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-stone-400">
                      {ticket.device_model} &middot; {ticket.service_type}
                    </p>
                  </div>

                  {/* Status + Date */}
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[11px] font-medium text-stone-500">
                      {STATUS_LABELS[ticket.status]}
                    </span>
                    <span className="font-mono text-[10px] text-stone-300">
                      {formatDate(ticket.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-charcoal">Hurtige handlinger</h3>
          <Link
            href="/admin/indlevering"
            className="flex items-center gap-3 rounded-xl bg-green-eco px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-green-eco/15 transition-all hover:brightness-110 hover:shadow-lg hover:shadow-green-eco/20 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Ny indlevering
          </Link>
          <Link
            href="/admin/reparationer"
            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-medium text-charcoal shadow-sm transition-all hover:border-stone-300 hover:shadow-md"
          >
            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-5.383a2.025 2.025 0 01-.586-1.504c.012-.754.328-1.472.886-2.01a2.72 2.72 0 013.93.036l.455.457.457-.457a2.72 2.72 0 013.928-.036 2.72 2.72 0 01.037 3.514l-5.384 5.383a.75.75 0 01-1.06 0z" />
            </svg>
            Se alle sager
          </Link>
          <Link
            href="/admin/henvendelser"
            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-medium text-charcoal shadow-sm transition-all hover:border-stone-300 hover:shadow-md"
          >
            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Henvendelser
            {stats.newInquiries > 0 && (
              <span className="ml-auto rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                {stats.newInquiries}
              </span>
            )}
          </Link>
          <Link
            href="/admin/prisliste"
            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-medium text-charcoal shadow-sm transition-all hover:border-stone-300 hover:shadow-md"
          >
            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            </svg>
            Prisliste
          </Link>
          <Link
            href="/admin/kunder"
            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-medium text-charcoal shadow-sm transition-all hover:border-stone-300 hover:shadow-md"
          >
            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Kunder
          </Link>
        </div>
      </div>
    </div>
  );
}
