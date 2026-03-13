"use client";

import { useState, useEffect } from "react";
import type { SkuProduct, ProductTemplate } from "@/lib/supabase/platform-types";
import { ProductImageUploader } from "./product-image-uploader";

const CATEGORIES = [
  { value: "covers", label: "Covers" },
  { value: "screen_protectors", label: "Skærmbeskyttere" },
  { value: "cables", label: "Kabler" },
  { value: "chargers", label: "Opladere" },
  { value: "earphones", label: "Øretelefoner" },
  { value: "other", label: "Andet" },
] as const;

interface Props {
  product?: SkuProduct | null;
  onSave: () => void;
  onCancel: () => void;
}

type VariantOption = {
  value: string;
  price_override: string;
  sku: string;
};

type VariantGroup = {
  name: string;
  options: VariantOption[];
};

function variantsFromProduct(product: SkuProduct | null | undefined): VariantGroup[] {
  if (!product?.variants?.length) return [];
  return product.variants.map((v) => ({
    name: v.name,
    options: v.options.map((o) => ({
      value: o.value,
      price_override: o.price_override != null ? String(o.price_override / 100) : "",
      sku: o.sku ?? "",
    })),
  }));
}

export function SkuProductForm({ product, onSave, onCancel }: Props) {
  const isEdit = !!product;

  const [form, setForm] = useState({
    title: product?.title ?? "",
    short_description: product?.short_description ?? "",
    description: product?.description ?? "",
    selling_price: product?.selling_price ? String(product.selling_price / 100) : "",
    cost_price: product?.cost_price ? String(product.cost_price / 100) : "",
    sale_price: product?.sale_price ? String(product.sale_price / 100) : "",
    ean: product?.ean ?? "",
    barcode: product?.barcode ?? "",
    brand: product?.brand ?? "",
    category: product?.category ?? "",
    images: product?.images ?? [],
    slug: product?.slug ?? "",
    meta_title: product?.meta_title ?? "",
    meta_description: product?.meta_description ?? "",
    status: product?.status ?? "draft",
  });

  const [variants, setVariants] = useState<VariantGroup[]>(() => variantsFromProduct(product));
  const [newGroupName, setNewGroupName] = useState("");

  // Compatible templates state
  const [linkedTemplates, setLinkedTemplates] = useState<ProductTemplate[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateResults, setTemplateResults] = useState<ProductTemplate[]>([]);
  const [templateSearching, setTemplateSearching] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load linked templates on edit
  useEffect(() => {
    if (!isEdit || !product?.id) return;
    fetch(`/api/platform/sku-product-templates?sku_product_id=${product.id}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data)) setLinkedTemplates(data);
      });
  }, [isEdit, product?.id]);

  // Search templates with debounce
  useEffect(() => {
    if (!templateSearch.trim()) {
      setTemplateResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setTemplateSearching(true);
      const res = await fetch(`/api/platform/templates?search=${encodeURIComponent(templateSearch)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTemplateResults(
            data.filter((t: ProductTemplate) => !linkedTemplates.some((lt) => lt.id === t.id))
          );
        }
      }
      setTemplateSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [templateSearch, linkedTemplates]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function generateSlug() {
    const slug = form.title
      .toLowerCase()
      .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    set("slug", slug);
  }

  // Variant helpers
  function addVariantGroup() {
    if (!newGroupName.trim()) return;
    setVariants((prev) => [
      ...prev,
      { name: newGroupName.trim(), options: [{ value: "", price_override: "", sku: "" }] },
    ]);
    setNewGroupName("");
  }

  function removeVariantGroup(gi: number) {
    setVariants((prev) => prev.filter((_, i) => i !== gi));
  }

  function addVariantOption(gi: number) {
    setVariants((prev) =>
      prev.map((g, i) =>
        i === gi ? { ...g, options: [...g.options, { value: "", price_override: "", sku: "" }] } : g
      )
    );
  }

  function removeVariantOption(gi: number, oi: number) {
    setVariants((prev) =>
      prev.map((g, i) =>
        i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g
      )
    );
  }

  function updateVariantOption(gi: number, oi: number, field: keyof VariantOption, value: string) {
    setVariants((prev) =>
      prev.map((g, i) =>
        i === gi
          ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, [field]: value } : o)) }
          : g
      )
    );
  }

  function updateVariantGroupName(gi: number, name: string) {
    setVariants((prev) => prev.map((g, i) => (i === gi ? { ...g, name } : g)));
  }

  // Template linking helpers
  async function linkTemplate(template: ProductTemplate) {
    if (isEdit && product?.id) {
      await fetch("/api/platform/sku-product-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku_product_id: product.id, template_id: template.id }),
      });
    }
    setLinkedTemplates((prev) => [...prev, template]);
    setTemplateSearch("");
    setTemplateResults([]);
  }

  async function unlinkTemplate(templateId: string) {
    if (isEdit && product?.id) {
      await fetch(
        `/api/platform/sku-product-templates?sku_product_id=${product.id}&template_id=${templateId}`,
        { method: "DELETE" }
      );
    }
    setLinkedTemplates((prev) => prev.filter((t) => t.id !== templateId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      selling_price: form.selling_price ? Math.round(parseFloat(form.selling_price) * 100) : 0,
      cost_price: form.cost_price ? Math.round(parseFloat(form.cost_price) * 100) : null,
      sale_price: form.sale_price ? Math.round(parseFloat(form.sale_price) * 100) : null,
      category: form.category || null,
      variants: variants.map((g) => ({
        name: g.name,
        options: g.options.map((o) => ({
          value: o.value,
          price_override: o.price_override ? Math.round(parseFloat(o.price_override) * 100) : null,
          sku: o.sku || null,
          image: null,
        })),
      })),
    };

    try {
      const url = isEdit ? `/api/platform/sku/${product.id}` : "/api/platform/sku";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Kunne ikke gemme");
      } else {
        onSave();
      }
    } catch {
      setError("Netværksfejl — prøv igen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section: Basic info */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Grundoplysninger
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-stone-500">Titel</label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              onBlur={() => !form.slug && generateSlug()}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Brand</label>
            <input
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Kategori</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
            >
              <option value="">Vælg kategori…</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">EAN</label>
            <input
              value={form.ean}
              onChange={(e) => set("ean", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Stregkode</label>
            <input
              value={form.barcode}
              onChange={(e) => set("barcode", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Section: Pricing */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Priser (DKK)
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Salgspris</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.selling_price}
              onChange={(e) => set("selling_price", e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Kostpris</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.cost_price}
              onChange={(e) => set("cost_price", e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Udsalgspris</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.sale_price}
              onChange={(e) => set("sale_price", e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Section: Description */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Beskrivelse
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Kort beskrivelse</label>
            <input
              value={form.short_description}
              onChange={(e) => set("short_description", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
              maxLength={200}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Fuld beskrivelse</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Section: Images */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Billeder
        </h3>
        <ProductImageUploader
          images={form.images}
          onChange={(imgs) => set("images", imgs)}
          folder={`sku/${product?.id ?? "new"}`}
          max={8}
        />
      </section>

      {/* Section: Variants */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Varianter
        </h3>
        <div className="space-y-4">
          {variants.map((group, gi) => (
            <div key={gi} className="rounded-xl border border-stone-100 bg-stone-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <input
                  value={group.name}
                  onChange={(e) => updateVariantGroupName(gi, e.target.value)}
                  placeholder="Gruppenavn (f.eks. Farve)"
                  className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => removeVariantGroup(gi)}
                  className="rounded-lg border border-red-200 px-2.5 py-2 text-xs text-red-500 hover:bg-red-50"
                >
                  Fjern gruppe
                </button>
              </div>
              <div className="space-y-2">
                {group.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      value={opt.value}
                      onChange={(e) => updateVariantOption(gi, oi, "value", e.target.value)}
                      placeholder="Værdi (f.eks. Sort)"
                      className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={opt.price_override}
                      onChange={(e) => updateVariantOption(gi, oi, "price_override", e.target.value)}
                      placeholder="Pristillæg"
                      className="w-28 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                    />
                    <input
                      value={opt.sku}
                      onChange={(e) => updateVariantOption(gi, oi, "sku", e.target.value)}
                      placeholder="SKU"
                      className="w-28 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariantOption(gi, oi)}
                      className="rounded-lg px-2 py-2 text-stone-400 hover:text-red-500"
                      title="Fjern mulighed"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addVariantOption(gi)}
                className="mt-2 text-xs font-medium text-green-600 hover:underline"
              >
                + Tilføj mulighed
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVariantGroup())}
              placeholder="Ny variantgruppe (f.eks. Størrelse)"
              className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addVariantGroup}
              className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-300"
            >
              Tilføj gruppe
            </button>
          </div>
        </div>
      </section>

      {/* Section: Compatible devices */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Kompatible enheder
        </h3>
        {linkedTemplates.length > 0 && (
          <div className="mb-4 space-y-2">
            {linkedTemplates.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
                <span className="text-sm font-medium text-stone-700">{t.display_name}</span>
                <button
                  type="button"
                  onClick={() => unlinkTemplate(t.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Fjern
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="relative">
          <input
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            placeholder="Søg efter enhed at tilknytte…"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
          />
          {templateSearching && (
            <div className="absolute right-3 top-2.5">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-green-600" />
            </div>
          )}
          {templateResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-stone-200 bg-white shadow-lg">
              {templateResults.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => linkTemplate(t)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-stone-50"
                >
                  {t.images?.[0] && (
                    <img src={t.images[0]} alt={t.display_name} className="h-7 w-7 rounded object-cover" />
                  )}
                  <span className="font-medium text-stone-700">{t.display_name}</span>
                  <span className="ml-auto text-xs text-stone-400">{t.brand}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section: SEO */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          SEO
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">URL-slug</label>
            <div className="flex gap-2">
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={generateSlug}
                className="rounded-xl bg-stone-200 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-300"
              >
                Generer
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Meta titel</label>
            <input
              value={form.meta_title}
              onChange={(e) => set("meta_title", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
              maxLength={70}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Meta beskrivelse</label>
            <textarea
              value={form.meta_description}
              onChange={(e) => set("meta_description", e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
              maxLength={160}
            />
          </div>
        </div>
      </section>

      {/* Status + actions */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.status === "published"}
            onChange={(e) => set("status", e.target.checked ? "published" : "draft")}
            className="h-4 w-4 rounded border-stone-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm font-medium text-stone-700">Publiceret</span>
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-stone-200 bg-white px-6 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Annuller
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-green-600/20 hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Gemmer..." : isEdit ? "Gem ændringer" : "Opret produkt"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}
    </form>
  );
}
