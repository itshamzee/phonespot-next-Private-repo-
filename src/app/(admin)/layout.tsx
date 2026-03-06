import type { Metadata } from "next";
import { barlowCondensed, dmSans } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "PhoneSpot Admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="da"
      className={`${barlowCondensed.variable} ${dmSans.variable}`}
    >
      <body className="min-h-screen bg-warm-white font-body text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
