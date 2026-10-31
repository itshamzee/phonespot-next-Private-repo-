import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellLandingPage } from "@/components/sell-device/sell-landing-page";
import { IPHONE_FAMILY_PAGES, IPHONE_SELL_PAGES, getIphoneSellPage, getIphoneSiblings } from "./models";

const BASE_URL = "https://phonespot.dk";

export const dynamicParams = false;

type PageProps = { params: Promise<{ model: string }> };

export function generateStaticParams() {
  return IPHONE_SELL_PAGES.map(({ slug }) => ({ model: slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { model } = await params;
  const page = getIphoneSellPage(model);
  if (!page) return {};
  const url = `${BASE_URL}/saelg-din-enhed/iphone/${page.slug}`;
  return {
    title: page.title,
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description: page.metaDescription,
      url,
      type: "website",
      locale: "da_DK",
      siteName: "PhoneSpot",
    },
  };
}

export default async function SellIphoneModelPage({ params }: PageProps) {
  const { model } = await params;
  const page = getIphoneSellPage(model);
  if (!page) notFound();

  const siblings = getIphoneSiblings(page.slug);
  const others = siblings.length > 0 ? siblings : IPHONE_FAMILY_PAGES.filter((other) => other.slug !== page.slug);

  return (
    <SellLandingPage
      content={page}
      path={`/saelg-din-enhed/iphone/${page.slug}`}
      crumbs={[
        { name: "Sælg iPhone", label: "iPhone", href: "/saelg-din-enhed/iphone" },
        { name: `Sælg ${page.name}`, label: page.name },
      ]}
      readMoreLinks={page.slug === "defekt" ? [] : [{ href: "/saelg-din-enhed/iphone/defekt", label: "Sælg en defekt iPhone" }]}
      relatedHeading="Sælg en anden iPhone"
      relatedLinks={[
        { href: "/saelg-din-enhed/iphone", label: "Alle iPhones" },
        ...others.map((other) => ({ href: `/saelg-din-enhed/iphone/${other.slug}`, label: `Sælg ${other.linkLabel}` })),
      ]}
    />
  );
}
