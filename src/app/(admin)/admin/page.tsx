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
  faerdig: "F\u00e6rdig",
  afhentet: "Afhentet",
  bero: "Bero",
  reklamation_modtaget: "Reklamation modtaget",
  reklamation_vurderet: "Reklamation vurderet",
  reklamation_loest: "Reklamation l\u00f8st",
};

const STATUS_COLORS: Record<RepairStatus, string> = {
  modtaget: "bg-blue-400",
  diagnostik: "bg-indigo-400",
  tilbud_sendt: "bg-amber-400",
  godkendt: "bg-emerald-400",
  i_gang: "bg-orange-400",
  faerdig: "bg-green-400",
  afhentet: "bg-stone-300",
  bero: "bg-rose-400",
  reklamation_modtaget: "bg-red-400",
  reklamation_vurderet: "bg-purple-400",
  reklamation_loest: "bg-teal-400",
};

/* ------------------------------------------------------------------ */
/*  Stat card definitions                                              */
/* ------------------------------------------------------------------ */

const STAT_CARDS: {
  key: keyof DashboardStats;
  label: string;
  gradient: string;
  iconColor: string;
  icon: React.ReactNode;
  isCurrency?: boolean;
}[] = [
  {
    key: "activeCases",
    label: "Aktive sager",
    gradient: "from-blue-500/10 to-blue-500/[0.02]",
    iconColor: "text-blue-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-5.383a2.025 2.025 0 01-.586-1.504c.012-.754.328-1.472.886-2.01a2.72 2.72 0 013.93.036l.455.457.457-.457a2.72 2.72 0 013.928-.036 2.72 2.72 0 01.037 3.514l-5.384 5.383a.75.75 0 01-1.06 0z" />
      </svg>
    ),
  },
  {
    key: "pendingQuotes",
    label: "Ventende tilbud",
    gradient: "from-amber-500/10 to-amber-500/[0.02]",
    iconColor: "text-amber-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "finishedToday",
    label: "F\u00e6rdige i dag",
    gradient: "from-emerald-500/10 to-emerald-500/[0.02]",
    iconColor: "text-emerald-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "revenueThisMonth",
    label: "Oms\u00e6tning",
    gradient: "from-violet-500/10 to-violet-500/[0.02]",
    iconColor: "text-violet-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    isCurrency: true,
  },
  {
    key: "newInquiries",
    label: "Nye henvendelser",
    gradient: "from-rose-500/10 to-rose-500/[0.02]",
    iconColor: "text-rose-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Quick actions                                                      */
/* ------------------------------------------------------------------ */

const QUICK_ACTIONS = [
  {
    href: "/admin/indlevering",
    label: "Ny indlevering",
    desc: "Modtag enhed til reparation",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    primary: true,
  },
  {
    href: "/admin/platform/pos",
    label: "Kasseapparat",
    desc: "Start nyt salg",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75" />
      </svg>
    ),
  },
  {
    href: "/admin/platform/stock",
    label: "Lagerstyring",
    desc: "Se lagerstatus",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
  },
  {
    href: "/admin/platform/orders",
    label: "Ordrer",
    desc: "Administrer ordrer",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
  },
  {
    href: "/admin/reparationer",
    label: "Reparationer",
    desc: "Se alle sager",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-5.383a2.025 2.025 0 01-.586-1.504c.012-.754.328-1.472.886-2.01a2.72 2.72 0 013.93.036l.455.457.457-.457a2.72 2.72 0 013.928-.036 2.72 2.72 0 01.037 3.514l-5.384 5.383a.75.75 0 01-1.06 0z" />
      </svg>
    ),
  },
  {
    href: "/admin/kunder",
    label: "Kunder",
    desc: "Kundeoversigt",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
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
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
            <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-b-emerald-500/20" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-sm text-charcoal/30">Indl\u00e6ser dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-charcoal/35" suppressHydrationWarning>
          {new Date().toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {STAT_CARDS.map((card, i) => {
          const value = stats[card.key];
          return (
            <div
              key={card.key}
              className="group relative overflow-hidden rounded-2xl border border-black/[0.04] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Gradient bg */}
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.gradient}`} />

              <div className="relative">
                <div className={`mb-3 ${card.iconColor} opacity-60`}>
                  {card.icon}
                </div>
                <p className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
                  {card.isCurrency ? formatCurrency(value) : value}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-charcoal/30">
                  {card.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Recent tickets */}
        <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <h3 className="font-display text-[15px] font-bold text-charcoal">Seneste sager</h3>
            <Link
              href="/admin/reparationer"
              className="text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
            >
              Se alle &rarr;
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/[0.03]">
                <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <p className="text-sm text-charcoal/30">Ingen sager endnu</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.03]">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/admin/reparationer/${ticket.id}`}
                  className="group/row flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-black/[0.015]"
                >
                  {/* Status dot */}
                  <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_COLORS[ticket.status]}`} />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-charcoal group-hover/row:text-emerald-700">
                      {ticket.customer_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-charcoal/35">
                      {ticket.device_model} &middot; {ticket.service_type}
                    </p>
                  </div>

                  {/* Status badge + date */}
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full bg-charcoal/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-charcoal/50">
                      {STATUS_LABELS[ticket.status]}
                    </span>
                    <span className="text-[10px] font-medium text-charcoal/20">
                      {formatDate(ticket.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <h3 className="mb-4 font-display text-[15px] font-bold text-charcoal">Hurtige handlinger</h3>
          <div className="flex flex-col gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`group flex items-center gap-3.5 rounded-xl px-4 py-3.5 transition-all duration-150 ${
                  action.primary
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/15 hover:shadow-lg hover:shadow-emerald-500/25 hover:brightness-110 active:scale-[0.98]"
                    : "border border-black/[0.04] bg-white text-charcoal shadow-sm hover:-translate-y-px hover:shadow-md"
                }`}
              >
                <div className={action.primary ? "text-white/80" : "text-charcoal/25 group-hover:text-emerald-500 transition-colors"}>
                  {action.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${action.primary ? "" : "group-hover:text-emerald-700 transition-colors"}`}>
                    {action.label}
                  </p>
                  <p className={`text-[11px] ${action.primary ? "text-white/60" : "text-charcoal/30"}`}>
                    {action.desc}
                  </p>
                </div>
                <svg className={`h-4 w-4 ${action.primary ? "text-white/40" : "text-charcoal/15"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
