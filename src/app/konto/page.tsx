"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatOere } from "@/lib/cart/utils";

type CustomerData = {
  customer: { id: string; name: string; email: string; phone: string | null };
  orders: Array<{ id: string; order_number: string; status: string; total: number; created_at: string }>;
  warranties: Array<{ id: string; guarantee_number: string; status: string; expires_at: string }>;
  tradeIns: Array<{ id: string; status: string; device_description: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Afventer",
  confirmed: "Bekraeftet",
  shipped: "Afsendt",
  picked_up: "Afhentet",
  delivered: "Leveret",
  cancelled: "Annulleret",
  refunded: "Refunderet",
};

export default function AccountOverview() {
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/customer", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-stone-400">Indlaeser...</div>;
  }

  if (!data) {
    return <div className="py-12 text-center text-stone-400">Kunne ikke hente kontooplysninger</div>;
  }

  const activeWarranties = data.warranties.filter((w) => w.status === "active").length;
  const recentOrders = data.orders.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-bold text-stone-800">
          Hej, {data.customer.name}!
        </h2>
        <p className="mt-1 text-sm text-stone-500">{data.customer.email}</p>
        {data.customer.phone && (
          <p className="text-sm text-stone-500">{data.customer.phone}</p>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-stone-800">{data.orders.length}</p>
          <p className="text-xs text-stone-500">Ordrer</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{activeWarranties}</p>
          <p className="text-xs text-stone-500">Aktive garantier</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-stone-800">{data.tradeIns.length}</p>
          <p className="text-xs text-stone-500">Trade-ins</p>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-stone-700">Seneste ordrer</h3>
          <a href="/konto/ordrer" className="text-xs text-green-600 hover:underline">Se alle</a>
        </div>
        {recentOrders.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-stone-400">Ingen ordrer endnu</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentOrders.map((order) => (
              <a
                key={order.id}
                href={`/konto/ordrer#${order.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-stone-50"
              >
                <div>
                  <p className="text-sm font-medium text-stone-800">{order.order_number}</p>
                  <p className="text-xs text-stone-500">
                    {new Date(order.created_at).toLocaleDateString("da-DK")} · {STATUS_LABELS[order.status] ?? order.status}
                  </p>
                </div>
                <span className="text-sm font-bold text-stone-800">{formatOere(order.total)}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Data export / deletion */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-stone-700">Dine data (GDPR)</h3>
        <p className="mb-4 text-xs text-stone-500">
          Du kan eksportere eller slette dine personoplysninger i henhold til GDPR.
        </p>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;
              const res = await fetch("/api/gdpr/export", {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "mine-data.json";
                a.click();
              }
            }}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Eksporter mine data
          </button>
        </div>
      </div>
    </div>
  );
}
