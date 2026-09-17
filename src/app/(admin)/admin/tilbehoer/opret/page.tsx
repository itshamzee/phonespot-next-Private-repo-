import { redirect } from "next/navigation";

/**
 * Tilbehør oprettes nu ét sted: /admin/produkter/ny. Den gamle side skrev ikke
 * kompatible modeller, så produkterne kunne ikke findes via modelfilteret.
 */
export default function LegacyCreateAccessoryPage() {
  redirect("/admin/produkter/ny?type=accessory");
}
