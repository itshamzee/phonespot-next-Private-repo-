import { redirect } from "next/navigation";

/** Forældet flow mod Shopify. Covers optages nu med stregkode og foto i hurtig-flowet. */
export default function LegacyAddCoverPage() {
  redirect("/admin/produkter/hurtig-cover");
}
