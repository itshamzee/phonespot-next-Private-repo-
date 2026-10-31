import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { STORES } from "@/lib/store-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { BLACK_NOVEMBER, isBlackNovember, isCampaignCover } from "@/lib/campaign/black-november";
import { isLagersalg } from "@/lib/lagersalg/is-lagersalg";
import styles from "./black-november.module.css";

// Siden skifter tilstand ved midnat 1. og 1. december; frisk hvert 5. minut.
export const revalidate = 300;

const TITLE = "Black November 2026: 10 % på reparation | PhoneSpot";
const DESCRIPTION =
  "Black November hos PhoneSpot 1.–30. november: 10 % på alle reparationer, 5 % på brugte iPhones og andre enheder, covers og beskyttelsesglas til 199 kr. I Vejle, Slagelse og online.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://phonespot.dk/black-november" },
  openGraph: {
    title: "Black November hos PhoneSpot",
    description: DESCRIPTION,
    url: "https://phonespot.dk/black-november",
    type: "website",
    locale: "da_DK",
    siteName: "PhoneSpot",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "Black November hos PhoneSpot" }],
  },
};

const IPHONE_IMAGE =
  "https://xfcadewtpmjrvuzfwkku.supabase.co/storage/v1/object/public/product-media/iphones/cutout/apple-iphone-17-pro-soelv-1792173850693.webp";

/** Tre rigtige covers fra lageret, der er med i tilbuddet. */
async function campaignCovers(): Promise<{ src: string; alt: string }[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("sku_products")
      .select("title, subcategory, attributes, images")
      .eq("status", "published")
      .eq("is_active", true)
      .eq("subcategory", "cover")
      .ilike("title", "%iPhone 17 Pro%")
      .limit(40);
    const out: { src: string; alt: string }[] = [];
    for (const row of data ?? []) {
      const attrs = (row.attributes ?? {}) as Record<string, string>;
      if (isLagersalg({ subcategory: row.subcategory, attributes: attrs })) continue;
      if (!isCampaignCover({ subcategory: row.subcategory, title: row.title, attributes: attrs })) continue;
      const src = Array.isArray(row.images) ? (row.images[0] as string | undefined) : undefined;
      if (src && !out.some((o) => o.src === src)) out.push({ src, alt: row.title });
      if (out.length === 3) break;
    }
    return out;
  } catch {
    return [];
  }
}

const FAQ = [
  {
    q: "Hvornår gælder Black November?",
    a: "Fra 1. november kl. 00.00 til og med 30. november 2026. Tilbuddene gælder både online og i butikkerne i Vejle og Slagelse.",
  },
  {
    q: "Skal jeg bruge en rabatkode?",
    a: "Nej. Priserne på brugte enheder, covers og beskyttelsesglas er allerede nedsat på siden, og reparationsrabatten trækkes automatisk, når du booker eller betaler i butikken.",
  },
  {
    q: "Hvad koster et skærmskift i november?",
    a: "Du får 10 % af den normale pris. En iPhone 17 Pro-skærm i budgetkvalitet koster normalt 1.899 kr. og koster 1.709 kr. i november. Du ser alle priser på siden for din model.",
  },
  {
    q: "Kan rabatterne lægges sammen?",
    a: "Reparationsrabatten er 10 % fra første reparation. Vælger du tre eller flere reparationer på samme booking, gælder vores mængderabat på 15 % i stedet. De to rabatter lægges ikke oven i hinanden.",
  },
  {
    q: "Er alle covers med?",
    a: "Alle covers og beskyttelsesglas koster højst 199 kr., også privacy-glas. Bookcovers (pungcovers) og varer på lagersalg er ikke med. Lagersalg har sine egne priser og 3 for 2.",
  },
  {
    q: "Gælder garantien som normalt?",
    a: "Ja. Du får præcis samme garanti og returret som resten af året, også på varer købt til Black November-pris.",
  },
] as const;

/** Kampagnens tilstand ved denne rendering (siden fornyes hvert 5. minut). */
function campaignState() {
  const now = Date.now();
  const active = isBlackNovember(now);
  const upcoming = !active && now < BLACK_NOVEMBER.startsAt;
  return { active, upcoming, ended: !active && !upcoming };
}

export default async function BlackNovemberPage() {
  const { active, upcoming, ended } = campaignState();
  const covers = await campaignCovers();
  const stores = [STORES.vejle, STORES.slagelse];

  const status = active
    ? "Til og med 30. november"
    : upcoming
      ? "Starter 1. november"
      : "Black November 2026 er slut";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
      { "@type": "ListItem", position: 2, name: "Black November", item: "https://phonespot.dk/black-november" },
    ],
  };

  return (
    <div className={styles.page}>
      <JsonLd data={faqJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <section className={styles.hero} aria-labelledby="bn-title">
        <div className={styles.wrap}>
          <p className={styles.status}>
            <span className={styles.tag}>{status}</span>
            <span>Vejle · Slagelse · phonespot.dk</span>
          </p>
          <h1 id="bn-title" className={styles.title}>
            Black November.
          </h1>
          <p className={styles.lead}>
            {ended
              ? "Tak fordi du handlede med os i november. Vores normale priser gælder igen, og garantien er den samme."
              : "En hel måned med lavere priser på det, vi laver hver dag: reparationer, brugte enheder med garanti og tilbehør, der passer."}
          </p>
          <ol className={styles.ledger} aria-label="Tilbuddene">
            <li>
              <span className={styles.figure}>{BLACK_NOVEMBER.repairPercent} %</span>
              <span>på alle reparationer</span>
            </li>
            <li>
              <span className={styles.figure}>{BLACK_NOVEMBER.devicePercent} %</span>
              <span>på alle brugte enheder</span>
            </li>
            <li>
              <span className={styles.figure}>{BLACK_NOVEMBER.accessoryPriceKr} kr.</span>
              <span>for covers og beskyttelsesglas</span>
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.chapter} aria-labelledby="bn-repair">
        <div className={`${styles.wrap} ${styles.chapterGrid}`}>
          <div className={styles.chapterCopy}>
            <p className={styles.kicker}>Reparation</p>
            <h2 id="bn-repair">{BLACK_NOVEMBER.repairPercent} % på alle reparationer</h2>
            <p>
              Skærm, batteri, opladerstik, kamera og alt det andet, vi reparerer. Rabatten trækkes
              automatisk, når du booker online eller betaler i butikken. Vælger du tre eller flere
              reparationer, får du 15 %.
            </p>
            <p className={styles.example}>
              Eksempel: iPhone 17 Pro, skærmskift <s>1.899 kr.</s> <strong>1.709 kr.</strong>
            </p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/reparation">
                Find din model og book
              </Link>
              <Link className={styles.secondary} href="/reparation-vejle">
                Reparation i Vejle
              </Link>
              <Link className={styles.secondary} href="/reparation-slagelse">
                Reparation i Slagelse
              </Link>
            </div>
          </div>
          <div className={styles.photo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/repair/telefon-med-smadret-skaerm.jpg" alt="Telefon med smadret skærm klar til reparation" loading="lazy" />
          </div>
        </div>
      </section>

      <section className={`${styles.chapter} ${styles.chapterAlt}`} aria-labelledby="bn-devices">
        <div className={`${styles.wrap} ${styles.chapterGrid} ${styles.reverse}`}>
          <div className={styles.chapterCopy}>
            <p className={styles.kicker}>Brugte enheder</p>
            <h2 id="bn-devices">{BLACK_NOVEMBER.devicePercent} % på alle brugte enheder</h2>
            <p>
              iPhones, iPads, bærbare og ure, testet og klar, med 36 måneders garanti og batteri på
              mindst 90 %. Priserne på siden er allerede nedsat, og du kan se den normale pris ved
              hver enhed.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/iphones">
                Se brugte iPhones
              </Link>
              <Link className={styles.secondary} href="/ipads">
                iPads
              </Link>
              <Link className={styles.secondary} href="/baerbare">
                Bærbare
              </Link>
            </div>
          </div>
          <div className={`${styles.photo} ${styles.cutout}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IPHONE_IMAGE} alt="Brugt iPhone 17 Pro i sølv" loading="lazy" />
          </div>
        </div>
      </section>

      <section className={styles.chapter} aria-labelledby="bn-accessories">
        <div className={`${styles.wrap} ${styles.chapterGrid}`}>
          <div className={styles.chapterCopy}>
            <p className={styles.kicker}>Tilbehør</p>
            <h2 id="bn-accessories">Covers og beskyttelsesglas {BLACK_NOVEMBER.accessoryPriceKr} kr.</h2>
            <p>
              Alle covers og alt beskyttelsesglas koster højst {BLACK_NOVEMBER.accessoryPriceKr} kr.,
              også privacy-glas, der gør skærmen mørk fra siden. Køber du glas sammen med en
              skærmreparation, sætter vi det på for 99 kr. Bookcovers og lagersalg er ikke med.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/tilbehoer/covers">
                Se covers
              </Link>
              <Link className={styles.secondary} href="/tilbehoer/beskyttelsesglas">
                Beskyttelsesglas
              </Link>
            </div>
          </div>
          <div className={`${styles.photo} ${styles.cutout} ${styles.stack}`}>
            {covers.length > 0 ? (
              covers.map((c) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={c.src} src={c.src} alt={c.alt} loading="lazy" />
              ))
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/images/privacy-glas.webp" alt="Privacy-beskyttelsesglas" loading="lazy" />
            )}
          </div>
        </div>
      </section>

      <section className={styles.terms} aria-labelledby="bn-terms">
        <div className={`${styles.wrap} ${styles.termsGrid}`}>
          <h2 id="bn-terms">Sådan virker det</h2>
          <ul>
            <li>Gælder 1.–30. november 2026, online og i butikkerne i Vejle og Slagelse.</li>
            <li>Ingen rabatkode. Priserne er nedsat på siden, og reparationsrabatten trækkes automatisk.</li>
            <li>10 % på alle reparationer. Ved tre eller flere reparationer på samme booking gælder 15 % i stedet. Rabatterne lægges ikke sammen.</li>
            <li>5 % på alle brugte enheder. Fabriksnye enheder er ikke med.</li>
            <li>Covers og beskyttelsesglas koster højst 199 kr. Varer, der i forvejen koster mindre, beholder deres pris.</li>
            <li>Bookcovers (pungcovers) og lagersalg er ikke med. Lagersalg har sine egne priser og 3 for 2.</li>
            <li>
              Garanti og returret er de samme som altid. <Link href="/garanti">Læs om garantien</Link>.
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.faq} aria-labelledby="bn-faq">
        <div className={`${styles.wrap} ${styles.termsGrid}`}>
          <h2 id="bn-faq">Spørgsmål om Black November</h2>
          <div>
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.stores} aria-labelledby="bn-stores">
        <div className={styles.wrap}>
          <h2 id="bn-stores">Kom forbi butikken</h2>
          <div className={styles.storeList}>
            {stores.map((store) => (
              <Link
                key={store.slug}
                href={`/butik/${store.slug}`}
                className={styles.store}
              >
                <strong>{store.city}</strong>
                <span>{store.street}, {store.zip} {store.city}</span>
                <span>Hverdage {store.hours.weekdays} · lørdag {store.hours.saturday}</span>
              </Link>
            ))}
          </div>
          <p className={styles.more}>
            Læs også <Link href="/blog/black-november-2026">guiden: hvad er værd at købe til Black November</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
