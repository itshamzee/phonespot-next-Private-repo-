import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { getActiveBrands, getBrandHubData, type HubModel } from "@/lib/supabase/repairs";
import {
  Breadcrumb,
  CityLinks,
  FaqSection,
  ModelRows,
  SITE,
  breadcrumbJsonLd,
  faqJsonLd,
  formatKr,
  hubStyles as hub,
  serviceJsonLd,
} from "@/components/repair/brand-hub";
import { fitTitle } from "@/lib/repairs/hub-meta";
import type { HubFaq } from "@/lib/repairs/brand-hub-content";
import styles from "@/components/repair/repair.module.css";

export const revalidate = 3600;

const PAGE_URL = `${SITE}/reparation/tablet`;

const FAQS: HubFaq[] = [
  {
    question: "Hvilke tablets reparerer I?",
    answer:
      "Vi reparerer alle tablets: iPad, Samsung Galaxy Tab og andre Android-tablets. Find din model på siden for at se prisen. Står den ikke på listen, så ring eller kom forbi, så får du en fast pris efter et gratis hurtigt tjek ved disken.",
  },
  {
    question: "Hvad koster et skærmskift på en tablet?",
    answer:
      "Prisen afhænger af mærke og model. Fra-priserne på siden er hentet fra vores prisliste. Har din model ingen pris, får du en fast pris efter et gratis hurtigt tjek ved disken.",
  },
  {
    question: "Kan I skifte batteri på en tablet?",
    answer:
      "Ja. Batteriet sidder ofte limet fast og kræver forsigtighed. Vi oplyser pris og tid, før du afleverer tabletten.",
  },
  {
    question: "Hvilken garanti får jeg?",
    answer:
      "Du får livstidsgaranti på arbejde og dele. Opstår den samme fejl igen på den del, vi har skiftet, reparerer vi den uden beregning. Nye skader som fald, tryk og væske er ikke dækket. Behandling af vandskade har 3 måneders garanti.",
  },
  {
    question: "Kan jeg sende min tablet ind?",
    answer:
      "Ja, med en gratis fragtlabel, hvis du bor uden for Vejle og Slagelse. Garantien er den samme som i butikken.",
  },
];

async function load() {
  const brands = await getActiveBrands();
  const ipad = brands.find((b) => b.slug === "ipad");
  const samsung = brands.find((b) => b.slug === "samsung");
  const ipadData = ipad ? await getBrandHubData(ipad.id) : null;
  const samsungData = samsung ? await getBrandHubData(samsung.id) : null;
  const tabs: HubModel[] = (samsungData?.models ?? []).filter(
    (m) => m.series === "Galaxy Tab" || m.name.startsWith("Galaxy Tab"),
  );
  const tabFrom = tabs
    .map((t) => t.cheapest)
    .filter((p): p is number => typeof p === "number" && p > 0);
  const prices = [ipadData?.fromPrice, ...tabFrom].filter(
    (p): p is number => typeof p === "number" && p > 0,
  );
  return {
    ipad,
    ipadData,
    samsung,
    tabs,
    tabFrom: tabFrom.length ? Math.min(...tabFrom) : null,
    from: prices.length ? Math.min(...prices) : null,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { from } = await load();
  const price = from ? ` fra ${formatKr(from)}` : "";
  const title = fitTitle([
    `Tablet-reparation – iPad og Galaxy Tab${price} | PhoneSpot`,
    `Tablet-reparation${price} | PhoneSpot`,
    "Tablet-reparation | PhoneSpot",
  ]);
  return {
    title,
    description: `Reparation af iPad, Samsung Galaxy Tab og andre tablets i Vejle og Slagelse${price}. Livstidsgaranti på arbejde og dele.`,
    alternates: { canonical: PAGE_URL },
    openGraph: { title, url: PAGE_URL, type: "website" },
  };
}

export default async function TabletRepairPage() {
  const { ipad, ipadData, samsung, tabs, tabFrom, from } = await load();
  const answer = `Vi reparerer alle tablets i Vejle og Slagelse: iPad, Samsung Galaxy Tab og andre Android-tablets${from ? `, fra ${formatKr(from)}` : ""}. Du får en fast pris, før vi går i gang, og livstidsgaranti på arbejde og dele. Kom forbi uden tid, eller send tabletten ind med gratis fragtlabel.`;
  const ipadPopular = (ipadData?.models ?? []).filter((m) => m.cheapest).slice(0, 5);
  const categories = [
    ...(ipad && ipadData?.fromPrice
      ? [
          {
            category: "iPad-reparation",
            from: ipadData.fromPrice,
            modelCount: ipadData.models.length,
          },
        ]
      : []),
    ...(tabFrom
      ? [{ category: "Galaxy Tab-reparation", from: tabFrom, modelCount: tabs.length }]
      : []),
  ];

  return (
    <div className={styles.shell}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Reparation", href: "/reparation" },
          { name: "Tablet", href: "/reparation/tablet" },
        ])}
      />
      <JsonLd
        data={serviceJsonLd({
          name: "Tablet-reparation",
          url: PAGE_URL,
          description: answer,
          categories,
        })}
      />
      <JsonLd data={faqJsonLd(FAQS)} />
      <div className={styles.container}>
        <Breadcrumb trail={[{ name: "Reparation", href: "/reparation" }, { name: "Tablet" }]} />
        <header className={styles.header}>
          <span className={styles.eyebrow}>Reparation · Tablet</span>
          <h1>Tablet-reparation i Vejle og Slagelse.</h1>
          <p className={hub.answer}>{answer}</p>
          <div className={hub.body}>
            <p>
              Knust glas, et batteri der ikke holder, eller en tablet, der ikke vil lade? Vælg dit
              mærke nedenfor og find din model. Står den ikke på listen, hjælper vi stadig: kom
              forbi, så får du en fast pris efter et gratis hurtigt tjek ved disken.
            </p>
          </div>
        </header>
        <section className={hub.block} aria-labelledby="tablets">
          <div>
            <h2 id="tablets">Vælg tablet</h2>
            <p>Priser hentes fra vores prisliste.</p>
          </div>
          <div>
            {ipad && (
              <div className={hub.group}>
                <h3 className={hub.groupTitle}>
                  <Link href="/reparation/ipad">iPad</Link>
                </h3>
                <p className={hub.body}>
                  iPad, iPad Air, iPad mini og iPad Pro.
                  {ipadData?.fromPrice ? ` Reparation fra ${formatKr(ipadData.fromPrice)}.` : ""}
                </p>
                <ModelRows
                  models={ipadPopular.map((m) => ({
                    name: m.name,
                    href: `/reparation/ipad/${m.slug}`,
                    price: m.cheapest,
                  }))}
                />
                <p className={hub.linkLine}>
                  <Link href="/reparation/ipad">Se alle iPad-reparationer</Link>
                </p>
              </div>
            )}
            {samsung && tabs.length > 0 && (
              <div className={hub.group}>
                <h3 className={hub.groupTitle}>
                  <Link href="/reparation/samsung">Samsung Galaxy Tab</Link>
                </h3>
                <ModelRows
                  models={tabs.slice(0, 6).map((m) => ({
                    name: m.name,
                    href: `/reparation/samsung/${m.slug}`,
                    price: m.cheapest,
                  }))}
                />
                <p className={hub.linkLine}>
                  <Link href="/reparation/samsung">Se alle Samsung-reparationer</Link>
                </p>
              </div>
            )}
            <div className={hub.group}>
              <h3 className={hub.groupTitle}>Andre Android-tablets</h3>
              <p className={hub.body}>
                Vi reparerer også andre tablets. Fast pris efter gratis hurtigt tjek ved disken.{" "}
                <Link href="/kontakt">Kontakt os</Link> eller ring på 61 10 00 48.
              </p>
            </div>
          </div>
        </section>
        <CityLinks
          label="Tablet"
          note="Kom forbi med tabletten, så tjekker vi den ved disken og giver dig en fast pris. Garantien er livstidsgaranti på arbejde og dele."
        />
        <FaqSection title="Spørgsmål om tablet-reparation" faqs={FAQS} />
      </div>
    </div>
  );
}
