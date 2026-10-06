/**
 * Zod-skemaer for kontrakten i new-case-types.ts. Strenge mod ukendte former, men
 * tilgivende over for tomme strenge (en tom formularværdi er "ikke udfyldt").
 */
import { z } from "zod";
import { NEW_CASE_LIMITS } from "@/lib/repairs/new-case-types";

const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Ugyldigt id");

/** Tom streng/null/undefined -> null; ellers trimmet streng. */
const optText = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : null))
    .refine((v) => v === null || v.length <= max, `Maks ${max} tegn`);

const optUuid = z
  .union([uuid, z.literal(""), z.null(), z.undefined()])
  .transform((v) => (typeof v === "string" && v ? v : null));

const oere = z.number().int().min(0).max(100_000_000);

export const customerSchema = z.object({
  id: optUuid,
  type: z.enum(["privat", "erhverv"]),
  name: z.string().trim().min(1, "Skriv kundens navn").max(200),
  phone: z.string().trim().min(1, "Skriv kundens telefonnummer").max(40),
  email: optText(200),
  company_name: optText(200),
  cvr: optText(20),
  ean: optText(20),
  invoice_email: optText(200),
  contact_person: optText(200),
});

export const deviceSchema = z.object({
  repair_model_id: optUuid,
  brand: optText(100),
  model: optText(200),
  serial_number: optText(100),
  color: optText(60),
  customer_device_id: optUuid,
  passcode: optText(100),
});

const repairItem = z.object({
  kind: z.literal("repair"),
  repair_service_id: uuid,
  part_sku_product_id: optUuid,
  unit_price_oere: oere.nullish(),
  price_reason: optText(NEW_CASE_LIMITS.priceReason),
});

const productItem = z.object({
  kind: z.literal("product"),
  sku_product_id: uuid,
  qty: z.number().int().min(1).max(NEW_CASE_LIMITS.qty),
  unit_price_oere: oere.nullish(),
  price_reason: optText(NEW_CASE_LIMITS.priceReason),
});

const deviceItem = z.object({
  kind: z.literal("device"),
  device_id: uuid,
  unit_price_oere: oere.nullish(),
  price_reason: optText(NEW_CASE_LIMITS.priceReason),
});

const freeTextItem = z.object({
  kind: z.literal("free_text"),
  description: z.string().trim().min(1, "Skriv en tekst til linjen").max(NEW_CASE_LIMITS.description),
  unit_price_oere: oere,
  qty: z.number().int().min(1).max(NEW_CASE_LIMITS.qty).optional(),
});

export const itemSchema = z.discriminatedUnion("kind", [repairItem, productItem, deviceItem, freeTextItem]);

export const detailsSchema = z.object({
  promised_at: optText(40).refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Ugyldigt tidspunkt"),
  assigned_to: optText(120),
  internal_notes: optText(NEW_CASE_LIMITS.internalNotes),
  checklist: z
    .array(z.object({ label: z.string().max(200), status: z.string().max(40), note: z.string().max(500).nullish() }))
    .max(60)
    .nullish(),
  intake_photos: z.array(z.string().max(500)).max(30).nullish(),
  is_urgent: z.boolean().optional(),
});

export const createCaseSchema = z.object({
  customer: customerSchema,
  device: deviceSchema,
  items: z.array(itemSchema).min(1, "Tilføj mindst én reparation").max(NEW_CASE_LIMITS.items),
  details: detailsSchema.optional(),
  store_id: z.enum(["vejle", "slagelse"]).nullish(),
  notify_sms: z.boolean().optional(),
});
export type CreateCaseBody = z.infer<typeof createCaseSchema>;

/** Indlevering af flere enheder: én kunde, 1..10 enheder (én sag hver). */
export const createCaseGroupSchema = z.object({
  customer: customerSchema,
  devices: z
    .array(
      z.object({
        device: deviceSchema,
        items: z.array(itemSchema).min(1, "Tilføj mindst én reparation til hver enhed").max(NEW_CASE_LIMITS.items),
        details: detailsSchema.optional(),
      }),
    )
    .min(1, "Tilføj mindst én enhed")
    .max(NEW_CASE_LIMITS.devices, `Maks. ${NEW_CASE_LIMITS.devices} enheder ad gangen`),
  store_id: z.enum(["vejle", "slagelse"]).nullish(),
  notify_sms: z.boolean().optional(),
});
export type CreateCaseGroupBody = z.infer<typeof createCaseGroupSchema>;

export const addItemSchema = z.object({ item: itemSchema });
export const swapPartSchema = z.object({ sku_product_id: uuid });
export const cancelSchema = z.object({ reason: z.string().trim().min(1, "Skriv hvorfor sagen annulleres").max(300) });

/** Idempotency-Key: 8-100 tegn, kun bogstaver, tal og -_: . */
export function parseIdempotencyKey(header: string | null | undefined): string | null {
  const v = (header ?? "").trim();
  return /^[A-Za-z0-9._:-]{8,100}$/.test(v) ? v : null;
}

export const uuidParam = uuid;
