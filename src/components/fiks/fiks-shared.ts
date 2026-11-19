/** Shared between the always-loaded launcher and the lazily loaded panel. */

export const FIKS_TOKEN_KEY = "ps_fiks_token";
export const FIKS_ENDPOINT = "/api/fiks/chat";
export const FIKS_MAX_CHARS = 1000;

/** Starter chips in an empty chat. The middle one is also what the teaser sends. */
export const BUYBACK_STARTER = "Hvad er min iPhone værd?";
export const STARTERS = ["Hvad koster en ny skærm?", BUYBACK_STARTER, "Hvornår har I åbent?"];

/** Mobile: bottom sheet up to 85dvh. From sm: a 380x580 panel anchored bottom-right, where the launcher sits. */
export const PANEL_CLASS =
  "fixed inset-x-0 bottom-0 z-[55] flex h-[85dvh] flex-col overflow-hidden rounded-t-[12px] border border-soft-grey bg-white text-charcoal shadow-lg print:hidden " +
  "sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[580px] sm:max-h-[calc(100dvh-3rem)] sm:w-[380px] sm:rounded-[12px]";

export function readToken(): string | null {
  try {
    return window.sessionStorage.getItem(FIKS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeToken(token: string | null): void {
  try {
    if (token) window.sessionStorage.setItem(FIKS_TOKEN_KEY, token);
    else window.sessionStorage.removeItem(FIKS_TOKEN_KEY);
  } catch {
    // Private mode or storage disabled: the chat still works, it just won't survive a reload.
  }
}
