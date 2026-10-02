"use client";

import { SCOPE_LABELS, SCOPE_SLUGS, parseRequestedScope } from "@/lib/auth/store-scope";
import { useStoreScope } from "./store-scope-context";

/** Rækkefølge jf. ejerens ønske: Alle, Vejle, Slagelse, Webshop. */
const OWNER_OPTIONS = ["alle", "vejle", "slagelse", "webshop"] as const;

/**
 * Butikken i topbjælken. Ejeren vælger mellem Alle / Vejle / Slagelse / Webshop;
 * alle andre ser blot deres egen butik som en fast etiket (ingen valg — serveren
 * ignorerer alligevel ønsker om andre butikker).
 */
export function StoreSwitcher({ className = "" }: { className?: string }) {
  const { loading, isOwner, scope, setScope, ownSlug } = useStoreScope();

  if (loading) return null;

  if (isOwner) {
    return (
      <div className={`relative shrink-0 ${className}`}>
        <label htmlFor="admin-store-switcher" className="sr-only">
          Vælg butik
        </label>
        <select
          id="admin-store-switcher"
          value={scope === "ingen" ? "alle" : scope}
          onChange={(e) => {
            const next = parseRequestedScope(e.target.value);
            if (next) setScope(next);
          }}
          className="h-9 cursor-pointer appearance-none rounded-lg bg-white/10 py-0 pl-3 pr-8 text-[13px] font-medium text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {OWNER_OPTIONS.map((slug) => (
            <option key={slug} value={slug} className="text-charcoal">
              {slug === "alle" ? "Alle butikker" : SCOPE_LABELS[slug]}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    );
  }

  const known = ownSlug && (SCOPE_SLUGS as readonly string[]).includes(ownSlug);
  return (
    <p
      data-testid="store-label"
      aria-label="Din butik"
      className={`shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-medium ${known ? "text-white" : "text-white/70"} ${className}`}
    >
      {known ? SCOPE_LABELS[ownSlug] : "Ingen butik tildelt"}
    </p>
  );
}
