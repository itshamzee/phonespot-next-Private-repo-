"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { RepairBrand, RepairModel, RepairService } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEPS = ["Enhed", "Reparation", "Detaljer", "Opsummering"] as const;
const TEMPERED_GLASS_PRICE = 99;

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
/*  Progress Bar                                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="mb-10 flex items-center justify-between">
      {STEPS.map((label, i) => {
        const isCompleted = i < current;
        const isActive = i === current;
        return (
          <div key={label} className="flex flex-1 items-center">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  isCompleted
                    ? "bg-green-eco text-white"
                    : isActive
                      ? "bg-green-eco text-white ring-4 ring-green-eco/30"
                      : "bg-soft-grey text-gray"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isActive || isCompleted ? "text-green-eco" : "text-gray"
                }`}
              >
                {label}
              </span>
            </div>

            {/* Connecting line */}
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 transition-colors ${
                  i < current ? "bg-green-eco" : "bg-soft-grey"
                }`}
              />
            )}
          </div>
        );
      })}
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
  return (
    <div className="mt-8 flex justify-between gap-4">
      {step > 0 ? (
        <button
          type="button"
          onClick={onPrev}
          className="rounded-radius-md border border-soft-grey px-6 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-sand"
        >
          Tilbage
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext || isSubmitting}
        className="rounded-radius-md bg-green-eco px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-green-eco/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting
          ? "Sender..."
          : isLast
            ? "Send reparationsanmodning"
            : "Naeste"}
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

  /* ---- wizard state ---- */
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
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(
    new Set(),
  );
  const [includesTemperedGlass, setIncludesTemperedGlass] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);

  /* ---- step 3: customer ---- */
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: "",
    email: "",
    phone: "",
    description: "",
  });

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

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  // Fetch brands on mount
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

  // Fetch models when brand changes
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

  // Fetch services when model changes
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

  /* ---- pre-fill from URL search params ---- */
  useEffect(() => {
    if (brands.length === 0) return;

    const brandSlug = searchParams.get("brand");
    if (!brandSlug) return;

    const matchedBrand = brands.find((b) => b.slug === brandSlug);
    if (matchedBrand && !selectedBrandId) {
      setSelectedBrandId(matchedBrand.id);
    }
  }, [brands, searchParams, selectedBrandId]);

  useEffect(() => {
    if (models.length === 0) return;

    const modelSlug = searchParams.get("model");
    if (!modelSlug) return;

    const matchedModel = models.find((m) => m.slug === modelSlug);
    if (matchedModel && !selectedModelId) {
      setSelectedModelId(matchedModel.id);
    }
  }, [models, searchParams, selectedModelId]);

  useEffect(() => {
    if (services.length === 0) return;

    const serviceSlug = searchParams.get("service");
    if (!serviceSlug) return;

    const matchedService = services.find((s) => s.slug === serviceSlug);
    if (matchedService && selectedServiceIds.size === 0) {
      setSelectedServiceIds(new Set([matchedService.id]));
    }
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
      case 0:
        return !!selectedBrandId && !!selectedModelId;
      case 1:
        return selectedServiceIds.size > 0;
      case 2:
        return !!(
          customer.name.trim() &&
          customer.email.trim() &&
          customer.phone.trim() &&
          customer.description.trim()
        );
      case 3:
        return true;
      default:
        return false;
    }
  }, [step, selectedBrandId, selectedModelId, selectedServiceIds.size, customer]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ success: true, ticketId: data.ticketId });
      } else {
        setSubmitResult({ success: false, error: data.error });
      }
    } catch {
      setSubmitResult({
        success: false,
        error: "Noget gik galt. Proev igen senere.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    if (step === 3) {
      handleSubmit();
    } else {
      setStep((s) => Math.min(s + 1, 3));
    }
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  /* ---------------------------------------------------------------- */
  /*  Success screen                                                   */
  /* ---------------------------------------------------------------- */

  if (submitResult?.success) {
    return (
      <div className="rounded-radius-lg border border-green-eco/30 bg-green-eco/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-eco text-white">
          <svg
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-charcoal">
          Tak for din anmodning!
        </h2>
        <p className="mt-3 text-gray">
          Vi har modtaget din reparationsanmodning og vender tilbage hurtigst
          muligt.
        </p>
        {submitResult.ticketId && (
          <p className="mt-2 text-sm text-gray">
            Sags-ID:{" "}
            <span className="font-mono font-medium text-charcoal">
              {submitResult.ticketId.slice(0, 8)}
            </span>
          </p>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const inputStyles =
    "w-full rounded-radius-md border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco transition-colors";

  return (
    <div>
      <ProgressBar current={step} />

      {submitResult?.error && (
        <div className="mb-6 rounded-radius-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {submitResult.error}
        </div>
      )}

      {/* ---- Step 1: Enhed ---- */}
      {step === 0 && (
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold text-charcoal">
            Vaelg din enhed
          </h2>

          {/* Brand */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="brand"
              className="text-sm font-medium text-charcoal"
            >
              Maerke <span className="text-red-500">*</span>
            </label>
            {brandsLoading ? (
              <p className="text-sm text-gray">Indlaeser maerker...</p>
            ) : (
              <select
                id="brand"
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className={inputStyles}
              >
                <option value="">Vaelg maerke...</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Model */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="model"
              className="text-sm font-medium text-charcoal"
            >
              Model <span className="text-red-500">*</span>
            </label>
            {modelsLoading ? (
              <p className="text-sm text-gray">Indlaeser modeller...</p>
            ) : (
              <select
                id="model"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={!selectedBrandId}
                className={inputStyles}
              >
                <option value="">
                  {selectedBrandId
                    ? "Vaelg model..."
                    : "Vaelg maerke foerst..."}
                </option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* ---- Step 2: Reparation ---- */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold text-charcoal">
            Vaelg reparation
          </h2>

          {servicesLoading ? (
            <p className="text-sm text-gray">Indlaeser reparationer...</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-gray">
              Ingen reparationer tilgaengelige for denne model.
            </p>
          ) : (
            <div className="space-y-3">
              {services.map((s) => {
                const isChecked = selectedServiceIds.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer items-center justify-between rounded-radius-md border p-4 transition-colors ${
                      isChecked
                        ? "border-green-eco bg-green-eco/5"
                        : "border-soft-grey hover:border-green-eco/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleService(s.id)}
                        className="h-5 w-5 rounded border-soft-grey text-green-eco accent-green-eco"
                      />
                      <span className="font-medium text-charcoal">
                        {s.name}
                      </span>
                    </div>
                    <span className="font-bold text-charcoal">
                      {s.price_dkk} DKK
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {/* Tempered glass upsell */}
          <div
            className={`rounded-radius-md border-2 p-4 transition-colors ${
              includesTemperedGlass
                ? "border-green-eco bg-green-eco/5"
                : "border-dashed border-green-eco/40 bg-green-eco/[0.02]"
            }`}
          >
            <label className="flex cursor-pointer items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={includesTemperedGlass}
                  onChange={() => setIncludesTemperedGlass((v) => !v)}
                  className="h-5 w-5 rounded border-soft-grey text-green-eco accent-green-eco"
                />
                <div>
                  <span className="font-bold text-charcoal">
                    Tilfoej panserglas til din enhed?
                  </span>
                  <p className="mt-0.5 text-sm text-gray">
                    Beskyt din skaerm med haerdet glas
                  </p>
                </div>
              </div>
              <span className="font-bold text-green-eco">
                {TEMPERED_GLASS_PRICE} DKK
              </span>
            </label>
          </div>

          {/* Multi-repair discount badge */}
          {discountPercent > 0 && (
            <div className="flex items-center gap-2 rounded-radius-md bg-green-eco/10 px-4 py-3">
              <span className="rounded-full bg-green-eco px-3 py-1 text-xs font-bold text-white">
                Spar {discountPercent}%!
              </span>
              <span className="text-sm text-charcoal">
                Rabat ved {selectedServiceIds.size} reparationer
              </span>
            </div>
          )}

          {/* Running total */}
          {selectedServiceIds.size > 0 && (
            <div className="border-t border-soft-grey pt-4">
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm text-gray">
                  <span>Subtotal</span>
                  <span className="line-through">{subtotal} DKK</span>
                </div>
              )}
              <div className="mt-1 flex justify-between text-lg font-bold text-charcoal">
                <span>Total</span>
                <span>{totalPrice} DKK</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Step 3: Detaljer ---- */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold text-charcoal">
            Dine oplysninger
          </h2>

          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-medium text-charcoal">
              Navn <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Dit fulde navn"
              value={customer.name}
              onChange={handleCustomerChange}
              className={inputStyles}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-charcoal"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="din@email.dk"
              value={customer.email}
              onChange={handleCustomerChange}
              className={inputStyles}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="phone"
              className="text-sm font-medium text-charcoal"
            >
              Telefon <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              placeholder="+45 XX XX XX XX"
              value={customer.phone}
              onChange={handleCustomerChange}
              className={inputStyles}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="description"
              className="text-sm font-medium text-charcoal"
            >
              Beskriv problemet <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              required
              placeholder="Beskriv problemet med din enhed..."
              rows={5}
              value={customer.description}
              onChange={handleCustomerChange}
              className={inputStyles}
            />
          </div>
        </div>
      )}

      {/* ---- Step 4: Opsummering ---- */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold text-charcoal">
            Opsummering
          </h2>

          {/* Device */}
          <div className="rounded-radius-md border border-soft-grey p-4">
            <h3 className="text-sm font-medium text-gray">Enhed</h3>
            <p className="mt-1 text-lg font-bold text-charcoal">
              {selectedBrand?.name} {selectedModel?.name}
            </p>
          </div>

          {/* Services */}
          <div className="rounded-radius-md border border-soft-grey p-4">
            <h3 className="mb-3 text-sm font-medium text-gray">
              Valgte reparationer
            </h3>
            <ul className="space-y-2">
              {selectedServices.map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between text-sm text-charcoal"
                >
                  <span>{s.name}</span>
                  <span className="font-medium">{s.price_dkk} DKK</span>
                </li>
              ))}
              {includesTemperedGlass && (
                <li className="flex justify-between text-sm text-charcoal">
                  <span>Panserglas</span>
                  <span className="font-medium">
                    {TEMPERED_GLASS_PRICE} DKK
                  </span>
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
              <div className="mt-1 flex justify-between text-lg font-bold text-charcoal">
                <span>Total</span>
                <span>{totalPrice} DKK</span>
              </div>
            </div>
          </div>

          {/* Customer info */}
          <div className="rounded-radius-md border border-soft-grey p-4">
            <h3 className="mb-3 text-sm font-medium text-gray">
              Kontaktoplysninger
            </h3>
            <dl className="space-y-2 text-sm text-charcoal">
              <div className="flex justify-between">
                <dt className="text-gray">Navn</dt>
                <dd className="font-medium">{customer.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray">Email</dt>
                <dd className="font-medium">{customer.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray">Telefon</dt>
                <dd className="font-medium">{customer.phone}</dd>
              </div>
              <div>
                <dt className="text-gray">Beskrivelse</dt>
                <dd className="mt-1 font-medium">{customer.description}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      <NavButtons
        step={step}
        canNext={canGoNext}
        onPrev={goPrev}
        onNext={goNext}
        isSubmitting={isSubmitting}
        isLast={step === 3}
      />
    </div>
  );
}
