// accessories.ts — Query library for accessories, templates, and reservations
// Money is stored in integer øre (DKK cents). 149 DKK = 14900.

import { createAdminClient } from "./admin";
import type {
  Accessory,
  AccessoryInsert,
  AccessoryUpdate,
  AccessoryTemplate,
  AccessoryTemplateInsert,
  Reservation,
  ReservationInsert,
  ReservationUpdate,
} from "./platform-types";

// ============================================
// Utilities
// ============================================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateSku(name: string, model: string | null, category: string): string {
  const namePart = name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  const modelPart = model
    ? model.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "X")
    : "GENR";
  const catPart = category.slice(0, 3).toUpperCase();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${catPart}-${namePart}-${modelPart}-${rand}`;
}

/**
 * Generate a valid EAN-13 with "200" prefix (internal use range).
 * Digits 1–12 are random, digit 13 is the check digit.
 */
export function generateInternalEan(): string {
  const prefix = "200";
  let digits = prefix;
  for (let i = 0; i < 9; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  // Calculate EAN-13 check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return digits + check.toString();
}

// ============================================
// Accessories
// ============================================

export interface GetAccessoriesOptions {
  category?: string;
  brand?: string;
  model?: string;
  status?: string;
  search?: string;
  inStoreOnly?: boolean;
  store_id?: string;
  limit?: number;
  offset?: number;
}

export async function getAccessories(
  options: GetAccessoriesOptions = {}
): Promise<Accessory[]> {
  const supabase = createAdminClient();
  let query = supabase.from("accessories").select("*");

  if (options.category) {
    query = query.eq("category", options.category);
  }
  if (options.brand) {
    query = query.ilike("brand", `%${options.brand}%`);
  }
  if (options.model) {
    query = query.contains("compatible_models", [options.model]);
  }
  if (options.status) {
    query = query.eq("status", options.status);
  } else {
    query = query.neq("status", "archived");
  }
  if (options.search) {
    query = query.or(
      `name.ilike.%${options.search}%,brand.ilike.%${options.search}%,sku.ilike.%${options.search}%`
    );
  }
  if (options.inStoreOnly) {
    // Show always-in-stock products regardless of stock level
    query = query.or("store_stock.gt.0,always_in_stock.eq.true");
  }
  if (options.store_id) {
    query = query.eq("store_id", options.store_id);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data as Accessory[]) ?? [];
}

export async function getAccessoryById(id: string): Promise<Accessory | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("accessories")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Accessory;
}

export async function getAccessoryBySlug(slug: string): Promise<Accessory | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("accessories")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) return null;
  return data as Accessory;
}

export async function createAccessory(
  input: Omit<AccessoryInsert, "slug"> & { slug?: string }
): Promise<Accessory> {
  const supabase = createAdminClient();

  const slug = input.slug || slugify(input.name);

  const payload: AccessoryInsert = {
    ...input,
    slug,
    sku: input.sku || generateSku(input.name, input.compatible_models?.[0] ?? null, input.category),
    ean: input.ean || null,
  };

  const { data, error } = await supabase
    .from("accessories")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Accessory;
}

export interface BulkCreateInput {
  name_pattern: string;
  category: Accessory["category"];
  brand: string | null;
  models: string[];
  price: number;
  cost_price: number;
  image_url: string | null;
  description: string | null;
  online_stock: number;
  store_stock: number;
  store_id: string;
}

/**
 * Creates one accessory per model, replacing {model} in name_pattern with each model name.
 */
export async function bulkCreateAccessories(
  input: BulkCreateInput
): Promise<Accessory[]> {
  const supabase = createAdminClient();

  const rows: AccessoryInsert[] = input.models.map((model) => {
    const name = input.name_pattern.replace(/\{model\}/gi, model);
    const slug = slugify(name);
    return {
      name,
      slug,
      category: input.category,
      brand: input.brand,
      compatible_models: [model],
      price: input.price,
      cost_price: input.cost_price,
      sku: generateSku(name, model, input.category),
      ean: null,
      image_url: input.image_url,
      description: input.description,
      online_stock: input.online_stock,
      store_stock: input.store_stock,
      store_id: input.store_id,
      status: "draft",
    };
  });

  const { data, error } = await supabase
    .from("accessories")
    .insert(rows)
    .select();

  if (error) throw error;
  return (data as Accessory[]) ?? [];
}

export async function updateAccessory(
  id: string,
  updates: Partial<Omit<Accessory, "id" | "created_at">>
): Promise<Accessory> {
  const supabase = createAdminClient();

  const payload: AccessoryUpdate = {
    id,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("accessories")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Accessory;
}

export async function deleteAccessory(id: string): Promise<void> {
  await updateAccessory(id, { status: "archived" });
}

// ============================================
// Accessory Templates
// ============================================

export async function getTemplates(): Promise<AccessoryTemplate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("accessory_templates")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as AccessoryTemplate[]) ?? [];
}

export async function createTemplate(
  input: Omit<AccessoryTemplateInsert, "id">
): Promise<AccessoryTemplate> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("accessory_templates")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as AccessoryTemplate;
}

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("accessory_templates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ============================================
// Reservations
// ============================================

export interface GetReservationsOptions {
  status?: string;
  store_id?: string;
  product_type?: string;
  product_id?: string;
}

export async function createReservation(
  input: ReservationInsert
): Promise<Reservation> {
  const supabase = createAdminClient();

  // Check stock before creating reservation
  if (input.product_type === "accessory") {
    const { data: accessory, error: stockError } = await supabase
      .from("accessories")
      .select("store_stock, name, always_in_stock")
      .eq("id", input.product_id)
      .single();

    if (stockError || !accessory) {
      throw new Error("Tilbehøret blev ikke fundet");
    }

    // Skip stock check and decrement for always-in-stock products
    if (!accessory.always_in_stock) {
      if (accessory.store_stock <= 0) {
        throw new Error("Ikke på lager i butik");
      }

      // Decrement store_stock atomically
      const { error: updateError } = await supabase
        .from("accessories")
        .update({ store_stock: accessory.store_stock - 1 })
        .eq("id", input.product_id)
        .eq("store_stock", accessory.store_stock); // optimistic lock

      if (updateError) {
        throw new Error("Lagerbeholdning kunne ikke opdateres");
      }
    }
  }

  const { data, error } = await supabase
    .from("reservations")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as Reservation;
}

export async function getReservations(
  options: GetReservationsOptions = {}
): Promise<Reservation[]> {
  const supabase = createAdminClient();
  let query = supabase.from("reservations").select("*");

  if (options.status) {
    query = query.eq("status", options.status);
  }
  if (options.store_id) {
    query = query.eq("store_id", options.store_id);
  }
  if (options.product_type) {
    query = query.eq("product_type", options.product_type);
  }
  if (options.product_id) {
    query = query.eq("product_id", options.product_id);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data as Reservation[]) ?? [];
}

export async function updateReservationStatus(
  id: string,
  status: Reservation["status"]
): Promise<Reservation> {
  const supabase = createAdminClient();

  // If cancelling an accessory reservation, restore store_stock
  if (status === "cancelled") {
    const { data: reservation } = await supabase
      .from("reservations")
      .select("product_type, product_id, status")
      .eq("id", id)
      .single();

    if (
      reservation &&
      reservation.product_type === "accessory" &&
      reservation.status !== "cancelled" &&
      reservation.status !== "collected"
    ) {
      const { data: accessory } = await supabase
        .from("accessories")
        .select("store_stock")
        .eq("id", reservation.product_id)
        .single();

      if (accessory) {
        await supabase
          .from("accessories")
          .update({ store_stock: accessory.store_stock + 1 })
          .eq("id", reservation.product_id);
      }
    }
  }

  const now = new Date().toISOString();
  const updates: ReservationUpdate = { id, status };

  if (status === "ready") updates.ready_at = now;
  if (status === "collected") updates.collected_at = now;

  const { data, error } = await supabase
    .from("reservations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Reservation;
}
