"use client";

import { useState, useRef } from "react";

// TODO: Replace with real API calls to /api/b2b/rma when endpoint is implemented
const MOCK_RMA_LIST = [
  {
    id: "rma-001",
    rmaNumber: "RMA-2024-007",
    orderNumber: "B2B-2024-0031",
    product: "iPhone 12 batteri — OEM (8 stk)",
    description: "3 af batterierne holder ikke opladning i mere end 2 timer efter udskiftning.",
    submittedAt: "2024-04-01",
    status: "under_behandling",
  },
  {
    id: "rma-002",
    rmaNumber: "RMA-2024-004",
    orderNumber: "B2B-2024-0021",
    product: "Samsung S22 skaerm — AMOLED (1 stk)",
    description: "Dodpixels i ovre venstre hjoerne ved levering.",
    submittedAt: "2024-03-10",
    status: "godkendt",
  },
  {
    id: "rma-003",
    rmaNumber: "RMA-2024-001",
    orderNumber: "B2B-2024-0018",
    product: "iPhone 13 Pro skaerm — Premium OLED (1 stk)",
    description: "Touch virker ikke i bunden af skaermen.",
    submittedAt: "2024-02-25",
    status: "afsluttet",
  },
];

const RMA_STATUS_LABELS: Record<string, string> = {
  indsendt: "Indsendt",
  under_behandling: "Under behandling",
  godkendt: "Godkendt",
  afvist: "Afvist",
  afsluttet: "Afsluttet",
};

const RMA_STATUS_COLORS: Record<string, string> = {
  indsendt: "bg-blue-100 text-blue-700",
  under_behandling: "bg-amber-100 text-amber-700",
  godkendt: "bg-green-100 text-green-700",
  afvist: "bg-red-100 text-red-700",
  afsluttet: "bg-[#F7F7F8] text-[#6E6E73]",
};

const FIELD_CLASS =
  "mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/20";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface RmaFormState {
  orderNumber: string;
  product: string;
  description: string;
  files: File[];
}

export default function ReklamationPage() {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<RmaFormState>({
    orderNumber: "",
    product: "",
    description: "",
    files: [],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setForm((prev) => ({ ...prev, files: selected }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    // TODO: POST to /api/b2b/rma with FormData (orderNumber, product, description, files)
    await new Promise((r) => setTimeout(r, 800)); // Simulate network

    setSubmitting(false);
    setSubmitted(true);
    setForm({ orderNumber: "", product: "", description: "", files: [] });
  }

  function resetForm() {
    setSubmitted(false);
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const RMA_STATUS_STEPS = [
    "indsendt",
    "under_behandling",
    "godkendt",
    "afsluttet",
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111111]">
            Reklamation / RMA
          </h1>
          <p className="mt-0.5 text-sm text-[#86868B]">
            Indmeld fejl og spor status pa dine reklamationssager
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
          {showForm ? "Luk formular" : "Opret ny reklamation"}
        </button>
      </div>

      {/* Inline create form */}
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-lg font-bold text-[#111111]">
                Reklamation indsendt
              </h3>
              <p className="mt-2 text-sm text-[#86868B]">
                Vi behandler din sag inden for 1-2 hverdage og kontakter dig pa
                din registrerede email.
              </p>
              <button
                type="button"
                onClick={resetForm}
                className="mt-6 rounded-full border border-[#E5E5EA] px-5 py-2 text-sm font-medium text-[#6E6E73] hover:text-[#111111]"
              >
                Luk
              </button>
            </div>
          ) : (
            <>
              <h2 className="mb-5 font-display text-lg font-bold text-[#111111]">
                Ny reklamation
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="rma-order"
                      className="block text-sm font-medium text-[#111111]"
                    >
                      Ordrenummer
                    </label>
                    <input
                      id="rma-order"
                      name="orderNumber"
                      type="text"
                      required
                      value={form.orderNumber}
                      onChange={handleField}
                      placeholder="B2B-2024-XXXX"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="rma-product"
                      className="block text-sm font-medium text-[#111111]"
                    >
                      Produkt
                    </label>
                    <input
                      id="rma-product"
                      name="product"
                      type="text"
                      required
                      value={form.product}
                      onChange={handleField}
                      placeholder="F.eks. iPhone 15 skaerm OLED x3"
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rma-description"
                    className="block text-sm font-medium text-[#111111]"
                  >
                    Beskrivelse af fejl
                  </label>
                  <textarea
                    id="rma-description"
                    name="description"
                    required
                    rows={4}
                    value={form.description}
                    onChange={handleField}
                    placeholder="Beskriv fejlen sa detaljeret som muligt. Hvad sker der? Nar opstod problemet?"
                    className="mt-1 w-full resize-none rounded-xl border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#111111]">
                    Billeder (valgfrit)
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-[#86868B]">
                      {form.files.length > 0
                        ? `${form.files.length} fil(er) valgt`
                        : "Klik for at uploade billeder"}
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
                    {submitting ? "Sender..." : "Indsend reklamation"}
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

      {/* RMA status info */}
      <div className="rounded-xl border border-[#E5E5EA] bg-white p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#86868B]">
          Statusflow
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {RMA_STATUS_STEPS.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${RMA_STATUS_COLORS[step]}`}
              >
                {RMA_STATUS_LABELS[step]}
              </span>
              {idx < RMA_STATUS_STEPS.length - 1 && (
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-3.5 w-3.5 shrink-0 text-[#E5E5EA]"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <svg
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-3.5 w-3.5 shrink-0 text-[#E5E5EA]"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${RMA_STATUS_COLORS.afvist}`}>
              {RMA_STATUS_LABELS.afvist}
            </span>
          </div>
        </div>
      </div>

      {/* RMA list */}
      {/* TODO: Replace with real API call to /api/b2b/rma */}
      {MOCK_RMA_LIST.length === 0 ? (
        <div className="rounded-xl border border-[#E5E5EA] bg-white py-16 text-center">
          <p className="text-sm text-[#86868B]">
            Ingen reklamationssager endnu
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-display text-base font-bold text-[#111111]">
            Dine sager
          </h2>
          {MOCK_RMA_LIST.map((rma) => (
            <div
              key={rma.id}
              className="rounded-xl border border-[#E5E5EA] bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-[#111111]">
                      {rma.rmaNumber}
                    </p>
                    <span className="text-xs text-[#86868B]">&middot;</span>
                    <p className="text-xs text-[#86868B]">
                      Ordre: {rma.orderNumber}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-[#111111]">{rma.product}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#86868B]">
                    {rma.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      RMA_STATUS_COLORS[rma.status] ?? "bg-[#F7F7F8] text-[#6E6E73]"
                    }`}
                  >
                    {RMA_STATUS_LABELS[rma.status] ?? rma.status}
                  </span>
                  <p className="text-xs text-[#86868B]">
                    {formatDate(rma.submittedAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
