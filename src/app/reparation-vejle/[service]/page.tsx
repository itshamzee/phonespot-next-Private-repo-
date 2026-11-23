import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalServicePage } from "@/components/repair/local-service-page";
import {
  LOCAL_SERVICE_KEYS,
  buildLocalServiceMetadata,
  getLocalServicePage,
} from "@/lib/local-service-pages";
import { getServicePriceRows } from "@/lib/supabase/repairs";

export const revalidate = 3600;
export const dynamicParams = false;

const STORE = "vejle" as const;

export function generateStaticParams() {
  return LOCAL_SERVICE_KEYS.map((service) => ({ service }));
}

type Params = { params: Promise<{ service: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service } = await params;
  const page = getLocalServicePage(STORE, service);
  return page ? buildLocalServiceMetadata(page) : {};
}

export default async function Page({ params }: Params) {
  const { service } = await params;
  const page = getLocalServicePage(STORE, service);
  if (!page) notFound();
  const rows = await getServicePriceRows(page.priceModels, page.priceColumns);
  return <LocalServicePage page={page} rows={rows} />;
}
