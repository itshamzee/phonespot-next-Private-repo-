import Image from "next/image";
import Link from "next/link";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import styles from "./device-collection.module.css";

export type CollectionKind = "iphone" | "ipad" | "laptop" | "watch" | "smartphone";

const visuals: Record<CollectionKind, { eyebrow: string; image: string; alt: string; caption: string }> = {
  iphone: { eyebrow: "Din hverdag. Din iPhone.", image: "/images/devices/iphone-17.png", alt: "iPhone 17 Pro i sølv, kosmisk orange og dyb blå", caption: "iPhone 17 Pro" },
  ipad: { eyebrow: "Plads til det, du holder af.", image: "/images/devices/ipad-air-color.jpg", alt: "iPad Air med farvet skærm set forfra og bagfra", caption: "iPad Air" },
  laptop: { eyebrow: "Til alt det, du skal nå.", image: "/images/devices/macbook-air.png", alt: "Åben MacBook Air med blå skærm", caption: "MacBooks og bærbare" },
  watch: { eyebrow: "Lidt mere med. Om håndleddet.", image: "/images/products/apple-watch.png", alt: "Apple Watch med mørk rem", caption: "Apple Watch og andre smartwatches" },
  smartphone: { eyebrow: "Android. På din måde.", image: "/images/devices/samsung-s24.png", alt: "Samsung Galaxy set forfra og bagfra", caption: "Samsung, OnePlus og flere" },
};

export function DeviceCollectionHero({ collection, title, intro, modelCount }: {
  collection: CollectionKind;
  title: string;
  intro: string;
  modelCount: number;
}) {
  const visual = visuals[collection];
  return <div className={styles.wrap}>
    <nav aria-label="Brødkrumme" className={styles.breadcrumb}>
      <Link href="/">Forside</Link><span aria-hidden="true">/</span><span>{title}</span>
    </nav>
    <section className={styles.hero} aria-labelledby="collection-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{visual.eyebrow}</p>
        <h1 id="collection-title">{title}</h1>
        <p className={styles.intro}>{intro}</p>
        <div className={styles.heroActions}>
          <a href="#udvalg" className={styles.primaryLink}>Se udvalget <StorefrontIcon kind="arrow" /></a>
          <span>{modelCount} {modelCount === 1 ? "model" : "modeller"} i udvalget</span>
        </div>
      </div>
      <figure className={styles.heroVisual}>
        <Image src={visual.image} alt={visual.alt} width={500} height={400} priority sizes="(max-width: 600px) 65vw, (max-width: 1000px) 40vw, 480px" className={styles.heroImage} />
        <figcaption>{visual.caption}</figcaption>
      </figure>
    </section>
    <div className={styles.assurance}>
      <Link href="/garanti"><StorefrontIcon kind="check" /><span>36 måneders garanti <span>på enheder</span></span></Link>
      <Link href="/kvalitet"><StorefrontIcon kind="check" /><span>Testet og klargjort <span>til en ny hverdag</span></span></Link>
      <Link href="/butik"><StorefrontIcon kind="pin" /><span>Se og prøv i butik <span>i Vejle og Slagelse</span></span></Link>
    </div>
  </div>;
}
