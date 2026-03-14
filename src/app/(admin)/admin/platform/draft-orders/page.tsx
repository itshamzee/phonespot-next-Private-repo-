"use client";

import { useRouter } from "next/navigation";
import type { DraftOrder } from "@/lib/supabase/platform-types";
import { DraftOrderList } from "@/components/platform/draft-order-list";

export default function DraftOrdersPage() {
  const router = useRouter();

  function handleSelect(draft: DraftOrder) {
    router.push(`/admin/platform/draft-orders/${draft.id}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Fakturakladder
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            Opret og administrer manuelle fakturaer
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/platform/draft-orders/new")}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/15 transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Opret faktura
        </button>
      </div>

      <DraftOrderList onSelect={handleSelect} />
    </div>
  );
}
