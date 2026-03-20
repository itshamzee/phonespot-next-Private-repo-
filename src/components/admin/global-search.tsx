"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  link: string;
}

interface SearchResults {
  templates: SearchResult[];
  products: SearchResult[];
  devices: SearchResult[];
  orders: SearchResult[];
}

const CATEGORY_LABELS: Record<keyof SearchResults, string> = {
  templates: "Produktskabeloner",
  products: "Tilbehør",
  devices: "Enheder",
  orders: "Ordrer",
};

const CATEGORY_ICONS: Record<keyof SearchResults, React.ReactNode> = {
  templates: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  ),
  products: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  ),
  devices: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  ),
  orders: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  ),
};

const CATEGORIES: (keyof SearchResults)[] = ["templates", "products", "devices", "orders"];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  // Build flat list of results for keyboard navigation
  const flatResults: SearchResult[] = results
    ? CATEGORIES.flatMap((cat) => results[cat])
    : [];

  /* ---- Open / close ---- */
  const openSearch = useCallback(() => {
    setOpen(true);
    setQuery("");
    setResults(null);
    setActiveIndex(0);
  }, []);

  const closeSearch = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults(null);
    setActiveIndex(0);
  }, []);

  /* ---- Global keyboard shortcut (Ctrl/Cmd+K) ---- */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) {
          closeSearch();
        } else {
          openSearch();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, openSearch, closeSearch]);

  /* ---- Auto-focus input when modal opens ---- */
  useEffect(() => {
    if (open) {
      // Small delay so the modal is rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  /* ---- Debounced search ---- */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data: SearchResults = await res.json();
          setResults(data);
          setActiveIndex(0);
        }
      } catch {
        // Silently ignore fetch errors
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  /* ---- Navigate to result ---- */
  function navigateTo(link: string) {
    closeSearch();
    router.push(link);
  }

  /* ---- Keyboard nav within modal ---- */
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      closeSearch();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && flatResults[activeIndex]) {
      e.preventDefault();
      navigateTo(flatResults[activeIndex].link);
    }
  }

  /* ---- Determine which category a flat index belongs to ---- */
  function getCategoryForIndex(index: number): keyof SearchResults | null {
    if (!results) return null;
    let count = 0;
    for (const cat of CATEGORIES) {
      if (index < count + results[cat].length) return cat;
      count += results[cat].length;
    }
    return null;
  }

  const hasResults = flatResults.length > 0;
  const hasQuery = query.length >= 2;

  if (!open) {
    // Render just the trigger button
    return (
      <button
        type="button"
        onClick={openSearch}
        className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-white/60 px-3 py-1.5 text-xs text-charcoal/40 transition-all hover:bg-white hover:text-charcoal/60"
        title="Søg (Ctrl+K)"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <span className="hidden sm:inline">Søg...</span>
        <kbd className="ml-1 hidden rounded border border-black/[0.08] bg-black/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-charcoal/30 sm:inline">
          ⌘K
        </kbd>
      </button>
    );
  }

  // Track cumulative index per category
  let cumulativeIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        onClick={closeSearch}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-start justify-center px-4 pt-[15vh]">
        <div
          className="w-full max-w-lg overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-2xl"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3">
            <svg className="h-5 w-5 shrink-0 text-charcoal/30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søg produkter, enheder, ordrer..."
              className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none placeholder:text-charcoal/30"
            />
            {loading && (
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
            )}
            <kbd
              className="shrink-0 cursor-pointer rounded border border-black/[0.08] bg-black/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-charcoal/30 hover:bg-black/[0.06]"
              onClick={closeSearch}
            >
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto">
            {hasQuery && !loading && !hasResults && (
              <div className="px-4 py-8 text-center text-sm text-charcoal/40">
                Ingen resultater
              </div>
            )}

            {hasResults &&
              CATEGORIES.map((cat) => {
                const items = results![cat];
                if (items.length === 0) return null;

                const startIndex = cumulativeIndex;
                cumulativeIndex += items.length;

                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/30">
                      <span className="text-charcoal/20">{CATEGORY_ICONS[cat]}</span>
                      {CATEGORY_LABELS[cat]}
                    </div>
                    {items.map((item, i) => {
                      const flatIdx = startIndex + i;
                      const isActive = flatIdx === activeIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigateTo(item.link)}
                          onMouseEnter={() => setActiveIndex(flatIdx)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "text-charcoal hover:bg-black/[0.02]"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{item.label}</p>
                            {item.sublabel && (
                              <p className={`truncate text-xs ${isActive ? "text-emerald-500/60" : "text-charcoal/40"}`}>
                                {item.sublabel}
                              </p>
                            )}
                          </div>
                          {isActive && (
                            <svg className="h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-4 border-t border-black/[0.06] px-4 py-2 text-[10px] text-charcoal/25">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-black/[0.06] px-1 py-0.5 font-mono">↑↓</kbd>
              navigér
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-black/[0.06] px-1 py-0.5 font-mono">↵</kbd>
              åbn
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-black/[0.06] px-1 py-0.5 font-mono">esc</kbd>
              luk
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
