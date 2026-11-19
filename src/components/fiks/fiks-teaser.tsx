"use client";

import { useCallback, useEffect, useState } from "react";
import { readStoredConsent } from "@/lib/consent-client";
import { FiksFigure } from "./fiks-figure";
import styles from "./fiks.module.css";

export const TEASER_DELAY_MS = 8_000;
export const TEASER_VISIBLE_MS = 12_000;
/** How often to look again while the tab is hidden or the cookie banner is still open. */
export const TEASER_RECHECK_MS = 1_000;
export const TEASER_SEEN_KEY = "ps_fiks_teaser_seen";
const LEAVE_MS = 160;

const BLOCKED_PATHS = [/^\/saelg-din-enhed(\/|$)/, /^\/checkout(\/|$)/, /^\/kurv(\/|$)/, /^\/admin(\/|$)/];

/** Pages where the teaser would interrupt: the sell form itself, checkout, basket and admin. */
export function teaserAllowedOn(pathname: string): boolean {
  return !BLOCKED_PATHS.some((re) => re.test(pathname));
}

// Fallback when sessionStorage is unavailable: at most once per page load.
let shownWithoutStorage = false;

function alreadySeen(): boolean {
  try {
    return window.sessionStorage.getItem(TEASER_SEEN_KEY) === "1";
  } catch {
    return shownWithoutStorage;
  }
}

function markSeen(): void {
  shownWithoutStorage = true;
  try {
    window.sessionStorage.setItem(TEASER_SEEN_KEY, "1");
  } catch {
    // Private mode: the module flag above keeps it to once per page load.
  }
}

type Phase = "idle" | "entering" | "open" | "leaving" | "done";

/**
 * When to show the teaser: once per browser session, ~8s after the page
 * loaded, while the tab is visible, after a cookie choice exists, and never
 * once the chat has been opened. Hides itself after ~12s.
 */
export function useFiksTeaser({ chatOpened, pathname }: { chatOpened: boolean; pathname: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const allowed = teaserAllowedOn(pathname);
  const blocked = chatOpened || !allowed;

  // Wait for the delay, then for a visible tab and a cookie choice.
  useEffect(() => {
    if (phase !== "idle" || blocked || alreadySeen()) return;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = () => {
      if (document.visibilityState !== "visible" || !readStoredConsent()) {
        timer = setTimeout(attempt, TEASER_RECHECK_MS);
        return;
      }
      markSeen();
      setPhase("entering");
    };
    timer = setTimeout(attempt, TEASER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, blocked]);

  // Mounted in its start state; the next frame lets it grow in.
  useEffect(() => {
    if (phase !== "entering") return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPhase((p) => (p === "entering" ? "open" : p)));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [phase]);

  // Auto-hide.
  const showing = phase === "entering" || phase === "open";
  useEffect(() => {
    if (!showing) return;
    const timer = setTimeout(() => setPhase((p) => (p === "open" || p === "entering" ? "leaving" : p)), TEASER_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [showing]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = setTimeout(() => setPhase("done"), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const dismiss = useCallback(() => setPhase((p) => (p === "entering" || p === "open" ? "leaving" : p)), []);
  const finish = useCallback(() => setPhase("done"), []);

  // Opening the chat (or navigating to a page without the teaser) removes it at once.
  const visible = !blocked && (phase === "entering" || phase === "open" || phase === "leaving");
  return { visible, state: phase, dismiss, finish };
}

export function FiksTeaser({
  state,
  onAccept,
  onClose,
}: {
  state: string;
  onAccept: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      data-state={state}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      className={`${styles.teaser} fixed right-4 bottom-[calc(1.5rem+66px)] z-40 w-[min(280px,calc(100vw-2rem))] print:hidden sm:right-6`}
    >
      <div className="relative rounded-[12px] border border-soft-grey bg-white p-4 text-charcoal shadow-md">
        <span aria-hidden="true" className={styles.teaserTail} />
        <div className="flex items-start gap-3 pr-6">
          <FiksFigure size={28} />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-snug">Vi køber din gamle telefon</p>
            <p className="mt-0.5 text-sm leading-snug text-gray">Få en vejledende pris på et minut.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAccept}
          className={`${styles.press} mt-3 flex h-10 w-full items-center justify-center rounded-[8px] bg-green-eco text-[15px] font-semibold text-white hover:bg-green-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-eco`}
        >
          Få en pris
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Luk"
          className={`${styles.press} absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full text-gray hover:bg-cream hover:text-charcoal focus-visible:outline-2 focus-visible:outline-green-eco`}
        >
          <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
