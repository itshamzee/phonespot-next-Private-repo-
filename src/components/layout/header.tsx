"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { STORE } from "@/lib/store-config";
import { DispatchCountdown } from "./dispatch-countdown";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import styles from "@/components/home/storefront.module.css";
import type { MegaMenu } from "@/lib/navigation/mega-menu";
import { MegaNav, NAV_CATEGORIES, SALE_TEXT, TILBEHOER_PANEL } from "./mega-nav";
import { useBlackNovember } from "@/lib/campaign/use-black-november";

const menuLinks = [
  { label: "Beskyttelsesglas", href: "/beskyttelsesglas" },
  { label: "Reparation", href: "/reparation" },
  { label: "Sælg din enhed", href: "/saelg-din-enhed" },
  { label: "Find butik", href: "/butik" },
  { label: "Min konto", href: "/konto" },
  { label: "Forsikring via Storstrøm", href: "/forsikring" },
  { label: "FAQ", href: "/faq" },
  { label: "Garanti", href: "/garanti" },
  { label: "Kvalitet", href: "/kvalitet" },
  { label: "Kontakt", href: "/kontakt" },
];

export function Header({ menu = null, campaignActive = false }: { menu?: MegaMenu | null; campaignActive?: boolean }) {
  const blackNovember = useBlackNovember(campaignActive);
  const { totals, openCart } = useCart();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuPanel = useRef<HTMLDivElement>(null);
  const menuClose = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const returnFocusTo = menuButton.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menuClose.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMobileOpen(false); }
      if (event.key !== "Tab") return;
      const focusable = menuPanel.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const closeOnDesktop = () => { if (window.innerWidth > 760) setMobileOpen(false); };
    document.addEventListener("keydown", keydown);
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      window.removeEventListener("resize", closeOnDesktop);
      returnFocusTo?.focus({ preventScroll: true });
    };
  }, [mobileOpen]);

  return <header className={styles.surface}>
    <a className={styles.skip} href="#indhold">Gå til indhold</a>
    <div className={styles.topline}><div className={styles.wrap}>
      <span className={styles.topWarranty}>36 måneders garanti på enheder</span>
      <DispatchCountdown className={styles.dispatchClock} />
      <nav className={styles.storeLocations} aria-label="Vores butikker">
        <Link href="/butik/vejle"><StorefrontIcon kind="pin" />Vejle</Link>
        <Link href="/butik/slagelse"><StorefrontIcon kind="pin" />Slagelse</Link>
        <Link href="/butik/esbjerg" className={styles.upcomingStore}><StorefrontIcon kind="pin" />Esbjerg <small>snart</small></Link>
      </nav>
      <a className={styles.phoneLink} href={`tel:${STORE.phone.replace(/\s/g, "")}`} aria-label={`Ring til PhoneSpot på ${STORE.phone.replace("+45 ", "")}`}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 3 3 5-2 2a15 15 0 0 0 6 6l2-2 5 3v3c0 1-1 2-2 2C10 21 3 14 2 5c0-1 1-2 2-2h3Z" /></svg>
        {STORE.phone.replace("+45 ", "")}
      </a>
      <a className={styles.ratingLink} href="https://dk.trustpilot.com/review/phonespot.dk" target="_blank" rel="noopener noreferrer">Anmeldelser på Trustpilot</a>
    </div></div>
    <div className={`${styles.brandrow} ${styles.wrap}`}>
      <button type="button" ref={menuButton} className={styles["mobile-menu"]} aria-label="Åbn menu" aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen(true)}><StorefrontIcon kind="menu" /></button>
      <Link className={styles.logo} href="/"><Image src="/brand/logo.svg" alt="PhoneSpot" width={187} height={36} /></Link>
      <form role="search" className={styles.search} action="/soeg" onSubmit={event => {
        event.preventDefault();
        if (query.trim()) router.push(`/soeg?q=${encodeURIComponent(query.trim())}`);
      }}>
        <input type="search" name="q" aria-label="Søg efter model eller tilbehør" placeholder="Søg efter model eller tilbehør" value={query} onChange={event => setQuery(event.target.value)} />
        <button type="submit" aria-label="Søg"><StorefrontIcon kind="search" /></button>
      </form>
      <div className={styles.utilities}>
        <Link href="/butik" aria-label="Find butik"><StorefrontIcon kind="pin" /><span>Find butik</span></Link>
        <Link className={styles.account} href="/konto" aria-label="Min konto"><StorefrontIcon kind="person" /><span>Min konto</span></Link>
        <button type="button" className={styles["cart-preview"]} onClick={openCart} aria-label={totals.itemCount ? `Åbn kurv, ${totals.itemCount} ${totals.itemCount === 1 ? "vare" : "varer"}` : "Åbn kurv"}>
          <StorefrontIcon kind="bag" /><span>Kurv</span>{totals.itemCount > 0 && <span className={styles["cart-count"]}>{totals.itemCount}</span>}
        </button>
      </div>
    </div>
    <div className={`${styles.navwrap} relative z-40`}><nav className={`${styles.nav} ${styles.wrap}`} aria-label="Kategorier">
      <MegaNav menu={menu} campaign={blackNovember} panelClassName="absolute inset-x-0 top-full z-50 border-t border-[#e5e5ea] bg-white shadow-[0_24px_40px_-24px_rgba(17,17,17,0.25)]" />
      <span className={styles.service}>
        <Link href="/reparation"><StorefrontIcon kind="repair" />Reparation</Link>
        <Link href="/saelg-din-enhed"><StorefrontIcon kind="exchange" />Sælg din enhed</Link>
      </span>
    </nav></div>
    <nav className={styles["mobile-tasks"]} aria-label="Køb, reparer eller sælg">
      <Link href="/#udvalg"><StorefrontIcon kind="bag" />Køb</Link>
      <Link href="/reparation"><StorefrontIcon kind="repair" />Reparation</Link>
      <Link href="/saelg-din-enhed"><StorefrontIcon kind="exchange" />Sælg din enhed</Link>
    </nav>
    {mobileOpen && <>
      <div className={styles["menu-backdrop"]} onClick={() => setMobileOpen(false)} aria-hidden="true" />
      <div ref={menuPanel} className={styles["menu-panel"]} role="dialog" aria-modal="true" aria-label="Menu" id="mobile-navigation">
        <button type="button" ref={menuClose} className={styles["menu-close"]} onClick={() => setMobileOpen(false)} aria-label="Luk menu">Luk<StorefrontIcon kind="close" /></button>
        <nav aria-label="Mobilmenu">
          {NAV_CATEGORIES.map(item => {
            const panel = item.href === "/tilbehoer" ? TILBEHOER_PANEL : menu?.[item.href as keyof MegaMenu];
            const links = panel?.groups.flatMap(g => g.links) ?? [];
            const sale = item.href === "/lagersalg" ? SALE_TEXT : "";
            if (!links.length) return <Link key={item.href} href={item.href} className={`!text-[17px] font-medium ${sale}`} onClick={() => setMobileOpen(false)}>{item.label}</Link>;
            return <details key={item.href} className="group border-b border-[#e5e5ea]">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-3 !text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                {item.label}
                <svg aria-hidden viewBox="0 0 16 16" className="!h-4 !w-4 transition-transform group-open:rotate-180"><path d="m4 6 4 4 4-4" /></svg>
              </summary>
              <div className="flex flex-col pb-2 pl-3">
                {links.slice(0, 10).map(l => <Link key={l.href} href={l.href} className={`!min-h-11 !border-0 !py-2.5 text-[15px] ${l.href === "/lagersalg" ? SALE_TEXT : "text-[#333]"}`} onClick={() => setMobileOpen(false)}>{l.label}</Link>)}
                <Link href={panel!.allHref} className="!min-h-11 !border-0 !py-2.5 text-[15px] font-semibold text-[#1a3d2e]" onClick={() => setMobileOpen(false)}>{panel!.allLabel}</Link>
              </div>
            </details>;
          })}
          {blackNovember && <Link href="/black-november" className={"!min-h-11 !border-0 !py-2.5 text-[15px] " + SALE_TEXT} onClick={() => setMobileOpen(false)}>Black November</Link>}
          {menuLinks.map(item => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>{item.label}</Link>)}
        </nav>
      </div>
    </>}
  </header>;
}
