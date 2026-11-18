"use client";

import { useCallback, useEffect, useId, useState, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Punkter i rammens små menuer; samme flade ved hover og tastaturfokus. */
export const menuItemClass =
  "m-press block rounded-lg px-2.5 py-2 text-[14px] hover:bg-[#F5F6F4] focus-visible:bg-[#F5F6F4] focus-visible:outline-none";

/**
 * Fælles opførsel for rammens små menuer (konto, notifikationer). Panelet er altid
 * monteret med .m-pop og data-open, så det kan tone ind og ud. Ved åbning får første
 * punkt fokus (eller panelet selv, hvis det er tomt); Escape og valg af et punkt
 * lukker og giver fokus tilbage til knappen. Klik udenfor lukker og lader fokus blive,
 * hvor der blev klikket.
 */
export function usePopoverMenu({
  wrapRef,
  triggerRef,
  panelRef,
}: {
  /** Omslutter knap og panel; klik udenfor lukker. */
  wrapRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, [triggerRef]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus({ preventScroll: true });

    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, wrapRef, panelRef]);

  return {
    open,
    panelId,
    toggle: () => setOpen((v) => !v),
    /** Til punkterne i menuen: luk og giv fokus tilbage til knappen. */
    closeAndReturn: () => close(true),
  };
}
