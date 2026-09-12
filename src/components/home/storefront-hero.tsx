"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { StorefrontIcon, type StorefrontIconKind } from "@/components/ui/storefront-icon";
import styles from "./storefront.module.css";

// Editorial photography from the approved design; inventory comes only from ShopTabs.
const categories: { label: string; name: string; href: string; title: [string, string]; description: string; image: string; alt: string; caption: string; icon: StorefrontIconKind }[] = [
  { label: "iPhones", name: "iPhones", href: "/iphones", title: ["iPhone 17 Pro.", "Et nyt kapitel."], description: "Din næste iPhone behøver ikke være ny. Find din model, og få 36 måneders garanti.", image: "https://www.apple.com/newsroom/images/2025/09/apple-unveils-iphone-17-pro-and-iphone-17-pro-max/article/Apple-iPhone-17-Pro-camera-close-up-250909_big.jpg.large.jpg", alt: "Nærfoto af iPhone 17 Pro i kosmisk orange", caption: "iPhone 17 Pro", icon: "phone" },
  { label: "Bærbare", name: "bærbare", href: "/baerbare", title: ["Til alt det,", "du skal nå."], description: "Til studie, arbejde og hverdagen. Find en testet bærbar med 36 måneders garanti.", image: "/blog/covers/macbook-air-studio.jpg", alt: "MacBook fotograferet i et studie", caption: "MacBooks og bærbare", icon: "laptop" },
  { label: "iPads", name: "iPads", href: "/ipads", title: ["Plads til", "lidt af det hele."], description: "Læs, se, skriv og vær med. Find en refurbished iPad med 36 måneders garanti.", image: "https://cdsassets.apple.com/live/SZLF0YNV/images/sp/111898_sp849-ipad-9gen-480.png", alt: "iPad 10,2″ · 9. generation", caption: "iPad 10,2″ · 9. generation", icon: "tablet" },
  { label: "Smartwatches", name: "smartwatches", href: "/smartwatches", title: ["Mere med.", "Om håndleddet."], description: "Find et smartwatch til din hverdag. Testet og klar med 36 måneders garanti.", image: "https://xfcadewtpmjrvuzfwkku.supabase.co/storage/v1/object/public/product-images/templates/ee2befe2-7cad-451e-82d8-ebdb5c49a54d/1774206341440-hralrn.webp", alt: "Samsung Galaxy Watch 4", caption: "Samsung Galaxy Watch 4", icon: "watch" },
];

export function StorefrontHero() {
  const [slide, setSlide] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const category = categories[slide];
  const select = (index: number) => setSlide((index + categories.length) % categories.length);

  return <>
    <section className={`${styles.campaign} ${slide === 0 ? styles["is-iphone"] : slide === 1 ? styles["is-laptop"] : ""}`} aria-label="Udforsk vores enheder" aria-roledescription="karrusel">
      <div className={styles["campaign-stage"]} id="campaign-stage">
        <div className={styles["campaign-copy"]}>
          <span className={styles.eyebrow}>Refurbished. Klar til mere.</span>
          <h1>{category.title[0]}<br />{category.title[1]}</h1>
          <p>{category.description}</p>
          <Link className={`${styles.button} ${styles["hero-link"]}`} href={category.href}>Se vores {category.name}<StorefrontIcon kind="arrow" /></Link>
          <Link className={styles["quality-link"]} href="/kvalitet"><StorefrontIcon kind="check" />Testet, kontrolleret og klar til dig</Link>
        </div>
        <div className={styles["campaign-visual"]}>
          {/* The approved editorial images include external sources outside the product optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={category.image} alt={category.alt} fetchPriority={slide === 0 ? "high" : "auto"} />
          <span className={styles["hero-caption"]}>{category.caption}</span>
        </div>
        <div className={styles["carousel-controls"]}>
          <span aria-live="polite" aria-atomic="true">{slide + 1} / 4 · {category.name}</span>
          <button type="button" className={styles["previous-slide"]} onClick={() => select(slide - 1)} aria-label="Forrige kategori"><StorefrontIcon kind="arrow" /></button>
          <button type="button" onClick={() => select(slide + 1)} aria-label="Næste kategori"><StorefrontIcon kind="arrow" /></button>
        </div>
      </div>
      <div className={styles["carousel-tabs"]} aria-label="Kategorier i karrusellen">
        {categories.map((item, index) => <button key={item.href} type="button" ref={node => { buttons.current[index] = node; }} aria-pressed={slide === index} aria-controls="campaign-stage" onClick={() => select(index)} onKeyDown={event => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = (index + (event.key === "ArrowRight" ? 1 : -1) + categories.length) % categories.length;
          select(next);
          buttons.current[next]?.focus();
        }}><StorefrontIcon kind={item.icon} /><span>{item.label}</span><StorefrontIcon kind="arrow" /></button>)}
      </div>
    </section>
    <section className={styles.services} aria-label="Reparation og opkøb">
      <article className={`${styles["service-card"]} ${styles["repair-card"]}`}>
        <div className={styles["service-content"]}>
          <div className={styles["service-label"]}><StorefrontIcon kind="repair" />Reparation</div>
          <h2>Giv din telefon<br />mere tid.</h2>
          <p>Skærm, batteri eller noget andet?<br />Find hjælp til netop din model.</p>
          <Link className={`${styles.button} ${styles.light}`} href="/reparation">Find din reparation<StorefrontIcon kind="arrow" /></Link>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/repair/telefon-med-smadret-skaerm.jpg" alt="Telefon med smadret skærm" loading="lazy" />
        <span className={styles["service-foot"]}>Hjælp online og i vores butikker</span>
      </article>
      <article className={`${styles["service-card"]} ${styles["buyback-card"]}`}>
        <div className={styles["service-content"]}>
          <div className={styles["service-label"]}><StorefrontIcon kind="exchange" />Sælg din enhed</div>
          <h2>Din gamle enhed.<br />Stadig noget værd.</h2>
          <p>En iPhone, iPad eller computer i skuffen?<br />Få din enhed vurderet hos os.</p>
          <Link className={styles.button} href="/saelg-din-enhed">Hvad er din enhed værd?<StorefrontIcon kind="arrow" /></Link>
        </div>
        <div className={styles["trade-symbol"]}><StorefrontIcon kind="exchange" /></div>
        <span className={styles["service-foot"]}>Start med model og stand</span>
      </article>
    </section>
    <div className={styles.assurance}>
      <Link href="/garanti"><StorefrontIcon kind="check" />36 måneders garanti på enheder</Link>
      <Link href="/butik"><StorefrontIcon kind="pin" />Butikker i Vejle og Slagelse</Link>
      <Link href="/handelsbetingelser"><StorefrontIcon kind="check" />14 dages fortrydelsesret</Link>
      <Link href="/delbetaling"><StorefrontIcon kind="check" />Mulighed for delbetaling</Link>
    </div>
  </>;
}
