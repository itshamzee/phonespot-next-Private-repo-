"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { TILBEHOER_DEVICES, DEVICE_BRANDS } from "@/lib/tilbehoer-config";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { value: "Cover", label: "Cover", icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  )},
  { value: "Skaermbeskyttelse", label: "Skærmbeskyttelse", icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
    </svg>
  )},
  { value: "Oplader", label: "Oplader", icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  )},
  { value: "Kabel", label: "Kabel", icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  )},
  { value: "Lyd", label: "Lyd", icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
  )},
  { value: "Andet", label: "Andet", icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    </svg>
  )},
];

const BRAND_SUGGESTIONS = [
  "Apple", "Samsung", "OnePlus", "Huawei", "Google",
  "Sony", "JBL", "Anker", "Belkin", "Spigen", "OtterBox", "Generic",
];

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Template {
  id: string;
  name: string;
  category: string;
  price_oere: number;
  name_pattern?: string;
}

interface EanLookupResult {
  name?: string;
  image_url?: string;
  brand?: string;
}

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

let toastCounter = 0;

/* ------------------------------------------------------------------ */
/*  Grouped devices from tilbehoer-config                              */
/* ------------------------------------------------------------------ */

const DEVICE_GROUPS = DEVICE_BRANDS.map((brand) => ({
  brand: brand.slug,
  label: brand.label,
  devices: TILBEHOER_DEVICES.filter((d) => d.brand === brand.slug),
}));

/* ------------------------------------------------------------------ */
/*  Section card wrapper                                                */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/[0.04] bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-charcoal/40">
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function TilbehoerOpretPage() {
  /* ---- Form state ---- */
  const [category, setCategory] = useState("Cover");
  const [brand, setBrand] = useState("");
  const [brandFocused, setBrandFocused] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [namePattern, setNamePattern] = useState("");
  const [priceDkk, setPriceDkk] = useState("79");
  const [costPriceDkk, setCostPriceDkk] = useState("");
  const [onlineStock, setOnlineStock] = useState("0");
  const [storeStock, setStoreStock] = useState("0");
  const [description, setDescription] = useState("");

  /* ---- EAN state ---- */
  const [eanMode, setEanMode] = useState<"none" | "scan" | "manual" | "generated">("none");
  const [eanValue, setEanValue] = useState("");
  const [eanLookup, setEanLookup] = useState<EanLookupResult | null>(null);
  const [eanLookingUp, setEanLookingUp] = useState(false);
  const [eanGenerating, setEanGenerating] = useState(false);
  const [scannerMounted, setScannerMounted] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerInstanceRef = useRef<any>(null);

  /* ---- Image state ---- */
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState("");
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  /* ---- Templates ---- */
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  /* ---- Submission ---- */
  const [submitting, setSubmitting] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  /* ---- Toast helpers ---- */

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  /* ---- Load templates ---- */

  useEffect(() => {
    fetch("/api/admin/accessories/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : (data.templates ?? [])))
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, []);

  /* ---- Apply template ---- */

  function applyTemplate(t: Template) {
    setCategory(t.category);
    setPriceDkk(String(t.price_oere / 100));
    if (t.name_pattern) setNamePattern(t.name_pattern);
  }

  /* ---- Device multi-select ---- */

  function toggleDevice(slug: string) {
    setSelectedDevices((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function toggleGroupAll(groupSlugs: string[]) {
    const allSelected = groupSlugs.every((s) => selectedDevices.includes(s));
    if (allSelected) {
      setSelectedDevices((prev) => prev.filter((s) => !groupSlugs.includes(s)));
    } else {
      setSelectedDevices((prev) => [...new Set([...prev, ...groupSlugs])]);
    }
  }

  function removeDevice(slug: string) {
    setSelectedDevices((prev) => prev.filter((s) => s !== slug));
  }

  /* ---- Image handling ---- */

  const addFiles = useCallback((files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setImageFiles((prev) => [...prev, ...imgs]);
    setImagePreviews((prev) => [...prev, ...imgs.map((f) => URL.createObjectURL(f))]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles],
  );

  function removeImage(idx: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
    setUploadedUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  /* ---- Camera capture ---- */

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
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
      addFiles([file]);
      stopCamera();
    }, "image/jpeg", 0.9);
  }

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  useEffect(() => () => stopCamera(), []);

  /* ---- EAN scanner ---- */

  useEffect(() => {
    if (eanMode !== "scan") {
      // Cleanup scanner if mode changes away from scan
      if (scannerInstanceRef.current) {
        try { scannerInstanceRef.current.clear(); } catch { /* empty */ }
        scannerInstanceRef.current = null;
      }
      setScannerMounted(false);
      return;
    }
    setScannerMounted(true);
  }, [eanMode]);

  useEffect(() => {
    if (!scannerMounted || !scannerRef.current) return;

    let mounted = true;
    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (!mounted || !scannerRef.current) return;
      const scanner = new Html5QrcodeScanner(
        "ean-qr-reader",
        { fps: 10, qrbox: { width: 280, height: 120 } },
        false,
      );
      scannerInstanceRef.current = scanner;
      scanner.render(
        async (decodedText: string) => {
          scanner.clear();
          scannerInstanceRef.current = null;
          setEanMode("none");
          setEanValue(decodedText);
          // EAN lookup
          setEanLookingUp(true);
          try {
            const res = await fetch(`/api/admin/accessories/ean-lookup?ean=${encodeURIComponent(decodedText)}`);
            if (res.ok) {
              const data = await res.json();
              setEanLookup(data);
            }
          } catch { /* empty */ } finally {
            setEanLookingUp(false);
          }
        },
        () => { /* scan error, silently retry */ },
      );
    }).catch(() => {
      addToast("error", "html5-qrcode ikke installeret");
    });

    return () => {
      mounted = false;
      if (scannerInstanceRef.current) {
        try { scannerInstanceRef.current.clear(); } catch { /* empty */ }
        scannerInstanceRef.current = null;
      }
    };
  }, [scannerMounted, addToast]);

  /* ---- EAN manual lookup ---- */

  async function lookupEanManual() {
    if (!eanValue || eanValue.length < 8) return;
    setEanLookingUp(true);
    setEanLookup(null);
    try {
      const res = await fetch(`/api/admin/accessories/ean-lookup?ean=${encodeURIComponent(eanValue)}`);
      if (res.ok) setEanLookup(await res.json());
    } catch { /* empty */ } finally {
      setEanLookingUp(false);
    }
  }

  /* ---- Generate EAN ---- */

  async function generateEan() {
    setEanGenerating(true);
    try {
      const res = await fetch("/api/admin/accessories/generate-ean", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setEanValue(data.ean ?? "");
        setEanMode("generated");
      }
    } catch {
      addToast("error", "Kunne ikke generere EAN");
    } finally {
      setEanGenerating(false);
    }
  }

  /* ---- Upload images ---- */

  async function uploadImages(): Promise<string[]> {
    if (!imageFiles.length) return [];
    const urls: string[] = [];
    for (const file of imageFiles) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "tilbehoer");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        urls.push(data.url ?? data.path ?? "");
      }
    }
    return urls.filter(Boolean);
  }

  /* ---- Submit ---- */

  const productCount = selectedDevices.length > 0 ? selectedDevices.length : 1;

  async function handleSubmit() {
    if (!namePattern.trim()) {
      addToast("error", "Angiv et navn / navnemoenster");
      return;
    }
    setSubmitting(true);
    setSuccessCount(null);
    try {
      const imageUrls = await uploadImages();
      const payload = {
        category,
        brand: brand.trim() || undefined,
        devices: selectedDevices.length > 0 ? selectedDevices : undefined,
        name_pattern: namePattern.trim(),
        price_oere: Math.round(parseFloat(priceDkk) * 100) || 0,
        cost_price_oere: costPriceDkk ? Math.round(parseFloat(costPriceDkk) * 100) : undefined,
        online_stock: parseInt(onlineStock, 10) || 0,
        store_stock: parseInt(storeStock, 10) || 0,
        description: description.trim() || undefined,
        ean: eanValue.trim() || undefined,
        image_urls: imageUrls,
      };
      const res = await fetch("/api/admin/accessories/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Oprettelse fejlede");
      const data = await res.json();
      setSuccessCount(data.count ?? productCount);
      addToast("success", `${data.count ?? productCount} produkt(er) oprettet`);
      // Reset form
      setSelectedDevices([]);
      setNamePattern("");
      setEanValue("");
      setEanLookup(null);
      setImageFiles([]);
      setImagePreviews([]);
      setUploadedUrls([]);
    } catch {
      addToast("error", "Fejl ved oprettelse af produkter");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveTemplate() {
    if (!namePattern.trim()) {
      addToast("error", "Angiv et navnemoenster for at gemme skabelon");
      return;
    }
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/admin/accessories/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: namePattern.trim(),
          category,
          price_oere: Math.round(parseFloat(priceDkk) * 100) || 0,
          name_pattern: namePattern.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      addToast("success", "Skabelon gemt");
    } catch {
      addToast("error", "Fejl ved gemning af skabelon");
    } finally {
      setSavingTemplate(false);
    }
  }

  /* ---- Device search filter ---- */

  const filteredGroups = DEVICE_GROUPS.map((g) => ({
    ...g,
    devices: deviceSearch
      ? g.devices.filter((d) =>
          d.label.toLowerCase().includes(deviceSearch.toLowerCase()),
        )
      : g.devices,
  })).filter((g) => g.devices.length > 0);

  const selectedDeviceLabels = selectedDevices.map(
    (slug) => TILBEHOER_DEVICES.find((d) => d.slug === slug)?.label ?? slug,
  );

  /* ---- Render ---- */

  return (
    <div className="space-y-5">
      {/* Toast container */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
              t.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                : "border-red-500/20 bg-red-500/10 text-red-700"
            }`}
          >
            {t.type === "success" ? (
              <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
            )}
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <a
          href="/admin/tilbehoer"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.06] bg-white text-charcoal/40 shadow-sm transition-colors hover:text-charcoal"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </a>
        <div>
          <h2 className="font-display text-2xl font-bold text-charcoal">Opret tilbehoer</h2>
          <p className="mt-0.5 text-sm text-charcoal/50">
            Masse-opret accessories pa tvaers af modeller
          </p>
        </div>
      </div>

      {/* Success banner */}
      {successCount !== null && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
          <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <p className="font-semibold text-emerald-700">
            {successCount} produkt{successCount !== 1 ? "er" : ""} oprettet!
          </p>
          <a
            href="/admin/tilbehoer"
            className="ml-auto text-sm font-medium text-emerald-600 hover:underline"
          >
            Se alle tilbehoer
          </a>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Left column */}
        <div className="space-y-5">

          {/* Templates */}
          <Section title="Hurtig-skabeloner">
            {templatesLoading ? (
              <div className="flex h-16 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-emerald-400" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-charcoal/40">
                Ingen skabeloner endnu. Gem din forste skabelon nedenfor.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="flex flex-col rounded-xl border border-black/[0.06] bg-stone-50 px-3 py-2 text-left transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5"
                  >
                    <span className="text-xs font-semibold text-charcoal">{t.name}</span>
                    <span className="mt-0.5 text-[11px] text-charcoal/40">
                      {t.category} &middot; {(t.price_oere / 100).toFixed(0)} kr
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* Category */}
          <Section title="Kategori">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-semibold transition-all ${
                    category === c.value
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                      : "border-black/[0.06] bg-stone-50 text-charcoal/50 hover:border-emerald-500/20 hover:bg-emerald-500/5 hover:text-emerald-600"
                  }`}
                >
                  <span className={category === c.value ? "text-emerald-500" : "text-charcoal/30"}>
                    {c.icon}
                  </span>
                  {c.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Brand */}
          <Section title="Maerke">
            <div className="relative">
              <input
                type="text"
                placeholder="f.eks. Apple, Anker, Spigen..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                onFocus={() => setBrandFocused(true)}
                onBlur={() => setTimeout(() => setBrandFocused(false), 150)}
                className="w-full rounded-xl border border-black/[0.06] bg-stone-50 px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              />
              {brandFocused && (
                <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-lg">
                  {BRAND_SUGGESTIONS.filter(
                    (s) => !brand || s.toLowerCase().includes(brand.toLowerCase()),
                  ).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={() => setBrand(s)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-charcoal transition-colors hover:bg-emerald-500/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Model multi-select */}
          <Section title="Modeller">
            {/* Search */}
            <div className="relative mb-3">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30"
                fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Sog modeller..."
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
                className="w-full rounded-xl border border-black/[0.06] bg-stone-50 py-2 pl-9 pr-4 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>

            {/* Groups */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {filteredGroups.map((group) => {
                const groupSlugs = group.devices.map((d) => d.slug);
                const allSelected = groupSlugs.every((s) => selectedDevices.includes(s));
                return (
                  <div key={group.brand}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/40">
                        {group.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleGroupAll(groupSlugs)}
                        className={`text-[11px] font-semibold transition-colors ${
                          allSelected ? "text-red-500 hover:text-red-600" : "text-emerald-500 hover:text-emerald-600"
                        }`}
                      >
                        {allSelected ? "Fravael alle" : "Vaelg alle"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.devices.map((d) => {
                        const sel = selectedDevices.includes(d.slug);
                        return (
                          <button
                            key={d.slug}
                            type="button"
                            onClick={() => toggleDevice(d.slug)}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                              sel
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "border border-black/[0.06] bg-stone-50 text-charcoal/50 hover:border-emerald-500/20 hover:bg-emerald-500/5 hover:text-emerald-600"
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected chips */}
            {selectedDevices.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-black/[0.04] pt-3">
                <span className="self-center text-[11px] font-semibold text-charcoal/40">
                  Valgt ({selectedDevices.length}):
                </span>
                {selectedDeviceLabels.map((label, i) => (
                  <span
                    key={selectedDevices[i]}
                    className="flex items-center gap-1 rounded-full bg-emerald-500/10 pl-2.5 pr-1.5 py-0.5 text-[11px] font-semibold text-emerald-700"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => removeDevice(selectedDevices[i])}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-emerald-500/20"
                    >
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Section>

          {/* Product details */}
          <Section title="Produkt detaljer">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/40">
                  Navnemoenster <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="f.eks. Silikone Cover Sort"
                  value={namePattern}
                  onChange={(e) => setNamePattern(e.target.value)}
                  className="w-full rounded-xl border border-black/[0.06] bg-stone-50 px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                />
                {namePattern && selectedDevices.length > 0 && (
                  <p className="mt-1.5 text-[11px] text-charcoal/40">
                    Eksempel: &ldquo;{namePattern} til {selectedDeviceLabels[0]}&rdquo;
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/40">
                  Pris (DKK)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="79"
                    value={priceDkk}
                    onChange={(e) => setPriceDkk(e.target.value)}
                    className="w-full rounded-xl border border-black/[0.06] bg-stone-50 px-4 py-2.5 pr-12 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-charcoal/30">
                    kr
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/40">
                  Kostpris (DKK)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="Valgfri"
                    value={costPriceDkk}
                    onChange={(e) => setCostPriceDkk(e.target.value)}
                    className="w-full rounded-xl border border-black/[0.06] bg-stone-50 px-4 py-2.5 pr-12 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-charcoal/30">
                    kr
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/40">
                  Online-lager
                </label>
                <input
                  type="number"
                  min={0}
                  value={onlineStock}
                  onChange={(e) => setOnlineStock(e.target.value)}
                  className="w-full rounded-xl border border-black/[0.06] bg-stone-50 px-4 py-2.5 text-sm text-charcoal focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/40">
                  Butiklager
                </label>
                <input
                  type="number"
                  min={0}
                  value={storeStock}
                  onChange={(e) => setStoreStock(e.target.value)}
                  className="w-full rounded-xl border border-black/[0.06] bg-stone-50 px-4 py-2.5 text-sm text-charcoal focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/40">
                  Beskrivelse
                </label>
                <textarea
                  rows={3}
                  placeholder="Kort produktbeskrivelse..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full resize-none rounded-xl border border-black/[0.06] bg-stone-50 px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>
            </div>
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* EAN */}
          <Section title="EAN stregkode">
            {/* 3 action buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEanMode(eanMode === "scan" ? "none" : "scan")}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-[11px] font-semibold transition-all ${
                  eanMode === "scan"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                    : "border-black/[0.06] bg-stone-50 text-charcoal/50 hover:bg-emerald-500/5 hover:text-emerald-600"
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                </svg>
                Scan
              </button>
              <button
                type="button"
                onClick={() => setEanMode(eanMode === "manual" ? "none" : "manual")}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-[11px] font-semibold transition-all ${
                  eanMode === "manual"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                    : "border-black/[0.06] bg-stone-50 text-charcoal/50 hover:bg-emerald-500/5 hover:text-emerald-600"
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
                Tast ind
              </button>
              <button
                type="button"
                onClick={generateEan}
                disabled={eanGenerating}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-black/[0.06] bg-stone-50 px-3 py-3 text-[11px] font-semibold text-charcoal/50 transition-all hover:bg-emerald-500/5 hover:text-emerald-600 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {eanGenerating ? "..." : "Generer"}
              </button>
            </div>

            {/* Scanner */}
            {eanMode === "scan" && (
              <div className="mt-3">
                <div id="ean-qr-reader" ref={scannerRef} className="overflow-hidden rounded-xl" />
              </div>
            )}

            {/* Manual entry */}
            {eanMode === "manual" && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="1234567890123"
                  value={eanValue}
                  onChange={(e) => setEanValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && lookupEanManual()}
                  className="flex-1 rounded-xl border border-black/[0.06] bg-stone-50 px-3 py-2 text-sm text-charcoal font-mono placeholder:text-charcoal/30 focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                />
                <button
                  type="button"
                  onClick={lookupEanManual}
                  disabled={eanLookingUp}
                  className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-600 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {eanLookingUp ? "..." : "Sla op"}
                </button>
              </div>
            )}

            {/* EAN value display */}
            {eanValue && eanMode !== "manual" && eanMode !== "scan" && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2">
                <svg className="h-4 w-4 shrink-0 text-charcoal/30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
                </svg>
                <span className="font-mono text-sm font-semibold text-charcoal">{eanValue}</span>
                <button
                  type="button"
                  onClick={() => { setEanValue(""); setEanLookup(null); }}
                  className="ml-auto text-charcoal/30 hover:text-charcoal/60"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* EAN lookup result */}
            {eanLookingUp && (
              <div className="mt-3 flex items-center gap-2 text-sm text-charcoal/40">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-emerald-400" />
                Slar op...
              </div>
            )}
            {eanLookup && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                {eanLookup.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={eanLookup.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                )}
                <div>
                  {eanLookup.name && (
                    <p className="text-sm font-semibold text-charcoal">{eanLookup.name}</p>
                  )}
                  {eanLookup.brand && (
                    <p className="text-[11px] text-charcoal/50">{eanLookup.brand}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (eanLookup.name) setNamePattern(eanLookup.name);
                    if (eanLookup.brand) setBrand(eanLookup.brand);
                  }}
                  className="ml-auto rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-500/20"
                >
                  Brug
                </button>
              </div>
            )}
          </Section>

          {/* Images */}
          <Section title="Billeder">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-black/[0.08] bg-stone-50/50 px-4 py-6 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5"
            >
              <svg className="h-8 w-8 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <p className="text-sm text-charcoal/50">
                <span className="font-semibold text-emerald-600">Vaelg billeder</span> eller traek hertil
              </p>
              <p className="text-[11px] text-charcoal/30">PNG, JPG, WebP</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
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
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full"
                  />
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

            {/* Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-xl border border-black/[0.06]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Submit */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-white" />
                  Opretter...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Opret {productCount} produkt{productCount !== 1 ? "er" : ""}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/[0.06] bg-white px-6 py-3 text-sm font-semibold text-charcoal/60 shadow-sm transition-all hover:bg-stone-50 hover:text-charcoal disabled:opacity-50"
            >
              {savingTemplate ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-charcoal/40" />
                  Gemmer...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                  </svg>
                  Gem som skabelon
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
