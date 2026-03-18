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

const DEVICE_COLORS = [
  { name: "Sort", hex: "#1c1c1e" },
  { name: "Hvid", hex: "#f2f2f0", border: true },
  { name: "Sølv", hex: "#c8c8cc" },
  { name: "Guld", hex: "#d4af6e" },
  { name: "Blå", hex: "#4a7fc1" },
  { name: "Lilla", hex: "#8e6abf" },
  { name: "Grøn", hex: "#3a8c5e" },
  { name: "Rød", hex: "#d94040" },
  { name: "Titan", hex: "#5a5a60" },
  { name: "Gul", hex: "#e0c040" },
];

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

interface DeviceBooking {
  id: string;
  brandId: string;
  modelId: string;
  color: string;
  serviceIds: Set<string>;
  includesTemperedGlass: boolean;
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
/*  Device Tabs                                                        */
/* ------------------------------------------------------------------ */

function DeviceTabs({
  deviceBookings,
  activeDeviceIndex,
  brands,
  modelsMap,
  onSelect,
  onAdd,
  onRemove,
}: {
  deviceBookings: DeviceBooking[];
  activeDeviceIndex: number;
  brands: RepairBrand[];
  modelsMap: Map<string, RepairModel[]>;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {deviceBookings.map((booking, i) => {
          const brand = brands.find((b) => b.id === booking.brandId);
          const models = modelsMap.get(booking.id) ?? [];
          const model = models.find((m) => m.id === booking.modelId);
          return (
            <button
              key={booking.id}
              type="button"
              onClick={() => onSelect(i)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all ${
                i === activeDeviceIndex
                  ? "bg-green-eco text-white shadow-sm"
                  : "border border-soft-grey bg-white text-charcoal hover:border-green-eco/30"
              }`}
            >
              Enhed {i + 1}
              {model && (
                <span className="font-normal opacity-80">
                  — {brand?.name} {model.name}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 whitespace-nowrap rounded-full border-2 border-dashed border-green-eco/30 px-4 py-2 text-sm font-bold text-green-eco transition-all hover:border-green-eco/50 hover:bg-green-eco/5"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          Tilføj enhed
        </button>
      </div>
      {deviceBookings.length > 1 && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-2 text-xs font-semibold text-red-500 hover:underline"
        >
          Fjern enhed {activeDeviceIndex + 1}
        </button>
      )}
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

  /* ---- multi-device state ---- */
  const [deviceBookings, setDeviceBookings] = useState<DeviceBooking[]>([
    {
      id: crypto.randomUUID(),
      brandId: "",
      modelId: "",
      color: "",
      serviceIds: new Set(),
      includesTemperedGlass: false,
    },
  ]);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState(0);

  /* ---- global brands (fetched once) ---- */
  const [brands, setBrands] = useState<RepairBrand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  /* ---- per-device models and services ---- */
  const [modelsMap, setModelsMap] = useState<Map<string, RepairModel[]>>(new Map());
  const [servicesMap, setServicesMap] = useState<Map<string, RepairService[]>>(new Map());
  const [modelsLoadingSet, setModelsLoadingSet] = useState<Set<string>>(new Set());
  const [servicesLoadingSet, setServicesLoadingSet] = useState<Set<string>>(new Set());

  /* ---- step 3: customer ---- */
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: "",
    email: "",
    phone: "",
    description: "",
  });

  /* ---- step 4: date ---- */
  const [preferredDate, setPreferredDate] = useState("");

  /* ---- active device shorthand ---- */
  const activeDevice = deviceBookings[activeDeviceIndex];
  const activeModels = activeDevice ? (modelsMap.get(activeDevice.id) ?? []) : [];
  const activeServices = activeDevice ? (servicesMap.get(activeDevice.id) ?? []) : [];
  const isActiveModelsLoading = activeDevice ? modelsLoadingSet.has(activeDevice.id) : false;
  const isActiveServicesLoading = activeDevice ? servicesLoadingSet.has(activeDevice.id) : false;

  /* ---- price calculations across all devices ---- */
  const totalServiceCount = deviceBookings.reduce((sum, b) => sum + b.serviceIds.size, 0);

  const subtotal = deviceBookings.reduce((sum, booking) => {
    const deviceServices = (servicesMap.get(booking.id) ?? []).filter((s) =>
      booking.serviceIds.has(s.id),
    );
    return (
      sum +
      deviceServices.reduce((s, svc) => s + svc.price_dkk, 0) +
      (booking.includesTemperedGlass ? TEMPERED_GLASS_PRICE : 0)
    );
  }, 0);

  const discountPercent = totalServiceCount >= 3 ? 15 : totalServiceCount >= 2 ? 10 : 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const totalPrice = subtotal - discountAmount;

  const availableDates = useMemo(() => getAvailableDates(12), []);

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  // Fetch brands once
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

  // Fetch models when a device's brandId changes
  const fetchModelsForDevice = useCallback(
    async (deviceId: string, brandId: string) => {
      if (!brandId) {
        setModelsMap((prev) => {
          const next = new Map(prev);
          next.delete(deviceId);
          return next;
        });
        return;
      }
      setModelsLoadingSet((prev) => new Set(prev).add(deviceId));
      const { data } = await supabase
        .from("repair_models")
        .select("*")
        .eq("brand_id", brandId)
        .eq("active", true)
        .order("sort_order");
      setModelsMap((prev) => {
        const next = new Map(prev);
        next.set(deviceId, (data as RepairModel[]) ?? []);
        return next;
      });
      setModelsLoadingSet((prev) => {
        const next = new Set(prev);
        next.delete(deviceId);
        return next;
      });
    },
    [supabase],
  );

  // Fetch services when a device's modelId changes
  const fetchServicesForDevice = useCallback(
    async (deviceId: string, modelId: string) => {
      if (!modelId) {
        setServicesMap((prev) => {
          const next = new Map(prev);
          next.delete(deviceId);
          return next;
        });
        return;
      }
      setServicesLoadingSet((prev) => new Set(prev).add(deviceId));
      const { data } = await supabase
        .from("repair_services")
        .select("*")
        .eq("model_id", modelId)
        .eq("active", true)
        .order("sort_order");
      setServicesMap((prev) => {
        const next = new Map(prev);
        next.set(deviceId, (data as RepairService[]) ?? []);
        return next;
      });
      setServicesLoadingSet((prev) => {
        const next = new Set(prev);
        next.delete(deviceId);
        return next;
      });
    },
    [supabase],
  );

  /* ---- pre-fill first device from URL params ---- */
  useEffect(() => {
    if (brands.length === 0) return;
    const brandSlug = searchParams.get("brand");
    if (!brandSlug) return;
    const matchedBrand = brands.find((b) => b.slug === brandSlug);
    if (matchedBrand && deviceBookings[0]?.brandId === "") {
      updateDeviceBrand(deviceBookings[0].id, matchedBrand.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brands, searchParams]);

  useEffect(() => {
    if (activeModels.length === 0) return;
    const modelSlug = searchParams.get("model");
    if (!modelSlug) return;
    const matchedModel = activeModels.find((m) => m.slug === modelSlug);
    if (matchedModel && activeDevice?.modelId === "") {
      updateDeviceModel(activeDevice.id, matchedModel.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModels, searchParams]);

  useEffect(() => {
    if (activeServices.length === 0) return;
    const serviceSlug = searchParams.get("service");
    if (!serviceSlug) return;
    const matchedService = activeServices.find((s) => s.slug === serviceSlug);
    if (matchedService && activeDevice?.serviceIds.size === 0) {
      setDeviceBookings((prev) =>
        prev.map((b) =>
          b.id === activeDevice.id
            ? { ...b, serviceIds: new Set([matchedService.id]) }
            : b,
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeServices, searchParams]);

  /* ---------------------------------------------------------------- */
  /*  Device mutation helpers                                          */
  /* ---------------------------------------------------------------- */

  const updateDeviceBrand = useCallback(
    (deviceId: string, brandId: string) => {
      setDeviceBookings((prev) =>
        prev.map((b) =>
          b.id === deviceId
            ? { ...b, brandId, modelId: "", serviceIds: new Set(), includesTemperedGlass: false }
            : b,
        ),
      );
      // Clear stale services when brand changes
      setServicesMap((prev) => {
        const next = new Map(prev);
        next.delete(deviceId);
        return next;
      });
      fetchModelsForDevice(deviceId, brandId);
    },
    [fetchModelsForDevice],
  );

  const updateDeviceModel = useCallback(
    (deviceId: string, modelId: string) => {
      setDeviceBookings((prev) =>
        prev.map((b) =>
          b.id === deviceId
            ? { ...b, modelId, serviceIds: new Set(), includesTemperedGlass: false }
            : b,
        ),
      );
      fetchServicesForDevice(deviceId, modelId);
    },
    [fetchServicesForDevice],
  );

  const updateDeviceColor = useCallback((deviceId: string, color: string) => {
    setDeviceBookings((prev) =>
      prev.map((b) => (b.id === deviceId ? { ...b, color } : b)),
    );
  }, []);

  const toggleServiceForDevice = useCallback((deviceId: string, serviceId: string) => {
    setDeviceBookings((prev) =>
      prev.map((b) => {
        if (b.id !== deviceId) return b;
        const next = new Set(b.serviceIds);
        if (next.has(serviceId)) next.delete(serviceId);
        else next.add(serviceId);
        return { ...b, serviceIds: next };
      }),
    );
  }, []);

  const toggleTemperedGlassForDevice = useCallback((deviceId: string) => {
    setDeviceBookings((prev) =>
      prev.map((b) =>
        b.id === deviceId
          ? { ...b, includesTemperedGlass: !b.includesTemperedGlass }
          : b,
      ),
    );
  }, []);

  const addDevice = useCallback(() => {
    const newDevice: DeviceBooking = {
      id: crypto.randomUUID(),
      brandId: "",
      modelId: "",
      color: "",
      serviceIds: new Set(),
      includesTemperedGlass: false,
    };
    setDeviceBookings((prev) => [...prev, newDevice]);
    setActiveDeviceIndex((prev) => prev + 1);
  }, []);

  const removeActiveDevice = useCallback(() => {
    setDeviceBookings((prev) => {
      if (prev.length <= 1) return prev;
      const removed = prev[activeDeviceIndex];
      // Clean up maps for removed device
      setModelsMap((m) => {
        const next = new Map(m);
        next.delete(removed.id);
        return next;
      });
      setServicesMap((s) => {
        const next = new Map(s);
        next.delete(removed.id);
        return next;
      });
      return prev.filter((_, i) => i !== activeDeviceIndex);
    });
    setActiveDeviceIndex((prev) => Math.max(0, prev - 1));
  }, [activeDeviceIndex]);

  /* ---------------------------------------------------------------- */
  /*  Other handlers                                                   */
  /* ---------------------------------------------------------------- */

  const handleCustomerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setCustomer((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    [],
  );

  const canGoNext = useMemo(() => {
    switch (step) {
      case 0:
        // All devices must have brand and model selected
        return deviceBookings.every((b) => !!b.brandId && !!b.modelId);
      case 1:
        // All devices must have at least one service selected
        return deviceBookings.every((b) => b.serviceIds.size > 0);
      case 2:
        return !!(
          customer.name.trim() &&
          customer.email.trim() &&
          customer.phone.trim() &&
          customer.description.trim()
        );
      case 3:
        return !!preferredDate;
      case 4:
        return true;
      default:
        return false;
    }
  }, [step, deviceBookings, customer, preferredDate]);

  const buildPayload = () => {
    const firstBooking = deviceBookings[0];
    const firstBrand = brands.find((b) => b.id === firstBooking?.brandId);
    const firstModels = firstBooking ? (modelsMap.get(firstBooking.id) ?? []) : [];
    const firstModel = firstModels.find((m) => m.id === firstBooking?.modelId);
    const firstServices = firstBooking
      ? (servicesMap.get(firstBooking.id) ?? []).filter((s) =>
          firstBooking.serviceIds.has(s.id),
        )
      : [];

    return {
      customer_name: customer.name.trim(),
      customer_email: customer.email.trim(),
      customer_phone: customer.phone.trim(),
      issue_description: customer.description.trim(),
      preferred_date: preferredDate,
      // Backward-compatible top-level fields from first device
      device_type: firstBrand?.name ?? "",
      device_model: firstModel?.name ?? "",
      service_type: firstServices.map((s) => s.name).join(", "),
      selected_services: firstServices.map((s) => ({
        id: s.id,
        name: s.name,
        price_dkk: s.price_dkk,
      })),
      includes_tempered_glass: firstBooking?.includesTemperedGlass ?? false,
      // All devices
      devices: deviceBookings.map((booking) => {
        const brand = brands.find((b) => b.id === booking.brandId);
        const models = modelsMap.get(booking.id) ?? [];
        const model = models.find((m) => m.id === booking.modelId);
        const deviceServices = (servicesMap.get(booking.id) ?? []).filter((s) =>
          booking.serviceIds.has(s.id),
        );
        return {
          device_type: brand?.name ?? "",
          device_model: model?.name ?? "",
          service_type: deviceServices.map((s) => s.name).join(", "),
          selected_services: deviceServices.map((s) => ({
            id: s.id,
            name: s.name,
            price_dkk: s.price_dkk,
          })),
          includes_tempered_glass: booking.includesTemperedGlass,
        };
      }),
      total_price_dkk: totalPrice,
      discount_percent: discountPercent,
    };
  };

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
            Ønsket aflevering:{" "}
            <span className="font-medium text-charcoal">{formatDateDanish(preferredDate)}</span>
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5 text-green-eco"
          >
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
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          {submitResult.error}
        </div>
      )}

      {/* ---- Step 1: Enhed ---- */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">Vælg din enhed</h2>
            <p className="mt-1 text-sm text-gray">
              Vælg mærke og model for at se tilgængelige reparationer. Du kan tilføje flere enheder.
            </p>
          </div>

          <DeviceTabs
            deviceBookings={deviceBookings}
            activeDeviceIndex={activeDeviceIndex}
            brands={brands}
            modelsMap={modelsMap}
            onSelect={setActiveDeviceIndex}
            onAdd={addDevice}
            onRemove={removeActiveDevice}
          />

          {activeDevice && (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="brand" className={labelStyles}>
                  Mærke
                </label>
                {brandsLoading ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-gray">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Indlæser mærker...
                  </div>
                ) : (
                  <select
                    id="brand"
                    value={activeDevice.brandId}
                    onChange={(e) => updateDeviceBrand(activeDevice.id, e.target.value)}
                    className={inputStyles}
                  >
                    <option value="">Vælg mærke...</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="model" className={labelStyles}>
                  Model
                </label>
                {isActiveModelsLoading ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-gray">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Indlæser modeller...
                  </div>
                ) : (
                  <select
                    id="model"
                    value={activeDevice.modelId}
                    onChange={(e) => updateDeviceModel(activeDevice.id, e.target.value)}
                    disabled={!activeDevice.brandId}
                    className={inputStyles}
                  >
                    <option value="">
                      {activeDevice.brandId ? "Vælg model..." : "Vælg mærke først..."}
                    </option>
                    {activeModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Color selector */}
              {activeDevice.modelId && (
                <div className="flex flex-col gap-3">
                  <label className={labelStyles}>
                    Farve <span className="font-normal text-gray">(valgfrit)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DEVICE_COLORS.map((c) => {
                      const isSelected = activeDevice.color === c.name;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          title={c.name}
                          onClick={() => updateDeviceColor(activeDevice.id, isSelected ? "" : c.name)}
                          className={`flex items-center gap-2 rounded-full border-2 py-1.5 pl-1.5 pr-3 text-xs font-semibold transition-all ${
                            isSelected
                              ? "border-charcoal bg-charcoal text-white"
                              : "border-soft-grey bg-white text-charcoal hover:border-charcoal/30"
                          }`}
                        >
                          <span
                            className="h-5 w-5 shrink-0 rounded-full"
                            style={{
                              background: c.hex,
                              border: c.border ? "1px solid #d1d5db" : undefined,
                              boxShadow: isSelected ? "0 0 0 2px white, 0 0 0 3px #1c1c1e" : undefined,
                            }}
                          />
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Incomplete devices warning */}
              {deviceBookings.length > 1 && !canGoNext && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-amber-500">
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Alle enheder skal have valgt mærke og model.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ---- Step 2: Reparation ---- */}
      {step === 1 && (
        <div className="md:grid md:grid-cols-[1fr_280px] md:gap-8 md:items-start">
        {/* Left column: service list */}
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">Tilføj reparationer til booking</h2>
            <p className="mt-1 text-sm text-gray">
              Vælg de reparationer du ønsker — alt er inkl. moms og livstidsgaranti. Flere reparationer = større rabat!
            </p>
          </div>

          <DeviceTabs
            deviceBookings={deviceBookings}
            activeDeviceIndex={activeDeviceIndex}
            brands={brands}
            modelsMap={modelsMap}
            onSelect={setActiveDeviceIndex}
            onAdd={addDevice}
            onRemove={removeActiveDevice}
          />

          {activeDevice && (
            <>
              {isActiveServicesLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-gray">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Indlæser reparationer...
                </div>
              ) : activeServices.length === 0 ? (
                <p className="py-4 text-sm text-gray">
                  Ingen reparationer tilgængelige for denne model.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray/70">
                    Klik på en reparation for at føje den til din booking
                  </p>
                  {activeServices.map((s) => {
                    const isChecked = activeDevice.serviceIds.has(s.id);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => toggleServiceForDevice(activeDevice.id, s.id)}
                        className={`group flex w-full cursor-pointer items-center justify-between rounded-xl border-2 p-4 text-left transition-all duration-150 ${
                          isChecked
                            ? "border-green-eco bg-green-eco/5 shadow-sm"
                            : "border-soft-grey hover:border-green-eco/40 hover:bg-green-eco/[0.03] hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                              isChecked
                                ? "border-green-eco bg-green-eco text-white"
                                : "border-soft-grey group-hover:border-green-eco/50"
                            }`}
                          >
                            {isChecked && (
                              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                                <path
                                  fillRule="evenodd"
                                  d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-charcoal">{s.name}</span>
                            {s.estimated_minutes && (
                              <span className="ml-2 text-xs text-gray">
                                ca. {s.estimated_minutes} min
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-display font-bold ${isChecked ? "text-green-eco" : "text-charcoal"}`}>
                            {s.price_dkk} DKK
                          </span>
                          {isChecked ? (
                            <span className="flex items-center gap-1 rounded-full bg-green-eco px-2.5 py-1 text-xs font-bold text-white">
                              <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5">
                                <path fillRule="evenodd" d="M10.28 2.28a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 0 1 1.06-1.06L4.25 7.19l4.97-4.91a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                              </svg>
                              Tilføjet
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full border border-green-eco/30 px-2.5 py-1 text-xs font-bold text-green-eco opacity-0 transition-opacity group-hover:opacity-100">
                              <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5">
                                <path d="M6.75 2.75a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" />
                              </svg>
                              Tilføj
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tempered glass upsell */}
              <div
                className={`rounded-xl border-2 p-4 transition-all ${
                  activeDevice.includesTemperedGlass
                    ? "border-green-eco bg-green-eco/5"
                    : "border-dashed border-green-eco/30 bg-green-eco/[0.02]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleTemperedGlassForDevice(activeDevice.id)}
                  className="flex w-full cursor-pointer items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${
                        activeDevice.includesTemperedGlass
                          ? "border-green-eco bg-green-eco text-white"
                          : "border-green-eco/30"
                      }`}
                    >
                      {activeDevice.includesTemperedGlass && (
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                          <path
                            fillRule="evenodd"
                            d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-charcoal">Tilføj panserglas</span>
                      <p className="text-xs text-gray">Beskyt din skærm med hærdet glas</p>
                    </div>
                  </div>
                  <span className="font-display font-bold text-green-eco">
                    {TEMPERED_GLASS_PRICE} DKK
                  </span>
                </button>
              </div>
            </>
          )}

          {/* Discount badge — based on total across all devices */}
          {discountPercent > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-green-eco/10 p-4">
              <span className="rounded-full bg-green-eco px-3 py-1.5 text-xs font-bold text-white">
                -{discountPercent}%
              </span>
              <span className="text-sm font-medium text-charcoal">
                Rabat ved {totalServiceCount} reparationer — du sparer {discountAmount} DKK!
              </span>
            </div>
          )}

          {/* Running total — all devices */}
          {deviceBookings.some((b) => b.serviceIds.size > 0) && (
            <div className="mt-6 rounded-xl bg-charcoal/[0.03] p-4 space-y-3">
              {deviceBookings.map((booking) => {
                const brand = brands.find((b) => b.id === booking.brandId);
                const models = modelsMap.get(booking.id) ?? [];
                const model = models.find((m) => m.id === booking.modelId);
                const deviceServices = (servicesMap.get(booking.id) ?? []).filter((s) =>
                  booking.serviceIds.has(s.id),
                );
                if (deviceServices.length === 0 && !booking.includesTemperedGlass) return null;
                return (
                  <div key={booking.id}>
                    <p className="text-xs font-bold text-green-eco">
                      {brand?.name} {model?.name}
                    </p>
                    {deviceServices.map((s) => (
                      <div key={s.id} className="flex justify-between text-sm">
                        <span className="text-charcoal">{s.name}</span>
                        <span className="font-bold text-charcoal">{s.price_dkk} DKK</span>
                      </div>
                    ))}
                    {booking.includesTemperedGlass && (
                      <div className="flex justify-between text-sm">
                        <span className="text-charcoal">Panserglas</span>
                        <span className="font-bold text-charcoal">99 DKK</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Total */}
              <div className="border-t border-soft-grey pt-3">
                {discountPercent > 0 && (
                  <div className="flex justify-between text-sm text-gray">
                    <span>Subtotal</span>
                    <span className="line-through">{subtotal} DKK</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-charcoal">
                  <span>Total</span>
                  <span className="text-green-eco">{totalPrice} DKK</span>
                </div>
                <p className="mt-1 text-xs text-gray">Inkl. moms, reservedele og livstidsgaranti</p>
              </div>
            </div>
          )}

          {/* Incomplete devices warning */}
          {deviceBookings.length > 1 && !canGoNext && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-amber-500">
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              Alle enheder skal have mindst én reparation valgt.
            </div>
          )}
        </div>{/* end left column */}

        {/* Right column: sticky Oversigt sidebar (desktop only) */}
        <div className="hidden md:block">
          <div className="sticky top-4 overflow-hidden rounded-2xl border border-charcoal/10 bg-charcoal text-white shadow-lg">
            {/* Header */}
            <div className="bg-green-eco px-5 py-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-white">
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-bold text-white">Du booker her</span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Device(s) */}
              {deviceBookings.map((booking) => {
                const brand = brands.find((b) => b.id === booking.brandId);
                const models = modelsMap.get(booking.id) ?? [];
                const model = models.find((m) => m.id === booking.modelId);
                const deviceServices = (servicesMap.get(booking.id) ?? []).filter((s) =>
                  booking.serviceIds.has(s.id),
                );
                const colorDot = DEVICE_COLORS.find((c) => c.name === booking.color);
                return (
                  <div key={booking.id} className="space-y-2">
                    {/* Device label */}
                    <div className="flex items-center gap-2">
                      {colorDot && (
                        <span
                          className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                          style={{ background: colorDot.hex }}
                        />
                      )}
                      <p className="text-xs font-bold text-white/80 uppercase tracking-wider">
                        {brand?.name ?? "—"} {model?.name ?? ""}
                        {booking.color ? ` · ${booking.color}` : ""}
                      </p>
                    </div>
                    {/* Services */}
                    {deviceServices.length === 0 && !booking.includesTemperedGlass ? (
                      <p className="text-xs text-white/40 italic">Ingen valgt endnu</p>
                    ) : (
                      <div className="space-y-1">
                        {deviceServices.map((s) => (
                          <div key={s.id} className="flex justify-between text-sm">
                            <span className="text-white/80">{s.name}</span>
                            <span className="font-bold text-white">{s.price_dkk} kr</span>
                          </div>
                        ))}
                        {booking.includesTemperedGlass && (
                          <div className="flex justify-between text-sm">
                            <span className="text-white/80">Panserglas</span>
                            <span className="font-bold text-white">99 kr</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Divider */}
              <div className="border-t border-white/10" />

              {/* Discount */}
              {discountPercent > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="rounded-full bg-green-eco/20 px-2 py-0.5 font-bold text-green-eco">
                    -{discountPercent}% rabat
                  </span>
                  <span className="text-white/50 line-through">{subtotal} kr</span>
                </div>
              )}

              {/* Total */}
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-white/60">Total</span>
                <span className="font-display text-2xl font-bold text-white">
                  {totalPrice > 0 ? `${totalPrice} kr` : "—"}
                </span>
              </div>
              {totalPrice > 0 && (
                <p className="text-[11px] text-white/40">Inkl. moms & livstidsgaranti</p>
              )}

              {/* CTA */}
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-eco py-3 text-sm font-bold text-white transition-all hover:bg-green-eco/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Fortsæt
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Trust */}
              <div className="flex items-center gap-1.5 justify-center">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-green-eco">
                  <path d="M8 1l5.5 2.3v3.7c0 3.2-2.3 5.9-5.5 7.3C2.8 12.9.5 10.2.5 7V3.3L8 1z" />
                </svg>
                <span className="text-[11px] text-white/50">Livstidsgaranti på alle reparationer</span>
              </div>
            </div>
          </div>
        </div>

        </div>
      )}

      {/* ---- Step 3: Detaljer ---- */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">Dine oplysninger</h2>
            <p className="mt-1 text-sm text-gray">
              Vi bruger disse oplysninger til at kontakte dig om reparationen.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className={labelStyles}>
                Fulde navn
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Anders Andersen"
                value={customer.name}
                onChange={handleCustomerChange}
                className={inputStyles}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className={labelStyles}>
                Telefon
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
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className={labelStyles}>
              Email
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
            <label htmlFor="description" className={labelStyles}>
              Beskriv problemet
            </label>
            <textarea
              id="description"
              name="description"
              required
              placeholder="Beskriv hvad der er galt med dine enheder — hvad skete der, og hvornår startede det?"
              rows={4}
              value={customer.description}
              onChange={handleCustomerChange}
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
              Hvornår vil du aflevere dine enheder?
            </h2>
            <p className="mt-1 text-sm text-gray">
              Vælg en dato hvor du kan aflevere dine enheder i butikken.
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
                  <p
                    className={`text-sm font-bold ${isSelected ? "text-green-eco" : "text-charcoal"}`}
                  >
                    {new Date(date + "T12:00:00").toLocaleDateString("da-DK", {
                      weekday: "long",
                    })}
                  </p>
                  <p className="mt-0.5 text-xs text-gray">
                    {new Date(date + "T12:00:00").toLocaleDateString("da-DK", {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Parts availability note */}
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 shrink-0 text-amber-500"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-amber-800">
              <span className="font-bold">Bemærk:</span> Nogle reservedele har vi ikke på lager,
              men vi har dag-til-dag levering og kan have dem klar til næste dag. Vi kontakter dig
              hvis din valgte dato skal justeres.
            </p>
          </div>
        </div>
      )}

      {/* ---- Step 5: Bekræft & Betal ---- */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">Bekræft din booking</h2>
            <p className="mt-1 text-sm text-gray">Gennemgå dine valg og vælg betalingsmetode.</p>
          </div>

          {/* All devices and their services */}
          <div className="rounded-xl bg-charcoal/[0.03] p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray">
              {deviceBookings.length === 1 ? "Enhed" : "Enheder"}
            </p>
            {deviceBookings.map((booking, i) => {
              const brand = brands.find((b) => b.id === booking.brandId);
              const models = modelsMap.get(booking.id) ?? [];
              const model = models.find((m) => m.id === booking.modelId);
              const deviceServices = (servicesMap.get(booking.id) ?? []).filter((s) =>
                booking.serviceIds.has(s.id),
              );
              return (
                <div key={booking.id} className={i > 0 ? "border-t border-soft-grey pt-4" : ""}>
                  <p className="font-display text-base font-bold text-charcoal">
                    {deviceBookings.length > 1 && (
                      <span className="mr-2 text-xs font-bold text-green-eco uppercase tracking-wide">
                        Enhed {i + 1}
                      </span>
                    )}
                    {brand?.name} {model?.name}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {deviceServices.map((s) => (
                      <li key={s.id} className="flex justify-between text-sm">
                        <span className="text-charcoal">{s.name}</span>
                        <span className="font-bold text-charcoal">{s.price_dkk} DKK</span>
                      </li>
                    ))}
                    {booking.includesTemperedGlass && (
                      <li className="flex justify-between text-sm">
                        <span className="text-charcoal">Panserglas</span>
                        <span className="font-bold text-charcoal">{TEMPERED_GLASS_PRICE} DKK</span>
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}

            <div className="border-t border-soft-grey pt-3">
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
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray">
              Kontaktoplysninger
            </p>
            <dl className="space-y-2 text-sm">
              {(
                [
                  ["Navn", customer.name],
                  ["Email", customer.email],
                  ["Telefon", customer.phone],
                ] as [string, string][]
              ).map(([label, value]) => (
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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-6 w-6 shrink-0 text-green-eco"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <div>
              <p className="text-sm font-bold text-charcoal">Livstidsgaranti inkluderet</p>
              <p className="text-xs text-gray">
                Alle reparationer dækkes af livstidsgaranti på arbejde og reservedele.
              </p>
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
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
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
                <path
                  fillRule="evenodd"
                  d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z"
                  clipRule="evenodd"
                />
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
