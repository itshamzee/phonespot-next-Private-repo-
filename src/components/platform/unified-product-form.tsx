"use client";

import { useState, useEffect } from "react";
import { ProductImageUploader } from "./product-image-uploader";

type ProductType = "device" | "accessory" | "spare-part";

interface Props {
  /** Pre-select a product type based on the active tab */
  defaultType?: ProductType | null;
  onSave: () => void;
  onCancel: () => void;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  product_type: string;
  is_active: boolean;
}

const STORAGE_OPTIONS = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function UnifiedProductForm({ defaultType, onSave, onCancel }: Props) {
  const [step, setStep] = useState<1 | 2>(defaultType ? 2 : 1);
  const [productType, setProductType] = useState<ProductType | null>(defaultType ?? null);

  // Shared fields
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");

  // Device fields
  const [model, setModel] = useState("");
  const [storageOptions, setStorageOptions] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [newColor, setNewColor] = useState("");
  const [basePriceA, setBasePriceA] = useState("");
  const [basePriceB, setBasePriceB] = useState("");
  const [basePriceC, setBasePriceC] = useState("");

  // SKU fields (accessory + spare-part)
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [ean, setEan] = useState("");
  const [barcode, setBarcode] = useState("");

  // Categories from API
  const [categories, setCategories] = useState<Category[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories when product type is set
  useEffect(() => {
    if (!productType) return;
    const typeMap: Record<ProductType, string> = {
      device: "device",
      accessory: "accessory",
      "spare-part": "spare-part",
    };
    fetch(`/api/platform/categories?product_type=${typeMap[productType]}&active=true`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Category[]) => {
        // Only show child categories (those with a parent_id)
        const children = data.filter((c) => c.parent_id !== null);
        setCategories(children.length > 0 ? children : data);
      })
      .catch(() => setCategories([]));
  }, [productType]);

  function selectType(type: ProductType) {
    setProductType(type);
    setStep(2);
  }

  function handleTitleBlur() {
    if (!slug && title.trim()) {
      setSlug(generateSlug(title));
    }
  }

  function toggleStorage(opt: string) {
    setStorageOptions((prev) =>
      prev.includes(opt) ? prev.filter((s) => s !== opt) : [...prev, opt]
    );
  }

  function addColor() {
    if (newColor.trim() && !colors.includes(newColor.trim())) {
      setColors((prev) => [...prev, newColor.trim()]);
      setNewColor("");
    }
  }

  async function handleSubmit(overrideStatus?: "draft" | "published") {
    setSaving(true);
    setError(null);

    const finalStatus = overrideStatus ?? status;

    try {
      if (productType === "device") {
        // POST to /api/platform/templates
        const payload = {
          brand,
          model,
          display_name: title,
          category: categoryId || "smartphone",
          storage_options: storageOptions,
          colors,
          base_price_a: basePriceA ? Math.round(parseFloat(basePriceA) * 100) : null,
          base_price_b: basePriceB ? Math.round(parseFloat(basePriceB) * 100) : null,
          base_price_c: basePriceC ? Math.round(parseFloat(basePriceC) * 100) : null,
          description,
          slug,
          images,
          status: finalStatus,
        };

        const res = await fetch("/api/platform/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Kunne ikke gemme");
          return;
        }
      } else {
        // POST to /api/platform/sku
        const payload = {
          title,
          brand,
          category: "accessory",
          subcategory: productType === "spare-part" ? "spare-part" : (categoryId || null),
          selling_price: sellingPrice ? Math.round(parseFloat(sellingPrice) * 100) : 0,
          cost_price: costPrice ? Math.round(parseFloat(costPrice) * 100) : null,
          sale_price: salePrice ? Math.round(parseFloat(salePrice) * 100) : null,
          ean: ean || null,
          barcode: barcode || null,
          description,
          slug,
          images,
          status: finalStatus,
        };

        const res = await fetch("/api/platform/sku", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Kunne ikke gemme");
          return;
        }
      }

      onSave();
    } catch {
      setError("Netvaerksfejl — proev igen");
    } finally {
      setSaving(false);
    }
  }

  // ── Step 1: Type selection ──────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <h3 className="font-display text-xl font-bold text-stone-800">
            Opret nyt produkt
          </h3>
          <p className="mt-1 text-sm text-stone-400">
            Vaelg produkttype for at komme i gang
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Device card */}
          <button
            type="button"
            onClick={() => selectType("device")}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-stone-200 bg-white p-8 transition-all hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <div className="text-center">
              <span className="block text-base font-bold text-stone-800">Enhed</span>
              <span className="mt-0.5 block text-xs text-stone-400">
                Smartphone, tablet, laptop
              </span>
            </div>
          </button>

          {/* Accessory card */}
          <button
            type="button"
            onClick={() => selectType("accessory")}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-stone-200 bg-white p-8 transition-all hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <div className="text-center">
              <span className="block text-base font-bold text-stone-800">Tilbehoer</span>
              <span className="mt-0.5 block text-xs text-stone-400">
                Kabler, covers, hoeretelefoner
              </span>
            </div>
          </button>

          {/* Spare part card */}
          <button
            type="button"
            onClick={() => selectType("spare-part")}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-stone-200 bg-white p-8 transition-all hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/10"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-100">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <div className="text-center">
              <span className="block text-base font-bold text-stone-800">Reservedel</span>
              <span className="mt-0.5 block text-xs text-stone-400">
                Skaerme, batterier, dele
              </span>
            </div>
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-stone-400 hover:text-stone-600"
          >
            Annuller
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Product details form ────────────────────────────────────
  const isDevice = productType === "device";
  const isSku = productType === "accessory" || productType === "spare-part";
  const typeLabel =
    productType === "device"
      ? "Enhed"
      : productType === "accessory"
        ? "Tilbehoer"
        : "Reservedel";

  return (
    <div className="space-y-8">
      {/* Type indicator + back */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setStep(1);
            setProductType(null);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-50"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Skift type
        </button>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
          productType === "device"
            ? "bg-emerald-50 text-emerald-700"
            : productType === "accessory"
              ? "bg-blue-50 text-blue-700"
              : "bg-amber-50 text-amber-700"
        }`}>
          {typeLabel}
        </span>
      </div>

      {/* Section: Basic info */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Grundoplysninger
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={isDevice ? "" : "sm:col-span-2"}>
            <label className="mb-1 block text-xs font-semibold text-stone-500">
              {isDevice ? "Visningsnavn" : "Titel"}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
              required
              placeholder={isDevice ? "f.eks. iPhone 15 Pro Max" : "f.eks. USB-C Kabel 1m"}
            />
          </div>

          {isDevice && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-500">Model</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
                placeholder="f.eks. A2849"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Brand</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
              placeholder="f.eks. Apple"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Kategori</label>
            {categories.length > 0 ? (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
              >
                <option value="">Vaelg kategori...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
                placeholder={isDevice ? "f.eks. iphone" : "f.eks. cable"}
              />
            )}
          </div>
        </div>
      </section>

      {/* Section: Device-specific — Storage & Colors */}
      {isDevice && (
        <>
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
                    storageOptions.includes(opt)
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
              Farver
            </h3>
            <div className="mb-3 flex flex-wrap gap-2">
              {colors.map((color) => (
                <span
                  key={color}
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm"
                >
                  {color}
                  <button
                    type="button"
                    onClick={() => setColors((prev) => prev.filter((c) => c !== color))}
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
                placeholder="Tilfoej farve..."
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={addColor}
                className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-300"
              >
                Tilfoej
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
              Priser pr. grade (DKK)
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-500">Grade A</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={basePriceA}
                  onChange={(e) => setBasePriceA(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-500">Grade B</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={basePriceB}
                  onChange={(e) => setBasePriceB(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-500">Grade C</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={basePriceC}
                  onChange={(e) => setBasePriceC(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
                />
              </div>
            </div>
          </section>
        </>
      )}

      {/* Section: SKU-specific — Pricing + identifiers */}
      {isSku && (
        <>
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
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
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
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-500">Nedsat pris</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
              Identifikation
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-500">EAN</label>
                <input
                  value={ean}
                  onChange={(e) => setEan(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
                  placeholder="f.eks. 5711234567890"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-500">Stregkode / Produktnummer</label>
                <input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
                />
              </div>
            </div>
          </section>
        </>
      )}

      {/* Section: Description */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Beskrivelse
        </h3>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="Produktbeskrivelse..."
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
        />
      </section>

      {/* Section: Images */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Billeder
        </h3>
        <ProductImageUploader
          images={images}
          onChange={setImages}
          folder={isDevice ? "templates/new" : "sku/new"}
          max={8}
        />
      </section>

      {/* Section: SEO / Slug */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          URL-slug
        </h3>
        <div className="flex gap-2">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
            required
          />
          <button
            type="button"
            onClick={() => setSlug(generateSlug(title))}
            className="rounded-xl bg-stone-200 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-300"
          >
            Generer
          </button>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-stone-200 bg-white px-6 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
        >
          Annuller
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSubmit("draft")}
          className="rounded-xl border border-stone-200 bg-white px-6 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {saving ? "Gemmer..." : "Gem som kladde"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSubmit("published")}
          className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-green-600/20 hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Gemmer..." : "Gem og publicer"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
