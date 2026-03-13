// src/lib/platform/device-schema.ts
// Zod schemas for device intake and update validation

import { z } from "zod";

export const deviceIntakeSchema = z.object({
  serial_number: z.string().optional(),
  imei: z.string().optional(),
  template_id: z.string().uuid("Vælg en produktskabelon"),
  grade: z.enum(["A", "B", "C"], { message: "Vælg en stand (A/B/C)" }),
  battery_health: z.number().int().min(0).max(100).optional(),
  storage: z.string().optional(),
  color: z.string().optional(),
  condition_notes: z.string().optional(),
  purchase_price: z.number().int().positive("Indkøbspris er påkrævet"),
  selling_price: z.number().int().positive().optional(),
  vat_scheme: z.enum(["brugtmoms", "regular"]).default("brugtmoms"),
  origin_country: z.string().default("DK"),
  supplier_id: z.string().uuid().optional(),
  location_id: z.string().uuid("Vælg en lokation"),
  seller_name: z.string().optional(),
  seller_address: z.string().optional(),
});

export const deviceUpdateSchema = z.object({
  grade: z.enum(["A", "B", "C"]).optional(),
  battery_health: z.number().int().min(0).max(100).optional(),
  condition_notes: z.string().optional(),
  selling_price: z.number().int().positive().optional(),
  status: z.enum(["intake", "graded", "listed", "reserved", "sold", "shipped", "picked_up", "returned"]).optional(),
  location_id: z.string().uuid().optional(),
});

export const deviceImportRowSchema = z.object({
  serial_number: z.string().optional(),
  imei: z.string().optional(),
  template_id: z.string().uuid(),
  grade: z.enum(["A", "B", "C"]),
  battery_health: z.coerce.number().int().min(0).max(100).optional(),
  storage: z.string().optional(),
  color: z.string().optional(),
  condition_notes: z.string().optional(),
  purchase_price: z.coerce.number().int().positive(),
  selling_price: z.coerce.number().int().positive().optional(),
  vat_scheme: z.enum(["brugtmoms", "regular"]).default("brugtmoms"),
  supplier_id: z.string().uuid().optional(),
  location_id: z.string().uuid(),
  status: z.enum(["intake", "graded", "listed"]).default("graded"),
});

export type DeviceIntakeInput = z.infer<typeof deviceIntakeSchema>;
export type DeviceUpdateInput = z.infer<typeof deviceUpdateSchema>;
export type DeviceImportRow = z.infer<typeof deviceImportRowSchema>;
