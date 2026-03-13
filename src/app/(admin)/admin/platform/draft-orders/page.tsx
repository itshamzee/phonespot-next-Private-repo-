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
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Fakturakladder</h1>
          <p className="mt-1 text-sm text-stone-400">
            Opret og administrer manuelle fakturaer
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/platform/draft-orders/new")}
          className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-green-600/20 hover:brightness-110"
        >
          Opret faktura
        </button>
      </div>

      <DraftOrderList onSelect={handleSelect} />
    </div>
  );
}
