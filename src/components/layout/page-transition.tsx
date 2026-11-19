"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Attribut på <main>, som globals.css animerer (ps-page-in). */
export const PAGE_ENTER_ATTR = "data-page-enter";

/**
 * Blødt sideskift ved navigation inde på sitet.
 *
 * Returnerer en ref til <main>. Første gang siden vises (server-HTML'en)
 * sker der intet. Når stien skifter, sættes `data-page-enter` på elementet,
 * så CSS'en toner det nye indhold frem, og attributten fjernes igen, når
 * animationen er slut. Børnene monteres aldrig om; kun attributten skifter.
 *
 * Kun stien tæller: filtre, sortering, sider og `?fiks=` (query) og
 * ankre (hash) ændrer ikke usePathname og giver derfor ingen animation.
 */
export function usePageTransition<T extends HTMLElement>() {
  const pathname = usePathname();
  const ref = useRef<T>(null);
  const previous = useRef(pathname);

  // Layout-effekt: attributten er sat, før browseren tegner den nye side,
  // så indholdet aldrig vises fuldt et enkelt billede før det toner frem.
  useLayoutEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const el = ref.current;
    if (!el) return;
    el.removeAttribute(PAGE_ENTER_ATTR);
    // Læs layoutet, så animationen starter forfra ved hurtige skift.
    void el.offsetWidth;
    el.setAttribute(PAGE_ENTER_ATTR, "");
    const done = (event: AnimationEvent) => {
      if (event.target === el) el.removeAttribute(PAGE_ENTER_ATTR);
    };
    el.addEventListener("animationend", done);
    el.addEventListener("animationcancel", done);
    return () => {
      el.removeEventListener("animationend", done);
      el.removeEventListener("animationcancel", done);
    };
  }, [pathname]);

  return ref;
}
