"use client";

import { useState } from "react";
import type { ProductTemplate } from "@/lib/supabase/platform-types";
import { ProductImageUploader } from "./product-image-uploader";

interface Props {
  template?: ProductTemplate | null;
  onSave: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: "iphone", label: "iPhone" },
  { value: "smartphone", label: "Smartphone" },
  { value: "ipad", label: "iPad" },
  { value: "tablet", label: "Tablet" },
  { value: "laptop", label: "Laptop" },
  { value: "smartwatch", label: "Smartwatch" },
  { value: "console", label: "Konsol" },
  { value: "accessory", label: "Tilbehør" },
  { value: "other", label: "Andet" },
];

const STORAGE_OPTIONS = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"];

export function ProductTemplateForm({ template, onSave, onCancel }: Props) {
  const isEdit = !!template;

  const [form, setForm] = useState({
    brand: template?.brand ?? "",
    model: template?.model ?? "",
    display_name: template?.display_name ?? "",
    category: template?.category ?? "smartphone",
    storage_options: template?.storage_options ?? [],
    colors: template?.colors ?? [],
    base_price_a: template?.base_price_a ? String(template.base_price_a / 100) : "",
    base_price_b: template?.base_price_b ? String(template.base_price_b / 100) : "",
    base_price_c: template?.base_price_c ? String(template.base_price_c / 100) : "",
    description: template?.description ?? "",
    short_description: template?.short_description ?? "",
    meta_title: template?.meta_title ?? "",
    meta_description: template?.meta_description ?? "",
    slug: template?.slug ?? "",
    images: template?.images ?? [],
    specifications: template?.specifications ?? {},
    status: template?.status ?? "draft",
  });

  const [newColor, setNewColor] = useState("");
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleStorage(opt: string) {
    set(
      "storage_options",
      form.storage_options.includes(opt)
        ? form.storage_options.filter((s) => s !== opt)
        : [...form.storage_options, opt]
    );
  }

  function addColor() {
    if (newColor.trim() && !form.colors.includes(newColor.trim())) {
      set("colors", [...form.colors, newColor.trim()]);
      setNewColor("");
    }
  }

  function addSpec() {
    if (newSpecKey.trim()) {
      set("specifications", { ...form.specifications, [newSpecKey.trim()]: newSpecValue.trim() });
      setNewSpecKey("");
      setNewSpecValue("");
    }
  }

  function generateSlug() {
    const slug = form.display_name
      .toLowerCase()
      .replace(/ae/g, "ae").replace(/oe/g, "oe").replace(/aa/g, "aa")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    set("slug", slug);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      base_price_a: form.base_price_a ? Math.round(parseFloat(form.base_price_a) * 100) : null,
      base_price_b: form.base_price_b ? Math.round(parseFloat(form.base_price_b) * 100) : null,
      base_price_c: form.base_price_c ? Math.round(parseFloat(form.base_price_c) * 100) : null,
    };

    try {
      const url = isEdit
        ? `/api/platform/templates/${template.id}`
        : "/api/platform/templates";
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
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Brand</label>
            <input
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Model</label>
            <input
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Visningsnavn</label>
            <input
              value={form.display_name}
              onChange={(e) => set("display_name", e.target.value)}
              onBlur={() => !form.slug && generateSlug()}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Kategori</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Section: Storage options */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Lagerkapacitet
        </h3>
        <div className="flex flex-wrap gap-2">
          {STORAGE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggleStorage(opt)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                form.storage_options.includes(opt)
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </section>

      {/* Section: Colors */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Farver
        </h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {form.colors.map((color) => (
            <span
              key={color}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm"
            >
              {color}
              <button
                type="button"
                onClick={() => set("colors", form.colors.filter((c) => c !== color))}
                className="text-stone-400 hover:text-red-500"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
            placeholder="Tilføj farve..."
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addColor}
            className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-300"
          >
            Tilføj
          </button>
        </div>
      </section>

      {/* Section: Pricing per grade */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Priser pr. grade (DKK)
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["A", "B", "C"] as const).map((grade) => {
            const key = `base_price_${grade.toLowerCase()}` as keyof typeof form;
            return (
              <div key={grade}>
                <label className="mb-1 block text-xs font-semibold text-stone-500">
                  Grade {grade}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={form[key] as string}
                  onChange={(e) => set(key, e.target.value as never)}
                  placeholder="0"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
                />
              </div>
            );
          })}
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
                required
              />
              <button type="button" onClick={generateSlug} className="rounded-xl bg-stone-200 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-300">
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

      {/* Section: Images */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Billeder
        </h3>
        <ProductImageUploader
          images={form.images}
          onChange={(imgs) => set("images", imgs)}
          folder={`templates/${template?.id ?? "new"}`}
          max={8}
        />
      </section>

      {/* Section: Specifications */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Specifikationer
        </h3>
        {Object.entries(form.specifications).length > 0 && (
          <div className="mb-4 space-y-2">
            {Object.entries(form.specifications).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="min-w-[120px] text-sm font-medium text-stone-600">{key}</span>
                <span className="text-sm text-stone-500">{value as string}</span>
                <button
                  type="button"
                  onClick={() => {
                    const specs = { ...form.specifications };
                    delete specs[key];
                    set("specifications", specs);
                  }}
                  className="ml-auto text-xs text-red-500 hover:underline"
                >
                  Fjern
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={newSpecKey}
            onChange={(e) => setNewSpecKey(e.target.value)}
            placeholder="Nøgle (f.eks. Skærm)"
            className="w-36 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
          />
          <input
            value={newSpecValue}
            onChange={(e) => setNewSpecValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpec())}
            placeholder="Værdi (f.eks. 6.1 tommer)"
            className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addSpec}
            className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-300"
          >
            Tilføj
          </button>
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
            {saving ? "Gemmer..." : isEdit ? "Gem ændringer" : "Opret skabelon"}
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
