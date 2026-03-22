"use client";

import { useState } from "react";
import type { ProductTemplate, SkuProduct } from "@/lib/supabase/platform-types";
import { ProductTemplateList } from "@/components/platform/product-template-list";
import { ProductTemplateForm } from "@/components/platform/product-template-form";
import { SkuProductList } from "@/components/platform/sku-product-list";
import { SkuProductForm } from "@/components/platform/sku-product-form";
import { UnifiedProductForm } from "@/components/platform/unified-product-form";

type Tab = "templates" | "sku" | "spare-parts";
type View = "list" | "create" | "edit";

const TAB_TO_TYPE: Record<Tab, "device" | "accessory" | "spare-part"> = {
  templates: "device",
  sku: "accessory",
  "spare-parts": "spare-part",
};

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>("templates");
  const [view, setView] = useState<View>("list");
  const [editTemplate, setEditTemplate] = useState<ProductTemplate | null>(null);
  const [editSku, setEditSku] = useState<SkuProduct | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleEditTemplate(t: ProductTemplate) {
    setEditTemplate(t);
    setView("edit");
  }

  function handleEditSku(s: SkuProduct) {
    setEditSku(s);
    setView("edit");
  }

  function handleBack() {
    setView("list");
    setEditTemplate(null);
    setEditSku(null);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Produkter
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            Administrer enhedsskabeloner og tilbehør
          </p>
        </div>
        {view === "list" && (
          <button
            onClick={() => setView("create")}
            className="flex items-center gap-2 rounded-xl bg-green-eco px-5 py-3 text-sm font-bold text-white shadow-md shadow-green-eco/15 transition-all hover:bg-green-light hover:shadow-lg active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Opret produkt
          </button>
        )}
      </div>

      {/* Tabs — only show in list view */}
      {view === "list" && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setTab("templates")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all whitespace-nowrap ${
              tab === "templates"
                ? "bg-charcoal text-white shadow-sm"
                : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 shadow-sm"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
            Enheder
          </button>
          <button
            onClick={() => setTab("sku")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all whitespace-nowrap ${
              tab === "sku"
                ? "bg-charcoal text-white shadow-sm"
                : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 shadow-sm"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            Tilbehør
          </button>
          <button
            onClick={() => setTab("spare-parts")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all whitespace-nowrap ${
              tab === "spare-parts"
                ? "bg-charcoal text-white shadow-sm"
                : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 shadow-sm"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
            </svg>
            Reservedele
          </button>
        </div>
      )}

      {/* Content */}
      {view === "list" ? (
        tab === "templates" ? (
          <ProductTemplateList key={refreshKey} onEdit={handleEditTemplate} />
        ) : tab === "sku" ? (
          <SkuProductList key={refreshKey} onEdit={handleEditSku} lockedCategory="accessory" excludeSubcategory="spare-part" />
        ) : (
          <SkuProductList key={refreshKey} onEdit={handleEditSku} lockedCategory="accessory" lockedSubcategory="spare-part" />
        )
      ) : view === "create" ? (
        tab === "templates" ? (
          <ProductTemplateForm
            onSave={handleBack}
            onCancel={handleBack}
          />
        ) : (
          <SkuProductForm
            onSave={handleBack}
            onCancel={handleBack}
            lockedCategory="accessory"
            lockedSubcategory={tab === "spare-parts" ? "spare-part" : undefined}
          />
        )
      ) : tab === "templates" ? (
        <ProductTemplateForm
          template={editTemplate}
          onSave={handleBack}
          onCancel={handleBack}
        />
      ) : (
        <SkuProductForm
          product={editSku}
          onSave={handleBack}
          onCancel={handleBack}
        />
      )}
    </div>
  );
}
