"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatOere } from "@/lib/cart/utils";

type CustomerData = {
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    addresses: Address[];
  };
  orders: Array<{
    id: string;
    order_number: string;
    status: string;
    total: number;
    created_at: string;
  }>;
  warranties: Array<{
    id: string;
    guarantee_number: string;
    status: string;
    expires_at: string;
  }>;
  tradeIns: Array<{ id: string; status: string; device_description: string }>;
};

type Address = {
  id?: string;
  name: string;
  line1: string;
  postal_code: string;
  city: string;
  phone?: string;
  is_default?: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Afventer betaling",
  confirmed: "Bekraeftet",
  shipped: "Afsendt",
  picked_up: "Afhentet",
  delivered: "Leveret",
  cancelled: "Annulleret",
  refunded: "Refunderet",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-200",
  shipped: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  picked_up: "bg-green-50 text-green-700 ring-green-200",
  delivered: "bg-green-50 text-green-700 ring-green-200",
  cancelled: "bg-[#F5F2EC] text-[#6E6E73] ring-[#E5E5EA]",
  refunded: "bg-red-50 text-red-700 ring-red-200",
};

function StatCard({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[#E5E5EA] bg-white p-5">
      <p className={`text-3xl font-bold tabular-nums ${accent ? "text-[#1A3D2E]" : "text-[#111111]"}`}>
        {value}
      </p>
      <p className="mt-1 text-sm text-[#6E6E73]">{label}</p>
    </div>
  );
}

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
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E5EA] border-t-[#1A3D2E]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-[#E5E5EA] bg-white px-6 py-12 text-center">
        <p className="text-sm text-[#6E6E73]">Kunne ikke hente kontooplysninger. Prov igen.</p>
      </div>
    );
  }

  const activeWarranties = data.warranties.filter(
    (w) => w.status === "active" && new Date(w.expires_at) > new Date()
  ).length;
  const recentOrders = data.orders.slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Oversigt</h1>
        <p className="mt-1 text-sm text-[#6E6E73]">
          Velkommen tilbage, {data.customer.name.split(" ")[0]}
        </p>
      </div>

      {/* Welcome card */}
      <div className="rounded-xl border border-[#E5E5EA] bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#111111]">{data.customer.name}</h2>
            <p className="mt-0.5 text-sm text-[#6E6E73]">{data.customer.email}</p>
            {data.customer.phone && (
              <p className="mt-0.5 text-sm text-[#6E6E73]">{data.customer.phone}</p>
            )}
          </div>
          <Link
            href="/konto/indstillinger"
            className="shrink-0 rounded-lg border border-[#E5E5EA] px-3 py-1.5 text-xs font-medium text-[#6E6E73] transition hover:bg-[#F5F2EC] hover:text-[#111111]"
          >
            Rediger profil
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard value={data.orders.length} label="Ordrer i alt" />
        <StatCard value={activeWarranties} label="Aktive garantier" accent />
        <StatCard value={data.tradeIns.length} label="Trade-ins" />
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-[#E5E5EA] bg-white">
        <div className="flex items-center justify-between border-b border-[#E5E5EA] px-5 py-3.5">
          <h3 className="text-sm font-semibold text-[#111111]">Seneste ordrer</h3>
          <Link href="/konto/ordrer" className="text-xs font-medium text-[#1A3D2E] hover:underline">
            Se alle
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-[#6E6E73]">Ingen ordrer endnu</p>
            <Link
              href="/mobiler"
              className="mt-3 inline-block text-xs font-medium text-[#1A3D2E] hover:underline"
            >
              Se vores udvalg
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#E5E5EA]">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/konto/ordrer#${order.id}`}
                  className="flex items-center justify-between px-5 py-3.5 transition hover:bg-[#F5F2EC]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#111111]">{order.order_number}</p>
                    <p className="mt-0.5 text-xs text-[#6E6E73]">
                      {new Date(order.created_at).toLocaleDateString("da-DK", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_COLORS[order.status] ?? "bg-[#F5F2EC] text-[#6E6E73] ring-[#E5E5EA]"}`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span className="text-sm font-semibold text-[#111111]">
                      {formatOere(order.total)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/konto/ordrer"
          className="flex items-center justify-between rounded-xl border border-[#E5E5EA] bg-white px-5 py-4 transition hover:border-[#1A3D2E]/30 hover:bg-[#F5F2EC]"
        >
          <div>
            <p className="text-sm font-semibold text-[#111111]">Mine ordrer</p>
            <p className="mt-0.5 text-xs text-[#6E6E73]">Ordrehistorik og sporingsinfo</p>
          </div>
          <svg className="h-5 w-5 text-[#AEAEB2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
        <Link
          href="/konto/garantier"
          className="flex items-center justify-between rounded-xl border border-[#E5E5EA] bg-white px-5 py-4 transition hover:border-[#1A3D2E]/30 hover:bg-[#F5F2EC]"
        >
          <div>
            <p className="text-sm font-semibold text-[#111111]">Garantibeviser</p>
            <p className="mt-0.5 text-xs text-[#6E6E73]">Se og download garantidokumentation</p>
          </div>
          <svg className="h-5 w-5 text-[#AEAEB2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
