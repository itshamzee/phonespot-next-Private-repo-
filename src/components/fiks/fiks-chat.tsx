"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { FiksFigure } from "./fiks-figure";
import { BUYBACK_STARTER, PANEL_CLASS } from "./fiks-shared";
import { FiksTeaser, useFiksTeaser } from "./fiks-teaser";
import styles from "./fiks.module.css";

// The panel (message list, form, fetch logic) loads on first open, so the
// launcher, the figure and the teaser are all every page carries.
const FiksPanel = dynamic(() => import("./fiks-panel").then((m) => m.FiksPanel), {
  ssr: false,
  loading: () => <div className={PANEL_CLASS} aria-hidden="true" />,
});

function preloadPanel() {
  void import("./fiks-panel");
}

/** Floating "Spørg Fiks" button, the teaser that grows out of it, and the chat panel it opens. */
export function FiksChat() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [starter, setStarter] = useState<{ id: number; text: string } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const pathname = usePathname() ?? "/";
  const teaser = useFiksTeaser({ chatOpened: mounted, pathname });

  useEffect(() => {
    // Focus goes back to the launcher when the panel closes (not on first render).
    if (wasOpen.current && !open) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const openChat = useCallback(() => {
    setMounted(true);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const disable = useCallback(() => {
    setOpen(false);
    setDisabled(true);
  }, []);
  const acceptTeaser = useCallback(() => {
    teaser.finish();
    setStarter({ id: Date.now(), text: BUYBACK_STARTER });
    openChat();
  }, [teaser, openChat]);

  if (disabled) return null;

  return (
    <>
      {!open && teaser.visible && <FiksTeaser state={teaser.state} onAccept={acceptTeaser} onClose={teaser.dismiss} />}
      {!open && (
        <button
          ref={buttonRef}
          type="button"
          onClick={openChat}
          onMouseEnter={preloadPanel}
          onFocus={preloadPanel}
          aria-label="Åbn chat med Fiks"
          aria-expanded={false}
          className={`${styles.launcher} fixed right-4 bottom-6 z-40 flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-green-eco text-white shadow-floating hover:bg-green-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-eco print:hidden sm:right-6 sm:h-auto sm:w-auto sm:py-2.5 sm:pr-5 sm:pl-3`}
        >
          <FiksFigure size={32} tone="light" />
          <span className="hidden text-[15px] font-semibold sm:inline">Spørg Fiks</span>
        </button>
      )}
      {/* Stays mounted after the first open so the conversation survives closing. */}
      {mounted && <FiksPanel open={open} onClose={close} onDisabled={disable} starter={starter} />}
    </>
  );
}
