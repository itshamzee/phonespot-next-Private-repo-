"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STAT_PRESETS } from "@/lib/admin/statistik/range";
import type { StatPayload } from "@/lib/admin/statistik/payload";

/**
 * Vælgerne på Statistik. Valget bor i URL'en (?periode, ?fra/?til, ?butik, ?vis),
 * og siden hentes igen på serveren. Mens det sker, bliver det gamle indhold
 * stående med aria-busy og 60 % opacitet; der er ingen spinner.
 */

type Patch = Record<string, string | null>;
type Nav = { pending: boolean; go: (patch: Patch) => void };

const NavContext = createContext<Nav>({ pending: false, go: () => {} });

export function StatNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const go = useCallback(
    (patch: Patch) => {
      const next = new URLSearchParams(params?.toString() ?? "");
      for (const [key, value] of Object.entries(patch)) {
        if (value == null) next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  const value = useMemo(() => ({ pending, go }), [pending, go]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

/** Indhold, der afhænger af vælgerne: dæmpes, mens den nye side hentes. */
export function BusyRegion({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { pending } = useContext(NavContext);
  return (
    <div aria-busy={pending} className={`stat-busy ${pending ? "opacity-60" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Segmenteret vælger                                                 */
/* ------------------------------------------------------------------ */

export const segClass = "flex max-w-full gap-1 overflow-x-auto rounded-[10px] bg-[#E9ECE7] p-1";

export function segButtonClass(pressed: boolean): string {
  return `h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-0 px-4 text-[14px] motion-safe:transition-[background-color,color,transform] motion-safe:duration-200 motion-safe:active:scale-[0.97] ${
    pressed ? "bg-white font-semibold text-[#15211B]" : "bg-transparent text-[#3D4842] hover:text-[#15211B]"
  }`;
}

/* ------------------------------------------------------------------ */
/*  Butik                                                              */
/* ------------------------------------------------------------------ */

export function StoreSelector({ stores, current }: { stores: StatPayload["stores"]; current: string }) {
  const { go } = useContext(NavContext);
  if (stores.length <= 1) return null;
  return (
    <div role="group" aria-label="Butik" className={segClass}>
      {stores.map((s) => (
        <button
          key={s.slug}
          type="button"
          aria-pressed={s.slug === current}
          className={segButtonClass(s.slug === current)}
          onClick={() => go({ butik: s.slug })}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/** Den valgte periode og hvad den sammenlignes med, øverst til højre. */
export function RangeLabel({ range }: { range: StatPayload["range"] }) {
  return (
    <div className="flex h-11 items-center gap-2 rounded-[10px] border border-[#E2E5E0] bg-white px-4 text-[14px] text-[#15211B]">
      <span>{range.rangeLabel}</span>
      <span className="text-[13px] text-[#5E6A63]">{range.compareLabel}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Periode                                                            */
/* ------------------------------------------------------------------ */

export function PeriodSelector({ range, minDate, today }: { range: StatPayload["range"]; minDate: string; today: string }) {
  const { go } = useContext(NavContext);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isCustom = range.preset === "valg";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
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
  }, [open]);

  return (
    <div ref={wrapRef} className="relative max-w-full self-start">
      <div role="group" aria-label="Periode" className={segClass}>
        {STAT_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            aria-pressed={range.preset === p.value}
            className={segButtonClass(range.preset === p.value)}
            onClick={() => {
              setOpen(false);
              go({ periode: p.value, fra: null, til: null });
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={isCustom}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={segButtonClass(isCustom)}
          onClick={() => setOpen((o) => !o)}
        >
          Vælg datoer
        </button>
      </div>
      {open ? (
        <DatePopover
          from={range.from}
          to={range.to}
          minDate={minDate}
          today={today}
          onApply={(fra, til) => {
            setOpen(false);
            go({ periode: null, fra, til });
          }}
        />
      ) : null}
    </div>
  );
}

function DatePopover({
  from,
  to,
  minDate,
  today,
  onApply,
}: {
  from: string;
  to: string;
  minDate: string;
  today: string;
  onApply: (fra: string, til: string) => void;
}) {
  const id = useId();
  const [fra, setFra] = useState(from);
  const [til, setTil] = useState(to);

  const valid = Boolean(fra && til);
  const inputClass =
    "h-11 w-full rounded-lg border border-[#E2E5E0] bg-white px-3 text-[16px] text-[#15211B] tabular-nums focus:border-[#5A8C6F] focus:outline-none";

  return (
    <form
      role="dialog"
      aria-label="Vælg datoer"
      className="stat-pop absolute left-0 top-[50px] z-10 flex w-[280px] max-w-[calc(100vw-32px)] flex-col gap-3 rounded-xl border border-[#E2E5E0] bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onApply(fra, til);
      }}
    >
      <label htmlFor={`${id}-fra`} className="flex flex-col gap-1 text-[13px] text-[#5E6A63]">
        Fra
        <input id={`${id}-fra`} type="date" value={fra} min={minDate} max={today} onChange={(e) => setFra(e.target.value)} className={inputClass} />
      </label>
      <label htmlFor={`${id}-til`} className="flex flex-col gap-1 text-[13px] text-[#5E6A63]">
        Til
        <input id={`${id}-til`} type="date" value={til} min={minDate} max={today} onChange={(e) => setTil(e.target.value)} className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={!valid}
        className="h-11 cursor-pointer rounded-lg border-0 bg-[#1A3D2E] px-4 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:scale-[0.98]"
      >
        Anvend
      </button>
    </form>
  );
}
