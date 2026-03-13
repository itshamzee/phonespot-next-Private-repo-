"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { DraftOrder } from "@/lib/supabase/platform-types";
import { DraftOrderForm } from "@/components/platform/draft-order-form";

export default function DraftOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : (params.id as string[])?.[0];

  const [draft, setDraft] = useState<DraftOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/platform/draft-orders/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<DraftOrder>;
      })
      .then((data) => {
        setDraft(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [id]);

  function handleSave() {
    router.push("/admin/platform/draft-orders");
  }

  function handleCancel() {
    router.push("/admin/platform/draft-orders");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-green-600" />
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
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
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? "Fakturakladde ikke fundet"}
        </div>
      </div>
    );
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
        <h1 className="text-2xl font-bold text-stone-800">
          Faktura {draft.draft_number}
        </h1>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            draft.status === "draft"
              ? "bg-stone-100 text-stone-600"
              : draft.status === "sent"
              ? "bg-blue-50 text-blue-700"
              : draft.status === "paid"
              ? "bg-green-50 text-green-700"
              : draft.status === "converting"
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {draft.status === "draft"
            ? "Kladde"
            : draft.status === "sent"
            ? "Sendt"
            : draft.status === "paid"
            ? "Betalt"
            : draft.status === "converting"
            ? "Behandles"
            : "Annulleret"}
        </span>
      </div>

      <DraftOrderForm draft={draft} onSave={handleSave} onCancel={handleCancel} />
    </div>
  );
}
