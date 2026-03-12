"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { CSV_COLUMNS } from "@/lib/platform/csv-parser";

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}

interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
}

interface ValidationResult {
  ready: ParsedRow[];
  errors: { row: number; message: string }[];
}

function generateSampleCsv(): string {
  const headers = CSV_COLUMNS.join(",");
  const example = [
    "",
    "357123456789012",
    "11111111-1111-1111-1111-111111111111",
    "A",
    "92",
    "128GB",
    "Sort",
    "",
    "120000",
    "249900",
    "brugtmoms",
    "",
    "22222222-2222-2222-2222-222222222222",
    "graded",
  ].join(",");
  return headers + "\n" + example;
}

export function CsvImportDialog({ open, onClose, onImported }: CsvImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setImportResult(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { data, errors: parseErrors } = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      });

      const rows: ParsedRow[] = data.map((row, i) => ({ rowNumber: i + 2, data: row }));
      setPreview(rows.slice(0, 5));

      const errorList: { row: number; message: string }[] = parseErrors.map((e) => ({
        row: e.row ?? 0,
        message: e.message,
      }));

      const required = ["template_id", "grade", "purchase_price", "location_id"];
      const dataErrors: { row: number; message: string }[] = [];
      rows.forEach(({ rowNumber, data: row }) => {
        const missing = required.filter((col) => !row[col]?.trim());
        if (missing.length > 0) {
          dataErrors.push({ row: rowNumber, message: `Mangler: ${missing.join(", ")}` });
        }
      });

      const allErrors = [...errorList, ...dataErrors];
      const readyRows = rows.filter(
        (r) => !allErrors.some((e) => e.row === r.rowNumber),
      );

      setValidation({ ready: readyRows, errors: allErrors });
    };
    reader.readAsText(selected);
  }

  function handleDownloadTemplate() {
    const csv = generateSampleCsv();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "device-import-skabelon.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setImportError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/platform/devices/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok && data.imported === undefined) {
        setImportError(data.error ?? "Import fejlede");
        return;
      }

      setImportResult({ imported: data.imported ?? 0, errors: data.errors ?? [] });
      if (data.imported > 0) {
        onImported(data.imported);
      }
    } catch {
      setImportError("Netvaerksfejl -- proev igen");
    } finally {
      setImporting(false);
    }
  }

  function handleReset() {
    setFile(null);
    setPreview([]);
    setValidation(null);
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const previewColumns = preview[0] ? Object.keys(preview[0].data).slice(0, 6) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-stone-800">CSV Import</h2>
            <p className="text-xs text-stone-400">Importer flere enheder paa een gang</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {importResult ? (
            /* Result screen */
            <div className="py-4 text-center">
              <div
                className={[
                  "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full",
                  importResult.imported > 0 ? "bg-green-eco text-white" : "bg-stone-100 text-stone-500",
                ].join(" ")}
              >
                {importResult.imported > 0 ? (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                )}
              </div>
              <h3 className="text-lg font-bold text-stone-800">
                {importResult.imported} enhed{importResult.imported !== 1 ? "er" : ""} importeret
              </h3>
              {importResult.errors.length > 0 && (
                <p className="mt-1 text-sm text-amber-600">
                  {importResult.errors.length} raekke{importResult.errors.length !== 1 ? "r" : ""} med fejl
                </p>
              )}
              <div className="mt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                >
                  Importer endnu en fil
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-green-eco px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                >
                  Luk
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* File drop zone */}
              {!file && (
                <div className="mb-6">
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 p-10 transition hover:border-stone-300 hover:bg-stone-100">
                    <svg
                      className="h-10 w-10 text-stone-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    <div className="text-center">
                      <p className="text-sm font-medium text-stone-600">
                        Klik for at vaelge en CSV-fil
                      </p>
                      <p className="mt-0.5 text-xs text-stone-400">Kun .csv filer accepteres</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>

                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-green-eco underline-offset-2 hover:underline"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download skabelon (CSV)
                    </button>
                  </div>
                </div>
              )}

              {/* File selected */}
              {file && (
                <div className="mb-4 flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="text-sm font-medium text-stone-700">{file.name}</span>
                    <span className="text-xs text-stone-400">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-stone-400 hover:text-stone-600"
                  >
                    Skift fil
                  </button>
                </div>
              )}

              {/* Preview table */}
              {preview.length > 0 && (
                <div className="mb-5">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Forhaandsvisning (foerste {preview.length} raekker)
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-stone-50">
                          {previewColumns.map((col) => (
                            <th
                              key={col}
                              className="whitespace-nowrap border-b border-stone-200 px-3 py-2 text-left font-semibold text-stone-500"
                            >
                              {col}
                            </th>
                          ))}
                          {Object.keys(preview[0]?.data ?? {}).length > 6 && (
                            <th className="border-b border-stone-200 px-3 py-2 text-left font-semibold text-stone-400">
                              +{Object.keys(preview[0].data).length - 6} kolonner
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row) => (
                          <tr key={row.rowNumber} className="border-b border-stone-100">
                            {previewColumns.map((col) => (
                              <td
                                key={col}
                                className="max-w-[120px] truncate whitespace-nowrap px-3 py-2 text-stone-600"
                              >
                                {row.data[col] || (
                                  <span className="text-stone-300">tom</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Validation summary */}
              {validation && (
                <div className="mb-5">
                  <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-eco text-xs font-bold text-white">
                      {validation.ready.length}
                    </span>
                    <span className="text-sm text-stone-700">
                      raekker klar til import
                    </span>
                    {validation.errors.length > 0 && (
                      <>
                        <span className="mx-1 text-stone-300">|</span>
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                          {validation.errors.length}
                        </span>
                        <span className="text-sm text-stone-700">fejl</span>
                      </>
                    )}
                  </div>

                  {validation.errors.length > 0 && (
                    <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-red-100 bg-red-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-500">
                        Fejl
                      </p>
                      <ul className="space-y-1">
                        {validation.errors.map((err, i) => (
                          <li key={i} className="text-xs text-red-700">
                            <span className="font-mono font-bold">Raekke {err.row}:</span>{" "}
                            {err.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {importError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {importError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!importResult && (
          <div className="flex items-center justify-between border-t border-stone-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              Annuller
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={
                !file ||
                importing ||
                !validation ||
                validation.ready.length === 0
              }
              className="flex items-center gap-2 rounded-xl bg-green-eco px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Importerer...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Importer {validation?.ready.length ?? 0} enheder
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
