"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * "Eksportér" på Statistik (docs/design/admin-2026-11/Statistik.html): Regneark
 * (CSV) og Excel hentes fra /api/admin/statistik/export med samme periode og
 * butik som siden; PDF til print åbner browserens print. Menuen er altid
 * monteret, så den kan tone ud igen (statistik.css), og lukker ved klik udenfor
 * og Escape. Vises kun, når viewer.canExport (se ExportControl i controls.tsx).
 */

type Format = "csv" | "xlsx";

const ITEMS: { key: Format | "pdf"; label: string; hint: string }[] = [
  { key: "csv", label: "Regneark (CSV)", hint: "Tal pr. dag for den valgte periode og butik" },
  { key: "xlsx", label: "Excel", hint: "Alle afsnit på hver sin fane" },
  { key: "pdf", label: "PDF til print", hint: "Siden som den ser ud nu" },
];

const TOAST_MS = 2600;

function fileNameFrom(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

export function ExportMenu({ query }: { query: string }) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ text: "", show: false });
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (!toast.show) return;
    // Teksten bliver stående, mens toasten toner ud.
    const t = setTimeout(() => setToast((s) => ({ ...s, show: false })), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  async function download(format: Format) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/statistik/export?format=${format}${query ? `&${query}` : ""}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileNameFrom(res.headers.get("content-disposition"), `phonespot-statistik.${format}`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setToast({ text: "Regnearket er hentet", show: true });
    } catch {
      setToast({ text: "Filen kunne ikke hentes. Prøv igen.", show: true });
    } finally {
      setBusy(false);
    }
  }

  function choose(key: Format | "pdf") {
    close(true);
    if (key === "pdf") window.print();
    else void download(key);
  }

  return (
    <div ref={wrapRef} className="stat-noprint relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-busy={busy}
        className="flex h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-[#E2E5E0] bg-white px-4 text-[14px] text-[#15211B] hover:border-[#C5CBC6] motion-safe:transition-[border-color,transform] motion-safe:duration-200 motion-safe:active:scale-[0.98]"
        onClick={() => setOpen((o) => !o)}
      >
        Eksportér
      </button>
      <div
        id={menuId}
        data-open={open ? "" : undefined}
        className="stat-menu absolute right-0 top-[50px] z-10 min-w-[250px] max-w-[calc(100vw-32px)] rounded-xl border border-[#E2E5E0] bg-white p-1.5"
      >
        {ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={busy && item.key !== "pdf"}
            className="block w-full cursor-pointer rounded-lg border-0 bg-transparent px-3 py-2.5 text-left text-[14px] text-[#15211B] hover:bg-[#F4F6F3] disabled:cursor-wait disabled:opacity-60"
            onClick={() => choose(item.key)}
          >
            {item.label}
            <small className="block text-[13px] text-[#5E6A63]">{item.hint}</small>
          </button>
        ))}
      </div>
      <div
        role="status"
        aria-live="polite"
        data-show={toast.show ? "" : undefined}
        className="stat-toast rounded-[10px] bg-[#15211B] px-[18px] py-3 text-[14px] text-white"
      >
        {toast.text}
      </div>
    </div>
  );
}
