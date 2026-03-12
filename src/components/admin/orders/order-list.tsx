"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OrderStatusBadge } from "./order-status-badge";
import { formatOere } from "@/lib/cart/utils";

interface Order {
  id: string;
  order_number: string | null;
  status: string;
  type: string;
  total_amount: number;
  created_at: string;
  location_id: string | null;
  customer: { name: string | null; email: string | null; phone: string | null } | null;
}

interface Location {
  id: string;
  name: string;
}

interface OrderListProps {
  initialOrders: Order[];
  initialTotal: number;
  initialPage: number;
}

const PER_PAGE = 25;

export function OrderList({ initialOrders, initialTotal, initialPage }: OrderListProps) {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  /* ── Load locations once ─────────────────────────────────────── */
  useEffect(() => {
    fetch("/api/platform/locations")
      .then((r) => r.json())
      .then((data: Location[]) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => setLocations([]));
  }, []);

  /* ── Fetch orders ────────────────────────────────────────────── */
  const fetchOrders = useCallback(
    async (currentPage: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(currentPage), per_page: String(PER_PAGE) });
        if (status)     params.set("status", status);
        if (type)       params.set("type", type);
        if (from)       params.set("from", from);
        if (to)         params.set("to", to);
        if (locationId) params.set("location", locationId);

        const res = await fetch(`/api/shipping/orders?${params.toString()}`);
        const json = await res.json();
        setOrders(json.orders ?? []);
        setTotal(json.total ?? 0);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [status, type, from, to, locationId],
  );

  /* Re-fetch when filters change (reset to page 1) */
  useEffect(() => {
    setPage(1);
    fetchOrders(1);
  }, [status, type, from, to, locationId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Re-fetch when page changes */
  useEffect(() => {
    fetchOrders(page);
  }, [page, fetchOrders]);

  /* ── Helpers ─────────────────────────────────────────────────── */
  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("da-DK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const inputCls =
    "rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:border-green-500/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/10";

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* ── Filter bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
        {/* Status */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Status
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="">Alle</option>
            <option value="pending">Afventende</option>
            <option value="confirmed">Bekræftet</option>
            <option value="shipped">Afsendt</option>
            <option value="picked_up">Afhentet</option>
            <option value="delivered">Leveret</option>
            <option value="cancelled">Annulleret</option>
            <option value="refunded">Refunderet</option>
          </select>
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Type
          </label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            <option value="">Alle</option>
            <option value="online">Online</option>
            <option value="pos">POS</option>
          </select>
        </div>

        {/* Date from */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Fra
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Til
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Location */}
        {locations.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              Lokation
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={inputCls}
            >
              <option value="">Alle lokationer</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Result count */}
        <div className="ml-auto self-end pb-0.5 text-xs text-stone-400">
          {total} {total === 1 ? "ordre" : "ordrer"}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-200 border-t-green-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center text-sm text-stone-400">
            Ingen ordrer matcher de valgte filtre
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  <th className="px-6 py-3">Ordrenr.</th>
                  <th className="px-6 py-3">Kunde</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3">Dato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/admin/platform/orders/${order.id}`)}
                    className="cursor-pointer transition-colors hover:bg-green-50/40"
                  >
                    <td className="whitespace-nowrap px-6 py-3 font-mono text-xs font-semibold text-stone-700">
                      {order.order_number ?? order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-3">
                      {order.customer ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-stone-800">
                            {order.customer.name ?? "—"}
                          </span>
                          <span className="text-xs text-stone-400">
                            {order.customer.email ?? order.customer.phone ?? ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium capitalize text-stone-600">
                        {order.type === "online" ? "Online" : order.type === "pos" ? "POS" : order.type}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right font-semibold text-stone-700">
                      {formatOere(order.total_amount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-stone-500">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-5 py-3 shadow-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Forrige
          </button>
          <span className="text-sm text-stone-500">
            Side {page} af {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Næste →
          </button>
        </div>
      )}
    </div>
  );
}
