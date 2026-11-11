import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { isBlackNovember } from "@/lib/campaign/black-november";
import styles from "../black-november.module.css";
import { CAMPAIGN_OFFERS, RETIRED_OFFER_SLUGS, getCampaignOffer } from "./offers";

const BASE_URL = "https://phonespot.dk";

export const dynamicParams = false;
export const revalidate = 300;

type PageProps = { params: Promise<{ tilbud: string }> };

export function generateStaticParams() {
  return CAMPAIGN_OFFERS.map(({ slug }) => ({ tilbud: slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tilbud } = await params;
  const offer = getCampaignOffer(tilbud);
  if (!offer) return {};
  const url = `${BASE_URL}/black-november/${offer.slug}`;
  return {
    title: offer.title,
    description: offer.description,
    alternates: { canonical: url },
    openGraph: {
      title: offer.title,
      description: offer.description,
      url,
      type: "website",
      locale: "da_DK",
      siteName: "PhoneSpot",
      images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: offer.h1 }],
    },
  };
}

export default async function CampaignOfferPage({ params }: PageProps) {
  const { tilbud } = await params;
  if (RETIRED_OFFER_SLUGS.has(tilbud)) permanentRedirect("/black-november");
  const offer = getCampaignOffer(tilbud);
  if (!offer) notFound();

  const url = `${BASE_URL}/black-november/${offer.slug}`;
  const others = CAMPAIGN_OFFERS.filter((other) => other.slug !== offer.slug);
  const ended = !isBlackNovember();

  return (
    <div className={styles.page}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: BASE_URL },
            { "@type": "ListItem", position: 2, name: "Black November", item: `${BASE_URL}/black-november` },
            { "@type": "ListItem", position: 3, name: offer.name, item: url },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: offer.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <section className={styles.chapter} aria-labelledby="offer-title">
        <div className={styles.wrap}>
          <div className={styles.offerCopy}>
            <p className={styles.kicker}>
              <Link href="/black-november">Black November</Link> · {offer.name}
            </p>
            <h1 id="offer-title">{offer.h1}</h1>
            <p className={styles.offerLead}>
              {ended ? "Black November 2026 er slut, og vores normale priser gælder igen." : offer.lead}
            </p>
            {offer.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <div className={styles.actions}>
              {offer.actions.map((action, i) => (
                <Link key={action.href} className={i === 0 ? styles.primary : styles.secondary} href={action.href}>
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className={styles.faq} aria-labelledby="offer-faq">
        <div className={`${styles.wrap} ${styles.termsGrid}`}>
          <h2 id="offer-faq">Spørgsmål om tilbuddet</h2>
          <div>
            {offer.faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.stores} aria-label="Andre tilbud">
        <div className={styles.wrap}>
          <p className={styles.more}>
            Se også{" "}
            {others.map((other, i) => (
              <span key={other.slug}>
                {i > 0 && " og "}
                <Link href={`/black-november/${other.slug}`}>{other.name.toLowerCase()}</Link>
              </span>
            ))}{" "}
            eller <Link href="/black-november">alle tilbud</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
