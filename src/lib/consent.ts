export type ConsentCategory = "necessary" | "statistics" | "marketing" | "preferences";

export type ConsentState = {
  necessary: boolean;
  statistics: boolean;
  marketing: boolean;
  preferences: boolean;
  stamp: string;
};

export const CONSENT_TYPE_MAP: Record<string, string> = {
  statistics: "cookies_statistics",
  marketing: "cookies_marketing",
  preferences: "cookies_preferences",
} as const;

export async function logConsent(consent: ConsentState): Promise<void> {
  try {
    await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statistics: consent.statistics,
        marketing: consent.marketing,
        preferences: consent.preferences,
        stamp: consent.stamp,
      }),
    });
  } catch {
    console.warn("Failed to log consent to backend");
  }
}

declare global {
  interface Window {
    Cookiebot?: {
      consent: {
        necessary: boolean;
        statistics: boolean;
        marketing: boolean;
        preferences: boolean;
        stamp: string;
      };
      show: () => void;
      renew: () => void;
      withdraw: () => void;
    };
    CookiebotCallback_OnAccept?: () => void;
    CookiebotCallback_OnDecline?: () => void;
  }
}
