"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatOere } from "@/lib/cart/utils";

type DashboardData = {
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
  activity: Array<{
    id: string;
    action: string;
    entity_type: string;
    details: Record<string, unknown>;
    created_at: string;
  }>;
};

const PERIOD_LABELS: Record<string, string> = {
  today: "I dag",
  week: "Sidste 7 dage",
  month: "Denne maaned",
  quarter: "Sidste kvartal",
};

export default function PlatformDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  const supabase = createBrowserClient();

  useEffect(() => {
    // Load locations for labels
    supabase.from("locations").select("id, name").then(({ data }) => {
      if (data) setLocations(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/dashboard?period=${period}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
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
          <h1 className="text-2xl font-bold text-stone-800">Platform Dashboard</h1>
          <p className="mt-1 text-sm text-stone-400" suppressHydrationWarning>
            {PERIOD_LABELS[period]} &middot;{" "}
            {new Date().toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-stone-200 bg-white p-1">
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === key
                  ? "bg-green-600 text-white"
                  : "text-stone-500 hover:bg-stone-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <div className="py-20 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-green-600" />
          <p className="mt-3 text-sm text-stone-400">Indlaeser...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Omsaetning" value={formatOere(data.kpis.totalRevenue)} accent="text-green-600" />
            <KpiCard label="Ordrer" value={String(data.kpis.totalOrders)} sub={`${data.kpis.onlineOrders} online · ${data.kpis.posOrders} POS`} accent="text-blue-600" />
            <KpiCard label="Enheder solgt" value={String(data.kpis.devicesSold)} accent="text-indigo-600" />
            <KpiCard label="Tilbehor solgt" value={String(data.kpis.skusSold)} accent="text-amber-600" />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Bruttomargin" value={formatOere(data.kpis.totalMargin)} accent="text-emerald-600" />
            <KpiCard label="Gns. ordrevaerdi" value={formatOere(data.kpis.avgOrderValue)} accent="text-violet-600" />
            <KpiCard label="Brugtmoms (skyldig)" value={formatOere(data.kpis.brugtmomsTotal)} accent="text-rose-600" />
            <KpiCard label="Lager (enheder)" value={String(data.inventory.listedCount)} sub={`Vaerdi: ${formatOere(data.inventory.retailValue)}`} accent="text-stone-600" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Inventory by location */}
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-400">
                Lager per lokation
              </h2>
              <div className="space-y-3">
                {Object.entries(data.inventory.byLocation).map(([locId, count]) => (
                  <div key={locId} className="flex items-center justify-between">
                    <span className="text-sm text-stone-700">{locationName(locId)}</span>
                    <span className="text-sm font-bold text-stone-800">{count} enheder</span>
                  </div>
                ))}
                {Object.keys(data.inventory.byLocation).length === 0 && (
                  <p className="text-sm text-stone-400">Ingen enheder pa lager</p>
                )}
              </div>
            </div>

            {/* Activity feed */}
            <div className="rounded-xl border border-stone-200 bg-white p-5 lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-400">
                Seneste aktivitet
              </h2>
              {data.activity.length === 0 ? (
                <p className="text-sm text-stone-400">Ingen aktivitet endnu</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {data.activity.map((entry) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-stone-300" />
                      <div className="flex-1">
                        <p className="text-sm text-stone-700">
                          <span className="font-medium">{entry.action}</span>
                          {" "}
                          <span className="text-stone-500">({entry.entity_type})</span>
                        </p>
                        <p className="text-xs text-stone-400">{formatDate(entry.created_at)}</p>
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

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-stone-400">{sub}</p>}
    </div>
  );
}
