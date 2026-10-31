import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { SellDeviceWizard } from "@/components/sell-device/sell-device-wizard";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import { getPostBySlug } from "@/lib/blog";
import { PHONESPOT_PROMISES } from "@/lib/promises";
import { STORES } from "@/lib/store-config";
import styles from "@/components/sell-device/sell-device.module.css";

const BASE_URL = "https://phonespot.dk";

export type SellFaq = { question: string; answer: string };
export type SellLink = { href: string; label: string };

export type SellLandingContent = {
  eyebrow: string;
  h1: string;
  answer: string;
  wizardPreset?: { deviceType: string; brand?: string };
  bodyHeading: string;
  body: string[];
  coverageHeading: string;
  coverage: string;
  faqHeading: string;
  faq: SellFaq[];
  blogSlugs: string[];
};

type Props = {
  content: SellLandingContent;
  /** Sti uden domæne, fx /saelg-din-enhed/iphone/iphone-13. */
  path: string;
  /** Brødkrummer efter "Sælg din enhed". Det sidste led er den aktuelle side. */
  crumbs: { name: string; label: string; href?: string }[];
  /** Links under "Læs mere", før blogindlæggene. */
  readMoreLinks?: SellLink[];
  relatedHeading: string;
  relatedLinks: SellLink[];
};

// Løfte 5 (fast opkøbspris) er godkendt ordlyd i src/lib/promises.ts.
const BUYBACK_PROMISE = PHONESPOT_PROMISES.find((promise) => promise.title === "Fast opkøbspris");

export function SellLandingPage({ content, path, crumbs, readMoreLinks = [], relatedHeading, relatedLinks }: Props) {
  const blogPosts = content.blogSlugs
    .map((blogSlug) => getPostBySlug(blogSlug))
    .filter((post): post is NonNullable<typeof post> => post !== null);

  return (
    <div className={styles.surface}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: BASE_URL },
            { "@type": "ListItem", position: 2, name: "Sælg din enhed", item: `${BASE_URL}/saelg-din-enhed` },
            ...crumbs.map((crumb, index) => ({
              "@type": "ListItem",
              position: index + 3,
              name: crumb.name,
              item: `${BASE_URL}${crumb.href ?? path}`,
            })),
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: content.faq.map(({ question, answer }) => ({
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
          {crumbs.map((crumb) => (
            <span key={crumb.label} className={styles.breadcrumbItem}>
              <span aria-hidden="true">/</span>
              {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span>{crumb.label}</span>}
            </span>
          ))}
        </nav>
        <section className={styles.startArea} aria-labelledby="sell-device-title">
          <div className={styles.intro}>
            <p className={styles.eyebrow}>
              <StorefrontIcon kind="exchange" />
              {content.eyebrow}
            </p>
            <h1 id="sell-device-title">{content.h1}</h1>
            <p className={styles.lead}>{content.answer}</p>
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
            <SellDeviceWizard initialDevice={content.wizardPreset} />
          </div>
        </section>

        <section className={styles.deviceBody} aria-labelledby="device-body-title">
          <div>
            <p className={styles.eyebrow}>Før du sender</p>
            <h2 id="device-body-title">{content.bodyHeading}</h2>
          </div>
          <div className={styles.deviceBodyCopy}>
            {content.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <h3>{content.coverageHeading}</h3>
            <p>{content.coverage}</p>
          </div>
        </section>

        <section className={styles.help} aria-labelledby="device-help-title">
          <div>
            <p className={styles.eyebrow}>Sådan gør du klar</p>
            <h2 id="device-help-title">{content.faqHeading}</h2>
            <div className={styles.faq}>
              {content.faq.map(({ question, answer }) => (
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
              {readMoreLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
              {blogPosts.map((post) => (
                <li key={post.frontmatter.slug}>
                  <Link href={`/blog/${post.frontmatter.slug}`}>{post.frontmatter.title}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={styles.eyebrow}>{relatedHeading}</p>
            <ul>
              {relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
}
