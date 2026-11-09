import { createServerClient } from "@/lib/supabase/client";
import { PosError } from "@/lib/pos/errors";
import type { SlutseddelData } from "@/lib/pdf/slutseddel";

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

/**
 * Samler en bekræftet slutseddel til PDF'en. Læser den ufiltrerede række
 * (ID-nummer og konto i klartekst); PDF'en maskerer selv. Kalderen skal have
 * tjekket adgang først (loadReceiptForActor) eller lige have bekræftet sedlen.
 * Esbjerg har ingen offentlig adresse, så den udelades uanset hvad der står i rækken.
 */
export async function loadSlutseddelData(receiptId: string): Promise<{ data: SlutseddelData; sellerEmail: string | null }> {
  const supabase = createServerClient();

  const { data: r, error } = await supabase.from("trade_in_receipts").select("*").eq("id", receiptId).maybeSingle();
  if (error) throw new Error(`Failed to load receipt: ${error.message}`);
  if (!r) throw new PosError("receipt_not_found", "Slutsedlen findes ikke", 404);
  const number = str(r.receipt_number);
  if (r.status === "draft" || !number) {
    throw new PosError("receipt_not_confirmed", "Slutsedlen er ikke bekræftet endnu", 409);
  }

  const { data: items, error: itemsErr } = await supabase
    .from("trade_in_receipt_items")
    .select("model, storage, imei_serial, condition_grade, battery_health, price")
    .eq("receipt_id", receiptId)
    .order("created_at", { ascending: true });
  if (itemsErr) throw new Error(`Failed to load receipt items: ${itemsErr.message}`);

  let locationName = "";
  let locationSlug = "";
  if (r.location_id) {
    const { data: loc } = await supabase.from("locations").select("name, slug").eq("id", r.location_id).maybeSingle();
    locationName = loc?.name ?? "";
    locationSlug = loc?.slug ?? "";
  }

  let staffName = "";
  if (r.confirmed_by) {
    const { data: staff } = await supabase.from("staff").select("name").eq("id", r.confirmed_by).maybeSingle();
    staffName = staff?.name ?? "";
  }

  const data: SlutseddelData = {
    receipt_number: number,
    date: str(r.confirmed_at) ?? r.created_at,
    buyer_company: r.buyer_company ?? "",
    buyer_cvr: r.buyer_cvr ?? "",
    buyer_address: locationSlug === "esbjerg" ? null : str(r.buyer_address),
    location_name: locationName,
    staff_name: staffName,
    seller_name: r.seller_name ?? "",
    seller_address: str(r.seller_address),
    seller_postal_city: str(r.seller_postal_city),
    seller_phone: str(r.seller_phone),
    seller_type: r.seller_type === "business" ? "business" : "private",
    seller_cvr: str(r.seller_cvr),
    invoice_type: str(r.invoice_type),
    items: (items ?? []).map((i) => ({
      model: i.model ?? "",
      storage: str(i.storage),
      imei_serial: str(i.imei_serial),
      condition_grade: str(i.condition_grade),
      battery_health: typeof i.battery_health === "number" ? i.battery_health : null,
      price: i.price ?? 0,
    })),
    total_amount: r.total_amount ?? 0,
    id_type: str(r.id_type),
    id_number: str(r.id_number),
    id_expiry: str(r.id_expiry),
    payout_method: r.payout_method === "bank" || r.payout_method === "modregning" ? r.payout_method : null,
    seller_bank_reg: str(r.seller_bank_reg),
    seller_bank_account: str(r.seller_bank_account),
  };
  return { data, sellerEmail: str(r.seller_email) };
}
