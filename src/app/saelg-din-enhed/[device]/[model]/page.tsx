import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellLandingPage } from "@/components/sell-device/sell-landing-page";
import { SELL_MODEL_PAGES, getCategoryCrumb, getModelPage, getModelPages } from "./models";

const BASE_URL = "https://phonespot.dk";

export const dynamicParams = false;

type PageProps = { params: Promise<{ device: string; model: string }> };

export function generateStaticParams() {
  return SELL_MODEL_PAGES.map(({ device, slug }) => ({ device, model: slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { device, model } = await params;
  const page = getModelPage(device, model);
  if (!page) return {};
  const url = `${BASE_URL}/saelg-din-enhed/${page.device}/${page.slug}`;
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

export default async function SellModelPageRoute({ params }: PageProps) {
  const { device, model } = await params;
  const page = getModelPage(device, model);
  if (!page) notFound();

  const hub = `/saelg-din-enhed/${page.device}`;
  const crumb = getCategoryCrumb(page.device);
  const siblings = getModelPages(page.device).filter((other) => other.slug !== page.slug);

  return (
    <SellLandingPage
      content={page}
      path={`${hub}/${page.slug}`}
      crumbs={[
        { name: `Sælg ${crumb}`, label: crumb, href: hub },
        { name: `Sælg ${page.name}`, label: page.name },
      ]}
      readMoreLinks={[{ href: hub, label: `Alt om at sælge ${crumb}` }]}
      relatedHeading="Sælg en anden model"
      relatedLinks={siblings.map((other) => ({ href: `${hub}/${other.slug}`, label: `Sælg ${other.linkLabel}` }))}
    />
  );
}
