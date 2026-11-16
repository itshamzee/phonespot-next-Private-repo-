import { LocalBuyPage, localBuyMetadata } from "@/components/local/local-buy-page";
import { getLocalBuyPage } from "@/lib/local-buy-pages";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";

// 10 min, som kategorisiderne: lagerstedet skifter, når en enhed flyttes eller sælges.
export const revalidate = 600;

const PAGE = getLocalBuyPage("iphones-vejle");

export const metadata = localBuyMetadata(PAGE.path);

export default async function IphonesVejlePage() {
  const templates = await getPublishedTemplates(PAGE.category, { inStock: true });
  return <LocalBuyPage page={PAGE} templates={templates} />;
}
