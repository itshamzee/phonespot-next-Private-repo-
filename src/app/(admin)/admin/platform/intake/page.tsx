"use client";

import { useState } from "react";
import { DeviceIntakeForm } from "@/components/platform/device-intake-form";
import { CsvImportDialog } from "@/components/platform/csv-import-dialog";

type ActiveTab = "single" | "csv";

export default function IntakePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("single");
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [lastImportedCount, setLastImportedCount] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Registrer enhed</h1>
        <p className="mt-1 text-sm text-stone-400">
          Registrer enkeltvis eller importer flere enheder via CSV
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-8 flex gap-1 rounded-xl border border-stone-200 bg-stone-100 p-1">
        {(
          [
            ["single", "Enkelt enhed"],
            ["csv", "CSV Import"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={[
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
              activeTab === tab
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700",
            ].join(" ")}
          >
            {tab === "single" ? (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            )}
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "single" ? (
        <DeviceIntakeForm onSuccess={() => {}} />
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
            <svg
              className="h-7 w-7 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h3 className="mb-1 text-base font-bold text-stone-800">Masse-import via CSV</h3>
          <p className="mb-5 text-sm text-stone-400">
            Importer op til hundredvis af enheder paa een gang med en CSV-fil
          </p>

          {lastImportedCount !== null && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              Seneste import: {lastImportedCount} enhed
              {lastImportedCount !== 1 ? "er" : ""} importeret
            </div>
          )}

          <button
            type="button"
            onClick={() => setCsvDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-green-eco px-5 py-3 text-sm font-bold text-white shadow-md shadow-green-eco/20 transition hover:brightness-110"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Aaben CSV Import
          </button>

          <div className="mt-6 rounded-xl bg-stone-50 p-4 text-left">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Forventede kolonner
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "serial_number",
                "imei",
                "template_id",
                "grade",
                "battery_health",
                "storage",
                "color",
                "condition_notes",
                "purchase_price",
                "selling_price",
                "vat_scheme",
                "supplier_id",
                "location_id",
                "status",
              ].map((col) => (
                <span
                  key={col}
                  className="rounded-md bg-white border border-stone-200 px-2 py-0.5 font-mono text-xs text-stone-600"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <CsvImportDialog
        open={csvDialogOpen}
        onClose={() => setCsvDialogOpen(false)}
        onImported={(count) => {
          setLastImportedCount(count);
          setCsvDialogOpen(false);
        }}
      />
    </div>
  );
}
