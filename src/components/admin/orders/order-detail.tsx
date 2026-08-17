"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { OrderStatusBadge } from "./order-status-badge";
import { OrderStatusActions } from "./order-status-actions";
import { FulfillmentCard } from "./fulfillment-card";
import { PaymentCard } from "./payment-card";
import { OrderTimeline } from "./order-timeline";
import { FoxwayDropshipCard } from "./foxway-dropship-card";
import Link from "next/link";
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
    if (!isMarkDelivered && !tracking.trim()) {
      setError("Tracking-nummer er påkrævet");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (!isMarkDelivered) {
        body.tracking_number = tracking.trim();
        if (trackingUrl) body.tracking_url = trackingUrl;
      } else {
        body.mark_delivered = true;
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
        <h2 className="mb-4 text-base font-semibold text-charcoal">
          {isMarkDelivered ? "Marker som leveret" : "Afsend ordre"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isMarkDelivered && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal-light">
                  Trackingnummer <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="f.eks. 00370726200099123456"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-sand px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-eco"
                />
                <p className="mt-1 text-xs text-gray">
                  Påkrævet — kunden får automatisk en mail med tracking-nummeret.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal-light">
                  Tracking URL <span className="text-gray">(valgfri)</span>
                </label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://tracking.postnord.com/..."
                  className="w-full rounded-lg border border-sand px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-eco"
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
              disabled={loading || (!isMarkDelivered && !tracking.trim())}
              className="flex-1 rounded-lg bg-green-eco px-4 py-2 text-sm font-medium text-white hover:bg-green-eco/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Behandler…" : isMarkDelivered ? "Marker som leveret" : "Bekræft afsendelse"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-sand px-4 py-2 text-sm font-medium text-charcoal-light hover:bg-cream"
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
    foxway_status?: "pending" | "ordered" | null;
    foxway_order_ref?: string | null;
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

  // Delete state — only enabled for unpaid pending/cancelled/abandoned orders.
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const canDelete =
    order.payment_status !== "paid" &&
    ["pending", "cancelled", "abandoned", "checkout", "draft"].includes(order.status);

  async function handleDelete() {
    const orderLabel = order.order_number ?? order.id.slice(0, 8);
    const confirmed = window.confirm(
      `Slet ordre ${orderLabel} permanent?\n\n` +
        `Eventuelle reserverede enheder bliver frigivet og lagt tilbage på lager.\n\n` +
        `Denne handling kan ikke fortrydes.`,
    );
    if (!confirmed) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/shipping/orders/${order.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Sletning mislykkedes");
      }
      router.push("/admin/platform/orders");
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Sletning mislykkedes");
      setDeleting(false);
    }
  }

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

  const foxwayItems = items.filter(
    (it: { device?: { source?: string } | null }) => it.device?.source === "foxway",
  );
  const orderHasUpgrades = items.some(
    (it: { upgrade_details?: unknown[] | null }) => (it.upgrade_details?.length ?? 0) > 0,
  );

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
          className="inline-flex items-center gap-1 text-sm text-gray hover:text-charcoal"
        >
          ← Alle ordrer
        </a>

        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-charcoal">
              Ordre {order.order_number ?? order.id.slice(0, 8)}
            </h1>
            <p className="mt-1 text-sm text-gray">
              Oprettet {formatDate(order.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                title="Slet denne ordre permanent. Reserverede enheder frigives."
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                </svg>
                {deleting ? "Sletter…" : "Slet ordre"}
              </button>
            )}
          </div>
        </div>
        {deleteError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {deleteError}
          </div>
        )}

        {/* Battery-upgrade banner */}
        {items.some((it: any) => it.battery_upgrade) && (
          <div className="mb-6 rounded-2xl border-2 border-orange-400 bg-orange-50 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl font-bold text-white">!</span>
              <div>
                <h2 className="font-display text-lg font-bold text-orange-900">
                  BATTERI-OPGRADERING — udskift batteri før forsendelse
                </h2>
                <p className="text-sm text-orange-800/80">
                  Kunden har betalt for et nyt 100% batteri på {items.filter((it: any) => it.battery_upgrade).length} enhed(er).
                  Installer batteriet inden enheden pakkes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2-column layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left column (~2/3) ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order items table */}
            <div className="rounded-xl border border-sand bg-white">
              <h2 className="border-b border-sand/50 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-gray">
                Produkter
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sand/50 text-left text-xs text-gray">
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
                        className="border-b border-sand/50 last:border-0"
                      >
                        <td className="px-5 py-3 text-charcoal">
                          <span>{name}</span>
                          {item.battery_upgrade && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-orange-700">
                              Nyt batteri
                            </span>
                          )}
                          {(item.upgrade_details as Array<{ label: string; price_oere: number }> | null)?.map(
                            (u, i) => (
                              <p key={i} className="text-xs text-charcoal-light">
                                + {u.label} ({formatDKK(u.price_oere)})
                              </p>
                            ),
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-charcoal-light">{qty}</td>
                        <td className="px-5 py-3 text-right text-charcoal-light">
                          {formatDKK(unitPrice)}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-charcoal">
                          {formatDKK(lineAmt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-sand/50 px-5 py-3 space-y-1 text-sm">
                <div className="flex justify-between text-charcoal-light">
                  <span>Subtotal</span>
                  <span>{formatDKK(subtotal)}</span>
                </div>
                <div className="flex justify-between text-charcoal-light">
                  <span>Fragt</span>
                  <span>{formatDKK(shippingCost)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Rabat</span>
                    <span>−{formatDKK(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-sand/50 pt-2 font-bold text-charcoal">
                  <span>Total</span>
                  <span>{formatDKK(total)}</span>
                </div>
              </div>
            </div>

            {/* FoxwayDropshipCard — øverst, så en ubestilt dropship-ordre er det første man ser */}
            {order.foxway_status && (
              <FoxwayDropshipCard
                orderId={order.id}
                foxwayStatus={order.foxway_status}
                foxwayOrderRef={order.foxway_order_ref ?? null}
                devices={foxwayItems.map((it: any) => ({
                  displayName: it.device?.template?.display_name ?? "Ukendt enhed",
                  grade: it.device?.grade ?? "?",
                  sourceSku: it.device?.source_sku ?? null,
                  purchasePrice: it.device?.purchase_price ?? null,
                  sourceUrl: it.device?.source_url ?? null,
                }))}
                hasUpgrades={orderHasUpgrades}
                shippingAddress={(order.shipping_address as Record<string, any> | null) ?? null}
                customerName={order.customer?.name ?? "kunden"}
              />
            )}

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
            <div className="rounded-xl border border-sand bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray">
                Kunde
              </h2>
              {customer ? (
                <dl className="space-y-1 text-sm">
                  {customer.name && (
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-gray">Navn</dt>
                      <dd>
                        <Link href={`/admin/kunder?search=${encodeURIComponent(customer.email || "")}`}
                          className="font-bold text-charcoal hover:text-green-eco hover:underline">
                          {customer.name}
                        </Link>
                      </dd>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-gray">Email</dt>
                      <dd className="font-medium text-charcoal break-all">{customer.email}</dd>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-gray">Telefon</dt>
                      <dd className="font-medium text-charcoal">{customer.phone}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-gray">Ingen kundeoplysninger</p>
              )}
            </div>

            {/* Shipping address card */}
            <div className="rounded-xl border border-sand bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray">
                Leveringsadresse
              </h2>
              <dl className="space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-gray">Metode</dt>
                  <dd className="font-medium text-charcoal">
                    {shippingLabel(order.shipping_method ?? "")}
                  </dd>
                </div>
                {addr.line1 && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-gray">Adresse</dt>
                    <dd className="font-medium text-charcoal">
                      {addr.line1}
                      {addr.line2 ? `, ${addr.line2}` : ""},{" "}
                      {addr.postal_code} {addr.city}
                    </dd>
                  </div>
                )}
                {pickupPoint && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-gray">Udlevering</dt>
                    <dd className="font-medium text-charcoal">
                      {pickupPoint.name ?? ""} – {pickupPoint.address ?? ""}
                    </dd>
                  </div>
                )}
                {order.tracking_number && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-gray">Tracking</dt>
                    <dd className="font-mono font-medium text-charcoal">
                      {order.tracking_number}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Internal notes — auto-saves on blur */}
            <div className="rounded-xl border border-sand bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray">
                  Interne noter
                </h2>
                {notesSaving && (
                  <span className="text-xs text-gray">Gemmer…</span>
                )}
                {notesSaved && !notesSaving && (
                  <span className="text-xs text-green-eco">Gemt</span>
                )}
              </div>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                onBlur={handleNotesBlur}
                rows={4}
                placeholder="Interne noter, kun synlige for admin…"
                className="w-full resize-none rounded-lg border border-sand bg-cream px-3 py-2 text-sm text-charcoal placeholder:text-gray focus:border-green-eco focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-eco"
              />
            </div>

            {/* Order metadata */}
            <div className="rounded-xl border border-sand bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray">
                Ordreinfo
              </h2>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray">Ordrenummer</dt>
                  <dd className="font-mono font-medium text-charcoal">{order.order_number}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray">Type</dt>
                  <dd className="font-medium text-charcoal">
                    {ORDER_TYPE_LABELS[order.type] ?? order.type}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray">Oprettet</dt>
                  <dd className="font-medium text-charcoal">{formatDate(order.created_at)}</dd>
                </div>
                {order.confirmed_at && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray">Bekræftet</dt>
                    <dd className="font-medium text-charcoal">{formatDate(order.confirmed_at)}</dd>
                  </div>
                )}
                {order.is_b2b && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray">Erhverv</dt>
                    <dd className="font-medium text-charcoal">Ja</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Actions dropdown */}
            <div className="rounded-xl border border-sand bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray">
                Handlinger
              </h2>
              <div className="space-y-2">
                <a
                  href={`/admin/platform/orders/${order.id}/faktura`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-sand bg-white px-4 py-2 text-sm font-medium text-charcoal-light hover:bg-cream"
                >
                  Print faktura
                </a>
                <a
                  href={`/api/pos/packing-slip?order_id=${order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-sand bg-white px-4 py-2 text-sm font-medium text-charcoal-light hover:bg-cream"
                >
                  Print packing slip
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
              <div className="rounded-xl border border-sand bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray">
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
                        : "text-green-eco";

                    return (
                      <div
                        key={w.id}
                        className="flex items-center justify-between rounded-lg border border-sand/50 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-charcoal">
                            {w.guarantee_number}
                          </p>
                          <p className="text-xs text-gray">{deviceName}</p>
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
                              className="rounded-lg border border-sand px-3 py-1.5 text-xs font-medium text-charcoal-light hover:bg-cream"
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
