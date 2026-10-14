"use client";

import { useEffect } from "react";
import {
  captureAttribution,
  normalizeTrackStore,
  storeFromPath,
  trackClickToCall,
  trackGetDirections,
  trackMessagingClick,
} from "@/lib/tracking/events";

const MAPS_PATTERN = /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|maps\.google\.com|maps\.apple\.com|goo\.gl\/maps|\/dir\//i;

/** Klassificér et link-href. Eksporteret så det kan testes uden DOM. */
export function classifyHref(href: string): "call" | "directions" | "whatsapp" | "messenger" | null {
  const h = href.trim();
  if (/^tel:/i.test(h)) return "call";
  if (/wa\.me\/|api\.whatsapp\.com|web\.whatsapp\.com|^whatsapp:/i.test(h)) return "whatsapp";
  if (/m\.me\/|messenger\.com/i.test(h)) return "messenger";
  if (MAPS_PATTERN.test(h)) return "directions";
  return null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Én delegeret click-listener for hele sitet: tel:-links, ruteklik,
 * WhatsApp og Messenger. Dækker eksisterende links uden at røre komponenterne.
 * Gemmer også første UTM/gclid/fbclid i sessionStorage.
 */
export function GlobalClickTracker() {
  useEffect(() => {
    captureAttribution();

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!anchor) return;
      const path = window.location.pathname;
      if (path.startsWith("/admin")) return;
      const href = anchor.getAttribute("href") ?? "";
      const kind = classifyHref(href);
      if (!kind) return;

      const pageStore = storeFromPath(path);
      if (kind === "call") {
        trackClickToCall({ store: pageStore, pagePath: path, phone: href.replace(/^tel:/i, "") });
      } else if (kind === "directions") {
        // Rutelinket kan selv nævne butikken (fx q=Vejle); ellers bruges siden.
        trackGetDirections({ store: normalizeTrackStore(safeDecode(href), pageStore), pagePath: path });
      } else {
        trackMessagingClick({ channel: kind, store: pageStore, pagePath: path });
      }
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
