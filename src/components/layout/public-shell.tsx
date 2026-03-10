"use client";

import { usePathname } from "next/navigation";
import { CartProvider } from "@/components/cart/cart-context";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { UpsellModal } from "@/components/cart/upsell-modal";
import { CookieConsent } from "@/components/ui/cookie-consent";
import { NewsletterPopup } from "@/components/ui/newsletter-popup";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <CartProvider>
      <Header />
      <main className="overflow-x-hidden">{children}</main>
      <Footer />
      <CartDrawer />
      <UpsellModal />
      <CookieConsent />
      <NewsletterPopup />
    </CartProvider>
  );
}
