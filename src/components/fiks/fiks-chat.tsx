"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { PANEL_CLASS } from "./fiks-shared";

// The panel (message list, form, fetch logic) loads on first open, so the
// launcher is all every page carries.
const FiksPanel = dynamic(() => import("./fiks-panel").then((m) => m.FiksPanel), {
  ssr: false,
  loading: () => <div className={PANEL_CLASS} aria-hidden="true" />,
});

function preloadPanel() {
  void import("./fiks-panel");
}

/** Floating "Spørg Fiks" button and the chat panel it opens. */
export function FiksChat() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    // Focus goes back to the launcher when the panel closes (not on first render).
    if (wasOpen.current && !open) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const close = useCallback(() => setOpen(false), []);
  const disable = useCallback(() => {
    setOpen(false);
    setDisabled(true);
  }, []);

  if (disabled) return null;

  return (
    <>
      {!open && (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            setMounted(true);
            setOpen(true);
          }}
          onMouseEnter={preloadPanel}
          onFocus={preloadPanel}
          aria-label="Åbn chat med Fiks"
          aria-expanded={false}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-green-eco px-4 py-3 text-white shadow-md transition-colors hover:bg-green-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-eco print:hidden md:px-5 md:py-3.5"
        >
          <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Z" />
          </svg>
          <span className="hidden text-sm font-semibold sm:inline">Spørg Fiks</span>
        </button>
      )}
      {/* Stays mounted after the first open so the conversation survives closing. */}
      {mounted && <FiksPanel open={open} onClose={close} onDisabled={disable} />}
    </>
  );
}
