import { AccessoryList } from "@/components/admin/products/accessory-list";

/**
 * Tilbehørslisten læser nu fra sku_products (via checkout_sku_inventory), som
 * er den tabel webshoppen og opret-flowet bruger. Den gamle side læste fra den
 * udgåede accessories-tabel og viste derfor ikke nyoprettede produkter.
 */
export default function AccessoriesAdminPage() {
  return <AccessoryList />;
}
