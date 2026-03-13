"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { OrderStatusBadge } from "./order-status-badge";
import { OrderStatusActions } from "./order-status-actions";
import { FulfillmentCard } from "./fulfillment-card";
import { PaymentCard } from "./payment-card";
import { OrderTimeline } from "./order-timeline";
import { formatDKK, formatDate } from "@/lib/platform/format";
import type { Order } from "@/lib/supabase/platform-types";

const SHIPPING_METHOD_LABELS: Record<string, string> = {
  postnord_myparcel: "PostNord MyParcel",
  postnord_home: "PostNord Hjemlevering",
  gls_parcelshop: "GLS PakkeShop",
  gls_home: "GLS Hjemlevering",
  dao_parcelshop: "DAO PakkeShop",
  click_collect_cph: "Click & Collect – København",
  click_collect_aarhus: "Click & Collect – Aarhus",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  online: "Online",
  pos: "POS",
  draft: "Kladde",
  shopify: "Shopify",
};

function shippingLabel(method: string): string {
  return SHIPPING_METHOD_LABELS[method] ?? method;
}

// ── Fulfillment modal ────────────────────────────────────────────────────────

interface FulfillModalProps {
  orderId: string;
  currentStatus: string;
  onClose: () => void;
  onDone: () => void;
}

function FulfillModal({ orderId, currentStatus, onClose, onDone }: FulfillModalProps) {
  const [tracking, setTracking] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMarkDelivered = currentStatus === "shipped";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (!isMarkDelivered) {
        if (tracking) body.tracking_number = tracking;
        if (trackingUrl) body.tracking_url = trackingUrl;
      }

      const res = await fetch(`/api/shipping/orders/${orderId}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Noget gik galt");
      }
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-stone-800">
          {isMarkDelivered ? "Marker som leveret" : "Afsend ordre"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isMarkDelivered && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Trackingnummer <span className="text-stone-400">(valgfri)</span>
                </label>
                <input
                  type="text"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="f.eks. 00370726200099123456"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Tracking URL <span className="text-stone-400">(valgfri)</span>
                </label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://tracking.postnord.com/..."
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Behandler…" : isMarkDelivered ? "Marker som leveret" : "Bekræft afsendelse"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Annuller
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface OrderDetailProps {
  order: Order & {
    customer?: any;
    items?: any[];
    pickup_point_data?: any;
    total_amount?: number;
  };
  activity: any[];
  warranties?: any[];
}

export function OrderDetail({ order, activity, warranties = [] }: OrderDetailProps) {
  const router = useRouter();
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [internalNotes, setInternalNotes] = useState(order.internal_notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function refresh() {
    router.refresh();
  }

  // ── Internal notes auto-save on blur ──
  async function handleNotesBlur() {
    if (internalNotes === (order.internal_notes ?? "")) return;
    setNotesSaving(true);
    setNotesSaved(false);
    try {
      await fetch(`/api/shipping/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internal_notes: internalNotes }),
      });
      setNotesSaved(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setNotesSaved(false), 3000);
    } finally {
      setNotesSaving(false);
    }
  }

  const customer = order.customer;
  const items: any[] = order.items ?? [];
  const addr = (order.shipping_address ?? {}) as Record<string, any>;
  const pickupPoint = order.pickup_point_data ?? null;

  const subtotal: number = items.reduce((sum: number, item: any) => {
    return sum + (item.unit_price ?? 0) * (item.quantity ?? 1);
  }, 0);
  const shippingCost: number = order.shipping_cost ?? 0;
  const discountAmount: number = order.discount_amount ?? 0;
  const total: number = order.total ?? order.total_amount ?? 0;

  return (
    <>
      {fulfillOpen && (
        <FulfillModal
          orderId={order.id}
          currentStatus={order.fulfillment_status ?? "unfulfilled"}
          onClose={() => setFulfillOpen(false)}
          onDone={() => {
            setFulfillOpen(false);
            refresh();
          }}
        />
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Back link */}
        <a
          href="/admin/platform/orders"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
        >
          ← Alle ordrer
        </a>

        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">
              Ordre {order.order_number ?? order.id.slice(0, 8)}
            </h1>
            <p className="mt-1 text-sm text-stone-400">
              Oprettet {formatDate(order.created_at)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* 2-column layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left column (~2/3) ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order items table */}
            <div className="rounded-xl border border-stone-200 bg-white">
              <h2 className="border-b border-stone-100 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
                Produkter
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left text-xs text-stone-400">
                    <th className="px-5 py-2 font-medium">Produkt</th>
                    <th className="px-5 py-2 font-medium text-right">Antal</th>
                    <th className="px-5 py-2 font-medium text-right">Stykpris</th>
                    <th className="px-5 py-2 font-medium text-right">Linjetotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => {
                    const isDevice = item.type === "device" || item.item_type === "device";
                    const device = item.device;
                    const sku = item.sku_product;
                    const name = isDevice
                      ? `${device?.template?.display_name ?? "Enhed"} – ${item.grade ?? ""}`
                      : (sku?.title ?? item.title ?? "Produkt");
                    const qty: number = item.quantity ?? 1;
                    const unitPrice: number = item.unit_price ?? 0;
                    const lineAmt = unitPrice * qty;

                    return (
                      <tr
                        key={item.id ?? idx}
                        className="border-b border-stone-100 last:border-0"
                      >
                        <td className="px-5 py-3 text-stone-800">{name}</td>
                        <td className="px-5 py-3 text-right text-stone-600">{qty}</td>
                        <td className="px-5 py-3 text-right text-stone-600">
                          {formatDKK(unitPrice)}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-stone-800">
                          {formatDKK(lineAmt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-stone-100 px-5 py-3 space-y-1 text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span>{formatDKK(subtotal)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Fragt</span>
                  <span>{formatDKK(shippingCost)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Rabat</span>
                    <span>−{formatDKK(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-stone-100 pt-2 font-bold text-stone-800">
                  <span>Total</span>
                  <span>{formatDKK(total)}</span>
                </div>
              </div>
            </div>

            {/* FulfillmentCard */}
            <FulfillmentCard
              order={order}
              onFulfill={() => setFulfillOpen(true)}
            />

            {/* PaymentCard */}
            <PaymentCard order={{ ...order, total }} />

            {/* OrderTimeline */}
            <OrderTimeline order={order} />
          </div>

          {/* ── Right column (~1/3) ─────────────────────────────────── */}
          <div className="space-y-6">
            {/* Customer info card */}
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
                Kunde
              </h2>
              {customer ? (
                <dl className="space-y-1 text-sm">
                  {customer.name && (
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-stone-500">Navn</dt>
                      <dd className="font-medium text-stone-800">{customer.name}</dd>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-stone-500">Email</dt>
                      <dd className="font-medium text-stone-800 break-all">{customer.email}</dd>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-stone-500">Telefon</dt>
                      <dd className="font-medium text-stone-800">{customer.phone}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-stone-400">Ingen kundeoplysninger</p>
              )}
            </div>

            {/* Shipping address card */}
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
                Leveringsadresse
              </h2>
              <dl className="space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-stone-500">Metode</dt>
                  <dd className="font-medium text-stone-800">
                    {shippingLabel(order.shipping_method ?? "")}
                  </dd>
                </div>
                {addr.line1 && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-stone-500">Adresse</dt>
                    <dd className="font-medium text-stone-800">
                      {addr.line1}
                      {addr.line2 ? `, ${addr.line2}` : ""},{" "}
                      {addr.postal_code} {addr.city}
                    </dd>
                  </div>
                )}
                {pickupPoint && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-stone-500">Udlevering</dt>
                    <dd className="font-medium text-stone-800">
                      {pickupPoint.name ?? ""} – {pickupPoint.address ?? ""}
                    </dd>
                  </div>
                )}
                {order.tracking_number && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-stone-500">Tracking</dt>
                    <dd className="font-mono font-medium text-stone-800">
                      {order.tracking_number}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Internal notes — auto-saves on blur */}
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
                  Interne noter
                </h2>
                {notesSaving && (
                  <span className="text-xs text-stone-400">Gemmer…</span>
                )}
                {notesSaved && !notesSaving && (
                  <span className="text-xs text-green-600">Gemt</span>
                )}
              </div>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                onBlur={handleNotesBlur}
                rows={4}
                placeholder="Interne noter, kun synlige for admin…"
                className="w-full resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            {/* Order metadata */}
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
                Ordreinfo
              </h2>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-stone-500">Ordrenummer</dt>
                  <dd className="font-mono font-medium text-stone-800">{order.order_number}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-stone-500">Type</dt>
                  <dd className="font-medium text-stone-800">
                    {ORDER_TYPE_LABELS[order.type] ?? order.type}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-stone-500">Oprettet</dt>
                  <dd className="font-medium text-stone-800">{formatDate(order.created_at)}</dd>
                </div>
                {order.confirmed_at && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-stone-500">Bekræftet</dt>
                    <dd className="font-medium text-stone-800">{formatDate(order.confirmed_at)}</dd>
                  </div>
                )}
                {order.is_b2b && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-stone-500">Erhverv</dt>
                    <dd className="font-medium text-stone-800">Ja</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Actions dropdown */}
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
                Handlinger
              </h2>
              <div className="space-y-2">
                <a
                  href={`/admin/platform/orders/${order.id}/faktura`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Print faktura
                </a>
                <OrderStatusActions
                  orderId={order.id}
                  currentStatus={order.status}
                  shippingMethod={order.shipping_method ?? ""}
                  trackingNumber={order.tracking_number ?? null}
                  orderTotal={total}
                  onStatusChange={refresh}
                />
              </div>
            </div>

            {/* Warranties */}
            {warranties.length > 0 && (
              <div className="rounded-xl border border-stone-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
                  Garantibeviser
                </h2>
                <div className="space-y-2">
                  {warranties.map((w: any) => {
                    const deviceName =
                      w.devices?.product_templates?.display_name || "Enhed";
                    const isExpired = new Date(w.expires_at) < new Date();
                    const statusLabel = isExpired
                      ? "Udløbet"
                      : w.status === "claimed"
                        ? "Benyttet"
                        : "Aktiv";
                    const statusColor = isExpired
                      ? "text-red-600"
                      : w.status === "claimed"
                        ? "text-amber-600"
                        : "text-green-600";

                    return (
                      <div
                        key={w.id}
                        className="flex items-center justify-between rounded-lg border border-stone-100 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-stone-800">
                            {w.guarantee_number}
                          </p>
                          <p className="text-xs text-stone-500">{deviceName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${statusColor}`}>
                            {statusLabel}
                          </span>
                          {w.pdf_url && (
                            <a
                              href={w.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
                            >
                              PDF
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
