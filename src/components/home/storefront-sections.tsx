import Link from "next/link";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import styles from "./storefront.module.css";

export function StorefrontSections() {
  return <>
    <section className={styles.store} aria-label="Besøg vores butikker">
      <div className={styles["store-photo"]}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/store/butik-indvendig.jpg" alt="Indenfor i PhoneSpots butik" loading="lazy" />
        <span><StorefrontIcon kind="pin" />PhoneSpot · Også tæt på dig</span>
      </div>
      <div className={styles["store-copy"]}>
        <span className={styles.eyebrow}>Vejle og Slagelse</span>
        <h2>Se den.<br />Prøv den.<br />Tag den med.</h2>
        <p>Kom forbi, mærk kvaliteten, og få hjælp til at vælge. Vi hjælper også med din reparation.</p>
        <div className={styles["store-links"]}>
          {(["Vejle", "Slagelse"] as const).map(city => <Link key={city} href={`/butik/${city.toLowerCase()}`}><span><strong>{city}</strong><small>Find vej og åbningstider</small></span><StorefrontIcon kind="arrow" /></Link>)}
        </div>
      </div>
    </section>
    <section className={styles["quality-section"]} aria-label="Om vores kvalitet">
      <div><span className={styles.eyebrow}>Brugt før. Klar igen.</span><h2>Du skal vide,<br />hvad du får.</h2><Link className={styles.textlink} href="/kvalitet">Sådan sikrer vi kvaliteten<StorefrontIcon kind="arrow" /></Link></div>
      <div className={styles["quality-answers"]}>
        <details><summary>Hvad betyder refurbished?<span aria-hidden="true">+</span></summary><p>Enheden har været brugt før og er testet og klargjort til salg. Se vores kvalitetskontrol på kvalitetssiden.</p></details>
        <details><summary>Hvad betyder stand A, B og C?<span aria-hidden="true">+</span></summary><p>Graderingen beskriver det kosmetiske udseende. Læs beskrivelsen af den konkrete vares stand, før du vælger.</p></details>
        <details><summary>Hvad med garantien?<span aria-hidden="true">+</span></summary><p>Du får 36 måneders garanti på enheder. Tilbehør har 2 års reklamationsret. Læs vilkårene på vores garantiside.</p></details>
      </div>
    </section>
  </>;
}
