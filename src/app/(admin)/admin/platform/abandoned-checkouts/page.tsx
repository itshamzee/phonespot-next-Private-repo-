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
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Forladt checkout</h1>
          <p className="mt-1 text-sm text-stone-400">
            Ordrer der ikke blev gennemført — send påmindelser eller kopier recovery-links
          </p>
        </div>
        {count !== null && (
          <span className="ml-auto inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
            {count} {count === 1 ? "ordre" : "ordrer"}
          </span>
        )}
      </div>

      {/* List */}
      <AbandonedCheckoutList />
    </div>
  );
}
