import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { barlowCondensed, dmSans } from "@/lib/fonts";
import { JsonLd, ORGANIZATION_JSONLD } from "@/components/seo/json-ld";
import { LayoutShell } from "@/components/layout/public-shell";
import { CookiebotProvider } from "@/components/consent/cookiebot-provider";
import { TrackingScripts } from "@/components/consent/tracking-scripts";
import "./globals.css";

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
    icon: "/brand/favicons/favicon-dark.svg",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className={`${barlowCondensed.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-warm-white font-body text-charcoal antialiased">
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
