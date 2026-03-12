"use client";

import { useState } from "react";
import { OrderRefundDialog } from "./order-refund-dialog";

interface OrderStatusActionsProps {
  orderId: string;
  currentStatus: string;
  shippingMethod: string;
  trackingNumber: string | null;
  orderTotal: number;
  onStatusChange: () => void;
}

export function OrderStatusActions({
  orderId,
  currentStatus,
  shippingMethod,
  trackingNumber,
  orderTotal,
  onStatusChange,
}: OrderStatusActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);

  const isClickCollect = shippingMethod?.startsWith("click_collect_");

  async function patchStatus(status: string) {
    setLoading(status);
    setError(null);
    try {
      const res = await fetch(`/api/shipping/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Noget gik galt");
      }
      onStatusChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  }

  async function createShipment() {
    setLoading("shipment");
    setError(null);
    try {
      const labelRes = await fetch("/api/shipping/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      if (!labelRes.ok) {
        const data = await labelRes.json();
        throw new Error(data.error ?? "Kunne ikke oprette label");
      }

      const trackRes = await fetch("/api/shipping/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      if (!trackRes.ok) {
        const data = await trackRes.json();
        throw new Error(data.error ?? "Kunne ikke sende track email");
      }

      onStatusChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Primary actions based on status */}
      {currentStatus === "pending" && (
        <button
          onClick={() => patchStatus("confirmed")}
          disabled={loading !== null}
          className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading === "confirmed" ? "Behandler…" : "Bekræft ordre"}
        </button>
      )}

      {currentStatus === "confirmed" && !isClickCollect && (
        <button
          onClick={createShipment}
          disabled={loading !== null}
          className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading === "shipment" ? "Opretter forsendelse…" : "Opret forsendelse"}
        </button>
      )}

      {currentStatus === "confirmed" && isClickCollect && (
        <button
          onClick={() => patchStatus("picked_up")}
          disabled={loading !== null}
          className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading === "picked_up" ? "Behandler…" : "Marker som afhentet"}
        </button>
      )}

      {currentStatus === "shipped" && (
        <button
          onClick={() => patchStatus("delivered")}
          disabled={loading !== null}
          className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading === "delivered" ? "Behandler…" : "Marker som leveret"}
        </button>
      )}

      {/* Refund button */}
      {(currentStatus === "shipped" || currentStatus === "delivered") && (
        <button
          onClick={() => setRefundOpen(true)}
          className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Refunder
        </button>
      )}

      {/* Cancel button */}
      {(currentStatus === "pending" || currentStatus === "confirmed") && (
        <button
          onClick={() => patchStatus("cancelled")}
          disabled={loading !== null}
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {loading === "cancelled" ? "Annullerer…" : "Annuller"}
        </button>
      )}

      {/* Tracking number display */}
      {trackingNumber && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
          <p className="text-xs text-stone-500">Trackingnummer</p>
          <p className="mt-0.5 font-mono font-medium text-stone-800">{trackingNumber}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <OrderRefundDialog
        orderId={orderId}
        orderTotal={orderTotal}
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        onRefunded={() => {
          setRefundOpen(false);
          onStatusChange();
        }}
      />
    </div>
  );
}
