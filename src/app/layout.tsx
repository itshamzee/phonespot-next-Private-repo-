import type { Metadata } from "next";
import Script from "next/script";
import { barlowCondensed, dmSans } from "@/lib/fonts";
import { CartProvider } from "@/components/cart/cart-context";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CookieConsent } from "@/components/ui/cookie-consent";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhoneSpot - Kvalitetstestede iPhones & iPads",
  description:
    "Kvalitetstestede iPhones og iPads med 12 maneders garanti. Spar op til 40% og handl trygt med e-maerket.",
  icons: {
    icon: "/brand/favicons/favicon-dark.svg",
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
        <CartProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
        {/* e-mærket verification widget */}
        <Script
          src="https://widget.emaerket.dk/widget/v1/8a2653aa0adf3cc13568f383d289c6bf"
          strategy="afterInteractive"
        />
        <CookieConsent />
      </body>
    </html>
  );
}
