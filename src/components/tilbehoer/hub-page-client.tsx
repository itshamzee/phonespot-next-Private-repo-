"use client";

import Link from "next/link";
import Image from "next/image";
import { TilbehoerLayout } from "./tilbehoer-layout";
import { TrustBar } from "@/components/ui/trust-bar";
import { BrandCarousel } from "./brand-carousel";
import styles from "./accessories-landing.module.css";

const categories = [
  { slug: "covers", title: "Covers", detail: "Til telefon og tablet", image: "cover-product" },
  { slug: "beskyttelsesglas", title: "Beskyttelsesglas", detail: "Find glasset til din model", image: "glass-product" },
  { slug: "opladere", title: "Kabler og opladere", detail: "Til hverdagens enheder", image: "charger-product" },
  { slug: "lyd", title: "Lyd", detail: "Høretelefoner og højttalere", image: "audio-product" },
  { slug: "holdere", title: "Mere tilbehør", detail: "Holdere og andet tilbehør", image: "stand-product" },
];

export function HubPageClient() {
  return <>
    <div className={styles.landing}>
      <section className={styles.intro} aria-labelledby="accessories-title">
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Tilbehør hos PhoneSpot</p>
          <h1 id="accessories-title">De små ting.<br />Du bruger hver dag.</h1>
          <p>Et cover, der passer. Et kabel ved hånden. Find tilbehøret til din telefon, tablet og computer.</p>
          <a href="#tilbehoersudvalg" className={styles.button}>Se alt tilbehør <span aria-hidden="true">→</span></a>
        </div>
        <a href="#tilbehoersudvalg" className={styles.heroImage} aria-label="Se alt tilbehør">
          <Image src="/images/accessories/audio-product.png" alt="Mørke høretelefoner set forfra og fra siden" fill priority sizes="(max-width: 640px) 90vw, 580px" />
          <span>Til hverdagen med din enhed <span aria-hidden="true">↗</span></span>
        </a>
      </section>
      <nav className={styles.categories} aria-label="Find tilbehør efter kategori">
        {categories.map(category => {
          return <Link key={category.slug} href={category.slug === "beskyttelsesglas" ? "/beskyttelsesglas" : `/tilbehoer/${category.slug}`}>
            <div className={styles.categoryImage}>
              <Image src={`/images/accessories/${category.image}.png`} alt="" fill sizes="(max-width: 640px) 140px, 230px" data-category={category.slug} />
            </div>
            <strong>{category.title}<span aria-hidden="true">↗</span></strong>
            <small>{category.detail}</small>
          </Link>;
        })}
      </nav>
      <BrandCarousel />
    </div>
    <div id="tilbehoersudvalg" className={styles.catalogue}>
      <TilbehoerLayout heroTitle="Alt tilbehør" heroDescription="Se udvalget, eller afgræns efter kategori, model og pris." activeCategory="" headingLevel="h2" />
    </div>
    <div className={styles.landing}>
      <div className={styles.trust}><TrustBar variant="accessory" /></div>
    </div>
  </>;
}
