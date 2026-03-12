"use client";

import Script from "next/script";
import { useEffect } from "react";
import { logConsent } from "@/lib/consent";

const COOKIEBOT_CBID = process.env.NEXT_PUBLIC_COOKIEBOT_CBID ?? "";

export function CookiebotProvider() {
  useEffect(() => {
    window.CookiebotCallback_OnAccept = () => {
      if (window.Cookiebot?.consent) {
        logConsent({
          necessary: true,
          statistics: window.Cookiebot.consent.statistics,
          marketing: window.Cookiebot.consent.marketing,
          preferences: window.Cookiebot.consent.preferences,
          stamp: window.Cookiebot.consent.stamp,
        });
      }
    };

    window.CookiebotCallback_OnDecline = () => {
      if (window.Cookiebot?.consent) {
        logConsent({
          necessary: true,
          statistics: false,
          marketing: false,
          preferences: false,
          stamp: window.Cookiebot.consent.stamp,
        });
      }
    };

    return () => {
      delete window.CookiebotCallback_OnAccept;
      delete window.CookiebotCallback_OnDecline;
    };
  }, []);

  if (!COOKIEBOT_CBID) return null;

  return (
    <Script
      id="Cookiebot"
      src="https://consent.cookiebot.com/uc.js"
      data-cbid={COOKIEBOT_CBID}
      data-blockingmode="auto"
      data-culture="da"
      strategy="beforeInteractive"
    />
  );
}
