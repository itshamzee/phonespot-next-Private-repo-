"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Søgefeltet i admin-topbjælken. Et rigtigt felt med en liste lige under —
 * ingen dialog og ingen sløring af siden. Tomt felt viser genveje og de
 * seneste søgninger; fra to tegn søges der på tværs af ordrer, kunder,
 * reparationssager, enheder (IMEI/stregkode) og produkter.
 */

interface Hit {
  id: string;
  label: string;
  sublabel?: string;
  link: string;
}

type Group = "orders" | "customers" | "repairs" | "devices" | "products" | "templates";
type Results = Record<Group, Hit[]>;
type Row = Hit & { kind: "hit" | "shortcut" | "recent" };

const GROUPS: { key: Group; label: string }[] = [
  { key: "orders", label: "Ordrer" },
  { key: "customers", label: "Kunder" },
  { key: "repairs", label: "Reparationer" },
  { key: "devices", label: "Enheder" },
  { key: "products", label: "Tilbehør og reservedele" },
  { key: "templates", label: "Modeller" },
];

const SHORTCUTS: Hit[] = [
  { id: "ny-produkt", label: "Opret produkt", link: "/admin/produkter/ny" },
  { id: "ordrer", label: "Alle ordrer", link: "/admin/platform/orders" },
  { id: "indlevering", label: "Ny indlevering til reparation", link: "/admin/indlevering" },
  { id: "registrer", label: "Registrér enhed til salg", link: "/admin/platform/intake" },
  { id: "tilbehoer", label: "Tilbehør", link: "/admin/tilbehoer" },
];

const RECENT_KEY = "ps-admin-recent-searches";

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searching = query.trim().length >= 2;

  // The rows the arrow keys move through, in the order they are drawn
  const rows = useMemo<Row[]>(() => {
    if (searching) return results ? GROUPS.flatMap((g) => results[g.key].map((h) => ({ ...h, kind: "hit" as const }))) : [];
    return [
      ...recent.map((r) => ({ id: `recent-${r}`, label: r, link: "", kind: "recent" as const })),
      ...SHORTCUTS.map((s) => ({ ...s, kind: "shortcut" as const })),
    ];
  }, [searching, results, recent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!searching) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        setResults(await res.json());
        setFailed(false);
        setActive(0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, searching]);

  function remember(text: string) {
    const next = [text, ...readRecent().filter((r) => r.toLowerCase() !== text.toLowerCase())].slice(0, 5);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // private mode: recent searches are a convenience, not a requirement
    }
    setRecent(next);
  }

  function choose(row: Row) {
    if (row.kind === "recent") {
      setQuery(row.label);
      inputRef.current?.focus();
      return;
    }
    if (row.kind === "hit") remember(query.trim());
    setOpen(false);
    setQuery("");
    setResults(null);
    inputRef.current?.blur();
    router.push(row.link);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(rows.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && rows[active]) {
      e.preventDefault();
      choose(rows[active]);
    }
  }

  const rowClass = (i: number) =>
    `flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left text-[14px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 ${i === active ? "bg-cream" : "hover:bg-cream"}`;
  const indexOf = (row: { id: string; kind: Row["kind"] }) => rows.findIndex((r) => r.kind === row.kind && r.id === row.id);

  return (
    <div ref={rootRef} className="relative w-full max-w-[520px]">
      <div className="flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 text-white transition-colors focus-within:border-white/40 focus-within:bg-white/15">
        <svg className="h-4 w-4 shrink-0 text-white/70" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls="admin-search-list"
          aria-autocomplete="list"
          aria-label="Søg i admin"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 2) setResults(null);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => {
            setRecent(readRecent());
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Søg ordre, kunde, IMEI eller produkt"
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-white placeholder:text-white/65 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {loading && searching ? (
          <span aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <kbd className="hidden shrink-0 rounded border border-white/20 px-1.5 py-0.5 text-[11px] text-white/60 sm:inline">Ctrl K</kbd>
        )}
      </div>

      {open && (
        <div
          id="admin-search-list"
          role="listbox"
          className="fixed inset-x-2 top-[60px] z-[60] max-h-[70vh] overflow-y-auto rounded-xl border border-sand bg-white p-1.5 text-charcoal shadow-[0_12px_32px_rgba(0,0,0,0.14)] sm:absolute sm:inset-x-0 sm:top-11"
        >
          {searching ? (
            <>
              {failed && <p className="px-3 py-3 text-[14px] text-[#B42318]">Søgningen fejlede. Prøv igen.</p>}
              {!failed && !results && <p className="px-3 py-3 text-[14px] text-gray">Søger</p>}
              {!failed && results && rows.length === 0 && (
                <p className="px-3 py-3 text-[14px] text-gray">
                  Ingen resultater for &quot;{query.trim()}&quot;. Prøv ordrenummer, kundens navn eller telefon, IMEI eller en del af produktnavnet.
                </p>
              )}
              {results &&
                GROUPS.filter((g) => results[g.key].length > 0).map((g) => (
                  <div key={g.key} className="mb-1 last:mb-0">
                    <p className="px-3 pb-1 pt-2 text-[12px] font-medium text-gray">{g.label}</p>
                    {results[g.key].map((hit) => {
                      const i = indexOf({ id: hit.id, kind: "hit" });
                      return (
                        <button key={`${g.key}-${hit.id}`} type="button" role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => choose({ ...hit, kind: "hit" })} className={rowClass(i)}>
                          <span className="line-clamp-2 min-w-0 font-medium sm:line-clamp-1">{hit.label}</span>
                          {hit.sublabel && <span className="truncate text-[13px] text-gray sm:max-w-[50%] sm:shrink-0">{hit.sublabel}</span>}
                        </button>
                      );
                    })}
                  </div>
                ))}
            </>
          ) : (
            <>
              {recent.length > 0 && (
                <div className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[12px] font-medium text-gray">Seneste søgninger</p>
                  {recent.map((r) => {
                    const i = indexOf({ id: `recent-${r}`, kind: "recent" });
                    return (
                      <button key={r} type="button" role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => choose({ id: `recent-${r}`, label: r, link: "", kind: "recent" })} className={rowClass(i)}>
                        <span className="truncate">{r}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="px-3 pb-1 pt-2 text-[12px] font-medium text-gray">Genveje</p>
              {SHORTCUTS.map((s) => {
                const i = indexOf({ id: s.id, kind: "shortcut" });
                return (
                  <button key={s.id} type="button" role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => choose({ ...s, kind: "shortcut" })} className={rowClass(i)}>
                    <span className="truncate font-medium">{s.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
