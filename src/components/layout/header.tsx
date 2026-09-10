"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { TRUSTPILOT_SCORE_LABEL_DA } from "@/lib/trustpilot/constants";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import styles from "@/components/home/storefront.module.css";

const categories = [
  { label: "iPhones", href: "/iphones" },
  { label: "iPads", href: "/ipads" },
  { label: "Bærbare", href: "/baerbare" },
  { label: "Ure", href: "/smartwatches" },
  { label: "Tilbehør", href: "/tilbehoer" },
  { label: "Reservedele", href: "/reservedele" },
];
const menuLinks = [
  ...categories,
  { label: "Smartphones", href: "/smartphones" },
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

export function Header() {
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
      returnFocusTo?.focus();
    };
  }, [mobileOpen]);

  return <header className={styles.surface}>
    <a className={styles.skip} href="#indhold">Gå til indhold</a>
    <div className={styles.topline}><div className={styles.wrap}>
      <span>36 måneders garanti på enheder<span className={styles.desktop}>Butikker i Vejle og Slagelse</span></span>
      <a href="https://dk.trustpilot.com/review/phonespot.dk" target="_blank" rel="noopener noreferrer">Trustpilot {TRUSTPILOT_SCORE_LABEL_DA} / 5</a>
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
    <div className={styles.navwrap}><nav className={`${styles.nav} ${styles.wrap}`} aria-label="Kategorier">
      {categories.map(item => <Link key={item.href} href={item.href} className={item.href === "/reservedele" ? styles.optional : undefined}>{item.label}</Link>)}
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
        <nav aria-label="Mobilmenu">{menuLinks.map(item => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>{item.label}</Link>)}</nav>
      </div>
    </>}
  </header>;
}
