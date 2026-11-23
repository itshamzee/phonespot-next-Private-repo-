"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import styles from "@/components/home/storefront.module.css";
import s from "./header-search.module.css";

/** Svarformen fra GET /api/search?suggest=1 (se src/app/api/search/suggest.ts). */
type SuggestProduct = { type: "product"; kind: "device" | "accessory"; title: string; href: string; image: string | null; priceOere: number | null };
type SuggestShortcut = { type: "category" | "sell"; label: string; href: string };
type Results = { query: string; products: SuggestProduct[]; shortcuts: SuggestShortcut[] };

type Option = { key: string; href: string; kind: "product" | "shortcut" | "all"; product?: SuggestProduct; label: string };

export const SUGGEST_DEBOUNCE_MS = 150;
const MIN_CHARS = 2;
const PRODUCT_LIMIT = 5;

const searchHref = (query: string) => `/soeg?q=${encodeURIComponent(query.trim())}`;

/** Samme visning som produktkortene: "2.499 kr." uden øre. */
function formatKr(oere: number): string {
  return `${new Intl.NumberFormat("da-DK", { style: "decimal", maximumFractionDigits: 0 }).format(oere / 100)} kr.`;
}

function toOptions(results: Results | null, query: string): Option[] {
  const products: Option[] = (results?.products ?? []).map((product, i) => ({ key: `p${i}-${product.href}`, href: product.href, kind: "product", product, label: product.title }));
  const shortcuts: Option[] = (results?.shortcuts ?? []).map((shortcut, i) => ({ key: `s${i}-${shortcut.href}`, href: shortcut.href, kind: "shortcut", label: shortcut.label }));
  return [...products, ...shortcuts, { key: "all", href: searchHref(query), kind: "all", label: `Se alle resultater for “${query.trim()}”` }];
}

/**
 * Søgefeltet i headeren med forslag, mens man skriver (WAI-ARIA combobox).
 * Formularen sender stadig til /soeg?q= uden JavaScript; listen findes kun i
 * browseren og først efter indtastning.
 */
export function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const id = useId();
  const listId = `${id}-forslag`;
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [failedQuery, setFailedQuery] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const [seenPath, setSeenPath] = useState(pathname);

  const trimmed = query.trim();
  const enough = trimmed.length >= MIN_CHARS;
  const failed = failedQuery === trimmed;
  const loading = enough && !failed && results?.query !== trimmed;

  // Et sideskift lukker listen og fjerner gamle forslag; teksten bliver stående.
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
    setActive(-1);
    setResults(null);
  }

  // Hent forslag 150 ms efter sidste tastetryk; forrige forespørgsel afbrydes,
  // og et svar, der kommer efter et nyere, ignoreres. Der hentes kun, mens
  // listen er åben (et sideskift lukker den og afbryder), og ikke igen for samme tekst.
  const resultsQuery = results?.query;
  useEffect(() => {
    if (!enough || !open) {
      abortRef.current?.abort();
      seqRef.current += 1;
      return;
    }
    if (resultsQuery === trimmed) return;
    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const seq = ++seqRef.current;
      fetch(`/api/search?suggest=1&limit=${PRODUCT_LIMIT}&q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.json() as Promise<{ products?: SuggestProduct[]; shortcuts?: SuggestShortcut[] }>;
        })
        .then((data) => {
          if (seq !== seqRef.current) return;
          setResults({ query: trimmed, products: data.products ?? [], shortcuts: data.shortcuts ?? [] });
          setFailedQuery(null);
          setActive(-1);
        })
        .catch(() => {
          if (controller.signal.aborted || seq !== seqRef.current) return;
          // Fejl er tavse: listen lukker, og Enter søger som altid.
          setFailedQuery(trimmed);
        });
    }, SUGGEST_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [trimmed, enough, open, resultsQuery]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  const expanded = open && enough && !failed;

  // Klik uden for feltet og listen lukker.
  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && formRef.current?.contains(event.target)) return;
      close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded, close]);

  const options = results ? toOptions(results, query) : [];
  const firstLoad = loading && !results;
  const empty = !!results && !results.products.length && !results.shortcuts.length;
  const suggestionCount = results ? results.products.length + results.shortcuts.length : 0;
  const activeOption = expanded && active >= 0 ? options[active] : undefined;

  function leave() {
    close();
    inputRef.current?.blur();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const count = expanded && !empty ? options.length : 0;
    switch (event.key) {
      case "ArrowDown":
        if (!enough) return;
        event.preventDefault();
        if (!open) { setOpen(true); return; }
        if (count) setActive((i) => (i + 1 >= count ? 0 : i + 1));
        return;
      case "ArrowUp":
        if (!count) return;
        event.preventDefault();
        setActive((i) => (i <= 0 ? count - 1 : i - 1));
        return;
      case "Enter":
        if (!activeOption) return; // Ingen markeret række: formularen sendes som før.
        event.preventDefault();
        leave();
        router.push(activeOption.href);
        return;
      case "Escape":
        if (!expanded) return;
        // Luk listen og behold teksten (også i browsere, der ellers rydder et søgefelt).
        event.preventDefault();
        close();
        return;
      case "Tab":
        close();
        return;
    }
  }

  return (
    <form ref={formRef} role="search" className={styles.search} action="/soeg" onSubmit={event => {
      event.preventDefault();
      if (!trimmed) return;
      leave();
      router.push(searchHref(trimmed));
    }}>
      <input
        ref={inputRef}
        type="search"
        name="q"
        role="combobox"
        aria-label="Søg efter model eller tilbehør"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={activeOption ? `${listId}-${active}` : undefined}
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Søg efter model eller tilbehør"
        value={query}
        onChange={event => {
          const value = event.target.value;
          setQuery(value);
          setOpen(true);
          setActive(-1);
          // Under to tegn: glem gamle forslag, så de ikke dukker op til et nyt ord.
          if (value.trim().length < MIN_CHARS) setResults(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <button type="submit" aria-label="Søg"><StorefrontIcon kind="search" /></button>
      <div className={s.slot}>
        {expanded && (firstLoad || results) && (
          <div className={`${s.panel} pop-in`} data-loading={loading && !firstLoad ? "" : undefined}>
            {firstLoad && (
              <div className={s.skeleton} aria-hidden="true">
                {[0, 1, 2].map(i => <div key={i} className={s.skeletonRow}><span className={s.thumb} /><span className={s.bars}><span /><span /></span></div>)}
              </div>
            )}
            {empty && <p className={s.empty}>Ingen forslag. Tryk Enter for at søge.</p>}
            <ul
              role="listbox"
              id={listId}
              aria-label="Søgeforslag"
              aria-busy={loading || undefined}
              className={s.list}
              // Fokus bliver i feltet, når man klikker på en række.
              onMouseDown={event => event.preventDefault()}
            >
              {!empty && options.map((option, i) => (
                <li
                  key={option.key}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={option.kind === "all" ? s.allItem : option.kind === "shortcut" && options[i - 1]?.kind === "product" ? s.groupStart : undefined}
                >
                  <Link href={option.href} prefetch={false} tabIndex={-1} className={`${s.row} ${option.kind === "product" ? s.productRow : ""}`} onClick={leave}>
                    {option.product ? <>
                      <span className={s.thumb}>
                        {option.product.image && <Image src={option.product.image} alt="" width={48} height={48} />}
                      </span>
                      <span className={s.text}>
                        <span className={s.title}>{option.product.title}</span>
                        {option.product.priceOere != null && (
                          <span className={s.price}>{option.product.kind === "device" ? "fra " : ""}{formatKr(option.product.priceOere)}</span>
                        )}
                      </span>
                    </> : <span className={s.title}>{option.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <span className={s.srOnly} role="status" aria-live="polite">
        {expanded && results && !loading ? (suggestionCount ? `${suggestionCount} forslag` : "Ingen forslag") : ""}
      </span>
    </form>
  );
}
