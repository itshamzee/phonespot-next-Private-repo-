"use client";

import { useEffect, useState } from "react";
import { AbandonedCheckoutList } from "@/components/platform/abandoned-checkout-list";

export default function AbandonedCheckoutsPage() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/shipping/orders?status=abandoned&per_page=100")
      .then((r) => r.json())
      .then((json) => {
        if (typeof json.total === "number") {
          setCount(json.total);
        } else if (Array.isArray(json.orders)) {
          setCount(json.orders.length);
        }
      })
      .catch(() => setCount(null));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Forladt checkout
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            Ordrer der ikke blev gennemf\u00f8rt — send p\u00e5mindelser eller kopier recovery-links
          </p>
        </div>
        {count !== null && (
          <span className="rounded-full bg-amber-500/10 px-3.5 py-1.5 text-sm font-bold text-amber-600">
            {count} {count === 1 ? "ordre" : "ordrer"}
          </span>
        )}
      </div>

      <AbandonedCheckoutList />
    </div>
  );
}
