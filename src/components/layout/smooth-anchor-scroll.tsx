"use client";

import { useEffect } from "react";

/**
 * Blødt rul til ankre på samme side ("Se udvalget", "Find model og pris",
 * indholdsfortegnelser). Bevidst ikke `scroll-behavior: smooth` på <html>:
 * det ville også gøre browserens rul til et anker ved indlæsning og alle
 * scrollTo-kald på sitet bløde. Her rører vi kun klik på et link til et anker
 * på den side, man står på; sideskift, tilbage/frem og ankre ved indlæsning
 * hopper som før.
 *
 * Returnerer true, når klikket blev håndteret (og standardhandlingen stoppet).
 */
export function handleAnchorClick(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const origin = event.target;
  if (!(origin instanceof Element)) return false;
  const anchor = origin.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return false;

  const { location, history } = window;
  if (location.pathname.startsWith("/admin")) return false;
  let url: URL;
  try {
    url = new URL(anchor.href, location.href);
  } catch {
    return false;
  }
  // Kun et anker på præcis denne side; alt andet er et almindeligt sideskift.
  if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return false;
  if (url.hash.length < 2) return false;

  let id: string;
  try {
    id = decodeURIComponent(url.hash.slice(1));
  } catch {
    return false;
  }
  const target = document.getElementById(id);
  if (!target) return false;

  event.preventDefault();
  // Reduceret bevægelse og tastatur (Enter på et link, fx "Gå til indhold") hopper.
  const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const instant = reduce || event.detail === 0;
  target.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "start" });
  if (location.hash !== url.hash) history.pushState(null, "", url.hash);

  // Flyt fokus til målet, så tastatur og skærmlæser fortsætter derfra.
  if (!target.hasAttribute("tabindex") && target.tabIndex < 0) {
    target.setAttribute("tabindex", "-1");
    target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  }
  target.focus({ preventScroll: true });
  return true;
}

/** Én delegeret lytter for hele sitet (samme mønster som GlobalClickTracker). */
export function SmoothAnchorScroll() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      handleAnchorClick(event);
    };
    // Capture: kører før next/link, som så ser defaultPrevented og lader klikket være.
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
