import Image from "next/image";
import Link from "next/link";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import styles from "./device-collection.module.css";

export type PromoVariant = "trust" | "accessories";

export function PromoCard({ variant, href, device = "iPhone" }: {
  variant: PromoVariant;
  href: string;
  device?: "iPhone" | "iPad";
}) {
  const trust = variant === "trust";
  return <Link href={href} data-editorial-card={variant} className={`${styles.promo} ${trust ? "" : styles.accessories}`}>
    <div className={styles.promoVisual}>
      {trust ? <div className={styles.warrantyNumber} aria-hidden="true"><strong>36</strong><span>måneders garanti på enheder</span></div>
        : device === "iPhone" ? <>
          <Image src="/images/accessories/cover-product.png" width={300} height={300} alt="Grønt cover" sizes="180px" className={styles.cover} />
          <Image src="/images/accessories/glass-product.png" width={300} height={300} alt="Beskyttelsesglas" sizes="160px" className={styles.glass} />
        </> : <Image src="/images/accessories/audio-product.png" width={300} height={300} alt="Mørke høretelefoner" sizes="250px" />}
    </div>
    <div className={styles.promoBody}>
      <span className={styles.promoEyebrow}>{trust ? "Med i dit køb" : `Tilbehør til ${device}`}</span>
      <h3>{trust ? "Tryghed følger med." : `Det lille ekstra til din ${device}.`}</h3>
      <p>{trust ? `Din refurbished ${device} har 36 måneders garanti. Læs, hvad den dækker.` : device === "iPhone" ? "Et cover, der passer. Glas til skærmen. Find tilbehøret til din model." : "Lyd, kabler og mere til hverdagen. Vælg tilbehør, der passer til din model."}</p>
      <span className={styles.promoCta}>{trust ? "Se garantien" : "Find tilbehør"}<StorefrontIcon kind="arrow" /></span>
    </div>
  </Link>;
}
