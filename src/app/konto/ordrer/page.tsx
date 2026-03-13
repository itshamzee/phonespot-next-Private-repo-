"use client";

import { useEffect, useState } from "react";
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
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  picked_up: "bg-green-100 text-green-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-stone-100 text-stone-500",
  refunded: "bg-red-100 text-red-700",
};

function isWithinWithdrawalPeriod(confirmedAt: string | null): boolean {
  if (!confirmedAt) return false;
  const confirmed = new Date(confirmedAt);
  const now = new Date();
  const daysSince = (now.getTime() - confirmed.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= 14;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
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
        const data = await res.json();
        setOrders(data.orders ?? []);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-stone-400">Indlaeser ordrer...</div>;
  }

  if (orders.length === 0) {
    return <div className="py-12 text-center text-stone-400">Du har ingen ordrer endnu</div>;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const canWithdraw =
          order.withdrawal_token &&
          isWithinWithdrawalPeriod(order.confirmed_at) &&
          !["cancelled", "refunded"].includes(order.status);

        return (
          <div key={order.id} id={order.id} className="rounded-xl border border-stone-200 bg-white">
            {/* Order header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-3">
              <div>
                <p className="text-sm font-bold text-stone-800">{order.order_number}</p>
                <p className="text-xs text-stone-500">
                  {new Date(order.created_at).toLocaleDateString("da-DK", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-stone-100 text-stone-500"}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
                <span className="text-sm font-bold text-stone-800">{formatOere(order.total)}</span>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-stone-50 px-5">
              {order.order_items.map((item) => {
                const name = item.item_type === "device"
                  ? item.device?.product_templates?.display_name ?? "Enhed"
                  : item.sku_product?.title ?? "Produkt";
                return (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-stone-700">{name}</p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-stone-400">{item.quantity} stk</p>
                      )}
                    </div>
                    <span className="text-sm text-stone-600">{formatOere(item.total_price)}</span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-t border-stone-100 px-5 py-3">
              {order.tracking_number && (
                <span className="rounded-lg bg-stone-50 px-3 py-1.5 text-xs text-stone-600">
                  Tracking: {order.tracking_number}
                </span>
              )}
              {canWithdraw && (
                <a
                  href={`/fortryd/${order.withdrawal_token}`}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  Fortryd aftale her
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
