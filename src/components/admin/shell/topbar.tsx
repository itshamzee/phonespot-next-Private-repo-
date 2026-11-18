"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import GlobalSearch from "@/components/admin/global-search";
import { NotificationsButton } from "./notifications";
import { useSaveBarState } from "./save-bar";
import type { NavCounts } from "./sidebar";
import { useStoreScope } from "./store-scope-context";
import { StoreSwitcher } from "./store-switcher";
import { NavPendingSignal } from "./nav-pending";
import { menuItemClass, usePopoverMenu } from "./use-popover-menu";

/** Forbogstaver til avataren: "Mikkel Kjær" -> "MK", ellers første bogstav i mailen. */
export function initialsOf(name: string | null | undefined, email: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (email?.charAt(0) ?? "A").toUpperCase();
}

/**
 * Topbjælken (hvid): ordmærke, butiksvælger, søgning, notifikationer og bruger.
 * Har formularen ændringer, der ikke er gemt, overtager Gem-bjælken søgefeltets plads.
 * På mobil bliver søgningen en knap, der folder feltet ud under bjælken.
 */
export function Topbar({
  email,
  counts,
  onMenu,
  onLogout,
}: {
  email: string | null;
  counts: NavCounts;
  onMenu: () => void;
  onLogout: () => void;
}) {
  const save = useSaveBarState();
  const { me } = useStoreScope();
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menu = usePopoverMenu({ wrapRef: menuWrapRef, triggerRef: menuTriggerRef, panelRef: menuPanelRef });
  const [searchOpen, setSearchOpen] = useState(false);

  const unsaved = Boolean(save?.dirty);
  // Søgefeltet toner kun ind, når det kommer tilbage efter Gem-bjælken, ikke ved første visning.
  const [saveBarSeen, setSaveBarSeen] = useState(false);
  if (unsaved && !saveBarSeen) setSaveBarSeen(true);
  const displayName = me?.name?.trim() || null;
  const firstName = displayName?.split(/\s+/)[0] ?? null;

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center gap-3 border-b border-[#E2E5E0] bg-white px-3 text-[#15211B] sm:gap-5 sm:px-5">
      <button
        type="button"
        onClick={onMenu}
        className="m-press m-tap rounded-lg p-2 text-[#15211B] hover:bg-[#F5F6F4] lg:hidden"
        aria-label="Åbn menu"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* På en telefon er der ikke plads til både logo, butiksvælger og klokken; klokken med tallet vinder. */}
      <Link href="/admin" className="hidden shrink-0 sm:block" aria-label="PhoneSpot admin, til overblik">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logos/phonespot-wordmark-green.png" alt="PhoneSpot" className="h-auto w-[104px] sm:w-[124px]" />
        <NavPendingSignal />
      </Link>

      <StoreSwitcher className={unsaved ? "hidden sm:block" : ""} />

      {unsaved && save ? (
        <div role="status" className="m-row-in flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg bg-[#E7EFE9] py-1.5 pl-3 pr-1.5 lg:max-w-[720px]">
          <p className="min-w-0 truncate text-[13px] font-medium text-[#1A3D2E]">
            {save.blocked ? save.blocked : "Ændringer, der ikke er gemt"}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={save.onDiscard}
              disabled={save.saving}
              className="h-8 rounded-md px-3 text-[13px] font-medium text-[#3D4842] hover:bg-white disabled:opacity-50"
            >
              Kassér
            </button>
            <button
              type="button"
              onClick={save.onSave}
              disabled={save.saving || Boolean(save.blocked)}
              className="h-8 rounded-md bg-[#1A3D2E] px-3.5 text-[13px] font-semibold text-white hover:bg-[#2D6B45] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {save.saving ? "Gemmer" : "Gem"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={`hidden min-w-0 flex-1 sm:block sm:max-w-[520px] ${saveBarSeen ? "m-row-in" : ""}`}>
            <GlobalSearch />
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-expanded={searchOpen}
            aria-label="Søg"
            className="m-press m-tap ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-[#15211B] hover:bg-[#F5F6F4] sm:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
          {searchOpen && (
            <div className="absolute inset-x-0 top-14 z-50 border-b border-[#E2E5E0] bg-white p-2 sm:hidden">
              <GlobalSearch />
            </div>
          )}
        </>
      )}

      <div className={`flex shrink-0 items-center gap-2 sm:ml-auto sm:gap-3 ${unsaved ? "hidden sm:flex" : ""}`}>
        <NotificationsButton counts={counts} />
        <div ref={menuWrapRef} className="relative shrink-0">
          <button
            ref={menuTriggerRef}
            type="button"
            aria-expanded={menu.open}
            aria-controls={menu.panelId}
            onClick={menu.toggle}
            aria-haspopup="menu"
            aria-label="Konto"
            className="m-press m-tap flex items-center gap-2 rounded-lg p-0.5 text-[14px] hover:bg-[#F5F6F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3D2E]/40 sm:pr-2"
          >
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#1A3D2E] text-[13px] font-semibold text-white">
              {initialsOf(displayName, email)}
            </span>
            <span className="hidden sm:inline">{firstName ?? email?.split("@")[0] ?? ""}</span>
          </button>
          {/* Altid monteret (.m-pop), så menuen kan tone ind og ud. */}
          <div
            ref={menuPanelRef}
            id={menu.panelId}
            tabIndex={-1}
            data-open={menu.open}
            aria-hidden={menu.open ? undefined : true}
            role="menu"
            aria-label="Konto"
            className="m-pop absolute right-0 top-11 w-60 rounded-xl border border-[#E2E5E0] bg-white p-1.5 text-[#15211B] outline-none"
          >
            <p className="truncate px-2.5 py-2 text-[13px] text-[#5E6A63]">{email}</p>
            <Link role="menuitem" href="/admin/indstillinger/profil" onClick={menu.closeAndReturn} className={menuItemClass}>
              Profil og signatur
              <NavPendingSignal />
            </Link>
            <Link role="menuitem" href="/" target="_blank" onClick={menu.closeAndReturn} className={menuItemClass}>
              Åbn webshoppen
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                menu.closeAndReturn();
                onLogout();
              }}
              className={`${menuItemClass} w-full text-left`}
            >
              Log ud
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
