"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";

const NAV_LINKS = [
  { label: "iPhones", href: "/iphones" },
  { label: "iPads", href: "/ipads" },
  { label: "Smartphones", href: "/smartphones" },
  { label: "Bærbare", href: "/baerbare" },
  { label: "Covers", href: "/covers" },
  { label: "Reservedele", href: "/reservedele" },
  { label: "Outlet", href: "/outlet" },
  { label: "Reparation", href: "/reparation" },
] as const;

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? "h-5 w-5"}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? "h-5 w-5"}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? "h-6 w-6"}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? "h-6 w-6"}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18 18 6M6 6l12 12"
      />
    </svg>
  );
}

export function Header() {
  const { cart, openCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  const totalItems = cart?.totalQuantity ?? 0;

  return (
    <header
      className="sticky top-0 z-50 border-b border-sand"
      style={{
        backgroundColor: "rgba(245,242,236,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Mobile hamburger */}
        <button
          type="button"
          className="lg:hidden text-charcoal"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Luk menu" : "Abn menu"}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <img
            src="/brand/logos/phonespot-wordmark-dark.svg"
            alt="PhoneSpot"
            width={140}
            height={32}
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-display text-[11px] font-semibold uppercase tracking-[3px] text-gray transition-colors hover:text-charcoal"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side: search + cart */}
        <div className="flex items-center gap-3">
          <Link
            href="/soeg"
            className="text-charcoal transition-colors hover:text-green-eco"
            aria-label="Sog"
          >
            <SearchIcon />
          </Link>

          <button
            type="button"
            className="relative text-charcoal transition-colors hover:text-green-eco"
            onClick={openCart}
            aria-label="Abn kurv"
          >
            <CartIcon />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-eco text-[10px] font-semibold text-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav slide-down */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-sand bg-warm-white px-4 pb-4">
          <div className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-display text-[11px] font-semibold uppercase tracking-[3px] text-gray py-2.5 transition-colors hover:text-charcoal"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
