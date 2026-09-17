"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import GlobalSearch from "@/components/admin/global-search";
import { useSaveBarState } from "./save-bar";

export function Topbar({
  email,
  onMenu,
  onLogout,
}: {
  email: string | null;
  onMenu: () => void;
  onLogout: () => void;
}) {
  const save = useSaveBarState();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menuOpen]);

  const unsaved = Boolean(save?.dirty);

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center gap-3 bg-green-eco px-3 text-white sm:px-4">
      <button
        type="button"
        onClick={onMenu}
        className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
        aria-label="Åbn menu"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <Link href="/admin" className={`shrink-0 lg:w-[232px] ${unsaved ? "hidden sm:block" : ""}`} aria-label="PhoneSpot admin, til overblik">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logos/phonespot-wordmark-white.png" alt="PhoneSpot" className="h-auto w-[124px]" />
      </Link>

      {unsaved && save ? (
        <div role="status" className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg bg-white/10 py-1.5 pl-3 pr-1.5 lg:max-w-[720px]">
          <p className="min-w-0 truncate text-[13px] font-medium">
            {save.blocked ? save.blocked : "Ændringer, der ikke er gemt"}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={save.onDiscard}
              disabled={save.saving}
              className="h-8 rounded-md px-3 text-[13px] font-medium text-white/85 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Kassér
            </button>
            <button
              type="button"
              onClick={save.onSave}
              disabled={save.saving || Boolean(save.blocked)}
              className="h-8 rounded-md bg-white px-3.5 text-[13px] font-semibold text-green-eco hover:bg-green-pale disabled:cursor-not-allowed disabled:opacity-50"
            >
              {save.saving ? "Gemmer" : "Gem"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 justify-start lg:justify-center lg:pr-[232px]">
          <GlobalSearch />
        </div>
      )}

      <div ref={menuRef} className={`relative ml-auto shrink-0 ${unsaved ? "hidden sm:block" : ""}`}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Konto"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[12px] font-semibold hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {email?.charAt(0).toUpperCase() ?? "A"}
        </button>
        {menuOpen && (
          <div role="menu" className="absolute right-0 top-11 w-60 rounded-xl border border-sand bg-white p-1.5 text-charcoal shadow-lg">
            <p className="truncate px-2.5 py-2 text-[13px] text-gray">{email}</p>
            <Link role="menuitem" href="/admin/indstillinger/profil" onClick={() => setMenuOpen(false)} className="block rounded-lg px-2.5 py-2 text-[14px] hover:bg-cream">
              Profil og signatur
            </Link>
            <Link role="menuitem" href="/" target="_blank" onClick={() => setMenuOpen(false)} className="block rounded-lg px-2.5 py-2 text-[14px] hover:bg-cream">
              Åbn webshoppen
            </Link>
            <button role="menuitem" type="button" onClick={onLogout} className="block w-full rounded-lg px-2.5 py-2 text-left text-[14px] hover:bg-cream">
              Log ud
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
