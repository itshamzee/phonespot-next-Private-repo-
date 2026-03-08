"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { RepairBrand, RepairModel, RepairService } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEPS = [
  { label: "Enhed", icon: "device" },
  { label: "Reparation", icon: "wrench" },
  { label: "Detaljer", icon: "user" },
  { label: "Dato", icon: "calendar" },
  { label: "Betal", icon: "check" },
] as const;

const TEMPERED_GLASS_PRICE = 99;

/* ------------------------------------------------------------------ */
/*  Utility functions                                                  */
/* ------------------------------------------------------------------ */

function getAvailableDates(count: number): string[] {
  const dates: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1); // start from tomorrow
  while (dates.length < count) {
    const day = d.getDay();
    if (day >= 1 && day <= 6) { // Mon-Sat
      dates.push(d.toISOString().slice(0, 10));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function formatDateDanish(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Step Icons                                                         */
/* ------------------------------------------------------------------ */

function StepIcon({ type, active }: { type: string; active: boolean }) {
  const color = active ? "text-white" : "text-gray";
  const icons: Record<string, React.ReactNode> = {
    device: (
      <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${color}`}>
        <rect x="5" y="2" width="10" height="16" rx="2" />
      </svg>
    ),
    wrench: (
      <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${color}`}>
        <path d="M13.7 5.3a1 1 0 000 1.4l.6.6a1 1 0 001.4 0l2.77-2.77a5 5 0 01-6.94 6.94l-5.91 5.91a1.62 1.62 0 01-2.3-2.3l5.91-5.91a5 5 0 016.94-6.94L13.7 5.3z" />
      </svg>
    ),
    user: (
      <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${color}`}>
        <path d="M10 10a4 4 0 100-8 4 4 0 000 8zM2 18a8 8 0 0116 0H2z" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${color}`}>
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4H16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h1.25V2.75A.75.75 0 015.75 2zM4 8v8h12V8H4z" clipRule="evenodd" />
      </svg>
    ),
    check: (
      <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${color}`}>
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
      </svg>
    ),
  };
  return <>{icons[type] ?? icons.check}</>;
}

/* ------------------------------------------------------------------ */
/*  Progress Bar                                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="mb-10">
      {/* Desktop steps */}
      <div className="hidden sm:flex items-center justify-between">
        {STEPS.map(({ label, icon }, i) => {
          const isCompleted = i < current;
          const isActive = i === current;
          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 ${
                    isCompleted
                      ? "bg-green-eco shadow-md shadow-green-eco/25"
                      : isActive
                        ? "bg-green-eco shadow-lg shadow-green-eco/30 ring-4 ring-green-eco/20"
                        : "border-2 border-soft-grey bg-white"
                  }`}
                >
                  {isCompleted ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-white">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <StepIcon type={icon} active={isActive} />
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-bold ${
                    isActive ? "text-green-eco" : isCompleted ? "text-charcoal" : "text-gray"
                  }`}
                >
                  {label}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div className="relative mx-3 h-0.5 flex-1 overflow-hidden rounded-full bg-soft-grey">
                  <div
                    className="absolute left-0 top-0 h-full bg-green-eco transition-all duration-500"
                    style={{ width: i < current ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile — compact pills */}
      <div className="flex items-center justify-between sm:hidden">
        {STEPS.map(({ label }, i) => {
          const isCompleted = i < current;
          const isActive = i === current;
          return (
            <div
              key={label}
              className={`flex-1 py-2 text-center text-xs font-bold transition-colors ${
                isActive
                  ? "border-b-2 border-green-eco text-green-eco"
                  : isCompleted
                    ? "border-b-2 border-green-eco/30 text-charcoal"
                    : "border-b-2 border-transparent text-gray"
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Navigation Buttons                                                 */
/* ------------------------------------------------------------------ */

function NavButtons({
  step,
  canNext,
  onPrev,
  onNext,
  isSubmitting,
  isLast,
}: {
  step: number;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  isSubmitting?: boolean;
  isLast?: boolean;
}) {
  if (isLast) return null;

  return (
    <div className="mt-10 flex justify-between gap-4">
      {step > 0 ? (
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 rounded-full border border-soft-grey bg-white px-6 py-3 text-sm font-bold text-charcoal transition-colors hover:bg-sand"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Tilbage
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext || isSubmitting}
        className="flex items-center gap-2 rounded-full bg-green-eco px-8 py-3 text-sm font-bold text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-green-eco/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {isSubmitting ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sender...
          </>
        ) : isLast ? (
          <>
            Send reparationsanmodning
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M8 14a.75.75 0 0 1-.75-.75V4.56L4.03 7.78a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.56v8.69A.75.75 0 0 1 8 14Z" clipRule="evenodd" />
            </svg>
          </>
        ) : (
          <>
            Næste
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function BookingWizard() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserClient(), []);

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    ticketId?: string;
    error?: string;
  } | null>(null);

  /* ---- step 1: device ---- */
  const [brands, setBrands] = useState<RepairBrand[]>([]);
  const [models, setModels] = useState<RepairModel[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);

  /* ---- step 2: services ---- */
  const [services, setServices] = useState<RepairService[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [includesTemperedGlass, setIncludesTemperedGlass] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);

  /* ---- step 3: customer ---- */
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: "",
    email: "",
    phone: "",
    description: "",
  });

  /* ---- step 4: date ---- */
  const [preferredDate, setPreferredDate] = useState("");

  /* ---- derived ---- */
  const selectedBrand = brands.find((b) => b.id === selectedBrandId);
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const selectedServices = services.filter((s) => selectedServiceIds.has(s.id));

  const subtotal =
    selectedServices.reduce((sum, s) => sum + s.price_dkk, 0) +
    (includesTemperedGlass ? TEMPERED_GLASS_PRICE : 0);

  const discountPercent =
    selectedServiceIds.size >= 3 ? 15 : selectedServiceIds.size >= 2 ? 10 : 0;

  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const totalPrice = subtotal - discountAmount;

  const availableDates = useMemo(() => getAvailableDates(12), []);

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("repair_brands")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      setBrands((data as RepairBrand[]) ?? []);
      setBrandsLoading(false);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!selectedBrandId) {
      setModels([]);
      return;
    }
    setModelsLoading(true);
    setSelectedModelId("");
    setServices([]);
    setSelectedServiceIds(new Set());
    (async () => {
      const { data } = await supabase
        .from("repair_models")
        .select("*")
        .eq("brand_id", selectedBrandId)
        .eq("active", true)
        .order("sort_order");
      setModels((data as RepairModel[]) ?? []);
      setModelsLoading(false);
    })();
  }, [selectedBrandId, supabase]);

  useEffect(() => {
    if (!selectedModelId) {
      setServices([]);
      setSelectedServiceIds(new Set());
      return;
    }
    setServicesLoading(true);
    (async () => {
      const { data } = await supabase
        .from("repair_services")
        .select("*")
        .eq("model_id", selectedModelId)
        .eq("active", true)
        .order("sort_order");
      setServices((data as RepairService[]) ?? []);
      setServicesLoading(false);
    })();
  }, [selectedModelId, supabase]);

  /* ---- pre-fill from URL ---- */
  useEffect(() => {
    if (brands.length === 0) return;
    const brandSlug = searchParams.get("brand");
    if (!brandSlug) return;
    const matchedBrand = brands.find((b) => b.slug === brandSlug);
    if (matchedBrand && !selectedBrandId) setSelectedBrandId(matchedBrand.id);
  }, [brands, searchParams, selectedBrandId]);

  useEffect(() => {
    if (models.length === 0) return;
    const modelSlug = searchParams.get("model");
    if (!modelSlug) return;
    const matchedModel = models.find((m) => m.slug === modelSlug);
    if (matchedModel && !selectedModelId) setSelectedModelId(matchedModel.id);
  }, [models, searchParams, selectedModelId]);

  useEffect(() => {
    if (services.length === 0) return;
    const serviceSlug = searchParams.get("service");
    if (!serviceSlug) return;
    const matchedService = services.find((s) => s.slug === serviceSlug);
    if (matchedService && selectedServiceIds.size === 0)
      setSelectedServiceIds(new Set([matchedService.id]));
  }, [services, searchParams, selectedServiceIds.size]);

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const toggleService = useCallback((id: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCustomerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setCustomer((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    [],
  );

  const canGoNext = useMemo(() => {
    switch (step) {
      case 0: return !!selectedBrandId && !!selectedModelId;
      case 1: return selectedServiceIds.size > 0;
      case 2: return !!(customer.name.trim() && customer.email.trim() && customer.phone.trim() && customer.description.trim());
      case 3: return !!preferredDate;
      case 4: return true;
      default: return false;
    }
  }, [step, selectedBrandId, selectedModelId, selectedServiceIds.size, customer, preferredDate]);

  const buildPayload = () => ({
    customer_name: customer.name.trim(),
    customer_email: customer.email.trim(),
    customer_phone: customer.phone.trim(),
    device_type: selectedBrand?.name ?? "",
    device_model: selectedModel?.name ?? "",
    issue_description: customer.description.trim(),
    service_type: selectedServices.map((s) => s.name).join(", "),
    selected_services: selectedServices.map((s) => ({
      id: s.id,
      name: s.name,
      price_dkk: s.price_dkk,
    })),
    total_price_dkk: totalPrice,
    discount_percent: discountPercent,
    includes_tempered_glass: includesTemperedGlass,
    preferred_date: preferredDate,
  });

  /** "Betal i butikken" — existing flow, no payment */
  const handleSubmitNoPay = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ success: true, ticketId: data.ticketId });
      } else {
        setSubmitResult({ success: false, error: data.error });
      }
    } catch {
      setSubmitResult({ success: false, error: "Noget gik galt. Prøv igen senere." });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** "Betal nu" — create Draft Order, redirect to Shopify checkout */
  const handleSubmitAndPay = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/repairs/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (res.ok && data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
      } else {
        setSubmitResult({ success: false, error: data.error || "Kunne ikke oprette betaling" });
        setIsSubmitting(false);
      }
    } catch {
      setSubmitResult({ success: false, error: "Noget gik galt. Prøv igen senere." });
      setIsSubmitting(false);
    }
  };

  const goNext = () => setStep((s) => Math.min(s + 1, 4));

  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  /* ---------------------------------------------------------------- */
  /*  Success screen                                                   */
  /* ---------------------------------------------------------------- */

  if (submitResult?.success) {
    return (
      <div className="rounded-2xl border border-green-eco/20 bg-green-eco/5 p-10 text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-eco shadow-lg shadow-green-eco/25">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="h-10 w-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-charcoal">
          Tak for din anmodning!
        </h2>
        <p className="mt-3 text-gray">
          Vi har modtaget din reparationsanmodning og vender tilbage inden for få timer.
        </p>
        {submitResult.ticketId && (
          <p className="mt-4 rounded-lg bg-white p-3 text-sm text-gray">
            Sags-ID:{" "}
            <span className="font-mono font-bold text-charcoal">
              {submitResult.ticketId.slice(0, 8)}
            </span>
          </p>
        )}
        {preferredDate && (
          <p className="mt-2 text-sm text-gray">
            Ønsket aflevering: <span className="font-medium text-charcoal">{formatDateDanish(preferredDate)}</span>
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 text-green-eco">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-sm font-bold text-green-eco">Livstidsgaranti inkluderet</span>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Styles                                                           */
  /* ---------------------------------------------------------------- */

  const inputStyles =
    "w-full rounded-xl border border-soft-grey bg-white px-4 py-3.5 text-charcoal placeholder:text-gray/50 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20 transition-all";

  const labelStyles = "text-sm font-bold text-charcoal";

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="rounded-2xl border border-soft-grey bg-white p-6 shadow-sm md:p-8">
      <ProgressBar current={step} />

      {submitResult?.error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {submitResult.error}
        </div>
      )}

      {/* ---- Step 1: Enhed ---- */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">
              Vælg din enhed
            </h2>
            <p className="mt-1 text-sm text-gray">Vælg mærke og model for at se tilgængelige reparationer.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="brand" className={labelStyles}>Mærke</label>
            {brandsLoading ? (
              <div className="flex items-center gap-2 py-3 text-sm text-gray">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Indlæser mærker...
              </div>
            ) : (
              <select
                id="brand"
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className={inputStyles}
              >
                <option value="">Vælg mærke...</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="model" className={labelStyles}>Model</label>
            {modelsLoading ? (
              <div className="flex items-center gap-2 py-3 text-sm text-gray">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Indlæser modeller...
              </div>
            ) : (
              <select
                id="model"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={!selectedBrandId}
                className={inputStyles}
              >
                <option value="">
                  {selectedBrandId ? "Vælg model..." : "Vælg mærke først..."}
                </option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* ---- Step 2: Reparation ---- */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">
              Vælg reparation
            </h2>
            <p className="mt-1 text-sm text-gray">
              Vælg en eller flere reparationer. Flere reparationer = større rabat!
            </p>
          </div>

          {servicesLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-gray">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Indlæser reparationer...
            </div>
          ) : services.length === 0 ? (
            <p className="py-4 text-sm text-gray">Ingen reparationer tilgængelige for denne model.</p>
          ) : (
            <div className="space-y-2">
              {services.map((s) => {
                const isChecked = selectedServiceIds.has(s.id);
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => toggleService(s.id)}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                      isChecked
                        ? "border-green-eco bg-green-eco/5 shadow-sm"
                        : "border-soft-grey hover:border-green-eco/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${
                        isChecked
                          ? "border-green-eco bg-green-eco text-white"
                          : "border-soft-grey"
                      }`}>
                        {isChecked && (
                          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-charcoal">{s.name}</span>
                        {s.estimated_minutes && (
                          <span className="ml-2 text-xs text-gray">ca. {s.estimated_minutes} min</span>
                        )}
                      </div>
                    </div>
                    <span className="font-display font-bold text-charcoal">{s.price_dkk} DKK</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tempered glass upsell */}
          <div className={`rounded-xl border-2 p-4 transition-all ${
            includesTemperedGlass
              ? "border-green-eco bg-green-eco/5"
              : "border-dashed border-green-eco/30 bg-green-eco/[0.02]"
          }`}>
            <button type="button" onClick={() => setIncludesTemperedGlass((v) => !v)} className="flex w-full cursor-pointer items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <div className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${
                  includesTemperedGlass
                    ? "border-green-eco bg-green-eco text-white"
                    : "border-green-eco/30"
                }`}>
                  {includesTemperedGlass && (
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <span className="font-bold text-charcoal">Tilføj panserglas</span>
                  <p className="text-xs text-gray">Beskyt din skærm med hærdet glas</p>
                </div>
              </div>
              <span className="font-display font-bold text-green-eco">{TEMPERED_GLASS_PRICE} DKK</span>
            </button>
          </div>

          {/* Discount badge */}
          {discountPercent > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-green-eco/10 p-4">
              <span className="rounded-full bg-green-eco px-3 py-1.5 text-xs font-bold text-white">
                -{discountPercent}%
              </span>
              <span className="text-sm font-medium text-charcoal">
                Rabat ved {selectedServiceIds.size} reparationer — du sparer {discountAmount} DKK!
              </span>
            </div>
          )}

          {/* Running total */}
          {selectedServiceIds.size > 0 && (
            <div className="rounded-xl bg-charcoal/[0.03] p-4">
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm text-gray">
                  <span>Subtotal</span>
                  <span className="line-through">{subtotal} DKK</span>
                </div>
              )}
              <div className="mt-1 flex justify-between text-lg font-bold text-charcoal">
                <span>Total</span>
                <span className="text-green-eco">{totalPrice} DKK</span>
              </div>
              <p className="mt-1 text-xs text-gray">Inkl. moms, reservedele og livstidsgaranti</p>
            </div>
          )}
        </div>
      )}

      {/* ---- Step 3: Detaljer ---- */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">
              Dine oplysninger
            </h2>
            <p className="mt-1 text-sm text-gray">Vi bruger disse oplysninger til at kontakte dig om reparationen.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className={labelStyles}>Fulde navn</label>
              <input
                id="name" name="name" type="text" required
                placeholder="Anders Andersen"
                value={customer.name} onChange={handleCustomerChange}
                className={inputStyles}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className={labelStyles}>Telefon</label>
              <input
                id="phone" name="phone" type="tel" required
                placeholder="+45 XX XX XX XX"
                value={customer.phone} onChange={handleCustomerChange}
                className={inputStyles}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className={labelStyles}>Email</label>
            <input
              id="email" name="email" type="email" required
              placeholder="din@email.dk"
              value={customer.email} onChange={handleCustomerChange}
              className={inputStyles}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="description" className={labelStyles}>Beskriv problemet</label>
            <textarea
              id="description" name="description" required
              placeholder="Beskriv hvad der er galt med din enhed — hvad skete der, og hvornår startede det?"
              rows={4}
              value={customer.description} onChange={handleCustomerChange}
              className={inputStyles}
            />
          </div>
        </div>
      )}

      {/* ---- Step 4: Dato ---- */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">
              Hvornår vil du aflevere din enhed?
            </h2>
            <p className="mt-1 text-sm text-gray">
              Vælg en dato hvor du kan aflevere din enhed i butikken.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {availableDates.map((date) => {
              const isSelected = preferredDate === date;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setPreferredDate(date)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-green-eco bg-green-eco/5 shadow-sm"
                      : "border-soft-grey hover:border-green-eco/30"
                  }`}
                >
                  <p className={`text-sm font-bold ${isSelected ? "text-green-eco" : "text-charcoal"}`}>
                    {new Date(date + "T12:00:00").toLocaleDateString("da-DK", { weekday: "long" })}
                  </p>
                  <p className="mt-0.5 text-xs text-gray">
                    {new Date(date + "T12:00:00").toLocaleDateString("da-DK", { day: "numeric", month: "long" })}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Parts availability note */}
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-amber-500">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-800">
              <span className="font-bold">Bemærk:</span> Nogle reservedele har vi ikke på lager, men vi har dag-til-dag levering og kan have dem klar til næste dag. Vi kontakter dig hvis din valgte dato skal justeres.
            </p>
          </div>
        </div>
      )}

      {/* ---- Step 5: Bekræft & Betal ---- */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">
              Bekræft din booking
            </h2>
            <p className="mt-1 text-sm text-gray">Gennemgå dine valg og vælg betalingsmetode.</p>
          </div>

          {/* Device */}
          <div className="rounded-xl bg-charcoal/[0.03] p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray">Enhed</p>
            <p className="mt-1 font-display text-lg font-bold text-charcoal">
              {selectedBrand?.name} {selectedModel?.name}
            </p>
          </div>

          {/* Services */}
          <div className="rounded-xl bg-charcoal/[0.03] p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray">Reparationer</p>
            <ul className="space-y-2">
              {selectedServices.map((s) => (
                <li key={s.id} className="flex justify-between text-sm">
                  <span className="text-charcoal">{s.name}</span>
                  <span className="font-bold text-charcoal">{s.price_dkk} DKK</span>
                </li>
              ))}
              {includesTemperedGlass && (
                <li className="flex justify-between text-sm">
                  <span className="text-charcoal">Panserglas</span>
                  <span className="font-bold text-charcoal">{TEMPERED_GLASS_PRICE} DKK</span>
                </li>
              )}
            </ul>

            <div className="mt-4 border-t border-soft-grey pt-3">
              {discountPercent > 0 && (
                <>
                  <div className="flex justify-between text-sm text-gray">
                    <span>Subtotal</span>
                    <span className="line-through">{subtotal} DKK</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-eco">
                    <span>Rabat ({discountPercent}%)</span>
                    <span>-{discountAmount} DKK</span>
                  </div>
                </>
              )}
              <div className="mt-1 flex justify-between font-display text-lg font-bold">
                <span className="text-charcoal">Total</span>
                <span className="text-green-eco">{totalPrice} DKK</span>
              </div>
              <p className="mt-1 text-xs text-gray">Inkl. moms, reservedele og livstidsgaranti</p>
            </div>
          </div>

          {/* Afleveringsdato */}
          <div className="rounded-xl bg-charcoal/[0.03] p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray">Afleveringsdato</p>
            <p className="mt-1 font-display text-lg font-bold text-charcoal">
              {preferredDate ? formatDateDanish(preferredDate) : "Ikke valgt"}
            </p>
          </div>

          {/* Customer */}
          <div className="rounded-xl bg-charcoal/[0.03] p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray">Kontaktoplysninger</p>
            <dl className="space-y-2 text-sm">
              {[
                ["Navn", customer.name],
                ["Email", customer.email],
                ["Telefon", customer.phone],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-gray">{label}</dt>
                  <dd className="font-medium text-charcoal">{value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-gray">Beskrivelse</dt>
                <dd className="mt-1 text-charcoal">{customer.description}</dd>
              </div>
            </dl>
          </div>

          {/* Guarantee reminder */}
          <div className="flex items-center gap-3 rounded-xl border border-green-eco/20 bg-green-eco/5 p-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 shrink-0 text-green-eco">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <div>
              <p className="text-sm font-bold text-charcoal">Livstidsgaranti inkluderet</p>
              <p className="text-xs text-gray">Alle reparationer dækkes af livstidsgaranti på arbejde og reservedele.</p>
            </div>
          </div>

          {/* Payment buttons */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleSubmitAndPay}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-green-eco px-8 py-4 text-base font-bold text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-green-eco/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sender...
                </>
              ) : (
                <>Betal nu — {totalPrice} DKK</>
              )}
            </button>
            <p className="text-center text-xs text-gray">
              Betal sikkert med Klarna, kort eller MobilePay
            </p>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-soft-grey" />
              <span className="text-sm text-gray">eller</span>
              <div className="h-px flex-1 bg-soft-grey" />
            </div>

            <button
              type="button"
              onClick={handleSubmitNoPay}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-soft-grey bg-white px-8 py-4 text-base font-bold text-charcoal transition-all hover:border-green-eco/30 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-50"
            >
              Betal i butikken
            </button>
          </div>

          {/* Back button */}
          <div className="flex justify-start">
            <button
              type="button"
              onClick={goPrev}
              className="flex items-center gap-2 rounded-full border border-soft-grey bg-white px-6 py-3 text-sm font-bold text-charcoal transition-colors hover:bg-sand"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
              Tilbage
            </button>
          </div>
        </div>
      )}

      <NavButtons
        step={step}
        canNext={canGoNext}
        onPrev={goPrev}
        onNext={goNext}
        isSubmitting={isSubmitting}
        isLast={step === 4}
      />
    </div>
  );
}
