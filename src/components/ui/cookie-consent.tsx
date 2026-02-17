"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  }

  function reject() {
    localStorage.setItem("cookie-consent", "rejected");
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
