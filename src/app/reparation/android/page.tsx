import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { getActiveBrands, getBrandHubData } from "@/lib/supabase/repairs";
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

const PAGE_URL = `${SITE}/reparation/android`;

const FAQS: HubFaq[] = [
  {
    question: "Hvilke Android-telefoner reparerer I?",
    answer:
      "Vi reparerer Samsung Galaxy, Google Pixel, OnePlus og flere andre mærker, blandt andre Xiaomi, Huawei, Sony og Motorola. Find dit mærke på siden for at se modeller og priser. Står din model ikke på listen, så ring til os.",
  },
  {
    question: "Hvad koster en Android-reparation?",
    answer:
      "Prisen afhænger af mærke, model og reparation. Fra-priserne på siden er hentet fra vores prisliste. Har din model ingen pris, får du en fast pris efter et gratis hurtigt tjek ved disken.",
  },
  {
    question: "Hvilken garanti får jeg?",
    answer:
      "Du får livstidsgaranti på arbejde og dele. Opstår den samme fejl igen på den del, vi har skiftet, reparerer vi den uden beregning. Nye skader som fald, tryk og væske er ikke dækket. Behandling af vandskade har 3 måneders garanti.",
  },
  {
    question: "Skal jeg bestille tid?",
    answer:
      "Nej, du kan komme forbi uden tid i Vejle og Slagelse. Du kan også booke online og vælge butik.",
  },
  {
    question: "Kan jeg sende min Android-telefon ind?",
    answer:
      "Ja, med en gratis fragtlabel, hvis du bor uden for Vejle og Slagelse. Garantien er den samme som i butikken.",
  },
];

async function androidBrands() {
  const all = await getActiveBrands();
  const phones = all.filter((b) => b.device_type === "smartphone" && b.slug !== "iphone");
  const loaded = await Promise.all(
    phones.map(async (brand) => ({ brand, ...(await getBrandHubData(brand.id)) })),
  );
  return loaded.filter((b) => b.models.length > 0);
}

function lowest(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && v > 0);
  return nums.length ? Math.min(...nums) : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const from = lowest((await androidBrands()).map((b) => b.fromPrice));
  const price = from ? ` fra ${formatKr(from)}` : "";
  const title = fitTitle([
    `Android-reparation – Samsung, Pixel, OnePlus${price} | PhoneSpot`,
    `Android-reparation${price} | PhoneSpot`,
    "Android-reparation | PhoneSpot",
  ]);
  return {
    title,
    description: `Reparation af Samsung, Google Pixel, OnePlus og andre Android-telefoner i Vejle og Slagelse${price}. Livstidsgaranti på arbejde og dele.`,
    alternates: { canonical: PAGE_URL },
    openGraph: { title, url: PAGE_URL, type: "website" },
  };
}

export default async function AndroidRepairPage() {
  const brands = await androidBrands();
  const from = lowest(brands.map((b) => b.fromPrice));
  const answer = `Vi reparerer Android-telefoner i Vejle og Slagelse: Samsung Galaxy, Google Pixel, OnePlus og flere mærker${from ? `, fra ${formatKr(from)}` : ""}. Du får en fast pris, før vi går i gang, og livstidsgaranti på arbejde og dele. Kom forbi uden tid, eller send telefonen ind med gratis fragtlabel.`;

  return (
    <div className={styles.shell}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Reparation", href: "/reparation" },
          { name: "Android", href: "/reparation/android" },
        ])}
      />
      <JsonLd
        data={serviceJsonLd({
          name: "Android-reparation",
          url: PAGE_URL,
          description: answer,
          categories: brands
            .filter((b) => b.fromPrice)
            .map((b) => ({
              category: `${b.brand.name}-reparation`,
              from: b.fromPrice as number,
              modelCount: b.models.length,
            })),
        })}
      />
      <JsonLd data={faqJsonLd(FAQS)} />
      <div className={styles.container}>
        <Breadcrumb trail={[{ name: "Reparation", href: "/reparation" }, { name: "Android" }]} />
        <header className={styles.header}>
          <span className={styles.eyebrow}>Reparation · Android</span>
          <h1>Android-reparation i Vejle og Slagelse.</h1>
          <p className={hub.answer}>{answer}</p>
          <div className={hub.body}>
            <p>
              Android dækker mange mærker og mange modeller. Vælg dit mærke nedenfor, og find din
              præcise model, så ser du prisen på netop den. Skærmskift og batteriskift er ofte klar
              på 30 minutter, når delen er på lager.
            </p>
          </div>
        </header>
        <section className={hub.block} aria-labelledby="maerker">
          <div>
            <h2 id="maerker">Vælg mærke</h2>
            <p>Hvert mærke har sin egen side med modeller, priser og spørgsmål.</p>
          </div>
          <div>
            {brands.map(({ brand, models, fromPrice }) => {
              const popular = models.filter((m) => m.cheapest).slice(0, 4);
              return (
                <div key={brand.id} className={hub.group}>
                  <h3 className={hub.groupTitle}>
                    <Link href={`/reparation/${brand.slug}`}>{brand.name}</Link>
                  </h3>
                  <p className={hub.body}>
                    {fromPrice
                      ? `Reparation fra ${formatKr(fromPrice)}.`
                      : "Fast pris efter gratis hurtigt tjek ved disken."}{" "}
                    {models.length} modeller.
                  </p>
                  <ModelRows
                    models={popular.map((m) => ({
                      name: m.name,
                      href: `/reparation/${brand.slug}/${m.slug}`,
                      price: m.cheapest,
                    }))}
                  />
                  <p className={hub.linkLine}>
                    <Link href={`/reparation/${brand.slug}`}>
                      Se alle {brand.name}-reparationer
                    </Link>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
        <CityLinks
          label="Android"
          note="Kom forbi med telefonen, så tjekker vi fejlen ved disken og giver dig en fast pris. Ring først, hvis du vil vide, om delen til din model er på lager."
        />
        <FaqSection title="Spørgsmål om Android-reparation" faqs={FAQS} />
      </div>
    </div>
  );
}
