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

  const pill =
    "flex h-9 items-center gap-2 rounded-lg border border-[#E2E5E0] bg-[#F5F6F4] text-[14px] font-semibold text-[#15211B]";
  const dot = <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[#2F8F55]" />;

  if (isOwner) {
    const all = scope === "alle" || scope === "ingen";
    return (
      <div
        className={`relative shrink-0 ${pill} pl-3 pr-8 focus-within:ring-2 focus-within:ring-[#1A3D2E]/40 ${all ? "border-[#1A3D2E] bg-[#E7EFE9] text-[#1A3D2E]" : ""} ${className}`}
      >
        {dot}
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
          className="h-full cursor-pointer appearance-none bg-transparent pr-1 font-semibold focus:outline-none"
        >
          {OWNER_OPTIONS.map((slug) => (
            <option key={slug} value={slug} className="text-[#15211B]">
              {slug === "alle" ? "Alle butikker" : SCOPE_LABELS[slug]}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5E6A63]"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </div>
    );
  }

  const known = ownSlug && (SCOPE_SLUGS as readonly string[]).includes(ownSlug);
  return (
    <p
      data-testid="store-label"
      aria-label="Din butik"
      className={`${pill} shrink-0 px-3 ${known ? "" : "text-[#5E6A63]"} ${className}`}
    >
      {known ? dot : null}
      {known ? SCOPE_LABELS[ownSlug] : "Ingen butik tildelt"}
    </p>
  );
}
