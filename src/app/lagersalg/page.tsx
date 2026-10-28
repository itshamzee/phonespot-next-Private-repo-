import type { Metadata } from "next";
import { CoversSaleView, SALE_URL, getSaleCovers, lowestKr } from "./sale-view";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const rows = await getSaleCovers();
  const min = lowestKr(rows);
  const title = min ? `Covers på lagersalg fra ${min} kr. | PhoneSpot` : "Covers på lagersalg | PhoneSpot";
  const description =
    "Nye covers til iPhone og Samsung på lagersalg fra vores lager i Vejle. Find din model, faste lave priser, gratis levering til pakkeshop eller hent i Vejle og Slagelse.";
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
