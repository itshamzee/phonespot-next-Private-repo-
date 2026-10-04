import { NextResponse } from "next/server";
import { z } from "zod";
import { StoreAccessError } from "@/lib/auth/store-scope";
import { TransferError } from "./errors";

const uuid = z.string().uuid();
const slug = z.enum(["vejle", "slagelse", "webshop"]);

export const requestSchema = z.object({
  fromSlug: slug,
  /** Valgfri for medarbejdere (deres egen butik); ejeren angiver den. */
  toSlug: slug.optional(),
  note: z.string().trim().max(500).nullish(),
  lines: z
    .array(
      z.union([
        z.object({ skuProductId: uuid, qty: z.number().int().min(1).max(1000) }),
        z.object({ deviceId: uuid }),
        z.object({
          templateId: uuid,
          storage: z.string().max(40).nullable(),
          grade: z.string().min(1).max(4),
          qty: z.number().int().min(1).max(100),
        }),
      ]),
    )
    .min(1)
    .max(50),
});

export const sendSchema = z
  .object({
    lines: z
      .array(
        z.object({
          lineId: uuid,
          qty: z.number().int().min(0).max(1000).optional(),
          deviceIds: z.array(uuid).max(100).optional(),
        }),
      )
      .max(100)
      .optional(),
  })
  .default({});

export const receiveSchema = z.object({
  lines: z.array(z.object({ lineId: uuid, qty: z.number().int().min(1).max(1000) })).max(200),
  closeShort: z.boolean().optional().default(false),
});

export const cancelSchema = z.object({ reason: z.string().trim().max(300).nullish() }).default({});

export const goodsReceiptSchema = z.object({
  locationSlug: slug,
  invoiceNo: z.string().trim().max(60).nullish(),
  invoiceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  lines: z
    .array(
      z.object({
        skuProductId: uuid,
        qty: z.number().int().min(1).max(100000),
        costPriceOere: z.number().int().min(0).max(100_000_000).nullish(),
      }),
    )
    .min(1)
    .max(100),
});

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

/** Oversætter TransferError/StoreAccessError til JSON-svar; andre fejl bliver 500. */
export function transferErrorResponse(err: unknown, fallback: string) {
  if (err instanceof TransferError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  if (err instanceof StoreAccessError) return NextResponse.json({ error: err.message }, { status: 403 });
  console.error("[transfers]", fallback, err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
