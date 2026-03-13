"use client";

import { useRouter } from "next/navigation";
import { DraftOrderForm } from "@/components/platform/draft-order-form";

export default function NewDraftOrderPage() {
  const router = useRouter();

  function handleSave() {
    router.push("/admin/platform/draft-orders");
  }

  function handleCancel() {
    router.push("/admin/platform/draft-orders");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleCancel}
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Tilbage
        </button>
        <span className="text-stone-300">/</span>
        <h1 className="text-2xl font-bold text-stone-800">Ny faktura</h1>
      </div>

      <DraftOrderForm draft={null} onSave={handleSave} onCancel={handleCancel} />
    </div>
  );
}
