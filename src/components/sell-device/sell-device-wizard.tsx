"use client";

import { useState, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

interface DeviceInfo {
  deviceType: string;
  brand: string;
  model: string;
  storage: string;
  ram: string;
}

interface ConditionInfo {
  screen: string;
  back: string;
  battery: string;
  allWorking: string;
  brokenParts: string[];
  cloudLocked: string;
}

interface DeviceEntry {
  id: string;
  device: DeviceInfo;
  condition: ConditionInfo;
}

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  preferredContact: string;
  deliveryMethod: string;
  preferredStore: string;
  comment: string;
}

type Status = "idle" | "submitting" | "success" | "error";

const STEPS = ["Enheder", "Stand", "Levering & kontakt"] as const;

const EMPTY_DEVICE: DeviceInfo = { deviceType: "", brand: "", model: "", storage: "", ram: "" };
const EMPTY_CONDITION: ConditionInfo = { screen: "", back: "", battery: "", allWorking: "", brokenParts: [], cloudLocked: "" };

function makeEntry(): DeviceEntry {
  return { id: crypto.randomUUID(), device: { ...EMPTY_DEVICE }, condition: { ...EMPTY_CONDITION, brokenParts: [] } };
}

/* ---- Device categories with icons ---- */
const DEVICE_CATEGORIES = [
  {
    type: "Telefon",
    label: "Telefon",
    sublabel: "iPhone, Samsung, m.fl.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="h-12 w-12">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
  {
    type: "Tablet",
    label: "Tablet",
    sublabel: "iPad, Galaxy Tab, m.fl.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="h-12 w-12">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
  },
  {
    type: "Laptop",
    label: "Laptop",
    sublabel: "MacBook, ThinkPad, m.fl.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="h-12 w-12">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
      </svg>
    ),
  },
  {
    type: "Smartwatch",
    label: "Smartwatch",
    sublabel: "Apple Watch, Galaxy Watch",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="h-12 w-12">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
];

/* ---- Dynamic options per device type ---- */
const STORAGE_OPTIONS: Record<string, string[]> = {
  Telefon: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"],
  Tablet: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"],
  Laptop: ["128GB SSD", "256GB SSD", "512GB SSD", "1TB SSD", "2TB SSD"],
  Smartwatch: ["32GB", "64GB"],
};

const RAM_OPTIONS: Record<string, string[]> = {
  Laptop: ["8GB", "16GB", "32GB", "64GB"],
};

const SCREEN_OPTIONS: Record<string, string[]> = {
  Telefon: ["Perfekt", "Små ridser", "Revnet", "Virker ikke"],
  Tablet: ["Perfekt", "Små ridser", "Revnet", "Virker ikke"],
  Laptop: ["Perfekt", "Små ridser", "Skærmfejl", "Knækket"],
  Smartwatch: ["Perfekt", "Små ridser", "Revnet"],
};

const BACK_OPTIONS: Record<string, string[]> = {
  Telefon: ["Perfekt", "Små ridser", "Revnet"],
  Tablet: ["Perfekt", "Små ridser", "Revnet"],
  Laptop: ["Perfekt", "Små ridser", "Buler/ridser"],
  Smartwatch: ["Perfekt", "Ridser"],
};

const BATTERY_OPTIONS = ["God (80%+)", "Okay (60-80%)", "Dårligt (<60%)", "Ved ikke"];

const BROKEN_PARTS: Record<string, string[]> = {
  Telefon: ["Kamera", "Højtaler", "Mikrofon", "WiFi", "Bluetooth", "Opladning", "Knapper", "Face ID"],
  Tablet: ["Kamera", "Højtaler", "Mikrofon", "WiFi", "Bluetooth", "Opladning", "Knapper"],
  Laptop: ["Kamera", "Højtaler", "Mikrofon", "WiFi", "Bluetooth", "Opladning", "Tastatur", "Trackpad", "USB-porte"],
  Smartwatch: ["Skærm-touch", "Højtaler", "Mikrofon", "Bluetooth", "Opladning", "Knapper"],
};

/* ---- Screen condition emojis ---- */
function screenEmoji(opt: string): string {
  if (opt === "Perfekt") return "✨";
  if (opt === "Små ridser") return "👌";
  if (opt === "Revnet" || opt === "Skærmfejl" || opt === "Knækket") return "⚠️";
  return "❌";
}

/* ---- Back condition emojis ---- */
function backEmoji(opt: string): string {
  if (opt === "Perfekt") return "✨";
  if (opt === "Små ridser" || opt === "Ridser") return "👌";
  if (opt === "Buler/ridser") return "😕";
  return "⚠️";
}

/* ------------------------------------------------------------------ */
/*  Progress Bar                                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="mb-10">
      <div className="hidden items-center justify-between sm:flex">
        {STEPS.map((label, i) => {
          const isCompleted = i < current;
          const isActive = i === current;
          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                    isCompleted
                      ? "bg-green-eco text-white shadow-md shadow-green-eco/25"
                      : isActive
                        ? "bg-green-eco text-white shadow-lg shadow-green-eco/30 ring-4 ring-green-eco/20"
                        : "border-2 border-soft-grey bg-white text-gray"
                  }`}
                >
                  {isCompleted ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`mt-2 text-sm font-bold ${
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
      <div className="flex items-center justify-between sm:hidden">
        {STEPS.map((label, i) => {
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
/*  Radio Group                                                        */
/* ------------------------------------------------------------------ */

function RadioGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-charcoal">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-xl border-2 px-5 py-3 text-base font-medium transition-all ${
              value === opt
                ? "border-green-eco bg-green-eco/5 text-green-eco"
                : "border-soft-grey text-charcoal hover:border-green-eco/30"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Visual Condition Card Grid                                         */
/* ------------------------------------------------------------------ */

function ConditionCardGrid({
  label,
  options,
  value,
  onChange,
  emojiFor,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  emojiFor: (opt: string) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-charcoal">{label}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {options.map((opt) => {
          const isSelected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                isSelected
                  ? "border-green-eco bg-green-eco/5 shadow-sm"
                  : "border-soft-grey hover:border-green-eco/30"
              }`}
            >
              <span className="text-2xl">{emojiFor(opt)}</span>
              <span className="text-sm font-bold text-charcoal">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Wizard                                                        */
/* ------------------------------------------------------------------ */

export function SellDeviceWizard() {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [devices, setDevices] = useState<DeviceEntry[]>([makeEntry()]);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState(0);

  const [contact, setContact] = useState<ContactInfo>({
    name: "",
    email: "",
    phone: "",
    preferredContact: "Ring mig",
    deliveryMethod: "",
    preferredStore: "Slagelse",
    comment: "",
  });

  /* ---- Helpers ---- */
  const activeDevice = devices[activeDeviceIndex] ?? devices[0];
  const activeCondition = activeDevice.condition;

  function updateDevice(index: number, updates: Partial<DeviceInfo>) {
    setDevices((prev) =>
      prev.map((d, i) => (i === index ? { ...d, device: { ...d.device, ...updates } } : d)),
    );
  }

  function updateCondition(index: number, updates: Partial<ConditionInfo>) {
    setDevices((prev) =>
      prev.map((d, i) => (i === index ? { ...d, condition: { ...d.condition, ...updates } } : d)),
    );
  }

  function toggleBrokenPart(part: string) {
    const current = activeCondition.brokenParts;
    updateCondition(activeDeviceIndex, {
      brokenParts: current.includes(part) ? current.filter((p) => p !== part) : [...current, part],
    });
  }

  const inputStyles =
    "w-full rounded-xl border-2 border-soft-grey bg-white px-5 py-4 text-base text-charcoal placeholder:text-gray/40 focus:border-green-eco focus:outline-none focus:ring-4 focus:ring-green-eco/10 transition-all";

  const labelStyles = "text-sm font-bold text-charcoal";

  const isPhone = activeDevice.device.deviceType === "Telefon";
  const isTablet = activeDevice.device.deviceType === "Tablet";
  const isLaptop = activeDevice.device.deviceType === "Laptop";
  const showCloudLock = isPhone || isTablet;

  /* ---- validation ---- */
  const canGoNext = useMemo(() => {
    switch (step) {
      case 0:
        // Every device must have deviceType, brand, model
        return devices.every((entry) => entry.device.deviceType && entry.device.brand && entry.device.model);
      case 1: {
        // Every device must have screen, back, battery, allWorking (+ cloudLocked if applicable)
        return devices.every((entry) => {
          const c = entry.condition;
          const d = entry.device;
          const baseValid = !!(c.screen && c.back && c.battery && c.allWorking);
          const needsCloudLock = d.deviceType === "Telefon" || d.deviceType === "Tablet";
          if (needsCloudLock) return baseValid && !!c.cloudLocked;
          return baseValid;
        });
      }
      case 2:
        return !!(contact.name.trim() && contact.email.trim() && contact.phone.trim() && contact.deliveryMethod);
      default:
        return false;
    }
  }, [step, devices, contact]);

  /* ---- build message ---- */
  function buildMessage(): string {
    const parts = devices.map((entry, i) => {
      const { device: d, condition: c } = entry;
      const needsCloudLock = d.deviceType === "Telefon" || d.deviceType === "Tablet";
      const lines = [
        devices.length > 1 ? `\n--- Enhed ${i + 1} ---` : null,
        `Enhedstype: ${d.deviceType}`,
        `Mærke: ${d.brand}`,
        `Model: ${d.model}`,
        d.storage ? `Lagerplads: ${d.storage}` : null,
        d.ram ? `RAM: ${d.ram}` : null,
        `Skærm: ${c.screen}`,
        `Bagside/krop: ${c.back}`,
        `Batteri: ${c.battery}`,
        `Alt fungerer: ${c.allWorking}`,
        c.allWorking === "Nej" && c.brokenParts.length > 0
          ? `Defekte dele: ${c.brokenParts.join(", ")}`
          : null,
        needsCloudLock ? `iCloud/Google låst: ${c.cloudLocked}` : null,
      ];
      return lines.filter(Boolean).join("\n");
    });

    const deliveryLines = [
      "",
      `Leveringsmetode: ${contact.deliveryMethod}`,
      contact.deliveryMethod === "Aflever i butik" ? `Foretrukken butik: ${contact.preferredStore}` : null,
      `Foretrukken kontakt: ${contact.preferredContact}`,
      contact.comment ? `Kommentar: ${contact.comment}` : null,
    ];

    return [...parts, ...deliveryLines.filter(Boolean)].join("\n");
  }

  /* ---- submit ---- */
  async function handleSubmit() {
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contact.name.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim(),
          subject: devices.length > 1 ? `Sælg enheder (${devices.length})` : "Sælg enhed",
          message: buildMessage(),
          source: "saelg-enhed",
          metadata: {
            devices: devices.map((e) => ({ device: e.device, condition: e.condition })),
            deliveryMethod: contact.deliveryMethod,
            preferredStore: contact.preferredStore,
            preferredContact: contact.preferredContact,
            comment: contact.comment,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Noget gik galt");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Kunne ikke sende anmodning");
    }
  }

  const goNext = () => {
    if (step === STEPS.length - 1) {
      handleSubmit();
    } else {
      // When moving to condition step, land on first device that needs filling
      if (step === 0) {
        const firstIncomplete = devices.findIndex(
          (e) => !e.condition.screen || !e.condition.back || !e.condition.battery || !e.condition.allWorking,
        );
        setActiveDeviceIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
      }
      setStep((s) => s + 1);
    }
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  /* ---- Success screen ---- */
  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-eco/20 bg-green-eco/5 p-10 text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-eco shadow-lg shadow-green-eco/25">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="h-10 w-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-charcoal">
          Tak for din henvendelse!
        </h2>
        <p className="mt-3 text-gray">
          Vi har modtaget dine oplysninger og vurderer {devices.length > 1 ? `dine ${devices.length} enheder` : "din enhed"} hurtigst muligt.
          Du hører fra os inden for 24 timer.
        </p>
        {contact.deliveryMethod === "Aflever i butik" && (
          <p className="mt-4 text-sm font-medium text-green-eco">
            Du har valgt at aflevere i PhoneSpot {contact.preferredStore} — vi kontakter dig med detaljer.
          </p>
        )}
        {contact.deliveryMethod === "Send med gratis label" && (
          <p className="mt-4 text-sm font-medium text-green-eco">
            Når du accepterer tilbuddet, sender vi et gratis forsendelseslabel til din email.
          </p>
        )}
      </div>
    );
  }

  /* ---- Render ---- */
  return (
    <div className="rounded-2xl border border-soft-grey bg-white p-6 shadow-md md:p-10">
      <ProgressBar current={step} />

      {status === "error" && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {errorMessage}
        </div>
      )}

      {/* ==== Step 1: Devices ==== */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-charcoal">
              Hvad vil du sælge?
            </h2>
            <p className="mt-1 text-base text-gray">Vælg enhedstype og fortæl os om din model.</p>
          </div>

          {/* Already added devices summary */}
          {devices.some((d) => d.device.model) && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray">Dine enheder</p>
              {devices.map((entry, i) =>
                entry.device.model ? (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between rounded-xl border-2 p-4 transition-all ${
                      i === activeDeviceIndex ? "border-green-eco bg-green-eco/5" : "border-soft-grey"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-eco text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-charcoal">
                          {entry.device.brand} {entry.device.model}
                        </p>
                        <p className="text-xs text-gray">
                          {entry.device.deviceType} · {entry.device.storage || "Ikke valgt"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveDeviceIndex(i)}
                        className="text-xs font-semibold text-green-eco hover:underline"
                      >
                        Rediger
                      </button>
                      {devices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setDevices((prev) => prev.filter((_, j) => j !== i));
                            if (activeDeviceIndex >= devices.length - 1) {
                              setActiveDeviceIndex(Math.max(0, devices.length - 2));
                            }
                          }}
                          className="text-xs font-semibold text-red-500 hover:underline"
                        >
                          Fjern
                        </button>
                      )}
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          )}

          {/* Active device form */}
          {devices.length > 1 && (
            <p className="text-xs font-bold uppercase tracking-wide text-gray">
              {activeDevice.device.model ? `Redigerer enhed ${activeDeviceIndex + 1}` : `Ny enhed ${activeDeviceIndex + 1}`}
            </p>
          )}

          {/* Device category cards */}
          <div className="grid grid-cols-2 gap-3">
            {DEVICE_CATEGORIES.map((cat) => (
              <button
                key={cat.type}
                type="button"
                onClick={() => {
                  updateDevice(activeDeviceIndex, { deviceType: cat.type, storage: "", ram: "" });
                  updateCondition(activeDeviceIndex, { screen: "", back: "", battery: "", allWorking: "", brokenParts: [], cloudLocked: "" });
                }}
                className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all ${
                  activeDevice.device.deviceType === cat.type
                    ? "border-green-eco bg-gradient-to-b from-green-eco/10 to-green-eco/5 shadow-lg shadow-green-eco/15"
                    : "border-soft-grey bg-white hover:border-green-eco/30 hover:shadow-md"
                }`}
              >
                {activeDevice.device.deviceType === cat.type && (
                  <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-eco text-white">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <span className={activeDevice.device.deviceType === cat.type ? "text-green-eco" : "text-charcoal/60"}>
                  {cat.icon}
                </span>
                <span className="font-display text-sm font-bold text-charcoal">{cat.label}</span>
                <span className="text-xs text-gray">{cat.sublabel}</span>
              </button>
            ))}
          </div>

          {/* Brand & Model */}
          {activeDevice.device.deviceType && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="brand" className={labelStyles}>Mærke</label>
                  <input
                    id="brand"
                    type="text"
                    placeholder={
                      activeDevice.device.deviceType === "Telefon"
                        ? "f.eks. Apple, Samsung"
                        : activeDevice.device.deviceType === "Laptop"
                          ? "f.eks. Lenovo, Apple"
                          : "f.eks. Apple, Samsung"
                    }
                    value={activeDevice.device.brand}
                    onChange={(e) => updateDevice(activeDeviceIndex, { brand: e.target.value })}
                    className={inputStyles}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="model" className={labelStyles}>Model</label>
                  <input
                    id="model"
                    type="text"
                    placeholder={
                      activeDevice.device.deviceType === "Telefon"
                        ? "f.eks. iPhone 14 Pro"
                        : activeDevice.device.deviceType === "Tablet"
                          ? "f.eks. iPad Air 5"
                          : activeDevice.device.deviceType === "Laptop"
                            ? 'f.eks. MacBook Pro 14"'
                            : "f.eks. Apple Watch SE"
                    }
                    value={activeDevice.device.model}
                    onChange={(e) => updateDevice(activeDeviceIndex, { model: e.target.value })}
                    className={inputStyles}
                  />
                </div>
              </div>

              {/* Storage */}
              {STORAGE_OPTIONS[activeDevice.device.deviceType] && (
                <div className="flex flex-col gap-2">
                  <label className={labelStyles}>Lagerplads</label>
                  <div className="flex flex-wrap gap-2">
                    {STORAGE_OPTIONS[activeDevice.device.deviceType].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateDevice(activeDeviceIndex, { storage: s })}
                        className={`rounded-xl border-2 px-5 py-3 text-base font-medium transition-all ${
                          activeDevice.device.storage === s
                            ? "border-green-eco bg-green-eco/5 text-green-eco"
                            : "border-soft-grey text-charcoal hover:border-green-eco/30"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* RAM (laptops only) */}
              {RAM_OPTIONS[activeDevice.device.deviceType] && (
                <div className="flex flex-col gap-2">
                  <label className={labelStyles}>RAM</label>
                  <div className="flex flex-wrap gap-2">
                    {RAM_OPTIONS[activeDevice.device.deviceType].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => updateDevice(activeDeviceIndex, { ram: r })}
                        className={`rounded-xl border-2 px-5 py-3 text-base font-medium transition-all ${
                          activeDevice.device.ram === r
                            ? "border-green-eco bg-green-eco/5 text-green-eco"
                            : "border-soft-grey text-charcoal hover:border-green-eco/30"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Add another device button */}
          {activeDevice.device.model && (
            <button
              type="button"
              onClick={() => {
                const newEntry = makeEntry();
                setDevices((prev) => [...prev, newEntry]);
                setActiveDeviceIndex(devices.length);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-green-eco/30 bg-green-eco/[0.02] py-4 text-sm font-bold text-green-eco transition-all hover:border-green-eco/50 hover:bg-green-eco/5"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Tilføj endnu en enhed
            </button>
          )}
        </div>
      )}

      {/* ==== Step 2: Condition ==== */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-charcoal">
              Hvordan er standen?
            </h2>
            <p className="mt-1 text-base text-gray">Beskriv standen, så vi kan give dig den bedste vurdering.</p>
          </div>

          {/* Device tabs when multiple devices */}
          {devices.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {devices.map((entry, i) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setActiveDeviceIndex(i)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all ${
                    i === activeDeviceIndex
                      ? "bg-green-eco text-white"
                      : "border border-soft-grey bg-white text-charcoal hover:border-green-eco/30"
                  }`}
                >
                  <span>{i + 1}.</span>
                  {entry.device.brand} {entry.device.model}
                </button>
              ))}
            </div>
          )}

          {/* Condition for active device */}
          <ConditionCardGrid
            label={isLaptop ? "Skærm" : "Skærm"}
            options={SCREEN_OPTIONS[activeDevice.device.deviceType] ?? SCREEN_OPTIONS.Telefon}
            value={activeCondition.screen}
            onChange={(v) => updateCondition(activeDeviceIndex, { screen: v })}
            emojiFor={screenEmoji}
          />

          <ConditionCardGrid
            label={isLaptop ? "Krop/chassi" : "Bagside"}
            options={BACK_OPTIONS[activeDevice.device.deviceType] ?? BACK_OPTIONS.Telefon}
            value={activeCondition.back}
            onChange={(v) => updateCondition(activeDeviceIndex, { back: v })}
            emojiFor={backEmoji}
          />

          <RadioGroup
            label="Batteri"
            options={BATTERY_OPTIONS}
            value={activeCondition.battery}
            onChange={(v) => updateCondition(activeDeviceIndex, { battery: v })}
          />

          <RadioGroup
            label="Fungerer alt?"
            options={["Ja", "Nej"]}
            value={activeCondition.allWorking}
            onChange={(v) =>
              updateCondition(activeDeviceIndex, {
                allWorking: v,
                brokenParts: v === "Ja" ? [] : activeCondition.brokenParts,
              })
            }
          />

          {activeCondition.allWorking === "Nej" && (
            <div className="flex flex-col gap-2 rounded-xl border border-soft-grey bg-sand/30 p-4">
              <p className="text-sm font-bold text-charcoal">Hvad virker ikke?</p>
              <div className="flex flex-wrap gap-2">
                {(BROKEN_PARTS[activeDevice.device.deviceType] ?? BROKEN_PARTS.Telefon).map((part) => (
                  <button
                    key={part}
                    type="button"
                    onClick={() => toggleBrokenPart(part)}
                    className={`rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                      activeCondition.brokenParts.includes(part)
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "border-soft-grey text-charcoal hover:border-red-300"
                    }`}
                  >
                    {part}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showCloudLock && (
            <>
              <RadioGroup
                label={isPhone || isTablet ? "iCloud / Google-konto låst?" : "Konto låst?"}
                options={["Ja", "Nej", "Ved ikke"]}
                value={activeCondition.cloudLocked}
                onChange={(v) => updateCondition(activeDeviceIndex, { cloudLocked: v })}
              />

              {activeCondition.cloudLocked === "Ja" && (
                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-amber-500">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-amber-800">
                    <span className="font-bold">Bemærk:</span> Enheder med aktiv iCloud- eller Google-lås kan vi desværre ikke opkøbe. Du skal fjerne låsen inden salg.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Progress across devices when multiple */}
          {devices.length > 1 && (
            <div className="rounded-xl border border-soft-grey bg-charcoal/[0.02] p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray">Stand udfyldt</p>
              <div className="space-y-2">
                {devices.map((entry, i) => {
                  const c = entry.condition;
                  const d = entry.device;
                  const needsCloud = d.deviceType === "Telefon" || d.deviceType === "Tablet";
                  const filled = !!(c.screen && c.back && c.battery && c.allWorking && (!needsCloud || c.cloudLocked));
                  return (
                    <div key={entry.id} className="flex items-center justify-between text-sm">
                      <span className="text-charcoal">
                        {i + 1}. {entry.device.brand} {entry.device.model}
                      </span>
                      {filled ? (
                        <span className="flex items-center gap-1 text-green-eco">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                          Klar
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveDeviceIndex(i)}
                          className="text-xs font-semibold text-amber-600 hover:underline"
                        >
                          Udfyld
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==== Step 3: Delivery & Contact ==== */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-charcoal">
              Hvordan vil du levere?
            </h2>
            <p className="mt-1 text-base text-gray">Vælg om du vil sende {devices.length > 1 ? "dine enheder" : "din enhed"} eller aflevere i butikken.</p>
          </div>

          {/* Delivery method cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setContact((prev) => ({ ...prev, deliveryMethod: "Send med gratis label" }))}
              className={`flex flex-col gap-2 rounded-2xl border-2 p-6 text-left transition-all ${
                contact.deliveryMethod === "Send med gratis label"
                  ? "border-green-eco bg-green-eco/5 shadow-md shadow-green-eco/10"
                  : "border-soft-grey bg-white hover:border-green-eco/30"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`h-10 w-10 ${contact.deliveryMethod === "Send med gratis label" ? "text-green-eco" : "text-charcoal/50"}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              <span className="font-display text-base font-bold text-charcoal">Send med gratis label</span>
              <span className="text-sm text-gray">Vi sender et forsendelseslabel til din email. Betaling ved modtagelse.</span>
            </button>

            <button
              type="button"
              onClick={() => setContact((prev) => ({ ...prev, deliveryMethod: "Aflever i butik" }))}
              className={`flex flex-col gap-2 rounded-2xl border-2 p-6 text-left transition-all ${
                contact.deliveryMethod === "Aflever i butik"
                  ? "border-green-eco bg-green-eco/5 shadow-md shadow-green-eco/10"
                  : "border-soft-grey bg-white hover:border-green-eco/30"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`h-10 w-10 ${contact.deliveryMethod === "Aflever i butik" ? "text-green-eco" : "text-charcoal/50"}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
              </svg>
              <span className="font-display text-base font-bold text-charcoal">Aflever i butik</span>
              <span className="text-sm text-gray">Kom forbi Slagelse eller Vejle — straksoverførsel på stedet.</span>
            </button>
          </div>

          {/* Store selector (if in-store) */}
          {contact.deliveryMethod === "Aflever i butik" && (
            <div className="flex flex-col gap-2">
              <label htmlFor="preferredStore" className={labelStyles}>Vælg butik</label>
              <select
                id="preferredStore"
                value={contact.preferredStore}
                onChange={(e) => setContact((prev) => ({ ...prev, preferredStore: e.target.value }))}
                className={inputStyles}
              >
                <option value="Slagelse">PhoneSpot Slagelse — Vestsjællandscentret 10A, 103</option>
                <option value="Vejle">PhoneSpot Vejle — Åbner april 2026</option>
              </select>
            </div>
          )}

          <div className="h-px bg-soft-grey" />

          {/* Contact info */}
          <div>
            <h3 className="font-display text-lg font-bold text-charcoal">Dine kontaktoplysninger</h3>
            <p className="mt-1 text-sm text-gray">Vi kontakter dig med et tilbud på {devices.length > 1 ? "dine enheder" : "din enhed"}.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="contactName" className={labelStyles}>Navn <span className="text-red-500">*</span></label>
            <input
              id="contactName"
              type="text"
              required
              placeholder="Dit fulde navn"
              value={contact.name}
              onChange={(e) => setContact((prev) => ({ ...prev, name: e.target.value }))}
              className={inputStyles}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="contactPhone" className={labelStyles}>Telefon <span className="text-red-500">*</span></label>
              <input
                id="contactPhone"
                type="tel"
                required
                placeholder="+45 XX XX XX XX"
                value={contact.phone}
                onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))}
                className={inputStyles}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="contactEmail" className={labelStyles}>Email <span className="text-red-500">*</span></label>
              <input
                id="contactEmail"
                type="email"
                required
                placeholder="din@email.dk"
                value={contact.email}
                onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
                className={inputStyles}
              />
            </div>
          </div>

          <RadioGroup
            label="Foretrukken kontaktmetode"
            options={["Ring mig", "SMS", "Email"]}
            value={contact.preferredContact}
            onChange={(v) => setContact((prev) => ({ ...prev, preferredContact: v }))}
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="comment" className={labelStyles}>Kommentar (valgfri)</label>
            <textarea
              id="comment"
              placeholder="Har du yderligere information om enhederne?"
              rows={3}
              value={contact.comment}
              onChange={(e) => setContact((prev) => ({ ...prev, comment: e.target.value }))}
              className={inputStyles}
            />
          </div>

          {/* Multi-device summary */}
          <div className="rounded-2xl bg-gradient-to-b from-charcoal/[0.04] to-charcoal/[0.02] p-6 border border-soft-grey">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray">
              {devices.length > 1 ? `${devices.length} enheder` : "Din enhed"}
            </p>
            <div className="space-y-4">
              {devices.map((entry, i) => (
                <div
                  key={entry.id}
                  className={devices.length > 1 ? "border-b border-soft-grey pb-4 last:border-0 last:pb-0" : ""}
                >
                  {devices.length > 1 && (
                    <p className="mb-2 text-xs font-bold text-green-eco">Enhed {i + 1}</p>
                  )}
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray">Enhed</dt>
                      <dd className="font-medium text-charcoal">
                        {entry.device.brand} {entry.device.model}
                      </dd>
                    </div>
                    {entry.device.storage && (
                      <div className="flex justify-between">
                        <dt className="text-gray">Lagerplads</dt>
                        <dd className="font-medium text-charcoal">{entry.device.storage}</dd>
                      </div>
                    )}
                    {entry.device.ram && (
                      <div className="flex justify-between">
                        <dt className="text-gray">RAM</dt>
                        <dd className="font-medium text-charcoal">{entry.device.ram}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-gray">Skærm</dt>
                      <dd className="font-medium text-charcoal">{entry.condition.screen}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray">{entry.device.deviceType === "Laptop" ? "Krop" : "Bagside"}</dt>
                      <dd className="font-medium text-charcoal">{entry.condition.back}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray">Batteri</dt>
                      <dd className="font-medium text-charcoal">{entry.condition.battery}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
            {contact.deliveryMethod && (
              <div className="mt-4 flex justify-between border-t border-soft-grey pt-3 text-sm">
                <dt className="text-gray">Levering</dt>
                <dd className="font-medium text-green-eco">{contact.deliveryMethod}</dd>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Navigation ---- */}
      <div className="mt-10 flex justify-between gap-4">
        {step > 0 ? (
          <button
            type="button"
            onClick={goPrev}
            className="flex items-center gap-2 rounded-full border border-soft-grey bg-white px-8 py-4 text-sm font-bold text-charcoal transition-colors hover:bg-sand"
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
          onClick={goNext}
          disabled={!canGoNext || status === "submitting"}
          className="flex items-center gap-2 rounded-full bg-green-eco px-10 py-4 text-base font-bold text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-green-eco/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {status === "submitting" ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sender...
            </>
          ) : step === STEPS.length - 1 ? (
            <>
              Send til vurdering
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
    </div>
  );
}
