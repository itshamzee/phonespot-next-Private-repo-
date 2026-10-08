"use client";

import { OPEN_COOKIE_SETTINGS_EVENT } from "@/lib/consent-client";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
      className="text-sm text-white/60 transition-colors hover:text-white"
    >
      Administrer cookies
    </button>
  );
}
