"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  icon: React.ReactNode;
};

const PRODUKT_ITEMS: NavItem[] = [
  {
    label: "iPhones",
    href: "/iphones",
    description: "Fra iPhone SE til 16 Pro Max",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
  {
    label: "Smartphones",
    href: "/smartphones",
    description: "Samsung, OnePlus og mere",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
  {
    label: "iPads",
    href: "/ipads",
    description: "iPad Air, iPad Pro og mere",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.5a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
  },
  {
    label: "Bærbare",
    href: "/baerbare",
    description: "MacBook, ThinkPad, EliteBook",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
      </svg>
    ),
  },
  {
    label: "Smartwatches",
    href: "/smartwatches",
    description: "Apple Watch fra 1.099 kr",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    label: "Covers",
    href: "/covers",
    description: "Covers og panserglas",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
];

const ABOUT_ITEMS: NavItem[] = [
  {
    label: "Om os",
    href: "/om-os",
    description: "Mød teamet bag PhoneSpot",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
  {
    label: "Kvalitet",
    href: "/kvalitet",
    description: "30+ tests og vores graderingssystem",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    label: "Reparation",
    href: "/reparation",
    description: "Professionel reparation af enheder",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.192-.14 1.743Z" />
      </svg>
    ),
  },
  {
    label: "FAQ",
    href: "/faq",
    description: "Svar på ofte stillede spørgsmål",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
      </svg>
    ),
  },
  {
    label: "Kontakt",
    href: "/kontakt",
    description: "Skriv eller ring til os",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    label: "Blog",
    href: "/blog",
    description: "Guides og nyheder om refurbished",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Icon components                                                    */
/* ------------------------------------------------------------------ */

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

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className ?? "h-3.5 w-3.5"}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m19.5 8.25-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  NavDropdown (desktop)                                              */
/* ------------------------------------------------------------------ */

function NavDropdown({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
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
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-medium text-charcoal transition-colors hover:text-green-eco"
        aria-expanded={open}
      >
        {label}
        <ChevronIcon
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-3 w-72 -translate-x-1/2 rounded-2xl border border-sand/50 bg-white p-2 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-cream"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-eco/10 text-green-eco">
                {item.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-charcoal">{item.label}</p>
                <p className="text-xs text-gray">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MobileAccordion                                                    */
/* ------------------------------------------------------------------ */

function MobileAccordion({
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
    <div className="border-b border-sand/50">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between py-3 text-sm font-medium text-charcoal"
      >
        {label}
        <ChevronIcon
          className={`h-4 w-4 text-gray transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="pb-3 pl-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-cream"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-eco/10 text-green-eco">
                {item.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-charcoal">{item.label}</p>
                <p className="text-xs text-gray">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Announcement bar                                                   */
/* ------------------------------------------------------------------ */

/** Returns ms until 16:00 today (or 0 if past 16:00). */
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

  // Server render / first paint — static fallback to avoid hydration mismatch
  if (remaining === null) {
    return <span>Bestil nu — sendt samme dag</span>;
  }

  if (remaining <= 0) {
    return <span>Bestil nu — sendt i morgen</span>;
  }

  const totalSec = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span>
      Bestil nu — sendt om{" "}
      <span className="font-bold tabular-nums text-green-light">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </span>
  );
}

function TrustpilotBadge() {
  return (
    <a
      href="https://dk.trustpilot.com/review/phonespot.dk"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 whitespace-nowrap"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
        <path d="M12 1.5l2.76 8.49h8.93l-7.22 5.25 2.76 8.49L12 18.49l-7.23 5.24 2.76-8.49L.31 9.99h8.93z" fill="#00B67A" />
      </svg>
      <span className="font-bold text-[#00B67A]">Trustpilot</span>
      <span className="text-white/70">4.4</span>
    </a>
  );
}

function AnnouncementBar() {
  return (
    <div className="bg-charcoal text-white overflow-hidden">
      <div className="mx-auto flex h-8 max-w-7xl items-center justify-center gap-8 px-4 text-[11px] font-medium tracking-wide">
        <div className="hidden lg:flex items-center gap-8">
          <TrustpilotBadge />
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-green-light">✓</span>
            Fri fragt over 899,-
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-green-light">✓</span>
            <CountdownTimer />
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-green-light">✓</span>
            36 mdr. garanti
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-green-light">✓</span>
            Prismatch-garanti
          </span>
        </div>
        <div className="hidden sm:flex lg:hidden items-center gap-6">
          <TrustpilotBadge />
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-green-light">✓</span>
            <CountdownTimer />
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-green-light">✓</span>
            36 mdr. garanti
          </span>
        </div>
        <div className="sm:hidden flex items-center gap-4">
          <TrustpilotBadge />
          <span className="flex items-center gap-1.5">
            <span className="text-green-light">✓</span>
            <CountdownTimer />
          </span>
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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data: SearchResult[] = await res.json();
        setResults(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
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
      <div
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative mx-auto mt-20 w-[calc(100%-2rem)] max-w-2xl">
        <form onSubmit={handleSubmit} className="relative">
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Søg efter produkter..."
            className="w-full rounded-2xl border border-sand bg-white py-4 pl-12 pr-12 text-charcoal shadow-xl placeholder:text-gray focus:border-green-eco focus:ring-2 focus:ring-green-eco/20 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray transition-colors hover:bg-sand/50 hover:text-charcoal"
            aria-label="Luk søgning"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </form>

        {query.trim() && (
          <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-sand bg-white shadow-xl">
            {loading ? (
              <div className="flex items-center justify-center py-8">
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
                      <img
                        src={r.image}
                        alt={r.title}
                        className="h-14 w-14 rounded-lg bg-sand/30 object-contain"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-sand/30 text-gray">
                        <SearchIcon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-charcoal">
                        {r.title}
                      </p>
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
                  className="mt-1 flex items-center justify-center rounded-xl py-3 text-sm font-medium text-green-eco transition-colors hover:bg-green-eco/5"
                >
                  Se alle resultater
                </Link>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-gray">
                  Ingen produkter fundet for &lsquo;{query}&rsquo;
                </p>
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
  const { cart, openCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
      <AnnouncementBar />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Mobile hamburger */}
        <button
          type="button"
          className="lg:hidden text-charcoal"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Luk menu" : "Åbn menu"}
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
        <nav className="hidden lg:flex items-center gap-8">
          <NavDropdown label="Produkter" items={PRODUKT_ITEMS} />
          <Link
            href="/tilbehoer"
            className="text-sm font-medium text-charcoal transition-colors hover:text-green-eco"
          >
            Tilbehør
          </Link>
          <Link
            href="/reservedele"
            className="text-sm font-medium text-charcoal transition-colors hover:text-green-eco"
          >
            Reservedele
          </Link>
          <NavDropdown label="Om PhoneSpot" items={ABOUT_ITEMS} />
        </nav>

        {/* Right side: reparation CTA + search + cart */}
        <div className="flex items-center gap-3">
          <Link
            href="/reparation"
            className="hidden sm:flex items-center gap-1.5 rounded-full bg-green-eco px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-green-eco/90 hover:shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.192-.14 1.743Z" />
            </svg>
            Reparation
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="text-charcoal transition-colors hover:text-green-eco"
            aria-label="Søg"
          >
            <SearchIcon />
          </button>

          <button
            type="button"
            className="relative text-charcoal transition-colors hover:text-green-eco"
            onClick={openCart}
            aria-label="Åbn kurv"
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
          <MobileAccordion label="Produkter" items={PRODUKT_ITEMS} onNavigate={() => setMobileOpen(false)} />
          <Link
            href="/tilbehoer"
            className="flex items-center border-b border-sand/50 py-3 text-sm font-medium text-charcoal transition-colors hover:text-green-eco"
            onClick={() => setMobileOpen(false)}
          >
            Tilbehør
          </Link>
          <Link
            href="/reservedele"
            className="flex items-center border-b border-sand/50 py-3 text-sm font-medium text-charcoal transition-colors hover:text-green-eco"
            onClick={() => setMobileOpen(false)}
          >
            Reservedele
          </Link>
          <Link
            href="/reparation"
            className="flex items-center gap-2 border-b border-sand/50 py-3 text-sm font-bold text-green-eco"
            onClick={() => setMobileOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.192-.14 1.743Z" />
            </svg>
            Reparation
          </Link>
          <MobileAccordion label="Om PhoneSpot" items={ABOUT_ITEMS} onNavigate={() => setMobileOpen(false)} />
        </nav>
      )}

      {/* Search overlay */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
