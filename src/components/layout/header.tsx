"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";

/* ------------------------------------------------------------------ */
/*  Navigation data                                                    */
/* ------------------------------------------------------------------ */

type CategoryItem = { label: string; href: string; tag?: string };
type BrandItem = { label: string; href: string };
type ActionItem = { label: string; description: string; href: string; iconKind: "sell" | "repair" | "store" };

const CATEGORY_ITEMS: CategoryItem[] = [
  { label: "iPhones", href: "/iphones" },
  { label: "iPads", href: "/ipads" },
  { label: "MacBooks & bærbare", href: "/baerbare" },
  { label: "Apple Watch", href: "/smartwatches" },
  { label: "Tilbehør", href: "/tilbehoer" },
  { label: "Beskyttelsesglas", href: "/beskyttelsesglas", tag: "Nyt" },
  { label: "Reservedele", href: "/reservedele" },
];

const BRAND_ITEMS: BrandItem[] = [
  { label: "Apple", href: "/iphones" },
  { label: "Samsung", href: "/smartphones" },
  { label: "Google", href: "/smartphones" },
  { label: "Xiaomi", href: "/smartphones" },
  { label: "OnePlus", href: "/smartphones" },
  { label: "Huawei", href: "/smartphones" },
];

const ACTION_ITEMS: ActionItem[] = [
  { label: "Sælg min enhed", description: "Få et hurtigt tilbud", href: "/saelg-din-enhed", iconKind: "sell" },
  { label: "Reparér nu", description: "Skærm, batteri, m.m.", href: "/reparation", iconKind: "repair" },
  { label: "Find butik", description: "Slagelse & Vejle", href: "/butik", iconKind: "store" },
];

const MOBILE_FOOTER_LINKS = [
  { label: "FAQ", href: "/faq" },
  { label: "Garanti", href: "/garanti" },
  { label: "Kvalitet", href: "/kvalitet" },
  { label: "Kontakt", href: "/kontakt" },
];

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="11" cy="11" r="7" strokeLinecap="round" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M5 7h14l-1.4 11.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8L5 7z" strokeLinejoin="round" />
      <path d="M9 7V5a3 3 0 1 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

function AccountIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="m19.5 8.25-7.5 7.5-7.5-7.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ActionIcon({ kind }: { kind: ActionItem["iconKind"] }) {
  if (kind === "sell") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M2 12h6l3-9 4 18 3-9h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "repair") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M14 2l-3 9h6l-3 11M9 12H3l3-10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Announcement bar                                                   */
/* ------------------------------------------------------------------ */

function AnnouncementBar() {
  return (
    <div className="bg-green-eco">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-3 text-[12px] font-medium text-white/85 sm:px-4">
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="hidden sm:inline">Slagelse &amp; Vejle</span>
            <span className="sm:hidden">Butikker</span>
          </span>
          <a href="tel:+4561100048" className="inline-flex items-center gap-1.5 hover:text-white">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            61 10 00 48
          </a>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          <span>Fri fragt over 500,-</span>
          <span aria-hidden="true" className="text-white/30">·</span>
          <a
            href="https://dk.trustpilot.com/review/phonespot.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#00B67A] hover:underline"
          >
            Trustpilot <span className="font-semibold">★ 4.7</span>
          </a>
          <span aria-hidden="true" className="text-white/30">·</span>
          <span>36 mdr. garanti</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mega menu (desktop)                                                */
/* ------------------------------------------------------------------ */

function MegaMenuPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-x-0 top-full z-50 border-b border-sand bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.18)]"
      onMouseLeave={onClose}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-12 px-6 py-10 lg:px-8">

        {/* Col 1: Kategorier */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray">Kategorier</p>
          <ul className="mt-5 space-y-1">
            {CATEGORY_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="group flex items-center justify-between rounded-lg py-2 pr-2 text-[15px] font-semibold tracking-tight text-charcoal transition-colors hover:text-green-eco"
                >
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.tag && (
                      <span className="rounded-full bg-green-eco px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        {item.tag}
                      </span>
                    )}
                  </span>
                  <ArrowIcon className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 2: Mærker */}
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray">Populære mærker</p>
            <Link href="/smartphones" onClick={onClose} className="text-[11px] font-semibold text-green-eco hover:underline">
              Alle mærker →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {BRAND_ITEMS.map((brand) => (
              <Link
                key={brand.label}
                href={brand.href}
                onClick={onClose}
                className="flex h-14 items-center justify-center rounded-xl border border-sand bg-white text-[15px] font-semibold tracking-tight text-charcoal transition-all hover:-translate-y-0.5 hover:border-green-eco hover:shadow-[0_6px_16px_-8px_rgba(26,61,46,0.25)]"
              >
                {brand.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Col 3: Hjælp mig med */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray">Hjælp mig med</p>
          <div className="mt-5 space-y-2.5">
            {ACTION_ITEMS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                onClick={onClose}
                className="group flex items-start gap-3 rounded-xl border border-sand p-4 transition-all hover:border-green-eco hover:bg-cream"
              >
                <div className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-green-pale text-green-eco">
                  <ActionIcon kind={action.iconKind} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold leading-tight tracking-tight text-charcoal group-hover:text-green-eco">
                    {action.label}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-gray">{action.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer trust strip */}
      <div className="border-t border-sand bg-cream/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-8">
          <div className="flex items-center gap-5 text-[12px] text-gray">
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="h-3.5 w-3.5 text-green-eco" />
              30+ kvalitetstests
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="h-3.5 w-3.5 text-green-eco" />
              36 mdr. garanti
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="h-3.5 w-3.5 text-green-eco" />
              14 dages fortrydelse
            </span>
          </div>
          <Link
            href="/refurbished"
            onClick={onClose}
            className="text-[13px] font-semibold tracking-tight text-green-eco hover:underline"
          >
            Se alle produkter →
          </Link>
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
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Søg efter iPhone, MacBook, reservedel ..."
            className="w-full rounded-xl border border-sand bg-white py-4 pl-12 pr-12 text-base text-charcoal shadow-lg placeholder:text-gray/60 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray transition-colors hover:text-charcoal"
            aria-label="Luk søgning"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
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
                      <img src={r.image} alt={r.title} className="h-14 w-14 shrink-0 rounded-lg bg-sand/20 object-contain" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-sand/20 text-gray">
                        <SearchIcon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-charcoal">{r.title}</p>
                      <div className="mt-0.5 flex items-center gap-2">
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
  const [megaOpen, setMegaOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeMegaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalItems = totals.itemCount;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMegaOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [megaOpen]);

  const openMega = () => {
    if (closeMegaTimer.current) clearTimeout(closeMegaTimer.current);
    setMegaOpen(true);
  };
  const closeMegaSoon = () => {
    closeMegaTimer.current = setTimeout(() => setMegaOpen(false), 140);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
          scrolled ? "shadow-[0_1px_12px_rgba(0,0,0,0.06)]" : ""
        }`}
        onMouseLeave={closeMegaSoon}
      >
        <AnnouncementBar />

        {/* Main bar */}
        <div className="relative border-b border-sand">
          <div className="mx-auto flex h-14 max-w-7xl items-center px-4 xl:h-[68px] xl:px-8">

            {/* Left: hamburger + logo */}
            <div className="flex items-center">
              <button
                type="button"
                className="mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-charcoal transition-colors hover:bg-cream xl:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Luk menu" : "Åbn menu"}
              >
                {mobileOpen ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
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
                  className="h-7 w-auto xl:h-8"
                />
              </Link>
            </div>

            {/* Center: desktop nav (xl+) */}
            <nav
              className="ml-10 hidden flex-1 items-center gap-8 xl:flex"
              aria-label="Primær navigation"
              onMouseLeave={closeMegaSoon}
            >
              <button
                type="button"
                onMouseEnter={openMega}
                onFocus={openMega}
                onClick={() => setMegaOpen((v) => !v)}
                className={`group flex items-center gap-1 py-2 text-[15px] font-medium tracking-tight transition-colors ${
                  megaOpen ? "text-green-eco" : "text-charcoal hover:text-green-eco"
                }`}
                aria-expanded={megaOpen}
              >
                Produkter
                <ChevronIcon className={`h-3 w-3 transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`} />
              </button>
              <Link href="/reparation" className="text-[15px] font-medium tracking-tight text-charcoal transition-colors hover:text-green-eco">
                Reparation
              </Link>
              <Link href="/saelg-din-enhed" className="text-[15px] font-medium tracking-tight text-charcoal transition-colors hover:text-green-eco">
                Sælg din enhed
              </Link>
              <Link href="/tilbehoer" className="text-[15px] font-medium tracking-tight text-charcoal transition-colors hover:text-green-eco">
                Tilbehør
              </Link>
              <Link href="/butik" className="text-[15px] font-medium tracking-tight text-charcoal transition-colors hover:text-green-eco">
                Butikker
              </Link>
            </nav>

            {/* Right: Search + Account + Cart */}
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-full text-charcoal transition-colors hover:bg-cream hover:text-green-eco"
                aria-label="Søg"
              >
                <SearchIcon className="h-[18px] w-[18px]" />
              </button>
              <Link
                href="/konto"
                className="hidden h-10 w-10 place-items-center rounded-full text-charcoal transition-colors hover:bg-cream hover:text-green-eco sm:grid"
                aria-label="Min konto"
              >
                <AccountIcon className="h-[18px] w-[18px]" />
              </Link>
              <button
                type="button"
                className="relative grid h-10 w-10 place-items-center rounded-full text-charcoal transition-colors hover:bg-cream hover:text-green-eco"
                onClick={openCart}
                aria-label="Åbn kurv"
              >
                <CartIcon className="h-[18px] w-[18px]" />
                {totalItems > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-green-eco px-1 text-[10px] font-bold text-white">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mega menu panel */}
          {megaOpen && (
            <div className="hidden xl:block" onMouseEnter={openMega}>
              <MegaMenuPanel onClose={() => setMegaOpen(false)} />
            </div>
          )}
        </div>

        {/* Mobile / tablet category strip */}
        <div className="border-b border-sand xl:hidden">
          <div className="mx-auto max-w-7xl">
            <div
              className="flex gap-1.5 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="navigation"
              aria-label="Kategorier"
            >
              {CATEGORY_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-none items-center gap-1.5 rounded-full border border-sand bg-white px-3.5 py-1.5 text-[12.5px] font-medium tracking-tight text-charcoal transition-colors hover:border-green-eco hover:text-green-eco"
                >
                  {item.label}
                  {item.tag && (
                    <span className="rounded-full bg-green-eco px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                      {item.tag}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] xl:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <div
            className="absolute inset-x-0 top-[5.5rem] bottom-0 overflow-y-auto bg-white"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <nav className="mx-auto max-w-full px-5 pb-10 pt-4 sm:max-w-lg">

              {/* Search */}
              <button
                type="button"
                onClick={() => { setMobileOpen(false); setSearchOpen(true); }}
                className="flex w-full items-center gap-2.5 rounded-xl border border-sand bg-cream px-3.5 py-3 text-left transition-colors hover:border-green-eco"
              >
                <SearchIcon className="h-4 w-4 text-gray" />
                <span className="text-[13px] text-gray">Søg efter iPhone, MacBook ...</span>
              </button>

              {/* Quick action tiles */}
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <Link
                  href="/reparation"
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-col items-start gap-1 rounded-xl bg-green-pale p-3.5 transition-colors hover:bg-green-pale/80"
                >
                  <ActionIcon kind="repair" />
                  <span className="mt-1 text-[13px] font-semibold tracking-tight text-charcoal">Reparation</span>
                  <span className="text-[11px] leading-tight text-gray">Book tid eller walk-in</span>
                </Link>
                <Link
                  href="/saelg-din-enhed"
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-col items-start gap-1 rounded-xl bg-green-pale p-3.5 transition-colors hover:bg-green-pale/80"
                >
                  <ActionIcon kind="sell" />
                  <span className="mt-1 text-[13px] font-semibold tracking-tight text-charcoal">Sælg din enhed</span>
                  <span className="text-[11px] leading-tight text-gray">Få et tilbud</span>
                </Link>
              </div>

              {/* Categories grid */}
              <p className="mt-6 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gray">Kategorier</p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {CATEGORY_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between rounded-xl border border-sand p-3 transition-colors hover:border-green-eco"
                  >
                    <span className="text-[14px] font-semibold tracking-tight text-charcoal">{item.label}</span>
                    {item.tag ? (
                      <span className="rounded-full bg-green-eco px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                        {item.tag}
                      </span>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </Link>
                ))}
              </div>

              {/* Brands strip */}
              <div className="mt-6 flex items-baseline justify-between">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gray">Mærker</p>
                <Link href="/smartphones" onClick={() => setMobileOpen(false)} className="text-[11px] font-semibold text-green-eco">
                  Alle →
                </Link>
              </div>
              <div className="-mx-5 mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {BRAND_ITEMS.map((brand) => (
                  <Link
                    key={brand.label}
                    href={brand.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex-none rounded-full border border-sand px-3.5 py-1.5 text-[12.5px] font-medium tracking-tight text-charcoal transition-colors hover:border-green-eco"
                  >
                    {brand.label}
                  </Link>
                ))}
              </div>

              {/* Konto */}
              <Link
                href="/konto"
                onClick={() => setMobileOpen(false)}
                className="mt-6 flex items-center justify-between rounded-xl border border-sand p-4 transition-colors hover:border-green-eco"
              >
                <span className="flex items-center gap-3">
                  <AccountIcon className="h-5 w-5 text-green-eco" />
                  <span className="text-[14px] font-semibold tracking-tight text-charcoal">Min konto</span>
                </span>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>

              {/* Footer pills */}
              <div className="mt-6 flex flex-wrap gap-2 border-t border-sand pt-5">
                {MOBILE_FOOTER_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-full border border-sand px-3 py-1.5 text-[11.5px] font-medium tracking-tight text-charcoal transition-colors hover:bg-cream"
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
