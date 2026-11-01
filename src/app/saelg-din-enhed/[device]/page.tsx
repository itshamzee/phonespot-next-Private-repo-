import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellLandingPage } from "@/components/sell-device/sell-landing-page";
import { SELL_DEVICES, getSellDevice } from "./devices";
import { IPHONE_FAMILY_PAGES } from "../iphone/[model]/models";
import { getModelPages } from "./[model]/models";

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

export default async function SellDeviceDevicePage({ params }: PageProps) {
  const { device: slug } = await params;
  const device = getSellDevice(slug);
  if (!device) notFound();

  return (
    <SellLandingPage
      content={{ ...device, faqHeading: `Spørgsmål om at sælge ${device.name}` }}
      path={`/saelg-din-enhed/${device.slug}`}
      crumbs={[{ name: `Sælg ${device.name}`, label: device.name }]}
      readMoreLinks={
        device.slug === "iphone"
          ? IPHONE_FAMILY_PAGES.map((page) => ({ href: `/saelg-din-enhed/iphone/${page.slug}`, label: `Sælg ${page.linkLabel}` }))
          : getModelPages(device.slug).map((page) => ({ href: `/saelg-din-enhed/${device.slug}/${page.slug}`, label: `Sælg ${page.linkLabel}` }))
      }
      relatedHeading="Sælg en anden enhed"
      relatedLinks={SELL_DEVICES.filter((other) => other.slug !== device.slug).map((other) => ({
        href: `/saelg-din-enhed/${other.slug}`,
        label: `Sælg ${other.linkLabel}`,
      }))}
    />
  );
}
