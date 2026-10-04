import { createServerClient } from "@/lib/supabase/client";
import type { StaffIdentity } from "@/lib/auth/require-staff";
import { locationIdForSlug, type ScopeSlug } from "@/lib/auth/store-scope";
import { loadLocationIndex } from "@/lib/auth/store-scope-server";
import { TransferError, transferError } from "@/lib/transfers/errors";
import { canActFor } from "@/lib/transfers/rules";
import { canReceiveGoods } from "./overview";

type Db = ReturnType<typeof createServerClient>;

export type GoodsReceiptInput = {
  locationSlug: ScopeSlug;
  invoiceNo?: string | null;
  /** YYYY-MM-DD */
  invoiceDate?: string | null;
  lines: { skuProductId: string; qty: number; costPriceOere?: number | null }[];
};

/**
 * Varemodtagelse: tilbehør/reservedele ind på en butiks lager mod en faktura.
 * Manager eller ejer; manager kun for egen butik. Atomisk i stock_receive_goods
 * (sku_stock + stock_movements 'receive' + seneste kostpris).
 */
export async function receiveGoods(
  staff: StaffIdentity,
  input: GoodsReceiptInput,
  db: Db = createServerClient(),
): Promise<{ lines: number }> {
  if (!canReceiveGoods(staff)) {
    throw new TransferError("forbidden_role", "Kun managere og ejere kan modtage varer.", 403);
  }
  if (!canActFor(staff, input.locationSlug)) {
    throw new TransferError("forbidden_location", "Du kan kun modtage varer til din egen butik.", 403);
  }
  const index = await loadLocationIndex();
  const locationId = locationIdForSlug(index, input.locationSlug);
  if (!locationId) throw new TransferError("location_not_found", "Butikken findes ikke", 404);

  const { data, error } = await db.rpc("stock_receive_goods", {
    p_location_id: locationId,
    p_staff_id: staff.id,
    p_invoice_no: input.invoiceNo ?? null,
    p_invoice_date: input.invoiceDate || null,
    p_lines: input.lines.map((l) => ({
      sku_product_id: l.skuProductId,
      qty: l.qty,
      cost_price_oere: l.costPriceOere ?? null,
    })),
  });
  if (error || !data) throw transferError("Varemodtagelsen kunne ikke gemmes", error);
  return data as { lines: number };
}
