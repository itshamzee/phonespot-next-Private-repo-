"use client";

import { useState, useRef, useEffect } from "react";

interface ServiceInfo {
  description?: string | null;
  includes?: string | null;
  estimated_time_label?: string | null;
  warranty_info?: string | null;
  estimated_minutes?: number | null;
}

export function ServiceInfoTooltip({ info }: { info: ServiceInfo }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const hasContent = info.description || info.includes || info.estimated_time_label || info.warranty_info;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!hasContent) return null;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-charcoal/10 text-xs font-bold text-charcoal/50 transition-colors hover:bg-charcoal/20 hover:text-charcoal"
        aria-label="Vis info om denne ydelse"
      >
        i
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-soft-grey bg-white p-4 shadow-lg">
          <div className="absolute -top-2 left-3 h-4 w-4 rotate-45 border-l border-t border-soft-grey bg-white" />

          {info.description && (
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">Beskrivelse</p>
              <p className="mt-1 text-sm text-charcoal/80">{info.description}</p>
            </div>
          )}
          {info.includes && (
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">Inkluderer</p>
              <p className="mt-1 text-sm text-charcoal/80">{info.includes}</p>
            </div>
          )}
          {(info.estimated_time_label || info.estimated_minutes) && (
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">Estimeret tid</p>
              <p className="mt-1 text-sm text-charcoal/80">
                {info.estimated_time_label ?? `${info.estimated_minutes} min`}
              </p>
            </div>
          )}
          {info.warranty_info && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">Garanti</p>
              <p className="mt-1 text-sm text-charcoal/80">{info.warranty_info}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
