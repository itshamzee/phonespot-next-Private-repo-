"use client";

import { useRouter } from "next/navigation";
import { OrderStatusBadge } from "./order-status-badge";
import { OrderStatusActions } from "./order-status-actions";
import { formatOere } from "@/lib/cart/utils";

const SHIPPING_METHOD_LABELS: Record<string, string> = {
  postnord_myparcel:  "PostNord MyParcel",
  postnord_home:      "PostNord Hjemlevering",
  gls_parcelshop:     "GLS PakkeShop",
  gls_home:           "GLS Hjemlevering",
  dao_parcelshop:     "DAO PakkeShop",
  click_collect_cph:  "Click & Collect – København",
  click_collect_aarhus: "Click & Collect – Aarhus",
};

function shippingLabel(method: string): string {
  return SHIPPING_METHOD_LABELS[method] ?? method;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

interface OrderDetailProps {
  order: any;
  activity: any[];
  warranties?: any[];
}

export function OrderDetail({ order, activity, warranties = [] }: OrderDetailProps) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  const customer = order.customer;
  const items: any[] = order.items ?? [];
  const addr = order.shipping_address ?? {};
  const pickupPoint = order.pickup_point_data ?? null;

  const subtotal: number = items.reduce((sum: number, item: any) => {
    return sum + (item.unit_price ?? 0) * (item.quantity ?? 1);
  }, 0);
  const shippingCost: number = order.shipping_cost ?? 0;
  const discountAmount: number = order.discount_amount ?? 0;
  const total: number = order.total_amount ?? 0;

  return (
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

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left column ───────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer info */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
              Kunde
            </h2>
            {customer ? (
              <dl className="space-y-1 text-sm">
                {customer.name && (
                  <div className="flex gap-2">
                    <dt className="w-24 text-stone-500">Navn</dt>
                    <dd className="font-medium text-stone-800">{customer.name}</dd>
                  </div>
                )}
                {customer.email && (
                  <div className="flex gap-2">
                    <dt className="w-24 text-stone-500">Email</dt>
                    <dd className="font-medium text-stone-800">{customer.email}</dd>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex gap-2">
                    <dt className="w-24 text-stone-500">Telefon</dt>
                    <dd className="font-medium text-stone-800">{customer.phone}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-stone-400">Ingen kundeoplysninger</p>
            )}
          </div>

          {/* Shipping info */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
              Forsendelse
            </h2>
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="w-32 text-stone-500">Metode</dt>
                <dd className="font-medium text-stone-800">
                  {shippingLabel(order.shipping_method ?? "")}
                </dd>
              </div>
              {addr.line1 && (
                <div className="flex gap-2">
                  <dt className="w-32 text-stone-500">Adresse</dt>
                  <dd className="font-medium text-stone-800">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ""}, {addr.postal_code}{" "}
                    {addr.city}
                  </dd>
                </div>
              )}
              {pickupPoint && (
                <div className="flex gap-2">
                  <dt className="w-32 text-stone-500">Udleveringssted</dt>
                  <dd className="font-medium text-stone-800">
                    {pickupPoint.name ?? ""} – {pickupPoint.address ?? ""}
                  </dd>
                </div>
              )}
              {order.tracking_number && (
                <div className="flex gap-2">
                  <dt className="w-32 text-stone-500">Tracking</dt>
                  <dd className="font-mono font-medium text-stone-800">
                    {order.tracking_number}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Items table */}
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
                  <th className="px-5 py-2 font-medium text-right">Linje total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => {
                  const isDevice = item.type === "device";
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
                        {formatOere(unitPrice)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-stone-800">
                        {formatOere(lineAmt)}
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
                <span>{formatOere(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Fragt</span>
                <span>{formatOere(shippingCost)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Rabat</span>
                  <span>−{formatOere(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-stone-100 pt-2 font-bold text-stone-800">
                <span>Total</span>
                <span>{formatOere(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column ──────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-1">
          {/* Status actions */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
              Handlinger
            </h2>
            <OrderStatusActions
              orderId={order.id}
              currentStatus={order.status}
              shippingMethod={order.shipping_method ?? ""}
              trackingNumber={order.tracking_number ?? null}
              orderTotal={total}
              onStatusChange={refresh}
            />
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

          {/* Activity timeline */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
              Aktivitet
            </h2>
            {activity.length === 0 ? (
              <p className="text-sm text-stone-400">Ingen aktivitet endnu</p>
            ) : (
              <ol className="space-y-3">
                {activity.map((entry: any, idx: number) => (
                  <li key={entry.id ?? idx} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-stone-300" />
                    <div>
                      <p className="text-sm text-stone-700">
                        {entry.description ?? entry.action ?? JSON.stringify(entry.payload)}
                      </p>
                      <p className="text-xs text-stone-400">
                        {formatDate(entry.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
