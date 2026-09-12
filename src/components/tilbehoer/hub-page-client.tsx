"use client";

import Link from "next/link";
import Image from "next/image";
import { TilbehoerLayout } from "./tilbehoer-layout";
import { TrustBar } from "@/components/ui/trust-bar";
import { AccessoryCategoryIcon } from "./accessory-category-icon";
import styles from "./accessories-landing.module.css";

const categories = [
  { slug: "covers", title: "Covers", detail: "Til telefon og tablet", image: "/images/products/tilbehoer-case.webp" },
  { slug: "beskyttelsesglas", title: "Beskyttelsesglas", detail: "Find glasset til din model", image: null },
  { slug: "opladere", title: "Kabler og opladere", detail: "Til hverdagens enheder", image: "/blog/covers/apple-oplader.jpg" },
  { slug: "lyd", title: "Lyd", detail: "Høretelefoner og højttalere", image: null },
  { slug: "holdere", title: "Mere tilbehør", detail: "Holdere og andet tilbehør", image: null },
];

export function HubPageClient({ categoryImages = {} }: { categoryImages?: Record<string, string> }) {
  return <>
    <div className={styles.landing}>
      <section className={styles.intro} aria-labelledby="accessories-title">
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Tilbehør hos PhoneSpot</p>
          <h1 id="accessories-title">De små ting.<br />Du bruger hver dag.</h1>
          <p>Et cover, der passer. Et kabel ved hånden. Find tilbehøret til din telefon, tablet og computer.</p>
          <a href="#tilbehoersudvalg" className={styles.button}>Se alt tilbehør <span aria-hidden="true">→</span></a>
        </div>
        <Link href="/tilbehoer/covers" className={styles.heroImage} aria-label="Se covers til telefon og tablet">
          <Image src="/images/products/tilbehoer-case.webp" alt="Telefoner med gennemsigtige covers" fill priority sizes="(max-width: 640px) 90vw, 520px" />
          <span>Find dit næste cover <span aria-hidden="true">↗</span></span>
        </Link>
      </section>
      <nav className={styles.categories} aria-label="Find tilbehør efter kategori">
        {categories.map(category => {
          const photo = categoryImages[category.slug] ?? category.image;
          return <Link key={category.slug} href={category.slug === "beskyttelsesglas" ? "/beskyttelsesglas" : `/tilbehoer/${category.slug}`}>
            <div className={styles.categoryImage}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photo ? <img src={photo} alt="" loading="lazy" /> : <AccessoryCategoryIcon slug={category.slug} />}
            </div>
            <strong>{category.title}<span aria-hidden="true">↗</span></strong>
            <small>{category.detail}</small>
          </Link>;
        })}
      </nav>
    </div>
    <div id="tilbehoersudvalg" className={styles.catalogue}>
      <TilbehoerLayout heroTitle="Alt tilbehør" heroDescription="Se udvalget, eller afgræns efter kategori, model og pris." activeCategory="" headingLevel="h2" />
    </div>
    <div className={styles.landing}>
      <section className={styles.repair} aria-labelledby="accessories-repair-title">
        <div className={styles.repairImage}><Image src="/images/repair/telefon-med-smadret-skaerm.jpg" alt="Telefon med knust skærm og adskilt display" fill sizes="(max-width: 640px) 90vw, 560px" /></div>
        <div className={styles.repairCopy}>
          <p className={styles.eyebrow}>Reparation i Vejle og Slagelse</p>
          <h2 id="accessories-repair-title">Er skaden allerede sket?</h2>
          <p>Et beskyttelsesglas løser ikke en ødelagt skærm. Find din model og se mulighederne for reparation.</p>
          <Link href="/reparation" className={styles.button}>Find din reparation <span aria-hidden="true">→</span></Link>
        </div>
      </section>
      <div className={styles.trust}><TrustBar variant="accessory" /></div>
    </div>
  </>;
}
