"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  OPEN_COOKIE_SETTINGS_EVENT,
  readStoredConsent,
  setConsent,
} from "@/lib/consent-client";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!readStoredConsent()) setVisible(true);
    });
    const reopen = () => setVisible(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    };
  }, []);

  function accept() {
    setConsent(true);
    setVisible(false);
  }

  function reject() {
    setConsent(false);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-soft-grey bg-white px-4 py-4 shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-charcoal">
          Vi bruger cookies for at forbedre din oplevelse.{" "}
          <Link href="/cookies" className="underline text-green-eco">
            Læs mere
          </Link>
        </p>
        <div className="flex gap-3">
          <button
            onClick={reject}
            className="rounded-full border border-soft-grey px-5 py-2 text-sm font-medium text-charcoal transition-colors hover:border-charcoal"
          >
            Afvis
          </button>
          <button
            onClick={accept}
            className="rounded-full bg-green-eco px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Acceptér
          </button>
        </div>
      </div>
    </div>
  );
}
