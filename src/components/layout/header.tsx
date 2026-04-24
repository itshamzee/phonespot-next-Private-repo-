"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";

/* ------------------------------------------------------------------ */
/*  Navigation data                                                    */
/* ------------------------------------------------------------------ */

type NavItem = {
  label: string;
  href: string;
  description: string;
  tag?: string;
};

const PRODUKT_ITEMS: NavItem[] = [
  { label: "iPhones", href: "/iphones", description: "Fra iPhone SE til 16 Pro Max", tag: "Populær" },
  { label: "iPads", href: "/ipads", description: "iPad Air, iPad Pro og mere" },
  { label: "Bærbare", href: "/baerbare", description: "MacBook, ThinkPad, EliteBook" },
  { label: "Smartwatches", href: "/smartwatches", description: "Apple Watch fra 1.099 kr" },
  { label: "Tilbehør", href: "/tilbehoer", description: "Covers, kabler og opladere" },
  { label: "Beskyttelsesglas", href: "/beskyttelsesglas", description: "9H hærdet · gratis montering", tag: "Nyt" },
];

const OM_PHONESPOT_ITEMS: NavItem[] = [
  { label: "Om os", href: "/om-os", description: "Mød teamet bag PhoneSpot" },
  { label: "Kvalitet", href: "/kvalitet", description: "30+ tests og vores graderingssystem" },
  { label: "FAQ", href: "/faq", description: "Svar på ofte stillede spørgsmål" },
  { label: "Kontakt", href: "/kontakt", description: "Send os en besked" },
  { label: "Butik", href: "/butik", description: "Besøg os i Slagelse" },
];

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className ?? "h-5 w-5"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className ?? "h-5 w-5"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className ?? "h-3.5 w-3.5"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Announcement bar — stores, phone, trust signals                   */
/* ------------------------------------------------------------------ */

function AnnouncementBar() {
  return (
    <div className="bg-[#1A3D2E]">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-3 sm:px-4 text-xs font-medium text-white/85">
        {/* Left: stores + phone */}
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="inline-flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="hidden sm:inline">Slagelse &amp; Vejle</span>
            <span className="sm:hidden">Butikker</span>
          </span>
          <a
            href="tel:+4561100048"
            className="inline-flex items-center gap-1.5 hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            61 10 00 48
          </a>
        </div>

        {/* Right: trust signals */}
        <div className="hidden sm:flex items-center gap-4">
          <span>Fri fragt over 500,-</span>
          <span aria-hidden="true" className="text-white/30">·</span>
          <a
            href="https://dk.trustpilot.com/review/phonespot.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#00B67A] hover:underline"
          >
            Trustpilot
            <span className="font-semibold">★ 4.4</span>
          </a>
          <span aria-hidden="true" className="text-white/30">·</span>
          <span>36 mdr. garanti</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mega-menu dropdown (desktop)                                       */
/* ------------------------------------------------------------------ */

function MegaMenuPanel({
  items,
  onClose,
}: {
  items: NavItem[];
  onClose: () => void;
}) {
  return (
    <div
      className="absolute left-1/2 top-full z-50 -translate-x-1/2 rounded-xl border border-sand bg-white shadow-lg"
      style={{ minWidth: "240px", marginTop: "8px" }}
    >
      <div className="p-1.5">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="group flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-cream"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-charcoal group-hover:text-green-eco transition-colors">
                  {item.label}
                </p>
                {item.tag && (
                  <span className="rounded-full bg-green-eco px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    {item.tag}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray leading-snug">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: NavItem[];
}) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 text-[13px] font-semibold tracking-normal transition-colors font-display ${
          open ? "text-green-eco" : "text-charcoal hover:text-green-eco"
        }`}
        aria-expanded={open}
      >
        {label}
        <ChevronIcon className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && <MegaMenuPanel items={items} onClose={() => setOpen(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile nav                                                         */
/* ------------------------------------------------------------------ */

function MobileSection({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-sand">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-[13px] font-semibold tracking-normal text-charcoal font-display"
      >
        {label}
        <ChevronIcon
          className={`h-4 w-4 text-gray transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-200 ${
          expanded ? "grid-rows-[1fr] pb-2" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-cream"
            >
              <div>
                <p className="text-sm font-medium text-charcoal">{item.label}</p>
                <p className="text-xs text-gray mt-0.5">{item.description}</p>
              </div>
              {item.tag && (
                <span className="rounded-full bg-green-eco px-2 py-0.5 text-[9px] font-bold text-white">
                  {item.tag}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Search overlay                                                     */
/* ------------------------------------------------------------------ */

type SearchResult = {
  handle: string;
  title: string;
  image: string | null;
  price: string;
  compareAtPrice: string;
  currency: string;
  available: boolean;
  productType: string;
};

const PRODUCT_TYPE_TO_COLLECTION: Record<string, string> = {
  iphone: "iphones",
  ipad: "ipads",
  smartphone: "smartphones",
  laptop: "baerbare",
  smartwatch: "smartwatches",
  cover: "covers",
  tilbehoer: "tilbehor",
};

function getCollectionSlug(productType: string): string {
  const lower = productType.toLowerCase();
  for (const [key, slug] of Object.entries(PRODUCT_TYPE_TO_COLLECTION)) {
    if (lower.includes(key)) return slug;
  }
  return "iphones";
}

function formatPrice(amount: string, currency: string) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) setResults(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/soeg?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto mt-20 w-[calc(100%-2rem)] max-w-2xl">
        <form onSubmit={handleSubmit} className="relative">
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Søg efter produkter..."
            className="w-full rounded-xl border border-sand bg-white py-4 pl-12 pr-12 text-charcoal shadow-lg placeholder:text-gray/60 focus:border-green-eco focus:ring-2 focus:ring-green-eco/20 focus:outline-none text-base"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray transition-colors hover:text-charcoal"
            aria-label="Luk søgning"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </form>

        {query.trim() && (
          <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-sand bg-white shadow-lg">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-sand border-t-green-eco" />
              </div>
            ) : results.length > 0 ? (
              <div className="p-2">
                {results.map((r) => (
                  <Link
                    key={r.handle}
                    href={`/${getCollectionSlug(r.productType)}/${r.handle}`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-cream"
                  >
                    {r.image ? (
                      <img src={r.image} alt={r.title} className="h-14 w-14 rounded-lg bg-sand/20 object-contain shrink-0" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-sand/20 text-gray">
                        <SearchIcon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-charcoal">{r.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-bold text-green-eco">
                          {formatPrice(r.price, r.currency)}
                        </span>
                        {Number(r.compareAtPrice) > Number(r.price) && (
                          <span className="text-xs text-gray line-through">
                            {formatPrice(r.compareAtPrice, r.currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                <Link
                  href={`/soeg?q=${encodeURIComponent(query.trim())}`}
                  onClick={onClose}
                  className="mt-1 flex items-center justify-center rounded-lg py-3 text-sm font-semibold text-green-eco transition-colors hover:bg-cream"
                >
                  Se alle resultater &rarr;
                </Link>
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-sm text-gray">Ingen produkter fundet for &lsquo;{query}&rsquo;</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

export function Header() {
  const { totals, openCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const totalItems = totals.itemCount;

  // Track scroll for subtle bottom shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
          scrolled ? "shadow-[0_1px_12px_rgba(0,0,0,0.06)]" : ""
        }`}
      >
        <AnnouncementBar />

        {/* Main nav bar */}
        <div className="border-b border-sand">
          <div className="mx-auto flex h-14 max-w-7xl items-center px-4 lg:h-16 lg:px-8">

            {/* LEFT: Logo */}
            <div className="flex items-center">
              {/* Hamburger — mobile only */}
              <button
                type="button"
                className="lg:hidden flex h-11 w-11 items-center justify-center rounded-lg text-charcoal transition-colors hover:bg-cream mr-2"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Luk menu" : "Åbn menu"}
              >
                {mobileOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>

              <Link href="/" className="flex-shrink-0">
                <img
                  src="/brand/logos/phonespot-wordmark-dark.png"
                  alt="PhoneSpot"
                  width={130}
                  height={30}
                  className="h-7 w-auto lg:h-8"
                />
              </Link>
            </div>

            {/* CENTER: Desktop nav */}
            <nav className="hidden lg:flex items-center justify-center gap-7 flex-1" aria-label="Primær navigation">
              <NavDropdown label="Produkter" items={PRODUKT_ITEMS} />
              <Link
                href="/reparation"
                className="text-[13px] font-semibold tracking-normal text-charcoal hover:text-green-eco transition-colors font-display"
              >
                Reparation
              </Link>
              <Link
                href="/saelg-din-enhed"
                className="text-[13px] font-semibold tracking-normal text-charcoal hover:text-green-eco transition-colors font-display"
              >
                Sælg din enhed
              </Link>
              <NavDropdown label="Om os" items={OM_PHONESPOT_ITEMS} />
              <Link
                href="/b2b"
                className="text-[13px] font-medium text-[#86868B] hover:text-green-eco transition-colors font-display"
              >
                Forhandler
              </Link>
            </nav>

            {/* RIGHT: B2B + Search + Cart */}
            <div className="flex items-center gap-1 ml-auto">
              <Link
                href="/b2b"
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#1A3D2E] px-3 py-1.5 text-[11px] font-semibold text-[#1A3D2E] transition-colors hover:bg-[#1A3D2E] hover:text-white mr-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                </svg>
                B2B Portal
              </Link>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-charcoal transition-colors hover:bg-cream hover:text-green-eco"
                aria-label="Søg"
              >
                <SearchIcon className="h-5 w-5" />
              </button>

              <button
                type="button"
                className="relative flex h-11 w-11 items-center justify-center rounded-lg text-charcoal transition-colors hover:bg-cream hover:text-green-eco"
                onClick={openCart}
                aria-label="Åbn kurv"
              >
                <CartIcon className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-green-eco px-1 text-[10px] font-bold text-white">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Search overlay */}
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      </header>

      {/* Mobile nav panel — outside header to avoid backdrop-filter stacking context */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setMobileOpen(false)}
          />
          {/* Full-height white panel */}
          <div
            className="absolute inset-x-0 top-[5.5rem] bottom-0 overflow-y-auto bg-white"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <nav className="mx-auto max-w-full sm:max-w-lg px-5 pb-10 pt-2">

              {/* Primary action tiles */}
              <div className="mb-5 grid grid-cols-2 gap-3 pt-2">
                <Link
                  href="/reparation"
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-sand bg-cream p-4 transition-colors hover:border-sand hover:bg-cream/80"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-green-eco">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.192-.14 1.743Z" />
                  </svg>
                  <span className="text-sm font-semibold text-charcoal mt-1">Reparation</span>
                  <span className="text-[11px] text-gray leading-tight">Book tid eller walk-in</span>
                </Link>
                <Link
                  href="/saelg-din-enhed"
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-sand bg-cream p-4 transition-colors hover:border-sand hover:bg-cream/80"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-green-eco">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                  <span className="text-sm font-semibold text-charcoal mt-1">Sælg din enhed</span>
                  <span className="text-[11px] text-gray leading-tight">Få tilbud på din brugte enhed</span>
                </Link>
              </div>

              {/* Expandable sections */}
              <MobileSection label="Produkter" items={PRODUKT_ITEMS} onNavigate={() => setMobileOpen(false)} />
              <MobileSection label="Om os" items={OM_PHONESPOT_ITEMS} onNavigate={() => setMobileOpen(false)} />

              {/* Footer links */}
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  { label: "FAQ", href: "/faq" },
                  { label: "Garanti", href: "/garanti" },
                  { label: "Butik", href: "/butik" },
                  { label: "Forhandler", href: "/b2b" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-full border border-sand px-4 py-2 text-xs font-medium text-charcoal transition-colors hover:bg-cream"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
