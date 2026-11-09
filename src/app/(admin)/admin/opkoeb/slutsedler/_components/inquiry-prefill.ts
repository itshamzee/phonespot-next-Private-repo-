/**
 * Udfylder en ny opkøbskladde fra en online-henvendelse: sælger, enheder med
 * IMEI, det accepterede beløb og kontooplysninger. Samme kilder som den gamle
 * slutseddelside (henvendelsen og dens accepterede tilbud); slutsedler læses
 * aldrig herfra, kun via /api/trade-in/receipts.
 */
import { createBrowserClient } from "@/lib/supabase/client";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import { readLeadDevices } from "@/lib/buyback/lead-devices";
import { includedLines, readOfferLines } from "@/lib/buyback/offer-lines";
import type { ContactInquiry } from "@/lib/supabase/types";
import type { TradeInOffer } from "@/lib/supabase/trade-in-types";
import { emptyForm, emptyItem, formatKrInput, type ItemForm, type ReceiptForm } from "./receipt-form";

type Template = { id: string; brand: string | null; model: string | null; storage_options?: string[] | null };

const digits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

/** Finder skabelonen med præcis samme mærke og model; ellers står modellen som tekst, og personalet vælger. */
async function matchTemplate(brand: string, model: string): Promise<Template | null> {
  if (!model.trim()) return null;
  try {
    const res = await staffFetch(`/api/platform/templates?search=${encodeURIComponent(model.trim())}`);
    if (!res.ok) return null;
    const list = (await res.json()) as Template[];
    const eq = (a: string | null, b: string) => (a ?? "").trim().toLowerCase() === b.trim().toLowerCase();
    return list.find((t) => eq(t.model, model) && (!brand.trim() || eq(t.brand, brand))) ?? null;
  } catch {
    return null;
  }
}

export async function loadInquiryPrefill(inquiryId: string): Promise<ReceiptForm> {
  const supabase = createBrowserClient();
  const [{ data: inq }, { data: offers }] = await Promise.all([
    supabase.from("contact_inquiries").select("*").eq("id", inquiryId).maybeSingle(),
    supabase
      .from("trade_in_offers")
      .select("*")
      .eq("inquiry_id", inquiryId)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  const inquiry = (inq as ContactInquiry | null) ?? null;
  const offer = ((offers as TradeInOffer[] | null) ?? [])[0] ?? null;

  const form = emptyForm();
  form.inquiry_id = inquiryId;
  form.offer_id = offer?.id ?? null;
  form.seller_name = offer?.seller_name ?? inquiry?.name ?? "";
  form.seller_address = offer?.seller_address ?? "";
  form.seller_postal_city = offer?.seller_postal_city ?? "";
  form.seller_phone = inquiry?.phone ?? "";
  form.seller_email = inquiry?.email ?? "";
  const reg = digits(offer?.seller_bank_reg);
  const account = digits(offer?.seller_bank_account);
  if (reg || account) {
    form.payout_method = "bank";
    form.seller_bank_reg = reg;
    form.seller_bank_account = account;
  }

  // Med en opdelt pris hører kun de enheder, vi købte, på sedlen, hver til sin
  // accepterede pris. Uden opdeling kan ét beløb kun lægges på én enhed.
  const leadDevices = readLeadDevices(inquiry?.metadata);
  const lines = offer ? readOfferLines(offer.offer_lines) : null;
  const bought = lines ? includedLines(lines) : null;
  const seeds = bought
    ? bought.map((line) => ({ device: leadDevices[line.index]?.device, amount: line.amount_ore }))
    : leadDevices.map((entry, i) => ({
        device: entry.device,
        amount: offer && leadDevices.length === 1 && i === 0 ? offer.offer_amount : null,
      }));

  const items: ItemForm[] = await Promise.all(
    seeds.map(async ({ device, amount }) => {
      const brand = device?.brand || device?.brandCustom || "";
      const model = device?.model || device?.modelCustom || "";
      const template = await matchTemplate(brand, model);
      return emptyItem({
        imei: device?.imei ?? "",
        template_id: template?.id ?? null,
        brand: template?.brand ?? brand,
        model: template?.model ?? model,
        storage: device?.storage ?? "",
        storage_options: template?.storage_options ?? [],
        priceKr: amount && amount > 0 ? formatKrInput(amount) : "",
      });
    }),
  );
  if (items.length > 0) form.items = items;
  return form;
}
