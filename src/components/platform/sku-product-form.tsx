"use client";

import { useState } from "react";
import { SupplierSelect } from "@/components/platform/supplier-select";
import { parseDKKToOere, formatPrice } from "@/lib/platform/format";

const CATEGORIES = [
  { value: "covers", label: "Covers" },
  { value: "screen_protectors", label: "Skærmbeskyttere" },
  { value: "cables", label: "Kabler" },
  { value: "chargers", label: "Opladere" },
  { value: "earphones", label: "Øretelefoner" },
  { value: "other", label: "Andet" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

interface SkuProductFormProps {
  product?: any;
  onSaved: (product: any) => void;
  onCancel: () => void;
}

interface FormState {
  title: string;
  description: string;
  ean: string;
  product_number: string;
  cost_price: string;
  selling_price: string;
  sale_price: string;
  brand: string;
  category: Category | "";
  subcategory: string;
  supplier_id: string | null;
  images: string[];
}

function oereToInput(oere: number | null | undefined): string {
  if (oere == null) return "";
  return formatPrice(oere).replace(/\./g, "").replace(",", ".");
}

function FieldLabel({
  htmlFor,
  children,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-stone-700">
      {children}
      {optional && <span className="ml-1 text-xs font-normal text-stone-400">(valgfrit)</span>}
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-green-eco/60 focus:outline-none focus:ring-1 focus:ring-green-eco/20 transition"
    />
  );
}

export function SkuProductForm({ product, onSaved, onCancel }: SkuProductFormProps) {
  const isEdit = !!product;

  const [form, setForm] = useState<FormState>({
    title: product?.title ?? "",
    description: product?.description ?? "",
    ean: product?.ean ?? "",
    product_number: product?.product_number ?? "",
    cost_price: oereToInput(product?.cost_price),
    selling_price: oereToInput(product?.selling_price),
    sale_price: oereToInput(product?.sale_price),
    brand: product?.brand ?? "",
    category: product?.category ?? "",
    subcategory: product?.subcategory ?? "",
    supplier_id: product?.supplier_id ?? null,
    images: product?.images ?? [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const e = { ...prev };
        delete e[key];
        return e;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = "Titel er påkrævet";
    if (!form.selling_price.trim()) {
      newErrors.selling_price = "Salgspris er påkrævet";
    } else {
      const oere = parseDKKToOere(form.selling_price);
      if (oere === null || oere < 0) newErrors.selling_price = "Ugyldig pris";
    }
    if (form.cost_price.trim()) {
      const oere = parseDKKToOere(form.cost_price);
      if (oere === null || oere < 0) newErrors.cost_price = "Ugyldig pris";
    }
    if (form.sale_price.trim()) {
      const oere = parseDKKToOere(form.sale_price);
      if (oere === null || oere < 0) newErrors.sale_price = "Ugyldig pris";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        images: form.images,
        selling_price: parseDKKToOere(form.selling_price)!,
      };

      if (form.description.trim()) body.description = form.description.trim();
      if (form.ean.trim()) body.ean = form.ean.trim();
      if (form.product_number.trim()) body.product_number = form.product_number.trim();
      if (form.cost_price.trim()) body.cost_price = parseDKKToOere(form.cost_price);
      if (form.sale_price.trim()) body.sale_price = parseDKKToOere(form.sale_price);
      if (form.brand.trim()) body.brand = form.brand.trim();
      if (form.category) body.category = form.category;
      if (form.subcategory.trim()) body.subcategory = form.subcategory.trim();
      if (form.supplier_id) body.supplier_id = form.supplier_id;

      const url = isEdit ? `/api/platform/sku/${product.id}` : "/api/platform/sku";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.issues) {
          const fieldErrors: Record<string, string> = {};
          for (const [field, msgs] of Object.entries(err.issues)) {
            fieldErrors[field] = (msgs as string[]).join(", ");
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ _form: err.error ?? "Fejl ved gemning" });
        }
        return;
      }

      const saved = await res.json();
      onSaved(saved);
    } catch {
      setErrors({ _form: "Netværksfejl — prøv igen" });
    } finally {
      setSaving(false);
    }
  }

  function handleAddImage() {
    const url = newImageUrl.trim();
    if (!url) return;
    setField("images", [...form.images, url]);
    setNewImageUrl("");
  }

  function handleRemoveImage(index: number) {
    setField(
      "images",
      form.images.filter((_, i) => i !== index),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors._form && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors._form}
        </div>
      )}

      {/* Basis info */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Produktinfo
        </h3>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <FieldLabel htmlFor="sku-title">Titel</FieldLabel>
            <TextInput
              id="sku-title"
              value={form.title}
              onChange={(v) => setField("title", v)}
              placeholder="f.eks. iPhone 15 Cover — Klar silikone"
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <FieldLabel htmlFor="sku-description" optional>
              Beskrivelse
            </FieldLabel>
            <textarea
              id="sku-description"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={3}
              placeholder="Kort produktbeskrivelse..."
              className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-green-eco/60 focus:outline-none focus:ring-1 focus:ring-green-eco/20 transition"
            />
          </div>

          {/* Brand + Category grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="sku-brand" optional>
                Mærke
              </FieldLabel>
              <TextInput
                id="sku-brand"
                value={form.brand}
                onChange={(v) => setField("brand", v)}
                placeholder="Apple, Samsung, Baseus..."
              />
            </div>

            <div>
              <FieldLabel htmlFor="sku-category" optional>
                Kategori
              </FieldLabel>
              <select
                id="sku-category"
                value={form.category}
                onChange={(e) => setField("category", e.target.value as Category | "")}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 focus:border-green-eco/60 focus:outline-none focus:ring-1 focus:ring-green-eco/20 transition"
              >
                <option value="">Vælg kategori...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subcategory */}
          <div>
            <FieldLabel htmlFor="sku-subcategory" optional>
              Underkategori
            </FieldLabel>
            <TextInput
              id="sku-subcategory"
              value={form.subcategory}
              onChange={(v) => setField("subcategory", v)}
              placeholder="f.eks. MagSafe, USB-C, Lightning..."
            />
          </div>

          {/* EAN + Product number */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="sku-ean" optional>
                EAN / Stregkode
              </FieldLabel>
              <TextInput
                id="sku-ean"
                value={form.ean}
                onChange={(v) => setField("ean", v)}
                placeholder="1234567890123"
              />
            </div>
            <div>
              <FieldLabel htmlFor="sku-product-number" optional>
                Varenummer
              </FieldLabel>
              <TextInput
                id="sku-product-number"
                value={form.product_number}
                onChange={(v) => setField("product_number", v)}
                placeholder="SKU-001"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Priser */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Priser (DKK)
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <FieldLabel htmlFor="sku-cost-price" optional>
              Kostpris
            </FieldLabel>
            <div className="relative">
              <TextInput
                id="sku-cost-price"
                value={form.cost_price}
                onChange={(v) => setField("cost_price", v)}
                placeholder="0,00"
              />
            </div>
            {errors.cost_price && (
              <p className="mt-1 text-xs text-red-500">{errors.cost_price}</p>
            )}
          </div>

          <div>
            <FieldLabel htmlFor="sku-selling-price">Salgspris</FieldLabel>
            <TextInput
              id="sku-selling-price"
              value={form.selling_price}
              onChange={(v) => setField("selling_price", v)}
              placeholder="99,00"
            />
            {errors.selling_price && (
              <p className="mt-1 text-xs text-red-500">{errors.selling_price}</p>
            )}
          </div>

          <div>
            <FieldLabel htmlFor="sku-sale-price" optional>
              Tilbudspris
            </FieldLabel>
            <TextInput
              id="sku-sale-price"
              value={form.sale_price}
              onChange={(v) => setField("sale_price", v)}
              placeholder="79,00"
            />
            {errors.sale_price && (
              <p className="mt-1 text-xs text-red-500">{errors.sale_price}</p>
            )}
          </div>
        </div>
      </section>

      {/* Leverandør */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Leverandør
        </h3>
        <SupplierSelect
          value={form.supplier_id}
          onChange={(id) => setField("supplier_id", id)}
        />
      </section>

      {/* Billeder */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Billeder (URL)
        </h3>

        {form.images.length > 0 && (
          <ul className="mb-4 space-y-2">
            {form.images.map((url, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-2.5"
              >
                <img
                  src={url}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg object-cover bg-stone-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="flex-1 truncate font-mono text-xs text-stone-500">{url}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(i)}
                  className="shrink-0 rounded-lg p-1 text-stone-400 transition hover:bg-red-50 hover:text-red-500"
                  aria-label="Fjern billede"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            type="url"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddImage();
              }
            }}
            placeholder="https://example.com/billed.jpg"
            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-green-eco/60 focus:outline-none focus:ring-1 focus:ring-green-eco/20 transition"
          />
          <button
            type="button"
            onClick={handleAddImage}
            disabled={!newImageUrl.trim()}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-40"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tilføj
          </button>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
        >
          Annuller
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-green-eco px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-green-eco/20 transition hover:brightness-110 disabled:opacity-60"
        >
          {saving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Gemmer...
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Gem
            </>
          )}
        </button>
      </div>
    </form>
  );
}
