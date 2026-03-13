"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatOere } from "@/lib/cart/utils";

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

      // Fetch location name
      const { data: loc } = await supabase
        .from("locations")
        .select("name")
        .eq("id", locationId)
        .single();
      if (loc) setLocationName(loc.name);

      // Fetch cashup data
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
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-stone-400">Ingen lokation valgt</p>
        <a href="/admin/platform/pos" className="mt-2 inline-block text-sm text-green-600 hover:underline">
          Tilbage til POS
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <a href="/admin/platform/pos" className="text-sm text-stone-500 hover:text-stone-700">
            ← Tilbage til POS
          </a>
          <h1 className="mt-1 text-2xl font-bold text-stone-800">
            Dagsoversigt — {locationName}
          </h1>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-stone-400">Indlaeser...</div>
      ) : !data ? (
        <div className="py-12 text-center text-stone-400">Ingen data</div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-stone-400">Total omsaetning</p>
              <p className="mt-1 text-2xl font-bold text-stone-800">{formatOere(data.totalSales)}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-stone-400">Antal salg</p>
              <p className="mt-1 text-2xl font-bold text-stone-800">{data.totalOrders}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-stone-400">Enheder solgt</p>
              <p className="mt-1 text-2xl font-bold text-stone-800">{data.deviceCount}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-stone-400">Tilbehor solgt</p>
              <p className="mt-1 text-2xl font-bold text-stone-800">{data.skuCount}</p>
            </div>
          </div>

          {/* Payment method breakdown */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-400">
              Fordelt per betalingsmetode
            </h2>
            <div className="space-y-3">
              {Object.entries(data.byPaymentMethod).map(([method, stats]) => (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-stone-700">
                      {PAYMENT_LABELS[method] ?? method}
                    </span>
                    <span className="text-xs text-stone-400">
                      ({stats.count} {stats.count === 1 ? "salg" : "salg"})
                    </span>
                  </div>
                  <span className="text-sm font-bold text-stone-800">
                    {formatOere(stats.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction list */}
          <div className="rounded-xl border border-stone-200 bg-white">
            <h2 className="border-b border-stone-100 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
              Transaktioner
            </h2>
            {data.orders.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-stone-400">
                Ingen salg denne dag
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left text-xs text-stone-400">
                    <th className="px-5 py-2 font-medium">Ordre</th>
                    <th className="px-5 py-2 font-medium">Tid</th>
                    <th className="px-5 py-2 font-medium">Betaling</th>
                    <th className="px-5 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order) => (
                    <tr key={order.id} className="border-b border-stone-100 last:border-0">
                      <td className="px-5 py-3">
                        <a
                          href={`/admin/platform/orders/${order.id}`}
                          className="font-medium text-green-600 hover:underline"
                        >
                          {order.orderNumber}
                        </a>
                      </td>
                      <td className="px-5 py-3 text-stone-500">
                        {order.confirmedAt
                          ? new Date(order.confirmedAt).toLocaleTimeString("da-DK", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-stone-500">
                        {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-stone-800">
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
