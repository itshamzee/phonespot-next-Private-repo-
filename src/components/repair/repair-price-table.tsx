import styles from "./model-sections.module.css";

type PriceRow = {
  id: string;
  name: string;
  slug: string;
  price_dkk: number;
  estimated_minutes: number | null;
  warranty_info: string | null;
  quality_tier: "standard" | "premium" | "original" | null;
  service_category: string | null;
};

const QUALITY: Record<string, string> = {
  standard: "Standard",
  premium: "Premium",
  original: "Original",
};

const QUALITY_ORDER = ["standard", "premium", "original"];

/**
 * Hele prislisten som almindelig HTML-tabel. Kurven viser kun "fra"-priser,
 * indtil kunden folder en kategori ud, så det er her, søgemaskiner og kunder
 * der sammenligner, ser hver kvalitet og pris. Rækkerne læser de samme
 * services som kurven og JSON-LD, så tallene altid stemmer overens.
 */
export function RepairPriceTable({
  modelName,
  services,
}: {
  modelName: string;
  services: PriceRow[];
}) {
  // Kategorierne beholder kurvens rækkefølge; inden for en kategori går
  // kvaliteten fra billigst til original.
  const order = new Map<string, number>();
  for (const s of services) {
    const key = s.service_category || s.name;
    if (!order.has(key)) order.set(key, order.size);
  }
  const rows = [...services].sort((a, b) => {
    const ka = order.get(a.service_category || a.name)!;
    const kb = order.get(b.service_category || b.name)!;
    if (ka !== kb) return ka - kb;
    return (
      QUALITY_ORDER.indexOf(a.quality_tier ?? "") -
      QUALITY_ORDER.indexOf(b.quality_tier ?? "")
    );
  });

  return (
    <section className={styles.priceList} aria-labelledby="prisliste">
      <div>
        <h2 id="prisliste">Prisliste for {modelName}</h2>
        <p>
          Alle priser er inkl. moms, reservedel og montering, og de er de samme
          i alle vores butikker. Vælger du flere reparationer på én gang, får du
          10 % rabat ved to og 15 % ved tre eller flere.
        </p>
        <a href="#reparationer" className={styles.textLink}>
          Vælg og book reparation
        </a>
      </div>
      <div className={styles.priceTableWrap}>
        <table className={styles.priceTable}>
          <caption className="sr-only">
            Priser på {modelName} reparation hos PhoneSpot
          </caption>
          <thead>
            <tr>
              <th scope="col">Reparation</th>
              <th scope="col">Kvalitet</th>
              <th scope="col">Tid</th>
              <th scope="col">Pris</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <th scope="row">
                  {modelName} {s.name.charAt(0).toLocaleLowerCase("da-DK") + s.name.slice(1)}
                  {s.warranty_info && <small>{s.warranty_info}</small>}
                  {s.slug === "diagnostik" && (
                    <small>Hurtig fejlsøgning ved disken er gratis</small>
                  )}
                </th>
                <td>{s.quality_tier ? QUALITY[s.quality_tier] : "–"}</td>
                <td>
                  {s.estimated_minutes && s.estimated_minutes > 0
                    ? "ca. " + s.estimated_minutes + " min."
                    : "–"}
                </td>
                <td>
                  {s.price_dkk > 0
                    ? s.price_dkk.toLocaleString("da-DK") + " kr."
                    : "Pris på forespørgsel"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
