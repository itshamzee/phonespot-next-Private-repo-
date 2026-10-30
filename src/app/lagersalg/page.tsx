import type { Metadata } from "next";
import { CoversSaleView, SALE_URL, getSaleItems, lowestKr } from "./sale-view";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const rows = await getSaleItems();
  const min = lowestKr(rows);
  const title = min ? `Lagersalg: 3 for 2 på tilbehør fra ${min} kr. | PhoneSpot` : "Lagersalg: 3 for 2 på tilbehør | PhoneSpot";
  const description =
    "3 for 2 på hele lagersalget: læg tre varer i kurven, så er den billigste gratis. Covers, tasker, iPad-covers og andet tilbehør fra vores lager i Vejle, gratis levering til pakkeshop eller hent i Vejle og Slagelse.";
  return {
    title,
    description,
    alternates: { canonical: SALE_URL },
    // An empty sale page is thin content; keep it out of the index until stock is added.
    robots: rows.length ? undefined : { index: false, follow: true },
    openGraph: { title, description, url: SALE_URL },
  };
}

export default function LagersalgPage() {
  return <CoversSaleView selected={null} />;
}
