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
  { label: "Smartphones", href: "/smartphones", description: "Samsung, OnePlus og mere" },
  { label: "iPads", href: "/ipads", description: "iPad Air, iPad Pro og mere" },
  { label: "Bærbare", href: "/baerbare", description: "MacBook, ThinkPad, EliteBook" },
  { label: "Smartwatches", href: "/smartwatches", description: "Apple Watch fra 1.099 kr" },
  { label: "Tilbehør", href: "/tilbehoer", description: "Covers, kabler og panserglas" },
];

const SERVICE_ITEMS: NavItem[] = [
  { label: "Reparation", href: "/reparation", description: "Skærm, batteri og mere — fra 30 min" },
  { label: "Sælg din enhed", href: "/saelg-din-enhed", description: "Få et tilbud på din brugte enhed" },
  { label: "Reservedele", href: "/reservedele", description: "Skærme, batterier og værktøj" },
];

const INFO_ITEMS: NavItem[] = [
  { label: "Om os", href: "/om-os", description: "Mød teamet bag PhoneSpot" },
  { label: "Kvalitet", href: "/kvalitet", description: "30+ tests og vores graderingssystem" },
  { label: "FAQ", href: "/faq", description: "Svar på ofte stillede spørgsmål" },
  { label: "Kontakt", href: "/kontakt", description: "Skriv eller ring til os" },
  { label: "Blog", href: "/blog", description: "Guides og nyheder" },
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
/*  Announcement bar with marquee on mobile                            */
/* ------------------------------------------------------------------ */

function msUntilCutoff(): number {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(16, 0, 0, 0);
  const diff = cutoff.getTime() - now.getTime();
  return diff > 0 ? diff : 0;
}

function CountdownTimer() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setRemaining(msUntilCutoff());
    const id = setInterval(() => setRemaining(msUntilCutoff()), 1000);
    return () => clearInterval(id);
  }, []);

  if (remaining === null) {
    return <span>Sendt samme dag</span>;
  }

  if (remaining <= 0) {
    return <span>Sendt i morgen</span>;
  }

  const totalSec = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span>
      Sendt om{" "}
      <span className="font-bold tabular-nums text-green-light">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </span>
  );
}

type AnnouncementItem = {
  icon: string;
  text: string | null;
  color?: string;
  href?: string;
  isCountdown?: boolean;
};

const ANNOUNCEMENT_ITEMS: AnnouncementItem[] = [
  { icon: "★", text: "Trustpilot 4.4", color: "text-[#00B67A]", href: "https://dk.trustpilot.com/review/phonespot.dk" },
  { icon: "✓", text: "Fri fragt over 500,-" },
  { icon: "⏱", text: null, isCountdown: true },
  { icon: "🛡", text: "36 mdr. garanti" },
  { icon: "✦", text: "Klarna delbetaling", color: "text-[#FFB3C7]" },
];

function AnnouncementBar() {
  return (
    <div className="relative bg-charcoal text-white overflow-hidden">
      {/* Desktop: static row */}
      <div className="hidden lg:flex h-8 items-center justify-center gap-8 px-4 text-[11px] font-medium tracking-wide">
        {ANNOUNCEMENT_ITEMS.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className={item.color ?? "text-green-light"}>{item.icon}</span>
            {item.isCountdown ? <CountdownTimer /> : (
              item.href ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {item.text}
                </a>
              ) : item.text
            )}
          </span>
        ))}
      </div>

      {/* Mobile/tablet: scrolling marquee */}
      <div className="lg:hidden flex h-8 items-center">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...ANNOUNCEMENT_ITEMS, ...ANNOUNCEMENT_ITEMS].map((item, i) => (
            <span key={i} className="mx-6 flex items-center gap-1.5 text-[11px] font-medium tracking-wide">
              <span className={item.color ?? "text-green-light"}>{item.icon}</span>
              {item.isCountdown ? <CountdownTimer /> : item.text}
            </span>
          ))}
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
  columns = 1,
}: {
  items: NavItem[];
  onClose: () => void;
  columns?: number;
}) {
  return (
    <div
      className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-2xl border border-sand/40 bg-white/95 backdrop-blur-xl shadow-lg"
      style={{ minWidth: columns > 1 ? "480px" : "280px" }}
    >
      <div className={`grid p-2 ${columns > 1 ? "grid-cols-2 gap-x-1" : ""}`}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="group flex items-start gap-3 rounded-xl px-3.5 py-3 transition-colors hover:bg-green-eco/[0.04]"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-charcoal/[0.04] transition-colors group-hover:bg-green-eco/10 group-hover:text-green-eco">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-charcoal group-hover:text-green-eco transition-colors">
                  {item.label}
                </p>
                {item.tag && (
                  <span className="rounded-full bg-green-eco px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
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
  columns,
}: {
  label: string;
  items: NavItem[];
  columns?: number;
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
        className={`flex items-center gap-1 text-[13px] font-semibold tracking-wide uppercase transition-colors ${
          open ? "text-green-eco" : "text-charcoal hover:text-green-eco"
        }`}
        aria-expanded={open}
      >
        {label}
        <ChevronIcon className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && <MegaMenuPanel items={items} onClose={() => setOpen(false)} columns={columns} />}
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
    <div className="border-b border-sand/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-sm font-bold uppercase tracking-wider text-charcoal"
      >
        {label}
        <ChevronIcon
          className={`h-4 w-4 text-gray transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-200 ${
          expanded ? "grid-rows-[1fr] pb-3" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-cream"
            >
              <div>
                <p className="text-sm font-medium text-charcoal">{item.label}</p>
                <p className="text-xs text-gray">{item.description}</p>
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
      <div className="absolute inset-0 bg-charcoal/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative mx-auto mt-16 w-[calc(100%-2rem)] max-w-2xl">
        <form onSubmit={handleSubmit} className="relative">
          <SearchIcon className="absolute left-4.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Søg efter produkter..."
            className="w-full rounded-2xl border border-sand/60 bg-white py-4 pl-12 pr-12 text-charcoal shadow-2xl placeholder:text-gray/60 focus:border-green-eco focus:ring-2 focus:ring-green-eco/20 focus:outline-none"
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
          <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-sand/40 bg-white shadow-2xl">
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
                    className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-cream"
                  >
                    {r.image ? (
                      <img src={r.image} alt={r.title} className="h-14 w-14 rounded-lg bg-sand/20 object-contain" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-sand/20 text-gray">
                        <SearchIcon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-charcoal">{r.title}</p>
                      <div className="flex items-center gap-2">
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
                  className="mt-1 flex items-center justify-center rounded-xl py-3 text-sm font-semibold text-green-eco transition-colors hover:bg-green-eco/5"
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

  // Track scroll for subtle shadow
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
    <header
      className={`sticky top-0 z-50 transition-shadow duration-300 ${
        scrolled ? "shadow-md" : ""
      }`}
      style={{
        backgroundColor: "rgba(245,242,236,0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <AnnouncementBar />

      {/* Main nav bar */}
      <div className="border-b border-sand/40">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:h-16 lg:px-8">
          {/* Left: hamburger (mobile) */}
          <button
            type="button"
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-charcoal transition-colors hover:bg-charcoal/5"
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

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 lg:mr-10">
            <img
              src="/brand/logos/phonespot-wordmark-dark.svg"
              alt="PhoneSpot"
              width={130}
              height={30}
              className="h-7 w-auto lg:h-8"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-6 flex-1">
            <NavDropdown label="Produkter" items={PRODUKT_ITEMS} columns={2} />
            <NavDropdown label="Service" items={SERVICE_ITEMS} />
            <NavDropdown label="Info" items={INFO_ITEMS} columns={2} />
          </nav>

          {/* Right side: actions */}
          <div className="flex items-center gap-1.5 lg:gap-2">
            {/* Repair CTA — desktop only */}
            <Link
              href="/reparation"
              className="hidden lg:flex items-center gap-1.5 rounded-full bg-green-eco px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-green-eco/90 hover:shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.192-.14 1.743Z" />
              </svg>
              Reparation
            </Link>

            {/* Search */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-charcoal transition-colors hover:bg-charcoal/5 hover:text-green-eco"
              aria-label="Søg"
            >
              <SearchIcon className="h-[18px] w-[18px]" />
            </button>

            {/* Cart */}
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-charcoal transition-colors hover:bg-charcoal/5 hover:text-green-eco"
              onClick={openCart}
              aria-label="Åbn kurv"
            >
              <CartIcon className="h-[18px] w-[18px]" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-green-eco px-1 text-[10px] font-bold text-white shadow-sm">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[calc(var(--header-h,6.5rem))] bottom-0 z-40 overflow-y-auto bg-warm-white/98 backdrop-blur-xl">
          <nav className="mx-auto max-w-lg px-5 pb-8 pt-2">
            <MobileSection label="Produkter" items={PRODUKT_ITEMS} onNavigate={() => setMobileOpen(false)} />
            <MobileSection label="Service" items={SERVICE_ITEMS} onNavigate={() => setMobileOpen(false)} />
            <MobileSection label="Info" items={INFO_ITEMS} onNavigate={() => setMobileOpen(false)} />

            {/* Mobile repair CTA */}
            <div className="mt-6">
              <Link
                href="/reparation"
                onClick={() => setMobileOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-eco px-6 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.192-.14 1.743Z" />
                </svg>
                Book reparation
              </Link>
            </div>

            {/* Quick links */}
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { label: "Sælg din enhed", href: "/saelg-din-enhed" },
                { label: "Butik", href: "/butik" },
                { label: "Kontakt", href: "/kontakt" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full border border-sand px-4 py-2 text-xs font-semibold text-charcoal transition-colors hover:bg-cream"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
