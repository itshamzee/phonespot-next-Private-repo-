import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import { barlowCondensed, dmSans } from "@/lib/fonts";
import { JsonLd, ORGANIZATION_JSONLD } from "@/components/seo/json-ld";
import { LayoutShell } from "@/components/layout/public-shell";
import { CookiebotProvider } from "@/components/consent/cookiebot-provider";
import { TrackingScripts } from "@/components/consent/tracking-scripts";
import "./globals.css";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://phonespot.dk"),
  title: {
    default: "PhoneSpot - Kvalitetstestede iPhones & iPads",
    template: "%s",
  },
  description:
    "Kvalitetstestede iPhones og iPads med 36 måneders garanti. Spar op til 40% og handl trygt med e-mærket.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "da_DK",
    siteName: "PhoneSpot",
    title: "PhoneSpot - Kvalitetstestede iPhones & iPads",
    description:
      "Kvalitetstestede iPhones og iPads med 36 måneders garanti. Spar op til 40% og handl trygt med e-mærket.",
    url: "https://phonespot.dk",
    images: [
      {
        url: "/brand/og-image.png",
        width: 1200,
        height: 630,
        alt: "PhoneSpot - Refurbished tech du kan stole på",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: "https://phonespot.dk",
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "facebook-domain-verification": "q1685kyprj3zr6oi722vkg6pkq5nsw",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className={`${barlowCondensed.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-warm-white font-body text-charcoal antialiased">
        {/* Google Consent Mode v2 defaults — must load before gtag */}
        <Script id="consent-mode-defaults" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              wait_for_update: 500
            });
          `}
        </Script>
        {GA4_ID && <GoogleAnalytics gaId={GA4_ID} />}
        {/* Google Ads conversion tracking. gtag.js is already loaded via
            <GoogleAnalytics> above so we just register the AW config. Gated
            behind marketing consent via Cookiebot — Consent Mode v2 also
            holds it back until ad_storage is granted. */}
        <Script
          id="google-ads-aw-config"
          strategy="afterInteractive"
          type="text/plain"
          data-cookieconsent="marketing"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('config', 'AW-17754730649');
          `}
        </Script>
        <CookiebotProvider />
        <JsonLd data={ORGANIZATION_JSONLD} />
        <LayoutShell>{children}</LayoutShell>
        {/* e-maerket verification widget — not gated (trust badge, not tracking) */}
        <Script
          src="https://widget.emaerket.dk/widget/v1/8a2653aa0adf3cc13568f383d289c6bf"
          strategy="afterInteractive"
        />
        {/* Trustpilot invitation API — gated behind marketing consent */}
        <Script
          src="https://invitejs.trustpilot.com/tp.min.js"
          strategy="afterInteractive"
          type="text/plain"
          data-cookieconsent="marketing"
        />
        <Script
          id="trustpilot-register"
          strategy="lazyOnload"
          type="text/plain"
          data-cookieconsent="marketing"
        >{`if(window.tp){window.tp("register","samJZr5LOOVwoRYo")}`}</Script>
        <TrackingScripts />
      </body>
    </html>
  );
}
