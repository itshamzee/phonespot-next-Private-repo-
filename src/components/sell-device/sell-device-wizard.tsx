"use client";

import { useState, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DeviceInfo {
  deviceType: string;
  brand: string;
  model: string;
  storage: string;
}

interface ConditionInfo {
  screen: string;
  back: string;
  battery: string;
  allWorking: string;
  brokenParts: string[];
  cloudLocked: string;
}

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  preferredContact: string;
  preferredStore: string;
  comment: string;
}

type Status = "idle" | "submitting" | "success" | "error";

const STEPS = ["Enhed", "Stand", "Kontaktinfo"] as const;

const DEVICE_TYPES = ["iPhone", "Smartphone", "iPad", "Laptop", "Smartwatch"];
const STORAGE_OPTIONS = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "Andet"];

const SCREEN_OPTIONS = ["Perfekt", "Små ridser", "Revnet", "Virker ikke"];
const BACK_OPTIONS = ["Perfekt", "Små ridser", "Revnet"];
const BATTERY_OPTIONS = ["God (80%+)", "Okay (60-80%)", "Dårligt (<60%)", "Ved ikke"];
const BROKEN_PARTS = ["Kamera", "Højtaler", "Mikrofon", "WiFi", "Bluetooth", "Opladning", "Knapper"];

/* ------------------------------------------------------------------ */
/*  Progress Bar                                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="mb-10">
      <div className="hidden sm:flex items-center justify-between">
        {STEPS.map((label, i) => {
          const isCompleted = i < current;
          const isActive = i === current;
          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
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
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
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
            className={`rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${
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
/*  Main Wizard                                                        */
/* ------------------------------------------------------------------ */

export function SellDeviceWizard() {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [device, setDevice] = useState<DeviceInfo>({
    deviceType: "",
    brand: "",
    model: "",
    storage: "",
  });

  const [condition, setCondition] = useState<ConditionInfo>({
    screen: "",
    back: "",
    battery: "",
    allWorking: "",
    brokenParts: [],
    cloudLocked: "",
  });

  const [contact, setContact] = useState<ContactInfo>({
    name: "",
    email: "",
    phone: "",
    preferredContact: "Ring mig",
    preferredStore: "Slagelse",
    comment: "",
  });

  const inputStyles =
    "w-full rounded-xl border border-soft-grey bg-white px-4 py-3.5 text-charcoal placeholder:text-gray/50 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20 transition-all";

  const labelStyles = "text-sm font-bold text-charcoal";

  /* ---- validation ---- */
  const canGoNext = useMemo(() => {
    switch (step) {
      case 0:
        return !!(device.deviceType && device.brand && device.model);
      case 1:
        return !!(condition.screen && condition.back && condition.battery && condition.allWorking && condition.cloudLocked);
      case 2:
        return !!(contact.name.trim() && contact.email.trim() && contact.phone.trim());
      default:
        return false;
    }
  }, [step, device, condition, contact]);

  /* ---- build message summary ---- */
  function buildMessage(): string {
    const lines = [
      `Enhedstype: ${device.deviceType}`,
      `Mærke: ${device.brand}`,
      `Model: ${device.model}`,
      device.storage ? `Lagerplads: ${device.storage}` : null,
      "",
      `Skærm: ${condition.screen}`,
      `Bagside: ${condition.back}`,
      `Batteri: ${condition.battery}`,
      `Alt fungerer: ${condition.allWorking}`,
      condition.allWorking === "Nej" && condition.brokenParts.length > 0
        ? `Defekte dele: ${condition.brokenParts.join(", ")}`
        : null,
      `iCloud/Google låst: ${condition.cloudLocked}`,
      "",
      `Foretrukken kontakt: ${contact.preferredContact}`,
      `Foretrukken butik: ${contact.preferredStore}`,
      contact.comment ? `Kommentar: ${contact.comment}` : null,
    ];
    return lines.filter(Boolean).join("\n");
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
          subject: "Sælg enhed",
          message: buildMessage(),
          source: "saelg-enhed",
          metadata: {
            device,
            condition,
            preferredContact: contact.preferredContact,
            preferredStore: contact.preferredStore,
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
        err instanceof Error ? err.message : "Kunne ikke sende anmodning",
      );
    }
  }

  const goNext = () => {
    if (step === STEPS.length - 1) {
      handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  /* ---- toggle broken part ---- */
  function toggleBrokenPart(part: string) {
    setCondition((prev) => ({
      ...prev,
      brokenParts: prev.brokenParts.includes(part)
        ? prev.brokenParts.filter((p) => p !== part)
        : [...prev.brokenParts, part],
    }));
  }

  /* ---------------------------------------------------------------- */
  /*  Success screen                                                   */
  /* ---------------------------------------------------------------- */

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
          Vi har modtaget dine oplysninger og vurderer din enhed hurtigst muligt.
          Du horer fra os inden for 24 timer.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-eco/10 px-5 py-2.5 text-sm font-bold text-green-eco">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
          </svg>
          Vi kontakter dig via {contact.preferredContact === "Ring mig" ? "telefon" : contact.preferredContact === "SMS" ? "SMS" : "email"}
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="rounded-2xl border border-soft-grey bg-white p-6 shadow-sm md:p-8">
      <ProgressBar current={step} />

      {status === "error" && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {errorMessage}
        </div>
      )}

      {/* ---- Step 1: Enhed ---- */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">
              Fortæl os om din enhed
            </h2>
            <p className="mt-1 text-sm text-gray">Vælg type, mærke og model for den enhed du vil sælge.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="deviceType" className={labelStyles}>Enhedstype</label>
            <select
              id="deviceType"
              value={device.deviceType}
              onChange={(e) => setDevice((prev) => ({ ...prev, deviceType: e.target.value }))}
              className={inputStyles}
            >
              <option value="">Vælg type...</option>
              {DEVICE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="brand" className={labelStyles}>Mærke</label>
              <input
                id="brand"
                type="text"
                placeholder="f.eks. Apple, Samsung"
                value={device.brand}
                onChange={(e) => setDevice((prev) => ({ ...prev, brand: e.target.value }))}
                className={inputStyles}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="model" className={labelStyles}>Model</label>
              <input
                id="model"
                type="text"
                placeholder="f.eks. iPhone 14 Pro"
                value={device.model}
                onChange={(e) => setDevice((prev) => ({ ...prev, model: e.target.value }))}
                className={inputStyles}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="storage" className={labelStyles}>Lagerplads</label>
            <select
              id="storage"
              value={device.storage}
              onChange={(e) => setDevice((prev) => ({ ...prev, storage: e.target.value }))}
              className={inputStyles}
            >
              <option value="">Vælg lagerplads...</option>
              {STORAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ---- Step 2: Stand ---- */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">
              Hvordan er standen?
            </h2>
            <p className="mt-1 text-sm text-gray">Beskriv din enheds tilstand, så vi kan give dig den bedste vurdering.</p>
          </div>

          <RadioGroup
            name="screen"
            label="Skærm"
            options={SCREEN_OPTIONS}
            value={condition.screen}
            onChange={(v) => setCondition((prev) => ({ ...prev, screen: v }))}
          />

          <RadioGroup
            name="back"
            label="Bagside"
            options={BACK_OPTIONS}
            value={condition.back}
            onChange={(v) => setCondition((prev) => ({ ...prev, back: v }))}
          />

          <RadioGroup
            name="battery"
            label="Batteri"
            options={BATTERY_OPTIONS}
            value={condition.battery}
            onChange={(v) => setCondition((prev) => ({ ...prev, battery: v }))}
          />

          <RadioGroup
            name="allWorking"
            label="Fungerer alt?"
            options={["Ja", "Nej"]}
            value={condition.allWorking}
            onChange={(v) => setCondition((prev) => ({ ...prev, allWorking: v, brokenParts: v === "Ja" ? [] : prev.brokenParts }))}
          />

          {condition.allWorking === "Nej" && (
            <div className="flex flex-col gap-2 rounded-xl border border-soft-grey bg-sand/30 p-4">
              <p className="text-sm font-bold text-charcoal">Hvad virker ikke?</p>
              <div className="flex flex-wrap gap-2">
                {BROKEN_PARTS.map((part) => (
                  <button
                    key={part}
                    type="button"
                    onClick={() => toggleBrokenPart(part)}
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                      condition.brokenParts.includes(part)
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

          <RadioGroup
            name="cloudLocked"
            label="iCloud / Google-konto låst?"
            options={["Ja", "Nej", "Ved ikke"]}
            value={condition.cloudLocked}
            onChange={(v) => setCondition((prev) => ({ ...prev, cloudLocked: v }))}
          />

          {condition.cloudLocked === "Ja" && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-amber-500">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-amber-800">
                <span className="font-bold">Bemærk:</span> Enheder med aktiv iCloud- eller Google-lås kan vi desværre ikke opkøbe. Du skal fjerne låsen inden salg.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ---- Step 3: Kontaktinfo ---- */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">
              Dine kontaktoplysninger
            </h2>
            <p className="mt-1 text-sm text-gray">Vi kontakter dig med en vurdering af din enhed.</p>
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

          <div className="grid gap-6 sm:grid-cols-2">
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
            name="preferredContact"
            label="Foretrukken kontaktmetode"
            options={["Ring mig", "SMS", "Email"]}
            value={contact.preferredContact}
            onChange={(v) => setContact((prev) => ({ ...prev, preferredContact: v }))}
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="preferredStore" className={labelStyles}>Foretrukken butik</label>
            <select
              id="preferredStore"
              value={contact.preferredStore}
              onChange={(e) => setContact((prev) => ({ ...prev, preferredStore: e.target.value }))}
              className={inputStyles}
            >
              <option value="Slagelse">PhoneSpot Slagelse</option>
              <option value="Vejle">PhoneSpot Vejle</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="comment" className={labelStyles}>Kommentar (valgfri)</label>
            <textarea
              id="comment"
              placeholder="Har du yderligere information om enheden?"
              rows={3}
              value={contact.comment}
              onChange={(e) => setContact((prev) => ({ ...prev, comment: e.target.value }))}
              className={inputStyles}
            />
          </div>

          {/* Summary card */}
          <div className="rounded-xl bg-charcoal/[0.03] p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray">Opsummering</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray">Enhed</dt>
                <dd className="font-medium text-charcoal">{device.brand} {device.model}</dd>
              </div>
              {device.storage && (
                <div className="flex justify-between">
                  <dt className="text-gray">Lagerplads</dt>
                  <dd className="font-medium text-charcoal">{device.storage}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray">Skærm</dt>
                <dd className="font-medium text-charcoal">{condition.screen}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray">Bagside</dt>
                <dd className="font-medium text-charcoal">{condition.back}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray">Batteri</dt>
                <dd className="font-medium text-charcoal">{condition.battery}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* ---- Navigation ---- */}
      <div className="mt-10 flex justify-between gap-4">
        {step > 0 ? (
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
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext || status === "submitting"}
          className="flex items-center gap-2 rounded-full bg-green-eco px-8 py-3 text-sm font-bold text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-green-eco/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
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
