"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatOere } from "@/lib/cart/utils";
import {
  KpiCard,
  Sparkline,
  AbandonedTile,
  LowStockTile,
  TopProductsTile,
  pctDelta,
  type DashboardData,
} from "@/components/admin/dashboard/tiles";

const PERIOD_LABELS: Record<string, string> = {
  today: "I dag",
  week: "Sidste 7 dage",
  month: "Denne måned",
  quarter: "Sidste kvartal",
};

export default function PlatformDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  const supabase = createBrowserClient();

  useEffect(() => {
    supabase
      .from("locations")
      .select("id, name")
      .then(({ data }) => {
        if (data) setLocations(data);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`/api/dashboard?period=${period}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  function locationName(id: string): string {
    return locations.find((l) => l.id === id)?.name ?? id.slice(0, 8);
  }

  function formatDate(iso: string): string {
    return new Intl.DateTimeFormat("da-DK", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Platform Dashboard
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35" suppressHydrationWarning>
            {PERIOD_LABELS[period]} · sammenlignet med forrige periode
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-black/[0.04] bg-white p-1 shadow-sm">
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all ${
                period === key
                  ? "bg-charcoal text-white shadow-sm"
                  : "text-charcoal/40 hover:text-charcoal/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
            <p className="text-sm text-charcoal/30">Indlæser dashboard...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI cards — row 1 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Omsætning"
              value={formatOere(data.kpis.totalRevenue)}
              delta={pctDelta(data.kpis.totalRevenue, data.previous.totalRevenue)}
              accent="emerald"
            />
            <KpiCard
              label="Ordrer"
              value={String(data.kpis.totalOrders)}
              sub={`${data.kpis.onlineOrders} online · ${data.kpis.posOrders} POS`}
              delta={pctDelta(data.kpis.totalOrders, data.previous.totalOrders)}
              accent="blue"
            />
            <KpiCard
              label="Enheder solgt"
              value={String(data.kpis.devicesSold)}
              delta={pctDelta(data.kpis.devicesSold, data.previous.devicesSold)}
              accent="violet"
            />
            <KpiCard
              label="Tilbehør solgt"
              value={String(data.kpis.skusSold)}
              delta={pctDelta(data.kpis.skusSold, data.previous.skusSold)}
              accent="amber"
            />
          </div>

          {/* KPI cards — row 2 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Bruttomargin"
              value={formatOere(data.kpis.totalMargin)}
              delta={pctDelta(data.kpis.totalMargin, data.previous.totalMargin)}
              accent="emerald"
            />
            <KpiCard
              label="Gns. ordreværdi"
              value={formatOere(data.kpis.avgOrderValue)}
              delta={pctDelta(data.kpis.avgOrderValue, data.previous.avgOrderValue)}
              accent="violet"
            />
            <KpiCard
              label="Brugtmoms (skyldig)"
              value={formatOere(data.kpis.brugtmomsTotal)}
              accent="rose"
            />
            <KpiCard
              label="Lager (enheder)"
              value={String(data.inventory.listedCount)}
              sub={`Værdi: ${formatOere(data.inventory.retailValue)}`}
              accent="blue"
            />
          </div>

          {/* Sparkline chart — revenue + orders, last 30 days */}
          <Sparkline data={data.timeSeries} />

          {/* Action row — abandoned + low stock alerts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AbandonedTile abandoned={data.abandoned} />
            <LowStockTile lowStock={data.lowStock} />
          </div>

          {/* Top products + inventory by location + activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <TopProductsTile products={data.topProducts} />

            <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-charcoal/35">
                Lager per lokation
              </h3>
              <div className="space-y-3">
                {Object.entries(data.inventory.byLocation).map(([locId, count]) => (
                  <div key={locId} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-charcoal/70">
                      {locationName(locId)}
                    </span>
                    <span className="rounded-full bg-charcoal/[0.04] px-2.5 py-1 text-[10px] font-bold text-charcoal/35">
                      {count} enheder
                    </span>
                  </div>
                ))}
                {Object.keys(data.inventory.byLocation).length === 0 && (
                  <p className="text-sm text-charcoal/30">Ingen enheder på lager</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-charcoal/35">
                Seneste aktivitet
              </h3>
              {data.activity.length === 0 ? (
                <p className="text-sm text-charcoal/30">Ingen aktivitet endnu</p>
              ) : (
                <div className="max-h-80 space-y-3 overflow-y-auto">
                  {data.activity.map((entry) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500/40" />
                      <div className="flex-1">
                        <p className="text-sm text-charcoal/70">
                          <span className="font-semibold text-charcoal">{entry.action}</span>{" "}
                          <span className="text-charcoal/35">({entry.entity_type})</span>
                        </p>
                        <p className="text-xs text-charcoal/25">{formatDate(entry.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
