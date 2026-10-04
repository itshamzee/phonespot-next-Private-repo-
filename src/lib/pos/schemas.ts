import { z } from "zod";
import { DISCOUNT_REASONS, PAYMENT_TYPES, REFUND_TYPES } from "./constants";

/** Loose UUID shape (Postgres uuid_generate_v4 / gen_random_uuid), not RFC-strict. */
const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Ugyldigt id");

const oere = z.number().int().safe();

export const saleItemSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("device"), deviceId: uuid }),
  z.object({
    type: z.literal("sku_product"),
    skuProductId: uuid,
    quantity: z.number().int().min(1).max(1000),
  }),
  z.object({
    type: z.literal("free_text"),
    description: z.string().trim().min(1).max(200),
    unitPriceOere: oere.min(1),
    quantity: z.number().int().min(1).max(1000).default(1),
  }),
  // Prepayment on a repair case. Must name the case.
  z.object({
    type: z.literal("deposit"),
    repairTicketId: uuid,
    description: z.string().trim().max(200).optional(),
    unitPriceOere: oere.min(1),
  }),
  // Final payment of a repair case (the case total). Marks the case paid.
  z.object({
    type: z.literal("repair_service"),
    repairTicketId: uuid,
    description: z.string().trim().max(200).optional(),
    unitPriceOere: oere.min(1),
  }),
  // A deposit used against the final payment (becomes a negative line).
  z.object({
    type: z.literal("deposit_applied"),
    depositItemId: uuid,
    amountOere: oere.min(1),
  }),
]);
export type SaleItem = z.infer<typeof saleItemSchema>;

export const paymentLineSchema = z.object({
  type: z.enum(PAYMENT_TYPES),
  amountOere: oere.min(1),
  reference: z.string().trim().max(100).optional().nullable(),
});

export const refundLineSchema = z.object({
  type: z.enum(REFUND_TYPES),
  amountOere: oere.min(1),
  reference: z.string().trim().max(100).optional().nullable(),
});

export const saleBodySchema = z
  .object({
    items: z.array(saleItemSchema).min(1, "Tilføj mindst ét produkt"),
    payments: z.array(paymentLineSchema).max(10),
    locationId: uuid,
    registerId: uuid,
    customerId: uuid.optional().nullable(),
    discountAmount: oere.min(0).optional(),
    discountReason: z.enum(DISCOUNT_REASONS).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine((b) => !b.discountAmount || b.discountReason, {
    message: "Vælg en årsag til rabatten",
    path: ["discountReason"],
  });
export type SaleBody = z.infer<typeof saleBodySchema>;

export const returnBodySchema = z.object({
  originalOrderId: uuid,
  locationId: uuid,
  registerId: uuid,
  lines: z
    .array(
      z.object({
        orderItemId: uuid,
        quantity: z.number().int().min(0).max(1000),
        restock: z.boolean().default(false),
      }),
    )
    .min(1),
  refunds: z.array(refundLineSchema).min(1).max(10),
  reason: z.string().trim().min(1, "Vælg en returårsag").max(200),
  notes: z.string().trim().max(500).optional().nullable(),
});
export type ReturnBody = z.infer<typeof returnBodySchema>;

export const expenseSchema = z.object({
  description: z.string().trim().min(1).max(200),
  amountOere: oere.min(1),
});

export const sessionActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("open"), registerId: uuid, openingFloat: oere.min(0) }),
  z.object({
    action: z.literal("close"),
    sessionId: uuid,
    countedCash: oere.min(0),
    cashToBank: oere.min(0).default(0),
    expenses: z.array(expenseSchema).max(50).default([]),
    notes: z.string().trim().max(500).optional().nullable(),
  }),
  z.object({
    action: z.literal("adjust"),
    sessionId: uuid,
    amountOere: oere.refine((n) => n !== 0, "Justeringen skal være forskellig fra 0"),
    reason: z.string().trim().min(1).max(300),
  }),
]);

export const stockAdjustSchema = z.object({
  productId: uuid,
  locationId: uuid,
  delta: oere.refine((n) => n !== 0, "Ændringen skal være forskellig fra 0"),
  reason: z.enum(["adjust", "receive"]),
  note: z.string().trim().max(300).optional().nullable(),
});

export const uuidSchema = uuid;
