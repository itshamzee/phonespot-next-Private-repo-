"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Period = "today" | "week" | "month" | "quarter";

interface DashboardData {
  period: string;
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    onlineOrders: number;
    posOrders: number;
    devicesSold: number;
    skusSold: number;
    totalMargin: number;
    brugtmomsTotal: number;
    avgOrderValue: number;
  };
  inventory: {
    listedCount: number;
    retailValue: number;
    costValue: number;
    byLocation: Record<string, number>;
  };
  activity: {
    id: string;
    created_at: string;
    action: string;
    description: string;
    actor_name?: string;
  }[];
}

/* ------------------------------------------------------------------ */
/*  Period config                                                       */
/* ------------------------------------------------------------------ */

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "I dag" },
  { value: "week", label: "Uge" },
  { value: "month", label: "Måned" },
  { value: "quarter", label: "Kvartal" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDKK(valueInOre: number): string {
  return (valueInOre / 100).toLocaleString("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatMargin(margin: number, revenue: number): string {
  if (revenue === 0) return "0,0%";
  return ((margin / revenue) * 100).toFixed(1).replace(".", ",") + "%";
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Location name mapping (fallback)                                   */
/* ------------------------------------------------------------------ */

const LOCATION_NAMES: Record<string, string> = {
  lager: "Lager",
  butik: "Butik",
  online: "Online",
};

function locationLabel(id: string): string {
  return LOCATION_NAMES[id] ?? id;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EcommerceDashboard() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient();

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setError("Ikke logget ind");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/dashboard?period=${period}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json: DashboardData = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        if (!cancelled) setError("Kunne ikke hente dashboard-data");
      }
      if (!cancelled) setLoading(false);
    }

    fetchDashboard();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
            <div
              className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-b-emerald-500/20"
              style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
            />
          </div>
          <p className="text-sm text-charcoal/30">Indlæser e-commerce data...</p>
        </div>
      </div>
    );
  }

  /* ---- Error ---- */
  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-red-500">{error ?? "Ukendt fejl"}</p>
      </div>
    );
  }

  const { kpis, inventory, activity } = data;

  /* ---- KPI card definitions ---- */
  const kpiCards = [
    {
      label: "Omsætning",
      value: formatDKK(kpis.totalRevenue),
      sub: `Gns. ordre: ${formatDKK(kpis.avgOrderValue)}`,
      gradient: "from-emerald-500/10 to-emerald-500/[0.02]",
      iconColor: "text-emerald-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75" />
        </svg>
      ),
    },
    {
      label: "Ordrer",
      value: kpis.totalOrders.toString(),
      sub: `${kpis.onlineOrders} online · ${kpis.posOrders} POS`,
      gradient: "from-blue-500/10 to-blue-500/[0.02]",
      iconColor: "text-blue-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      ),
    },
    {
      label: "Enheder solgt",
      value: kpis.devicesSold.toString(),
      sub: `${kpis.skusSold} tilbehør`,
      gradient: "from-violet-500/10 to-violet-500/[0.02]",
      iconColor: "text-violet-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
      ),
    },
    {
      label: "Bruttomargin",
      value: formatMargin(kpis.totalMargin, kpis.totalRevenue),
      sub: `${formatDKK(kpis.totalMargin)} margin`,
      gradient: "from-amber-500/10 to-amber-500/[0.02]",
      iconColor: "text-amber-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      ),
    },
  ];

  const locationEntries = Object.entries(inventory.byLocation);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-1 rounded-xl bg-charcoal/[0.03] p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
              period === p.value
                ? "bg-white text-charcoal shadow-sm"
                : "text-charcoal/40 hover:text-charcoal/60"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpiCards.map((card, i) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-2xl border border-black/[0.04] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
            <div className="relative">
              <div className={`mb-3 ${card.iconColor} opacity-60`}>{card.icon}</div>
              <p className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
                {card.value}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-charcoal/30">
                {card.label}
              </p>
              <p className="mt-1 text-xs text-charcoal/35">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Inventory by location */}
      <div>
        <h3 className="mb-3 font-display text-[15px] font-bold text-charcoal">Lagerbeholdning</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Summary card */}
          <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/30">
              Total beholdning
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-charcoal">
              {inventory.listedCount} enheder
            </p>
            <div className="mt-2 space-y-1 text-xs text-charcoal/40">
              <p>Detailværdi: {formatDKK(inventory.retailValue)}</p>
              <p>Kostpris: {formatDKK(inventory.costValue)}</p>
            </div>
          </div>

          {/* Per-location cards */}
          {locationEntries.map(([locId, count]) => (
            <div
              key={locId}
              className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/30">
                {locationLabel(locId)}
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-charcoal">
                {count} enheder
              </p>
            </div>
          ))}

          {locationEntries.length === 0 && (
            <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
              <p className="text-sm text-charcoal/30">Ingen lokationsdata</p>
            </div>
          )}
        </div>
      </div>

      {/* Activity feed */}
      <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
        <div className="px-6 py-4">
          <h3 className="font-display text-[15px] font-bold text-charcoal">Seneste aktivitet</h3>
        </div>

        {activity.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-charcoal/30">Ingen aktivitet registreret</p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.03]">
            {activity.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-6 py-3">
                {/* Action type badge */}
                <span className="mt-0.5 shrink-0 rounded-full bg-charcoal/[0.05] px-2.5 py-0.5 text-[10px] font-semibold text-charcoal/50">
                  {entry.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-charcoal">{entry.description}</p>
                  {entry.actor_name && (
                    <p className="text-xs text-charcoal/30">{entry.actor_name}</p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-charcoal/25">
                  {formatTimestamp(entry.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
