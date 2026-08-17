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
  total: number;
  created_at: string;
  location_id: string | null;
  foxway_status?: "pending" | "ordered" | null;
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
  const cfg = map[status ?? ""] ?? { label: status ?? "—", cls: "bg-cream text-charcoal-light" };
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
    returned:    { label: "Returneret", cls: "bg-cream text-charcoal-light" },
  };
  const cfg = map[status ?? ""] ?? { label: status ?? "—", cls: "bg-cream text-charcoal-light" };
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
    draft:   { label: "Kladde",  cls: "bg-cream text-gray" },
    shopify: { label: "Shopify", cls: "bg-green-100 text-green-700" },
  };
  const cfg = map[type] ?? { label: type, cls: "bg-cream text-charcoal-light" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

/* ── Foxway dropship badge (kun admin — aldrig kundevendt) ────────── */
function FoxwayBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const pending = status === "pending";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        pending ? "bg-[#4B1F82] text-white" : "bg-[#4B1F82]/10 text-[#4B1F82]"
      }`}
    >
      {pending ? "Foxway · skal bestilles" : "Foxway · bestilt"}
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
    (o.total / 100).toFixed(2),
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
  "rounded-xl border border-sand bg-cream px-3 py-2 text-sm text-charcoal focus:border-green-eco/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10";

/* ── Bulk action bar ─────────────────────────────────────────────── */
const DELETABLE_STATUSES = new Set(["pending", "cancelled", "abandoned", "checkout", "draft"]);

function BulkActionBar({
  selectedOrders,
  onClear,
  onDeleted,
}: {
  selectedOrders: Order[];
  onClear: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only orders that are unpaid AND in a deletable status can be removed.
  const deletable = selectedOrders.filter(
    (o) => o.payment_status !== "paid" && DELETABLE_STATUSES.has(o.status),
  );
  const blocked = selectedOrders.length - deletable.length;

  async function handleDelete() {
    if (deletable.length === 0) return;
    const confirmed = window.confirm(
      `Slet ${deletable.length} ordre(r) permanent?\n\n` +
        `Eventuelle reserverede enheder bliver frigivet og lagt tilbage på lager.\n\n` +
        (blocked > 0
          ? `${blocked} af de valgte ordrer er betalt eller i en status der ikke kan slettes — de bliver sprunget over.\n\n`
          : "") +
        `Denne handling kan ikke fortrydes.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    let failed = 0;
    for (const order of deletable) {
      try {
        const res = await fetch(`/api/shipping/orders/${order.id}`, { method: "DELETE" });
        if (!res.ok) failed++;
      } catch {
        failed++;
      }
    }
    setBusy(false);
    if (failed > 0) {
      setError(`${failed} ordre(r) kunne ikke slettes. Prøv igen, eller kig i loggen.`);
    } else {
      onDeleted();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-3 shadow-sm">
        <span className="text-sm font-semibold text-green-800">
          {selectedOrders.length} {selectedOrders.length === 1 ? "ordre valgt" : "ordrer valgt"}
        </span>
        {blocked > 0 && deletable.length > 0 && (
          <span className="text-xs text-green-700/70">
            ({blocked} kan ikke slettes — betalt eller forkert status)
          </span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={() => exportCSV(selectedOrders)}
            disabled={busy}
            className="rounded-xl border border-sand bg-white px-4 py-2 text-sm font-medium text-charcoal-light transition hover:bg-cream disabled:opacity-50"
          >
            Eksporter CSV
          </button>
          {deletable.length > 0 && (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
              </svg>
              {busy ? "Sletter…" : `Slet ${deletable.length} markerede`}
            </button>
          )}
          <button
            onClick={onClear}
            disabled={busy}
            className="rounded-xl px-3 py-2 text-sm text-gray transition hover:text-charcoal-light disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}

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
  const [foxway, setFoxway]         = useState("");

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
        if (foxway)     params.set("foxway", foxway);

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
    [activeTab, type, from, to, locationId, search, foxway],
  );

  /* Re-fetch when filters change (reset to page 1) */
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
    fetchOrders(1);
  }, [activeTab, type, from, to, locationId, search, foxway]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* ── Status tabs ──────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-sand bg-white p-1 shadow-sm">
        {STATUS_TABS.map((tab) => {
          const count = tab.key === "" ? total : (tabCounts[tab.key] ?? null);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-green-eco text-white shadow-sm"
                  : "text-gray hover:bg-cream hover:text-charcoal-light"
              }`}
            >
              {tab.label}
              {count !== null && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                    isActive ? "bg-white/20 text-white" : "bg-cream text-gray"
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
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-sand bg-white px-5 py-4 shadow-sm">

        {/* Search */}
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray">
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
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray">
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

        {/* Dropship */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray">
            Dropship
          </label>
          <select value={foxway} onChange={(e) => setFoxway(e.target.value)} className={inputCls}>
            <option value="">Alle ordrer</option>
            <option value="any">Kun dropship</option>
            <option value="pending">Skal bestilles</option>
          </select>
        </div>

        {/* Date from */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray">
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
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray">
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
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray">
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
        <div className="ml-auto self-end pb-0.5 text-xs text-gray">
          {total} {total === 1 ? "ordre" : "ordrer"}
        </div>
      </div>

      {/* ── Bulk action bar ──────────────────────────────────────── */}
      {selected.size > 0 && (
        <BulkActionBar
          selectedOrders={orders.filter((o) => selected.has(o.id))}
          onClear={() => setSelected(new Set())}
          onDeleted={() => {
            setSelected(new Set());
            fetchOrders(page);
          }}
        />
      )}

      {/* ── Table ────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-sand bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-sand border-t-green-eco" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray">
            Ingen ordrer matcher de valgte filtre
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 p-3 md:hidden">
              {orders.map((order) => (
                <div key={order.id} onClick={() => router.push(`/admin/platform/orders/${order.id}`)}
                  className="cursor-pointer rounded-xl border border-sand bg-white p-4 transition-all hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-charcoal">{order.order_number ?? order.id.slice(0, 8).toUpperCase()}</span>
                    <span className="font-bold text-charcoal">{formatOere(order.total)} kr</span>
                  </div>
                  <p className="mt-1 text-sm text-gray">{order.customer?.name ?? "Ukendt kunde"}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <OrderStatusBadge status={order.status} />
                    <PaymentStatusBadge status={order.payment_status} />
                    <FulfillmentStatusBadge status={order.fulfillment_status} />
                    <FoxwayBadge status={order.foxway_status} />
                  </div>
                  <p className="mt-2 text-xs text-gray">{formatDate(order.created_at)}</p>
                </div>
              ))}
            </div>
            {/* Desktop table — hidden on mobile */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sand/50 bg-cream/60 text-left text-[11px] font-semibold uppercase tracking-wider text-gray">
                    {/* Checkbox */}
                    <th className="w-10 pl-4 pr-2 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="h-4 w-4 cursor-pointer rounded border-sand accent-green-eco"
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
                <tbody className="divide-y divide-sand/50">
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
                          className="h-4 w-4 cursor-pointer rounded border-sand accent-green-eco"
                          aria-label={`Vælg ordre ${order.order_number ?? order.id}`}
                        />
                      </td>

                      {/* Order number */}
                      <td
                        className="cursor-pointer whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-charcoal-light"
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
                            <span className="font-medium text-charcoal">
                              {order.customer.name ?? "—"}
                            </span>
                            <span className="text-xs text-gray">
                              {order.customer.email ?? order.customer.phone ?? ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray">—</span>
                        )}
                      </td>

                      {/* Channel / type */}
                      <td
                        className="cursor-pointer px-4 py-3"
                        onClick={() => router.push(`/admin/platform/orders/${order.id}`)}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <TypeBadge type={order.type} />
                          <FoxwayBadge status={order.foxway_status} />
                        </div>
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
                        className="cursor-pointer whitespace-nowrap px-4 py-3 text-right font-semibold text-charcoal-light"
                        onClick={() => router.push(`/admin/platform/orders/${order.id}`)}
                      >
                        {formatOere(order.total)}
                      </td>

                      {/* Date */}
                      <td
                        className="cursor-pointer whitespace-nowrap px-4 py-3 text-gray"
                        onClick={() => router.push(`/admin/platform/orders/${order.id}`)}
                      >
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-sand bg-white px-5 py-3 shadow-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="rounded-xl border border-sand px-4 py-2 text-sm font-medium text-charcoal-light transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Forrige
          </button>
          <span className="text-sm text-gray">
            Side {page} af {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="rounded-xl border border-sand px-4 py-2 text-sm font-medium text-charcoal-light transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
          >
            Næste →
          </button>
        </div>
      )}
    </div>
  );
}
