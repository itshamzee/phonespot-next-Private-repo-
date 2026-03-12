interface OrderStatusBadgeProps {
  status: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending:   { label: "Afventende", className: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Bekræftet",  className: "bg-blue-100 text-blue-800" },
  shipped:   { label: "Afsendt",    className: "bg-indigo-100 text-indigo-800" },
  picked_up: { label: "Afhentet",   className: "bg-green-100 text-green-800" },
  delivered: { label: "Leveret",    className: "bg-green-100 text-green-800" },
  cancelled: { label: "Annulleret", className: "bg-stone-100 text-stone-600" },
  refunded:  { label: "Refunderet", className: "bg-red-100 text-red-700" },
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { label: status, className: "bg-stone-100 text-stone-600" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
