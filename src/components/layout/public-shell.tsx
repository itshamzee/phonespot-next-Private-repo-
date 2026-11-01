"use client";

import { usePathname } from "next/navigation";
import { CartProvider } from "@/components/cart/cart-context";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartUpsellRouter } from "@/components/cart/cart-upsell-router";
import type { MegaMenu } from "@/lib/navigation/mega-menu";
import { CookieConsent } from "@/components/ui/cookie-consent";
import { MessengerChat } from "@/components/ui/messenger-chat";

export function LayoutShell({ children, menu = null }: { children: React.ReactNode; menu?: MegaMenu | null }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <CartProvider>
      <Header menu={menu} />
      <main id="indhold" tabIndex={-1} className="overflow-x-clip">{children}</main>
      <Footer />
      <CartDrawer />
      <CartUpsellRouter />
      <CookieConsent />
      <MessengerChat />
    </CartProvider>
  );
}
