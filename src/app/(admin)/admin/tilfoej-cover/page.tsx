"use client";

import { useState, useRef, useCallback } from "react";
import { removeBackground } from "@imgly/background-removal";

/* ------------------------------------------------------------------ */
/*  Product type options                                                */
/* ------------------------------------------------------------------ */

const PRODUCT_TYPES = [
  { value: "Cover", label: "Cover / Case" },
  { value: "Skærmbeskyttelse", label: "Skærmbeskyttelse" },
  { value: "Høretelefoner", label: "Høretelefoner / Earbuds" },
  { value: "Oplader", label: "Oplader" },
  { value: "Kabel", label: "Kabel" },
  { value: "Tilbehør", label: "Andet tilbehør" },
];

/* ------------------------------------------------------------------ */
/*  Phone / tablet model options                                        */
/* ------------------------------------------------------------------ */

const DEFAULT_MODEL_GROUPS: { label: string; models: string[] }[] = [
  {
    label: "iPhone",
    models: [
      "iPhone 16 Pro Max",
      "iPhone 16 Pro",
      "iPhone 16 Plus",
      "iPhone 16",
      "iPhone 15 Pro Max",
      "iPhone 15 Pro",
      "iPhone 15 Plus",
      "iPhone 15",
      "iPhone 14 Pro Max",
      "iPhone 14 Pro",
      "iPhone 14 Plus",
      "iPhone 14",
      "iPhone 13 Pro Max",
      "iPhone 13 Pro",
      "iPhone 13",
      "iPhone 13 Mini",
      "iPhone 12 Pro Max",
      "iPhone 12 Pro",
      "iPhone 12",
      "iPhone 12 Mini",
      "iPhone 11 Pro Max",
      "iPhone 11 Pro",
      "iPhone 11",
      "iPhone SE (2022)",
      "iPhone SE (2020)",
      "iPhone XS Max",
      "iPhone XS",
      "iPhone XR",
      "iPhone X",
    ],
  },
  {
    label: "Samsung",
    models: [
      "Samsung Galaxy S25 Ultra",
      "Samsung Galaxy S25+",
      "Samsung Galaxy S25",
      "Samsung Galaxy S24 Ultra",
      "Samsung Galaxy S24+",
      "Samsung Galaxy S24",
      "Samsung Galaxy S23 Ultra",
      "Samsung Galaxy S23+",
      "Samsung Galaxy S23",
      "Samsung Galaxy A55",
      "Samsung Galaxy A54",
      "Samsung Galaxy A53",
      "Samsung Galaxy A35",
      "Samsung Galaxy A34",
      "Samsung Galaxy A25",
      "Samsung Galaxy A15",
      "Samsung Galaxy Tab S9",
      "Samsung Galaxy Tab S8",
    ],
  },
  {
    label: "iPad",
    models: [
      "iPad Pro 13\" (2024)",
      "iPad Pro 11\" (2024)",
      "iPad Pro 12.9\" (2022)",
      "iPad Pro 11\" (2022)",
      "iPad Air 13\" (2024)",
      "iPad Air 11\" (2024)",
      "iPad Air (2022)",
      "iPad (10. gen)",
      "iPad (9. gen)",
      "iPad Mini (2024)",
      "iPad Mini (2021)",
    ],
  },
  {
    label: "Andet",
    models: [
      "Google Pixel 9 Pro",
      "Google Pixel 9",
      "Google Pixel 8 Pro",
      "Google Pixel 8",
      "OnePlus 13",
      "OnePlus 12",
      "OnePlus 11",
      "OnePlus Nord 4",
      "Huawei P60 Pro",
      "Huawei P50 Pro",
      "Universal",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Common brands                                                       */
/* ------------------------------------------------------------------ */

const BRAND_SUGGESTIONS = [
  "Apple",
  "Samsung",
  "JBL",
  "Sony",
  "Anker",
  "Belkin",
  "Spigen",
  "UAG",
  "OtterBox",
  "Baseus",
  "Ugreen",
  "Generic",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TilfoejCoverPage() {
  const [productType, setProductType] = useState("Cover");
  const [brand, setBrand] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [price, setPrice] = useState("79");
  const [titleOverride, setTitleOverride] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string; handle?: string } | null>(null);
  const [createdCount, setCreatedCount] = useState(0);
  const [modelSearchOpen, setModelSearchOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [modelGroups, setModelGroups] = useState(DEFAULT_MODEL_GROUPS);
  const [newModelInputs, setNewModelInputs] = useState<Record<string, string>>({});
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [removingBgIndex, setRemovingBgIndex] = useState<number | null>(null);
  const [bgRemoveProgress, setBgRemoveProgress] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Auto-generate title from product type + models
  const autoTitle = (() => {
    const typeName = PRODUCT_TYPES.find((t) => t.value === productType)?.label || productType;
    const brandPrefix = brand ? `${brand} ` : "";
    if (selectedModels.length > 0) {
      return `${brandPrefix}${typeName} til ${selectedModels.slice(0, 3).join(" / ")}${selectedModels.length > 3 ? ` +${selectedModels.length - 3} mere` : ""}`;
    }
    return `${brandPrefix}${typeName}`;
  })();

  const title = titleOverride || autoTitle;

  // ---- Image handling ----

  const addFiles = useCallback((files: File[]) => {
    const imageFilesToAdd = files.filter((f) => f.type.startsWith("image/"));
    if (imageFilesToAdd.length === 0) return;
    setImageFiles((prev) => [...prev, ...imageFilesToAdd]);
    setImagePreviews((prev) => [
      ...prev,
      ...imageFilesToAdd.map((f) => URL.createObjectURL(f)),
    ]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImageAt = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeAllImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveBg = async (index: number) => {
    const file = imageFiles[index];
    if (!file) return;
    setRemovingBgIndex(index);
    setBgRemoveProgress("Indlæser AI-model...");
    try {
      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          if (key === "compute:inference") {
            setBgRemoveProgress("Fjerner baggrund...");
          } else if (key.startsWith("fetch:")) {
            const pct = total > 0 ? Math.round((current / total) * 100) : 0;
            setBgRemoveProgress(`Downloader model... ${pct}%`);
          }
        },
      });
      const newFile = new File([blob], file.name.replace(/\.\w+$/, ".png"), {
        type: "image/png",
      });
      const newUrl = URL.createObjectURL(blob);
      setImageFiles((prev) => prev.map((f, i) => (i === index ? newFile : f)));
      setImagePreviews((prev) => prev.map((u, i) => (i === index ? newUrl : u)));
      setBgRemoveProgress("");
    } catch (err) {
      console.error("Background removal error:", err);
      setToast({
        type: "error",
        message: "Kunne ikke fjerne baggrund. Prøv igen.",
      });
    } finally {
      setRemovingBgIndex(null);
    }
  };

  // ---- Model selection ----

  const toggleModel = (model: string) => {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model],
    );
  };

  const selectAllInGroup = (groupLabel: string) => {
    const group = modelGroups.find((g) => g.label === groupLabel);
    if (!group) return;
    const allSelected = group.models.every((m) => selectedModels.includes(m));
    if (allSelected) {
      setSelectedModels((prev) => prev.filter((m) => !group.models.includes(m)));
    } else {
      setSelectedModels((prev) => {
        const newModels = group.models.filter((m) => !prev.includes(m));
        return [...prev, ...newModels];
      });
    }
  };

  const selectAll = () => {
    const allModels = modelGroups.flatMap((g) => g.models);
    const allSelected = allModels.every((m) => selectedModels.includes(m));
    if (allSelected) {
      setSelectedModels([]);
    } else {
      setSelectedModels(allModels);
    }
  };

  const addModelToGroup = (groupLabel: string) => {
    const name = (newModelInputs[groupLabel] || "").trim();
    if (!name) return;
    // Check for duplicates across all groups
    const allExisting = modelGroups.flatMap((g) => g.models);
    if (allExisting.includes(name)) return;
    setModelGroups((prev) =>
      prev.map((g) =>
        g.label === groupLabel ? { ...g, models: [...g.models, name] } : g,
      ),
    );
    // Auto-select the new model
    setSelectedModels((prev) => [...prev, name]);
    setNewModelInputs((prev) => ({ ...prev, [groupLabel]: "" }));
    setAddingToGroup(null);
  };

  const addNewGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    if (modelGroups.some((g) => g.label.toLowerCase() === name.toLowerCase())) return;
    setModelGroups((prev) => [...prev, { label: name, models: [] }]);
    setNewGroupName("");
    setShowNewGroup(false);
  };

  const filteredGroups = modelGroups.map((g) => ({
    ...g,
    models: g.models.filter((m) =>
      m.toLowerCase().includes(modelSearch.toLowerCase()),
    ),
  })).filter((g) => g.models.length > 0 || !modelSearch);

  const allModels = modelGroups.flatMap((g) => g.models);
  const allSelected = allModels.length > 0 && allModels.every((m) => selectedModels.includes(m));

  // ---- Submit ----

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setToast(null);

    try {
      // 1. Upload all images
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "covers");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Et billede kunne ikke uploades");
        const uploadData = await uploadRes.json();
        imageUrls.push(uploadData.url);
      }

      // 2. Create product
      const res = await fetch("/api/admin/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          price,
          imageUrls,
          models: selectedModels,
          productType,
          brand,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Kunne ikke oprette produkt");
      }

      // Success — reset form but keep price and product type
      setCreatedCount((c) => c + 1);
      setToast({
        type: "success",
        message: `"${data.product.title}" oprettet!`,
        handle: data.product.handle,
      });
      setSelectedModels([]);
      setTitleOverride("");
      setBrand("");
      setImageFiles([]);
      setImagePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Noget gik galt",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between sm:mb-8">
        <div>
          <h1 className="font-display text-xl font-bold text-charcoal sm:text-2xl">
            Tilføj Produkt
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Opret covers, tilbehør, høretelefoner m.m. til Shopify
          </p>
        </div>
        {createdCount > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-green-eco/10 px-3 py-1.5 sm:px-4 sm:py-2">
            <span className="text-sm font-bold text-green-eco">{createdCount}</span>
            <span className="text-xs text-green-eco/80">oprettet</span>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-6 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span>{toast.message}</span>
          {toast.handle && (
            <a
              href={`/tilbehoer/covers/${toast.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline hover:no-underline"
            >
              Se produkt
            </a>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* ---- Product Type ---- */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-400">
            Produkttype
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PRODUCT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setProductType(type.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                  productType === type.value
                    ? "border-green-eco bg-green-eco/10 text-green-eco shadow-sm"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Brand ---- */}
        <div>
          <label
            htmlFor="product-brand"
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-400"
          >
            Mærke / Brand
          </label>
          <input
            id="product-brand"
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Indtast mærke..."
            className="mb-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-charcoal placeholder:text-stone-400 focus:border-green-eco/40 focus:outline-none focus:ring-2 focus:ring-green-eco/10"
          />
          <div className="flex flex-wrap gap-1.5">
            {BRAND_SUGGESTIONS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBrand(b)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  brand === b
                    ? "bg-green-eco/10 text-green-eco"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Photo upload ---- */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
              Billeder
            </label>
            {imageFiles.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400">{imageFiles.length} billede{imageFiles.length > 1 ? "r" : ""}</span>
                <button
                  type="button"
                  onClick={removeAllImages}
                  className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
                >
                  Fjern alle
                </button>
              </div>
            )}
          </div>

          {/* Image previews grid */}
          {imagePreviews.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="group relative">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="h-32 w-32 rounded-xl border border-stone-200 object-contain bg-[repeating-conic-gradient(#e5e5e5_0%_25%,#fff_0%_50%)_0_0/12px_12px]"
                  />
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeImageAt(index)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {/* Remove BG button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveBg(index)}
                    disabled={removingBgIndex !== null}
                    className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 rounded-lg bg-purple-600/90 px-1.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm transition-all hover:bg-purple-700 disabled:opacity-40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    {removingBgIndex === index ? (
                      <>
                        <div className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-white/40 border-t-white" />
                        <span className="truncate">{bgRemoveProgress || "..."}</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        Fjern BG
                      </>
                    )}
                  </button>
                  {/* Image number badge */}
                  <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal/70 text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                </div>
              ))}

              {/* Add more button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-32 w-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-white transition-colors hover:border-green-eco hover:bg-green-eco/5"
              >
                <svg className="mb-1 h-6 w-6 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-[10px] font-medium text-stone-400">Tilføj flere</span>
              </button>
            </div>
          )}

          {/* Drop zone (shown when no images) */}
          {imagePreviews.length === 0 && (
            <div
              ref={dropZoneRef}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-white transition-colors hover:border-green-eco hover:bg-green-eco/5"
            >
              <svg className="mb-2 h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <p className="text-sm font-medium text-stone-500">
                Klik eller træk billeder hertil
              </p>
              <p className="mt-1 text-xs text-stone-400">JPG, PNG, WebP — flere billeder tilladt</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* ---- Model selection ---- */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
              Kompatible modeller
            </label>
            <span className="text-xs text-stone-400">
              {selectedModels.length} valgt
            </span>
          </div>

          {/* Selected chips */}
          {selectedModels.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {selectedModels.slice(0, 10).map((model) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => toggleModel(model)}
                  className="flex items-center gap-1 rounded-full bg-green-eco/10 px-3 py-1 text-xs font-medium text-green-eco transition-colors hover:bg-green-eco/20"
                >
                  {model}
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
              {selectedModels.length > 10 && (
                <span className="flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-500">
                  +{selectedModels.length - 10} mere
                </span>
              )}
            </div>
          )}

          {/* Dropdown toggle */}
          <button
            type="button"
            onClick={() => setModelSearchOpen(!modelSearchOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500 transition-colors hover:border-stone-300"
          >
            <span>
              {selectedModels.length > 0
                ? `${selectedModels.length} model${selectedModels.length > 1 ? "ler" : ""} valgt`
                : "Vælg modeller..."}
            </span>
            <svg
              className={`h-4 w-4 transition-transform ${modelSearchOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Dropdown panel */}
          {modelSearchOpen && (
            <div className="mt-2 rounded-xl border border-stone-200 bg-white shadow-lg">
              {/* Search + Select All */}
              <div className="border-b border-stone-100 p-2">
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Søg model..."
                  className="mb-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm placeholder:text-stone-400 focus:border-green-eco/40 focus:outline-none focus:ring-1 focus:ring-green-eco/20"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={selectAll}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                    allSelected
                      ? "bg-green-eco/10 text-green-eco hover:bg-green-eco/20"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {allSelected ? "Fravælg alle" : "Vælg alle modeller"}
                </button>
              </div>

              {/* Model list */}
              <div className="max-h-72 overflow-y-auto p-2">
                {filteredGroups.map((group) => {
                  const groupAllSelected = group.models.length > 0 && group.models.every((m) => selectedModels.includes(m));
                  return (
                    <div key={group.label} className="mb-3 last:mb-0">
                      <div className="flex items-center justify-between px-2 py-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          {group.label}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setAddingToGroup(addingToGroup === group.label ? null : group.label)}
                            className="rounded px-2 py-0.5 text-[10px] font-semibold text-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            + Tilføj
                          </button>
                          {group.models.length > 0 && (
                            <button
                              type="button"
                              onClick={() => selectAllInGroup(group.label)}
                              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                groupAllSelected
                                  ? "bg-green-eco/10 text-green-eco hover:bg-green-eco/20"
                                  : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                              }`}
                            >
                              {groupAllSelected ? "Fravælg" : "Vælg alle"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Add model input */}
                      {addingToGroup === group.label && (
                        <div className="mx-2 mb-1.5 flex gap-1.5">
                          <input
                            type="text"
                            value={newModelInputs[group.label] || ""}
                            onChange={(e) =>
                              setNewModelInputs((prev) => ({ ...prev, [group.label]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); addModelToGroup(group.label); }
                              if (e.key === "Escape") setAddingToGroup(null);
                            }}
                            placeholder={`Ny ${group.label} model...`}
                            className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-blue-50/50 px-2.5 py-1.5 text-xs placeholder:text-stone-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => addModelToGroup(group.label)}
                            className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
                          >
                            Tilføj
                          </button>
                        </div>
                      )}

                      {group.models.map((model) => {
                        const selected = selectedModels.includes(model);
                        return (
                          <button
                            key={model}
                            type="button"
                            onClick={() => toggleModel(model)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                              selected
                                ? "bg-green-eco/10 font-medium text-green-eco"
                                : "text-stone-600 hover:bg-stone-50"
                            }`}
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                selected
                                  ? "border-green-eco bg-green-eco text-white"
                                  : "border-stone-300"
                              }`}
                            >
                              {selected && (
                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </span>
                            {model}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Add new brand group + Close */}
              <div className="border-t border-stone-100 p-2 flex flex-col gap-1.5">
                {showNewGroup ? (
                  <div className="flex flex-wrap gap-1.5">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addNewGroup(); }
                        if (e.key === "Escape") setShowNewGroup(false);
                      }}
                      placeholder="Nyt mærke (f.eks. Xiaomi)..."
                      className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2 text-xs placeholder:text-stone-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={addNewGroup}
                      className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
                    >
                      Opret
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewGroup(false)}
                      className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-medium text-stone-500 hover:bg-stone-200 transition-colors"
                    >
                      Annuller
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewGroup(true)}
                    className="w-full rounded-lg border border-dashed border-blue-300 bg-blue-50/50 py-2 text-xs font-medium text-blue-500 transition-colors hover:bg-blue-50 hover:border-blue-400"
                  >
                    + Tilføj nyt mærke / gruppe
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setModelSearchOpen(false);
                    setModelSearch("");
                  }}
                  className="w-full rounded-lg bg-stone-100 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200"
                >
                  Luk
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---- Price ---- */}
        <div>
          <label
            htmlFor="cover-price"
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-400"
          >
            Pris (DKK)
          </label>
          <div className="relative">
            <input
              id="cover-price"
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 pr-12 text-sm text-charcoal focus:border-green-eco/40 focus:outline-none focus:ring-2 focus:ring-green-eco/10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
              kr
            </span>
          </div>
        </div>

        {/* ---- Title (auto-generated, editable) ---- */}
        <div>
          <label
            htmlFor="cover-title"
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-400"
          >
            Titel
          </label>
          <input
            id="cover-title"
            type="text"
            value={titleOverride}
            onChange={(e) => setTitleOverride(e.target.value)}
            placeholder={autoTitle}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-charcoal placeholder:text-stone-400 focus:border-green-eco/40 focus:outline-none focus:ring-2 focus:ring-green-eco/10"
          />
          <p className="mt-1 text-xs text-stone-400">
            Lad stå tom for auto-genereret titel
          </p>
        </div>

        {/* ---- Submit ---- */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-green-eco px-6 py-3.5 text-sm font-bold tracking-wide text-white shadow-md shadow-green-eco/20 transition-all hover:brightness-110 hover:shadow-lg hover:shadow-green-eco/25 active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Opretter...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Opret Produkt
            </>
          )}
        </button>
      </form>
    </div>
  );
}
