"use client";

import { useState, useRef } from "react";

// Pricing table — TODO: Pull from /api/b2b/lcd-pricing when implemented
const LCD_PRICING = [
  {
    category: "iPhone 15-serien",
    models: [
      { model: "iPhone 15 Pro Max", smadret: 280, defekt: 180, burnIn: 80 },
      { model: "iPhone 15 Pro", smadret: 240, defekt: 150, burnIn: 70 },
      { model: "iPhone 15 Plus", smadret: 200, defekt: 130, burnIn: 60 },
      { model: "iPhone 15", smadret: 180, defekt: 110, burnIn: 50 },
    ],
  },
  {
    category: "iPhone 14-serien",
    models: [
      { model: "iPhone 14 Pro Max", smadret: 220, defekt: 140, burnIn: 70 },
      { model: "iPhone 14 Pro", smadret: 200, defekt: 125, burnIn: 60 },
      { model: "iPhone 14 Plus", smadret: 160, defekt: 100, burnIn: 45 },
      { model: "iPhone 14", smadret: 150, defekt: 90, burnIn: 40 },
    ],
  },
  {
    category: "iPhone 13-serien",
    models: [
      { model: "iPhone 13 Pro Max", smadret: 170, defekt: 110, burnIn: 55 },
      { model: "iPhone 13 Pro", smadret: 160, defekt: 100, burnIn: 50 },
      { model: "iPhone 13", smadret: 120, defekt: 75, burnIn: 35 },
      { model: "iPhone 13 mini", smadret: 100, defekt: 60, burnIn: 28 },
    ],
  },
  {
    category: "iPhone 12-serien",
    models: [
      { model: "iPhone 12 Pro Max", smadret: 130, defekt: 85, burnIn: 40 },
      { model: "iPhone 12 Pro", smadret: 120, defekt: 75, burnIn: 35 },
      { model: "iPhone 12", smadret: 100, defekt: 60, burnIn: 28 },
      { model: "iPhone 12 mini", smadret: 80, defekt: 50, burnIn: 22 },
    ],
  },
];

// All model options for dropdown
const ALL_MODELS = LCD_PRICING.flatMap((cat) =>
  cat.models.map((m) => m.model)
);

const TILSTANDE = [
  { value: "smadret", label: "Smadret glas" },
  { value: "defekt", label: "Defekt display" },
  { value: "burn_in", label: "Burn-in / indbrending" },
] as const;

type Tilstand = (typeof TILSTANDE)[number]["value"];

// TODO: Replace with real API data from /api/b2b/lcd-submissions
const MOCK_SUBMISSIONS = [
  {
    id: "lcd-001",
    submittedAt: "2024-03-28",
    model: "iPhone 14 Pro",
    antal: 3,
    tilstand: "smadret" as Tilstand,
    status: "godkendt",
    udbetalt: 60000, // oere
  },
  {
    id: "lcd-002",
    submittedAt: "2024-03-15",
    model: "iPhone 13",
    antal: 5,
    tilstand: "defekt" as Tilstand,
    status: "udbetalt",
    udbetalt: 37500,
  },
  {
    id: "lcd-003",
    submittedAt: "2024-04-01",
    model: "iPhone 15 Pro",
    antal: 2,
    tilstand: "burn_in" as Tilstand,
    status: "indsendt",
    udbetalt: 0,
  },
];

const LCD_STATUS_LABELS: Record<string, string> = {
  indsendt: "Indsendt",
  vurdering: "Til vurdering",
  godkendt: "Godkendt",
  afvist: "Afvist",
  udbetalt: "Udbetalt",
};

const LCD_STATUS_COLORS: Record<string, string> = {
  indsendt: "bg-blue-100 text-blue-700",
  vurdering: "bg-amber-100 text-amber-700",
  godkendt: "bg-green-100 text-green-700",
  afvist: "bg-red-100 text-red-700",
  udbetalt: "bg-[#1A3D2E]/10 text-[#1A3D2E]",
};

const FIELD_CLASS =
  "mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/20";

function formatOere(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(oere / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getPriceForModel(
  model: string,
  tilstand: Tilstand
): number | null {
  for (const cat of LCD_PRICING) {
    const found = cat.models.find((m) => m.model === model);
    if (found) {
      if (tilstand === "smadret") return found.smadret;
      if (tilstand === "defekt") return found.defekt;
      if (tilstand === "burn_in") return found.burnIn;
    }
  }
  return null;
}

export default function LcdOpkobPage() {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activePricingCategory, setActivePricingCategory] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    model: "",
    antal: "1",
    tilstand: "" as Tilstand | "",
    files: [] as File[],
  });

  function handleField(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({
      ...prev,
      files: Array.from(e.target.files ?? []),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // TODO: POST to /api/b2b/lcd-submissions with FormData
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
    setForm({ model: "", antal: "1", tilstand: "", files: [] });
  }

  const estimatedPricePerUnit =
    form.model && form.tilstand
      ? getPriceForModel(form.model, form.tilstand as Tilstand)
      : null;

  const totalEstimated =
    estimatedPricePerUnit !== null && form.antal
      ? estimatedPricePerUnit * parseInt(form.antal || "1", 10) * 100
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111111]">
            LCD Opkob
          </h1>
          <p className="mt-0.5 text-sm text-[#86868B]">
            Saelg dine defekte skaerme til PhoneSpot
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setSubmitted(false);
          }}
          className="rounded-full bg-[#1A3D2E] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          {showForm ? "Luk formular" : "Indmeld skaerme"}
        </button>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-[#E5E5EA] bg-white p-6">
        <h2 className="mb-4 font-display text-base font-bold text-[#111111]">
          Saadan virker det
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Indmeld",
              desc: "Udfyld formularen med model, antal og tilstand. Vedhajft billeder.",
            },
            {
              step: "2",
              title: "Vi vurderer",
              desc: "Vi bekraefter prisen inden for 1 hverdag og sender besked pa email.",
            },
            {
              step: "3",
              title: "Afregning",
              desc: "Send skaermene til os — eller aflever i Vejle. Udbetaling sker inden for 3 hverdage.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1A3D2E] text-xs font-bold text-white">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111111]">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#86868B]">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submission form */}
      {showForm && (
        <div className="rounded-xl border border-[#E5E5EA] bg-white p-6">
          {submitted ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-7 w-7 text-green-600"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-bold text-[#111111]">
                Indmelding modtaget
              </h3>
              <p className="mt-2 text-sm text-[#86868B]">
                Vi bekraefter prisen inden for 1 hverdag og kontakter dig pa din
                registrerede email.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setShowForm(false);
                }}
                className="mt-6 rounded-full border border-[#E5E5EA] px-5 py-2 text-sm font-medium text-[#6E6E73] hover:text-[#111111]"
              >
                Luk
              </button>
            </div>
          ) : (
            <>
              <h2 className="mb-5 font-display text-lg font-bold text-[#111111]">
                Indmeld skaerme
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="lcd-model"
                      className="block text-sm font-medium text-[#111111]"
                    >
                      Enhedstype
                    </label>
                    <select
                      id="lcd-model"
                      name="model"
                      required
                      value={form.model}
                      onChange={handleField}
                      className={FIELD_CLASS}
                    >
                      <option value="">Vaelg model...</option>
                      {LCD_PRICING.map((cat) => (
                        <optgroup key={cat.category} label={cat.category}>
                          {cat.models.map((m) => (
                            <option key={m.model} value={m.model}>
                              {m.model}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="lcd-antal"
                      className="block text-sm font-medium text-[#111111]"
                    >
                      Antal
                    </label>
                    <input
                      id="lcd-antal"
                      name="antal"
                      type="number"
                      min="1"
                      max="500"
                      required
                      value={form.antal}
                      onChange={handleField}
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#111111]">
                    Tilstand
                  </label>
                  <div className="mt-1 grid gap-2 sm:grid-cols-3">
                    {TILSTANDE.map((t) => (
                      <label
                        key={t.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                          form.tilstand === t.value
                            ? "border-[#1A3D2E]/40 bg-[#EAF2ED]/40"
                            : "border-[#E5E5EA] hover:border-[#1A3D2E]/20"
                        }`}
                      >
                        <input
                          type="radio"
                          name="tilstand"
                          value={t.value}
                          checked={form.tilstand === t.value}
                          onChange={handleField}
                          className="accent-[#1A3D2E]"
                          required
                        />
                        <span className="text-sm font-medium text-[#111111]">
                          {t.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Estimated payout */}
                {totalEstimated !== null && (
                  <div className="rounded-xl border border-[#1A3D2E]/20 bg-[#EAF2ED]/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
                      Estimeret udbetaling
                    </p>
                    <p className="mt-1 font-display text-2xl font-bold text-[#1A3D2E]">
                      {formatOere(totalEstimated)}
                    </p>
                    <p className="mt-0.5 text-xs text-[#1A3D2E]/70">
                      {form.antal} stk &times;{" "}
                      {estimatedPricePerUnit} kr pr. stk &mdash; endelig pris bekraeftes af os
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#111111]">
                    Billeder (anbefalet)
                  </label>
                  <div
                    className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E5EA] bg-[#F7F7F8] px-4 py-8 transition-colors hover:border-[#1A3D2E]/30 hover:bg-[#EAF2ED]/30"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-8 w-8 text-[#86868B]"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="mt-2 text-sm text-[#86868B]">
                      {form.files.length > 0
                        ? `${form.files.length} fil(er) valgt`
                        : "Upload billeder af skaermene"}
                    </p>
                    <p className="mt-0.5 text-xs text-[#86868B]">
                      PNG, JPG op til 10 MB pr. fil
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFiles}
                    className="sr-only"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-full bg-[#1A3D2E] px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "Sender..." : "Indsend"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-sm text-[#86868B] hover:text-[#111111]"
                  >
                    Annuller
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* Pricing table */}
      <div className="rounded-xl border border-[#E5E5EA] bg-white overflow-hidden">
        <div className="border-b border-[#E5E5EA] px-5 py-4">
          <h2 className="font-display text-base font-bold text-[#111111]">
            Prisoversigt — hvad vi betaler
          </h2>
          <p className="mt-0.5 text-xs text-[#86868B]">
            Priser i DKK inkl. moms. Endelig pris bekraeftes ved modtagelse.
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-0 overflow-x-auto border-b border-[#E5E5EA]">
          {LCD_PRICING.map((cat, idx) => (
            <button
              key={cat.category}
              type="button"
              onClick={() => setActivePricingCategory(idx)}
              className={`shrink-0 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                activePricingCategory === idx
                  ? "border-[#1A3D2E] text-[#1A3D2E]"
                  : "border-transparent text-[#86868B] hover:text-[#111111]"
              }`}
            >
              {cat.category}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#F7F7F8]">
                <th className="px-5 py-3 text-left text-xs font-semibold text-[#6E6E73]">
                  Model
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6E6E73]">
                  Smadret glas
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6E6E73]">
                  Defekt display
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6E6E73]">
                  Burn-in
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {LCD_PRICING[activePricingCategory]?.models.map((row) => (
                <tr key={row.model} className="hover:bg-[#F7F7F8]">
                  <td className="px-5 py-3 text-sm font-medium text-[#111111]">
                    {row.model}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-[#6E6E73]">
                    {row.smadret} kr
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-[#6E6E73]">
                    {row.defekt} kr
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-[#6E6E73]">
                    {row.burnIn} kr
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Previous submissions */}
      {/* TODO: Replace with real API call to /api/b2b/lcd-submissions */}
      <div className="space-y-3">
        <h2 className="font-display text-base font-bold text-[#111111]">
          Dine indmeldinger
        </h2>
        {MOCK_SUBMISSIONS.map((sub) => {
          const tilstandLabel =
            TILSTANDE.find((t) => t.value === sub.tilstand)?.label ?? sub.tilstand;
          return (
            <div
              key={sub.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E5EA] bg-white px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#111111]">
                  {sub.model}
                </p>
                <p className="text-xs text-[#86868B]">
                  {sub.antal} stk &middot; {tilstandLabel} &middot;{" "}
                  {formatDate(sub.submittedAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {sub.udbetalt > 0 && (
                  <span className="text-sm font-semibold text-[#1A3D2E]">
                    {formatOere(sub.udbetalt)}
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    LCD_STATUS_COLORS[sub.status] ?? "bg-[#F7F7F8] text-[#6E6E73]"
                  }`}
                >
                  {LCD_STATUS_LABELS[sub.status] ?? sub.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
