"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DEVICE_BRANDS,
  getSeriesForBrand,
  getModelsForSeries,
  slugify,
} from "@/lib/spare-parts-config";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface QualityTier {
  id: string;
  name: string;
  slug: string;
  badge_color: string;
  badge_text_color: string;
  default_warranty_months: number | null;
}

interface ColorVariant {
  color_name: string;
  color_hex: string;
  price_override_dkk: string;
  stock: string;
  image_url: string;
}

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

let toastCounter = 0;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function dkkToOere(dkk: string): number | null {
  const n = parseFloat(dkk.replace(",", "."));
  if (isNaN(n)) return null;
  return Math.round(n * 100);
}

/* ------------------------------------------------------------------ */
/*  Section card                                                        */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/[0.04] bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-charcoal/40">
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field wrapper                                                       */
/* ------------------------------------------------------------------ */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-charcoal/70">{label}</label>
      {children}
      {hint && <p className="text-xs text-charcoal/40">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Input class                                                         */
/* ------------------------------------------------------------------ */

const inputCls =
  "w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-colors";

const selectCls =
  "w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-colors";

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ReservedelOpretPage() {
  const router = useRouter();

  /* ---- Reference data ---- */
  const [categories, setCategories] = useState<Category[]>([]);
  const [qualityTiers, setQualityTiers] = useState<QualityTier[]>([]);

  /* ---- Inline new category ---- */
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSaving, setNewCatSaving] = useState(false);

  /* ---- Section 1: Grundinfo ---- */
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");

  /* ---- Section 2: Enhed ---- */
  const [brand, setBrand] = useState("");
  const [series, setSeries] = useState("");
  const [model, setModel] = useState("");
  const [modelCodes, setModelCodes] = useState("");

  /* ---- Section 3: Kvalitet & Garanti ---- */
  const [qualityTierId, setQualityTierId] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("");

  /* ---- Section 4: Pris ---- */
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");

  /* ---- Section 5: Lager ---- */
  const [stockOnline, setStockOnline] = useState("0");
  const [stockStore, setStockStore] = useState("0");

  /* ---- Section 6: Farvevarianter ---- */
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);

  /* ---- Section 7: Billeder ---- */
  const [imageUrls, setImageUrls] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState("");
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  /* ---- Section 8: SEO ---- */
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [slug, setSlugValue] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [metaTitleManuallyEdited, setMetaTitleManuallyEdited] = useState(false);

  /* ---- Section 9: Indstillinger ---- */
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [isInquiryOnly, setIsInquiryOnly] = useState(false);
  const [alwaysInStock, setAlwaysInStock] = useState(false);

  /* ---- Submit ---- */
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const titleRef = useRef(title);
  titleRef.current = title;

  /* ---- Toast helpers ---- */

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  /* ---- Load reference data ---- */

  useEffect(() => {
    async function load() {
      const [catRes, qualRes] = await Promise.all([
        fetch("/api/admin/spare-parts/categories"),
        fetch("/api/admin/spare-parts/quality-tiers"),
      ]);
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(Array.isArray(data) ? data : []);
      }
      if (qualRes.ok) {
        const data = await qualRes.json();
        setQualityTiers(Array.isArray(data) ? data : []);
      }
    }
    load();
  }, []);

  /* ---- Derived: series + models from brand ---- */

  const seriesOptions = brand ? getSeriesForBrand(brand) : [];
  const modelOptions = brand && series ? getModelsForSeries(brand, series) : [];

  /* ---- Auto-generate slug from title ---- */

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlugValue(slugify(title));
    }
  }, [title, slugManuallyEdited]);

  /* ---- Auto-generate meta title ---- */

  useEffect(() => {
    if (!metaTitleManuallyEdited) {
      const selectedTier = qualityTiers.find((q) => q.id === qualityTierId);
      const parts = [
        title,
        selectedTier ? selectedTier.name : "",
        brand,
      ].filter(Boolean);
      setMetaTitle(parts.join(" – "));
    }
  }, [title, qualityTierId, brand, qualityTiers, metaTitleManuallyEdited]);

  /* ---- Selected quality tier ---- */

  const selectedTier = qualityTiers.find((q) => q.id === qualityTierId) ?? null;
  const defaultWarranty = selectedTier?.default_warranty_months ?? null;

  /* ---- Opret ny kategori ---- */

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    setNewCatSaving(true);
    try {
      const res = await fetch("/api/admin/spare-parts/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), slug: slugify(newCatName.trim()) }),
      });
      if (!res.ok) throw new Error("Fejl ved oprettelse af kategori");
      const created: Category = await res.json();
      setCategories((prev) => [...prev, created]);
      setCategoryId(created.id);
      setNewCatName("");
      setShowNewCatForm(false);
      addToast("success", `Kategori "${created.name}" oprettet`);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setNewCatSaving(false);
    }
  }

  /* ---- Color variants ---- */

  function addColorVariant() {
    setColorVariants((prev) => [
      ...prev,
      { color_name: "", color_hex: "#000000", price_override_dkk: "", stock: "0", image_url: "" },
    ]);
  }

  function updateVariant(idx: number, field: keyof ColorVariant, value: string) {
    setColorVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)),
    );
  }

  function removeVariant(idx: number) {
    setColorVariants((prev) => prev.filter((_, i) => i !== idx));
  }

  /* ---- Image file handling ---- */

  const addImageFiles = useCallback((files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setImageFiles((prev) => [...prev, ...imgs]);
    setImagePreviews((prev) => [...prev, ...imgs.map((f) => URL.createObjectURL(f))]);
  }, []);

  const handleImageFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addImageFiles(Array.from(e.target.files));
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
  };

  const handleImageDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addImageFiles(Array.from(e.dataTransfer.files));
    },
    [addImageFiles],
  );

  function removeImageFile(idx: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function moveImageUp(idx: number) {
    if (idx === 0) return;
    setImageFiles((prev) => {
      const a = [...prev];
      [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
      return a;
    });
    setImagePreviews((prev) => {
      const a = [...prev];
      [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
      return a;
    });
  }

  function moveImageDown(idx: number) {
    setImageFiles((prev) => {
      if (idx >= prev.length - 1) return prev;
      const a = [...prev];
      [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
      return a;
    });
    setImagePreviews((prev) => {
      if (idx >= prev.length - 1) return prev;
      const a = [...prev];
      [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
      return a;
    });
  }

  async function startCamera() {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError("Kamera ikke tilgaengeligt. Kontroller tilladelser.");
    }
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
      addImageFiles([file]);
    }, "image/jpeg", 0.9);
  }

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function uploadImages(): Promise<string[]> {
    if (!imageFiles.length) return [];
    const urls: string[] = [];
    for (const file of imageFiles) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "reservedele");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        urls.push(data.url ?? data.path ?? "");
      }
    }
    return urls.filter(Boolean);
  }

  /* ---- Submit ---- */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!sellingPrice) {
      addToast("error", "Salgspris er påkrævet");
      return;
    }

    setSubmitting(true);

    const uploadedImageUrls = await uploadImages();
    const manualImageUrls = imageUrls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    const allImages = [...uploadedImageUrls, ...manualImageUrls];

    const payload = {
      title: title.trim(),
      slug: slug || slugify(title),
      category_id: categoryId || null,
      description: description.trim() || null,
      short_description: shortDescription.trim() || null,
      device_brand: brand.trim() || null,
      device_series: series.trim() || null,
      device_model: model.trim() || null,
      model_codes: modelCodes
        ? modelCodes
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
        : [],
      quality_tier_id: qualityTierId || null,
      warranty_months: warrantyMonths ? parseInt(warrantyMonths, 10) : null,
      cost_price: dkkToOere(costPrice),
      selling_price: dkkToOere(sellingPrice)!,
      sale_price: dkkToOere(salePrice),
      stock_online: parseInt(stockOnline, 10) || 0,
      stock_store: parseInt(stockStore, 10) || 0,
      color_variants: colorVariants
        .filter((v) => v.color_name.trim())
        .map((v) => ({
          color_name: v.color_name.trim(),
          color_hex: v.color_hex,
          price_override: dkkToOere(v.price_override_dkk),
          stock: parseInt(v.stock, 10) || 0,
          image_url: v.image_url.trim() || null,
        })),
      images: allImages,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDescription.trim() || null,
      status,
      is_inquiry_only: isInquiryOnly,
      always_in_stock: alwaysInStock,
    };

    try {
      const res = await fetch("/api/admin/spare-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      addToast("success", "Reservedel oprettet");
      setTimeout(() => router.push("/admin/reservedele"), 800);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Ukendt fejl");
      setSubmitting(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6 pb-16">
      {/* Toast container */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm ${
              t.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                : "border-red-500/20 bg-red-500/10 text-red-700"
            }`}
          >
            {t.type === "success" ? (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-charcoal/40">
          <Link href="/admin/reservedele" className="hover:text-emerald-600 transition-colors">
            Reservedele
          </Link>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-charcoal/60">Opret ny</span>
        </div>
        <h2 className="font-display text-2xl font-bold text-charcoal">Opret reservedel</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── 1. Grundinfo ── */}
        <Section title="Grundinfo">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titel" hint="Vises til kunden">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="f.eks. Skærm til iPhone 15 Pro"
                className={inputCls}
                required
              />
            </Field>

            <Field label="Kategori">
              <div className="flex flex-col gap-2">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Vælg kategori...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {!showNewCatForm ? (
                  <button
                    type="button"
                    onClick={() => setShowNewCatForm(true)}
                    className="self-start text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    + Opret ny kategori
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Kategorinavn"
                      className="flex-1 rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateCategory();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={newCatSaving || !newCatName.trim()}
                      className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 hover:brightness-110"
                    >
                      {newCatSaving ? "..." : "Gem"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCatForm(false);
                        setNewCatName("");
                      }}
                      className="rounded-xl border border-black/[0.08] px-3 py-2 text-xs font-medium text-charcoal/50 hover:bg-stone-50"
                    >
                      Annuller
                    </button>
                  </div>
                )}
              </div>
            </Field>

            <Field label="Kort beskrivelse" hint="Vises i produktkort">
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="En linje om produktet"
                className={inputCls}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Beskrivelse" hint="Fuld produktbeskrivelse">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Detaljeret produktbeskrivelse..."
                  className={inputCls + " resize-none"}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* ── 2. Enhed ── */}
        <Section title="Enhed">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Brand">
              <input
                type="text"
                list="brands-list"
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setSeries("");
                  setModel("");
                }}
                placeholder="f.eks. Apple"
                className={inputCls}
              />
              <datalist id="brands-list">
                {DEVICE_BRANDS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </Field>

            <Field label="Serie">
              <input
                type="text"
                list="series-list"
                value={series}
                onChange={(e) => {
                  setSeries(e.target.value);
                  setModel("");
                }}
                placeholder="f.eks. iPhone 15"
                className={inputCls}
                disabled={!brand}
              />
              <datalist id="series-list">
                {seriesOptions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>

            <Field label="Model">
              <input
                type="text"
                list="models-list"
                value={model}
                onChange={(e) => {
                  const val = e.target.value;
                  setModel(val);
                  // Auto-fill model codes if picking from list
                  const found = modelOptions.find((m) => m.model === val);
                  if (found?.model_codes) {
                    setModelCodes(found.model_codes.join(", "));
                  }
                }}
                placeholder="f.eks. iPhone 15 Pro"
                className={inputCls}
                disabled={!series}
              />
              <datalist id="models-list">
                {modelOptions.map((m) => (
                  <option key={m.model} value={m.model} />
                ))}
              </datalist>
            </Field>

            <Field label="Modelkoder" hint="Kommaseparerede, f.eks. A2848, A3104">
              <input
                type="text"
                value={modelCodes}
                onChange={(e) => setModelCodes(e.target.value)}
                placeholder="A2848, A3104"
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* ── 3. Kvalitet & Garanti ── */}
        <Section title="Kvalitet og garanti">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kvalitetsniveau">
              <select
                value={qualityTierId}
                onChange={(e) => setQualityTierId(e.target.value)}
                className={selectCls}
              >
                <option value="">Ingen kvalitetsniveau</option>
                {qualityTiers.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Garantiperiode (måneder)"
              hint={
                defaultWarranty !== null
                  ? `Standard for dette niveau: ${defaultWarranty} mdr. — lad feltet stå tomt for at bruge standard`
                  : "Lad feltet stå tomt for ingen garanti"
              }
            >
              <input
                type="number"
                min={0}
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
                placeholder={defaultWarranty !== null ? String(defaultWarranty) : "0"}
                className={inputCls}
              />
            </Field>

            {selectedTier && (
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block rounded-full px-3 py-1 text-xs font-bold"
                    style={{
                      backgroundColor: selectedTier.badge_color,
                      color: selectedTier.badge_text_color,
                    }}
                  >
                    {selectedTier.name}
                  </span>
                  <span className="text-xs text-charcoal/50">
                    Garanti:{" "}
                    {warrantyMonths
                      ? `${warrantyMonths} mdr.`
                      : defaultWarranty !== null
                        ? `${defaultWarranty} mdr. (standard)`
                        : "Ingen"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── 4. Pris ── */}
        <Section title="Pris">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Kostpris (DKK)" hint="Intern — vises ikke til kunden">
              <div className="relative">
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-charcoal/40">
                  kr.
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0"
                  className={inputCls + " pr-10"}
                />
              </div>
            </Field>

            <Field label="Salgspris (DKK)" hint="Krævet">
              <div className="relative">
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-charcoal/40">
                  kr.
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0"
                  required
                  className={inputCls + " pr-10"}
                />
              </div>
            </Field>

            <Field label="Tilbudspris (DKK)" hint="Valgfri — vises som slashpris">
              <div className="relative">
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-charcoal/40">
                  kr.
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="—"
                  className={inputCls + " pr-10"}
                />
              </div>
            </Field>
          </div>
        </Section>

        {/* ── 5. Lager ── */}
        <Section title="Lager">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Lager online" hint="Antal enheder tilgængeligt online">
              <input
                type="number"
                min={0}
                value={stockOnline}
                onChange={(e) => setStockOnline(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Lager i butik" hint="Antal enheder tilgængeligt i butikken">
              <input
                type="number"
                min={0}
                value={stockStore}
                onChange={(e) => setStockStore(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* ── 6. Farvevarianter ── */}
        <Section title="Farvevarianter">
          <div className="space-y-3">
            {colorVariants.length === 0 && (
              <p className="text-sm text-charcoal/40">
                Ingen farvevarianter endnu. Tilføj en nedenfor.
              </p>
            )}

            {colorVariants.map((variant, idx) => (
              <div
                key={idx}
                className="space-y-3 rounded-xl border border-black/[0.05] bg-stone-50/50 p-4"
              >
                <div className="grid grid-cols-[1fr_auto_1fr_1fr_auto] items-end gap-3">
                  <Field label="Farvenavn">
                    <input
                      type="text"
                      value={variant.color_name}
                      onChange={(e) => updateVariant(idx, "color_name", e.target.value)}
                      placeholder="f.eks. Sort"
                      className={inputCls}
                    />
                  </Field>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-charcoal/70">Farve</label>
                    <input
                      type="color"
                      value={variant.color_hex}
                      onChange={(e) => updateVariant(idx, "color_hex", e.target.value)}
                      className="h-[42px] w-12 cursor-pointer rounded-xl border border-black/[0.08] bg-white p-1"
                    />
                  </div>

                  <Field label="Pristillæg (DKK)" hint="Valgfri">
                    <div className="relative">
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-charcoal/40">
                        kr.
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={variant.price_override_dkk}
                        onChange={(e) => updateVariant(idx, "price_override_dkk", e.target.value)}
                        placeholder="—"
                        className={inputCls + " pr-10"}
                      />
                    </div>
                  </Field>

                  <Field label="Lager">
                    <input
                      type="number"
                      min={0}
                      value={variant.stock}
                      onChange={(e) => updateVariant(idx, "stock", e.target.value)}
                      className={inputCls}
                    />
                  </Field>

                  <div className="pb-0.5">
                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-500 transition-colors hover:bg-red-100"
                      title="Fjern farvevariant"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Color variant image URL + preview */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Field label="Billed-URL (valgfri)" hint="Vises for denne farve">
                      <input
                        type="url"
                        value={variant.image_url}
                        onChange={(e) => updateVariant(idx, "image_url", e.target.value)}
                        placeholder="https://example.com/sort.jpg"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  {variant.image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={variant.image_url}
                      alt={variant.color_name}
                      className="mt-5 h-12 w-12 shrink-0 rounded-lg border border-[#E5E5EA] object-cover"
                    />
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addColorVariant}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Tilføj farve
            </button>
          </div>
        </Section>

        {/* ── 7. Billeder ── */}
        <Section title="Billeder">
          <p className="mb-3 text-xs text-charcoal/40">
            Hvert produkt (kvalitetstier) har sine egne billeder. Det første billede bruges som
            hovedbillede i butikken.
          </p>

          {/* Drop zone */}
          <div
            onDrop={handleImageDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => imageFileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-black/[0.08] bg-stone-50/50 px-4 py-6 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5"
          >
            <svg className="h-8 w-8 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p className="text-sm text-charcoal/50">
              <span className="font-semibold text-emerald-600">Upload billeder</span> eller traek hertil
            </p>
            <p className="text-[11px] text-charcoal/30">PNG, JPG, WebP</p>
          </div>
          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageFileInput}
          />

          {/* Camera */}
          <div className="mt-3">
            {!cameraStreamRef.current ? (
              <button
                type="button"
                onClick={startCamera}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/[0.06] bg-stone-50 px-4 py-2.5 text-sm font-semibold text-charcoal/50 transition-all hover:bg-emerald-500/5 hover:text-emerald-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                Tag foto med kamera
              </button>
            ) : (
              <div className="overflow-hidden rounded-xl border border-black/[0.06]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full" />
                <div className="flex gap-2 border-t border-black/[0.04] bg-stone-50 p-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white hover:brightness-110"
                  >
                    Tag billede
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-lg border border-black/[0.06] bg-white px-3 py-2 text-sm font-semibold text-charcoal/50 hover:bg-stone-100"
                  >
                    Annuller
                  </button>
                </div>
              </div>
            )}
            {cameraError && (
              <p className="mt-1.5 text-[11px] text-red-500">{cameraError}</p>
            )}
          </div>

          {/* Uploaded file previews */}
          {imagePreviews.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/30">
                Uploadede filer
              </p>
              <div className="flex flex-wrap gap-3">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="h-20 w-20 rounded-xl border border-black/[0.06] object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        Hoved
                      </span>
                    )}
                    <div className="absolute right-1 top-1 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => removeImageFile(i)}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                        title="Fjern"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => moveImageUp(i)}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-black/40 text-white"
                          title="Flyt op"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                          </svg>
                        </button>
                      )}
                      {i < imagePreviews.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveImageDown(i)}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-black/40 text-white"
                          title="Flyt ned"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual URL input */}
          <div className="mt-4">
            <Field label="Eller indsaet billed-URLs" hint="En URL per linje — tilfoejes efter uploadede filer">
              <textarea
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
                rows={3}
                placeholder={"https://example.com/billede1.jpg\nhttps://example.com/billede2.jpg"}
                className={inputCls + " resize-none font-mono text-xs"}
              />
            </Field>
          </div>
        </Section>

        {/* ── 8. SEO ── */}
        <Section title="SEO">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Meta-titel" hint="Auto-genereret fra titel, kvalitet og brand">
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => {
                  setMetaTitle(e.target.value);
                  setMetaTitleManuallyEdited(true);
                }}
                placeholder="SEO-titel"
                className={inputCls}
              />
            </Field>

            <Field label="Slug (URL)" hint="Auto-genereret fra titel">
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugValue(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                placeholder="produkt-slug"
                className={inputCls + " font-mono text-xs"}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Meta-beskrivelse">
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={2}
                  placeholder="Kort beskrivelse til søgemaskiner..."
                  className={inputCls + " resize-none"}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* ── 9. Indstillinger ── */}
        <Section title="Indstillinger">
          <div className="space-y-4">
            {/* Status toggle */}
            <div className="flex items-center justify-between rounded-xl border border-black/[0.05] bg-stone-50/60 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-charcoal">Status</p>
                <p className="text-xs text-charcoal/50">
                  {status === "published" ? "Synlig for kunder" : "Ikke synlig for kunder"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatus((s) => (s === "published" ? "draft" : "published"))}
                className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                  status === "published" ? "bg-emerald-500" : "bg-stone-300"
                }`}
                role="switch"
                aria-checked={status === "published"}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    status === "published" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* is_inquiry_only */}
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-black/[0.05] bg-stone-50/60 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-charcoal">Kun forespørgsel</p>
                <p className="text-xs text-charcoal/50">
                  Kunden kan ikke købe direkte — kun sende forespørgsel
                </p>
              </div>
              <input
                type="checkbox"
                checked={isInquiryOnly}
                onChange={(e) => setIsInquiryOnly(e.target.checked)}
                className="h-4 w-4 rounded accent-emerald-500"
              />
            </label>

            {/* always_in_stock */}
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-black/[0.05] bg-stone-50/60 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-charcoal">Altid på lager</p>
                <p className="text-xs text-charcoal/50">
                  Ignorer lagerantal og vis altid som tilgængeligt
                </p>
              </div>
              <input
                type="checkbox"
                checked={alwaysInStock}
                onChange={(e) => setAlwaysInStock(e.target.checked)}
                className="h-4 w-4 rounded accent-emerald-500"
              />
            </label>
          </div>
        </Section>

        {/* ── Submit bar ── */}
        <div className="sticky bottom-0 -mx-6 flex items-center justify-between border-t border-black/[0.04] bg-white/90 px-6 py-4 backdrop-blur-sm">
          <Link
            href="/admin/reservedele"
            className="rounded-xl border border-black/[0.08] px-5 py-2.5 text-sm font-semibold text-charcoal/60 transition-colors hover:bg-stone-50 hover:text-charcoal"
          >
            Annuller
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-white" />
                Opretter...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Opret reservedel
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
