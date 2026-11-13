"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const SCALE = 2.6;

/**
 * Lægges ovenpå et billedfelt (forælderen skal være `relative`). Klik eller tryk
 * åbner billedet i fuld størrelse; klik i billedet zoomer ind der, hvor man
 * klikker, og musen eller fingeren flytter rundt i det forstørrede billede.
 */
export function ZoomImage({ src, alt, hint = "Zoom" }: { src: string; alt: string; hint?: string }) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setZoomed(false);
    opener.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    closer.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [open, close]);

  const pointAt = (clientX: number, clientY: number) => {
    const r = frame.current?.getBoundingClientRect();
    if (!r) return { x: 50, y: 50 };
    return {
      x: Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100)),
    };
  };

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Se ${alt} tæt på`}
        className="absolute inset-0 z-[1] cursor-zoom-in"
      >
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-[4px] bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-charcoal shadow-sm">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M12.5 12.5 17 17M8.5 6v5M6 8.5h5" strokeLinecap="round" />
          </svg>
          {hint}
        </span>
      </button>

      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-[100] flex flex-col bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-[#e5e5ea] px-4 py-3 sm:px-6">
            <p className="min-w-0 truncate text-sm font-semibold text-charcoal">{alt}</p>
            <button
              ref={closer}
              type="button"
              onClick={close}
              className="inline-flex min-h-11 shrink-0 items-center rounded-[4px] border border-[#d9d4c8] px-4 text-sm font-semibold text-charcoal hover:bg-[#f4f5f2]"
            >
              Luk
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-8">
            <div
              ref={frame}
              className={`relative max-h-full max-w-full overflow-hidden touch-none select-none ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              onClick={(e) => {
                if (drag.current && (Math.abs(e.clientX - drag.current.x) > 6 || Math.abs(e.clientY - drag.current.y) > 6)) return;
                setOrigin(pointAt(e.clientX, e.clientY));
                setZoomed((z) => !z);
              }}
              onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, ox: origin.x, oy: origin.y }; }}
              onPointerUp={() => { setTimeout(() => { drag.current = null; }, 0); }}
              onPointerMove={(e) => {
                if (!zoomed) return;
                if (e.pointerType === "mouse") { setOrigin(pointAt(e.clientX, e.clientY)); return; }
                const d = drag.current;
                const r = frame.current?.getBoundingClientRect();
                if (!d || !r) return;
                setOrigin({
                  x: Math.min(100, Math.max(0, d.ox - ((e.clientX - d.x) / r.width) * 100)),
                  y: Math.min(100, Math.max(0, d.oy - ((e.clientY - d.y) / r.height) * 100)),
                });
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                draggable={false}
                className="block max-h-[calc(100dvh-9rem)] w-auto max-w-full transition-transform duration-200 ease-out"
                style={{ transform: zoomed ? `scale(${SCALE})` : "none", transformOrigin: `${origin.x}% ${origin.y}%` }}
              />
            </div>
          </div>
          <p className="px-4 pb-4 text-center text-xs text-[#626862]">
            {zoomed ? "Flyt rundt i billedet. Klik igen for at zoome ud." : "Klik eller tryk i billedet for at zoome ind."} Billedet viser et eksempel på standen.
          </p>
        </div>,
        document.body,
      )}
    </>
  );
}
