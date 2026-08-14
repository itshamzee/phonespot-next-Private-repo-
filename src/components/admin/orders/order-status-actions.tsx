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
  const [shipmentNote, setShipmentNote] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);

  const labelUrl = `/api/admin/shipping/label?order_id=${orderId}`;

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
    setShipmentNote(null);
    try {
      // Label booking, PDF-arkivering og kundemail sker samlet server-side —
      // ét kald, så kunden aldrig kan mangle sin forsendelsesmail.
      const labelRes = await fetch("/api/shipping/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await labelRes.json();
      if (!labelRes.ok) {
        throw new Error(data.error ?? "Kunne ikke oprette label");
      }

      setShipmentNote(
        data.email_sent
          ? "Label oprettet — kunden har fået besked med tracking."
          : "Label oprettet, men kundemailen fejlede — send den manuelt.",
      );

      if (data.label_url) {
        window.open(data.label_url, "_blank", "noopener");
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
          className="w-full rounded-lg bg-green-eco px-4 py-2 text-sm font-medium text-white hover:bg-green-eco/90 disabled:opacity-50"
        >
          {loading === "confirmed" ? "Behandler…" : "Bekræft ordre"}
        </button>
      )}

      {currentStatus === "confirmed" && !isClickCollect && (
        <button
          onClick={createShipment}
          disabled={loading !== null}
          className="w-full rounded-lg bg-green-eco px-4 py-2 text-sm font-medium text-white hover:bg-green-eco/90 disabled:opacity-50"
        >
          {loading === "shipment" ? "Opretter forsendelse…" : "Opret forsendelse"}
        </button>
      )}

      {currentStatus === "confirmed" && isClickCollect && (
        <button
          onClick={() => patchStatus("picked_up")}
          disabled={loading !== null}
          className="w-full rounded-lg bg-green-eco px-4 py-2 text-sm font-medium text-white hover:bg-green-eco/90 disabled:opacity-50"
        >
          {loading === "picked_up" ? "Behandler…" : "Marker som afhentet"}
        </button>
      )}

      {currentStatus === "shipped" && (
        <button
          onClick={() => patchStatus("delivered")}
          disabled={loading !== null}
          className="w-full rounded-lg bg-green-eco px-4 py-2 text-sm font-medium text-white hover:bg-green-eco/90 disabled:opacity-50"
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
          className="w-full rounded-lg border border-sand bg-white px-4 py-2 text-sm font-medium text-charcoal-light hover:bg-cream disabled:opacity-50"
        >
          {loading === "cancelled" ? "Annullerer…" : "Annuller"}
        </button>
      )}

      {/* Tracking number + label */}
      {trackingNumber && (
        <div className="rounded-lg border border-sand bg-cream px-3 py-2 text-sm">
          <p className="text-xs text-gray">Trackingnummer</p>
          <p className="mt-0.5 font-mono font-medium text-charcoal">{trackingNumber}</p>
          <a
            href={labelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-sand bg-white px-3 py-1.5 text-xs font-semibold text-charcoal transition-colors hover:bg-sand/40"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" />
            </svg>
            Se pakkelabel (PDF)
          </a>
        </div>
      )}

      {/* Shipment result note */}
      {shipmentNote && (
        <p className="rounded-lg bg-[#EFF5F1] px-3 py-2 text-sm text-[#1A3D2E]">{shipmentNote}</p>
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
