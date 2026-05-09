"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  KpiCard,
  Sparkline,
  AbandonedTile,
  LowStockTile,
  TopProductsTile,
  pctDelta,
  type DashboardData,
} from "./tiles";
import { Ga4Tile } from "./ga4-tile";

/* ------------------------------------------------------------------ */
/*  Period config                                                      */
/* ------------------------------------------------------------------ */

type Period = "today" | "week" | "month" | "quarter";

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

const LOCATION_NAMES: Record<string, string> = {
  lager: "Lager",
  butik: "Butik",
  online: "Online",
};

function locationLabel(id: string): string {
  return LOCATION_NAMES[id] ?? id.slice(0, 8);
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

  const { kpis, previous, inventory, activity, timeSeries, topProducts, lowStock, abandoned } =
    data;

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

      {/* KPI cards — row 1 with deltas vs previous period */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Omsætning"
          value={formatDKK(kpis.totalRevenue)}
          sub={`Gns. ordre: ${formatDKK(kpis.avgOrderValue)}`}
          delta={pctDelta(kpis.totalRevenue, previous.totalRevenue)}
          accent="emerald"
        />
        <KpiCard
          label="Ordrer"
          value={String(kpis.totalOrders)}
          sub={`${kpis.onlineOrders} online · ${kpis.posOrders} POS`}
          delta={pctDelta(kpis.totalOrders, previous.totalOrders)}
          accent="blue"
        />
        <KpiCard
          label="Enheder solgt"
          value={String(kpis.devicesSold)}
          sub={`${kpis.skusSold} tilbehør`}
          delta={pctDelta(kpis.devicesSold, previous.devicesSold)}
          accent="violet"
        />
        <KpiCard
          label="Bruttomargin"
          value={formatMargin(kpis.totalMargin, kpis.totalRevenue)}
          sub={`${formatDKK(kpis.totalMargin)} margin`}
          delta={pctDelta(kpis.totalMargin, previous.totalMargin)}
          accent="amber"
        />
      </div>

      {/* Sparkline chart — revenue + orders, last 30 days */}
      <Sparkline data={timeSeries} />

      {/* GA4 traffic snapshot */}
      <Ga4Tile />

      {/* Action row — abandoned + low stock alerts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AbandonedTile abandoned={abandoned} />
        <LowStockTile lowStock={lowStock} />
      </div>

      {/* Top products + Inventory by location */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopProductsTile products={topProducts} />

        <div>
          <h3 className="mb-3 font-display text-[15px] font-bold text-charcoal">Lagerbeholdning</h3>
          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>
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
                <span className="mt-0.5 shrink-0 rounded-full bg-charcoal/[0.05] px-2.5 py-0.5 text-[10px] font-semibold text-charcoal/50">
                  {entry.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-charcoal">
                    <span className="text-charcoal/35">{entry.entity_type}</span>
                  </p>
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
