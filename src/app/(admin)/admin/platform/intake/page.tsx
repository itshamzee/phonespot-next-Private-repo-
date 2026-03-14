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
        <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Registrer enhed
        </h2>
        <p className="mt-0.5 text-sm text-charcoal/35">
          Registrer enkeltvis eller importer flere enheder via CSV
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-8 flex gap-2">
        {(
          [
            ["single", "Enkelt enhed", (
              <svg key="s" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" />
              </svg>
            )],
            ["csv", "CSV Import", (
              <svg key="c" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            )],
          ] as const
        ).map(([tab, label, icon]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all ${
              activeTab === tab
                ? "bg-charcoal text-white shadow-sm"
                : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 shadow-sm"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "single" ? (
        <DeviceIntakeForm onSuccess={() => {}} />
      ) : (
        <div className="rounded-2xl border border-black/[0.04] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-charcoal/[0.03]">
            <svg className="h-7 w-7 text-charcoal/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="mb-1 font-display text-base font-bold text-charcoal">Masse-import via CSV</h3>
          <p className="mb-5 text-sm text-charcoal/35">
            Importer op til hundredvis af enheder p\u00e5 \u00e9n gang med en CSV-fil
          </p>

          {lastImportedCount !== null && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Seneste import: {lastImportedCount} enhed
              {lastImportedCount !== 1 ? "er" : ""} importeret
            </div>
          )}

          <button
            type="button"
            onClick={() => setCsvDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/15 transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            \u00c5ben CSV Import
          </button>

          <div className="mt-6 rounded-xl bg-charcoal/[0.02] p-4 text-left">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-charcoal/35">
              Forventede kolonner
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "serial_number", "imei", "template_id", "grade", "battery_health",
                "storage", "color", "condition_notes", "purchase_price",
                "selling_price", "vat_scheme", "supplier_id", "location_id", "status",
              ].map((col) => (
                <span
                  key={col}
                  className="rounded-md border border-black/[0.04] bg-white px-2 py-0.5 font-mono text-xs text-charcoal/50"
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
