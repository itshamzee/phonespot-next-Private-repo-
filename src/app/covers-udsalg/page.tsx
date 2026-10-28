import type { Metadata } from "next";
import { CoversSaleView, SALE_URL, getSaleCovers, lowestKr } from "./sale-view";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const rows = await getSaleCovers();
  const min = lowestKr(rows);
  const title = min ? `Covers-udsalg: covers fra ${min} kr. | PhoneSpot` : "Covers-udsalg | PhoneSpot";
  const description =
    "Lagerrydning af covers til iPhone og Samsung. Faste lave priser, gratis levering til pakkeshop, eller hent i Vejle og Slagelse.";
  return {
    title,
    description,
    alternates: { canonical: SALE_URL },
    // An empty sale page is thin content; keep it out of the index until stock is added.
    robots: rows.length ? undefined : { index: false, follow: true },
    openGraph: { title, description, url: SALE_URL },
  };
}

export default function CoversUdsalgPage() {
  return <CoversSaleView selected={null} />;
}
