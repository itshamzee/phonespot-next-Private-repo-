"use client";

import { useState, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  price_dkk: number;
  estimated_minutes: number | null;
  description: string | null;
  warranty_info: string | null;
  includes: string | null;
  quality_tier: "standard" | "premium" | "original" | null;
  service_category: string | null;
  info_note: string | null;
}

interface RepairCartProps {
  services: ServiceItem[];
  brandSlug: string;
  brandName: string;
  modelSlug: string;
  modelName: string;
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                           */
/* ------------------------------------------------------------------ */

function getAvailableDates(count: number): string[] {
  const dates: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (dates.length < count) {
    const day = d.getDay();
    if (day >= 1 && day <= 6) dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/* ------------------------------------------------------------------ */
/*  Service icon map                                                    */
/* ------------------------------------------------------------------ */

const SERVICE_ICONS: Record<string, string> = {
  "skaermskift-original": "screen",
  "skaermskift-oem": "screen",
  "skaermskift": "screen",
  "batteriskift": "battery",
  "opladerstik": "charging",
  "bagkamera": "camera",
  "frontkamera": "camera",
  "bagglas": "glass",
  "hoejttaler": "speaker",
  "mikrofon": "mic",
  "power-knap": "button",
  "vibrator": "vibrator",
  "diagnostik": "diagnostic",
  "vandskade": "water",
  "software-fejl": "software",
  "tastatur": "keyboard",
  "topcase": "topcase",
  "blaeser": "fan",
  "termisk-pasta": "thermal",
  "hdmi-port": "hdmi",
  "controller-reparation": "controller",
};

function ServiceIcon({ slug }: { slug: string }) {
  const type = SERVICE_ICONS[slug] ?? "wrench";

  const paths: Record<string, React.ReactNode> = {
    screen: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="5" y1="18" x2="19" y2="18" />
      </>
    ),
    battery: (
      <>
        <rect x="2" y="7" width="18" height="10" rx="2" />
        <path d="M22 11v2" />
      </>
    ),
    charging: (
      <>
        <path d="M12 2v6M12 16v6" />
        <rect x="6" y="8" width="12" height="8" rx="2" />
      </>
    ),
    camera: (
      <>
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    glass: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M5 6l14 12M9 2l10 16" strokeOpacity="0.4" />
      </>
    ),
    speaker: (
      <>
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M15.54 8.46a5 5 0 010 7.07" />
      </>
    ),
    mic: (
      <>
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
      </>
    ),
    button: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
      </>
    ),
    diagnostic: (
      <>
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" />
        <path d="M14 9l-2 2 4 4" />
      </>
    ),
    water: (
      <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
    ),
    keyboard: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 16h8" />
      </>
    ),
    hdmi: (
      <>
        <path d="M4 7h16v10H4z" />
        <path d="M7 17v3M17 17v3M2 7l2-3h16l2 3" />
      </>
    ),
    fan: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 9c0-3-2-6-6-6 0 4 2 6 6 6zM15 12c3 0 6-2 6-6-4 0-6 2-6 6zM12 15c0 3 2 6 6 6 0-4-2-6-6-6zM9 12c-3 0-6 2-6 6 4 0 6-2 6-6z" />
      </>
    ),
    thermal: (
      <path d="M14 4v10.54a4 4 0 11-4 0V4a2 2 0 014 0z" />
    ),
    vibrator: (
      <>
        <path d="M5 8l2-2 10 10-2 2z" />
        <path d="M19 4l1 1-2 2-1-1zM3 20l1 1 2-2-1-1z" strokeOpacity="0.5" />
      </>
    ),
    software: (
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    ),
    topcase: (
      <>
        <path d="M4 5h16a1 1 0 011 1v10H3V6a1 1 0 011-1z" />
        <path d="M2 17h20l-1 3H3l-1-3z" />
        <rect x="8" y="9" width="8" height="4" rx="1" strokeOpacity="0.4" />
      </>
    ),
    controller: (
      <>
        <path d="M6 11h4M8 9v4M15 12h.01M18 10h.01" />
        <rect x="2" y="6" width="20" height="12" rx="4" />
      </>
    ),
    wrench: (
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    ),
  };

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-eco/10 text-green-eco">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        {paths[type] ?? paths.wrench}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

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

export function RepairCart({
  services,
  brandName,
  modelName,
}: RepairCartProps) {
  /* State */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [includesTemperedGlass, setIncludesTemperedGlass] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState("");
  const [showExclMoms, setShowExclMoms] = useState(false);

  /* Booking form state */
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    description: "",
  });
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    ticketId?: string;
    error?: string;
  } | null>(null);

  /* Price formatter respecting moms toggle (display only — actual payment always inkl. moms) */
  const fmtPrice = (dkk: number) => showExclMoms ? Math.round(dkk * 0.8) : dkk;

  /* Derived values */
  const selectedServices = services.filter((s) => selectedIds.has(s.id));

  // Group services by category for accordion display
  const grouped = useMemo(() => {
    const map = new Map<string, ServiceItem[]>();
    for (const s of services) {
      const key = s.service_category || s.name;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [services]);
  const subtotal =
    selectedServices.reduce((sum, s) => sum + s.price_dkk, 0) +
    (includesTemperedGlass ? 99 : 0);
  const discountPercent =
    selectedIds.size >= 3 ? 15 : selectedIds.size >= 2 ? 10 : 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const totalPrice = subtotal - discountAmount;
  const canSubmit = !!(
    customer.name.trim() &&
    customer.email.trim() &&
    customer.phone.trim() &&
    deliveryMethod &&
    preferredDate &&
    preferredTime
  );

  /* Handlers */
  function toggleService(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // If this service belongs to a grouped category, deselect others in that group
        const service = services.find(s => s.id === id);
        if (service) {
          const cat = service.service_category || service.name;
          const siblings = services.filter(s => (s.service_category || s.name) === cat && s.id !== id);
          for (const sib of siblings) next.delete(sib.id);
        }
        next.add(id);
      }
      return next;
    });
  }

  const buildPayload = () => ({
    customer_name: customer.name.trim(),
    customer_email: customer.email.trim(),
    customer_phone: customer.phone.trim(),
    device_type: brandName,
    device_model: modelName,
    device_color: selectedColor || undefined,
    issue_description: customer.description.trim() || `Booking via ${modelName} prisside`,
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
    preferred_time: preferredTime,
    delivery_method: deliveryMethod,
  });

  async function handleSubmitNoPay() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitResult({ success: false, error: data.error ?? "Noget gik galt." });
      } else {
        setSubmitResult({ success: true, ticketId: data.ticketId });
      }
    } catch {
      setSubmitResult({ success: false, error: "Netværksfejl. Prøv igen." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitAndPay() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/repairs/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitResult({ success: false, error: data.error ?? "Noget gik galt." });
        setIsSubmitting(false);
      } else if (data.invoiceUrl || data.url) {
        window.location.href = data.invoiceUrl || data.url;
      } else {
        setSubmitResult({ success: false, error: "Kunne ikke starte betaling." });
        setIsSubmitting(false);
      }
    } catch {
      setSubmitResult({ success: false, error: "Netværksfejl. Prøv igen." });
      setIsSubmitting(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Success screen                                                   */
  /* ---------------------------------------------------------------- */

  if (submitResult?.success) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-eco/10">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-8 w-8 text-green-eco"
          >
            <path d="M9 12l2 2 4-4M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-charcoal">
          Tak for din booking!
        </h2>
        <p className="mt-3 text-sm text-gray">
          Vi har modtaget din reparationsanmodning og sender en bekræftelse til{" "}
          <span className="font-semibold text-charcoal">{customer.email}</span>.
        </p>
        {submitResult.ticketId && (
          <p className="mt-2 text-xs text-gray">
            Sags-ID:{" "}
            <span className="font-mono font-semibold text-charcoal">
              {submitResult.ticketId.slice(0, 8).toUpperCase()}
            </span>
          </p>
        )}
        <div className="mt-6 rounded-xl border border-soft-grey bg-white p-4 text-left text-sm">
          <p className="font-bold text-charcoal">{modelName}</p>
          {selectedServices.map((s) => (
            <div key={s.id} className="mt-1 flex justify-between text-gray">
              <span>{s.name}</span>
              <span>{fmtPrice(s.price_dkk)} DKK</span>
            </div>
          ))}
          {includesTemperedGlass && (
            <div className="mt-1 flex justify-between text-gray">
              <span>Panserglas</span>
              <span>99 DKK</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-soft-grey pt-2 font-bold">
            <span>Total</span>
            <span className="text-green-eco">{totalPrice} DKK</span>
          </div>
        </div>
        <p className="mt-6 text-xs text-gray">
          Husk at møde op til dit valgte tidspunkt. Ses vi!
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Main layout                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* ============================================================ */}
        {/* LEFT COLUMN — service list                                   */}
        {/* ============================================================ */}
        <div>
          {/* Color selector */}
          <div className="mb-6">
            <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-[2px] text-charcoal/50">
              Vælg farve
            </h3>
            <div className="flex flex-wrap gap-2">
              {DEVICE_COLORS.map((c) => {
                const isSelected = selectedColor === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    onClick={() => setSelectedColor(isSelected ? "" : c.name)}
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

          {/* Section header with moms toggle */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold uppercase tracking-[2px] text-charcoal/50">
              Vælg reparation
            </h3>
            <button
              type="button"
              onClick={() => setShowExclMoms((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-soft-grey bg-white px-3 py-1.5 text-xs font-semibold text-charcoal transition hover:border-charcoal/30"
            >
              <span className={showExclMoms ? "text-gray" : "font-bold text-charcoal"}>Inkl. moms</span>
              {/* Toggle track */}
              <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${showExclMoms ? "bg-green-eco" : "bg-soft-grey"}`}>
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${showExclMoms ? "translate-x-4" : "translate-x-0.5"}`} />
              </span>
              <span className={showExclMoms ? "font-bold text-charcoal" : "text-gray"}>Eksl. moms</span>
            </button>
          </div>

          {/* Services — 2-column card grid, 1 card per category */}
          {services.length === 0 && (
            <div className="rounded-2xl border border-soft-grey bg-white p-10 text-center text-gray">
              Ingen reparationer tilgængelige for denne model endnu.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {grouped.map(([category, items]) => {
              const selectedInGroup = items.filter(s => selectedIds.has(s.id));
              const hasSelection = selectedInGroup.length > 0;
              const isOpen = expandedCategory === category;
              const firstSlug = items[0].slug;
              const cheapest = Math.min(...items.map(s => s.price_dkk));
              const hasTiers = items.length > 1;

              /* ---- Single service card (no tiers) ---- */
              if (!hasTiers) {
                const service = items[0];
                const isSelected = selectedIds.has(service.id);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`group flex flex-col rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
                      isSelected
                        ? "border-green-eco bg-green-eco/[0.03] shadow-md shadow-green-eco/10"
                        : "border-soft-grey bg-white hover:border-green-eco hover:shadow-lg hover:shadow-green-eco/10 hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ServiceIcon slug={service.slug} />
                      <div className="flex-1">
                        <h3 className="font-display text-base font-bold text-charcoal">{category}</h3>
                        <p className="text-xs text-gray">ca. {service.estimated_minutes ?? 30} min</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg font-bold text-charcoal">{fmtPrice(service.price_dkk)} kr.</p>
                        {isSelected ? (
                          <span className="text-xs font-bold text-green-eco">Tilføjet ✓</span>
                        ) : (
                          <span className="text-xs font-bold text-green-eco opacity-0 transition-opacity duration-200 group-hover:opacity-100">+ Tilføj</span>
                        )}
                      </div>
                    </div>
                    {service.info_note && (
                      <p className="mt-3 text-sm leading-relaxed text-gray">{service.info_note}</p>
                    )}
                  </button>
                );
              }

              /* ---- Multi-tier category card (like TeleRepair) ---- */
              return (
                <div
                  key={category}
                  className={`flex flex-col rounded-2xl border-2 bg-white transition-all ${
                    isOpen
                      ? "border-green-eco shadow-md shadow-green-eco/10"
                      : hasSelection
                        ? "border-green-eco/50"
                        : "border-soft-grey hover:border-green-eco hover:shadow-lg hover:shadow-green-eco/10 hover:-translate-y-0.5"
                  }`}
                >
                  {/* Header — always visible */}
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isOpen ? null : category)}
                    className="flex items-center gap-3 p-5 text-left"
                  >
                    <ServiceIcon slug={firstSlug} />
                    <div className="flex-1">
                      <h3 className="font-display text-base font-bold text-charcoal">{category}</h3>
                      <p className="text-xs text-gray">
                        {items[0].estimated_minutes ?? 30} MINUTTER
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-green-eco px-2 py-0.5 text-[10px] font-bold text-white">
                        {hasSelection ? `${fmtPrice(selectedInGroup[0].price_dkk)}` : `priser fra`}
                      </span>
                      <span className="font-display text-xl font-bold text-charcoal">
                        {hasSelection ? "" : `${fmtPrice(cheapest)}`}
                      </span>
                      {hasSelection && (
                        <span className="font-display text-xl font-bold text-charcoal">
                          {fmtPrice(selectedInGroup[0].price_dkk)}
                        </span>
                      )}
                      <span className="text-sm font-bold text-charcoal/60">kr</span>
                    </div>
                  </button>

                  {/* Description — always visible */}
                  <div className="px-5 pb-4 -mt-1">
                    <p className="text-sm leading-relaxed text-gray">
                      {items[0].info_note || `Vælg mellem ${items.length} forskellige kvaliteter til din ${category.toLowerCase()}.`}
                    </p>
                  </div>

                  {/* Expanded quality list — clean like TeleRepair */}
                  {isOpen && (
                    <div className="border-t border-soft-grey/40">
                      {items.map((service, i) => {
                        const isSelected = selectedIds.has(service.id);
                        const tierLabel = service.quality_tier === "original" ? "Original" : service.quality_tier === "premium" ? "Premium+" : service.quality_tier === "standard" ? "Budget" : service.name;

                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => toggleService(service.id)}
                            className={`group flex w-full flex-col px-5 py-4 text-left transition-all duration-150 ${
                              isSelected
                                ? "bg-green-eco/[0.06]"
                                : "hover:bg-green-eco/[0.04]"
                            } ${i < items.length - 1 ? "border-b border-soft-grey/30" : ""}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-bold text-charcoal">{tierLabel}</span>
                                <span className="ml-2 text-xs text-gray">{service.estimated_minutes ?? 30} MINUTTER</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {!isSelected && <span className="text-xs font-bold text-green-eco opacity-0 transition-opacity duration-150 group-hover:opacity-100">+ Tilføj</span>}
                                <span className="font-display text-lg font-bold text-charcoal">{fmtPrice(service.price_dkk)}<span className="text-sm font-bold text-charcoal/60">kr</span></span>
                              </div>
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-gray">
                              {service.info_note || (service.quality_tier === "original"
                                ? "Original reservedel, professionelt renoveret og testet."
                                : service.quality_tier === "premium"
                                  ? "Top kvalitet — funktionalitet og holdbarhed til en konkurrencedygtig pris."
                                  : "Pålidelig kvalitet til en overkommelig pris — perfekt til et budgetvalg."
                              )}
                            </p>
                            {isSelected && (
                              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-green-eco">
                                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                                </svg>
                                Tilføjet til booking
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Multi-service discount hint */}
          {selectedIds.size === 0 && services.length > 1 && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-dashed border-green-eco/30 bg-green-eco/[0.03] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                  <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-charcoal">Spar op til 15% ved flere reparationer</p>
                <p className="text-xs text-gray">10% rabat ved 2 reparationer · 15% rabat ved 3+</p>
              </div>
            </div>
          )}

          {/* Upsell banner when nothing selected */}
          {selectedIds.size === 0 && (
            <div className="mt-4 flex items-center gap-4 rounded-xl border-2 border-dashed border-green-eco/30 bg-green-eco/[0.03] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-charcoal">Tilføj panserglas for kun 99 DKK</p>
                <p className="text-xs text-gray">Beskyt din nye skærm — tilføjes ved booking.</p>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN — sticky sidebar                                */}
        {/* ============================================================ */}
        <div className="hidden lg:block">
          {/* Empty state sidebar */}
          {selectedIds.size === 0 && !showBookingForm && (
            <div className="sticky top-24 rounded-2xl border border-soft-grey bg-white p-6">
              <h3 className="font-display text-base font-bold text-charcoal">
                Oversigt
              </h3>
              <p className="mt-1 text-xs text-gray">{brandName} {modelName}{selectedColor ? ` · ${selectedColor}` : ""}</p>
              <p className="mt-3 text-sm text-gray">
                Vælg en eller flere reparationer fra listen for at se pris og booke.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  { title: "Livstidsgaranti", desc: "På alle reparationer" },
                  { title: "Hurtig service", desc: "90% klar på 30 minutter" },
                  { title: "Fast pris", desc: "Ingen overraskelser" },
                ].map((item) => (
                  <div key={item.title} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-charcoal">{item.title}</p>
                      <p className="text-xs text-gray">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cart sidebar — services selected */}
          {selectedIds.size > 0 && !showBookingForm && (
            <div className="sticky top-24 rounded-2xl border border-soft-grey bg-white p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-charcoal">
                Oversigt
              </h3>
              <p className="mt-1 text-xs text-gray">{brandName} {modelName}{selectedColor ? ` · ${selectedColor}` : ""}</p>

              <div className="mt-4 space-y-2">
                {selectedServices.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-charcoal">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-charcoal">
                        {fmtPrice(s.price_dkk)} DKK
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleService(s.id)}
                        aria-label={`Fjern ${s.name}`}
                        className="text-gray transition-colors hover:text-red-500"
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                        >
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tempered glass upsell */}
              <button
                type="button"
                onClick={() => setIncludesTemperedGlass((v) => !v)}
                className={`mt-4 flex w-full items-center justify-between rounded-xl border-2 p-3 text-left transition-all ${
                  includesTemperedGlass
                    ? "border-green-eco bg-green-eco/5"
                    : "border-dashed border-green-eco/30 hover:border-green-eco/50"
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-charcoal">Panserglas</p>
                  <p className="text-[11px] text-gray">Beskyt din nye skærm</p>
                </div>
                <span className="text-xs font-bold text-green-eco">+99 DKK</span>
              </button>

              {/* Discount badge */}
              {discountPercent > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-eco/10 px-3 py-2">
                  <span className="rounded-full bg-green-eco px-2 py-0.5 text-[10px] font-bold text-white">
                    -{discountPercent}%
                  </span>
                  <span className="text-xs font-medium text-charcoal">
                    Du sparer {discountAmount} DKK
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="mt-4 border-t border-soft-grey pt-4">
                {discountPercent > 0 && (
                  <div className="flex justify-between text-sm text-gray">
                    <span>Subtotal</span>
                    <span className="line-through">{subtotal} DKK</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-charcoal">Total</span>
                  <span className="text-green-eco">{totalPrice} DKK</span>
                </div>
                <p className="mt-1 text-[11px] text-gray">
                  Inkl. moms, reservedele og livstidsgaranti
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowBookingForm(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-green-eco py-3.5 text-sm font-bold text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-green-eco/25"
              >
                Gå til booking
              </button>

              {/* Klarna delbetaling */}
              <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-soft-grey bg-cream/50 p-3">
                <svg viewBox="0 0 24 12" className="h-4 w-auto" aria-hidden="true">
                  <rect width="24" height="12" rx="2" fill="#FFB3C7" />
                  <text x="12" y="9" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#17120F">K.</text>
                </svg>
                <span className="text-xs text-charcoal">
                  Delbetal med <span className="font-bold">Klarna</span> fra {Math.round(totalPrice / 3)} kr./md.
                </span>
              </div>
            </div>
          )}

          {/* Booking form */}
          {showBookingForm && (
            <BookingForm
              modelName={modelName}
              selectedServices={selectedServices}
              includesTemperedGlass={includesTemperedGlass}
              discountPercent={discountPercent}
              discountAmount={discountAmount}
              subtotal={subtotal}
              totalPrice={totalPrice}
              customer={customer}
              setCustomer={setCustomer}
              preferredDate={preferredDate}
              setPreferredDate={setPreferredDate}
              preferredTime={preferredTime}
              setPreferredTime={setPreferredTime}
              deliveryMethod={deliveryMethod}
              setDeliveryMethod={setDeliveryMethod}
              canSubmit={canSubmit}
              isSubmitting={isSubmitting}
              submitResult={submitResult}
              onBack={() => setShowBookingForm(false)}
              onSubmitNoPay={handleSubmitNoPay}
              onSubmitAndPay={handleSubmitAndPay}
              showExclMoms={showExclMoms}
            />
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE sticky bottom bar                                        */}
      {/* ============================================================== */}
      {selectedIds.size > 0 && !showBookingForm && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-soft-grey bg-white p-4 shadow-lg lg:hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-charcoal">
                {selectedIds.size} reparation{selectedIds.size > 1 ? "er" : ""}
              </p>
              <p className="text-lg font-bold text-green-eco">{totalPrice} DKK</p>
            </div>
            <button
              type="button"
              onClick={() => setShowBookingForm(true)}
              className="rounded-full bg-green-eco px-6 py-3 text-sm font-bold text-white"
            >
              Gå til booking
            </button>
          </div>
        </div>
      )}

      {/* Mobile booking form sheet */}
      {showBookingForm && (
        <div className="mt-6 lg:hidden">
          <BookingForm
            modelName={modelName}
            selectedServices={selectedServices}
            includesTemperedGlass={includesTemperedGlass}
            discountPercent={discountPercent}
            discountAmount={discountAmount}
            subtotal={subtotal}
            totalPrice={totalPrice}
            customer={customer}
            setCustomer={setCustomer}
            preferredDate={preferredDate}
            setPreferredDate={setPreferredDate}
            preferredTime={preferredTime}
            setPreferredTime={setPreferredTime}
            deliveryMethod={deliveryMethod}
            setDeliveryMethod={setDeliveryMethod}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting}
            submitResult={submitResult}
            onBack={() => setShowBookingForm(false)}
            onSubmitNoPay={handleSubmitNoPay}
            onSubmitAndPay={handleSubmitAndPay}
            showExclMoms={showExclMoms}
          />
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Booking form (shared between desktop sidebar and mobile sheet)     */
/* ------------------------------------------------------------------ */

interface BookingFormProps {
  modelName: string;
  selectedServices: ServiceItem[];
  includesTemperedGlass: boolean;
  discountPercent: number;
  discountAmount: number;
  subtotal: number;
  totalPrice: number;
  customer: { name: string; email: string; phone: string; description: string };
  setCustomer: React.Dispatch<
    React.SetStateAction<{ name: string; email: string; phone: string; description: string }>
  >;
  preferredDate: string;
  setPreferredDate: (d: string) => void;
  preferredTime: string;
  setPreferredTime: (t: string) => void;
  deliveryMethod: string;
  setDeliveryMethod: (m: string) => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  submitResult: { success: boolean; ticketId?: string; error?: string } | null;
  onBack: () => void;
  onSubmitNoPay: () => void;
  onSubmitAndPay: () => void;
  showExclMoms: boolean;
}

function BookingForm({
  modelName,
  selectedServices,
  includesTemperedGlass,
  discountPercent,
  discountAmount,
  subtotal,
  totalPrice,
  customer,
  setCustomer,
  preferredDate,
  setPreferredDate,
  preferredTime,
  setPreferredTime,
  deliveryMethod,
  setDeliveryMethod,
  canSubmit,
  isSubmitting,
  submitResult,
  onBack,
  onSubmitNoPay,
  onSubmitAndPay,
  showExclMoms,
}: BookingFormProps) {
  const fmtPrice = (dkk: number) => showExclMoms ? Math.round(dkk * 0.8) : dkk;
  const availableDates = getAvailableDates(6);
  const inputClass =
    "mt-1 w-full rounded-xl border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray/50 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20";

  return (
    <div className="rounded-2xl border border-soft-grey bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-charcoal">
          Book reparation
        </h3>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-green-eco hover:underline"
        >
          ← Tilbage til prisliste
        </button>
      </div>

      {/* Order summary */}
      <div className="mb-6 rounded-xl bg-charcoal/[0.03] p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray">
          {modelName}
        </p>
        {selectedServices.map((s) => (
          <div key={s.id} className="flex justify-between text-sm">
            <span className="text-charcoal">{s.name}</span>
            <span className="font-bold">{fmtPrice(s.price_dkk)} DKK</span>
          </div>
        ))}
        {includesTemperedGlass && (
          <div className="flex justify-between text-sm">
            <span className="text-charcoal">Panserglas</span>
            <span className="font-bold">99 DKK</span>
          </div>
        )}
        {discountPercent > 0 && (
          <div className="flex justify-between text-sm text-green-eco">
            <span>Rabat ({discountPercent}%)</span>
            <span>-{discountAmount} DKK</span>
          </div>
        )}
        {discountPercent > 0 && (
          <div className="flex justify-between text-sm text-gray">
            <span>Før rabat</span>
            <span className="line-through">{subtotal} DKK</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-soft-grey pt-2 font-bold">
          <span>Total</span>
          <span className="text-green-eco">{totalPrice} DKK</span>
        </div>
      </div>

      {/* Error message */}
      {submitResult?.error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitResult.error}
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-bold text-charcoal">Navn *</label>
          <input
            type="text"
            placeholder="Dit fulde navn"
            value={customer.name}
            onChange={(e) =>
              setCustomer((p) => ({ ...p, name: e.target.value }))
            }
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-charcoal">Email *</label>
            <input
              type="email"
              placeholder="din@email.dk"
              value={customer.email}
              onChange={(e) =>
                setCustomer((p) => ({ ...p, email: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm font-bold text-charcoal">Telefon *</label>
            <input
              type="tel"
              placeholder="+45 XX XX XX XX"
              value={customer.phone}
              onChange={(e) =>
                setCustomer((p) => ({ ...p, phone: e.target.value }))
              }
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-charcoal">
            Beskrivelse (valgfri)
          </label>
          <textarea
            placeholder="Beskriv problemet kort..."
            rows={3}
            value={customer.description}
            onChange={(e) =>
              setCustomer((p) => ({ ...p, description: e.target.value }))
            }
            className={inputClass}
          />
        </div>

        {/* Delivery method */}
        <div>
          <label className="text-sm font-bold text-charcoal">Hvordan vil du levere? *</label>
          <div className="mt-2 flex flex-col gap-2">
            {[
              { value: "Slagelse", label: "Aflever i Slagelse", desc: "VestsjællandsCentret 10", icon: "pin" },
              { value: "Vejle", label: "Aflever i Vejle", desc: "Åbner april 2026", icon: "pin" },
              { value: "Send ind", label: "Send ind", desc: "Gratis forsendelse", icon: "truck" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDeliveryMethod(opt.value)}
                className={`flex items-start gap-3 rounded-xl border-2 px-4 py-4 text-left transition-all ${
                  deliveryMethod === opt.value
                    ? "border-green-eco bg-green-eco/5"
                    : "border-soft-grey hover:border-green-eco/30"
                }`}
              >
                <span className={`mt-0.5 shrink-0 ${deliveryMethod === opt.value ? "text-green-eco" : "text-gray"}`}>
                  {opt.icon === "pin" ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.604 11.604 0 00.757.433l.04.021.01.006.004.002zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path d="M6.5 3c-1.051 0-2.093.04-3.125.117A1.49 1.49 0 002 4.607V10.5h-.5a.5.5 0 000 1H2v2.257a1.49 1.49 0 001.375 1.49A41.7 41.7 0 006.5 15.5c1.051 0 2.093-.04 3.125-.117A1.49 1.49 0 0011 13.893V11.5h1.256a1.5 1.5 0 001.32-.776l1.162-2.164c.201-.374.212-.825.03-1.21A1.203 1.203 0 0013.756 6.5H11V4.607a1.49 1.49 0 00-1.375-1.49A41.7 41.7 0 006.5 3zM16 10h.5a.5.5 0 010 1H16v2.257a3.49 3.49 0 01-1 2.464V17.5a.5.5 0 01-1 0v-1.07a42.19 42.19 0 01-3-.193V17.5a.5.5 0 01-1 0V16.1a42.19 42.19 0 01-3 .193V17.5a.5.5 0 01-1 0v-1.779a3.49 3.49 0 01-1-2.464V11h-.5a.5.5 0 010-1H5V4.607a3.49 3.49 0 011-2.464V.5a.5.5 0 011 0v1.07c.97-.067 1.983-.1 3-.1s2.03.033 3 .1V.5a.5.5 0 011 0v1.643a3.49 3.49 0 011 2.464V10z" /></svg>
                  )}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold leading-tight ${deliveryMethod === opt.value ? "text-green-eco" : "text-charcoal"}`}>
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-gray">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Add another device link */}
        <a
          href="/reparation/booking"
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-green-eco/30 bg-green-eco/[0.02] py-3 text-sm font-bold text-green-eco transition-all hover:border-green-eco/50 hover:bg-green-eco/5"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Tilføj endnu en enhed til booking
        </a>

        {/* Date picker */}
        <div>
          <label className="text-sm font-bold text-charcoal">
            Hvornår vil du aflevere? *
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {availableDates.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => setPreferredDate(date)}
                className={`rounded-xl border-2 p-3 text-center transition-all ${
                  preferredDate === date
                    ? "border-green-eco bg-green-eco/5"
                    : "border-soft-grey hover:border-green-eco/30"
                }`}
              >
                <p
                  className={`text-xs font-bold ${
                    preferredDate === date ? "text-green-eco" : "text-charcoal"
                  }`}
                >
                  {new Date(date + "T12:00:00").toLocaleDateString("da-DK", {
                    weekday: "short",
                  })}
                </p>
                <p className="text-[11px] text-gray">
                  {new Date(date + "T12:00:00").toLocaleDateString("da-DK", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </button>
            ))}
          </div>

          {/* Time slot picker — shown after date is selected */}
          {preferredDate && (
            <div className="mt-4">
              <label className="text-sm font-bold text-charcoal">Vælg tidsinterval *</label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { value: "10:00-12:00", label: "10-12" },
                  { value: "12:00-14:00", label: "12-14" },
                  { value: "14:00-16:00", label: "14-16" },
                  { value: "16:00-18:00", label: "16-18" },
                ].map((slot) => (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => setPreferredTime(slot.value)}
                    className={`rounded-xl border-2 p-3 text-center transition-all ${
                      preferredTime === slot.value
                        ? "border-green-eco bg-green-eco/5"
                        : "border-soft-grey hover:border-green-eco/30"
                    }`}
                  >
                    <p className={`text-sm font-bold ${preferredTime === slot.value ? "text-green-eco" : "text-charcoal"}`}>
                      {slot.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit buttons */}
      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={onSubmitAndPay}
          disabled={!canSubmit || isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-green-eco py-3.5 text-sm font-bold text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-green-eco/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Sender..." : `Betal nu — ${totalPrice} DKK`}
        </button>
        <button
          type="button"
          onClick={onSubmitNoPay}
          disabled={!canSubmit || isSubmitting}
          className="flex w-full items-center justify-center rounded-full border-2 border-soft-grey py-3.5 text-sm font-bold text-charcoal transition-all hover:bg-sand disabled:cursor-not-allowed disabled:opacity-50"
        >
          Betal i butikken
        </button>
      </div>

      <p className="mt-4 text-center text-[11px] text-gray">
        Inkl. moms, reservedele og livstidsgaranti
      </p>
    </div>
  );
}
