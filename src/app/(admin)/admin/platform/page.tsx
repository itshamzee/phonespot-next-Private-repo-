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
  month: "Denne m\u00e5ned",
  quarter: "Sidste kvartal",
};

const KPI_ICONS: Record<string, React.ReactNode> = {
  revenue: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  ),
  orders: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  devices: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  ),
  accessories: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
};

export default function PlatformDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  const supabase = createBrowserClient();

  useEffect(() => {
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
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Platform Dashboard
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35" suppressHydrationWarning>
            {PERIOD_LABELS[period]}
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
            <p className="text-sm text-charcoal/30">Indl\u00e6ser dashboard...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI cards — row 1 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard icon={KPI_ICONS.revenue} label="Oms\u00e6tning" value={formatOere(data.kpis.totalRevenue)} accent="emerald" />
            <KpiCard icon={KPI_ICONS.orders} label="Ordrer" value={String(data.kpis.totalOrders)} sub={`${data.kpis.onlineOrders} online \u00b7 ${data.kpis.posOrders} POS`} accent="blue" />
            <KpiCard icon={KPI_ICONS.devices} label="Enheder solgt" value={String(data.kpis.devicesSold)} accent="violet" />
            <KpiCard icon={KPI_ICONS.accessories} label="Tilbeh\u00f8r solgt" value={String(data.kpis.skusSold)} accent="amber" />
          </div>

          {/* KPI cards — row 2 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Bruttomargin" value={formatOere(data.kpis.totalMargin)} accent="emerald" />
            <KpiCard label="Gns. ordrev\u00e6rdi" value={formatOere(data.kpis.avgOrderValue)} accent="violet" />
            <KpiCard label="Brugtmoms (skyldig)" value={formatOere(data.kpis.brugtmomsTotal)} accent="rose" />
            <KpiCard label="Lager (enheder)" value={String(data.inventory.listedCount)} sub={`V\u00e6rdi: ${formatOere(data.inventory.retailValue)}`} accent="blue" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Inventory by location */}
            <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-charcoal/35">
                Lager per lokation
              </h3>
              <div className="space-y-3">
                {Object.entries(data.inventory.byLocation).map(([locId, count]) => (
                  <div key={locId} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-charcoal/70">{locationName(locId)}</span>
                    <span className="rounded-full bg-charcoal/[0.04] px-2.5 py-1 text-[10px] font-bold text-charcoal/35">
                      {count} enheder
                    </span>
                  </div>
                ))}
                {Object.keys(data.inventory.byLocation).length === 0 && (
                  <p className="text-sm text-charcoal/30">Ingen enheder p\u00e5 lager</p>
                )}
              </div>
            </div>

            {/* Activity feed */}
            <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm lg:col-span-2">
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
                          <span className="font-semibold text-charcoal">{entry.action}</span>
                          {" "}
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

function KpiCard({ icon, label, value, sub, accent }: { icon?: React.ReactNode; label: string; value: string; sub?: string; accent: string }) {
  const accentMap: Record<string, { bg: string; text: string }> = {
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-600" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-600" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-600" },
    rose: { bg: "bg-rose-500/10", text: "text-rose-600" },
  };
  const a = accentMap[accent] ?? accentMap.emerald;

  return (
    <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm transition-all hover:shadow-md">
      {icon && (
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${a.bg} ${a.text}`}>
          {icon}
        </div>
      )}
      <p className="text-[13px] font-semibold text-charcoal/35">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold ${a.text}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-charcoal/30">{sub}</p>}
    </div>
  );
}
