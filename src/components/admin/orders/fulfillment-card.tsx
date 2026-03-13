"use client";

import { formatDate } from "@/lib/platform/format";

interface Order {
  id: string;
  fulfillment_status?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
}

interface FulfillmentCardProps {
  order: Order;
  onFulfill: () => void;
}

function FulfillmentBadge({ status }: { status: string | null | undefined }) {
  const normalized = status ?? "unfulfilled";

  const config: Record<string, { label: string; className: string }> = {
    unfulfilled: {
      label: "Ikke sendt",
      className: "bg-red-100 text-red-700",
    },
    processing: {
      label: "Under behandling",
      className: "bg-amber-100 text-amber-700",
    },
    shipped: {
      label: "Afsendt",
      className: "bg-blue-100 text-blue-700",
    },
    delivered: {
      label: "Leveret",
      className: "bg-green-100 text-green-700",
    },
  };

  const { label, className } = config[normalized] ?? config.unfulfilled;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function FulfillmentCard({ order, onFulfill }: FulfillmentCardProps) {
  const status = order.fulfillment_status ?? "unfulfilled";
  const isActionable = status === "unfulfilled" || status === "processing";
  const isShipped = status === "shipped";
  const isDelivered = status === "delivered";

  return (
    <div className="rounded-xl bg-white border border-stone-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-700">Forsendelse</h2>
        <FulfillmentBadge status={status} />
      </div>

      {isActionable && (
        <button
          onClick={onFulfill}
          className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          Marker som afsendt
        </button>
      )}

      {isShipped && (
        <div className="space-y-3">
          {order.tracking_number && (
            <div className="space-y-1">
              <p className="text-xs text-stone-500">Trackingnummer</p>
              {order.tracking_url ? (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-green-600 hover:text-green-700 underline"
                >
                  {order.tracking_number}
                </a>
              ) : (
                <p className="text-sm font-medium text-stone-800">{order.tracking_number}</p>
              )}
            </div>
          )}
          <button
            onClick={onFulfill}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            Marker som leveret
          </button>
        </div>
      )}

      {isDelivered && order.delivered_at && (
        <div className="space-y-1">
          <p className="text-xs text-stone-500">Leveret den</p>
          <p className="text-sm font-medium text-stone-800">{formatDate(order.delivered_at)}</p>
        </div>
      )}
    </div>
  );
}
