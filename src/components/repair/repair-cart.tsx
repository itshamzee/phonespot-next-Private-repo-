"use client";

import { useState, useMemo, useId, useRef, useEffect } from "react";
import Link from "next/link";
import styles from "./repair.module.css";
import { repairServiceLabel } from "./service-label";
import { STORES } from "@/lib/store-config";
import { STORE_IDS, normalizeStoreId, type StoreId } from "@/lib/stores";

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
  const [mailInStore, setMailInStore] = useState<StoreId | null>(null);
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
    (deliveryMethod !== "Send ind" || mailInStore) &&
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
    // "Aflever i Slagelse/Vejle" er også butiksvalget; ved "Send ind" vælger
    // kunden hvilken butik pakken sendes til.
    store_id: normalizeStoreId(deliveryMethod) ?? mailInStore,
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
        <h2 className="font-body text-2xl font-bold text-charcoal">
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
              <span>{repairServiceLabel(s)}</span>
              <span>{fmtPrice(s.price_dkk)} DKK</span>
            </div>
          ))}
          {includesTemperedGlass && (
            <div className="mt-1 flex justify-between text-gray">
              <span>Beskyttelsesglas</span>
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

  return <div className={styles.cart}>
    <div className={styles.cartLayout}>
      <div className={styles.servicesColumn}>
        <fieldset className={styles.colors}><legend>Enhedens farve <span>(valgfrit)</span></legend><div>{DEVICE_COLORS.map(c => <button type="button" key={c.name} aria-pressed={selectedColor === c.name} onClick={() => setSelectedColor(selectedColor === c.name ? "" : c.name)}><span style={{ background: c.hex, border: c.border ? "1px solid #c8d0c9" : undefined }} />{c.name}</button>)}</div></fieldset>
        <div className={styles.serviceHeading}><h2>Vælg reparation</h2><button type="button" aria-pressed={showExclMoms} aria-label="Vis priser ekskl. moms" onClick={() => setShowExclMoms(v => !v)}>{showExclMoms ? "Ekskl. moms" : "Inkl. moms"}<span aria-hidden="true"> ⇄</span></button></div>
        <p className={styles.hint}>Vælg en reparation og eventuelt kvalitet på reservedelen.</p>
        <div className={styles.serviceRows}>{grouped.map(([category, items], index) => {
          const selected = items.find(item => selectedIds.has(item.id));
          const isOpen = expandedCategory === category;
          const prices = items.filter(item => item.price_dkk > 0).map(item => item.price_dkk);
          if (items.length === 1) return <ServiceOption key={category} service={items[0]} selected={!!selected} onToggle={toggleService} formatPrice={fmtPrice} />;
          return <section key={category} className={styles.serviceCategory}>
            <h3><button type="button" className={styles.categoryToggle} aria-expanded={isOpen} aria-controls={"quality-" + index} onClick={() => setExpandedCategory(isOpen ? null : category)}><ServiceIcon slug={items[0].slug} /><span><strong>{category === "Skaerm" ? "Skærm" : category}</strong>{" "}<small>{selected ? "Valgt: " + repairServiceLabel(selected) : items.length + " kvaliteter"}</small></span><span className={styles.rowPrice}>{selected ? fmtPrice(selected.price_dkk) + " kr." : prices.length ? "Fra " + fmtPrice(Math.min(...prices)) + " kr." : "Pris på forespørgsel"}<small>{isOpen ? "Luk valg −" : "Vælg kvalitet +"}</small></span></button></h3>
            {isOpen && <div id={"quality-" + index}>{items.map(service => <ServiceOption key={service.id} service={service} selected={selectedIds.has(service.id)} onToggle={toggleService} formatPrice={fmtPrice} tier />)}</div>}
          </section>;
        })}</div>
        {services.length === 0 && <div className={styles.empty}><p>Priser kommer snart for denne model.</p><Link href="/kontakt">Kontakt os om reparation</Link></div>}
        {services.length > 1 && <p className={styles.discountNote}>10% rabat ved 2 reparationer · 15% rabat ved 3 eller flere. Rabatten vises i din oversigt.</p>}
        <p className={styles.hint}>Se garantioplysningerne ved den enkelte reparation. <Link href="/handelsbetingelser" className={styles.textLink}>Læs reparationsbetingelserne</Link></p>
      </div>
      <aside className={styles.cartAside} aria-label="Din reparationsoversigt">
        {showBookingForm ? <BookingForm
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
              mailInStore={mailInStore}
              setMailInStore={setMailInStore}
              canSubmit={canSubmit}
              isSubmitting={isSubmitting}
              submitResult={submitResult}
              onBack={() => setShowBookingForm(false)}
              onSubmitNoPay={handleSubmitNoPay}
              onSubmitAndPay={handleSubmitAndPay}
              showExclMoms={showExclMoms}
            /> : <div className={styles.summary}>
          <span className={styles.eyebrow}>Din reparation</span><h2>{modelName}</h2>{selectedColor && <p className={styles.hint}>{selectedColor}</p>}
          {selectedServices.length === 0 ? <p className={styles.intro}>Vælg reparationer fra listen. Her ser du dine valg og den samlede pris.</p> : <>
            <ul className={styles.summaryRows}>{selectedServices.map(service => <li key={service.id}><span>{repairServiceLabel(service)}</span><strong>{fmtPrice(service.price_dkk)} DKK</strong><button type="button" aria-label={"Fjern " + repairServiceLabel(service)} onClick={() => toggleService(service.id)}>×</button></li>)}</ul>
            <button type="button" className={styles.glassOption} aria-pressed={includesTemperedGlass} onClick={() => setIncludesTemperedGlass(v => !v)}><span>{includesTemperedGlass ? "Valgt: " : "Tilføj "}beskyttelsesglas</span><strong>+99 DKK</strong></button>
            {discountPercent > 0 && <div className={styles.summaryDiscount}><span>Rabat ({discountPercent}%)</span><strong>−{discountAmount} DKK</strong></div>}
            <div className={styles.total}>{discountPercent > 0 && <p><span>Subtotal</span><span>{subtotal} DKK</span></p>}<div><span>Total</span><strong>{totalPrice} DKK</strong></div><small>Inkl. moms og reservedele</small></div>
            <button type="button" className={styles.primaryButton} onClick={() => setShowBookingForm(true)}>Gå til booking</button>
          </>}
          <p className={styles.summaryHelp}>Spørg os, hvis du er i tvivl om fejlen eller reservedelen. <Link href="/kontakt">Kontakt os</Link></p>
        </div>}
      </aside>
    </div>
    {selectedServices.length > 0 && !showBookingForm && <div className={styles.mobileTotal}><span>{selectedServices.length} reparation{selectedServices.length > 1 ? "er" : ""}<strong>{totalPrice} DKK</strong></span><button type="button" className={styles.primaryButton} onClick={() => setShowBookingForm(true)}>Gå til booking</button></div>}
  </div>;
}

function ServiceOption({ service, selected, onToggle, formatPrice, tier = false }: { service: ServiceItem; selected: boolean; onToggle: (id: string) => void; formatPrice: (price: number) => number; tier?: boolean }) {
  const tierName = service.quality_tier === "original" ? "Original" : service.quality_tier === "premium" ? "Premium" : service.quality_tier === "standard" ? "Standard" : service.name;
  return <div className={styles.serviceOption} data-selected={selected}>
    <div className={styles.serviceOptionTop}>
      {!tier && <ServiceIcon slug={service.slug} />}
      <div className={styles.serviceName}><h3>{tier ? tierName : service.name}</h3>{service.estimated_minutes != null && service.estimated_minutes > 0 && <small>Forventet tid: ca. {service.estimated_minutes} min.</small>}</div>
      {service.price_dkk > 0 ? <button type="button" className={styles.chooseService} aria-label={"Vælg " + service.name + " til " + formatPrice(service.price_dkk) + " kr."} aria-pressed={selected} onClick={() => onToggle(service.id)}><strong>{formatPrice(service.price_dkk)} kr.</strong><span>{selected ? "Valgt −" : "Tilføj +"}</span></button> : <Link className={styles.unavailable} href="/kontakt" aria-label={"Kontakt os om " + service.name}>Pris på forespørgsel<span>Kontakt os →</span></Link>}
    </div>
    {service.description && <p>{service.description}</p>}
    {service.info_note && <p>{service.info_note}</p>}
    {(service.includes || service.warranty_info) && <details className={styles.serviceDetails}><summary>Hvad er inkluderet?</summary>{service.includes && <p>{service.includes}</p>}{service.warranty_info && <p>{service.warranty_info}</p>}</details>}
  </div>;
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
  mailInStore: StoreId | null;
  setMailInStore: (s: StoreId | null) => void;
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
  mailInStore,
  setMailInStore,
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
  const formId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const inputClass =
    "mt-1 w-full rounded-xl border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray/50 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20";

  return (
    <div className={styles.bookingForm}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h3 ref={headingRef} tabIndex={-1} className="font-body text-lg font-bold text-charcoal">
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
            <span className="text-charcoal">{repairServiceLabel(s)}</span>
            <span className="font-bold">{fmtPrice(s.price_dkk)} DKK</span>
          </div>
        ))}
        {includesTemperedGlass && (
          <div className="flex justify-between text-sm">
            <span className="text-charcoal">Beskyttelsesglas</span>
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
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitResult.error}
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-4">
        <div>
          <label htmlFor={formId + "-name"} className="text-sm font-bold text-charcoal">Navn *</label>
          <input
            id={formId + "-name"}
            autoComplete="name"
            required
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
            <label htmlFor={formId + "-email"} className="text-sm font-bold text-charcoal">Email *</label>
            <input
              id={formId + "-email"}
            autoComplete="email"
            required
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
            <label htmlFor={formId + "-phone"} className="text-sm font-bold text-charcoal">Telefon *</label>
            <input
              id={formId + "-phone"}
            autoComplete="tel"
            required
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
          <label htmlFor={formId + "-description"} className="text-sm font-bold text-charcoal">
            Beskrivelse (valgfri)
          </label>
          <textarea id={formId + "-description"}
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
              { value: "Slagelse", label: "Aflever i Slagelse", desc: STORES.slagelse.street, icon: "pin" },
              { value: "Vejle", label: "Aflever i Vejle", desc: STORES.vejle.street, icon: "pin" },
              { value: "Send ind", label: "Send ind", desc: "Gratis forsendelse", icon: "truck" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={deliveryMethod === opt.value}
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

          {/* Mail-in: customer picks which store receives the package */}
          {deliveryMethod === "Send ind" && (
            <div className="mt-3">
              <label className="text-sm font-bold text-charcoal">
                Hvilken butik vil du sende til? *
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {STORE_IDS.map((id) => {
                  const store = STORES[id];
                  const isSelected = mailInStore === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setMailInStore(id)}
                      className={`rounded-xl border-2 px-4 py-3 text-left transition-all ${
                        isSelected
                          ? "border-green-eco bg-green-eco/5"
                          : "border-soft-grey hover:border-green-eco/30"
                      }`}
                    >
                      <p className={`text-sm font-bold leading-tight ${isSelected ? "text-green-eco" : "text-charcoal"}`}>
                        {store.city}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-tight text-gray">
                        {store.street}, {store.zip} {store.city}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Add another device link */}
        <Link
          href="/reparation/booking"
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-green-eco/30 bg-green-eco/[0.02] py-3 text-sm font-bold text-green-eco transition-all hover:border-green-eco/50 hover:bg-green-eco/5"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Start en booking med flere enheder
        </Link>

        {/* Date picker */}
        <div role="group" aria-label="Hvornår vil du aflevere? *">
          <label className="text-sm font-bold text-charcoal">
            Hvornår vil du aflevere? *
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {availableDates.map((date) => (
              <button
                key={date}
                type="button"
                aria-pressed={preferredDate === date}
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
                    aria-pressed={preferredTime === slot.value}
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
        Inkl. moms og reservedele
      </p>
    </div>
  );
}
