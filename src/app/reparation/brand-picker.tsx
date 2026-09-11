"use client";

import { useState, useMemo, useRef, useEffect, useId } from "react";
import Link from "next/link";
import { flushSync } from "react-dom";
import styles from "@/components/repair/repair.module.css";
import type { DeviceType, RepairBrand, RepairModel } from "@/lib/supabase/types";

type ModelWithBrand = RepairModel & { brand_slug: string; brand_name: string };

// ---------------------------------------------------------------------------
// Parent brand groupings
// ---------------------------------------------------------------------------

const PARENT_BRAND_MAP: Record<string, string> = {
  iphone: "apple",
  ipad: "apple",
  macbook: "apple",
  "apple-watch": "apple",
  samsung: "samsung",
  "google-pixel": "google",
  oneplus: "oneplus",
  huawei: "huawei",
  sony: "sony",
  xiaomi: "xiaomi",
  motorola: "motorola",
};

const PARENT_BRAND_META: Record<string, { name: string; logo: string }> = {
  apple: { name: "Apple", logo: "/images/brands/apple.svg" },
  samsung: { name: "Samsung", logo: "/images/brands/samsung.svg" },
  google: { name: "Google", logo: "/images/brands/google.svg" },
  oneplus: { name: "OnePlus", logo: "/images/brands/oneplus.svg" },
  huawei: { name: "Huawei", logo: "/images/brands/huawei.svg" },
  sony: { name: "Sony", logo: "/images/brands/sony.svg" },
  xiaomi: { name: "Xiaomi", logo: "/images/brands/xiaomi.svg" },
  motorola: { name: "Motorola", logo: "/images/brands/motorola.svg" },
};

const PARENT_BRAND_ORDER = [
  "apple",
  "samsung",
  "google",
  "oneplus",
  "huawei",
  "xiaomi",
  "sony",
  "motorola",
];

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  smartphone: "Telefon",
  tablet: "Tablet",
  laptop: "Bærbar",
  watch: "Smartwatch",
  console: "Konsol",
};

const DEVICE_TYPE_ICONS: Record<DeviceType, React.ReactNode> = {
  smartphone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  tablet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  laptop: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <path d="M4 5h16a1 1 0 011 1v10H3V6a1 1 0 011-1z" />
      <path d="M2 17h20l-1 3H3l-1-3z" />
    </svg>
  ),
  watch: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <circle cx="12" cy="12" r="6" />
      <path d="M9 2h6M9 22h6M12 6v6l3 3" />
    </svg>
  ),
  console: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="12" r="1" />
      <circle cx="18" cy="10" r="1" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BrandPicker({ brands, models = [], basePath = "/reparation" }: { brands: RepairBrand[]; models?: ModelWithBrand[]; basePath?: string }) {
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const brandRefs = useRef(new Map<string, HTMLButtonElement>());
  const id = useId();
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => { if (selectedParent) backRef.current?.focus(); }, [selectedParent]);
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q.length < 2 ? [] : models.filter(m => m.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, models]);
  const showResults = isOpen && query.trim().length >= 2;
  const parentGroups = new Map<string, RepairBrand[]>();
  for (const brand of brands) {
    const key = PARENT_BRAND_MAP[brand.slug] ?? brand.slug;
    parentGroups.set(key, [...(parentGroups.get(key) ?? []), brand]);
  }
  const orderedParents = [...PARENT_BRAND_ORDER.filter(key => parentGroups.has(key)), ...Array.from(parentGroups.keys()).filter(key => !PARENT_BRAND_ORDER.includes(key))];
  const closeSearch = () => { inputRef.current?.focus(); setIsOpen(false); };
  return <div className={styles.picker}>
    <div ref={searchRef} className={styles.search} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
    }}>
      <label htmlFor={id}>Søg efter model</label>
      <div className={styles.searchField}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></svg>
        <input id={id} ref={inputRef} type="text" autoComplete="off" value={query} placeholder="Fx iPhone 15 Pro eller Galaxy S24" aria-controls={showResults ? id + "-results" : undefined} aria-describedby={id + "-hint"}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)}
          onKeyDown={e => {
            if (e.key === "Escape") { e.preventDefault(); closeSearch(); }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (showResults) resultsRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
              else setIsOpen(true);
            }
          }} />
        {query && <button type="button" aria-label="Ryd søgning" onClick={() => { setQuery(""); inputRef.current?.focus(); setIsOpen(false); }}>×</button>}
      </div>
      <p id={id + "-hint"} className={styles.hint}>Skriv mindst 2 tegn, eller vælg et mærke nedenfor.</p>
      {showResults && <nav id={id + "-results"} ref={resultsRef} aria-label="Søgeresultater" className={styles.searchResults} onKeyDown={e => {
        if (e.key === "Escape") { e.preventDefault(); closeSearch(); }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const links = Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>("a"));
          const index = links.indexOf(document.activeElement as HTMLAnchorElement);
          if (e.key === "ArrowUp" && index === 0) inputRef.current?.focus();
          else links[Math.min(links.length - 1, Math.max(0, index + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
        }
      }}>
        {searchResults.length === 0 ? <div className={styles.empty}><p role="status">Ingen modeller fundet for &ldquo;{query}&rdquo;.</p><Link href="/kontakt">Få hjælp til din model</Link></div> : searchResults.map(model => <Link key={model.id} href={basePath + "/" + model.brand_slug + "/" + model.slug} onClick={() => setIsOpen(false)}><span><strong>{model.name}</strong>{" "}<small>{model.brand_name}</small></span><span aria-hidden="true">→</span></Link>)}
      </nav>}
    </div>
    {brands.length === 0 && <div className={styles.empty}><p>Vi kan ikke vise mærker lige nu.</p><Link href="/kontakt">Få hjælp til din reparation</Link></div>}
    {selectedParent ? <div>
      <button ref={backRef} type="button" className={styles.back} onClick={() => { const key = selectedParent; flushSync(() => setSelectedParent(null)); brandRefs.current.get(key)?.focus(); }}>Alle mærker</button>
      <h3 className={styles.pickerTitle}>Vælg din {PARENT_BRAND_META[selectedParent]?.name ?? "enhed"}</h3>
      <div className={styles.brandGrid}>{(parentGroups.get(selectedParent) ?? []).map(brand => <Link className={styles.brandCell} key={brand.id} href={basePath + "/" + brand.slug}><span className={styles.deviceIcon}>{DEVICE_TYPE_ICONS[brand.device_type]}</span><span><strong>{brand.name}</strong><small>{DEVICE_TYPE_LABELS[brand.device_type]}</small></span><span aria-hidden="true">→</span></Link>)}</div>
    </div> : <div className={styles.brandGrid}>{orderedParents.map(key => {
      const meta = PARENT_BRAND_META[key];
      const collections = parentGroups.get(key)!;
      const name = meta?.name ?? collections[0].name;
      const content = <>{meta?.logo ? <img src={meta.logo} alt="" width={40} height={40} /> : <span className={styles.deviceIcon}>{DEVICE_TYPE_ICONS[collections[0].device_type]}</span>}<strong>{name}</strong><span aria-hidden="true">→</span></>;
      return collections.length === 1 ? <Link key={key} href={basePath + "/" + collections[0].slug} className={styles.brandCell}>{content}</Link> : <button key={key} ref={node => { if (node) brandRefs.current.set(key, node); else brandRefs.current.delete(key); }} type="button" className={styles.brandCell} onClick={() => setSelectedParent(key)}>{content}</button>;
    })}</div>}
  </div>;
}
