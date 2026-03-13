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
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Produkter</h1>
          <p className="mt-1 text-sm text-stone-400">
            Administrer enhedsskabeloner og tilbehør
          </p>
        </div>
        {view === "list" && (
          <button
            onClick={() => {
              setEditTemplate(null);
              setEditSku(null);
              setView("form");
            }}
            className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-green-600/20 hover:brightness-110"
          >
            {tab === "templates" ? "Opret skabelon" : "Opret produkt"}
          </button>
        )}
      </div>

      {/* Tabs */}
      {view === "list" && (
        <div className="flex gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
          <button
            onClick={() => setTab("templates")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === "templates"
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Enheder
          </button>
          <button
            onClick={() => setTab("sku")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === "sku"
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Tilbehør / SKU
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
