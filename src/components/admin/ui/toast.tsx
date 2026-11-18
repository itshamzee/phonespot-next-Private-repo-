"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fælles toast til admin: én besked ad gangen nederst i midten, resten står i kø.
 * Almindelige beskeder er role="status" og lukker efter 4 s; fejl er role="alert"
 * og står i 8 s. Bevægelsen er .m-toast (app/admin-motion.css): de to felter er
 * altid monteret, så de kan tone ind og ud, og skærmlæsere hører ændringen.
 * Tænkt som afløser for alert() i senere trin.
 */

export type ToastTone = "neutral" | "error";
type ToastItem = { id: number; message: string; tone: ToastTone };
type ToastFn = (message: string, options?: { tone?: ToastTone }) => void;

const VISIBLE_MS: Record<ToastTone, number> = { neutral: 4000, error: 8000 };
/** Samme som --dur-base: tid til at tone ud, før næste vises. */
const EXIT_MS = 220;

const ToastCtx = createContext<ToastFn | null>(null);

export function useToast(): ToastFn {
  const toast = useContext(ToastCtx);
  if (!toast) throw new Error("useToast skal bruges inde i <ToastProvider>");
  return toast;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const [open, setOpen] = useState(false);
  const queue = useRef<ToastItem[]>([]);
  const active = useRef(false);
  const nextId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNext = useCallback(function showNext() {
    const next = queue.current.shift();
    if (!next) {
      active.current = false;
      setCurrent(null);
      return;
    }
    active.current = true;
    setCurrent(next);
    setOpen(true);
    timer.current = setTimeout(() => {
      setOpen(false);
      timer.current = setTimeout(showNext, EXIT_MS);
    }, VISIBLE_MS[next.tone]);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const toast = useCallback<ToastFn>(
    (message, options) => {
      queue.current.push({ id: nextId.current++, message, tone: options?.tone ?? "neutral" });
      if (!active.current) showNext();
    },
    [showNext],
  );

  const showing = (tone: ToastTone) => open && current?.tone === tone;
  const text = (tone: ToastTone) => (current?.tone === tone ? current.message : "");

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] grid justify-items-center px-4">
        <div
          role="status"
          aria-live="polite"
          data-open={showing("neutral")}
          className="m-toast [grid-area:1/1] max-w-[min(480px,100%)] rounded-[10px] bg-[#15211B] px-[18px] py-3 text-[14px] text-white empty:p-0"
        >
          {text("neutral")}
        </div>
        <div
          role="alert"
          data-open={showing("error")}
          className="m-toast [grid-area:1/1] max-w-[min(480px,100%)] rounded-[10px] border border-[#F3C6C2] bg-[#FDECEC] px-[18px] py-3 text-[14px] font-medium text-[#B42318] empty:border-0 empty:p-0"
        >
          {text("error")}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}
