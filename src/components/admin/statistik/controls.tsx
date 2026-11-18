"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { addDays } from "@/lib/admin/overview/period";
import { STAT_PRESETS, shiftRange } from "@/lib/admin/statistik/range";
import type { StatPayload } from "@/lib/admin/statistik/payload";
import { ExportMenu } from "./export-menu";

/**
 * Vælgerne på Statistik. Valget bor i URL'en (?periode, ?fra/?til, ?butik, ?vis),
 * og siden hentes igen på serveren. Mens det sker, bliver det gamle indhold
 * stående med aria-busy og 60 % opacitet; der er ingen spinner.
 */

type Patch = Record<string, string | null>;
type Nav = {
  pending: boolean;
  go: (patch: Patch) => void;
  /** Om datovælgeren er åben; bladretasterne gør intet imens. Meldes af PeriodSelector. */
  isDatesOpen: () => boolean;
  setDatesOpen: (open: boolean) => void;
};

const NavContext = createContext<Nav>({ pending: false, go: () => {}, isDatesOpen: () => false, setDatesOpen: () => {} });
/** Kun til tests (fx en navigation i gang uden en rigtig router); siden bruger StatNavProvider. */
export const StatNavContext = NavContext;

export function StatNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const datesOpen = useRef(false);
  const isDatesOpen = useCallback(() => datesOpen.current, []);
  const setDatesOpen = useCallback((open: boolean) => {
    datesOpen.current = open;
  }, []);

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

  const value = useMemo(() => ({ pending, go, isDatesOpen, setDatesOpen }), [pending, go, isDatesOpen, setDatesOpen]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

/** Vælgernes navigation (pending og go) til andre klientkomponenter på siden, fx grafens Omsætning/Fortjeneste. */
export function useStatNav(): Nav {
  return useContext(NavContext);
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
    <div role="group" aria-label="Butik" className={`stat-noprint ${segClass}`}>
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
/*  Eksport                                                            */
/* ------------------------------------------------------------------ */

/**
 * Eksportér-menuen, kun med rettigheden eksportere. Forespørgslen bygges af det,
 * siden viser (payloadens periode og butik), så filen altid matcher skærmen.
 * Ruten afgør selv adgang og butik igen.
 */
export function ExportControl({ viewer, range }: { viewer: StatPayload["viewer"]; range: StatPayload["range"] }) {
  if (!viewer.canExport) return null;
  const q = new URLSearchParams();
  if (range.preset === "valg") {
    q.set("fra", range.from);
    q.set("til", range.to);
  } else {
    q.set("periode", range.preset);
  }
  q.set("butik", viewer.scope);
  return <ExportMenu query={q.toString()} />;
}

/* ------------------------------------------------------------------ */
/*  Periode                                                            */
/* ------------------------------------------------------------------ */

export function PeriodSelector({ range, minDate, today }: { range: StatPayload["range"]; minDate: string; today: string }) {
  const { go, setDatesOpen } = useContext(NavContext);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const isCustom = range.preset === "valg";

  /** Lukker datovælgeren; ved Escape og Anvend får knappen fokus igen. */
  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  // Bladretasterne (RangeStepper) læser dette og står stille, mens datovælgeren er åben.
  useEffect(() => {
    setDatesOpen(open);
    return () => setDatesOpen(false);
  }, [open, setDatesOpen]);

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

  return (
    <div ref={wrapRef} className="stat-noprint relative max-w-full self-start">
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
          ref={toggleRef}
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
            close(true);
            go({ periode: null, fra, til });
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bladr: dagen/perioden før og efter                                 */
/* ------------------------------------------------------------------ */

const stepButtonBase =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-[#E2E5E0] bg-white text-[14px] text-[#15211B]";

function stepButtonClass(enabled: boolean, extra = ""): string {
  return `${stepButtonBase} ${extra} ${
    enabled
      ? "cursor-pointer hover:border-[#C9CEC6] motion-safe:transition-transform motion-safe:duration-[120ms] motion-safe:active:scale-[0.96]"
      : "cursor-not-allowed opacity-40"
  }`;
}

function Chevron({ dir }: { dir: -1 | 1 }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d={dir === -1 ? "M10 3.5 5.5 8 10 12.5" : "M6 3.5 10.5 8 6 12.5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Forrige / næste dag eller periode og et hurtigt "I dag". Et skridt flytter
 * perioden sin egen længde (shiftRange). Lander man på i dag eller i går, bruges
 * forvalget, så knappen i periodevælgeren lyser. Pil venstre/højre gør det samme,
 * når fokus er på siden selv eller på knapperne her.
 */
export function RangeStepper({ range, minDate, today }: { range: StatPayload["range"]; minDate: string; today: string }) {
  const { go, pending, isDatesOpen } = useContext(NavContext);
  const ref = useRef<HTMLDivElement>(null);
  const singleDay = range.from === range.to;
  const isToday = singleDay && range.to === today;
  const { preset, from, to } = range;
  // Memoiseret på de felter, shiftRange bruger, så tastaturlytteren ikke tilmeldes igen ved hver rendering.
  const prev = useMemo(() => shiftRange({ preset, from, to }, -1, today, minDate), [preset, from, to, today, minDate]);
  const next = useMemo(() => shiftRange({ preset, from, to }, 1, today, minDate), [preset, from, to, today, minDate]);
  // Seneste pending i en ref, så lytteren kan læse den uden at blive tilmeldt igen.
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const step = useCallback(
    (target: { fra: string; til: string } | null) => {
      if (!target) return;
      const { fra, til } = target;
      if (fra === til && til === today) go({ periode: "idag", fra: null, til: null });
      else if (fra === til && til === addDays(today, -1)) go({ periode: "igaar", fra: null, til: null });
      else go({ periode: null, fra, til });
    },
    [go, today],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      // Holdt nede, datovælgeren åben eller en navigation allerede i gang: gør intet.
      if (e.repeat || isDatesOpen() || pendingRef.current) return;
      // Kun fra selve siden eller bladreknapperne: aldrig fra felter, datovælgeren eller andre vælgere.
      const t = e.target;
      const onPage = t === document.body || t === document.documentElement;
      if (!onPage && !(t instanceof Node && ref.current?.contains(t))) return;
      e.preventDefault();
      step(e.key === "ArrowLeft" ? prev : next);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, prev, next, isDatesOpen]);

  return (
    <div ref={ref} role="group" aria-label="Bladr i perioder" className="stat-noprint flex w-full items-center gap-2 min-[980px]:w-auto">
      <button
        type="button"
        aria-label={singleDay ? "Forrige dag" : "Forrige periode"}
        aria-disabled={!prev}
        className={stepButtonClass(Boolean(prev), "w-9")}
        onClick={() => step(prev)}
      >
        <Chevron dir={-1} />
      </button>
      <span
        aria-live="polite"
        className="min-w-0 flex-1 truncate text-center text-[14px] font-medium tabular-nums text-[#15211B] min-[980px]:min-w-[170px] min-[980px]:flex-none"
      >
        {range.rangeLabel}
      </span>
      {/* Under 980px står I dag før Næste, så forrige og næste ligger i hver sin kant. */}
      <button
        type="button"
        aria-label={singleDay ? "Næste dag" : "Næste periode"}
        aria-disabled={!next}
        className={stepButtonClass(Boolean(next), "w-9 max-[979px]:order-2")}
        onClick={() => step(next)}
      >
        <Chevron dir={1} />
      </button>
      {!isToday ? (
        <button
          type="button"
          className={stepButtonClass(true, "px-3 max-[979px]:order-1")}
          onClick={() => go({ periode: "idag", fra: null, til: null })}
        >
          I dag
        </button>
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
  const fraRef = useRef<HTMLInputElement>(null);
  const [fra, setFra] = useState(from);
  const [til, setTil] = useState(to);

  useEffect(() => {
    fraRef.current?.focus();
  }, []);

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
        <input
          ref={fraRef}
          id={`${id}-fra`}
          type="date"
          value={fra}
          min={minDate}
          max={today}
          onChange={(e) => {
            const next = e.target.value;
            setFra(next);
            // Til kan ikke ligge før fra: flyttes fra forbi til, følger til med.
            if (next && til && next > til) setTil(next);
          }}
          className={inputClass}
        />
      </label>
      <label htmlFor={`${id}-til`} className="flex flex-col gap-1 text-[13px] text-[#5E6A63]">
        Til
        <input id={`${id}-til`} type="date" value={til} min={fra || minDate} max={today} onChange={(e) => setTil(e.target.value)} className={inputClass} />
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
