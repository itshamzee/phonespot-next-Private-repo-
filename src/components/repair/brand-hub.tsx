import { Fragment } from "react";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import type { CategoryPrice } from "@/lib/supabase/repairs";
import type { HubFaq } from "@/lib/repairs/brand-hub-content";
import styles from "@/components/repair/repair.module.css";
import hub from "@/components/repair/brand-hub.module.css";

export const SITE = "https://phonespot.dk";

export const formatKr = (value: number) => `${value.toLocaleString("da-DK")} kr`;

export function Breadcrumb({ trail }: { trail: { name: string; href?: string }[] }) {
  return (
    <nav className={styles.breadcrumb} aria-label="Brødkrumme">
      <ol>
        <li>
          <Link href="/">Forside</Link>
        </li>
        {trail.map((item) => (
          <Fragment key={item.name}>
            <li aria-hidden="true">/</li>
            {item.href ? (
              <li>
                <Link href={item.href}>{item.name}</Link>
              </li>
            ) : (
              <li aria-current="page">{item.name}</li>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

export function breadcrumbJsonLd(trail: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: SITE },
      ...trail.map((t, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: t.name,
        item: `${SITE}${t.href}`,
      })),
    ],
  };
}

export function faqJsonLd(faqs: HubFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** Service med OfferCatalog; tilbud kun for kategorier med pris i databasen. */
export function serviceJsonLd(opts: {
  name: string;
  url: string;
  description: string;
  categories: CategoryPrice[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    serviceType: "Reparation",
    url: opts.url,
    description: opts.description,
    areaServed: ["Vejle", "Slagelse", "Danmark"],
    provider: {
      "@type": ["Organization", "LocalBusiness"],
      name: STORE.name,
      url: SITE,
      telephone: "+45 61 10 00 48",
    },
    ...(opts.categories.length > 0 && {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: opts.name,
        itemListElement: opts.categories.map((c) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: c.category },
          priceCurrency: "DKK",
          price: c.from,
          priceSpecification: {
            "@type": "PriceSpecification",
            priceCurrency: "DKK",
            minPrice: c.from,
          },
        })),
      },
    }),
  };
}

export function CommonRepairs({
  categories,
  notes,
  label,
}: {
  categories: CategoryPrice[];
  notes: Record<string, string>;
  label: string;
}) {
  if (categories.length === 0) return null;
  return (
    <section className={hub.block} aria-labelledby="almindelige">
      <div>
        <h2 id="almindelige">Mest almindelige reparationer</h2>
        <p>Fra-priser på {label}-modeller. Den endelige pris står på din models side.</p>
      </div>
      <ul className={hub.rows}>
        {categories.slice(0, 6).map((c) => (
          <li key={c.category}>
            <strong>{c.category}</strong>
            <span className={hub.price}>Fra {formatKr(c.from)}</span>
            {notes[c.category.toLowerCase()] && <p>{notes[c.category.toLowerCase()]}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CityLinks({ label, note }: { label: string; note: string }) {
  return (
    <section className={hub.block} aria-labelledby="by">
      <div>
        <h2 id="by">{label}-reparation i Vejle og Slagelse</h2>
      </div>
      <div>
        <div className={hub.body}>
          <p>{note}</p>
          <p>
            Du kan komme forbi uden tid, og bor du længere væk, kan du sende enheden ind med en
            gratis fragtlabel.
          </p>
          <p>
            Bor du omkring Næstved? Vi har ingen butik dér, men Slagelse ligger ca. 30 minutter
            væk. Se <Link href="/reparation-naestved">reparation for Næstved</Link>.
          </p>
        </div>
        <div className={styles.storeLinks}>
          <Link href="/reparation-vejle">
            <span>
              <strong>Reparation i Vejle</strong>
              <small>Løversysselvej 3B, gratis parkering</small>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link href="/reparation-slagelse">
            <span>
              <strong>Reparation i Slagelse</strong>
              <small>VestsjællandsCentret 10A, 103</small>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link href="/reparation/indsend">
            <span>
              <strong>Send ind</strong>
              <small>Gratis fragtlabel, samme garanti</small>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function FaqSection({ title, faqs }: { title: string; faqs: HubFaq[] }) {
  return (
    <section className={styles.faq} aria-labelledby="faq">
      <div>
        <h2 id="faq">{title}</h2>
      </div>
      <div>
        {faqs.map((f) => (
          <details key={f.question}>
            <summary>{f.question}</summary>
            <p>{f.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export type ModelLink = { name: string; href: string; price: number | null };

export function ModelRows({ models }: { models: ModelLink[] }) {
  return (
    <ul className={hub.rows}>
      {models.map((m) => (
        <li key={m.href}>
          <Link href={m.href}>
            <strong>{m.name}</strong>
          </Link>
          <span className={hub.price}>
            {m.price ? `Fra ${formatKr(m.price)}` : "Fast pris efter tjek"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export { hub as hubStyles };
