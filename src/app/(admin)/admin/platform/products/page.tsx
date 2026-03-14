"use client";

import { useState } from "react";
import type { ProductTemplate, SkuProduct } from "@/lib/supabase/platform-types";
import { ProductTemplateList } from "@/components/platform/product-template-list";
import { ProductTemplateForm } from "@/components/platform/product-template-form";
import { SkuProductList } from "@/components/platform/sku-product-list";
import { SkuProductForm } from "@/components/platform/sku-product-form";

type Tab = "templates" | "sku";
type View = "list" | "form";

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>("templates");
  const [view, setView] = useState<View>("list");
  const [editTemplate, setEditTemplate] = useState<ProductTemplate | null>(null);
  const [editSku, setEditSku] = useState<SkuProduct | null>(null);

  function handleEditTemplate(t: ProductTemplate) {
    setEditTemplate(t);
    setView("form");
  }

  function handleEditSku(s: SkuProduct) {
    setEditSku(s);
    setView("form");
  }

  function handleBack() {
    setView("list");
    setEditTemplate(null);
    setEditSku(null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Produkter
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            Administrer enhedsskabeloner og tilbeh\u00f8r
          </p>
        </div>
        {view === "list" && (
          <button
            onClick={() => {
              setEditTemplate(null);
              setEditSku(null);
              setView("form");
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/15 transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {tab === "templates" ? "Opret skabelon" : "Opret produkt"}
          </button>
        )}
      </div>

      {/* Tabs */}
      {view === "list" && (
        <div className="flex gap-2">
          <button
            onClick={() => setTab("templates")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all ${
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
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all ${
              tab === "sku"
                ? "bg-charcoal text-white shadow-sm"
                : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 shadow-sm"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            Tilbeh\u00f8r / SKU
          </button>
        </div>
      )}

      {/* Content */}
      {view === "list" ? (
        tab === "templates" ? (
          <ProductTemplateList onEdit={handleEditTemplate} />
        ) : (
          <SkuProductList onEdit={handleEditSku} />
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
