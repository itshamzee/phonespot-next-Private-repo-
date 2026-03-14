"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatOere } from "@/lib/cart/utils";
import Link from "next/link";

type CashupData = {
  date: string;
  locationId: string;
  totalOrders: number;
  totalSales: number;
  deviceCount: number;
  skuCount: number;
  byPaymentMethod: Record<string, { count: number; total: number }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    paymentMethod: string;
    confirmedAt: string;
  }>;
};

const PAYMENT_LABELS: Record<string, string> = {
  card: "Kort",
  cash: "Kontant",
  mobilepay: "MobilePay",
};

export default function CashupPage() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get("location_id") ?? "";
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<CashupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("");

  const supabase = createBrowserClient();

  useEffect(() => {
    if (!locationId) return;

    async function load() {
      setLoading(true);

      const { data: loc } = await supabase
        .from("locations")
        .select("name")
        .eq("id", locationId)
        .single();
      if (loc) setLocationName(loc.name);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `/api/pos/cashup?location_id=${locationId}&date=${date}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      if (res.ok) {
        setData(await res.json());
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, date]);

  if (!locationId) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center">
        <div className="mb-3 flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-charcoal/[0.03]">
          <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-charcoal/30">Ingen lokation valgt</p>
        <Link href="/admin/platform/pos" className="mt-2 inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-700">
          \u2190 Tilbage til POS
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/platform/pos" className="text-sm font-semibold text-charcoal/35 transition-colors hover:text-charcoal/60">
            \u2190 Tilbage til POS
          </Link>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Dagsoversigt \u2014 {locationName}
          </h2>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm text-charcoal shadow-sm transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
            <p className="text-sm text-charcoal/30">Indl\u00e6ser...</p>
          </div>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white py-20 shadow-sm">
          <p className="text-sm font-medium text-charcoal/30">Ingen data</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-charcoal/35">Total oms\u00e6tning</p>
                  <p className="text-2xl font-bold text-charcoal">{formatOere(data.totalSales)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-charcoal/35">Antal salg</p>
                  <p className="text-2xl font-bold text-charcoal">{data.totalOrders}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                  <svg className="h-5 w-5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-charcoal/35">Enheder solgt</p>
                  <p className="text-2xl font-bold text-charcoal">{data.deviceCount}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-charcoal/35">Tilbeh\u00f8r solgt</p>
                  <p className="text-2xl font-bold text-charcoal">{data.skuCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment method breakdown */}
          <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-charcoal/35">
              Fordelt per betalingsmetode
            </h3>
            <div className="space-y-3">
              {Object.entries(data.byPaymentMethod).map(([method, stats]) => (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-charcoal">{PAYMENT_LABELS[method] ?? method}</span>
                    <span className="rounded-full bg-charcoal/[0.04] px-2 py-0.5 text-[10px] font-bold text-charcoal/30">
                      {stats.count} salg
                    </span>
                  </div>
                  <span className="text-sm font-bold text-charcoal">{formatOere(stats.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction list */}
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
            <div className="border-b border-black/[0.03] px-6 py-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-charcoal/35">
                Transaktioner
              </h3>
            </div>
            {data.orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm font-medium text-charcoal/30">Ingen salg denne dag</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.03] text-left text-[11px] font-bold uppercase tracking-wider text-charcoal/30">
                    <th className="px-6 py-3">Ordre</th>
                    <th className="px-6 py-3">Tid</th>
                    <th className="px-6 py-3">Betaling</th>
                    <th className="px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.02]">
                  {data.orders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-black/[0.015]">
                      <td className="px-6 py-3">
                        <Link
                          href={`/admin/platform/orders/${order.id}`}
                          className="font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-charcoal/40">
                        {order.confirmedAt
                          ? new Date(order.confirmedAt).toLocaleTimeString("da-DK", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "\u2014"}
                      </td>
                      <td className="px-6 py-3 text-charcoal/40">
                        {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-charcoal">
                        {formatOere(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
