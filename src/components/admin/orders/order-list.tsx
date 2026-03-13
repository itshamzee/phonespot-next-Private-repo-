"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OrderStatusBadge } from "./order-status-badge";
import { formatOere } from "@/lib/cart/utils";

interface Order {
  id: string;
  order_number: string | null;
  status: string;
  payment_status?: string | null;
  fulfillment_status?: string | null;
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

/* ── Status tab config ────────────────────────────────────────────── */
const STATUS_TABS = [
  { key: "",          label: "Alle" },
  { key: "pending",   label: "Ubehandlet" },
  { key: "shipped",   label: "Afsendt" },
  { key: "delivered", label: "Leveret" },
  { key: "refunded",  label: "Refunderet" },
] as const;

/* ── Payment status badge ─────────────────────────────────────────── */
function PaymentStatusBadge({ status }: { status?: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:            { label: "Afventer",   cls: "bg-amber-100 text-amber-800" },
    paid:               { label: "Betalt",     cls: "bg-green-100 text-green-800" },
    refunded:           { label: "Refunderet", cls: "bg-red-100 text-red-700" },
    partially_refunded: { label: "Delvis ref.",cls: "bg-orange-100 text-orange-700" },
  };
  const cfg = map[status ?? ""] ?? { label: status ?? "—", cls: "bg-stone-100 text-stone-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

/* ── Fulfillment status badge ─────────────────────────────────────── */
function FulfillmentStatusBadge({ status }: { status?: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    unfulfilled: { label: "Ikke sendt",  cls: "bg-red-100 text-red-700" },
    processing:  { label: "Behandles",  cls: "bg-amber-100 text-amber-800" },
    shipped:     { label: "Afsendt",    cls: "bg-blue-100 text-blue-800" },
    delivered:   { label: "Leveret",    cls: "bg-green-100 text-green-800" },
    returned:    { label: "Returneret", cls: "bg-stone-100 text-stone-600" },
  };
  const cfg = map[status ?? ""] ?? { label: status ?? "—", cls: "bg-stone-100 text-stone-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

/* ── Type badge ───────────────────────────────────────────────────── */
function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    online:  { label: "Online",  cls: "bg-indigo-100 text-indigo-700" },
    pos:     { label: "POS",     cls: "bg-purple-100 text-purple-700" },
    draft:   { label: "Kladde",  cls: "bg-stone-100 text-stone-500" },
    shopify: { label: "Shopify", cls: "bg-green-100 text-green-700" },
  };
  const cfg = map[type] ?? { label: type, cls: "bg-stone-100 text-stone-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function exportCSV(orders: Order[]) {
  const header = ["Ordrenr.", "Kunde", "Email", "Type", "Status", "Betaling", "Afsendelse", "Total", "Dato"];
  const rows = orders.map((o) => [
    o.order_number ?? o.id.slice(0, 8).toUpperCase(),
    o.customer?.name ?? "",
    o.customer?.email ?? "",
    o.type,
    o.status,
    o.payment_status ?? "",
    o.fulfillment_status ?? "",
    (o.total_amount / 100).toFixed(2),
    formatDate(o.created_at),
  ]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ordrer-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const inputCls =
  "rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:border-green-500/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/10";

/* ════════════════════════════════════════════════════════════════════ */
export function OrderList({ initialOrders, initialTotal, initialPage }: OrderListProps) {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>(Array.isArray(initialOrders) ? initialOrders : []);
  const [total, setTotal]   = useState(initialTotal);
  const [page, setPage]     = useState(initialPage);
  const [loading, setLoading] = useState(false);

  /* Filters */
  const [activeTab, setActiveTab] = useState("");
  const [search, setSearch]       = useState("");
  const [type, setType]           = useState("");
  const [from, setFrom]           = useState("");
  const [to, setTo]               = useState("");
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations]   = useState<Location[]>([]);

  /* Selection */
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* Tab counts */
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  /* ── Load locations once ──────────────────────────────────────── */
  useEffect(() => {
    fetch("/api/platform/locations")
      .then((r) => r.json())
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => setLocations([]));
  }, []);

  /* ── Fetch orders ─────────────────────────────────────────────── */
  const fetchOrders = useCallback(
    async (currentPage: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(currentPage), per_page: String(PER_PAGE) });
        if (activeTab)  params.set("status", activeTab);
        if (type)       params.set("type", type);
        if (from)       params.set("from", from);
        if (to)         params.set("to", to);
        if (locationId) params.set("location", locationId);
        if (search)     params.set("search", search);

        const res  = await fetch(`/api/shipping/orders?${params.toString()}`);
        const json = await res.json();
        setOrders(Array.isArray(json.orders) ? json.orders : []);
        setTotal(typeof json.total === "number" ? json.total : 0);

        /* Update tab counts if server returns them */
        if (json.counts && typeof json.counts === "object") {
          setTabCounts(json.counts as Record<string, number>);
        }
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, type, from, to, locationId, search],
  );

  /* Re-fetch when filters change (reset to page 1) */
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
    fetchOrders(1);
  }, [activeTab, type, from, to, locationId, search]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Re-fetch when page changes */
  useEffect(() => {
    fetchOrders(page);
  }, [page, fetchOrders]);

  /* ── Selection helpers ────────────────────────────────────────── */
  const allSelected = orders.length > 0 && orders.every((o) => selected.has(o.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ── Bulk: mark as shipped ────────────────────────────────────── */
  async function bulkMarkShipped() {
    const ids = Array.from(selected);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/shipping/orders/${id}/fulfill`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ carrier: "", tracking_number: "" }) }),
      ),
    );
    setSelected(new Set());
    fetchOrders(page);
  }

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* ── Status tabs ──────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
        {STATUS_TABS.map((tab) => {
          const count = tab.key === "" ? total : (tabCounts[tab.key] ?? null);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-stone-800 text-white shadow-sm"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
              }`}
            >
              {tab.label}
              {count !== null && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                    isActive ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Filter bar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm">

        {/* Search */}
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Søg
          </label>
          <input
            type="search"
            placeholder="Ordrenr., navn eller e-mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputCls + " min-w-[220px]"}
          />
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Kanal
          </label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            <option value="">Alle</option>
            <option value="online">Online</option>
            <option value="pos">POS</option>
            <option value="draft">Kladde</option>
            <option value="shopify">Shopify</option>
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

      {/* ── Bulk action bar ──────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-3 shadow-sm">
          <span className="text-sm font-semibold text-green-800">
            {selected.size} {selected.size === 1 ? "ordre valgt" : "ordrer valgt"}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={bulkMarkShipped}
              className="rounded-xl border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-800 transition hover:bg-green-100"
            >
              Marker som afsendt
            </button>
            <button
              onClick={() => exportCSV(orders.filter((o) => selected.has(o.id)))}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              Eksporter CSV
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-xl px-3 py-2 text-sm text-stone-400 transition hover:text-stone-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────── */}
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
                  {/* Checkbox */}
                  <th className="w-10 pl-4 pr-2 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 cursor-pointer rounded border-stone-300 accent-green-600"
                      aria-label="Vælg alle"
                    />
                  </th>
                  <th className="px-4 py-3">Ordrenr.</th>
                  <th className="px-4 py-3">Kunde</th>
                  <th className="px-4 py-3">Kanal</th>
                  <th className="px-4 py-3">Ordrestatus</th>
                  <th className="px-4 py-3">Betaling</th>
                  <th className="px-4 py-3">Afsendelse</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Dato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className={`transition-colors hover:bg-green-50/40 ${selected.has(order.id) ? "bg-green-50/60" : ""}`}
                  >
                    {/* Checkbox cell — stop click propagation so row click still works */}
                    <td className="w-10 pl-4 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={() => toggleOne(order.id)}
                        className="h-4 w-4 cursor-pointer rounded border-stone-300 accent-green-600"
                        aria-label={`Vælg ordre ${order.order_number ?? order.id}`}
                      />
                    </td>

                    {/* Order number */}
                    <td
                      className="cursor-pointer whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-stone-700"
                      onClick={() => router.push(`/admin/platform/orders/${order.id}`)}
                    >
                      {order.order_number ?? order.id.slice(0, 8).toUpperCase()}
                    </td>

                    {/* Customer */}
                    <td
                      className="cursor-pointer px-4 py-3"
                      onClick={() => router.push(`/admin/platform/orders/${order.id}`)}
                    >
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

                    {/* Channel / type */}
                    <td
                      className="cursor-pointer px-4 py-3"
                      onClick={() => router.push(`/admin/platform/orders/${order.id}`)}
                    >
                      <TypeBadge type={order.type} />
                    </td>

                    {/* Order status */}
                    <td
                      className="cursor-pointer px-4 py-3"
                      onClick={() => router.push(`/admin/platform/orders/${order.id}`)}
                    >
                      <OrderStatusBadge status={order.status} />
                    </td>

                    {/* Payment status */}
                    <td
                      className="cursor-pointer px-4 py-3"
                      onClick={() => router.push(`/admin/platform/orders/${order.id}`)}
                    >
                      <PaymentStatusBadge status={order.payment_status} />
                    </td>

                    {/* Fulfillment status */}
                    <td
                      className="cursor-pointer px-4 py-3"
                      onClick={() => router.push(`/admin/platform/orders/${order.id}`)}
                    >
                      <FulfillmentStatusBadge status={order.fulfillment_status} />
                    </td>

                    {/* Total */}
                    <td
                      className="cursor-pointer whitespace-nowrap px-4 py-3 text-right font-semibold text-stone-700"
                      onClick={() => router.push(`/admin/platform/orders/${order.id}`)}
                    >
                      {formatOere(order.total_amount)}
                    </td>

                    {/* Date */}
                    <td
                      className="cursor-pointer whitespace-nowrap px-4 py-3 text-stone-500"
                      onClick={() => router.push(`/admin/platform/orders/${order.id}`)}
                    >
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────── */}
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
