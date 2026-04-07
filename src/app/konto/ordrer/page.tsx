"use client";

import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatOere } from "@/lib/cart/utils";

type OrderData = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  shipping_method: string | null;
  tracking_number: string | null;
  withdrawal_token: string | null;
  created_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  order_items: Array<{
    id: string;
    item_type: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    device: { id: string; product_templates: { display_name: string } | null } | null;
    sku_product: { title: string } | null;
  }>;
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

// Steps: pending → confirmed → shipped → delivered
const PROGRESS_STEPS = ["Bestilt", "Bekraeftet", "Afsendt", "Leveret"] as const;

function getProgressStep(status: string): number {
  switch (status) {
    case "pending": return 0;
    case "confirmed": return 1;
    case "shipped": return 2;
    case "picked_up":
    case "delivered": return 3;
    default: return -1; // cancelled / refunded — no progress bar
  }
}

function OrderProgressBar({ status }: { status: string }) {
  const step = getProgressStep(status);
  if (step < 0) return null;

  return (
    <div className="px-5 py-4">
      <div className="relative flex items-center justify-between">
        {/* Connector track */}
        <div className="absolute left-0 right-0 top-3 h-0.5 bg-[#E5E5EA]" aria-hidden="true">
          <div
            className="h-full bg-[#1A3D2E] transition-all duration-500"
            style={{ width: `${(step / (PROGRESS_STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {PROGRESS_STEPS.map((label, i) => {
          const done = i <= step;
          return (
            <div key={label} className="relative flex flex-col items-center gap-1.5">
              <div
                className={`z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? "border-[#1A3D2E] bg-[#1A3D2E]"
                    : "border-[#E5E5EA] bg-white"
                }`}
              >
                {done && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className={`text-xs font-medium leading-tight ${done ? "text-[#1A3D2E]" : "text-[#AEAEB2]"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isWithinWithdrawalPeriod(confirmedAt: string | null): boolean {
  if (!confirmedAt) return false;
  const confirmed = new Date(confirmedAt);
  const daysSince = (Date.now() - confirmed.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= 14;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const supabase = createBrowserClient();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/customer", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        search.trim() === "" ||
        o.order_number.toLowerCase().includes(search.trim().toLowerCase());
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E5EA] border-t-[#1A3D2E]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Mine ordrer</h1>
        <p className="mt-1 text-sm text-[#6E6E73]">
          {orders.length} {orders.length === 1 ? "ordre" : "ordrer"} i alt
        </p>
      </div>

      {/* Filters */}
      {orders.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#AEAEB2]"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Sog pa ordrenummer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5EA] bg-white py-2.5 pl-9 pr-4 text-sm text-[#111111] placeholder-[#AEAEB2] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#E5E5EA] bg-white px-3 py-2.5 text-sm text-[#111111] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
          >
            <option value="all">Alle statusser</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="rounded-xl border border-[#E5E5EA] bg-white px-6 py-12 text-center">
          <p className="text-sm text-[#6E6E73]">Du har ingen ordrer endnu</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[#E5E5EA] bg-white px-6 py-12 text-center">
          <p className="text-sm text-[#6E6E73]">Ingen ordrer matcher din sogning</p>
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); }}
            className="mt-3 text-xs font-medium text-[#1A3D2E] hover:underline"
          >
            Nulstil filtre
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const canWithdraw =
              order.withdrawal_token &&
              isWithinWithdrawalPeriod(order.confirmed_at) &&
              !["cancelled", "refunded"].includes(order.status);

            return (
              <div
                key={order.id}
                id={order.id}
                className="overflow-hidden rounded-xl border border-[#E5E5EA] bg-white"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5EA] px-5 py-4">
                  <div>
                    <p className="text-sm font-bold text-[#111111]">{order.order_number}</p>
                    <p className="mt-0.5 text-xs text-[#6E6E73]">
                      {new Date(order.created_at).toLocaleDateString("da-DK", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_COLORS[order.status] ?? "bg-[#F5F2EC] text-[#6E6E73] ring-[#E5E5EA]"}`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span className="text-sm font-bold text-[#111111]">{formatOere(order.total)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <OrderProgressBar status={order.status} />

                {/* Items */}
                <div className="divide-y divide-[#E5E5EA] border-t border-[#E5E5EA] px-5">
                  {order.order_items.map((item) => {
                    const name =
                      item.item_type === "device"
                        ? item.device?.product_templates?.display_name ?? "Enhed"
                        : item.sku_product?.title ?? "Produkt";
                    return (
                      <div key={item.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm text-[#111111]">{name}</p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-[#6E6E73]">{item.quantity} stk.</p>
                          )}
                        </div>
                        <span className="text-sm text-[#6E6E73]">{formatOere(item.total_price)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Footer actions */}
                {(order.tracking_number || canWithdraw) && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-[#E5E5EA] bg-[#F5F2EC] px-5 py-3">
                    {order.tracking_number && (
                      <span className="rounded-lg border border-[#E5E5EA] bg-white px-3 py-1.5 text-xs text-[#6E6E73]">
                        Tracking: {order.tracking_number}
                      </span>
                    )}
                    {canWithdraw && (
                      <a
                        href={`/fortryd/${order.withdrawal_token}`}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                      >
                        Fortryd aftale
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
