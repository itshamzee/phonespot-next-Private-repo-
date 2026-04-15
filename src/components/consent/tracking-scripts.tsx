"use client";

import Script from "next/script";

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID ?? "";
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? "";
const KLAVIYO_PUBLIC_KEY = process.env.NEXT_PUBLIC_KLAVIYO_PUBLIC_KEY ?? "";

export function TrackingScripts() {
  return (
    <>
      {/* GA4 is now loaded via @next/third-parties/google in layout.tsx
          with Consent Mode v2 defaults (denied). Cookiebot updates consent
          on accept via the CookiebotCallback_OnAccept hook. */}

      {/* Consent Mode update — grant analytics when Cookiebot statistics accepted */}
      <Script id="consent-mode-cookiebot-bridge" strategy="afterInteractive">
        {`
          window.addEventListener('CookiebotOnAccept', function() {
            if (window.Cookiebot && window.Cookiebot.consent) {
              function gtag(){window.dataLayer=window.dataLayer||[];window.dataLayer.push(arguments);}
              gtag('consent', 'update', {
                analytics_storage: window.Cookiebot.consent.statistics ? 'granted' : 'denied',
                ad_storage: window.Cookiebot.consent.marketing ? 'granted' : 'denied',
                ad_user_data: window.Cookiebot.consent.marketing ? 'granted' : 'denied',
                ad_personalization: window.Cookiebot.consent.marketing ? 'granted' : 'denied'
              });
            }
          });
        `}
      </Script>

      {/* Facebook Pixel — marketing category */}
      {FB_PIXEL_ID && (
        <Script
          id="fb-pixel"
          type="text/plain"
          data-cookieconsent="marketing"
          strategy="afterInteractive"
        >
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${FB_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* TikTok Pixel — marketing category */}
      {TIKTOK_PIXEL_ID && (
        <Script
          id="tiktok-pixel"
          type="text/plain"
          data-cookieconsent="marketing"
          strategy="afterInteractive"
        >
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
              ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
              ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
              for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
              ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
              ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
              ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
              ttq._o=ttq._o||{};ttq._o[e]=n||{};
              var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
              var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
              ttq.load('${TIKTOK_PIXEL_ID}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}

      {/* Klaviyo — marketing category */}
      {KLAVIYO_PUBLIC_KEY && (
        <Script
          src={`https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=${KLAVIYO_PUBLIC_KEY}`}
          type="text/plain"
          data-cookieconsent="marketing"
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
