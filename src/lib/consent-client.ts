/**
 * Browser-side consent state for the site's own cookie banner.
 *
 * The choice lives in localStorage under CONSENT_STORAGE_KEY. The inline
 * scripts in app/layout.tsx and TrackingScripts read the same key before any
 * tag fires, so returning visitors get the right Consent Mode defaults on
 * every page (including the order confirmation, which never mounts the
 * banner). applyConsent() handles a choice made mid-visit.
 */
import { logConsent } from "@/lib/consent";

export const CONSENT_STORAGE_KEY = "cookie-consent";
export const OPEN_COOKIE_SETTINGS_EVENT = "phonespot:open-cookie-settings";

export type StoredConsent = "accepted" | "rejected";

export function readStoredConsent(): StoredConsent | null {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

export function setConsent(granted: boolean): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, granted ? "accepted" : "rejected");
  } catch {
    // Private mode: the choice still applies for this page view.
  }
  applyConsent(granted);
  void logConsent({
    necessary: true,
    statistics: granted,
    marketing: granted,
    preferences: granted,
    stamp: crypto.randomUUID(),
  });
}

export function applyConsent(granted: boolean): void {
  const state = granted ? "granted" : "denied";
  // window.gtag is defined by the consent-mode-defaults script in layout.tsx.
  window.gtag?.("consent", "update", {
    analytics_storage: state,
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
  });
  window.fbq?.("consent", granted ? "grant" : "revoke");
  if (granted) loadTrustpilotInvites();
}

let trustpilotLoaded = false;

/** Trustpilot invitation script — marketing, so only after consent. */
export function loadTrustpilotInvites(): void {
  if (trustpilotLoaded || typeof document === "undefined") return;
  trustpilotLoaded = true;
  const script = document.createElement("script");
  script.src = "https://invitejs.trustpilot.com/tp.min.js";
  script.async = true;
  script.onload = () => {
    const tp = (window as unknown as { tp?: (...args: unknown[]) => void }).tp;
    tp?.("register", "samJZr5LOOVwoRYo");
  };
  document.head.appendChild(script);
}
