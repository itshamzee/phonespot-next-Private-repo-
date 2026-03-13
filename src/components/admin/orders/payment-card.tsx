"use client";

import { formatDKK } from "@/lib/platform/format";

interface Order {
  id: string;
  payment_status?: string | null;
  payment_method?: string | null;
  stripe_payment_id?: string | null;
  total: number;
}

interface PaymentCardProps {
  order: Order;
}

function PaymentBadge({ status }: { status: string | null | undefined }) {
  const normalized = status ?? "pending";

  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Afventer",
      className: "bg-amber-100 text-amber-700",
    },
    paid: {
      label: "Betalt",
      className: "bg-green-100 text-green-700",
    },
    refunded: {
      label: "Refunderet",
      className: "bg-red-100 text-red-700",
    },
  };

  const { label, className } = config[normalized] ?? config.pending;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function PaymentCard({ order }: PaymentCardProps) {
  return (
    <div className="rounded-xl bg-white border border-stone-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-700">Betaling</h2>
        <PaymentBadge status={order.payment_status} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-500">Total</p>
          <p className="text-sm font-semibold text-stone-800">{formatDKK(order.total)}</p>
        </div>

        {order.payment_method && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">Betalingsmetode</p>
            <p className="text-sm text-stone-700">{order.payment_method}</p>
          </div>
        )}

        {order.stripe_payment_id && (
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-stone-500 shrink-0">Stripe ID</p>
            <a
              href={`https://dashboard.stripe.com/payments/${order.stripe_payment_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-green-600 hover:text-green-700 underline truncate text-right"
            >
              {order.stripe_payment_id}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
