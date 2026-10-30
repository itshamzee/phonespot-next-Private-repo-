import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDeviceConfig } from "@/lib/tilbehoer-config";
import { CoversSaleView, MIN_INDEXABLE, SALE_URL, coversForModel, getSaleItems, lowestKr } from "../sale-view";

export const revalidate = 60;
export const dynamicParams = true;

type Props = { params: Promise<{ model: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { model } = await params;
  const device = getDeviceConfig(model);
  if (!device) return { title: "Ikke fundet" };
  const rows = coversForModel(await getSaleItems(), device.slug);
  const min = lowestKr(rows);
  const url = `${SALE_URL}/${device.slug}`;
  const title = min
    ? `${device.label} cover fra ${min} kr. | Lagersalg | PhoneSpot`
    : `${device.label} cover | Lagersalg | PhoneSpot`;
  const description = `Nye covers til ${device.label} på lagersalg${min ? ` fra ${min} kr.` : ""}. Gratis levering til pakkeshop, eller hent i Vejle og Slagelse. 2 års reklamationsret.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // Thin model pages stay out of the index until they have a real selection.
    robots: rows.length >= MIN_INDEXABLE ? undefined : { index: false, follow: true },
    openGraph: { title, description, url },
  };
}

export default async function LagersalgModelPage({ params }: Props) {
  const { model } = await params;
  const device = getDeviceConfig(model);
  if (!device) notFound();
  return <CoversSaleView selected={device} />;
}
