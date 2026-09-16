import { redirect } from "next/navigation";

/** Forældet flow mod Shopify. Produkter oprettes i /admin/produkter/ny. */
export default function LegacyAddCoverPage() {
  redirect("/admin/produkter/ny?type=accessory");
}
