import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { SellDeviceWizard } from "@/components/sell-device/sell-device-wizard";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import { getPostBySlug } from "@/lib/blog";
import { PHONESPOT_PROMISES } from "@/lib/promises";
import { STORES } from "@/lib/store-config";
import styles from "@/components/sell-device/sell-device.module.css";
import { SELL_DEVICES, getSellDevice } from "./devices";

const BASE_URL = "https://phonespot.dk";

// Kun de kendte enhedssider findes. Alt andet er 404, og de statiske søskende
// (accepter, afvis) har forrang for dette dynamiske segment.
export const dynamicParams = false;

type PageProps = { params: Promise<{ device: string }> };

export function generateStaticParams() {
  return SELL_DEVICES.map(({ slug }) => ({ device: slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { device: slug } = await params;
  const device = getSellDevice(slug);
  if (!device) return {};
  const url = `${BASE_URL}/saelg-din-enhed/${device.slug}`;
  return {
    title: device.title,
    description: device.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: device.title,
      description: device.metaDescription,
      url,
      type: "website",
      locale: "da_DK",
      siteName: "PhoneSpot",
    },
  };
}

// Løfte 5 (fast opkøbspris) er godkendt ordlyd i src/lib/promises.ts.
const BUYBACK_PROMISE = PHONESPOT_PROMISES.find((promise) => promise.title === "Fast opkøbspris");

export default async function SellDeviceDevicePage({ params }: PageProps) {
  const { device: slug } = await params;
  const device = getSellDevice(slug);
  if (!device) notFound();

  const url = `${BASE_URL}/saelg-din-enhed/${device.slug}`;
  const blogPosts = device.blogSlugs
    .map((blogSlug) => getPostBySlug(blogSlug))
    .filter((post): post is NonNullable<typeof post> => post !== null);
  const otherDevices = SELL_DEVICES.filter((other) => other.slug !== device.slug);

  return (
    <div className={styles.surface}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: BASE_URL },
            { "@type": "ListItem", position: 2, name: "Sælg din enhed", item: `${BASE_URL}/saelg-din-enhed` },
            { "@type": "ListItem", position: 3, name: `Sælg ${device.name}`, item: url },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: device.faq.map(({ question, answer }) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
          })),
        }}
      />
      <div className={styles.wrap}>
        <nav aria-label="Brødkrummer" className={styles.breadcrumb}>
          <Link href="/">Forside</Link>
          <span aria-hidden="true">/</span>
          <Link href="/saelg-din-enhed">Sælg din enhed</Link>
          <span aria-hidden="true">/</span>
          <span>{device.name}</span>
        </nav>
        <section className={styles.startArea} aria-labelledby="sell-device-title">
          <div className={styles.intro}>
            <p className={styles.eyebrow}>
              <StorefrontIcon kind="exchange" />
              {device.eyebrow}
            </p>
            <h1 id="sell-device-title">{device.h1}</h1>
            <p className={styles.lead}>{device.answer}</p>
            <div className={styles.introDetail}>
              <div>
                <StorefrontIcon kind="pin" />
                <span>Aflever i Vejle eller Slagelse, eller send efter aftale.</span>
              </div>
              {BUYBACK_PROMISE && (
                <div>
                  <StorefrontIcon kind="check" />
                  <span>{BUYBACK_PROMISE.detail}</span>
                </div>
              )}
              <p className={styles.note}>
                Du sender en vurderingsanmodning. Et tilbud kommer efter vores gennemgang.
              </p>
            </div>
          </div>
          <div id="start" className={styles.formStart}>
            <SellDeviceWizard initialDevice={device.wizardPreset} />
          </div>
        </section>

        <section className={styles.deviceBody} aria-labelledby="device-body-title">
          <div>
            <p className={styles.eyebrow}>Før du sender</p>
            <h2 id="device-body-title">{device.bodyHeading}</h2>
          </div>
          <div className={styles.deviceBodyCopy}>
            {device.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <h3>{device.coverageHeading}</h3>
            <p>{device.coverage}</p>
          </div>
        </section>

        <section className={styles.help} aria-labelledby="device-help-title">
          <div>
            <p className={styles.eyebrow}>Sådan gør du klar</p>
            <h2 id="device-help-title">Spørgsmål om at sælge {device.name}</h2>
            <div className={styles.faq}>
              {device.faq.map(({ question, answer }) => (
                <details key={question}>
                  <summary>
                    {question}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
          <aside className={styles.stores} aria-labelledby="device-stores-title">
            <StorefrontIcon kind="pin" />
            <h2 id="device-stores-title">Aflever i butikken</h2>
            <p>Du kan aflevere enheden i Vejle eller Slagelse og få hjælp til at gøre den klar.</p>
            {[STORES.vejle, STORES.slagelse].map((store) => (
              <div className={styles.store} key={store.slug}>
                <h3>{store.name}</h3>
                <p>
                  {store.street}
                  <br />
                  {store.zip} {store.city}
                </p>
                <Link href={`/butik/${store.slug}`}>
                  Se butik og åbningstider <StorefrontIcon kind="arrow" />
                </Link>
              </div>
            ))}
          </aside>
        </section>

        <nav className={styles.crossLinks} aria-label="Læs mere og sælg andre enheder">
          <div>
            <p className={styles.eyebrow}>Læs mere</p>
            <ul>
              <li>
                <Link href="/saelg-din-enhed">Alt om at sælge din brugte elektronik</Link>
              </li>
              {blogPosts.map((post) => (
                <li key={post.frontmatter.slug}>
                  <Link href={`/blog/${post.frontmatter.slug}`}>{post.frontmatter.title}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={styles.eyebrow}>Sælg en anden enhed</p>
            <ul>
              {otherDevices.map((other) => (
                <li key={other.slug}>
                  <Link href={`/saelg-din-enhed/${other.slug}`}>Sælg {other.linkLabel}</Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
}
