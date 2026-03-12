"use client";

import { useState } from "react";
import { formatOere } from "@/lib/cart/utils";

interface OrderRefundDialogProps {
  orderId: string;
  orderTotal: number;
  open: boolean;
  onClose: () => void;
  onRefunded: () => void;
}

export function OrderRefundDialog({
  orderId,
  orderTotal,
  open,
  onClose,
  onRefunded,
}: OrderRefundDialogProps) {
  const [reason, setReason] = useState("");
  const [partial, setPartial] = useState(false);
  const [amountKr, setAmountKr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;

    setLoading(true);
    setError(null);

    const body: Record<string, any> = { reason };
    if (partial) {
      const amountOere = Math.round(parseFloat(amountKr) * 100);
      if (!amountOere || amountOere <= 0) {
        setError("Angiv et gyldigt beløb");
        setLoading(false);
        return;
      }
      body.amount = amountOere;
    }

    try {
      const res = await fetch(`/api/shipping/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Refusion mislykkedes");
      }
      setSuccess(true);
      setTimeout(() => {
        onRefunded();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-stone-800">Refunder ordre</h2>
        <p className="mt-1 text-sm text-stone-500">
          Ordretotal: {formatOere(orderTotal)}
        </p>

        {success ? (
          <div className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Refusion gennemført!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-stone-700">
                Årsag til refusion <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Full / partial toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPartial(false)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  !partial
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-stone-300 text-stone-600 hover:bg-stone-50"
                }`}
              >
                Fuld refusion
              </button>
              <button
                type="button"
                onClick={() => setPartial(true)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  partial
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-stone-300 text-stone-600 hover:bg-stone-50"
                }`}
              >
                Delvis refusion
              </button>
            </div>

            {/* Partial amount */}
            {partial && (
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Beløb (DKK)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={orderTotal / 100}
                  value={amountKr}
                  onChange={(e) => setAmountKr(e.target.value)}
                  placeholder="0,00"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Annuller
              </button>
              <button
                type="submit"
                disabled={loading || !reason.trim()}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Refunderer…" : "Refunder"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
