"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import { normalizeStoreId } from "@/lib/stores";
import { STORES } from "@/lib/store-config";
import { customerFacingError } from "@/lib/customer-facing-error";

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

interface DeviceInfo {
  deviceType: string;
  brand: string;
  model: string;
  storage: string;
  ram: string;
  /** Set to true when user clicked "Min enhed findes ikke" */
  useCustom: boolean;
  brandCustom: string;
  modelCustom: string;
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

const EMPTY_DEVICE: DeviceInfo = {
  deviceType: "",
  brand: "",
  model: "",
  storage: "",
  ram: "",
  useCustom: false,
  brandCustom: "",
  modelCustom: "",
};
const EMPTY_CONDITION: ConditionInfo = { screen: "", back: "", battery: "", allWorking: "", brokenParts: [], cloudLocked: "" };

function makeEntry(): DeviceEntry {
  return { id: crypto.randomUUID(), device: { ...EMPTY_DEVICE }, condition: { ...EMPTY_CONDITION, brokenParts: [] } };
}

/* ---- Device categories with icons ---- */
const DEVICE_CATEGORIES = [
  {
    type: "Telefon",
    label: "Telefon",
    sublabel: "iPhone, Samsung m.fl.",
    icon: (
      <StorefrontIcon kind="phone" className="h-7 w-7" />
    ),
  },
  {
    type: "Tablet",
    label: "Tablet",
    sublabel: "iPad, Galaxy Tab m.fl.",
    icon: (
      <StorefrontIcon kind="tablet" className="h-7 w-7" />
    ),
  },
  {
    type: "Laptop",
    label: "Laptop",
    sublabel: "MacBook, ThinkPad m.fl.",
    icon: (
      <StorefrontIcon kind="laptop" className="h-7 w-7" />
    ),
  },
  {
    type: "Smartwatch",
    label: "Smartwatch",
    sublabel: "Apple Watch, Galaxy Watch",
    icon: (
      <StorefrontIcon kind="watch" className="h-7 w-7" />
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

/* ---- Condition SVG icons (replaces emoji) ---- */
const CONDITION_ICONS: Record<string, React.ReactNode> = {
  perfect: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  minor: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
  ),
  damaged: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  broken: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  ),
};

function conditionIcon(opt: string): React.ReactNode {
  if (opt === "Perfekt") return CONDITION_ICONS.perfect;
  if (opt === "Små ridser" || opt === "Ridser" || opt === "Buler/ridser") return CONDITION_ICONS.minor;
  if (opt === "Revnet" || opt === "Skærmfejl" || opt === "Knækket") return CONDITION_ICONS.damaged;
  return CONDITION_ICONS.broken;
}

function conditionIconColor(opt: string): string {
  if (opt === "Perfekt") return "text-[#1A3D2E]";
  if (opt === "Små ridser" || opt === "Ridser" || opt === "Buler/ridser") return "text-amber-500";
  if (opt === "Revnet" || opt === "Skærmfejl" || opt === "Knækket") return "text-orange-500";
  return "text-red-500";
}

/* ---- Brand / model data per device type ---- */
interface BrandEntry {
  name: string;
  models: string[];
}

const BRANDS_BY_TYPE: Record<string, BrandEntry[]> = {
  Telefon: [
    {
      name: "Apple",
      models: [
        "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16",
        "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
        "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
        "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13 mini", "iPhone 13",
        "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12 mini", "iPhone 12",
        "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
        "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X",
        "iPhone SE (3. gen)", "iPhone SE (2. gen)",
      ],
    },
    {
      name: "Samsung",
      models: [
        "Galaxy S25 Ultra", "Galaxy S25+", "Galaxy S25",
        "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24",
        "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23",
        "Galaxy S22 Ultra", "Galaxy S22+", "Galaxy S22",
        "Galaxy S21 Ultra", "Galaxy S21+", "Galaxy S21",
        "Galaxy Z Fold 6", "Galaxy Z Fold 5", "Galaxy Z Fold 4",
        "Galaxy Z Flip 6", "Galaxy Z Flip 5", "Galaxy Z Flip 4",
        "Galaxy A55", "Galaxy A54", "Galaxy A53", "Galaxy A35", "Galaxy A34",
        "Galaxy A15", "Galaxy A14",
      ],
    },
    {
      name: "Google",
      models: [
        "Pixel 9 Pro XL", "Pixel 9 Pro", "Pixel 9",
        "Pixel 8 Pro", "Pixel 8", "Pixel 7 Pro", "Pixel 7", "Pixel 6 Pro", "Pixel 6",
      ],
    },
    {
      name: "OnePlus",
      models: [
        "OnePlus 13", "OnePlus 12", "OnePlus 11", "OnePlus 10 Pro",
        "OnePlus Nord 4", "OnePlus Nord 3", "OnePlus Nord 2T",
      ],
    },
    {
      name: "Xiaomi",
      models: [
        "Xiaomi 14 Ultra", "Xiaomi 14", "Xiaomi 13 Pro", "Xiaomi 13",
        "Redmi Note 13 Pro+", "Redmi Note 13 Pro", "Redmi Note 13",
        "Redmi Note 12", "POCO X6 Pro", "POCO X6",
      ],
    },
    {
      name: "Huawei",
      models: [
        "P60 Pro", "P50 Pro", "P50", "P40 Pro", "P40",
        "Mate 60 Pro", "Mate 50 Pro", "Mate 40 Pro",
        "Nova 12", "Nova 11",
      ],
    },
    {
      name: "Sony",
      models: [
        "Xperia 1 VI", "Xperia 1 V", "Xperia 5 VI", "Xperia 5 V",
        "Xperia 10 VI", "Xperia 10 V",
      ],
    },
    {
      name: "Motorola",
      models: [
        "Edge 50 Ultra", "Edge 50 Pro", "Edge 50",
        "Razr 50 Ultra", "Razr 50",
        "Moto G85", "Moto G54",
      ],
    },
    {
      name: "Nokia",
      models: ["Nokia G42", "Nokia G22", "Nokia XR21", "Nokia X30"],
    },
    {
      name: "Oppo",
      models: [
        "Find X8 Pro", "Find X7 Ultra", "Reno 12 Pro", "Reno 11 Pro",
        "A98", "A78",
      ],
    },
  ],
  Tablet: [
    {
      name: "Apple",
      models: [
        "iPad Pro 13\" (M4)", "iPad Pro 11\" (M4)",
        "iPad Pro 13\" (M2)", "iPad Pro 11\" (M2)",
        "iPad Air 13\" (M2)", "iPad Air 11\" (M2)",
        "iPad Air (M1)", "iPad (10. gen)", "iPad (9. gen)",
        "iPad mini (7. gen)", "iPad mini (6. gen)",
      ],
    },
    {
      name: "Samsung",
      models: [
        "Galaxy Tab S10 Ultra", "Galaxy Tab S10+", "Galaxy Tab S10",
        "Galaxy Tab S9 Ultra", "Galaxy Tab S9+", "Galaxy Tab S9",
        "Galaxy Tab S8 Ultra", "Galaxy Tab S8+", "Galaxy Tab S8",
        "Galaxy Tab A9+", "Galaxy Tab A9", "Galaxy Tab A8",
      ],
    },
    {
      name: "Lenovo",
      models: ["Tab P12 Pro", "Tab P11 Pro Gen 2", "Tab P11 Gen 2", "Tab M11"],
    },
    {
      name: "Huawei",
      models: ["MatePad Pro 13.2", "MatePad Pro 11", "MatePad 11.5"],
    },
    {
      name: "Microsoft",
      models: ["Surface Pro 11", "Surface Pro 10", "Surface Pro 9", "Surface Go 4"],
    },
  ],
  Laptop: [
    {
      name: "Apple",
      models: [
        "MacBook Pro 16\" (M4)", "MacBook Pro 14\" (M4)",
        "MacBook Pro 16\" (M3)", "MacBook Pro 14\" (M3)",
        "MacBook Pro 16\" (M2)", "MacBook Pro 14\" (M2)",
        "MacBook Air 15\" (M3)", "MacBook Air 13\" (M3)",
        "MacBook Air 15\" (M2)", "MacBook Air 13\" (M2)",
      ],
    },
    {
      name: "Lenovo",
      models: [
        "ThinkPad X1 Carbon Gen 12", "ThinkPad X1 Carbon Gen 11",
        "ThinkPad T14s Gen 5", "ThinkPad T14s Gen 4",
        "ThinkPad E14 Gen 5", "ThinkPad E15 Gen 4",
        "IdeaPad Slim 5", "IdeaPad Slim 3",
        "Yoga Slim 7", "Yoga Pro 7",
      ],
    },
    {
      name: "Dell",
      models: [
        "XPS 15 (2024)", "XPS 13 (2024)", "XPS 15 (2023)", "XPS 13 (2023)",
        "Inspiron 15 3000", "Inspiron 14 5000",
        "Latitude 5540", "Latitude 7440",
      ],
    },
    {
      name: "HP",
      models: [
        "EliteBook 840 G11", "EliteBook 860 G11",
        "ProBook 445 G11", "ProBook 450 G9",
        "Spectre x360 14", "Envy x360 15",
        "Pavilion 15", "Laptop 15s",
      ],
    },
    {
      name: "ASUS",
      models: [
        "ZenBook 14 OLED", "ZenBook Pro 16X",
        "VivoBook S 15", "VivoBook 15",
        "ROG Zephyrus G14", "ROG Strix G16",
        "ExpertBook B9",
      ],
    },
    {
      name: "Microsoft",
      models: [
        "Surface Laptop 7", "Surface Laptop 6", "Surface Laptop 5",
        "Surface Laptop Studio 2", "Surface Laptop Go 3",
      ],
    },
    {
      name: "Acer",
      models: [
        "Swift Go 14", "Swift 3", "Aspire 5",
        "Predator Helios 16", "Nitro 5",
        "ConceptD 5 Pro",
      ],
    },
    {
      name: "LG",
      models: ["LG gram 17", "LG gram 16", "LG gram 14", "LG gram 13"],
    },
  ],
  Smartwatch: [
    {
      name: "Apple",
      models: [
        "Apple Watch Ultra 2", "Apple Watch Series 10",
        "Apple Watch Series 9", "Apple Watch Series 8",
        "Apple Watch SE (2. gen)", "Apple Watch Series 7",
        "Apple Watch SE (1. gen)", "Apple Watch Series 6",
      ],
    },
    {
      name: "Samsung",
      models: [
        "Galaxy Watch 7", "Galaxy Watch Ultra",
        "Galaxy Watch 6", "Galaxy Watch 6 Classic",
        "Galaxy Watch 5 Pro", "Galaxy Watch 5",
        "Galaxy Watch 4 Classic", "Galaxy Watch 4",
      ],
    },
    {
      name: "Google",
      models: ["Pixel Watch 3 XL", "Pixel Watch 3", "Pixel Watch 2", "Pixel Watch"],
    },
    {
      name: "Garmin",
      models: ["Fenix 8", "Fenix 7 Pro", "Forerunner 965", "Venu 3"],
    },
    {
      name: "Fitbit",
      models: ["Fitbit Sense 2", "Fitbit Versa 4"],
    },
    {
      name: "Fossil",
      models: ["Fossil Gen 6", "Fossil Gen 5"],
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Progress Bar                                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({ current }: { current: number }) {
  return (
    <nav
      aria-label="Trin i vurderingen"
      className="mb-6 border-b border-soft-grey"
    >
      <ol className="flex gap-2 sm:gap-4">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === current ? "step" : undefined}
            className={`flex min-w-0 flex-1 items-center gap-2 border-b-2 pb-3 text-xs font-medium ${i === current ? "border-green-eco text-green-eco" : "border-transparent text-gray"}`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${i <= current ? "bg-green-eco text-white" : "bg-sand text-gray"}`}
              aria-hidden="true"
            >
              {i < current ? (
                <StorefrontIcon kind="check" className="h-3 w-3" />
              ) : (
                i + 1
              )}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Radio Group                                                        */
/* ------------------------------------------------------------------ */

const DISPLAY_LABELS: Record<string, string> = {
  "God (80%+)": "Godt (80%+)",
  "Ring mig": "Ring til mig",
  Email: "E-mail",
  Højtaler: "Højttaler",
  WiFi: "Wi-Fi",
  "Skærm-touch": "Touchskærm",
};

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
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <p className="text-sm font-bold text-charcoal">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            aria-pressed={value === opt}
            onClick={() => onChange(opt)}
            className={`rounded-md border px-4 py-2.5 text-sm font-medium transition-all ${
              value === opt
                ? "border-green-eco bg-green-eco/5 text-green-eco"
                : "border-soft-grey text-charcoal hover:border-green-eco/30"
            }`}
          >
            {DISPLAY_LABELS[opt] ?? opt}
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
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <p className="text-sm font-bold text-charcoal">{label}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {options.map((opt) => {
          const isSelected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={value === opt}
              onClick={() => onChange(opt)}
              className={`flex flex-col items-center gap-2 rounded-md border p-4 text-center transition-all ${
                isSelected
                  ? "border-[#1A3D2E] bg-[#1A3D2E]/5 shadow-sm"
                  : "border-[#E5E5EA] hover:border-[#1A3D2E]/30"
              }`}
            >
              <span
                className={
                  isSelected ? "text-[#1A3D2E]" : conditionIconColor(opt)
                }
              >
                {conditionIcon(opt)}
              </span>
              <span className="text-sm font-bold text-[#111111]">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Searchable Select                                                   */
/* ------------------------------------------------------------------ */

function SearchableSelect({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(
    () =>
      options.filter((option) =>
        option.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [options, query],
  );

  useEffect(() => {
    function outside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  function close() {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    triggerRef.current?.focus();
  }
  function select(option: string) {
    onChange(option);
    close();
  }
  function keyboard(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered.length === 0) {
        setActiveIndex(-1);
        return;
      }
      const index =
        event.key === "ArrowDown"
          ? Math.min(activeIndex + 1, filtered.length - 1)
          : Math.max(activeIndex - 1, 0);
      setActiveIndex(index);
      document
        .getElementById(`${id}-option-${index}`)
        ?.scrollIntoView?.({ block: "nearest" });
    }
    if (event.key === "Enter" && activeIndex >= 0 && filtered[activeIndex]) {
      event.preventDefault();
      select(filtered[activeIndex]);
    }
  }
  return (
    <div
      className="flex min-w-0 flex-col gap-2"
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false);
          setQuery("");
          setActiveIndex(-1);
        }
      }}
    >
      <label htmlFor={id} className="text-sm font-bold text-charcoal">
        {label}
      </label>
      <div className="relative">
        <button
          id={id}
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? `${id}-options` : undefined}
          onClick={() => {
            setOpen(!open);
            setActiveIndex(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex(options.length > 0 ? 0 : -1);
            }
          }}
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md border border-soft-grey bg-white px-4 py-3 text-left text-sm text-charcoal disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="min-w-0 break-words">{value || placeholder}</span>
          <span aria-hidden="true" className="shrink-0 text-gray">
            ⌄
          </span>
        </button>
        {open && (
          <div
            className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-soft-grey bg-white shadow-lg"
            onKeyDown={keyboard}
          >
            <div className="border-b border-soft-grey p-2">
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-label={`Søg efter ${label.toLowerCase()}`}
                aria-expanded="true"
                aria-autocomplete="list"
                aria-controls={`${id}-options`}
                aria-activedescendant={
                  activeIndex >= 0 && activeIndex < filtered.length
                    ? `${id}-option-${activeIndex}`
                    : undefined
                }
                placeholder="Søg..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(-1);
                }}
                className="w-full rounded-md bg-sand px-3 py-2 text-base text-charcoal focus:outline-none"
              />
            </div>
            <ul
              id={`${id}-options`}
              role="listbox"
              aria-label={label}
              className="max-h-60 overflow-y-auto py-1"
            >
              {filtered.map((option, index) => (
                <li key={option} role="presentation">
                  <button
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={value === option}
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(option)}
                    className={`w-full px-4 py-3 text-left text-sm ${index === activeIndex ? "bg-sand" : "hover:bg-sand"} ${value === option ? "font-bold text-green-eco" : "text-charcoal"}`}
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>
            {filtered.length === 0 && (
              <p role="status" className="px-4 py-3 text-sm text-gray">
                Ingen resultater
              </p>
            )}
          </div>
        )}
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

  const [devices, setDevices] = useState<DeviceEntry[]>(() => [makeEntry()]);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) {
      stepHeadingRef.current?.focus();
      previousStep.current = step;
    }
  }, [step]);
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
      prev.map((d, i) =>
        i === index ? { ...d, device: { ...d.device, ...updates } } : d,
      ),
    );
  }

  function updateCondition(index: number, updates: Partial<ConditionInfo>) {
    setDevices((prev) =>
      prev.map((d, i) =>
        i === index ? { ...d, condition: { ...d.condition, ...updates } } : d,
      ),
    );
  }

  function toggleBrokenPart(part: string) {
    const current = activeCondition.brokenParts;
    updateCondition(activeDeviceIndex, {
      brokenParts: current.includes(part)
        ? current.filter((p) => p !== part)
        : [...current, part],
    });
  }

  const inputStyles =
    "w-full rounded-md border border-soft-grey bg-white px-4 py-3 text-base text-charcoal placeholder:text-gray/40 focus:border-green-eco focus:outline-none focus:ring-4 focus:ring-green-eco/10 transition-all";

  const labelStyles = "text-sm font-bold text-charcoal";

  const isPhone = activeDevice.device.deviceType === "Telefon";
  const isTablet = activeDevice.device.deviceType === "Tablet";
  const isLaptop = activeDevice.device.deviceType === "Laptop";
  const showCloudLock = isPhone || isTablet;

  /* ---- validation ---- */
  const canGoNext = useMemo(() => {
    switch (step) {
      case 0:
        // Every device must have deviceType, and either (brand+model) or (brandCustom+modelCustom)
        return devices.every((entry) => {
          const d = entry.device;
          if (!d.deviceType) return false;
          if (d.useCustom)
            return !!(d.brandCustom.trim() && d.modelCustom.trim());
          return !!(d.brand && d.model);
        });
      case 1: {
        // Every device must have screen, back, battery, allWorking (+ cloudLocked if applicable)
        return devices.every((entry) => {
          const c = entry.condition;
          const d = entry.device;
          const baseValid = !!(c.screen && c.back && c.battery && c.allWorking);
          const needsCloudLock =
            d.deviceType === "Telefon" || d.deviceType === "Tablet";
          if (needsCloudLock) return baseValid && !!c.cloudLocked;
          return baseValid;
        });
      }
      case 2:
        return !!(
          contact.name.trim() &&
          contact.email.trim() &&
          contact.phone.trim() &&
          contact.deliveryMethod
        );
      default:
        return false;
    }
  }, [step, devices, contact]);

  /* ---- build message ---- */
  function buildMessage(): string {
    const parts = devices.map((entry, i) => {
      const { device: d, condition: c } = entry;
      const needsCloudLock =
        d.deviceType === "Telefon" || d.deviceType === "Tablet";
      const lines = [
        devices.length > 1 ? `\n--- Enhed ${i + 1} ---` : null,
        `Enhedstype: ${d.deviceType}`,
        `Mærke: ${d.useCustom ? d.brandCustom : d.brand}`,
        `Model: ${d.useCustom ? d.modelCustom : d.model}`,
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
      contact.deliveryMethod === "Aflever i butik"
        ? `Foretrukken butik: ${contact.preferredStore}`
        : null,
      `Foretrukken kontakt: ${contact.preferredContact}`,
      contact.comment ? `Kommentar: ${contact.comment}` : null,
    ];

    return [...parts, ...deliveryLines.filter(Boolean)].join("\n");
  }

  /* ---- submit ---- */
  async function handleSubmit() {
    if (!canGoNext || status === "submitting") return;
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
          subject:
            devices.length > 1
              ? `Sælg enheder (${devices.length})`
              : "Sælg enhed",
          message: buildMessage(),
          source: "saelg-enhed",
          store_id:
            contact.deliveryMethod === "Aflever i butik"
              ? normalizeStoreId(contact.preferredStore)
              : null,
          metadata: {
            devices: devices.map((e) => ({
              device: e.device,
              condition: e.condition,
            })),
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
      setErrorMessage(
        customerFacingError(
          err,
          "Kunne ikke sende anmodningen. Prøv igen.",
          ["Udfyld alle felter", "Kunne ikke sende besked"],
        ),
      );
    }
  }

  const goNext = () => {
    if (!canGoNext || status === "submitting") return;
    if (step === STEPS.length - 1) {
      handleSubmit();
    } else {
      // When moving to condition step, land on first device that needs filling
      if (step === 0) {
        const firstIncomplete = devices.findIndex(
          (e) =>
            !e.condition.screen ||
            !e.condition.back ||
            !e.condition.battery ||
            !e.condition.allWorking,
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
      <div className="rounded-xl border border-green-eco/20 bg-[#eef0eb] p-6 font-body text-center sm:p-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-green-eco">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={2.5}
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="font-body text-2xl font-bold text-charcoal">
          Tak for din henvendelse!
        </h2>
        <p className="mt-3 text-gray">
          Vi har modtaget dine oplysninger og vurderer{" "}
          {devices.length > 1 ? `dine ${devices.length} enheder` : "din enhed"}{" "}
          hurtigst muligt. Vi kontakter dig, når vi har gennemgået
          oplysningerne.
        </p>
        {contact.deliveryMethod === "Aflever i butik" && (
          <p className="mt-4 text-sm font-medium text-green-eco">
            Du har valgt at aflevere i PhoneSpot {contact.preferredStore} — vi
            kontakter dig med detaljer.
          </p>
        )}
        {contact.deliveryMethod === "Send med gratis label" && (
          <p className="mt-4 text-sm font-medium text-green-eco">
            Når du accepterer tilbuddet, sender vi en gratis forsendelseslabel
            til din e-mail.
          </p>
        )}
      </div>
    );
  }

  /* ---- Render ---- */
  return (
    <div className="rounded-xl border border-soft-grey bg-white p-5 font-body sm:p-7">
      <ProgressBar current={step} />
      <fieldset disabled={status === "submitting"} className="min-w-0">
        {status === "error" && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            {errorMessage}
          </div>
        )}

        {/* ==== Step 1: Devices ==== */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2
                ref={stepHeadingRef}
                tabIndex={-1}
                className="scroll-mt-36 font-body text-2xl font-semibold text-charcoal outline-none"
              >
                Hvad vil du sælge?
              </h2>
              <p className="mt-1 text-base text-gray">
                Vælg enhedstype, og fortæl os om din model.
              </p>
            </div>

            {/* Already added devices summary */}
            {devices.some(
              (d) =>
                d.device.model || (d.device.useCustom && d.device.modelCustom),
            ) && (
              <div className="space-y-2">
                <p className="text-xs font-bold tracking-normal text-gray">
                  Dine enheder
                </p>
                {devices.map((entry, i) => {
                  const hasModel =
                    entry.device.model ||
                    (entry.device.useCustom && entry.device.modelCustom);
                  return hasModel ? (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between rounded-md border p-4 transition-all ${
                        i === activeDeviceIndex
                          ? "border-green-eco bg-green-eco/5"
                          : "border-soft-grey"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-eco text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-charcoal">
                            {entry.device.useCustom
                              ? `${entry.device.brandCustom} ${entry.device.modelCustom}`
                              : `${entry.device.brand} ${entry.device.model}`}
                          </p>
                          <p className="text-xs text-gray">
                            {entry.device.deviceType} ·{" "}
                            {entry.device.storage || "Ikke valgt"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveDeviceIndex(i)}
                          aria-label={`Rediger enhed ${i + 1}`}
                          className="min-h-11 px-2 text-xs font-semibold text-green-eco hover:underline"
                        >
                          Rediger
                        </button>
                        {devices.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setDevices((prev) =>
                                prev.filter((_, j) => j !== i),
                              );
                              if (activeDeviceIndex >= devices.length - 1) {
                                setActiveDeviceIndex(
                                  Math.max(0, devices.length - 2),
                                );
                              }
                            }}
                            aria-label={`Fjern enhed ${i + 1}`}
                            className="min-h-11 px-2 text-xs font-semibold text-red-500 hover:underline"
                          >
                            Fjern
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            {/* Active device form */}
            {devices.length > 1 && (
              <p className="text-xs font-bold tracking-normal text-gray">
                {activeDevice.device.model
                  ? `Redigerer enhed ${activeDeviceIndex + 1}`
                  : `Ny enhed ${activeDeviceIndex + 1}`}
              </p>
            )}

            {/* Device category cards */}
            <div className="grid grid-cols-2 gap-3">
              {DEVICE_CATEGORIES.map((cat) => (
                <button
                  key={cat.type}
                  type="button"
                  aria-pressed={activeDevice.device.deviceType === cat.type}
                  onClick={() => {
                    if (activeDevice.device.deviceType === cat.type) return;
                    updateDevice(activeDeviceIndex, {
                      ...EMPTY_DEVICE,
                      deviceType: cat.type,
                    });
                    updateCondition(activeDeviceIndex, {
                      screen: "",
                      back: "",
                      battery: "",
                      allWorking: "",
                      brokenParts: [],
                      cloudLocked: "",
                    });
                  }}
                  className={`relative flex flex-col items-center gap-2 rounded-md border px-3 py-4 text-center transition-all ${
                    activeDevice.device.deviceType === cat.type
                      ? "border-green-eco bg-[#eef0eb]"
                      : "border-soft-grey bg-white hover:border-green-eco/50"
                  }`}
                >
                  {activeDevice.device.deviceType === cat.type && (
                    <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-eco text-white">
                      <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                  <span
                    className={
                      activeDevice.device.deviceType === cat.type
                        ? "text-green-eco"
                        : "text-charcoal/60"
                    }
                  >
                    {cat.icon}
                  </span>
                  <span className="font-body text-sm font-semibold text-charcoal">
                    {cat.label}
                  </span>
                  <span className="text-xs text-gray">{cat.sublabel}</span>
                </button>
              ))}
            </div>

            {/* Brand & Model */}
            {activeDevice.device.deviceType && (
              <>
                {!activeDevice.device.useCustom ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SearchableSelect
                        id={`brand-${activeDeviceIndex}`}
                        label="Mærke"
                        placeholder="Vælg mærke"
                        options={(
                          BRANDS_BY_TYPE[activeDevice.device.deviceType] ?? []
                        ).map((b) => b.name)}
                        value={activeDevice.device.brand}
                        onChange={(val) =>
                          updateDevice(activeDeviceIndex, {
                            brand: val,
                            model: "",
                          })
                        }
                      />
                      <SearchableSelect
                        id={`model-${activeDeviceIndex}`}
                        label="Model"
                        placeholder={
                          activeDevice.device.brand
                            ? "Vælg model"
                            : "Vælg mærke først"
                        }
                        options={
                          activeDevice.device.brand
                            ? ((
                                BRANDS_BY_TYPE[
                                  activeDevice.device.deviceType
                                ] ?? []
                              ).find(
                                (b) => b.name === activeDevice.device.brand,
                              )?.models ?? [])
                            : []
                        }
                        value={activeDevice.device.model}
                        onChange={(val) =>
                          updateDevice(activeDeviceIndex, { model: val })
                        }
                        disabled={!activeDevice.device.brand}
                      />
                    </div>

                    {/* "Not in list" escape hatch */}
                    <button
                      type="button"
                      onClick={() =>
                        updateDevice(activeDeviceIndex, {
                          useCustom: true,
                          brand: "",
                          model: "",
                          brandCustom: "",
                          modelCustom: "",
                        })
                      }
                      className="flex items-center gap-1.5 text-sm font-medium text-[#6E6E73] hover:text-[#1A3D2E] transition-colors"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-3.5 w-3.5 shrink-0"
                      >
                        <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                      </svg>
                      Min enhed findes ikke på listen
                    </button>
                  </>
                ) : (
                  <>
                    <div className="rounded-md border border-[#E5E5EA] bg-[#F7F7F8] p-4">
                      <p className="mb-3 text-sm font-bold text-[#111111]">
                        Beskriv din enhed
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                          <label
                            htmlFor={`brand-custom-${activeDeviceIndex}`}
                            className="text-sm font-bold text-[#111111]"
                          >
                            Mærke
                          </label>
                          <input
                            id={`brand-custom-${activeDeviceIndex}`}
                            type="text"
                            placeholder="f.eks. Fairphone"
                            value={activeDevice.device.brandCustom}
                            onChange={(e) =>
                              updateDevice(activeDeviceIndex, {
                                brandCustom: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-[#E5E5EA] bg-white px-4 py-3 text-base text-[#111111] placeholder:text-[#6E6E73]/50 focus:border-[#1A3D2E] focus:outline-none focus:ring-4 focus:ring-[#1A3D2E]/10 transition-all"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label
                            htmlFor={`model-custom-${activeDeviceIndex}`}
                            className="text-sm font-bold text-[#111111]"
                          >
                            Model
                          </label>
                          <input
                            id={`model-custom-${activeDeviceIndex}`}
                            type="text"
                            placeholder="f.eks. Fairphone 5"
                            value={activeDevice.device.modelCustom}
                            onChange={(e) =>
                              updateDevice(activeDeviceIndex, {
                                modelCustom: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-[#E5E5EA] bg-white px-4 py-3 text-base text-[#111111] placeholder:text-[#6E6E73]/50 focus:border-[#1A3D2E] focus:outline-none focus:ring-4 focus:ring-[#1A3D2E]/10 transition-all"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateDevice(activeDeviceIndex, {
                            useCustom: false,
                            brandCustom: "",
                            modelCustom: "",
                          })
                        }
                        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#6E6E73] hover:text-[#1A3D2E] transition-colors"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="h-3.5 w-3.5 shrink-0"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Tilbage til listen
                      </button>
                    </div>
                  </>
                )}

                {/* Storage */}
                {STORAGE_OPTIONS[activeDevice.device.deviceType] && (
                  <div className="flex flex-col gap-2">
                    <label className={labelStyles}>Lagerplads</label>
                    <div className="flex flex-wrap gap-2">
                      {STORAGE_OPTIONS[activeDevice.device.deviceType].map(
                        (s) => (
                          <button
                            key={s}
                            type="button"
                            aria-pressed={activeDevice.device.storage === s}
                            onClick={() =>
                              updateDevice(activeDeviceIndex, { storage: s })
                            }
                            className={`rounded-md border px-4 py-2.5 text-sm font-medium transition-all ${
                              activeDevice.device.storage === s
                                ? "border-green-eco bg-green-eco/5 text-green-eco"
                                : "border-soft-grey text-charcoal hover:border-green-eco/30"
                            }`}
                          >
                            {s}
                          </button>
                        ),
                      )}
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
                          aria-pressed={activeDevice.device.ram === r}
                          onClick={() =>
                            updateDevice(activeDeviceIndex, { ram: r })
                          }
                          className={`rounded-md border px-4 py-2.5 text-sm font-medium transition-all ${
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
            {(activeDevice.device.model ||
              (activeDevice.device.useCustom &&
                activeDevice.device.modelCustom)) && (
              <button
                type="button"
                onClick={() => {
                  const newEntry = makeEntry();
                  setDevices((prev) => [...prev, newEntry]);
                  setActiveDeviceIndex(devices.length);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-green-eco/30 bg-green-eco/[0.02] py-4 text-sm font-bold text-green-eco transition-all hover:border-green-eco/50 hover:bg-green-eco/5"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
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
              <h2
                ref={stepHeadingRef}
                tabIndex={-1}
                className="scroll-mt-36 font-body text-2xl font-semibold text-charcoal outline-none"
              >
                Hvordan er standen?
              </h2>
              <p className="mt-1 text-base text-gray">
                Beskriv standen, så vi kan vurdere din enhed.
              </p>
            </div>

            <p className="rounded-md border border-soft-grey bg-[#f7f7f8] px-4 py-3 text-sm text-charcoal">
              <span className="text-gray">Du vurderer: </span>
              {activeDevice.device.useCustom
                ? `${activeDevice.device.brandCustom} ${activeDevice.device.modelCustom}`
                : `${activeDevice.device.brand} ${activeDevice.device.model}`}
              {activeDevice.device.storage
                ? ` · ${activeDevice.device.storage}`
                : ""}
            </p>

            {/* Device tabs when multiple devices */}
            {devices.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {devices.map((entry, i) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setActiveDeviceIndex(i)}
                    aria-pressed={i === activeDeviceIndex}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-bold transition-all ${
                      i === activeDeviceIndex
                        ? "bg-green-eco text-white"
                        : "border border-soft-grey bg-white text-charcoal hover:border-green-eco/30"
                    }`}
                  >
                    <span>{i + 1}.</span>{" "}
                    {entry.device.useCustom
                      ? `${entry.device.brandCustom} ${entry.device.modelCustom}`
                      : `${entry.device.brand} ${entry.device.model}`}
                  </button>
                ))}
              </div>
            )}

            {/* Condition for active device */}
            <ConditionCardGrid
              label="Skærm"
              options={
                SCREEN_OPTIONS[activeDevice.device.deviceType] ??
                SCREEN_OPTIONS.Telefon
              }
              value={activeCondition.screen}
              onChange={(v) =>
                updateCondition(activeDeviceIndex, { screen: v })
              }
            />

            <ConditionCardGrid
              label={isLaptop ? "Kabinet" : "Bagside"}
              options={
                BACK_OPTIONS[activeDevice.device.deviceType] ??
                BACK_OPTIONS.Telefon
              }
              value={activeCondition.back}
              onChange={(v) => updateCondition(activeDeviceIndex, { back: v })}
            />

            <RadioGroup
              label="Batteri"
              options={BATTERY_OPTIONS}
              value={activeCondition.battery}
              onChange={(v) =>
                updateCondition(activeDeviceIndex, { battery: v })
              }
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
              <div className="flex flex-col gap-2 rounded-md border border-soft-grey bg-sand/30 p-4">
                <p className="text-sm font-bold text-charcoal">
                  Hvad virker ikke?
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    BROKEN_PARTS[activeDevice.device.deviceType] ??
                    BROKEN_PARTS.Telefon
                  ).map((part) => (
                    <button
                      key={part}
                      type="button"
                      aria-pressed={activeCondition.brokenParts.includes(part)}
                      onClick={() => toggleBrokenPart(part)}
                      className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                        activeCondition.brokenParts.includes(part)
                          ? "border-red-400 bg-red-50 text-red-700"
                          : "border-soft-grey text-charcoal hover:border-red-300"
                      }`}
                    >
                      {DISPLAY_LABELS[part] ?? part}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showCloudLock && (
              <>
                <RadioGroup
                  label={
                    isPhone || isTablet
                      ? "iCloud / Google-konto låst?"
                      : "Konto låst?"
                  }
                  options={["Ja", "Nej", "Ved ikke"]}
                  value={activeCondition.cloudLocked}
                  onChange={(v) =>
                    updateCondition(activeDeviceIndex, { cloudLocked: v })
                  }
                />

                {activeCondition.cloudLocked === "Ja" && (
                  <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
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
                      <span className="font-bold">Bemærk:</span> Enheder med
                      aktiv iCloud- eller Google-lås kan vi desværre ikke
                      opkøbe. Du skal fjerne låsen inden salg.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Progress across devices when multiple */}
            {devices.length > 1 && (
              <div className="rounded-md border border-soft-grey bg-charcoal/[0.02] p-4">
                <p className="mb-3 text-xs font-bold tracking-normal text-gray">
                  Stand udfyldt
                </p>
                <div className="space-y-2">
                  {devices.map((entry, i) => {
                    const c = entry.condition;
                    const d = entry.device;
                    const needsCloud =
                      d.deviceType === "Telefon" || d.deviceType === "Tablet";
                    const filled = !!(
                      c.screen &&
                      c.back &&
                      c.battery &&
                      c.allWorking &&
                      (!needsCloud || c.cloudLocked)
                    );
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-charcoal">
                          {i + 1}.{" "}
                          {entry.device.useCustom
                            ? `${entry.device.brandCustom} ${entry.device.modelCustom}`
                            : `${entry.device.brand} ${entry.device.model}`}
                        </span>
                        {filled ? (
                          <span className="flex items-center gap-1 text-green-eco">
                            <svg
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-4 w-4"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                clipRule="evenodd"
                              />
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
              <h2
                ref={stepHeadingRef}
                tabIndex={-1}
                className="scroll-mt-36 font-body text-2xl font-semibold text-charcoal outline-none"
              >
                Hvordan vil du levere?
              </h2>
              <p className="mt-1 text-base text-gray">
                Vælg, om du vil sende{" "}
                {devices.length > 1 ? "dine enheder" : "din enhed"} eller
                aflevere i butikken.
              </p>
            </div>

            {/* Delivery method cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={
                  contact.deliveryMethod === "Send med gratis label"
                }
                onClick={() =>
                  setContact((prev) => ({
                    ...prev,
                    deliveryMethod: "Send med gratis label",
                  }))
                }
                className={`flex flex-col gap-2 rounded-xl border p-6 text-left transition-all ${
                  contact.deliveryMethod === "Send med gratis label"
                    ? "border-green-eco bg-[#eef0eb]"
                    : "border-soft-grey bg-white hover:border-green-eco/30"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={`h-6 w-6 ${contact.deliveryMethod === "Send med gratis label" ? "text-green-eco" : "text-charcoal/50"}`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
                <span className="font-body text-base font-bold text-charcoal">
                  Send med gratis label
                </span>
                <span className="text-sm text-gray">
                  Efter en aftale får du en label og oplysninger om indsendelse.
                </span>
              </button>

              <button
                type="button"
                aria-pressed={contact.deliveryMethod === "Aflever i butik"}
                onClick={() =>
                  setContact((prev) => ({
                    ...prev,
                    deliveryMethod: "Aflever i butik",
                  }))
                }
                className={`flex flex-col gap-2 rounded-xl border p-6 text-left transition-all ${
                  contact.deliveryMethod === "Aflever i butik"
                    ? "border-green-eco bg-[#eef0eb]"
                    : "border-soft-grey bg-white hover:border-green-eco/30"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={`h-6 w-6 ${contact.deliveryMethod === "Aflever i butik" ? "text-green-eco" : "text-charcoal/50"}`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
                  />
                </svg>
                <span className="font-body text-base font-bold text-charcoal">
                  Aflever i butik
                </span>
                <span className="text-sm text-gray">
                  Vælg Vejle eller Slagelse. Vi aftaler det videre forløb med
                  dig.
                </span>
              </button>
            </div>

            {/* Store selector (if in-store) */}
            {contact.deliveryMethod === "Aflever i butik" && (
              <div className="flex flex-col gap-2">
                <label htmlFor="preferredStore" className={labelStyles}>
                  Vælg butik
                </label>
                <select
                  id="preferredStore"
                  value={contact.preferredStore}
                  onChange={(e) =>
                    setContact((prev) => ({
                      ...prev,
                      preferredStore: e.target.value,
                    }))
                  }
                  className={inputStyles}
                >
                  <option value="Slagelse">
                    PhoneSpot Slagelse — {STORES.slagelse.street}
                  </option>
                  <option value="Vejle">
                    PhoneSpot Vejle — {STORES.vejle.street}
                  </option>
                </select>
              </div>
            )}

            <div className="h-px bg-soft-grey" />

            {/* Contact info */}
            <div>
              <h3 className="font-body text-lg font-bold text-charcoal">
                Dine kontaktoplysninger
              </h3>
              <p className="mt-1 text-sm text-gray">
                Vi kontakter dig om vurderingen af{" "}
                {devices.length > 1 ? "dine enheder" : "din enhed"}.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="contactName" className={labelStyles}>
                Navn <span className="text-red-500">*</span>
              </label>
              <input
                id="contactName"
                type="text"
                required
                placeholder="Dit fulde navn"
                value={contact.name}
                onChange={(e) =>
                  setContact((prev) => ({ ...prev, name: e.target.value }))
                }
                className={inputStyles}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="contactPhone" className={labelStyles}>
                  Telefon <span className="text-red-500">*</span>
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  required
                  placeholder="+45 XX XX XX XX"
                  value={contact.phone}
                  onChange={(e) =>
                    setContact((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className={inputStyles}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="contactEmail" className={labelStyles}>
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  required
                  placeholder="din@email.dk"
                  value={contact.email}
                  onChange={(e) =>
                    setContact((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className={inputStyles}
                />
              </div>
            </div>

            <RadioGroup
              label="Foretrukken kontaktmetode"
              options={["Ring mig", "SMS", "Email"]}
              value={contact.preferredContact}
              onChange={(v) =>
                setContact((prev) => ({ ...prev, preferredContact: v }))
              }
            />

            <div className="flex flex-col gap-2">
              <label htmlFor="comment" className={labelStyles}>
                Kommentar (valgfri)
              </label>
              <textarea
                id="comment"
                placeholder="Har du yderligere information om enhederne?"
                rows={3}
                value={contact.comment}
                onChange={(e) =>
                  setContact((prev) => ({ ...prev, comment: e.target.value }))
                }
                className={inputStyles}
              />
            </div>

            {/* Multi-device summary */}
            <div className="rounded-xl bg-[#f7f7f8] p-6 border border-soft-grey">
              <p className="mb-3 text-xs font-bold tracking-normal text-gray">
                {devices.length > 1 ? `${devices.length} enheder` : "Din enhed"}
              </p>
              <div className="space-y-4">
                {devices.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={
                      devices.length > 1
                        ? "border-b border-soft-grey pb-4 last:border-0 last:pb-0"
                        : ""
                    }
                  >
                    {devices.length > 1 && (
                      <p className="mb-2 text-xs font-bold text-green-eco">
                        Enhed {i + 1}
                      </p>
                    )}
                    <dl className="space-y-1.5 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray">Enhed</dt>
                        <dd className="max-w-[70%] break-words text-right font-medium text-charcoal">
                          {entry.device.useCustom
                            ? `${entry.device.brandCustom} ${entry.device.modelCustom}`
                            : `${entry.device.brand} ${entry.device.model}`}
                        </dd>
                      </div>
                      {entry.device.storage && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-gray">Lagerplads</dt>
                          <dd className="font-medium text-charcoal">
                            {entry.device.storage}
                          </dd>
                        </div>
                      )}
                      {entry.device.ram && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-gray">RAM</dt>
                          <dd className="font-medium text-charcoal">
                            {entry.device.ram}
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray">Skærm</dt>
                        <dd className="font-medium text-charcoal">
                          {entry.condition.screen}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray">
                          {entry.device.deviceType === "Laptop"
                            ? "Kabinet"
                            : "Bagside"}
                        </dt>
                        <dd className="font-medium text-charcoal">
                          {entry.condition.back}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray">Batteri</dt>
                        <dd className="font-medium text-charcoal">
                          {DISPLAY_LABELS[entry.condition.battery] ?? entry.condition.battery}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
              {contact.deliveryMethod && (
                <div className="mt-4 flex justify-between gap-3 border-t border-soft-grey pt-3 text-sm">
                  <dt className="text-gray">Levering</dt>
                  <dd className="font-medium text-green-eco">
                    {contact.deliveryMethod}
                  </dd>
                </div>
              )}
            </div>
          </div>
        )}

        {!canGoNext && (
          <p
            id="sell-step-help"
            className="mt-6 text-sm text-gray"
            aria-live="polite"
          >
            {step === 0
              ? "Vælg enhedstype, mærke og model for hver enhed for at fortsætte."
              : step === 1
                ? "Besvar spørgsmålene om stand for hver enhed for at fortsætte."
                : "Vælg levering og udfyld navn, telefon og e-mail for at sende din anmodning."}
          </p>
        )}
        {/* ---- Navigation ---- */}
        <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-soft-grey pt-5">
          {step > 0 ? (
            <button
              type="button"
              onClick={goPrev}
              disabled={status === "submitting"}
              className="flex items-center gap-2 rounded-md border border-soft-grey bg-white px-4 py-3 disabled:opacity-50 text-sm font-bold text-charcoal transition-colors hover:bg-sand"
            >
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z"
                  clipRule="evenodd"
                />
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
            aria-describedby={!canGoNext ? "sell-step-help" : undefined}
            className="flex items-center gap-2 rounded-md bg-green-eco px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-green-eco/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {status === "submitting" ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
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
            ) : step === STEPS.length - 1 ? (
              <>
                Send til vurdering
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 14a.75.75 0 0 1-.75-.75V4.56L4.03 7.78a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.56v8.69A.75.75 0 0 1 8 14Z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            ) : (
              <>
                Næste
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      </fieldset>
    </div>
  );
}
